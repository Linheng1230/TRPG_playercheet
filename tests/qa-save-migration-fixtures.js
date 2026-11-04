"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const DIR=path.join(__dirname,"fixtures");
const files=["legacy-fighter.json","legacy-wizard.json","legacy-warlock.json","legacy-species-choice.json"];
const sort=a=>[...(a||[])].sort((x,y)=>String(x).localeCompare(String(y),"zh-Hant"));
const eqObj=(a,b)=>JSON.stringify(a||{})===JSON.stringify(b||{});
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,channel:"chrome"});const page=await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));page.on("console",m=>{if(m.type()==="error")errors.push("console:"+m.text())});
 await page.goto(URL+"?save-fixture-qa=1",{waitUntil:"networkidle"});if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const failures=[],results=[];
 for(const file of files){
  const fx=JSON.parse(fs.readFileSync(path.join(DIR,file),"utf8"));
  const got=await page.evaluate(({save,expect})=>{
    resetAll();const res=deserialize(save);renderFinal();renderSpells();
    const snap=()=>{
      const out=serialize(),p=prog(),sub=S.sub!=null&&p?.subs?.[S.sub]?p.subs[S.sub].n:null;
      return {out,sub,sp:S.sp?.n||null,bg:S.bg?.n||null,align:document.querySelector("#fAlign").value,
       spChoices:{...(S.spChoices||{})},skills:[...S.skills],expertise:[...S.expertise],style:S.style,
       mastery:[...S.mastery],invocations:[...S.invocations],metamagic:[...S.metamagic],
       cantrips:[...S.cantrips],spellbook:[...S.spellbook],prepared:[...S.prepared],
       finalText:document.querySelector("#finalSheet")?.innerText||""};
    };
    const first=snap();const res2=deserialize(first.out);renderFinal();renderSpells();const second=snap();
    const normSpells=a=>(a||[]).map(normalizeSpellName2024);
    const expected={cantrips:normSpells(expect.cantrips),spellbook:normSpells(expect.spellbook),prepared:normSpells(expect.prepared),
      final:[expect.name,displayName5R("classes",expect.cls),displayName5R("subclasses",expect.subName),displayName5R("species",expect.sp)].filter(Boolean)};
    return {res,res2,first,second,expected};
  },{save:fx.save,expect:fx.expect});
  const e=fx.expect,f=got.first,s=got.second;
  const check=(ok,kind,detail)=>{if(!ok)failures.push({file,kind,detail})};
  check(got.res.ok&&got.res2.ok,"deserialize-failed",{res:got.res,res2:got.res2});
  check(f.out.cls===e.cls&&f.out.level===e.level,"class-level",{want:[e.cls,e.level],have:[f.out.cls,f.out.level]});
  check(f.sub===e.subName,"subclass",{want:e.subName,have:f.sub});
  check(f.sp===e.sp&&f.bg===e.bg,"origin",{want:[e.sp,e.bg],have:[f.sp,f.bg]});
  check(f.align===e.align&&f.out.meta.align===e.align,"alignment",{want:e.align,have:[f.align,f.out.meta.align]});
  check(eqObj(f.spChoices,e.spChoices),"species-choices",{want:e.spChoices,have:f.spChoices});
  for(const k of ["skills","expertise","mastery","invocations","metamagic","cantrips","spellbook","prepared"]){
    const want=["cantrips","spellbook","prepared"].includes(k)?got.expected[k]:e[k];
    check(JSON.stringify(sort(f[k]))===JSON.stringify(sort(want)),k,{want:sort(want),have:sort(f[k])});
  }
  check(f.style===e.style,"style",{want:e.style,have:f.style});
  if(e.feat)check(Object.values(f.out.asi||{}).some(v=>v?.feat===e.feat),"feat",{want:e.feat,asi:f.out.asi});
  for(const t of got.expected.final)check(f.finalText.includes(t),"final-sheet",{missing:t});
  const core=x=>({cls:x.out.cls,level:x.out.level,sub:x.sub,sp:x.sp,bg:x.bg,align:x.align,spChoices:x.spChoices,
    skills:sort(x.skills),expertise:sort(x.expertise),style:x.style,mastery:sort(x.mastery),invocations:sort(x.invocations),
    metamagic:sort(x.metamagic),cantrips:sort(x.cantrips),spellbook:sort(x.spellbook),prepared:sort(x.prepared)});
  check(JSON.stringify(core(f))===JSON.stringify(core(s)),"roundtrip-drift",{first:core(f),second:core(s)});
  results.push({file,warnings:got.res.warn,sub:f.sub,sp:f.sp,bg:f.bg,align:f.align,spChoices:f.spChoices,spellbook:f.spellbook.length,prepared:f.prepared.length});
 }
 if(errors.length)failures.push(...errors.map(error=>({kind:"page-error",error})));
 console.log(JSON.stringify({fixtures:results,failures,failureCount:failures.length},null,2));
 assert.equal(failures.length,0,"save migration fixture failures="+failures.length);
 }finally{if(browser)await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

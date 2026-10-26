"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const {chromium}=require("playwright");
const ROOT=process.env.FIVERTOOLS_ROOT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024";
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const REPORT=process.env.MATRIX_REPORT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/full-character-matrix-report.json";
const defs=[
 ["barbarian","Barbarian","野蠻人"],["bard","Bard","吟遊詩人"],["cleric","Cleric","牧師"],["druid","Druid","德魯伊"],
 ["fighter","Fighter","戰士"],["monk","Monk","武僧"],["paladin","Paladin","聖武士"],["ranger","Ranger","遊俠"],
 ["rogue","Rogue","遊蕩者"],["sorcerer","Sorcerer","術士"],["warlock","Warlock","邪術師"],["wizard","Wizard","法師"]
];
const codeByClass={Bard:"B",Cleric:"C",Druid:"D",Paladin:"P",Ranger:"R",Sorcerer:"S",Warlock:"K",Wizard:"W"};
const cleanRef=s=>String(s||"").split("|")[0].trim();
const readJson=f=>JSON.parse(fs.readFileSync(f,"utf8").replace(/^\uFEFF/,""));
function sourceClassExpectations(){
 const out={};
 for(const [file,eng,site] of defs){
  const d=readJson(path.join(ROOT,`data__class__class-${file}.json`));
  const c=(d.class||[]).find(x=>x.source==="PHB2024"&&x.ENG_name===eng)||(d.class||[])[0];
  const max=[],cant=[],prep=[];
  const groups=c.classTableGroups||[];
  const slot=groups.find(g=>{const labs=g.colLabels||[];return labs.length>=1&&labs.every(x=>/\\|spells\\|level=[1-9](?:\\||})/.test(String(x)))});
  const count=groups.find(g=>(g.colLabels||[]).some(x=>/level=0/.test(String(x))));
  for(let lv=1;lv<=20;lv++){
    if(c.casterProgression==="pact")max.push(Math.min(5,Math.ceil(lv/2)));
    else if(slot&&slot.rows?.[lv-1]){const row=slot.rows[lv-1];let m=0;row.forEach((v,i)=>{if(Number(v)>0)m=i+1});max.push(m)}
    else max.push(0);
    if(count?.rows?.[lv-1]){cant.push(Number(count.rows[lv-1][0])||0);prep.push(Number(count.rows[lv-1][1])||0)}
    else {cant.push(null);prep.push(null)}
  }
  out[site]={eng,caster:c.casterProgression||null,max,cant,prep};
 }
 return out;
}
function spellClassParity(runtime){
 const src=readJson(path.join(ROOT,"data__spells__spells-phb2024.json")).spell;
 const byEng=new Map(runtime.map(x=>[x.eng,x]));
 const bad=[];
 for(const sp of src){
  const got=byEng.get(sp.ENG_name);if(!got){bad.push({spell:sp.ENG_name,reason:"missing-runtime"});continue}
  const want=[...new Set((sp.classes?.fromClassList||[]).map(x=>codeByClass[x.name]).filter(Boolean))].sort().join("");
  const have=[...new Set(String(got.cls||"").split(""))].sort().join("");
  if(want!==have)bad.push({spell:sp.ENG_name,want,have});
 }
 return {source:src.length,runtime:runtime.length,bad};
}
(async()=>{
 let browser;
 try{
  const srcExpect=sourceClassExpectations();
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(String(e)));page.on("console",m=>{if(m.type()==="error")pageErrors.push("console:"+m.text())});
  await page.goto(URL+"?full-matrix=20261026",{waitUntil:"networkidle"});
  await page.evaluate(()=>document.getElementById("rulesetModal")?.classList.remove("open"));
  const runtimeSpells=await page.evaluate(()=>SPELLS.map(x=>({eng:x.eng,cls:x.cls,lv:x.lv,identifier:x.identifier})));
  const spellParity=spellClassParity(runtimeSpells);
  const sourceExpectJson=JSON.stringify(srcExpect);
  const result=await page.evaluate(({sourceExpectJson})=>{
   const sourceExpect=JSON.parse(sourceExpectJson);
   let seed=0x5A17C0DE;
   const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
   const pick=a=>a[Math.floor(rnd()*a.length)];
   const shuffled=a=>[...a].sort(()=>rnd()-.5);
   const failures=[],samples=[],speciesSeen=new Set(),bgSeen=new Set(),classSeen=new Set(),subSeen=new Set();
   let cases=0,baseCases=0,subCases=0,featureChecks=0,spellChecks=0;
   const baseGear=()=>({armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{},bgPackage24:"",bgPackage14:""});
   const baseBio=()=>({look:"矩陣測試角色",traits:"測試",story:"固定 seed 隨機角色矩陣。",allies:"",notes:""});
   const chooseSpecies=()=>{
    S.sp=pick(SPECIES_2024);speciesSeen.add(S.sp.n);S.spChoices={};
    for(let pass=0;pass<4;pass++)for(const c of (S.sp.ch||[])){
      if(S.spChoices[c.k])continue;
      if(c.when&&Object.entries(c.when).some(([k,v])=>S.spChoices[k]!==v))continue;
      let opts=[];
      if(c.t==="castability")opts=["int","wis","cha"];
      else if(c.t==="skill")opts=[...ALL_SKILLS];
      else if(c.t==="ofeat")opts=originFeatOptions();
      else if(c.t==="ability")opts=ABILITIES.map(a=>a.k);
      else if(c.t==="spell")opts=spellsFor(c.code,c.level||0).map(x=>x.n);
      else if(Array.isArray(c.opts))opts=c.opts;
      else opts=(SP_OPTS[c.opts]||[]).map(x=>x.n);
      if(opts.length)S.spChoices[c.k]=pick(opts);
    }
   };
   const featureTokens=raw=>String(raw||"").split("、").map(x=>x.trim()).filter(Boolean).map(raw=>({raw,key:raw.split("(")[0].trim()}));
   const setup=(className,level,subIndex)=>{
    S.ruleset="2024";S.cls=CLASSES.find(x=>x.n===className);S.level=level;S.classLevels={[className]:level};S.sub=subIndex;
    S.classSubs={};S.spellByClass={};S.asiByClass={};S.classChoices14={};S.classChoices2024={};S.bgChoices14={};S.bgChoice2024={tool:""};S.originFeatChoices={};S.featSpells={};
    S.asi={};S.boon="";S.boonAb="";S.boonChoices={energy:[],skill:""};S.style="";S.styleCantrips2024=[];S.mastery=new Set();S.primalSkill="";
    S.cantrips=new Set();S.spellbook=new Set();S.prepared=new Set();S.customSpells=[];S.slotsUsed={};S.expertise=new Set();
    S.gear=baseGear();S.bio=baseBio();S.portrait="";
    const arr=shuffled([15,14,13,12,10,8]);S.base={str:arr[0],dex:arr[1],con:arr[2],int:arr[3],wis:arr[4],cha:arr[5]};
    S.skills=new Set(shuffled(S.cls.sk||[]).slice(0,S.cls.skc||0));
    S.bg=pick(BACKGROUNDS_2024);bgSeen.add(S.bg.n);chooseSpecies();
    document.getElementById("fName").value=`QA ${className} ${level}`;document.getElementById("fPlayer").value="Matrix";document.getElementById("fAlign").value="絕對中立";
    document.getElementById("fFaith").value="";document.getElementById("fGender").value="";document.getElementById("fAge").value="";
   };
   const validateCase=(className,level,subIndex,label)=>{
    cases++;if(subIndex==null)baseCases++;else subCases++;classSeen.add(className);
    const p=PROG_2024[className],sub=subIndex==null?null:p.subs[subIndex];if(sub)subSeen.add(className+"|"+sub.n);
    setup(className,level,subIndex);
    try{renderFinal();renderSpells()}catch(e){failures.push({case:label,kind:"render",error:String(e)});return}
    const final=document.getElementById("finalSheet"),text=final.textContent||"";
    const tips=[...final.querySelectorAll(".ft[data-tip]")].map(x=>({title:x.dataset.tipTitle||x.textContent||"",tip:x.dataset.tip||""}));
    const checkRaw=(raw,at,ctxSub)=>{
      for(const t of featureTokens(raw)){
        featureChecks++;
        const key=t.key,progress=/武器掌握增至|武器掌握\(\d+ 種\)/.test(t.raw);
        if(!text.includes(key))failures.push({case:label,kind:"feature-missing-render",feature:key,at,sub:ctxSub||""});
        const full=window.ZIZI_5R_FULL_FEATURE_RULES?.[`${className}|${ctxSub||""}|${key}|${at}`]||window.ZIZI_5R_FEATURE_OVERRIDES?.[`${className}|${ctxSub||""}|${key}`]||CLASSDESC_2024?.[className]?.[key]||ALLDESC?.[key]||SUBD?.[key];
        if(!progress){
          if(!full)failures.push({case:label,kind:"feature-no-rule-source",feature:key,at,sub:ctxSub||""});
          else if(!tips.some(x=>x.title.includes(key)&&x.tip.length>6))failures.push({case:label,kind:"feature-no-runtime-tip",feature:key,at,sub:ctxSub||""});
        }
      }
    };
    Object.entries(p.f||{}).filter(([lv])=>+lv<=level).forEach(([lv,raw])=>checkRaw(raw,+lv,""));
    if(sub)Object.entries(sub.f||{}).filter(([lv])=>+lv<=level).forEach(([lv,raw])=>checkRaw(raw,+lv,sub.n));
    const ci=castInfo(),src=sourceExpect[className];spellChecks++;
    const third=sub&&["魔能騎士","奧術騙徒"].includes(sub.n)&&level>=3;
    const shouldCast=!!src?.caster||third;
    if(shouldCast&&!ci)failures.push({case:label,kind:"castinfo-missing",caster:src?.caster,sub:sub?.n});
    if(!shouldCast&&ci)failures.push({case:label,kind:"castinfo-unexpected",ci});
    if(ci){
      const want=third?(level<7?1:level<13?2:level<19?3:4):(src.max[level-1]||0);
      if(want&&ci.max!==want)failures.push({case:label,kind:"spell-max-level",want,have:ci.max,ci});
      for(let sl=0;sl<=ci.max;sl++)for(const sp of spellsFor(ci.code,sl)){if(sp.lv!==sl)failures.push({case:label,kind:"spell-level-bad",spell:sp.n,sl,have:sp.lv})}
      const ap=alwaysPrepared();
      for(const sp of ap){if(!SPELLS.some(x=>x.n===sp.n))failures.push({case:label,kind:"always-prepared-missing-db",spell:sp.n});if(sp.lv>ci.max&&sp.lv>0)failures.push({case:label,kind:"always-prepared-too-high",spell:sp.n,spellLv:sp.lv,max:ci.max})}
    }
    if(samples.length<36&&rnd()<.12)samples.push({className,level,sub:sub?.n||null,species:S.sp?.n,bg:S.bg?.n,ci:ci?{max:ci.max,cant:ci.cant,prep:ci.prep,type:ci.type}:null,tipCount:tips.length});
   };
   for(const c of CLASSES){for(let lv=1;lv<=20;lv++)validateCase(c.n,lv,null,`${c.n} L${lv} base`)}
   for(const c of CLASSES){const p=PROG_2024[c.n];for(let si=0;si<(p.subs||[]).length;si++)for(let lv=3;lv<=20;lv++)validateCase(c.n,lv,si,`${c.n}/${p.subs[si].n} L${lv}`)}
   return {seed:"0x5A17C0DE",cases,baseCases,subCases,featureChecks,spellChecks,failures,samples,coverage:{classes:[...classSeen],subclasses:[...subSeen],species:[...speciesSeen],backgrounds:[...bgSeen]},runtime:{classes:CLASSES.length,subclasses:Object.values(PROG_2024).reduce((n,p)=>n+(p.subs||[]).length,0),spells:SPELLS.length,featRules:Object.keys(window.ZIZI_5R_FEAT_RULES||{}).length,activeOptionRules:Object.keys(window.ZIZI_5R_ACTIVE_OPTION_RULES||{}).length}};
  },{sourceExpectJson});
  const report={timestamp:new Date().toISOString(),url:URL,spellClassParity:spellParity,pageErrors,result};
  fs.writeFileSync(REPORT,JSON.stringify(report,null,2),"utf8");
  const failures=[...spellParity.bad,...pageErrors.map(x=>({kind:"page-error",error:x})),...result.failures];
  console.log(JSON.stringify({cases:result.cases,baseCases:result.baseCases,subCases:result.subCases,featureChecks:result.featureChecks,spellChecks:result.spellChecks,coverage:Object.fromEntries(Object.entries(result.coverage).map(([k,v])=>[k,v.length])),runtime:result.runtime,spellClassParity:{source:spellParity.source,runtime:spellParity.runtime,bad:spellParity.bad.length},failures:failures.slice(0,30),failureCount:failures.length,report:REPORT},null,2));
  assert.equal(failures.length,0,"full character matrix failures="+failures.length);
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright");
const URL=(process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true});
 const all=[],errors=[];
 try{
  for(const [width,height,name] of [[1440,900,"desktop"],[390,844,"mobile"]]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
   page.on("pageerror",e=>errors.push(name+": "+e.message));
   await page.goto(URL+"?class-resource="+name,{waitUntil:"domcontentloaded"});
   await page.locator('#refTabs [data-r="class"]').waitFor({state:"attached"});
   await page.waitForTimeout(350);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();go(8);});
   await page.locator('#refTabs [data-r="class"]').click();
   const result=await page.evaluate(()=>{
    const expect=(value,msg)=>{if(!value)throw Error(msg)};
    const M=window.ClassResourceMetrics5R;
    expect(M&&typeof M.cap==="function"&&typeof M.describe==="function","missing shared metric module");
    const lookup=(list,key)=>list.find(r=>r.key===key)?.value;
    const matrix={fullSlots:SLOTS_FULL,halfSlots:SLOTS_HALF,pact:PACT,thirdSlots:SLOTS_THIRD,thirdPrepared:THIRD_PREP,caster:CASTER,masteries:MAST_COUNT,progression:PROG_2024};
    let count=0,resourceParity=0;
    const preserved={ruleset:S.ruleset,cls:S.cls,level:S.level,sub:S.sub};
    for(const cls of CLASSES){
     const p=PROG_2024[cls.n];expect(p&&p.subs.length===4,"missing class/subclasses "+cls.n);
     for(let lv=1;lv<=20;lv++){
      const sub=p.subs[0].n;
      const values=M.describe(cls.n,sub,lv,matrix);
      expect(new Set(values.map(x=>x.key)).size===values.length,"duplicate metrics "+cls.n+" "+lv);
      expect(values.every(x=>typeof x.value==="string"&&x.value.trim()),"bad value "+cls.n+" "+lv);
      // The runtime is the other consumer of these resource caps.
      S.cls=cls;S.level=lv;S.sub=0;S.ruleset="2024";
      const runtime=classResources();
      for(const item of runtime){
       const expected=M.cap(cls.n,lv,item.k,{cha:1,wis:1});
       if(expected===null)continue;
       // Ability-score-dependent cards may differ from +1, so validate their formulas separately.
       if(["bi","stars-guiding-bolt","stars-cosmic-omen"].includes(item.k))continue;
       expect(item.max===expected,"runtime resource mismatch "+cls.n+"/"+lv+"/"+item.k+" "+item.max+" != "+expected);
       resourceParity++;
      }
      if(p.caster==="full"||p.caster==="half"){
       const rows=(p.caster==="full"?SLOTS_FULL:SLOTS_HALF)[lv];
       expect(lookup(values,"spell-slots")===rows.map((n,i)=>(i+1)+" 環×"+n).join("、"),"spell slot mismatch "+cls.n+" "+lv);
       expect(lookup(values,"prepared")===String(CASTER[cls.n].prep[lv-1]),"prepared mismatch "+cls.n+" "+lv);
      }
      if(p.caster==="pact"){
       const [n,spellLv]=PACT[lv];
       expect(lookup(values,"pact-slots")===n+" 格（"+spellLv+" 環）","pact progression mismatch "+lv);
       expect(Number(lookup(values,"invocations"))===invocationCount(),"invocation parity "+lv);
      }
      count++;
     }
    }
    Object.assign(S,preserved);
    const special=(cls,sub,lv)=>M.describe(cls,sub,lv,matrix);
    expect(lookup(special("戰士","魔能騎士",3),"spell-slots")==="1 環×2","Eldritch Knight third caster");
    expect(lookup(special("遊蕩者","奧術騙徒",3),"spell-slots")==="1 環×2","Arcane Trickster third caster");
    expect(lookup(special("德魯伊","星辰結社",3),"stars-guiding-bolt").includes("感知調整值"),"stars circle formula");
    expect(lookup(special("德魯伊","星辰結社",6),"stars-cosmic-omen").includes("感知調整值"),"cosmic omen formula");
    expect(lookup(special("武僧","開手之道",2),"ki")==="2","monk focus 2");
    expect(lookup(special("武僧","開手之道",20),"ki")==="20","monk focus 20");
    expect(lookup(special("遊蕩者","盜賊",20),"sneak")==="10d6","rogue sneak 20");
    expect(lookup(special("法師","預言師",20),"spellbook")==="44","wizard spellbook base");
    expect(M.cap("牧師",18,"cd")===4,"cleric channel 18");
    expect(M.cap("聖武士",11,"cd")===3,"paladin channel 11");
    expect(M.cap("野蠻人",17,"rage")===6,"barbarian rage 17");
    expect(M.cap("遊俠",17,"hm")===6,"ranger favored enemy 17");
    expect(M.cap("邪術師",18,"invocations")===10,"warlock invocation 18");
    expect(M.cap("吟遊詩人",5,"bi",{cha:5})===5,"bardic charisma formula");
    expect(M.cap("德魯伊",6,"stars-guiding-bolt",{wis:5})===5,"stars wisdom formula");
    expect(M.cap("德魯伊",6,"stars-guiding-bolt",{wis:-1})===1,"stars minimum use");
    expect(M.cap("武僧",21,"ki")===null,"reject invalid level");
    return {classes:CLASSES.length,subclasses:CLASSES.reduce((n,c)=>n+PROG_2024[c.n].subs.length,0),levels:count,resourceParity};
   });
   await page.locator('[data-cr5r-class="德魯伊"]').click();
   await page.locator('[data-cr5r-sub="星辰結社"]').click();
   await page.locator("#cr5rLv3 summary").evaluate(el=>{if(!el.parentElement.open)el.click()});
   assert((await page.locator("#cr5rLv3").innerText()).includes("星圖免費施法"),name+" star resource visible");
   assert.equal(await page.locator('[data-cr5r-overview-lv]').count(),20,name+" 1–20 resource overview");
   assert.equal(await page.locator('#cr5rLv3 [data-cr5r-stat="wild-known"]').count(),1,name+" wildshape forms");
   await page.locator('[data-cr5r-class="邪術師"]').click();
   const slot=await page.locator('#cr5rLv17 [data-cr5r-stat="pact-slots"]').textContent();
   assert(slot.includes("4 格（5 環）"),name+" warlock pact 17");
   await page.locator('[data-cr5r-class="戰士"]').click();
   await page.locator('[data-cr5r-sub="魔能騎士"]').click();
   assert((await page.locator('#cr5rLv3 [data-cr5r-stat="spell-slots"]').textContent()).includes("1 環×2"),name+" fighter third casting");
   const layout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    numerics:document.querySelector(".cr5r-numeric-grid")?.children.length,
    tableOverflow:document.querySelector(".cr5r-overview-scroll")?.scrollWidth>document.querySelector(".cr5r-overview-scroll")?.clientWidth,
    font:parseFloat(getComputedStyle(document.querySelector(".cr5r-numeric-item strong")).fontSize)
   }));
   assert(layout.overflow<=1,name+" page overflow "+JSON.stringify(layout));
   assert(layout.numerics>0&&layout.font>=15,name+" resource layout "+JSON.stringify(layout));
   if(name==="mobile")assert(layout.tableOverflow,name+" mobile table has horizontal scroller");
   await page.evaluate(()=>{S.ruleset="2014";S.cls=CLASSES.find(c=>c.n==="牧師");S.level=2;S.sub=0;});
   assert.equal(await page.evaluate(()=>classResources().find(x=>x.k==="cd")?.max),1,name+" 2014 cleric CD unmodified");
   all.push({name,...result,layout});
   await page.close();
  }
  assert.deepEqual(errors,[],"JavaScript page errors");
  console.log(JSON.stringify({PASS:true,report:all,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1);});
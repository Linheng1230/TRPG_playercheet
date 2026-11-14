"use strict";
const assert=require("assert");
const {chromium}=require("playwright");
const SITE=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(SITE+"?star-resource-qa="+Date.now(),{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const data=await page.evaluate(()=>{
    if(typeof resetAll==="function")resetAll();
    S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=3;
    S.classLevels={"德魯伊":3};
    S.sub=PROG_2024["德魯伊"].subs.findIndex(s=>s.n==="星辰結社");
    S.base={str:10,dex:14,con:14,int:10,wis:20,cha:10};
    S.sp={n:"人類"};S.play.res={};S.play.resMax={};S.play.custom=[];
    renderPlayStatusTab();
    const list=classResources(),guiding=list.find(r=>r.k==="stars-guiding-bolt");
    const spell=SPELLS.find(sp=>sp.identifier==="guiding-bolt");
    return {sub:S.sub,resource:guiding&&{max:guiding.max,effect:guiding.effect,recovery:guiding.recovery,hasRule:!!guiding.rule},
      spellLabel:spellNameText(spell),alias:spellFromGrant2024("光導箭")?.identifier,legacyAlias:spellFromGrant2024("光導劍")?.identifier,
      initialUsed:S.play.res["stars-guiding-bolt"]||0,
      absentAt2:(()=>{S.level=2;const hit=classResources().some(r=>r.k==="stars-guiding-bolt");S.level=3;return !hit})(),
      otherSubclass:(()=>{const orig=S.sub;S.sub=0;const hit=classResources().some(r=>r.k==="stars-guiding-bolt");S.sub=orig;return !hit})()
    };
   });
   assert(data.sub>=0,"stars subclass absent");
   assert(data.resource&&data.resource.max===5,JSON.stringify(data));
   assert(data.resource.effect.includes("光導箭")&&data.resource.recovery.includes("長休"),"star detail and recovery");
   assert(data.resource.hasRule,"canonical full-rule tip");
   assert(data.spellLabel==="光導箭 Guiding Bolt","display-only bilingual name");
   assert(data.alias==="guiding-bolt"&&data.legacyAlias==="guiding-bolt","canonical and legacy spell aliases");
   assert(data.absentAt2&&data.otherSubclass,"subclass and level gate");
   await page.evaluate(()=>go(11)); // Open the actual Play Status tab before clicking hidden controls.
   const root=page.locator("#playStatusBody");
   assert(await root.locator('[data-tip-title*="星圖"]').count()===1,"full-rule card");
   assert((await root.innerText()).includes("效果：")&&(await root.innerText()).includes("恢復："),"effect/recovery UI");
   await root.locator('[data-ps-action="res"][data-ps-key="stars-guiding-bolt"][data-ps-delta="1"]').click();
   const after=await page.evaluate(()=>{
     const before=serialize(),ok=deserialize(before).ok;
     renderPlayStatusTab();
     S.level=6;
     const omen=classResources().find(x=>x.k==="stars-cosmic-omen");
     return {ok,used:S.play.res["stars-guiding-bolt"],max:classResources().find(x=>x.k==="stars-guiding-bolt")?.max,
       omen:omen&&{max:omen.max,rule:!!omen.rule},saveUsed:before.play.res["stars-guiding-bolt"]};
   });
   assert(after.ok&&after.used===1&&after.saveUsed===1&&after.max===5,"save roundtrip "+JSON.stringify(after));
   assert(after.omen&&after.omen.max===5&&after.omen.rule,"level 6 cosmic omen");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
   assert(overflow<=3,width+"px overflow "+overflow);
   assert.deepStrictEqual(errors,[],"browser errors");
   console.log("PASS "+width+"px: star map 5 uses, feature tip, spell name, rest hint, level/subclass gate, JSON roundtrip, omen, no overflow");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exit(1)});

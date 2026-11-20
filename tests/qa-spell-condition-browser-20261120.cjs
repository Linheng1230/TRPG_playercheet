"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const fs=require("node:fs"),path=require("node:path");
const root=(process.env.QA_BASE||"http://127.0.0.1:18887/").replace(/\/?$/,"/");
const out="D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/condition-semantic-20261120";
fs.mkdirSync(out,{recursive:true});
const ids=["entangle","faerie-fire","poison-spray","ray-of-sickness","hold-person","blindness-deafness","grease","sleet-storm"];
async function toDruidSpells(page){
 await page.locator('[data-class-name="德魯伊"]').click();
 await page.locator('.step-panel.active .class-confirm-controls button').click();
 await page.locator("#next0").click();
 await page.locator("#bgGrid .pick-card").filter({hasText:"罪犯"}).first().click();
 await page.locator(".confirm-bg button").click();
 await page.locator("#spGrid .pick-card").filter({hasText:"矮人"}).first().click();
 await page.locator(".confirm-sp button").click();
 await page.locator("#next1").click();
 const sels=page.locator(".step-panel[data-step='2'] select");
 for(const [i,v] of ["15","14","13","12","10","8","int","con"].entries())await sels.nth(i).selectOption(v);
 await page.locator("#confirmAbilities").click();await page.locator("#next2").click();
 const skills=page.locator(".step-panel[data-step='3'] button.skill-chip:not(.fixed):not(:disabled)");
 const confirm=page.locator(".confirm-skills button");
 if(!await confirm.isEnabled())
  for(let i=0;i<await skills.count()&&!await confirm.isEnabled();i++)await skills.nth(i).click();
 await confirm.click();await page.locator("#next3").click();
 await page.locator("#fName").fill("QA 狀態語意法術小卡");
 await page.locator("#fPlayer").fill("Display-only QA");
 const lang=page.locator("#languageChoices select");
 for(let i=0;i<await lang.count();i++)await lang.nth(i).selectOption({index:i+1});
 await page.locator("#confirmLanguages").click();await page.locator("#next4").click();
 await page.locator('.step-panel.active [data-order="魔法師"]').click();
 await page.locator("#next5").click();
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const results=[];
 try{
  for(const [width,height] of [[320,700],[390,844],[1440,900]]){
   const mobile=width<500;
   const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage();page.setDefaultTimeout(17000);
   page.on("dialog",d=>d.accept());
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(root+"index.html?condition-qa=20261120",{waitUntil:"networkidle",timeout:38000});
   const audit=await page.evaluate(ids=>{
    const compact=x=>String(x||"").replace(/\s+/gu,"");
    const list=[];
    const map=globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024?.conditionTerms||{};
    if(Object.keys(map).length!==15)throw Error("Shared condition classifier unavailable");
    S.ruleset="2024";syncRulesetUI();
    for(const id of ids){
     const tuple=SPELLS_2024_TUPLES.find(r=>r[0]===id);
     if(!tuple)throw Error("Tuple missing "+id);
     const sp=SPELLS.find(s=>s.n===tuple[3]);
     if(!sp)throw Error("Spell unavailable "+id);
     const host=document.createElement("div");
     host.style.cssText="position:absolute;left:-3000px;top:0;width:360px";
     host.innerHTML=spellTipHTML(sp.n);document.body.appendChild(host);
     const node=host.querySelector(".tip-d");
     if(!node)throw Error(id+" no tooltip body");
     const found=Object.keys(map).filter(term=>sp.d.includes(term));
     const marked=[...node.querySelectorAll(".sr-condition")];
     const missing=found.filter(term=>!marked.some(n=>n.textContent===term&&n.dataset.condition===map[term]&&n.dataset.semanticType==="condition"));
     const colors=marked.map(n=>({condition:n.dataset.condition,color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundColor}));
     list.push({id,level:sp.lv,found,marked:marked.length,missing,
       parity:compact(node.textContent)===compact(sp.d),badWidth:host.scrollWidth-host.clientWidth,colors});
     host.remove();
    }
    S.ruleset="2014";syncRulesetUI();
    const original=SPELLS14.find(s=>s.lv===1);
    const legacy=spellTipHTML(original.n);
    const preserved=!legacy.includes("sr-condition")&&!legacy.includes("data-semantic-type");
    S.ruleset="2024";syncRulesetUI();
    return {list,legacyPreserved:preserved};
   },ids);
   for(const row of audit.list){
    assert(row.parity,width+" "+row.id+" canonical body text parity");
    assert.equal(row.missing.length,0,width+" "+row.id+" unmarked: "+row.missing);
    assert(row.badWidth<=2,width+" "+row.id+" horizontal overflow");
    assert(row.colors.every(x=>x.color!==x.background),width+" "+row.id+" color/background");
   }
   assert(audit.legacyPreserved,width+": 2014 renderer changed");
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await toDruidSpells(page);
   const entangleName=await page.evaluate(()=>SPELLS_2024_TUPLES.find(r=>r[0]==="entangle")[3]);
   const trigger=page.locator('.step-panel.active .sref[data-sref="'+entangleName+'"]').first();
   await trigger.waitFor({state:"visible"});await trigger.scrollIntoViewIfNeeded();
   const card=trigger.locator("xpath=ancestor::*[contains(@class,'creator-spell-card')][1]");
   const cardCondition=await card.locator(".sd .sr-condition[data-condition=restrained]").count();
   assert(cardCondition>0,width+": creator Entangle condition absent");
   if(mobile)await trigger.tap();else{await trigger.hover();await trigger.click();}
   const popup=page.locator("#spellTip.rule-popover-pinned");
   await popup.waitFor({state:"visible"});
   const popupMarks=await popup.locator(".tip-d .sr-condition[data-condition=restrained]").count();
   assert(popupMarks>0,width+": popover Entangle condition absent");
   const dims=await page.evaluate(()=>{
    const p=document.querySelector("#spellTip"),m=p.querySelector(".sr-condition");
    const r=p.getBoundingClientRect();
    return {overflowX:p.scrollWidth-p.clientWidth,pageOverflow:document.documentElement.scrollWidth-innerWidth,
      modalWidth:r.width,viewport:innerWidth,color:getComputedStyle(m).color,background:getComputedStyle(m).backgroundColor};
   });
   assert(dims.overflowX<=2&&dims.pageOverflow<=2,width+": overflow "+JSON.stringify(dims));
   await page.screenshot({path:path.join(out,"condition-entangle-"+width+".png")});
   if(mobile)await popup.locator(".rule-popover-close").tap();
   else await popup.locator(".rule-popover-close").click();
   assert.equal(await page.locator("#spellTip").getAttribute("aria-hidden"),"true");
   assert.equal(errors.length,0,width+": browser errors "+errors);
   results.push({width,height,mobile,spells:audit.list.map(x=>({id:x.id,level:x.level,terms:x.found,marks:x.marked})),cardCondition,popupMarks,dims,errors});
   await context.close();
  }
  fs.writeFileSync(path.join(out,"browser-qa.json"),JSON.stringify(results,null,2),"utf8");
  console.log("SPELL_CONDITION_BROWSER_PASS",JSON.stringify({viewports:results.map(x=>x.width),checkedSpells:ids.length,liveClicks:results.length,out}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

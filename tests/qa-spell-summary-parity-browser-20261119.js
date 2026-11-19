"use strict";
/* Live and local browser gate for the actual creator UI that showed the 60/150ft
   regression. Creates only in-memory QA character data; does not save/export. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const base=(process.env.QA_BASE||"http://127.0.0.1:18766/").replace(/\/?$/,"/");
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 const reports=[];
 try{
  for(const width of [320,390,1440]){
   const mobile=width<600;
   const ctx=await browser.newContext({viewport:{width,height:mobile?780:900},isMobile:mobile,hasTouch:mobile});
   const page=await ctx.newPage();page.setDefaultTimeout(20000);
   page.on("dialog",d=>d.accept());
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"index.html?spell-canonical-20261119=1",{waitUntil:"networkidle",timeout:40000});
   await page.waitForFunction(()=>window.SPELLS_2024_TUPLES?.length===391&&window.ZIZI_CREATOR_SPELL_GLANCE_2024,{timeout:20000});
   const source=await page.evaluate(()=>{
    const rows=SPELLS_2024_TUPLES, rules=SPELLS_2024_FULL_RULES,glance=ZIZI_CREATOR_SPELL_GLANCE_2024;
    const ids=["darkvision","befuddlement","prayer-of-healing","aura-of-vitality","ray-of-enfeeblement"];
    return ids.map(id=>{
     const row=rows.find(r=>r[0]===id);
     return {id,summary:row[13],canonical:rules[id],glance:glance.compact({identifier:id,n:row[3],d:rules[id]},row[4],{time:row[9],range:row[10],dur:row[12]}).text};
    });
   });
   const byId=new Map(source.map(s=>[s.id,s]));
   assert.match(byId.get("darkvision").summary,/150\s*呎黑暗視覺/);
   assert.match(byId.get("darkvision").glance,/150\s*呎黑暗視覺/);
   assert.doesNotMatch(byId.get("darkvision").glance,/60\s*呎黑暗視覺/);
   assert.match(byId.get("darkvision").canonical,/150呎黑暗視覺/);
   assert.match(byId.get("befuddlement").glance,/10d12/);
   assert.doesNotMatch(byId.get("befuddlement").glance,/4d6/);
   assert.doesNotMatch(byId.get("prayer-of-healing").glance,/施法屬性調整值/);
   assert.doesNotMatch(byId.get("aura-of-vitality").glance,/附贈動作/);
   assert.match(byId.get("ray-of-enfeeblement").glance,/D20/);
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.locator('[data-class-name="德魯伊"]').click();
   await page.locator(".step-panel.active .class-confirm-controls button").click();
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
   if(!await confirm.isEnabled()){
    for(let i=0;i<await skills.count()&&!await confirm.isEnabled();i++)await skills.nth(i).click();
   }
   await confirm.click();await page.locator("#next3").click();
   await page.locator("#fName").fill("法術預覽規則一致性 QA");
   await page.locator("#fPlayer").fill("CI");
   const lang=page.locator("#languageChoices select");
   for(let i=0;i<await lang.count();i++)await lang.nth(i).selectOption({index:i+1});
   await page.locator("#confirmLanguages").click();await page.locator("#next4").click();
   await page.locator(".step-panel.active [data-order='魔法師']").click();
   await page.locator("#next5").click();
   // Only alter ephemeral QA browser state to reproduce a level-4 caster.
   await page.evaluate(()=>{S.level=4;renderSpells()});
   const trigger=page.locator(".step-panel.active .sref[data-sref='黑暗視覺']").first();
   await trigger.waitFor({state:"visible"});
   const card=trigger.locator("xpath=ancestor::*[contains(@class,'creator-spell-card')]");
   const visiblePreview=await card.locator(".sd").innerText();
   assert.match(visiblePreview,/150\s*呎黑暗視覺/);
   assert.doesNotMatch(visiblePreview,/60\s*呎黑暗視覺/);
   const highlight=await card.locator(".sd").evaluate(el=>Boolean(el.querySelector(".sr-readable")));
   assert(highlight,"2024 reader styling must be preserved");
   if(mobile)await trigger.tap();else await trigger.click();
   const tooltip=page.locator("#spellTip.rule-popover-pinned");
   await tooltip.waitFor({state:"visible"});
   const canonicalDetail=await tooltip.locator(".tip-d").innerText();
   assert.match(canonicalDetail,/150呎黑暗視覺/);
   assert.doesNotMatch(canonicalDetail,/60呎黑暗視覺/);
   const btn=tooltip.locator("[data-rule-popover-close]");
   if(mobile)await btn.tap();else await btn.click();
   const hidden=await page.evaluate(()=>spellTip.style.display==="none");
   assert(hidden,"Tooltip must close after tap/click");
   assert.equal(errors.length,0,"No page script errors");
   reports.push({width,pass:true,preview:visiblePreview,detailValue:"150呎黑暗視覺",sourceCoverage:source.length,closed:hidden});
   await ctx.close();
  }
 }finally{await browser.close();}
 console.log("SPELL_PREVIEW_LIVE_PARITY_PASS "+JSON.stringify(reports));
})().catch(e=>{console.error("SPELL_PREVIEW_LIVE_PARITY_FAIL",e.stack||e);process.exitCode=1});

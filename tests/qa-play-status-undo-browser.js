"use strict";
const assert=require("node:assert/strict");
const path=require("node:path"),{pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const local=pathToFileURL(path.resolve(__dirname,"..","index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(local,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function"&&window.PlayStatusRest5R&&window.PlayStatusUndo5R);
   await page.waitForTimeout(300);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();S.id=newId();
    S.cls=CLASSES.find(x=>x.n==="戰士");S.level=4;S.classLevels={戰士:4};
    S.base={str:16,dex:12,con:14,int:10,wis:10,cha:10};
    S.play={hp:11,hpMax:null,thp:3,hd:3,ds:{s:1,f:2},insp:true,
      res:{sw:2,ai:1},resMax:{},custom:[{n:"測試用品",max:3,used:2,rest:"long"}],notes:"不應被還原"};
    S.slotsUsed={};
    document.querySelector("#fName").value="UNDO QA "+S.id;
    go(11);
   });
   const button=page.locator('#playStatusBody [data-ps-action="undo"]');
   assert(await button.isDisabled(),"new character should have disabled undo");
   const state=()=>page.evaluate(()=>({
     tracked:JSON.parse(JSON.stringify(window.PlayStatusUndo5R.snapshot(S))),
     hasUndo:!!window.PlayStatusUndo5R.available(S,S.play.hpMax),
     notes:S.play.notes,
     id:S.id
   }));
   const first=await state();
   // HP changes undo and empty history after exactly one use.
   await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
   assert.equal((await state()).tracked.hp,10);
   assert(await button.isEnabled());
   await button.click();
   assert.deepEqual((await state()).tracked,first.tracked,"damage undo must restore HP and temp HP");
   assert(await button.isDisabled(),"undo is one-shot, no second undo");
   // Hit dice manual adjustment is reversible.
   await page.locator('#playStatusBody [data-ps-action="hd"][data-ps-delta="-1"]').click();
   assert.equal((await state()).tracked.hd,2);
   await button.click();assert.equal((await state()).tracked.hd,3);
   // Class resources are reversible.
   await page.locator('#playStatusBody [data-ps-action="res"][data-ps-key="sw"][data-ps-delta="1"]').click();
   assert.equal((await state()).tracked.res.sw,3);
   await button.click();assert.equal((await state()).tracked.res.sw,2);
   // Short rest: real dice choice and confirmation, undo full effects.
   const beforeShort=await state();
   await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
   await page.locator('#psRestDialog input[name="psRestUse"][value="yes"]').check();
   await page.locator('#psRestDiceCount').fill("1");
   await page.locator('#psRestDialog [data-rest-submit]').click();
   await page.waitForFunction(()=>document.querySelector("#psRestDialog")?.textContent?.includes("短休完成"));
   assert.equal((await state()).tracked.hd,2);
   await page.locator('#psRestDialog [data-rest-close]').click();
   await button.click();
   assert.deepEqual((await state()).tracked,beforeShort.tracked,"short-rest undo must restore HP, dice and resource");
   // Long rest: restore all counters, temporary HP, inspiration, death saves.
   const beforeLong=await state();
   await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
   await page.waitForFunction(()=>document.querySelector("#psRestDialog")?.textContent?.includes("長休完成"));
   assert.equal((await state()).tracked.custom[0].used,0);
   await page.locator('#psRestDialog [data-rest-close]').click();
   await button.click();
   assert.deepEqual((await state()).tracked,beforeLong.tracked,"long-rest undo must be atomic across all fields");
   // Survives serialize/save → browser reload (not only in-memory).
   await page.locator('#playStatusBody [data-ps-action="heal1"]').click();
   assert.equal((await state()).tracked.hp,12);
   await page.waitForTimeout(1200);
   const beforeReload=await state();
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>window.PlayStatusUndo5R&&typeof go==="function");
   await page.waitForTimeout(300);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.locator("#stepNav .nav-primary button").filter({hasText:"跑團狀態"}).click();
   assert.equal((await state()).tracked.hp,12,"save/reload retains changed HP");
   assert(await button.isEnabled(),"undo must survive reload");
   await button.click();assert.equal((await state()).tracked.hp,11,"reload undo restores exact prior HP");
   assert.equal((await state()).notes,"不應被還原");
   // Spell slot UI changes also require undo.
   await page.evaluate(()=>{
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=3;S.classLevels={法師:3};
    S.slotsUsed={l1:1,l2:0};S.play.undo=null;renderPlayStatusTab();
   });
   const slot=page.locator('#playStatusBody [data-ps-action="slot"][data-ps-key="l1"][data-ps-delta="1"]');
   assert(await slot.isVisible(),"Wizard should have L1 spell slot controls");
   await slot.click();assert.equal((await state()).tracked.slotsUsed.l1,2);
   await button.click();assert.equal((await state()).tracked.slotsUsed.l1,1);
   // Explicit negative cases: cap / stale edits must not create unsafe undo.
   await page.evaluate(()=>{S.play.hp=S.play.hpMax;delete S.play.undo;renderPlayStatusTab()});
   await page.locator('#playStatusBody [data-ps-action="heal1"]').click();
   assert(await button.isDisabled(),"no-op healing should not create a history entry");
   await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
   await page.evaluate(()=>{S.slotsUsed.l1=3;renderPlayStatusTab()});
   assert(await button.isDisabled(),"external state edits invalidate last undo");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=1,"horizontal overflow at "+width+": "+overflow);
   assert.deepEqual(errors,[],"runtime errors width="+width);
   await page.close();
  }
  console.log("PASS: undo desktop/mobile actual controls, short/long/HP/HD/resources/slots, reload, no-op and stale protections");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

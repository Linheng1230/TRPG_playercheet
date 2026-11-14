"use strict";
// Real published-site acceptance: user-equivalent import → navigation → click → undo → reload.
// All QA data lives only in the fresh isolated Chromium context; no user records are reused.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),{chromium}=require("playwright");
const url=process.env.QA_URL;
if(!url||!/^https:\/\/[^/]+/.test(url))throw Error("QA_URL must be the published HTTPS Pages URL");
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures","legacy-wizard.json"),"utf8")).save;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844},acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   page.on("dialog",d=>d.accept());
   const marker="QA_UNDO_"+width+"_"+Date.now();
   await page.goto(url.replace(/\/$/,"")+"/?qa-undo="+encodeURIComponent(marker),{waitUntil:"domcontentloaded"});
   await page.waitForSelector("#fileInput",{state:"attached"});
   await page.waitForTimeout(350);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const save=JSON.parse(JSON.stringify(fixture));
   save.id=marker;save.meta={...(save.meta||{}),name:marker};
   save.play={hp:12,hpMax:100000,thp:0,hd:4,ds:{s:1,f:1},insp:false,res:{ar:0},resMax:{},custom:[],notes:"QA隔離"};
   save.slotsUsed={l1:1,l2:0};
   await page.locator("#fileInput").setInputFiles({name:marker+".json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(save),"utf8")});
   await page.locator("#stepNav .nav-primary button").filter({hasText:"跑團狀態"}).click();
   const undo=page.locator('#playStatusBody [data-ps-action="undo"]');
   const hp=()=>page.locator("#playStatusBody .ps-stat").first().locator(".ps-value").innerText();
   const hd=()=>page.locator("#playStatusBody .ps-line").filter({hasText:/生命骰 d/}).locator(".ps-count").innerText();
   const initial=await hp();
   assert(await undo.isDisabled(),"fresh imported save has no undo history");
   await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
   assert.notEqual(await hp(),initial);
   assert(await undo.isEnabled());
   await undo.click();assert.equal(await hp(),initial);assert(await undo.isDisabled());
   // Spell slot tracking.
   const slot=page.locator('#playStatusBody [data-ps-action="slot"][data-ps-key="l1"][data-ps-delta="1"]');
   assert(await slot.isVisible());
   const slotCount=()=>slot.locator("xpath=../..").locator(".ps-count").innerText();
   const slotBefore=await slotCount();
   await slot.click();assert(await undo.isEnabled());
   assert.notEqual(await slotCount(),slotBefore,"spending a spell slot must update its remaining count");
   await undo.click();
   assert.equal(await slotCount(),slotBefore,"undo must restore actual remaining spell slots");
   // Short rest must consume die, then undo it.
   const beforeShortHP=await hp(),beforeShortHD=await hd();
   await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
   await page.locator('#psRestDialog input[name="psRestUse"][value="yes"]').check();
   await page.locator("#psRestDiceCount").fill("1");
   await page.locator('#psRestDialog [data-rest-submit]').click();
   await page.waitForFunction(()=>document.querySelector("#psRestDialog")?.textContent?.includes("短休完成"));
   await page.locator("#psRestDialog [data-rest-close]").click();
   assert.notEqual(await hd(),beforeShortHD);
   await undo.click();
   assert.equal(await hd(),beforeShortHD);assert.equal(await hp(),beforeShortHP);
   // Long rest restores everything; undo returns pre-rest.
   const beforeLongHP=await hp(),beforeLongHD=await hd();
   await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
   await page.waitForFunction(()=>document.querySelector("#psRestDialog")?.textContent?.includes("長休完成"));
   await page.locator("#psRestDialog [data-rest-close]").click();
   assert(await undo.isEnabled());
   await undo.click();
   assert.equal(await hp(),beforeLongHP);assert.equal(await hd(),beforeLongHD);
   // Autosave and fresh reload keep the last operation undo-able.
   await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
   await page.waitForTimeout(1300);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForTimeout(350);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.locator("#stepNav .nav-primary button").filter({hasText:"跑團狀態"}).click();
   assert(await undo.isEnabled(),"undo should persist after full reload");
   await undo.click();
   assert.equal(await hp(),initial);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=1,"published UI overflow at "+width+"px="+overflow);
   assert.deepEqual(errors,[],"published runtime errors: "+errors.join("; "));
   await context.close();
  }
  console.log("PASS: published Pages player UI import, HP/slots/short/long undo, reload and mobile/desktop");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

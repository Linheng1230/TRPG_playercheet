"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe"});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e.message||e)));
  const url=process.env.QA_BASE?process.env.QA_BASE+"/index.html":pathToFileURL(path.resolve(__dirname,"../index.html")).href;
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof renderFinal==="function"&&typeof renderPlayStatusTab==="function");
  await page.waitForTimeout(300); // Initial ruleset dialog is scheduled 150ms after load.
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  const initial=await page.evaluate(()=>{
   S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};
   ABILITIES.forEach(a=>S.base[a.k]=10);S.base.con=14;S.base.wis=16;
   document.getElementById("fName").value="單一跑團狀態來源測試";
   S.play.hp=null;S.play.hpMax=null;S.play.thp=1;S.play.res={ws:0};S.play.notes="";S.slotsUsed={};
   go(11);if(!saveCurrent(true))throw Error("saveCurrent failed");
   return {id:S.id,hp:S.play.hp,max:S.play.hpMax};
  });
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  assert.equal(await page.locator('#stepNav .nav-primary button').count(),4,"independent play status is a fourth top tab");
  assert(await page.locator('#playStatusBody [data-ps-action="damage1"]').isVisible(),"play status HP control remains");
  assert.equal(await page.locator('#playStatusBody [data-ps-action="slot"][data-ps-key="l1"]').count(),2,"spell slot controls remain in play tab");
  await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
  await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
  await page.locator('#playStatusBody [data-ps-action="slot"][data-ps-key="l1"][data-ps-delta="1"]').click();
  await page.locator('#playStatusBody [data-ps-action="res"][data-ps-key="ws"][data-ps-delta="1"]').click();
  await page.locator("#psNotes").fill("單一入口紀錄");
  await page.waitForTimeout(1100);
  const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem("dnd5r:char:"+id)),initial.id);
  assert.equal(saved.play.hp,initial.hp-1,"temporary HP absorbed first");
  assert.equal(saved.slotsUsed.l1,1,"spell slot persisted");
  assert.equal(saved.play.res.ws,1,"class resource persisted");
  assert.equal(saved.play.notes,"單一入口紀錄","notes persisted");
  await page.evaluate(()=>go(7));
  assert.equal(await page.locator('#finalSheet .native-play-status, #finalSheet .slot-track, #finalSheet [data-hp], #finalSheet [data-slot], #finalSheet [data-res], #finalSheet #playNotes').count(),0,"no duplicate play/status controls in character sheet");
  assert.equal(await page.locator('#finalJumpNav [data-sheet-jump=status], #finalJumpNav [data-sheet-jump=slots]').count(),0,"no duplicate sheet jump tabs");
  assert.match(await page.locator('#finalSheet .fs-statrow').innerText(),new RegExp(String(initial.hp-1)+"\\s*\\/\\s*"+String(initial.max)),"character card still shows current HP");
  await page.reload();
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>go(11));
  assert.equal(await page.evaluate(()=>S.slotsUsed.l1),1,"spell slot reload");
  assert.equal(await page.evaluate(()=>S.play.res.ws),1,"resource reload");
  assert.equal(await page.locator("#psNotes").inputValue(),"單一入口紀錄");
  for(const width of [390,480,1440]){
   await page.setViewportSize({width,height:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,"no horizontal overflow at "+width);
  }
  assert.deepEqual(errors,[],"no browser JS errors");
  console.log("PASS no duplicate character-sheet trackers; independent play tab, HP, slots, resources, notes, save/reload, mobile");
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

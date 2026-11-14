"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(root,"index.html")).href,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function" && window.PlayStatusRest5R);
   await page.waitForTimeout(250);
   if(await page.locator("#rulesetModal.open").count()) await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="戰士");S.level=4;S.classLevels={戰士:4};
    S.base={str:16,dex:12,con:14,int:10,wis:10,cha:10};
    S.play={hp:8,hpMax:null,thp:3,hd:4,ds:{s:1,f:1},insp:true,res:{sw:2,ai:1},resMax:{},custom:[{n:"藥劑",max:2,used:1,rest:"long"}],notes:"QA筆記"};
    S.slotsUsed={};document.getElementById("fName").value="短休測試";
    go(11);
   });
   assert.equal(await page.locator('#playStatusBody button[data-ps-action="rest-short"]').count(),1);
   await page.locator('#playStatusBody button[data-ps-action="rest-short"]').click();
   const shortDlg=page.locator("#psRestDialog");
   assert(await shortDlg.isVisible());
   assert.match(await shortDlg.innerText(),/回氣|動作如潮/);
   await shortDlg.locator("#psRestDiceCount").fill("2");
   await shortDlg.locator('[data-rest-submit]').click();
   await page.waitForFunction(()=>document.querySelector("#psRestDialog")?.textContent?.includes("短休完成"));
   const after=await page.evaluate(()=>({hp:S.play.hp,hd:S.play.hd,sw:S.play.res.sw,ai:S.play.res.ai,notes:S.play.notes,save:serialize()}));
   assert(after.hp>=14&&after.hp<=after.save.play.hpMax,"life dice recovery must respect rolled minimum and actual class HP maximum: "+JSON.stringify(after));
   assert.equal(after.hd,2);assert.equal(after.sw,1);assert.equal(after.ai,0);
   assert.equal(after.notes,"QA筆記");
   assert.equal(after.save.play.hp,after.hp);
   await page.locator("#psRestDialog [data-rest-close]").click();
   await page.locator('#playStatusBody button[data-ps-action="rest-long"]').click();
   await page.waitForFunction(()=>document.querySelector("#psRestDialog")?.textContent?.includes("長休完成"));
   const long=await page.evaluate(()=>({hp:S.play.hp,hd:S.play.hd,thp:S.play.thp,ds:S.play.ds,sw:S.play.res.sw,custom:S.play.custom[0].used,save:serialize()}));
   assert.equal(long.hp,long.save.play.hpMax);
   assert.equal(long.hd,4);assert.equal(long.thp,0);assert.equal(long.sw,0);assert.equal(long.custom,0);
   assert.equal(long.ds.s,0);assert.equal(long.ds.f,0);
   await page.locator("#psRestDialog [data-rest-close]").click();
   const roundtrip=await page.evaluate(()=>{const o=serialize();deserialize(o);go(11);return serialize()});
   assert.equal(roundtrip.play.hp,long.hp);
   assert.equal(roundtrip.play.hd,4);
   assert.equal(roundtrip.play.res.sw,0);
   const extent=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    action:!!document.querySelector('#playStatusBody [data-ps-action="rest-short"]'),
    buttonWidth:document.querySelector('#playStatusBody [data-ps-action="rest-short"]').getBoundingClientRect().width
   }));
   assert(extent.overflow<=1,"viewport horizontal overflow "+width+": "+extent.overflow);
   assert(extent.buttonWidth>=120,"rest shortcut should remain touch-friendly");
   assert(extent.action);
   assert.deepEqual(errors,[],"uncaught errors at width "+width);
   await page.close();
  }
  console.log("PASS: 390/480/1440 play status rest dialogs, data changes, save round-trip and no overflow");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

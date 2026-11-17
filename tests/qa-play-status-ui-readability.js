"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const url=pathToFileURL(path.join(root,"index.html")).href;
const output="D:\\Tools\\zizi-ai-runtime\\trpg-playercheet-qa\\play-status-ui-20261117";
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  for(const width of [320,390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   const errors=[],dialogs=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",async dialog=>{dialogs.push(dialog.type());await dialog.dismiss()});
   await page.goto(url,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>window.DND5RSessionEffects&&typeof go==="function");
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();S.id=newId();
    S.cls=CLASSES.find(x=>x.n==="戰士");S.level=4;S.classLevels={戰士:4};
    S.base={str:16,dex:12,con:14,int:10,wis:10,cha:10};
    S.play={hp:25,hpMax:hpTotal(),thp:0,hd:4,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"視覺 QA"};
    document.querySelector("#fName").value="Play UI QA "+S.id;
    go(11);document.querySelector("#rulesetModal")?.classList.remove("open");
   });
   await page.waitForTimeout(750);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").evaluate(el=>el.click());
   const panel=page.locator("#playStatusBody");
   const life=panel.locator("#psLife");
   const conc=panel.locator('.session-effects[aria-label="專注管理"]');
   const states=panel.locator('.session-effects[aria-label="狀態效果管理"]');
   assert.equal(await panel.locator("[data-session-condition]").count(),14);
   assert.equal(await panel.locator(".ps-vitals-grid").count(),1);
   assert.equal(await panel.locator("#psHPAmount").count(),1);
   assert.equal(await panel.locator("#psTempAmount").count(),1);
   const geom=await page.evaluate(()=>{
    const a=document.querySelector(".ps-vitals-main").getBoundingClientRect();
    const b=document.querySelector(".ps-vitals-side").getBoundingClientRect();
    return {sameRow:Math.abs(a.top-b.top)<10,documentOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert.equal(geom.sameRow,width>=721,"HP/HD layout at "+width);
   assert(geom.documentOverflow<=1,"whole page overflow "+width+": "+geom.documentOverflow);
   await states.locator('.session-condition-row:has([data-session-condition="blinded"]) summary').click();
   assert(await states.locator('.session-condition-row:has([data-session-condition="blinded"]) .ps-term-disadvantage').count()>0);
   assert(await states.locator('.session-condition-row:has([data-session-condition="blinded"]) .ps-term-advantage').count()>0);
   await states.locator('.session-condition-row:has([data-session-condition="restrained"]) summary').click();
   assert(await states.locator('.session-condition-row:has([data-session-condition="restrained"]) .ps-term-save').count()>0);
   const computed=await states.locator(".session-rule-lines p").first().evaluate(el=>({
    size:parseFloat(getComputedStyle(el).fontSize),
    lineHeight:parseFloat(getComputedStyle(el).lineHeight),
    width:el.getBoundingClientRect().width,
    scrollWidth:el.scrollWidth
   }));
   assert(computed.size>=15,"rule text too small "+width);
   assert(computed.lineHeight>=24,"line-height too low "+width);
   assert(computed.scrollWidth<=computed.width+2,"rule line overflow "+width);
   await life.screenshot({path:path.join(output,"life-"+width+".png")});
   await conc.screenshot({path:path.join(output,"concentration-"+width+".png")});
   await states.screenshot({path:path.join(output,"conditions-"+width+".png")});
   await conc.locator("[data-session-start]").click();
   assert.equal(await page.evaluate(()=>S.play.concentration2024),"專注中");
   assert(await conc.locator("[data-session-start]").isDisabled());
   assert(await conc.locator("[data-session-end]").isEnabled());
   await page.locator("#psHPAmount").fill("22");
   await life.locator('[data-ps-action="damage"]').click();
   assert.match(await conc.locator(".session-save-alert").innerText(),/DC\s*11/);
   await conc.locator('[data-session-save="success"]').click();
   assert.equal(await page.evaluate(()=>S.play.concentration2024),"專注中");
   await conc.locator("[data-session-end]").click();
   assert.equal(await page.evaluate(()=>S.play.concentration2024),"");
   assert(await conc.locator("[data-session-start]").isEnabled());
   await life.locator('[data-ps-action="hd"][data-ps-delta="-1"]').click();
   assert.equal(await page.evaluate(()=>S.play.hd),3);
   const popup=panel.locator(".ps-resource-tip.ft").first();
   if(await popup.count()){
    await popup.hover();
    await page.waitForTimeout(150);
    assert(await page.locator("#featureTip .ps-term").count()>0,"feature tooltip terms missing at "+width);
   }
   assert.deepEqual(dialogs,[],"no modal prompt expected");
   assert.deepEqual(errors,[],"script errors");
   console.log("PASS viewport "+width+"px: responsive, semantic rules, no prompt, HP/HD, save DC, captures");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

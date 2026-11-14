"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},reducedMotion:"reduce"});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   const url=(process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html";
   await page.goto(url,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function"&&window.PlayStatusCreatures5R);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};
    ABILITIES.forEach(a=>S.base[a.k]=10);S.base.con=14;S.base.wis=16;S.base.dex=14;
    S.play.hp=null;S.play.hpMax=null;S.play.hd=null;S.play.ds={s:0,f:0};
    S.play.res={};S.play.resMax={};S.play.custom=[];S.slotsUsed={};S.play.insp=false;
    document.getElementById("fName").value="跑團快捷導覽 QA";
    go(11);
   });
   await page.waitForTimeout(350);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const nav=page.locator("#playStatusBody > .ps-jump-nav");
   await nav.waitFor({state:"visible"});
   assert.equal(await page.locator('#playStatusBody [data-ps-action="creatureJump"]').count(),0,"duplicate creature jump button must be absent");
   const labels=await nav.locator(".ps-jump-scroll button").allTextContents();
   for(const label of ["總覽","屬性調整值","生命值／生命骰","死亡豁免／英雄激勵","法術位","職業特性／資源","跑團筆記"])
    assert(labels.includes(label),"missing grouped shortcut "+label+" at "+width);
   for(const obsolete of ["生命值","生命骰","死亡豁免","英雄激勵"])
    assert(!labels.includes(obsolete),"redundant nested shortcut "+obsolete+" at "+width);
   const sections=await page.locator("#playStatusBody > .ps-section").count();
   assert.equal(labels.length,sections+1,"one shortcut per actual section plus overview at "+width);
   const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2);
   assert(noOverflow,"page horizontal overflow at "+width);
   if(width===390){
    const horizontal=await nav.locator(".ps-jump-scroll").evaluate(el=>{
     const before=el.scrollLeft;el.scrollLeft=el.scrollWidth;
     return {scrollable:el.scrollWidth>el.clientWidth,position:el.scrollLeft,before};
    });
    assert(horizontal.scrollable&&horizontal.position>0,"mobile shortcuts must swipe horizontally");
   }
   await page.evaluate(()=>window.scrollTo(0,550));
   await page.waitForTimeout(120);
   const pinned=await page.evaluate(()=>{
    const n=document.querySelector("#playStatusBody > .ps-jump-nav");
    return {y:n.getBoundingClientRect().y,top:document.querySelector("nav.steps").getBoundingClientRect().height};
   });
   assert(Math.abs(pinned.y-pinned.top)<8,"shortcuts must stay under primary navigation "+width+" "+JSON.stringify(pinned));
   const jump=label=>nav.locator("button").filter({hasText:new RegExp("^"+label+"$")});
   const back=nav.locator(".ps-jump-back");
   assert(await back.isDisabled(),"back must be disabled before first jump at "+width);
   const originY=await page.evaluate(()=>window.scrollY);
   await jump("生命值／生命骰").click();
   await page.waitForTimeout(100);
   assert(!(await back.isDisabled()),"back enabled after jump at "+width);
   const life=await page.evaluate(()=>{
    const section=Array.from(document.querySelectorAll("#playStatusBody > .ps-section")).find(el=>/生命值.*生命骰/.test(el.querySelector("h3")?.textContent||""));
    return {top:section.getBoundingClientRect().top,offset:document.querySelector("nav.steps").getBoundingClientRect().height+document.querySelector(".ps-jump-nav").getBoundingClientRect().height,hasDice:Array.from(section.querySelectorAll(".ps-line")).some(el=>/^生命骰/.test(el.querySelector("b")?.textContent?.trim()||""))};
   });
   assert(life.hasDice,"combined health section retains hit dice "+width);
   assert(life.top>=life.offset-12&&life.top<life.offset+55,"combined health section must be visible below sticky bars "+width+" "+JSON.stringify(life));
   await back.click();
   await page.waitForTimeout(110);
   const returnedY=await page.evaluate(()=>window.scrollY);
   assert(Math.abs(returnedY-originY)<12,"back must restore scroll position at "+width+" "+JSON.stringify({originY,returnedY}));
   assert(await back.isDisabled(),"back disabled when history emptied");
   await jump("生命值／生命骰").click();
   await page.waitForTimeout(100);
   await jump("死亡豁免／英雄激勵").click();
   await page.waitForTimeout(100);
   const death=await page.evaluate(()=>{
    const section=Array.from(document.querySelectorAll("#playStatusBody > .ps-section")).find(el=>/死亡豁免/.test(el.querySelector("h3")?.textContent||""));
    return {top:section.getBoundingClientRect().top,offset:document.querySelector("nav.steps").getBoundingClientRect().height+document.querySelector(".ps-jump-nav").getBoundingClientRect().height};
   });
   assert(death.top>=death.offset-12&&death.top<death.offset+55,"death save must be visible below sticky bars "+width+" "+JSON.stringify(death));
   await page.locator('#playStatusBody [data-ps-action="heal1"]').click();
   await nav.waitFor({state:"visible"});
   assert((await nav.locator("button").allTextContents()).includes("生命值／生命骰"),"grouped quick nav survives counter re-render");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,"no overflow after re-render");
   assert.deepEqual(errors,[],"no page errors at "+width);
   console.log("PASS play status sticky-jump width "+width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});

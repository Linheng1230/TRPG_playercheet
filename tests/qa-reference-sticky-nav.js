"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},reducedMotion:"reduce"});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.goto((process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function"&&window.ReferenceStickyNav);
   await page.waitForTimeout(400);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>go(8));
   const tabs=page.locator("#refTabs");
   const expected=["能力速查","魔法物品","生物資料","工具","武器表","武器精通","專長","戰鬥風格","行動教學","狀態"];
   const currentLabels=await tabs.locator("button").allTextContents();
   assert.deepEqual(currentLabels.slice(0,expected.length),expected,"original canonical options retained "+width);
   assert(currentLabels.includes("抗性"),"live resistance category inherits the navigation "+width);
   assert.equal(new Set(currentLabels).size,currentLabels.length,"no duplicate category shortcuts "+width);
   const initial=await tabs.evaluate(el=>({
    style:getComputedStyle(el).position,display:getComputedStyle(el).display,wrap:getComputedStyle(el).flexWrap,
    scroll:el.scrollWidth,client:el.clientWidth, buttons:[...el.querySelectorAll("button")].map(b=>b.getBoundingClientRect().height),
    offset:parseInt(getComputedStyle(el).top,10),
    header:Math.ceil(document.getElementById("stepNav").getBoundingClientRect().height)
   }));
   assert.equal(initial.style,"sticky","sticky tabs "+width);
   assert.equal(initial.display,"flex","one row of tabs "+width);
   assert.equal(initial.wrap,"nowrap","no multi-row wrapped tabs "+width);
   assert(initial.buttons.every(h=>h>=44),"touch-sized buttons "+width);
   assert.equal(initial.offset,initial.header,"dynamic main nav offset "+width);
   if(width<=480)assert(initial.scroll>initial.client,"horizontal scroll available "+width);
   await page.evaluate(()=>{
    const el=document.getElementById("refTabs");
    if(!el.querySelector('button[data-r="class"]')){
      const b=document.createElement("button");b.type="button";b.dataset.r="class";b.dataset.qaDynamic="1";b.textContent="職業";el.appendChild(b);
    }
   });
   assert((await tabs.locator("button").allTextContents()).includes("職業"),"future class option auto-participates without parallel registration");
   await page.evaluate(()=>document.querySelectorAll("#refTabs [data-qa-dynamic]").forEach(b=>b.remove()));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,"no whole page horizontal overflow "+width);
   await page.evaluate(()=>window.scrollTo(0,1400));
   await page.waitForTimeout(150);
   const pinned=await page.evaluate(()=>({
    tabsTop:document.getElementById("refTabs").getBoundingClientRect().top,
    navHeight:document.getElementById("stepNav").getBoundingClientRect().height
   }));
   assert(Math.abs(pinned.tabsTop-pinned.navHeight)<6,"tabs remain visible during deep scroll "+width+" "+JSON.stringify(pinned));
   for(const [key,label] of [["item","魔法物品"],["creature","生物資料"],["tool","工具"],["weapon","武器表"]]){
    await page.locator('#refTabs button[data-r="'+key+'"]').click();
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(()=>refTab),key,"original category state switches to "+key+" at "+width);
    assert(await page.locator('#refTabs button[data-r="'+key+'"]').evaluate(e=>e.classList.contains("active")),"active highlight "+label);
    const after=await page.evaluate(()=>({
      top:document.getElementById("refBody").getBoundingClientRect().top,
      header:document.getElementById("stepNav").getBoundingClientRect().height,
      tab:document.getElementById("refTabs").getBoundingClientRect().height,
      overflow:document.documentElement.scrollWidth>innerWidth+2
    }));
    assert(!after.overflow,"no page overflow after switching "+key+" "+width);
    assert(after.top>=after.header+after.tab-16,"reference body below sticky controls "+key+" "+width+" "+JSON.stringify(after));
   }
   await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI()});
   assert.equal(await page.locator('#refTabs button[data-r="mastery"]').isVisible(),false,"2014 disabled mastery remains hidden");
   assert.equal(await page.locator('#refTabs button[data-r="tool"]').isVisible(),false,"2014 disabled tool remains hidden");
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true,"2014 no horizontal overflow");
   assert.deepEqual(errors,[],"browser errors "+width);
   console.log("PASS sticky quick-reference categories "+width);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});
"use strict";
const {chromium}=require("playwright"),assert=require("assert");
const URL=process.env.QA_URL||"http://127.0.0.1:18944/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try {
  for (const width of [360,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:"networkidle"});
   if(await page.locator("#rulesetModal.open #closeRuleset").count())await page.locator("#rulesetModal.open #closeRuleset").click();
   await page.locator("#btnRoster").click();
   assert.equal(await page.locator("#rosterModal.open").count(),1,"roster opens");
   const result=await page.evaluate(()=>{
    const overlay=document.querySelector("#rosterModal"),nav=document.querySelector("nav.steps"),rect=nav.getBoundingClientRect();
    const x=Math.min(innerWidth-10,Math.max(10,rect.left+rect.width/2)),y=Math.max(0,Math.min(innerHeight-10,rect.top+Math.min(20,rect.height/2)));
    const hit=document.elementFromPoint(x,y);
    return {navZ:Number(getComputedStyle(nav).zIndex),modalZ:Number(getComputedStyle(overlay).zIndex),hitInsideModal:overlay===hit||overlay.contains(hit),overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert(result.modalZ>result.navZ,"modal behind sticky navigation at "+width);
   assert(result.hitInsideModal,"nav intercepts modal pointer events at "+width);
   assert(result.overflow<=1,"horizontal page overflow at "+width);
   await page.locator("#rosterModal #closeRoster").click();
   assert.equal(await page.locator("#rosterModal.open").count(),0,"roster closes");
   await page.locator("#btnRuleset").click();
   assert.equal(await page.locator("#rulesetModal.open").count(),1,"ruleset modal opens");
   await page.locator("#rulesetModal #closeRuleset").click();
   await page.evaluate(()=>document.querySelector("#licenseModal").classList.add("open"));
   assert(await page.locator("#licenseModal").evaluate(el=>Number(getComputedStyle(el).zIndex))>result.navZ,"license overlay ordering");
   await page.locator("#closeLicense").click();
   assert.deepStrictEqual(errors,[],"browser errors");
   console.log("PASS overlay width="+width+" navZ="+result.navZ+" modalZ="+result.modalZ);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

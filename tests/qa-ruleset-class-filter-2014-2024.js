"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19785/index.html";
async function switchEdition(page,edition){
 const modal=page.locator("#rulesetModal");
 if(!await modal.isVisible())await page.locator("#btnRuleset").click();
 await page.locator('[data-ruleset="'+edition+'"]').click();
 const badge=await page.locator("#rulesetBadge").innerText();
 assert.equal(badge,edition==="2014"?"5E · 2014":"5R · 2024");
 const chip=page.locator('.spell-filter-chip[data-sf-group="cls"][data-sf-value="K"]');
 assert.equal(await chip.innerText(),edition==="2014"?"邪術師":"契術師");
 assert.equal(await chip.count(),1,"exactly one Warlock filter");
 assert.equal(await modal.isVisible(),false,"edition selection closes modal");
 return {edition,badge,warlock:await chip.innerText()};
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.QA_BROWSER_CHANNEL||"chrome"});
 try{
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(URL+"?ruleset-filter-gate="+Date.now()+"-"+width,{waitUntil:"networkidle"});
   const results=[];
   results.push(await switchEdition(page,"2014"));
   results.push(await switchEdition(page,"2024"));
   results.push(await switchEdition(page,"2014"));
   assert.deepEqual(errors,[],"No script errors during actual edition switching");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(overflow<=3,"no horizontal overflow at "+width+": "+overflow);
   console.log("QA_PASS "+width+" real controls edition switch "+JSON.stringify(results)+" overflow="+overflow);
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("QA_FAIL "+(e.stack||e));process.exitCode=1});

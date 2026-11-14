"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19761/index.html";
async function nav(page,i){
 const toggle=page.locator("#stepNav .nav-ux-steps-toggle");
 if(await toggle.count()&&(await toggle.getAttribute("aria-expanded"))!=="true")await toggle.click();
 await page.locator("#stepNav .nav-secondary button").nth(i).click();
}
function value(page,key){return page.locator('#abilityGrid .ability-cell').filter({has:page.locator('[data-abn="'+key+'"]')}).locator(".mod-value")}
async function check(browser,version,width){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(URL+"?ability-modifier-qa="+Date.now()+"-"+Math.random(),{waitUntil:"networkidle"});
 const modal=page.locator("#rulesetModal");
 if(!await modal.isVisible())await page.locator("#btnRuleset").click();
 await page.locator('[data-ruleset="'+version+'"]').click();
 await nav(page,2);
 const guide=page.locator(".ability-mod-guide");
 assert(await guide.isVisible(),"guide visible");
 const guideText=await guide.innerText();
 assert(guideText.includes("調整值")&&guideText.includes("偶數門檻")&&guideText.includes("12～13＝+1"),"accurate concise tutorial");
 assert.equal(await page.locator("#abilityGrid .ability-cell").count(),6,"six cells");
 await page.locator('#methodTabs [data-m="custom"]').click();
 const steps=[["str","8","-1"],["str","10","+0"],["str","11","+0"],["str","12","+1"],["str","14","+2"],["str","15","+2"],["str","16","+3"]];
 for(const [k,n,expected] of steps){
   await page.locator('[data-abn="'+k+'"]').fill(n);
   assert.equal((await value(page,k).innerText()).trim(),expected,version+" score "+n+" yields "+expected);
 }
 const score=page.locator("#abilityGrid .ability-cell").filter({has:page.locator('[data-abn="str"]')});
 assert((await score.locator(".mod-score").innerText()).includes("16"),"final ability score separately labeled");
 const style=await score.evaluate(el=>{
   const mod=el.querySelector(".mod-value"),sc=el.querySelector(".mod-score"),input=el.querySelector("input");
   return {mod:Number.parseFloat(getComputedStyle(mod).fontSize),score:Number.parseFloat(getComputedStyle(sc).fontSize),input:Number.parseFloat(getComputedStyle(input).fontSize),b:mod.getBoundingClientRect().width};
 });
 assert(style.mod>=30&&style.mod>=style.score*2&&style.mod>style.input,"modifier visually dominant: "+JSON.stringify(style));
 if(version==="2024"){
   await page.locator('[data-abn="str"]').press("Tab"); // blur-triggered render must finish before switching pages
   await nav(page,1);
   await page.locator("#bgGrid button.pick-card").filter({hasText:"隱士"}).first().click();
   await nav(page,2);
   await page.locator('[data-abn="wis"]').fill("14");
   assert.equal(await value(page,"wis").innerText(),"+2","before bonus wis 14 +2");
   await page.locator('[data-bk="b2"]').selectOption("wis");
   assert.equal(await value(page,"wis").innerText(),"+3","14 + background 2 => 16 (+3)");
   assert((await page.locator("#abilityGrid .ability-cell").filter({has:page.locator('[data-abn="wis"]')}).locator(".mod-score").innerText()).includes("16"),"final score includes background bonus");
 }
 const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
 assert(horizontal<=3,version+" "+width+"px overflow "+horizontal);
 assert.deepEqual(errors,[],"browser JS errors");
 console.log("PASS "+version+" "+width+"px tutorial + bold mod scale + 8/10/11/12/14/15/16 value + bonus + mobile");
 await page.close();
}
(async()=>{const browser=await chromium.launch({headless:true,channel:"chrome"});try{for(const v of ["2024","2014"])for(const w of [1440,390])await check(browser,v,w)}finally{await browser.close()}})().catch(e=>{console.error("QA_FAIL",e.stack||e);process.exit(1)});

"use strict";
const assert=require("assert");
const {chromium}=require("playwright");
const URL=(process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html";
(async()=>{
 let browser=await chromium.launch({headless:true});
 const reports=[],errors=[];
 try{
  for(const [width,height,label] of [[1440,900,"desktop"],[390,844,"mobile"]]){
   const page=await browser.newPage({viewport:{width,height}});
   page.on("pageerror",e=>errors.push(label+": "+e.message));
   await page.goto(URL+"?qa-class-reference="+label,{waitUntil:"domcontentloaded"});
   await page.locator('#refTabs [data-r="class"]').waitFor({state:"attached"});
   await page.evaluate(()=>document.querySelector("#rulesetModal")?.classList.remove("open"));
   await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();go(8);});
   await page.locator('#refTabs [data-r="class"]').click();
   assert.equal(await page.locator(".cr5r-class").count(),12,label+" class count");
   const matrix=await page.evaluate(()=>({
    classes:CLASSES.map(c=>c.n),
    subclassCount:Object.values(PROG_2024).reduce((a,x)=>a+x.subs.length,0)
   }));
   assert.equal(matrix.subclassCount,48,label+" subclass count");
   for(const cls of matrix.classes){
    await page.locator('[data-cr5r-class="'+cls+'"]').click();
    assert.equal(await page.locator(".cr5r-sub").count(),4,label+" 4 subclasses "+cls);
    assert.equal(await page.locator(".cr5r-level").count(),20,label+" 20 levels "+cls);
    const levels=await page.locator(".cr5r-level-badge").allTextContents();
    assert.deepStrictEqual(levels,Array.from({length:20},(_,i)=>"Lv "+(i+1)),label+" level range "+cls);
    for(let n=0;n<4;n++){
     await page.locator(".cr5r-sub").nth(n).click();
     assert.equal(await page.locator(".cr5r-level").count(),20,label+" 20 levels for subclass "+cls+" "+n);
     assert(await page.locator(".cr5r-level").nth(2).innerText(),label+" level 3 feature text "+cls);
    }
   }
   await page.locator('[data-cr5r-class="野蠻人"]').click();
   await page.locator("#cr5rLv1 summary").click();
   const rage=await page.locator("#cr5rLv1").innerText();
   assert(rage.includes("狂暴")&&rage.includes("短休")&&rage.includes("長休"),label+" canonical rage recovery");
   await page.locator('[data-cr5r-class="德魯伊"]').click();
   await page.locator('[data-cr5r-sub="星辰結社"]').click();
   assert((await page.locator("#cr5rLv3").innerText()).includes("星圖"),label+" stars circle feature");
   await page.locator('[data-cr5r-band="4"]').click();
   assert.equal(await page.locator(".cr5r-level").count(),5,label+" filter 16-20");
   await page.locator('[data-cr5r-band="all"]').click();
   const search=page.locator("#cr5rSearch");
   await search.fill("Monk");
   assert.equal(await page.locator(".cr5r-class:visible").count(),1,label+" English search");
   assert.equal(await search.inputValue(),"Monk",label+" search stable");
   await search.fill("");
   assert.equal(await page.locator(".cr5r-class:visible").count(),12,label+" clear search");
   const metrics=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    featureFont:parseFloat(getComputedStyle(document.querySelector(".cr5r-rule")).fontSize)
   }));
   assert(metrics.overflow<=1,label+" horizontal overflow "+JSON.stringify(metrics));
   assert(metrics.featureFont>=14,label+" readable font "+JSON.stringify(metrics));
   await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();});
   assert(await page.locator('#refTabs [data-r="class"]').isVisible(),label+" 2014 reference available");
   assert(await page.locator(".cr5r-warning").count()===0,label+" warning requires rerender");
   await page.locator('#refTabs [data-r="class"]').click();
   assert((await page.locator(".cr5r-warning").innerText()).includes("2014"),label+" edition warning");
   reports.push({label,classes:12,subclasses:48,levels:20,metrics});
   await page.close();
  }
  assert.equal(errors.length,0,"page errors: "+errors.join(" | "));
  console.log(JSON.stringify({PASS:true,reports,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

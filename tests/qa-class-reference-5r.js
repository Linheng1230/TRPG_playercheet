"use strict";
const assert=require("assert");
const {chromium}=require("playwright");
const URL=(process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html";
(async()=>{
 let browser=await chromium.launch({headless:true});
 const reports=[],errors=[];
 try{
  for(const [width,height,label] of [[1440,900,"desktop"],[480,800,"narrow"],[390,844,"mobile"]]){
   const page=await browser.newPage({viewport:{width,height}});
   page.on("pageerror",e=>errors.push(label+": "+e.message));
   await page.goto(URL+"?qa-class-reference="+label,{waitUntil:"domcontentloaded"});
   await page.locator('#refTabs [data-r="class"]').waitFor({state:"attached"});
   // The app schedules the welcome ruleset modal 150 ms after startup; close it via its actual UI.
   await page.waitForTimeout(300);
   if(await page.locator("#rulesetModal").evaluate(el=>el.classList.contains("open")))
    await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();go(12);});
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
    await page.locator(".cr5r-skills summary").click();
    const skillDisplay=await page.locator(".cr5r-skills").innerText();
    assert(!skillDisplay.includes("動物馴養"),label+" legacy animal handling visible in "+cls);
    if(["野蠻人","德魯伊","戰士","遊俠"].includes(cls))
     assert(skillDisplay.includes("馴獸"),label+" official 馴獸 term missing in "+cls);
    if(["武僧","戰士","遊蕩者"].includes(cls))
     assert(skillDisplay.includes("特技"),label+" old 雜技 term visible in "+cls);
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
   const structured=await page.locator("#cr5rLv1 .cr5r-rule").first().evaluate(el=>{
    const css=getComputedStyle(el),raw=window.ZIZI_5R_FULL_FEATURE_RULES["野蠻人||狂暴|1"];
    return {raw,shown:el.textContent,paragraphs:el.querySelectorAll("p").length,
      headings:[...el.querySelectorAll("h4")].map(x=>x.textContent),
      listItems:el.querySelectorAll("li").length,
      font:parseFloat(css.fontSize),line:parseFloat(css.lineHeight),
      overflow:el.scrollWidth-el.clientWidth,width:el.getBoundingClientRect().width};
   });
   assert.equal(structured.shown.replace(/\s/g,""),structured.raw.replace(/\s/g,""),label+" canonical rule text must be preserved");
   assert(structured.paragraphs>=4&&structured.headings.length>=4,label+" long rule sections "+JSON.stringify(structured));
   assert(structured.listItems>=3,label+" rage extension options must be listed "+JSON.stringify(structured));
   assert(structured.headings.some(h=>h.includes("傷害抗性"))&&structured.headings.some(h=>h.includes("持續時間")),label+" key rule headings");
   assert(structured.font>=(width<=430?15:16),label+" full-rule minimum font "+JSON.stringify(structured));
   assert(structured.line/structured.font>=1.75,label+" full-rule line-height "+JSON.stringify(structured));
   assert(structured.overflow<=1&&structured.width<=width,label+" long rule horizontal clipping "+JSON.stringify(structured));
   if(process.env.CI){
    const fs=require("fs"),path=require("path"),dir=path.join(__dirname,"artifacts");
    fs.mkdirSync(dir,{recursive:true});
    await page.screenshot({path:path.join(dir,"class-reference-"+label+".png"),fullPage:true});
   }
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

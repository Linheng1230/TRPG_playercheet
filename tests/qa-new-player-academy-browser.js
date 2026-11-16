"use strict";
/* 30｜Browser UI QA at 390×844 and 1440×900; local source, NOT Live deployment. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const file=name=>"file:///"+path.join(root,name).replace(/\\/g,"/");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const report=[];
 try {
  for(const width of [390,480,1440]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
   const page=await context.newPage();
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await page.goto(file("home.html"),{waitUntil:"domcontentloaded"});
   assert.equal(await page.getByRole("link",{name:"我是新手，先學怎麼玩"}).count(),1);
   assert.equal(await page.getByRole("link",{name:"我已經會創角，直接開始"}).count(),1);
   await page.getByRole("link",{name:"我是新手，先學怎麼玩"}).click();
   await page.waitForURL(/academy\.html/);
   await page.getByRole("heading",{name:"第一次玩 D&D"}).waitFor();
   assert.equal(await page.locator(".academy-steps li").count(),3);
   assert.equal(await page.locator(".academy-understanding-options button").count(),2);
   await page.locator(".academy-nav button").filter({hasText:"下一步"}).click();
   await page.locator(".academy-nav button").filter({hasText:"下一步"}).click();
   await page.getByRole("heading",{name:"理解屬性與調整值"}).count().catch(()=>0);
   assert.match(await page.locator("#academyContentTitle").innerText(),/屬性/);
   await page.locator(".academy-further-reading summary").click();
   await page.locator(".academy-topic button").first().click();
   await page.waitForURL(/index\.html\?view=/);
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.locator("#academyCreatorReturn").waitFor();
   assert.equal(await page.locator("#academyCreatorReturn button").count(),1);
   assert.equal(await page.evaluate(()=>S.cls),null);
   const step=await page.evaluate(()=>S.step);
   assert.equal(step,2);
   await page.locator("#academyCreatorReturn button").click();
   await page.waitForURL(/academy\.html\?step=lesson\.abilities/);
   assert.match(await page.locator("#academyContentTitle").innerText(),/屬性/);
   await page.reload();
   assert.match(await page.locator("#academyContentTitle").innerText(),/屬性/);
   await page.locator("#academyQuiz").click();
   for(let n=0;n<10;n++){
    await page.locator(".academy-choice").first().click();
    const next=page.locator(".academy-nav button").filter({hasText:n===9?"查看三組推薦":"下一題"});
    assert.equal(await next.isEnabled(),true);
    await next.click();
   }
   assert.equal(await page.locator("#academyResult1,#academyResult2,#academyResult3").count(),3);
   const className=await page.locator("#academyResult1 h3").innerText();
   await page.locator("#academyResult1 [data-action=academy-start-class]").click();
   await page.waitForURL(/index\.html\?view=creator/);
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.locator("#academyRecommendedClass").waitFor();
   assert.match(await page.locator("#academyRecommendedClass").innerText(),new RegExp(className));
   assert.equal(await page.evaluate(()=>S.cls),null);
   await page.locator("#academyCreatorReturn button").click();
   await page.waitForURL(/academy\.html\?step=quiz\.result/);
   assert.equal(await page.locator("#academyResult1,#academyResult2,#academyResult3").count(),3);
   await page.reload();
   assert.equal(await page.locator("#academyResult1,#academyResult2,#academyResult3").count(),3);
   await page.locator('[data-tab="practice"]').click();
   assert.match(await page.locator("#academyContentTitle").innerText(),/第一次跑團/);
   assert.equal(await page.locator(".academy-grid .academy-card").count(),3);
   await page.locator(".academy-grid .academy-card button").first().click();
   await page.locator(".academy-choice").first().click();
   assert.ok((await page.locator(".academy-topic [role=status],.academy-topic[role=status]").count())>0);
   assert.equal(await page.locator(".academy-nav button").filter({hasText:"下一題"}).isEnabled(),true);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,"academy horizontal overflow "+overflow+" at "+width);
   assert.deepEqual(errors,[],"JS errors at "+width);
   report.push({width,step,quizTop:className,results:3,errors,overflow,passed:true});
   await context.close();
  }
  console.log("PASS academy browser QA (source-only)",JSON.stringify(report));
 }finally{await browser.close();}
})().catch(err=>{console.error("FAIL academy browser QA",err.stack);process.exit(1);});

"use strict";
/* Candidate-only GUI UAT for quiz-first → existing Creator guided mode. */
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const fs=require("node:fs");
const evidence=path.resolve(root,"..","academy-quiz-guided-20261120-evidence");
fs.mkdirSync(evidence,{recursive:true});
const file=(name)=>process.env.QA_BASE ? process.env.QA_BASE.replace(/\/?$/,"/")+name : "file:///"+path.join(root,name).replace(/\\/g,"/");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.QA_CHROME_CHANNEL?{channel:process.env.QA_CHROME_CHANNEL}:process.platform==="win32"?{channel:"chrome"}:{})});
 const reports=[];
 try{
  for(const width of [320,390,1440]){
   const context=await browser.newContext({viewport:{width,height:width===1440?900:844}});
   const page=await context.newPage();
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",d=>d.accept());
   await page.goto(file("academy.html"),{waitUntil:"domcontentloaded"});
   await page.screenshot({path:path.join(evidence,"entry-"+width+".png"),animations:"disabled"});
   assert.equal(await page.locator(".academy-tabs").count(),0,"No legacy lesson/practice tabs");
   assert.equal(await page.locator("#academyQuiz").count(),1);
   assert.equal(await page.getByRole("link",{name:"我已經會創角"}).count(),1);
   for(let n=0;n<10;n++){
    const choice=page.locator(".academy-choice").first();
    await choice.click();
    const next=page.locator(".academy-nav button").last();
    assert.equal(await next.isEnabled(),true,"next enabled after choosing");
    await next.click();
   }
   assert.equal(await page.locator("#academyResult1,#academyResult2,#academyResult3").count(),3);
   await page.screenshot({path:path.join(evidence,"results-"+width+".png"),animations:"disabled"});
   const top=await page.locator("#academyResult1 h3").innerText();
   await page.locator("#academyResult1 [data-action=academy-start-class]").click();
   await page.waitForURL(/index\.html\?view=creator/);
   await page.waitForTimeout(350); // Original Creator opens its first-run edition modal after 150ms.
   if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
   await page.locator("#academyGuidedCoach").waitFor();
   assert.match(await page.locator("#coachHeading").innerText(),/選擇職業/);
   assert.match(await page.locator("#academyRecommendedClass").innerText(),new RegExp(top));
   assert.equal(await page.evaluate(()=>S.cls),null,"Quiz may not preselect class");
   assert.equal(await page.evaluate(()=>S.classConfirmed),false,"Quiz may not confirm class");
   await page.screenshot({path:path.join(evidence,"guided-class-"+width+".png"),animations:"disabled"});
   const recommended=page.locator("#classGrid [data-class-name]").filter({has:page.locator(".name",{hasText:top})}).first();
   assert.equal(await recommended.count(),1,"recommended class present in Creator");
   await recommended.click();
   await page.locator('[data-step="0"] .class-confirm-controls button').click();
   assert.equal(await page.evaluate(()=>S.classConfirmed),true,"Existing Creator confirmation used");
   await page.locator("#next0").click();
   assert.match(await page.locator("#coachHeading").innerText(),/背景與物種/);
   assert.equal(await page.evaluate(()=>S.step),1);
   await page.screenshot({path:path.join(evidence,"guided-origin-"+width+".png"),animations:"disabled"});
   // Read-only navigation simulation for coach stages 3–8. The actual Creator gates remain untouched.
   const stages=["分配六項屬性","選擇技能熟練","填寫角色資訊與語言","確認等級與職業特性","查看或選擇法術","檢查並儲存角色卡"];
   for(let step=2;step<=7;step++){
    await page.evaluate(n=>go(n),step);
    await page.waitForFunction(n=>document.querySelector("#coachHeading")?.textContent.includes((n+1)+" / 8"),step);
    assert.match(await page.locator("#coachHeading").innerText(),new RegExp(stages[step-2]));
   }
   await page.locator("#academyGuidedCoach button").filter({hasText:"收起引導"}).click();
   assert.equal(await page.locator("#academyGuidedCoach.is-collapsed").count(),1);
   await page.locator("#academyGuidedCoach button").filter({hasText:"展開新手引導"}).click();
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,"Horizontal overflow at "+width+": "+overflow);
   await page.locator("#academyGuidedCoach .coach-actions button").filter({hasText:"回推薦結果"}).click();
   await page.waitForURL(/academy\.html\?step=quiz\.result/);
   assert.equal(await page.locator("#academyResult1,#academyResult2,#academyResult3").count(),3);
   await page.reload();
   assert.equal(await page.locator("#academyResult1,#academyResult2,#academyResult3").count(),3);
   assert.deepEqual(errors,[],"page errors at "+width);
   const experienced=await context.newPage();
   await experienced.goto(file("index.html")+"?view=creator",{waitUntil:"domcontentloaded"});
   assert.equal(await experienced.locator("#academyGuidedCoach").count(),0,"No guide for experienced users");
   await experienced.close();
   reports.push({width,quizQuestions:10,recommendations:3,classConfirmedByUser:true,guidedOrigin:true,returnedToResults:true,overflow,errors});
   await context.close();
  }
  console.log("PASS guided academy browser",JSON.stringify(reports));
 }finally{await browser.close();}
})().catch(e=>{console.error("FAIL guided academy",e.stack);process.exit(1)});

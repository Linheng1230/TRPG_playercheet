"use strict";
/* User-real repro: Academy quiz→Creator previously shifted the grid (71px cards).
   CI must reject both the wrong geometry and a hollow teaching screen. */
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18766/").replace(/\/?$/,"/");
const outDir=process.env.QA_SCREENSHOT_DIR||null;
const ids=["welcome","class","abilities","checks","origin","details","turn","spells","sheet","next"];
const reports=[];
async function run(browser,width){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  for(const [idx,id] of ids.entries()){
   await page.goto(base+"academy.html?step=lesson."+id,{waitUntil:"networkidle"});
   assert.equal(await page.locator(".academy-steps li").count(),3,id+" missing 3 guided steps");
   assert((await page.locator(".academy-learning-goal").innerText()).length>20,id+" no actual objective");
   assert((await page.locator(".academy-walkthrough").innerText()).length>55,id+" no worked example");
   const buttons=page.locator(".academy-understanding-options button");
   assert.equal(await buttons.count(),2,id+" missing interactive question");
   await buttons.nth(1).click();
   assert((await page.locator(".academy-understanding-feedback").innerText()).length>=10,id+" incorrect answer has no explanation");
   await buttons.nth(0).click();
   assert(await page.locator(".academy-understanding-feedback.is-correct").isVisible(),id+" correct feedback missing");
   assert.equal(await buttons.nth(0).getAttribute("aria-pressed"),"true");
   assert.equal(await page.locator(".academy-further-reading summary").count(),1);
   if(idx===0&&outDir)await page.screenshot({path:path.join(outDir,"academy-lesson-"+width+".png"),fullPage:true});
  }
  await page.goto(base+"academy.html?step=quiz.intro",{waitUntil:"networkidle"});
  await page.locator("#academyQuiz").click();
  for(let i=0;i<10;i++){
   await page.locator(".academy-choice").first().click();
   await page.locator(".academy-nav button").filter({hasText:i===9?"查看三組推薦":"下一題"}).click();
  }
  const recs=await page.evaluate(()=>[...document.querySelectorAll("#academyResult1,#academyResult2,#academyResult3")].map(x=>({
   height:Math.round(x.getBoundingClientRect().height),width:Math.round(x.getBoundingClientRect().width),
   text:x.innerText,detailOpen:!!x.querySelector("details")?.open,
   action:x.querySelector("[data-action=academy-start-class]")?.innerText||""
  })));
  assert.equal(recs.length,3,"must show 3 recommendations");
  for(const r of recs){
   assert(r.height<=640,"unreadably tall result: "+r.height+"px at "+width);
   assert(!/Q[1-9]\d*\s*你選/.test(r.text),"unreadable Q-number codes exposed");
   assert(!r.detailOpen,"advanced suggestions must be folded initially");
   assert.match(r.action,/去創角頁選擇/,"misleading recommendation CTA");
  }
  if(outDir)await page.screenshot({path:path.join(outDir,"academy-quiz-"+width+".png"),fullPage:true});
  await page.locator("#academyResult1 [data-action=academy-start-class]").click();
  await page.waitForURL(/index\.html\?view=creator/);
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  await page.locator("#academyRecommendedClass").waitFor();
  const state=await page.evaluate(()=>{
   const main=document.querySelector("main"),rail=main?.querySelector(":scope > .wcs-creator-rail"),
    workspace=main?.querySelector(":scope > .workspace"),bar=document.getElementById("academyCreatorReturn"),
    grid=document.getElementById("classGrid");
   const box=x=>{if(!x)return null;const b=x.getBoundingClientRect();return {x:Math.round(b.x),width:Math.round(b.width),height:Math.round(b.height)};};
   return {children:[...main.children].map(x=>x.className),workspace:box(workspace),rail:box(rail),grid:box(grid),
    cardWidths:[...grid.children].map(x=>Math.round(x.getBoundingClientRect().width)),
    directBar:bar?.parentElement===main,barWithinWorkspace:workspace?.contains(bar),
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    currentClass:S.cls?.n||null,confirmed:S.classConfirmed};
  });
  assert(!state.directBar&&state.barWithinWorkspace,"Academy return inserted into main CSS grid!");
  assert.equal(state.children.length,3,"Creator main grid children changed");
  assert.equal(state.cardWidths.length,12,"Creator class list incomplete");
  assert.equal(state.currentClass,null,"quiz must not commit class");
  assert.equal(state.confirmed,false,"quiz must not lock class");
  const min=Math.min(...state.cardWidths);
  assert(min>=(width>=1360?175:width<=480?125:160),"CRUSHED CLASS CARDS: "+min+"px at "+width+"px viewport");
  if(width>=1360){
   assert(state.workspace.width>=620,"Creator workspace too narrow: "+state.workspace.width);
   assert(state.rail.width>=140&&state.rail.width<=210,"Creator rail width wrong: "+state.rail.width);
   assert(state.workspace.x>=state.rail.x+state.rail.width-2,"Creator rail/workspace swapped");
  }
  assert(state.overflow<=2,"Creator horizontal overflow: "+state.overflow);
  if(outDir)await page.screenshot({path:path.join(outDir,"academy-creator-"+width+".png")});
  assert.equal(errors.length,0,"page JS errors: "+errors.join("|"));
  reports.push({width,lessons:ids.length,recommendations:recs.map(r=>({width:r.width,height:r.height})),state,errors});
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.QA_CHROME_CHANNEL?{channel:process.env.QA_CHROME_CHANNEL}:{})});
 try{for(const w of [390,1440,1649])await run(browser,w);}
 finally{await browser.close();}
 console.log("PASS HUMAN_PATH_ACADEMY_LAYOUT",JSON.stringify(reports));
})().catch(e=>{console.error("FAIL HUMAN_PATH_ACADEMY_LAYOUT",e.stack||e);process.exitCode=1;});

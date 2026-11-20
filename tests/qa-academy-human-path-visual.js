"use strict";
/* Regression against a real player route: Home -> class-fit quiz -> canonical Creator.
 * Preserves former crushed-grid geometry gates while replacing retired lesson/practice expectations.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18766/").replace(/\/?$/,"/");
const outDir=process.env.QA_SCREENSHOT_DIR||null;
const reports=[];
async function run(browser,width){
 const context=await browser.newContext({viewport:{width,height:width<=390?844:900}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>d.accept());
 try{
  await page.goto(base+"home.html",{waitUntil:"networkidle"});
  await page.getByRole("link",{name:"我是新手，先學怎麼玩"}).click();
  await page.waitForURL(/academy\.html/);
  assert.equal(await page.locator("#academyQuiz").count(),1,"missing fit quiz entry");
  assert.equal(await page.locator(".academy-tabs").count(),0,"retired lesson/practice tabs are still shown");
  for(let i=0;i<10;i++){
   const choice=page.locator(".academy-choice").first();
   await choice.click();
   assert.equal(await choice.getAttribute("aria-pressed"),"true");
   const next=page.locator(".academy-nav button").last();
   assert.equal(await next.isEnabled(),true);
   await next.click();
  }
  const recs=await page.locator("#academyResult1,#academyResult2,#academyResult3").evaluateAll(cards=>
   cards.map(card=>({height:Math.round(card.getBoundingClientRect().height),
     width:Math.round(card.getBoundingClientRect().width),
     detailOpen:!!card.querySelector("details")?.open,
     cta:card.querySelector("[data-action=academy-start-class]")?.textContent||"",
     title:card.querySelector("h3")?.textContent||""})));
  assert.equal(recs.length,3,"expected three distinct recommendations");
  assert.equal(new Set(recs.map(x=>x.title)).size,3,"duplicate suggested class");
  for(const r of recs){
   assert(r.height<=680,"overlong recommendation card "+r.height+"px at "+width);
   assert(!r.detailOpen,"extra class details must be collapsed");
   assert(r.cta.includes("進入創角器"),"incorrect CTA");
  }
  if(outDir)await page.screenshot({path:path.join(outDir,"academy-results-"+width+".png"),fullPage:true,animations:"disabled"});
  await page.locator("#academyResult1 [data-action=academy-start-class]").click();
  await page.waitForURL(/index\.html\?view=creator/);
  await page.waitForTimeout(350);
  if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
  await page.locator("#academyGuidedCoach").waitFor();
  assert.match(await page.locator("#coachHeading").innerText(),/1 \/ 9/);
  assert.match(await page.locator("#coachLead").innerText(),/測驗選擇已帶入職業卡/);
  assert.equal(await page.locator("#academyRecommendedClass,#academyCreatorReturn").count(),0,"duplicate quiz banners");
  const state=await page.evaluate(()=>{
   const main=document.querySelector("main");
   const rail=main?.querySelector(":scope > .wcs-creator-rail");
   const workspace=main?.querySelector(":scope > .workspace");
   const coach=document.getElementById("academyGuidedCoach");
   const grid=document.getElementById("classGrid");
   const box=x=>{if(!x)return null;const b=x.getBoundingClientRect();return {x:Math.round(b.x),width:Math.round(b.width)};};
   return {children:[...main.children].map(x=>x.className),workspace:box(workspace),
    rail:box(rail),grid:box(grid),
    cardWidths:[...grid.querySelectorAll(":scope > [data-class-name]")].map(x=>Math.round(x.getBoundingClientRect().width)),
    directBar:coach?.parentElement===main,coachWithinWorkspace:workspace?.contains(coach),
    pending:typeof pendingClassChoice!=="undefined"?pendingClassChoice?.n:null,
    selected:[...grid.querySelectorAll(".selected")].map(x=>x.dataset.className),
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    currentClass:S.cls?.n||null,confirmed:S.classConfirmed};
  });
  assert(!state.directBar&&state.coachWithinWorkspace,"academy coach must not disturb main CSS grid");
  assert.equal(state.pending,recs[0].title,"quiz class should already be selected in native Creator");
  assert.deepEqual(state.selected,[recs[0].title],"exactly one selected class card");
  assert.equal(state.children.length,3,"Creator main grid child count changed");
  assert.equal(state.cardWidths.length,12,"Creator class list incomplete");
  assert.equal(state.currentClass,null,"quiz must not select class");
  assert.equal(state.confirmed,false,"quiz must not confirm class");
  const min=Math.min(...state.cardWidths);
  assert(min>=(width>=1360?175:width<=480?125:160),"CRUSHED CLASS CARDS: "+min+" at "+width+"px");
  if(width>=1360){
   assert(state.workspace.width>=620,"Creator workspace too narrow");
   assert(state.rail.width>=140&&state.rail.width<=210,"rail width invalid");
   assert(state.workspace.x>=state.rail.x+state.rail.width-2,"rail/workspace alignment wrong");
  }
  assert(state.overflow<=2,"horizontal overflow "+state.overflow);
  if(outDir)await page.screenshot({path:path.join(outDir,"academy-creator-"+width+".png"),animations:"disabled"});
  await page.locator('[data-step="0"] .class-confirm-controls button').click();
  assert.equal(await page.evaluate(()=>S.classConfirmed),true,"existing Creator class confirmation failed");
  await page.locator("#next0").click();
  assert.match(await page.locator("#coachHeading").innerText(),/2 \/ 9/);
  assert.match(await page.locator("#coachLead").innerText(),/背景與物種/);
  assert.equal(errors.length,0,"page JS errors: "+errors.join("|"));
  reports.push({width,recommendations:recs.map(({width,height,title})=>({width,height,title})),minCardWidth:min,state,errors});
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.QA_CHROME_CHANNEL?{channel:process.env.QA_CHROME_CHANNEL}:process.platform==="win32"?{channel:"chrome"}:{})});
 try{for(const width of [390,1440,1649])await run(browser,width);}
 finally{await browser.close();}
 console.log("PASS HUMAN_PATH_ACADEMY_QUIZ_GUIDED_GRID",JSON.stringify(reports));
})().catch(e=>{console.error("FAIL HUMAN_PATH_ACADEMY_QUIZ_GUIDED_GRID",e.stack||e);process.exitCode=1;});

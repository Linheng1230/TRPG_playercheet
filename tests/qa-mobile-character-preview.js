"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=(process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true});
 const errors=[],reports=[];
 try{
  for(const [width,height,kind] of [[390,844,"phone"],[768,900,"tablet"],[1040,768,"stack-boundary"],[1041,768,"desktop-boundary"],[1440,900,"desktop"]]){
   const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce"});
   page.on("pageerror",e=>errors.push(kind+": "+e.message));
   await page.goto(URL+"?qa-preview="+kind,{waitUntil:"domcontentloaded"});
   await page.locator('main > aside.sheet').waitFor({state:"attached"});
   await page.waitForTimeout(310);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const preview=async()=>page.evaluate(()=>{
    const aside=document.querySelector("main > aside.sheet");
    const main=document.querySelector("main");
    const workspace=main.querySelector(".workspace");
    return {
     display:getComputedStyle(aside).display,
     position:getComputedStyle(aside).position,
     mainColumns:getComputedStyle(main).gridTemplateColumns,
     mainWidth:Math.round(main.getBoundingClientRect().width),
     workspaceWidth:Math.round(workspace.getBoundingClientRect().width),
     overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
     detailExists:!!document.querySelector('.step-panel[data-step="7"] .final-sheet'),
     portraitExists:!!document.querySelector("#shPortrait"),
     exportExists:!!document.querySelector(".export-bar")
    };
   });
   const expected=width>1040,initial=await preview();
   assert.equal(initial.display==="none",!expected,kind+" initial preview visibility");
   if(expected)assert.equal(initial.position,"sticky",kind+" desktop preview is sticky");
   assert.equal(initial.overflow<=1,true,kind+" unexpected page overflow");
   assert.equal(initial.detailExists,true,kind+" independent full character sheet preserved");
   assert.equal(initial.portraitExists,true,kind+" portrait DOM preserved; only layout hidden");
   await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();go(12);});
   await page.locator('#refTabs [data-r="class"]').click();
   assert.equal(await page.locator(".cr5r-class").count(),12,kind+" class reference intact");
   const afterRef=await preview();
   assert.equal(afterRef.display==="none",!expected,kind+" preview visibility in quick reference");
   assert.equal(afterRef.overflow<=1,true,kind+" quick reference overflow");
   await page.evaluate(()=>go(7));
   const afterCard=await preview();
   // The full character-sheet page intentionally uses final-card-focus on ALL widths.
   // It already hides the sidebar on desktop too; this is unrelated to mobile responsiveness.
   assert.equal(afterCard.display,"none",kind+" independent character sheet focus stays full width");
   assert.equal(await page.locator('.step-panel[data-step="7"].active').count(),1,kind+" character sheet accessible");
   await page.emulateMedia({media:"print"});
   const print=await page.evaluate(()=>({
    preview:getComputedStyle(document.querySelector("main > aside.sheet")).display,
    main:getComputedStyle(document.querySelector("main")).display,
    card:getComputedStyle(document.querySelector('.step-panel[data-step="7"]')).display
   }));
   assert.equal(print.preview,"none",kind+" print preview hidden as existing behavior");
   assert.equal(print.card,"block",kind+" printable character sheet retained");
   await page.emulateMedia({media:"screen"});
   reports.push({kind,width,initial,afterRef:{display:afterRef.display,overflow:afterRef.overflow},print});
   await page.close();
  }
  assert.deepEqual(errors,[],"JavaScript runtime errors");
  console.log(JSON.stringify({PASS:true,reports,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
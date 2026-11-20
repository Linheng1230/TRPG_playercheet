"use strict";
/* UI and state ownership: quiz selection enters original Creator as pending;
 * origin picks persist; optional ability suggestion is applied ONLY by a real click.
 * Browser must never edit user/account data outside fresh isolated contexts.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const fs=require("node:fs");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const base=process.env.QA_BASE?.replace(/\/?$/,"/")||null;
const url=path=>base?base+path:"file:///"+require("node:path").join(root,path).replace(/\\/g,"/");
const evidence=process.env.QA_ACADEMY_EVIDENCE_DIR||path.resolve(root,"..","academy-inline-20261120-evidence");
fs.mkdirSync(evidence,{recursive:true});
const output=[];
async function quizToCreator(browser,width,recommendationRank){
 const ctx=await browser.newContext({viewport:{width,height:width>=1400?900:844}});
 const page=await ctx.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>d.accept());
 try{
  await page.goto(url("academy.html"),{waitUntil:"domcontentloaded"});
  for(let i=0;i<10;i++){
   await page.locator(".academy-choice").first().click();
   await page.locator(".academy-nav button").last().click();
  }
  const expected=await page.evaluate(rank=>{
   const saved=JSON.parse(localStorage.getItem("dnd5r:academy:v1:progress")||"null");
   return ZIZI_CLASS_FIT_5R.evaluate(saved.answers,DND5RAcademyCatalog2024).recommendations[rank-1];
  },recommendationRank);
  assert(expected?.classRef&&expected.background?.ref&&expected.species?.ref,"quiz recommender needs class/background/species");
  await page.locator("#academyResult"+recommendationRank+" [data-action=academy-start-class]").click();
  await page.waitForURL(/index\.html\?view=creator/);
  await page.waitForTimeout(350);
  if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
  const state=await page.evaluate(()=>({
   cls:S.cls?.n||null,classConfirmed:S.classConfirmed,
   pending:(typeof pendingClassChoice!=="undefined"?pendingClassChoice?.n:null),
   selected:[...document.querySelectorAll("#classGrid .selected")].map(x=>x.dataset.className),
   labelled:!!document.querySelector("#classGrid .selected .academy-quiz-inline-badge"),
   bars:document.querySelectorAll("#academyRecommendedClass,#academyCreatorReturn").length,
   coach:document.querySelectorAll("#academyGuidedCoach").length,
   mainChildren:[...document.querySelector("main").children].length,
   overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth
  }));
  assert.equal(state.cls,null,"quiz must not commit selected class");
  assert.equal(state.classConfirmed,false,"quiz cannot bypass native class confirmation");
  assert.equal(state.pending,expected.classRef,"quiz class should be pending in same original class grid");
  assert.deepEqual(state.selected,[expected.classRef],"only the recommended class card should be selected");
  assert(state.labelled,"selected card must show small quiz badge");
  assert.equal(state.bars,0,"duplicate recommendation/return bars should not exist");
  assert.equal(state.coach,1,"one shared teaching UI");
  assert.equal(state.mainChildren,3,"Creator main grid children must be unchanged");
  assert(state.overflow<=2,"horizontal overflow at "+width);
  await page.screenshot({path:path.join(evidence,"inline-class-"+width+".png"),animations:"disabled"});
  await page.locator('[data-step="0"] .class-confirm-controls button').click();
  assert.equal(await page.evaluate(()=>S.classConfirmed),true);
  await page.locator("#next0").click();
  await page.waitForFunction(()=>S.bg&&S.sp);
  const origin=await page.evaluate(()=>({
   bg:S.bg?.n,sp:S.sp?.n,bgConfirmed:S.bgConfirmed,spConfirmed:S.spConfirmed
  }));
  assert.equal(origin.bg,expected.background.ref,"expected background should be preselected through original grid");
  assert.equal(origin.sp,expected.species.ref,"expected species should be preselected through original grid");
  assert(!origin.bgConfirmed&&!origin.spConfirmed,"origin selections cannot be silently locked");
  const alternative=await page.evaluate(()=>{
   const bg=BACKGROUNDS.find(x=>x.n!==S.bg.n);
   const sp=SPECIES.find(x=>x.n!==S.sp.n);
   return {bg:bg.n,sp:sp.n,bgIndex:BACKGROUNDS.indexOf(bg),spIndex:SPECIES.indexOf(sp)};
  });
  await page.locator("#bgGrid > button").nth(alternative.bgIndex).click();
  await page.locator("#spGrid > button").nth(alternative.spIndex).click();
  assert.deepEqual(await page.evaluate(()=>({bg:S.bg.n,sp:S.sp.n})),{bg:alternative.bg,sp:alternative.sp},"manual selections take precedence");
  await page.locator('[data-step="1"] [data-go="0"]').click();
  await page.locator("#next0").click();
  assert.deepEqual(await page.evaluate(()=>({bg:S.bg.n,sp:S.sp.n})),{bg:alternative.bg,sp:alternative.sp},"manual choices persist during Creator navigation");
  await page.screenshot({path:path.join(evidence,"inline-origin-"+width+".png"),animations:"disabled"});
  // Targeted ability integration: direct go() is NOT claimed as human-equivalent final confirmation.
  await page.evaluate(()=>go(2));
  await page.locator("#academyApplySuggestedAbilities").waitFor();
  assert.equal(await page.locator("#academyApplySuggestedAbilities").isEnabled(),true);
  await page.screenshot({path:path.join(evidence,"inline-ability-before-"+width+".png"),animations:"disabled"});
  await page.locator("#academyApplySuggestedAbilities").click();
  const abilities=await page.evaluate(()=>({
   cls:S.cls?.n,method:S.method,base:S.base,bonus:S.bonus,bonusMode:S.bonusMode,
   abilityLocked:S.abilitiesConfirmed,background: S.bg?.n,allowed:S.bg?.ab
  }));
  assert.equal(abilities.method,"array");
  assert.deepEqual(Object.values(abilities.base).sort((a,b)=>a-b),[8,10,12,13,14,15],"standard-array permutation");
  assert(!abilities.abilityLocked,"ability suggestion cannot auto-confirm");
  if(abilities.allowed?.length>=2){
   assert.equal(abilities.bonusMode,"21");
   assert(abilities.allowed.includes(abilities.bonus.b2)&&abilities.allowed.includes(abilities.bonus.b1)&&
      abilities.bonus.b2!==abilities.bonus.b1,"background bonus must obey canonical allowed attributes");
  }
  assert.equal(await page.locator("#academyApplySuggestedAbilities").isEnabled(),false,"no reapply / overwrite of player values");
  await page.evaluate(()=>go(1));
  await page.evaluate(()=>go(2));
  assert.deepEqual(await page.evaluate(()=>S.base),abilities.base,"ability state persists across steps");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForTimeout(350);
  const persisted=await page.evaluate(()=>({bg:S.bg?.n,sp:S.sp?.n,base:S.base,classConfirmed:S.classConfirmed}));
  assert.equal(persisted.bg,alternative.bg,"manual background must persist after reload");
  assert.equal(persisted.sp,alternative.sp,"manual species must persist after reload");
  assert.deepEqual(persisted.base,abilities.base,"ability allocation must persist after reload");
  assert.equal(persisted.classConfirmed,true,"native class confirmation must persist after reload");
  await page.screenshot({path:path.join(evidence,"inline-ability-after-"+width+".png"),animations:"disabled"});
  await page.locator("#academyCoachToggle").click();
  assert.equal(await page.locator("#academyGuidedCoach.is-collapsed").count(),1);
  await page.locator("#academyCoachToggle").click();
  assert.equal(await page.locator("#academyGuidedCoach.is-collapsed").count(),0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=2,"ability page overflow "+overflow);
  assert.deepEqual(errors,[],"browser JS errors");
  output.push({width,rank:recommendationRank,class:expected.classRef,bg:origin.bg,sp:origin.sp,
    manualOrigin:alternative.bg+"/"+alternative.sp,base:abilities.base,bonus:abilities.bonus,overflow});
 }finally{await ctx.close();}
}
async function normalCreator(browser){
 const ctx=await browser.newContext({viewport:{width:390,height:844}});
 const page=await ctx.newPage();page.on("dialog",d=>d.accept());
 try{
  await page.goto(url("index.html")+"?view=creator",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#academyGuidedCoach").count(),1,"regular Creator should reuse same coach");
  assert.equal(await page.locator("#academyGuidedCoach.is-collapsed").count(),1,"regular Creator coach starts collapsed");
  await page.locator("#academyCoachToggle").click();
  assert.equal(await page.locator("#academyGuidedCoach.is-collapsed").count(),0);
  await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();document.dispatchEvent(new Event("change",{bubbles:true}));});
  await page.waitForFunction(()=>document.getElementById("academyGuidedCoach")?.hidden===true);
  assert.equal(await page.locator("#academyGuidedCoach").isHidden(),true,"2024 teaching must not claim 2014");
 }finally{await ctx.close();}
}
async function preservedExisting(browser){
 const ctx=await browser.newContext({viewport:{width:1440,height:900}});
 const page=await ctx.newPage();page.on("dialog",d=>d.accept());
 try{
  await page.goto(url("index.html")+"?view=creator",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
   resetAll();S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(c=>c.n==="法師");S.classConfirmed=true;
   S.bg=BACKGROUNDS_2024[0];S.bgConfirmed=true;
   S.sp=SPECIES_2024[0];S.spConfirmed=true;
   S.base={str:8,dex:12,con:14,int:15,wis:13,cha:10};
   S.abilitiesConfirmed=true;S.id=newId();saveCurrent(true);
  });
  const previous=await page.evaluate(()=>({cls:S.cls.n,bg:S.bg.n,sp:S.sp.n,base:S.base}));
  await page.goto(url("academy.html"),{waitUntil:"domcontentloaded"});
  await page.locator("#academyQuiz").click();
  for(let i=0;i<10;i++){
   await page.locator(".academy-choice").first().click();
   await page.locator(".academy-nav button").last().click();
  }
  await page.locator("#academyResult1 [data-action=academy-start-class]").click();
  await page.waitForURL(/index\.html\?view=creator/);
  const after=await page.evaluate(()=>({cls:S.cls.n,bg:S.bg.n,sp:S.sp.n,base:S.base,classConfirmed:S.classConfirmed}));
  assert.deepEqual({cls:after.cls,bg:after.bg,sp:after.sp,base:after.base},previous);
  assert.equal(after.classConfirmed,true);
  assert.equal(await page.locator("#academyRecommendedClass,#academyCreatorReturn").count(),0);
 }finally{await ctx.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});
 try{
  for(const [width,rank] of [[320,2],[390,3],[1440,1]])await quizToCreator(browser,width,rank);
  await normalCreator(browser);await preservedExisting(browser);
  console.log("PASS ACADEMY_INLINE_CREATOR_GUI",JSON.stringify(output));
 }finally{await browser.close();}
})().catch(e=>{console.error("FAIL ACADEMY_INLINE_CREATOR_GUI",e.stack||e);process.exitCode=1});

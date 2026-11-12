const {chromium}=require("playwright"),assert=require("assert");
const URL=process.env.QA_URL||"http://127.0.0.1:18767/index.html";

async function setupPage(browser,width,height){
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push("page:"+e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push("console:"+m.text())});
 await page.goto(URL+"?qa-mobile-rule-popovers="+width,{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 return {context,page,errors};
}
async function visibleState(page,selector){
 return page.evaluate(sel=>{
  const el=document.querySelector(sel),r=el?.getBoundingClientRect(),cs=el?getComputedStyle(el):null;
  return el?{
   visible:cs.display!=="none"&&cs.visibility!=="hidden",
   pinned:el.classList.contains("rule-popover-pinned"),
   overflowX:el.scrollWidth-el.clientWidth,
   left:r.left,right:r.right,top:r.top,bottom:r.bottom,
   vw:innerWidth,vh:innerHeight,text:el.innerText.slice(0,500),
   closeVisible:!!el.querySelector(".rule-popover-close")&&getComputedStyle(el.querySelector(".rule-popover-close")).display!=="none"
  }:null;
 },selector);
}

(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"}),results=[];
 try{
  for(const [width,height] of [[390,844],[360,800]]){
   const {context,page,errors}=await setupPage(browser,width,height);

   // A real spell-selection surface: tapping the spell name previews; tapping the rest selects.
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();resetState(true);
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=1;S.classLevels={法師:1};S.sub=null;
    go(6);renderSpells();
   });
   const spellButton=page.locator('#spellBody button.spell-chip:has(.sref[data-sref])').first();
   assert(await spellButton.count(),"spell selection button with .sref missing");
   const spellRef=spellButton.locator('.sref[data-sref]').first();
   const spellName=await spellRef.getAttribute("data-sref");
   const wasSelected=await spellButton.evaluate(el=>el.classList.contains("selected"));
   await spellRef.tap();
   await page.waitForTimeout(80);
   const spellOpen=await visibleState(page,"#spellTip");
   const afterPreviewSelected=await spellButton.evaluate(el=>el.classList.contains("selected"));
   assert(spellOpen?.visible&&spellOpen.pinned&&spellOpen.closeVisible,"spell tap did not pin visible popover");
   assert.equal(afterPreviewSelected,wasSelected,"tapping spell name must preview without selecting the spell");
   assert(spellOpen.overflowX<=1&&spellOpen.left>=0&&spellOpen.right<=width+1&&spellOpen.top>=0&&spellOpen.bottom<=height+1,"spell popover overflowed mobile viewport");

   const bodyTarget=spellButton.locator(".sd").first();
   await bodyTarget.tap();
   await page.waitForTimeout(80);
   const afterBodySelected=await spellButton.evaluate(el=>el.classList.contains("selected"));
   assert.notEqual(afterBodySelected,wasSelected,"tapping rest of spell card should keep normal selection behavior");
   assert(!(await visibleState(page,"#spellTip"))?.visible,"outside/card-body tap should close pinned spell popover");

   // Real species feature trigger: touch tap pins, Escape closes.
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.spChoices={};go(1);renderOrigin();
   });
   const featureRef=page.locator('#spDetail .trait-name.ft[data-tip]').first();
   assert(await featureRef.count(),"species feature trigger missing");
   await featureRef.tap();await page.waitForTimeout(80);
   const featureOpen=await visibleState(page,"#featureTip");
   assert(featureOpen?.visible&&featureOpen.pinned&&featureOpen.closeVisible,"feature tap did not pin visible popover");
   assert(featureOpen.overflowX<=1&&featureOpen.left>=0&&featureOpen.right<=width+1&&featureOpen.top>=0&&featureOpen.bottom<=height+1,"feature popover overflowed mobile viewport");
   await page.keyboard.press("Escape");await page.waitForTimeout(40);
   assert(!(await visibleState(page,"#featureTip"))?.visible,"Escape must close feature popover");

   // Opening a feature while a spell is open switches cards.
   await page.evaluate(()=>{go(6);renderSpells()});
   const spellButton2=page.locator('#spellBody button.spell-chip:has(.sref[data-sref])').first();
   await spellButton2.locator('.sref[data-sref]').first().tap();await page.waitForTimeout(40);
   await page.evaluate(()=>{S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.spChoices={};go(1);renderOrigin()});
   await page.locator('#spDetail .trait-name.ft[data-tip]').first().tap();await page.waitForTimeout(50);
   assert(!(await visibleState(page,"#spellTip"))?.visible,"opening feature should close spell popover");
   assert((await visibleState(page,"#featureTip"))?.pinned,"feature should be pinned after switching");

   // Tap outside closes pinned card.
   await page.locator("h2.step-title:visible").first().tap({force:true});await page.waitForTimeout(40);
   assert(!(await visibleState(page,"#featureTip"))?.visible,"outside tap must close pinned popover");

   // Interactive feature option keeps its own click behavior while still previewing.
   await page.evaluate(()=>{
    const host=document.createElement("div");host.id="qaInteractiveFeature";
    host.innerHTML='<button id="qaFeatureButton" class="ft" data-tip-title="測試特性" data-tip="以一個附贈動作進行測試；每長休一次。">測試特性</button>';
    host.querySelector("button").addEventListener("click",e=>e.currentTarget.dataset.clicked=String((+e.currentTarget.dataset.clicked||0)+1));
    document.body.appendChild(host);
   });
   const featureButton=page.locator("#qaFeatureButton");
   await featureButton.tap();await page.waitForTimeout(50);
   assert.equal(await featureButton.getAttribute("data-clicked"),"1","interactive feature button primary click was swallowed");
   assert((await visibleState(page,"#featureTip"))?.pinned,"interactive feature button should also preview its rule card");
   await page.locator("body").tap({position:{x:5,y:5},force:true});await page.waitForTimeout(30);

   // Final sheet selected feat/boon/origin surfaces must expose canonical feature-card triggers.
   const finalRefs=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();resetState(true);
    S.cls=CLASSES.find(x=>x.n==="戰士");S.level=20;S.classLevels={戰士:20};S.sub=0;
    S.bg=BACKGROUNDS_2024[0];S.sp=SPECIES_2024.find(x=>x.n==="人類");S.spChoices={};
    const extra=originFeatOptions().find(x=>x.split("(")[0]!==String(S.bg.feat||"").split("(")[0]);
    if(extra)S.spChoices.hFeat=extra;
    const general=(GFEATS_2024||[]).find(x=>x.id&&x.id!=="ability-score-improvement");
    S.asi[4]={t:"feat",feat:general?.n||GFEATS_2024[0].n};
    const boon=(BOONS||[]).find(x=>x.id==="boon-of-combat-prowess")||BOONS[0];S.boon=boon.n;
    renderFinal();
    const refs=[...document.querySelectorAll("#finalSheet .ft[data-tip]")];
    return {
      count:refs.length,
      titles:refs.map(x=>x.dataset.tipTitle||x.textContent.trim()),
      hasGeneral:refs.some(x=>(x.dataset.tipTitle||x.textContent).includes(canonicalFeatName5R(general))),
      hasBoon:refs.some(x=>(x.dataset.tipTitle||x.textContent).includes(canonicalFeatName5R(boon))),
      hasBackground:refs.some(x=>(x.dataset.tipTitle||x.textContent).includes(canonicalFeatName5R(S.bg.feat))),
      hasExtra:extra?refs.some(x=>(x.dataset.tipTitle||x.textContent).includes(canonicalFeatName5R(extra))):true,
      pageOverflow:document.documentElement.scrollWidth-innerWidth
    };
   });
   assert(finalRefs.hasGeneral&&finalRefs.hasBoon&&finalRefs.hasBackground&&finalRefs.hasExtra,"final sheet selected feat/boon/origin references are not all wired to rule cards");
   assert(finalRefs.pageOverflow<=1,"final sheet introduced horizontal overflow");

   results.push({width,height,spellName,spellOpen:{pinned:spellOpen.pinned,overflowX:spellOpen.overflowX},featureOpen:{pinned:featureOpen.pinned,overflowX:featureOpen.overflowX},finalRefs,errors,pass:errors.length===0});
   assert.deepEqual(errors,[],"browser errors detected");
   await context.close();
  }
  console.log(JSON.stringify({pass:true,results},null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

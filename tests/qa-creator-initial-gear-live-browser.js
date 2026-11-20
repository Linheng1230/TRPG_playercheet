"use strict";
/* Human-equivalent local browser acceptance: no direct go() or state changes. */
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const base=process.env.QA_BASE?.replace(/\/?$/,"/")||("file:///"+root.replace(/\\/g,"/")+"/");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});
 const report=[];
 try{
  for(const width of [320,390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:width===390?844:900}});
   const page=await ctx.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",d=>d.accept());
   await page.goto(base+"academy.html",{waitUntil:"domcontentloaded"});
   for(let i=0;i<10;i++){
    await page.locator(".academy-choice").first().click();
    await page.locator(".academy-nav button").last().click();
   }
   const recommended=await page.locator("#academyResult2 h3").innerText();
   await page.locator("#academyResult2 [data-action=academy-start-class]").click();
   await page.waitForURL(/index\.html\?view=creator/);
   // URL commit is not proof that the creator's inline State has initialized.
   // Avoid racing the first S read on slower hosted Chrome runners.
   await page.waitForLoadState("domcontentloaded");
   try{
    await page.waitForFunction(()=>typeof S!=="undefined"&&typeof go==="function"&&!!document.querySelector("#classGrid"),null,{timeout:20000});
   }catch(error){throw new Error("Creator did not initialize after academy navigation at "+page.url()+"; page errors: "+errors.join(" | "),{cause:error})}
   if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
   assert.equal(await page.evaluate(()=>S.cls),null);
   assert.equal(await page.locator("#classGrid [data-class-name].selected").count(),1);
   await page.locator('[data-step="0"] .class-confirm-controls button').click();
   assert.equal(await page.evaluate(()=>S.cls.n),recommended);
   await page.locator("#next0").click();
   await page.waitForFunction(()=>!!S.bg&&!!S.sp);
   const bg=await page.evaluate(()=>S.bg.n),sp=await page.evaluate(()=>S.sp.n);
   for(const sel of await page.locator("#bgDetail select[data-bg24tool]").all()){
    if(await sel.locator("option").count()>1)await sel.selectOption({index:1});
   }
   const originOptions=page.locator("#bgDetail [data-originpick]");
   for(let i=0;i<3;i++){
    const ready=await page.locator(".confirm-bg button").isEnabled();
    if(ready)break;
    const first=originOptions.filter({hasNot:page.locator("[aria-pressed=true]")}).first();
    if(await first.count())await first.click();
   }
   assert.equal(await page.locator(".confirm-bg button").isEnabled(),true,"background still requires inputs: "+bg);
   await page.locator(".confirm-bg button").click();
   assert.equal(await page.evaluate(()=>S.bgConfirmed),true);
   const options=page.locator("#spDetail select[data-spch]");
   for(const select of await options.all()){
    const items=select.locator("option");if(await items.count()>1&&await select.isEnabled())await select.selectOption({index:1});
   }
   const speciesChoiceConfirm=page.locator("#spDetail [data-confirm-species-choices]");
   if(await speciesChoiceConfirm.count()&&await speciesChoiceConfirm.isEnabled())await speciesChoiceConfirm.click();
   assert.equal(await page.locator(".confirm-sp button").isEnabled(),true,"species still needs inputs: "+sp);
   await page.locator(".confirm-sp button").click();
   assert.equal(await page.evaluate(()=>S.spConfirmed),true);
   assert.equal(await page.locator("#next1").isEnabled(),true,"must allow advancing to abilities");
   await page.locator("#next1").click();
   assert.equal(await page.evaluate(()=>S.step),2,"real next1 click must navigate to abilities");
   await page.locator("#academyApplySuggestedAbilities").click();
   assert.equal(await page.locator("#confirmAbilities").isEnabled(),true,"background bonuses and ability values must satisfy existing gates");
   await page.locator("#confirmAbilities").click();
   assert.equal(await page.evaluate(()=>S.abilitiesConfirmed),true,"original final ability confirmation used");

   // From the Creator's real navigation, choose 2024 initial gear before the final sheet.
   const gearNav=page.locator("#stepNav .nav-secondary button").filter({hasText:"初始裝備"});
   assert.equal(await gearNav.count(),1,"2024 Creator must expose one extra equipment step");
   await gearNav.click();
   assert.equal(await page.evaluate(()=>S.step),14,"new gear stage uses stable step 14");
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=2,"gear stage horizontal overflow");
   assert.equal(await page.locator("#nextGear").isEnabled(),false,"unclaimed gear cannot complete Creator");
   assert.equal(await page.locator("[data-classgear]").count()>0,true,"class equipment options exist in Creator");
   assert.equal(await page.locator("[data-bggear]").count(),2,"background package options exist in Creator");
   await page.locator('[data-classgear="A"]').click();
   await page.locator('[data-bggear="B"]').click();
   assert.equal(await page.locator("[data-startgear-review]").count(),1,"both packages show same original final review");
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=2,"gear review horizontal overflow");
   await page.locator("[data-startgear-final]").click();
   assert.equal(await page.locator("[data-startgear-complete]").count(),1);
   assert.equal(await page.locator("#nextGear").isEnabled(),true);
   assert.equal(await page.evaluate(()=>isStartingGear24Final()),true,"initial equipment must be explicitly finalized");
   await page.locator("#nextGear").click();
   assert.equal(await page.evaluate(()=>S.step),7,"final sheet reached only through Creator next button");
   assert.equal(await page.locator("#finalSheet [data-classgear],#finalSheet [data-bggear],#finalSheet [data-startgear-final]").count(),0,
      "final sheet must not retain original equipment selection forms");
   assert.equal(await page.locator('#finalSheet [data-go="14"]').count(),1,"final sheet keeps one return-to-gear link");
   // Use the sheet's original public link to reopen/change the plan without duplicate gold.
   await page.locator('#finalSheet [data-go="14"]').click();
   assert.equal(await page.evaluate(()=>S.step),14);
   await page.locator("[data-startgear-reopen]").click();
   assert.equal(await page.locator("#nextGear").isEnabled(),false);
   await page.locator("[data-startgear-review] summary").click();
   await page.locator("[data-classgear-edit]").click();
   await page.locator('[data-classgear="B"]').click();
   await page.locator("[data-startgear-final]").click();
   assert.equal(await page.evaluate(()=>isStartingGear24Final()),true);
   assert.equal(await page.locator("#nextGear").isEnabled(),true);
   await page.locator("#nextGear").click();
   const equipment=await page.evaluate(()=>({
     classMode:S.gear.classPackage24Mode,bgMode:S.gear.bgPackage24Mode,
     goldGp:S.gear.gold.gp,final:isStartingGear24Final(),
     classGrant:S.gear.classGearGrant24?.mode,bgGrant:S.gear.bgGearGrant24?.mode,
     classItems:S.gear.classGearGrant24?.items||""
   }));
   assert.deepEqual(equipment,{classMode:"B",bgMode:"B",goldGp:125,final:true,
     classGrant:"B",bgGrant:"B",classItems:""},"A -> B rollback must preserve exact class+background grants");
   const snapshot=await page.evaluate(gear=>({cls:S.cls.n,bg:S.bg.n,sp:S.sp.n,base:S.base,bonus:S.bonus,classConfirmed:S.classConfirmed,bgConfirmed:S.bgConfirmed,spConfirmed:S.spConfirmed,abilityConfirmed:S.abilitiesConfirmed,gear,step:S.step}),equipment);
   await page.reload({waitUntil:"domcontentloaded"});
   assert.deepEqual(await page.evaluate(()=>({cls:S.cls.n,bg:S.bg.n,sp:S.sp.n,base:S.base,bonus:S.bonus,classConfirmed:S.classConfirmed,bgConfirmed:S.bgConfirmed,spConfirmed:S.spConfirmed,abilityConfirmed:S.abilitiesConfirmed,gear:{classMode:S.gear.classPackage24Mode,bgMode:S.gear.bgPackage24Mode,goldGp:S.gear.gold.gp,final:isStartingGear24Final(),classGrant:S.gear.classGearGrant24?.mode,bgGrant:S.gear.bgGearGrant24?.mode,classItems:S.gear.classGearGrant24?.items||""}})),((({step,...rest})=>rest)(snapshot)),"reload must preserve original Creator data (navigation restarts at step 0)");
   assert.deepEqual(errors,[],"browser errors");
   report.push({width,cls:recommended,bg,sp,confirmed:"class+origin+abilities",state:snapshot,errors});
   await ctx.close();
  }
  const legacyCtx=await browser.newContext({viewport:{width:390,height:844}});
  const legacy=await legacyCtx.newPage();
  legacy.on("dialog",d=>d.accept());
  await legacy.goto(base+"index.html?view=creator",{waitUntil:"domcontentloaded"});
  await legacy.locator("#btnRuleset").click();
  await legacy.locator('[data-ruleset="2014"]').click();
  assert.equal(await legacy.evaluate(()=>S.ruleset),"2014");
  await legacy.waitForTimeout(400); // Original Creator schedules its first-run modal after 150ms.
  if(await legacy.locator("#rulesetModal.open").isVisible())await legacy.locator("#closeRuleset").click();
  assert.equal(await legacy.locator("#stepNav .nav-secondary button").filter({hasText:"初始裝備"}).count(),0,
     "2014 class-provided initial equipment should not be duplicated");
  assert.equal(await legacy.locator('.wcs-rail-step').count(),0,"legacy duplicate left navigation removed");
  await legacy.locator("#classGrid button").first().click();
  await legacy.locator('[data-step="0"] .class-confirm-controls button').click();
  assert.equal(await legacy.locator("#classDetail .start-gear-builder").count(),1,
     "2014 native starting equipment remains at class selection");
  await legacy.locator("#stepNav .nav-secondary button").filter({hasText:"法術"}).click();
  assert.match(await legacy.locator("#next6").innerText(),/角色卡/);
  await legacy.locator("#next6").click();
  assert.equal(await legacy.evaluate(()=>S.step),7,"2014 spell completion still opens sheet");
  await legacyCtx.close();
  console.log("PASS CREATOR_INITIAL_GEAR_REAL_USER_PATH",JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error("FAIL ACADEMY_INLINE_REAL_CREATOR_PATH",e.stack);process.exitCode=1});

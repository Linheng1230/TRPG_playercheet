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
  for(const width of [390,1440]){
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
   await page.waitForTimeout(350);
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
   const snapshot=await page.evaluate(()=>({cls:S.cls.n,bg:S.bg.n,sp:S.sp.n,base:S.base,bonus:S.bonus,classConfirmed:S.classConfirmed,bgConfirmed:S.bgConfirmed,spConfirmed:S.spConfirmed,abilityConfirmed:S.abilitiesConfirmed,step:S.step}));
   await page.reload({waitUntil:"domcontentloaded"});
   assert.deepEqual(await page.evaluate(()=>({cls:S.cls.n,bg:S.bg.n,sp:S.sp.n,base:S.base,bonus:S.bonus,classConfirmed:S.classConfirmed,bgConfirmed:S.bgConfirmed,spConfirmed:S.spConfirmed,abilityConfirmed:S.abilitiesConfirmed})),((({step,...rest})=>rest)(snapshot)),"reload must preserve original Creator data (navigation restarts at step 0)");
   assert.deepEqual(errors,[],"browser errors");
   report.push({width,cls:recommended,bg,sp,confirmed:"class+origin+abilities",state:snapshot,errors});
   await ctx.close();
  }
  console.log("PASS ACADEMY_INLINE_REAL_CREATOR_PATH",JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error("FAIL ACADEMY_INLINE_REAL_CREATOR_PATH",e.stack);process.exitCode=1});

"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const base=process.env.QA_BASE||"http://127.0.0.1:18766";
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [390,480,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width>=768?900:844},reducedMotion:"reduce"});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof CreatorUX5R?.beforeLevelRender==="function"&&typeof go==="function");
   await page.waitForTimeout(250);
   await page.evaluate(()=>{
    document.getElementById("rulesetModal")?.classList.remove("open");
    resetState();S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="戰士");S.classConfirmed=true;
    S.level=3;S.classLevels={"戰士":3};
    S.base={str:16,dex:12,con:14,int:10,wis:12,cha:8};
    S.sub=null;S.subConfirmed=false;pendingSubclass=null;
    go(5);
   });
   assert.equal(await page.locator("#subGrid [data-sub]").count(),4,"2024 Fighter should have four subclasses");
   await page.locator("#subGrid [data-sub='0']").click();
   assert.equal(await page.evaluate(()=>S.sub),null,"preview must not confirm subclass");
   assert.equal(await page.locator("#subclassPreview details").count(),4,"one tier per Fighter subclass feature level");
   const tiers=page.locator("#subclassPreview .subclass-preview-tier");
   await tiers.nth(1).locator("summary").click();
   assert.equal(await tiers.nth(1).getAttribute("open"),"","second tier opened");
   await page.locator("#lvUp").click();
   assert.equal(await page.evaluate(()=>S.level),4);
   assert.equal(await page.evaluate(()=>document.activeElement?.id),"lvUp","level-up button retains keyboard focus after replacement "+width);
   assert.equal(await tiers.nth(1).getAttribute("open"),"","expanded subclass tier persists after leveling "+width);
   await page.keyboard.press("Enter");
   assert.equal(await page.evaluate(()=>S.level),5,"keyboard Enter can level twice without extra clicks "+width);
   assert.equal(await page.evaluate(()=>document.activeElement?.id),"lvUp");
   assert.equal(await tiers.nth(1).getAttribute("open"),"","expanded tier survives second redraw "+width);
   await page.locator("#lvDown").click();
   assert.equal(await page.evaluate(()=>document.activeElement?.id),"lvDown","level-down focus restored");
   assert.equal(await page.evaluate(()=>S.level),4);
   const style=page.locator("#styleSel");
   assert(await style.count()>0,"2024 Fighter fighting style control exists");
   await style.selectOption({index:1});
   assert.equal(await page.evaluate(()=>document.activeElement?.id),"styleSel","choice field focus restored");
   assert.equal(await tiers.nth(1).getAttribute("open"),"","detail tier preserved while changing style");
   // If a different subclass is previewed, it should use its default first-tier state.
   await page.locator("#subGrid [data-sub='1']").click();
   assert.equal(await page.evaluate(()=>pendingSubclass),1);
   assert.equal(await page.evaluate(()=>S.sub),null,"switching previews never confirms selection");
   assert.equal(await tiers.nth(1).getAttribute("open"),null,"old subclass expansion not applied to new subclass");
   assert.equal(await tiers.first().getAttribute("open"),"","new subclass starts with first tier open");
   assert.equal(await page.locator("#subclassPreview").count(),1,"no duplicate subclass descriptions");
   const diagnostic=await page.evaluate(()=>({
    width:innerWidth,docWidth:document.documentElement.scrollWidth,
    focus:document.activeElement?.getAttribute("data-sub"),
    details:[...document.querySelectorAll("#subclassPreview details")].map(x=>x.open),
    savedSubclass:S.sub,pendingSubclass,level:S.level
   }));
   assert(diagnostic.docWidth<=diagnostic.width+2,"no mobile horizontal overflow: "+JSON.stringify(diagnostic));
   assert.equal(diagnostic.focus,"1","subclass choice focus retained");
   assert.deepEqual(errors,[],"no page errors at "+width);
   fs.mkdirSync(path.join(__dirname,"..","tmp","qa-creator-ux"),{recursive:true});
   await page.screenshot({path:path.join(__dirname,"..","tmp","qa-creator-ux","level-continuity-"+width+".png")});
   console.log("PASS creator level continuity "+width+"px: focus, keyboard Enter, expanded tiers, preview switch");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

"use strict";
// Release gate: verify UI projection of canonical 2024 terms, rather than only
// checking that a translation dictionary exists. A newly added reference tab
// is automatically included in the visible-surface sweep.
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const BASE=(process.env.QA_BASE||"http://127.0.0.1:18766").replace(/\\/$/,"");
const sizes=[[1440,900,"desktop"],[390,844,"mobile"]];
const output=[];
function leak(text,legacy){
 const normalized=String(text||"");
 return Object.entries(legacy).filter(([old,correct])=>old!==correct&&normalized.includes(old))
   .map(([old,correct])=>({old,correct}));
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const [width,height,label] of sizes){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(BASE+"/index.html?translation-gate="+label,{waitUntil:"domcontentloaded"});
   await page.locator('#refTabs [data-r="class"]').waitFor();
   await page.waitForTimeout(250);
   if(await page.locator("#rulesetModal").evaluate(el=>el.classList.contains("open")))
    await page.locator("#closeRuleset").click();
   const model=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();go(8);
    const migration=globalThis.ZIZI_5R_NAME_MIGRATIONS?.skills||{};
    return {
     migration,
     classes:CLASSES.map(c=>({id:c.n,raw:[...c.sk],
      display:c.sk.map(n=>displayName5R("skills",n))})),
     actual:Object.fromEntries(SKILLS.map(s=>[s.n,displayName5R("skills",s.n)]))
    };
   });
   assert.equal(model.classes.length,12,label+": expected 12 PHB2024 classes");
   assert.equal(model.actual["動物馴養"],"馴獸",label+": canonical 馴獸 lookup");
   assert.equal(model.actual["雜技"],"特技",label+": canonical 特技 lookup");
   assert.equal(model.migration["遊說"],"說服",label+": legacy 說服 alias");
   await page.locator('#refTabs [data-r="class"]').click();
   let checked=0;
   for(const c of model.classes){
    await page.locator('[data-cr5r-class="'+c.id+'"]').click();
    const details=page.locator(".cr5r-skills");
    await details.locator("summary").click();
    const actual=(await details.locator("p").innerText()).split("、").map(x=>x.trim()).filter(Boolean);
    assert.deepEqual(actual,c.display,label+": "+c.id+" bypassed canonical display projection");
    assert.deepEqual(leak(actual.join("、"),model.migration),[],label+": old skill labels in "+c.id);
    checked++;
   }
   // Prove this test actually catches the original regression (mutation QA).
   const target=page.locator(".cr5r-skills p");
   const previous=await target.innerText();
   await target.evaluate(el=>el.textContent="動物馴養");
   assert(leak(await target.innerText(),model.migration).some(x=>x.old==="動物馴養"),
    label+": mutation must be rejected by visibility auditor");
   await target.evaluate((el,value)=>el.textContent=value,previous);
   // Sweep all registered quick-reference tabs, not only the newly patched class tab.
   // New tabs are audited automatically; no per-feature registration is necessary.
   const tabs=await page.locator('#refTabs [data-r]').evaluateAll(nodes=>
    [...new Set(nodes.map(n=>n.dataset.r).filter(Boolean))]);
   const violations=[];
   for(const tab of tabs){
    await page.locator('#refTabs [data-r="'+tab+'"]').first().click();
    const text=await page.locator("#refBody").innerText();
    for(const item of leak(text,model.migration))violations.push({tab,...item});
   }
   assert.deepEqual(violations,[],label+": visible 2024 reference terms drifted: "+JSON.stringify(violations));
   assert.deepEqual(errors,[],label+": browser errors");
   const viewport=await page.evaluate(()=>({
    documentWidth:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth
   }));
   assert(viewport.documentWidth<=viewport.viewport+2,label+": horizontal overflow");
   output.push({label,checkedClasses:checked,referenceTabs:tabs.length,termViolations:0,errors:0,viewport});
   await page.close();
  }
  console.log(JSON.stringify({PASS:true,gate:"2024 canonical translation projection",output},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

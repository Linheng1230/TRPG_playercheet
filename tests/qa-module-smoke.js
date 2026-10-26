"use strict";
const assert=require("assert");const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{let b;try{
 b=await chromium.launch({headless:true,channel:"chrome"});const p=await b.newPage();const errors=[];
 p.on("pageerror",e=>errors.push(String(e)));await p.goto(URL+"?module-smoke=1",{waitUntil:"networkidle"});
 if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
 const x=await p.evaluate(()=>({
  scripts:[...document.scripts].map(s=>s.src).filter(Boolean),
  abilityType:typeof renderAbilityRef,rows:abilityRefRows().length,
  normalize:normalizeAlignment("混亂善良"),filterMode:abilityRefFilter.mode
 }));
 await p.evaluate(()=>go(8));await p.waitForTimeout(50);
 const cards=await p.locator(".ability-ref-card").count();
 const failures=[...errors];
 if(!x.scripts.some(s=>s.includes("/assets/ability-lookup.js?v=20261026-hardening-v1")))failures.push("ability module not loaded");
 if(!x.scripts.some(s=>s.includes("/assets/save-compat.js?v=20261026-hardening-v1")))failures.push("save compat module not loaded");
 if(x.abilityType!=="function"||x.rows<400||cards<1)failures.push("ability module contract failed");
 if(x.normalize!=="混沌善良")failures.push("alignment migration helper failed");
 console.log(JSON.stringify({x,cards,failures,failureCount:failures.length},null,2));
 assert.equal(failures.length,0);
 }finally{if(b)await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

"use strict";
const {chromium}=require("playwright"),fs=require("node:fs"),path=require("node:path");
const assert=require("node:assert/strict");
const url=process.env.QA_URL||"http://127.0.0.1:18887/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.QA_CHROME_CHANNEL||(process.platform==="win32"?"chrome":undefined)});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url,{waitUntil:"networkidle",timeout:38000});
  const r=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   const failures=[],counts={total:SPELLS_2024_TUPLES.length,rendered:0,conditionTokens:0,conditionMarked:0,otherSemantic:0};
   const map=globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024.conditionTerms;
   const norm=s=>String(s||"").replace(/\s+/gu,"");
   const body=document.createElement("div");
   for(const row of SPELLS_2024_TUPLES){
    const id=row[0],sp=SPELLS.find(s=>s.n===row[3]);
    if(!sp){failures.push(id+":spell_not_found");continue;}
    const src=sp.d,raw=formatSpellRuleHTML(src);
    body.innerHTML=raw;
    if(norm(body.textContent)!==norm(src)){
     let i=0,a=norm(src),b=norm(body.textContent);
     while(i<a.length&&i<b.length&&a[i]===b[i])i++;
     failures.push({id,issue:"canonical_text_parity",position:i,source:a.slice(Math.max(i-12,0),i+35),shown:b.slice(Math.max(i-12,0),i+35)});
    }
    const expected=Object.keys(map).filter(term=>src.includes(term));
    const marked=[...body.querySelectorAll(".sr-condition")];
    counts.conditionTokens+=expected.length;counts.conditionMarked+=marked.length;
    for(const term of expected){
      if(!marked.some(x=>x.textContent===term&&x.dataset.condition===map[term]))
        failures.push({id,issue:"unmarked_condition",term});
    }
    const bad=marked.find(x=>x.dataset.semanticType!=="condition"||x.classList.contains("sr-save"));
    if(bad)failures.push({id,issue:"misclassified",term:bad.textContent});
    counts.otherSemantic+=[...body.querySelectorAll(".sr-save,.sr-action,.sr-damage,.sr-advantage,.sr-disadvantage")].length;
    counts.rendered++;
   }
   const c2014=SPELLS14.find(s=>s.lv===1);
   S.ruleset="2014";syncRulesetUI();
   const original=formatSpellRuleHTML(c2014.d);
   const unchanged2014=!original.includes('class="sr-condition"');
   return {counts,unchanged2014,failures:failures.slice(0,30),failureCount:failures.length};
  });
  console.log("FULL_391_2024_TOOLTIP_PARITY",JSON.stringify(r));
  assert.equal(r.counts.total,391);
  assert.equal(r.counts.rendered,391);
  assert.equal(r.failureCount,0,"Full rule DOM parity/condition coverage");
  assert(r.unchanged2014&&r.counts.conditionMarked>30&&r.counts.otherSemantic>200);
  assert.equal(errors.length,0,errors.join("; "));
  console.log("SPELL_CONDITION_FULL_391_PASS");
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

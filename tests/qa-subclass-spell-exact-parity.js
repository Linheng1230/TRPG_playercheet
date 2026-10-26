"use strict";
const fs=require("fs"),assert=require("assert");const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const FIX=process.env.SUBCLASS_SPELL_FIXTURE||"D:/Repositories/trpg-playercheet-private/tests/fixtures/expected-subclass-spells-5r2024.json";
const fx=JSON.parse(fs.readFileSync(FIX,"utf8")),fixture=fx.entries||{};
const same=(a,b)=>JSON.stringify((a||[]).slice().sort())===JSON.stringify((b||[]).slice().sort());
const sameMap=(a,b)=>{const ks=[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])].sort((x,y)=>+x-+y);return ks.every(k=>same(a?.[k],b?.[k]))};
(async()=>{let browser;try{
 assert.equal((fx.unresolved||[]).length,0,"fixture has unresolved upstream spell tokens");
 browser=await chromium.launch({headless:true,channel:"chrome"});const p=await browser.newPage();
 await p.goto(URL+"?qa-subclass-spells=3",{waitUntil:"networkidle"});if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
 const runtime=await p.evaluate(()=>({subSpells:SUB_SPELLS,land:LAND_SPELLS,spellEng:Object.fromEntries(SPELLS.map(x=>[x.n,x.eng]))}));
 const toEng=m=>{const o={};for(const [lv,a] of Object.entries(m||{}))o[lv]=[...new Set((a||[]).map(n=>runtime.spellEng[n]).filter(Boolean))].sort();return o};
 const failures=[];let checks=0;
 for(const [key,rec] of Object.entries(fixture)){checks++;
  if(key==="大地結社"){const want=rec.spells_by_terrain||{};for(const [terrain,m] of Object.entries(want)){const have=toEng(runtime.land[terrain]||{});if(!sameMap(m,have))failures.push({kind:"land-spells",terrain,want:m,have})}const extra=Object.keys(runtime.land).filter(x=>!want[x]);if(extra.length)failures.push({kind:"land-extra-terrain",extra});continue}
  const want=rec.spells||{},have=toEng(runtime.subSpells[key]||{});if(!sameMap(want,have))failures.push({kind:"subclass-spells",sub:key,sourceSub:rec.source_subclass,want,have});
 }
 const expectedKeys=Object.keys(fixture).filter(x=>x!=="大地結社"&&Object.keys(fixture[x].spells||{}).length);const extra=Object.keys(runtime.subSpells).filter(x=>!expectedKeys.includes(x));if(extra.length)failures.push({kind:"extra-runtime-subclass-spell-table",extra});
 console.log(JSON.stringify({checks,failures,failureCount:failures.length},null,2));assert.equal(failures.length,0);
 }finally{if(browser)await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
for(const rel of ["assets/data/spells-phb-2024.js","assets/data/spell-rules-2024.js","assets/spell-quick-facts-2024.js","assets/creator-spell-preview-2024.js"]){
 require(path.join(root,rel));
}
const tuples=globalThis.SPELLS_2024_TUPLES,fulls=globalThis.SPELLS_2024_FULL_RULES,mod=globalThis.ZIZI_CREATOR_SPELL_PREVIEW_2024;
const norm=s=>String(s||"").replace(/\s+/g,"").replace(/＋/g,"+");
let failures=[],compact=0,fullChars=0,visibleChars=0,maxMetrics=0;
assert.equal(tuples.length,391,"2024 spell dataset must have 391 items");
for(const row of tuples){
 const id=row[0];
 for(const lv of [1,5,11,17]){
  const meta={time:row[9],range:row[10],dur:row[12]};
  const text=mod.preview({identifier:id,n:row[3],d:fulls[id],con:!!row[6],rit:!!row[7],signature:row[14]},lv,meta).text;
  const c=mod.compactParts(text);
  const glance=c.lead+" "+c.numeric.join(" ");
  if(!text.includes(c.lead))failures.push([id,lv,"LEAD_NOT_SOURCE"]);
  for(const n of c.numeric)if(!text.includes(n))failures.push([id,lv,"ADDED_NUMBER",n]);
  for(const number of [...new Set(mod.values(text).map(norm))]){
   if(!norm(glance).includes(number))failures.push([id,lv,"MISSING_NUMBER",number]);
  }
  if(!c.isShort){
   if(!c.remaining||!norm(text).includes(norm(c.remaining.slice(0,12))))failures.push([id,lv,"REST_NOT_SOURCE"]);
   if(c.lead.length>=text.length)failures.push([id,lv,"NOT_COMPACT"]);
   compact++;
  }
  maxMetrics=Math.max(maxMetrics,c.numeric.length);fullChars+=text.length;visibleChars+=glance.length;
 }
}
const giantRow=tuples.find(r=>r[0]==="giant-insect");
const giantText=mod.preview({identifier:"giant-insect",n:giantRow[3],d:fulls["giant-insect"]},4,{time:giantRow[9],range:giantRow[10],dur:giantRow[12]}).text;
const giantCompact=mod.compactParts(giantText);
assert(giantCompact.numeric.includes("1d6+3"),"Giant Insect must show attack damage dice");
assert(mod.numericContext("1d6+3",giantCompact.remaining).includes("1d6+3+法術環階"),"Summon damage must retain spell-level modifier in visible metrics");
assert(mod.numericContext("AC 11",giantCompact.remaining).includes("AC 11+法術環"),"Summon AC must retain slot-level formula");
assert(mod.numericContext("HP 30",giantCompact.remaining).includes("HP 30+每比四環高一法術環階10"),"Summon HP must retain higher-slot formula");
const fiend=tuples.find(r=>r[0]==="summon-fiend");
const fiendPreview=mod.preview({identifier:fiend[0],n:fiend[3],d:fulls[fiend[0]]},5,{time:fiend[9],range:fiend[10],dur:fiend[12]}).text;
const fiendCompact=mod.compactParts(fiendPreview);
const fiendHp=mod.numericContext("HP 50",fiendCompact.remaining);
assert(fiendHp.includes("僅惡魔")&&fiendHp.includes("僅魔鬼")&&fiendHp.includes("僅尤格羅斯魔")&&fiendHp.includes("每比6環高的法術環階15點"),"Summon Fiend variant HP and scaling must stay linked");
console.log("COMPACT_391_QA",JSON.stringify({
 sourceSpells:tuples.length,levels:[1,5,11,17],cases:tuples.length*4,
 longCompactCases:compact,avgOriginalChars:Math.round(fullChars/1564),avgVisibleChars:Math.round(visibleChars/1564),
 reduction:Math.round(100*(1-visibleChars/fullChars)),maxNumericChips:maxMetrics,
 failures:failures.length,examples:failures.slice(0,20)
}));
if(failures.length)process.exitCode=1;

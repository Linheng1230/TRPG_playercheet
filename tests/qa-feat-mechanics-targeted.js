'use strict';
const assert=require('assert'),{chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'});
 try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.QA_URL||'http://127.0.0.1:18773/index.html',{waitUntil:'networkidle'});
 const out=await p.evaluate(()=>{
  S.ruleset='2024';syncRulesetUI();
  const originDefs=['匠人','樂師','多才多藝','巧匠','音樂家','熟習'].map(n=>({n,id:featId5R(n),spec:originFeatChoiceSpec2024(n)?.max||0,desc:featDesc(n).length}));
  const featChoiceCases=['元素專家','技藝專家','敏思','明察','武器大師'].map(n=>{const f={t:'feat',feat:n};return {n,id:featId5R(n),incomplete:featExtraReady2024(f),hasUI:featExtraUI2024(f).length>0}});
  S.cls=CLASSES.find(x=>x.n==='戰士');S.level=4;S.classLevels={戰士:4};S.base={str:15,dex:12,con:14,int:10,wis:10,cha:8};S.bg=BACKGROUNDS_2024[0];S.asi={4:{t:'feat',feat:'重甲大師',featAb:'str'}};
  const before=featAbilityMap(),base=finalScore('str'),save=serialize();
  const restored=deserialize(save);const after=featAbilityMap(),score=finalScore('str');
  const legacy=(globalThis.ZIZI_5R_NAME_MIGRATIONS.feats||{});
  return {originDefs,featChoiceCases,before,after,base,score,restored:restored.ok,saveFeat:save.asi[4]?.feat,legacyCount:Object.keys(legacy).length,canonical:featDesc('巧匠').length,reference:featReferenceRows5R().length};
 });
 assert(out.originDefs.every(x=>x.id&&x.desc>0),'Origin names must have both ID and rule text');
 assert(out.originDefs.every(x=>x.spec===3),'Origin optional choices must support three selections');
 assert(out.featChoiceCases.every(x=>x.id&&x.incomplete===false&&x.hasUI),'Required feat options must be gated');
 assert(out.restored,'JSON roundtrip');
 assert.equal(out.saveFeat,'重甲大師','Stable feat identity');
 assert.equal(out.before.str,1);
 assert.equal(out.after.str,1);
 assert.equal(out.base,out.score);
 assert.equal(out.legacyCount,52);assert.equal(out.reference,65);
 assert.deepStrictEqual(errors,[]);
 console.log(JSON.stringify({pass:true,originChoices:out.originDefs.length,extraChoiceGates:out.featChoiceCases.length,featStrengthBonus:out.before.str,jsonRoundtrip:true,legacyAliases:out.legacyCount,referenceEntries:out.reference}));
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

'use strict';
const assert=require('assert'),{chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(process.env.QA_URL||'http://127.0.0.1:18775/index.html',{waitUntil:'networkidle'});
  const details=await p.evaluate(()=>{
   S.ruleset='2024';syncRulesetUI();
   const data=SPELLS.map(sp=>({id:sp.identifier,c:spellMetaDb()[sp.n]?.comp||'',signature:sp.signature?.c||[],con:sp.con,rit:sp.rit,t:spellMetaDb()[sp.n]?.time||'',d:spellMetaDb()[sp.n]?.dur||''}));
   const long=data.find(x=>x.c.includes('價值')&&x.c.includes('會消耗')&&x.c.includes('聲語')&&x.c.includes('姿勢'));
   const raw=long.c,shown=displaySpellComponents2024(raw);
   const tooltip=spellTipHTML(SPELLS.find(sp=>sp.identifier===long.id).n);
   const filters=Object.fromEntries(['v','s','m'].map(k=>[k,document.querySelector('[data-sf-group="comp"][data-sf-value="'+k+'"]')?.textContent]));
   const sourceSignatures=SPELLS.map(sp=>({...spellComponentFlags(sp)}));
   srefFilter.lv.clear();srefFilter.cls.clear();srefFilter.tag.clear();srefFilter.comp.clear();
   srefFilter.comp.add('m');
   const filtered=SPELLS.filter(sp=>spellRefMatches(sp,'')).length;
   renderSpellRefList();
   const ref=document.querySelector('#srefBody .sr-meta')?.textContent||'';
   const count=SPELLS.filter(sp=>spellComponentFlags(sp).m).length;
   const old2014='聲音、姿勢、材料（價值 50 金幣）';
   S.ruleset='2014';syncRulesetUI();const legacy=displaySpellComponents2024(old2014);
   return{total:data.length,ids:new Set(data.map(x=>x.id)).size,full:data.filter(x=>x.signature.length===6).length,filters,raw,shown,tooltip,filtered,count,ref,legacy,unmodified:data.filter(x=>x.c.includes('價值')).length,representative:data.slice(0,5).map(x=>x.t),concentration:data.filter(x=>x.con).length,ritual:data.filter(x=>x.rit).length,magicActionNote:document.body.textContent.includes('魔法動作'),sourceSignatures};
  });
  assert.equal(details.total,391);assert.equal(details.ids,391);
  assert.deepStrictEqual(details.filters,{v:'聲（V）',s:'勢（S）',m:'材（M）'});
  assert(details.raw.includes('價值')&&details.raw.includes('會消耗'));
  assert(details.shown.includes('聲（V）')&&details.shown.includes('勢（S）')&&details.shown.includes('材（M）（價值'));
  assert(details.shown.includes('會消耗'),'Material consumption must survive');
  assert(!details.shown.includes('聲語')&&!details.shown.includes('姿勢')&&!details.shown.includes('材料（'));
  assert.equal(details.count,details.filtered);
  assert(details.ref.includes('施法成分')&&details.ref.includes('材（M）'));
  assert(details.tooltip.includes('施法成分')&&details.tooltip.includes('材（M）（價值')&&details.tooltip.includes('會消耗'),'Spell tooltip must show full material details');
  assert.equal(details.legacy,'聲音、姿勢、材料（價值 50 金幣）');
  assert(details.representative.includes('附贈動作')||details.representative.includes('動作'));
  assert(details.concentration>0&&details.ritual>0);
  assert.deepStrictEqual(errors,[]);
  console.log(JSON.stringify({pass:true,spells:details.total,uniqueIds:details.ids,structuredComponents:details.full,materialFiltered:details.filtered,materialCostSpells:details.unmodified,concentration:details.concentration,ritual:details.ritual,legacy2014Unchanged:true}));
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

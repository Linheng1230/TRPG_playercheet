'use strict';const assert=require('assert');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.QA_URL||'http://127.0.0.1:18776/index.html',{waitUntil:'networkidle'});
 const data=await page.evaluate(()=>{
  S.ruleset='2024';syncRulesetUI();
  const names={A:'防護',C:'咒法',D:'預言',E:'惑控',V:'塑能',I:'幻術',N:'死靈',T:'變化'};
  const rows=SPELLS.slice(),ids=rows.map(r=>r.identifier),counts={},mismatch=[];
  for(const x of rows){counts[x.school]=(counts[x.school]||0)+1;if(SPELL_META[x.n]?.school!==names[x.school])mismatch.push(x.n)}
  const controls=[...document.querySelectorAll('.spell-filter-chip[data-sf-group="school"]')].map(b=>[b.dataset.sfValue,b.textContent.trim()]);
  const results={};const expected={};for(const [code,name] of Object.entries(names)){srefFilter.school.clear();srefFilter.school.add(code);results[code]=rows.filter(x=>spellRefMatches(x,'')).length;expected[code]=counts[code]||0}
  srefFilter.school.clear();srefFilter.school.add('A');srefFilter.school.add('N');
  const union=rows.filter(x=>spellRefMatches(x,'')).length;
  srefFilter.school.clear();srefFilter.school.add('A');srefFilter.lv.add('1');
  const intersection=rows.filter(x=>spellRefMatches(x,'')).length,expectedIntersection=rows.filter(x=>x.school==='A'&&x.lv===1).length;
  srefFilter.school.clear();srefFilter.lv.clear();renderSpellRefList();
  const schoolMarker=document.querySelector('[data-sref] .sr-sub')?.textContent||'';
  const tooltip=spellTipHTML(rows[0].n);
  const saved=serialize(),saveFields=Object.keys(saved);
  S.ruleset='2014';syncRulesetUI();const sample=SPELLS14.filter(x=>x.school==='死靈');
  srefFilter.school.add('N');const legacyFilterCount=sample.filter(x=>spellRefMatches(x,'')).length;
  srefFilter.school.clear();
  return {total:rows.length,ids:new Set(ids).size,counts,mismatch,controls,results,expected,union,intersection,expectedIntersection,schoolMarker,tooltip,legacyFilterCount,legacyNecromancy:sample.length,savedHasSchool:saveFields.includes('school'),stateRuleset:S.ruleset};
 });
 assert.equal(data.total,391);assert.equal(data.ids,391);
 assert.deepStrictEqual(data.counts,{V:64,A:53,N:31,I:29,T:66,E:42,D:33,C:73});
 assert.deepStrictEqual(data.mismatch,[]);assert.equal(data.controls.length,8);
 assert.deepStrictEqual(Object.fromEntries(data.controls),{A:'防護',C:'咒法',D:'預言',E:'惑控',V:'塑能',I:'幻術',N:'死靈',T:'變化'});
 assert.deepStrictEqual(data.results,data.expected);
 assert.equal(data.union,84);
 assert.equal(data.intersection,data.expectedIntersection);
 assert(data.schoolMarker.match(/防護|咒法|預言|惑控|塑能|幻術|死靈|變化/));
 assert(data.tooltip.match(/防護|咒法|預言|惑控|塑能|幻術|死靈|變化/));
 assert.equal(data.legacyFilterCount,data.legacyNecromancy);
 assert.equal(data.savedHasSchool,false,'School codes belong to spell catalog, not character JSON');
 assert.deepStrictEqual(errors,[]);
 console.log(JSON.stringify({pass:true,spells:data.total,schoolCounts:data.counts,filters:8,concurrentFilters:true,legacyNecromancy:data.legacyNecromancy,sourceIdentifiersPreserved:true}));
}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exit(1)});

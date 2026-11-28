'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const url=process.env.QA_URL||'http://127.0.0.1:18766/index.html';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(url+'?view=creator&wow-private=1',{waitUntil:'domcontentloaded'});
  if(await page.locator('#rulesetModal').evaluate(el=>el.classList.contains('open'))){
    await page.locator('#rulesetModal [data-ruleset="2024"]').click();
  }
  await page.waitForFunction(()=>window.WowDlcPublicMetadata?.classes?.length===13&&window.WowDlcPublicMetadata?.specializations?.length===40);
  await page.evaluate(()=>{
    const meta=window.WowDlcPublicMetadata;
    const classRows=meta.classes.map(c=>({id:c.id,coreClassId:c.coreClassId,minLevel:['death-knight','demon-hunter','evoker'].includes(c.id)?3:1,earlyStartGMOnly:['death-knight','demon-hunter'].includes(c.id)}));
    const records={},rows=[];
    for(const spec of meta.specializations){
      const id=('wowtest'+spec.id.replace(/[^a-z0-9]/gi,'')).slice(0,28).padEnd(12,'0');
      if(spec.sourceKind==='wow')records[id]={id,pack:'classes',name:'測試能力 '+spec.zh,description:'PRIVATE_TEST_DESCRIPTION '+spec.id,sourceSha:'a'.repeat(64),translationSha:'b'.repeat(64)};
      for(const level of [1,2,3])rows.push({classId:spec.classId,specializationId:spec.id,level,eligibility:'BASE_LEVEL_OK',subclassAvailable:level===3,grantItemIds:spec.sourceKind==='wow'&&level===3?[id]:[],overrideItemIds:[],spellTableItemIds:[],spellIds:[],resourceItemIds:[],choiceItemIds:[],coreProgressionInherited:true});
    }
    const provider={ok:true,campaignId:'campaign_test',revision:1,manifestSha:'m'.repeat(64),contentBundleSha:'c'.repeat(64),sourceSnapshotSha:'s'.repeat(64),
      manifest:{schemaVersion:1,dlcId:'wow-2026',classes:classRows,specializations:meta.specializations,progressionRows:rows,records:Object.fromEntries(Object.entries(records).map(([id,r])=>[id,{pack:r.pack,sourceSha:r.sourceSha,translationSha:r.translationSha}]))},
      contentBundle:{schemaVersion:1,records}};
    Object.defineProperty(window,'WowPrivateRulesProvider',{value:provider,configurable:true});
    window.dispatchEvent(new Event('wow-private-provider-ready'));
  });
  await page.waitForFunction(()=>document.querySelectorAll('#classGrid [data-wow-class-id]').length===13);
  const cards=await page.locator('#classGrid [data-wow-class-id]').evaluateAll(xs=>xs.map(x=>({id:x.dataset.wowClassId,disabled:x.disabled,text:x.innerText.replace(/\s+/g,' ').trim()})));
  assert.equal(cards.length,13);assert.equal(cards.filter(x=>x.disabled).length,3);
  assert.deepEqual(cards.filter(x=>x.disabled).map(x=>x.id).sort(),['death-knight','demon-hunter','evoker']);
  await page.locator('#classGrid [data-wow-class-id="monk"]').click();
  assert.match(await page.locator('.class-confirm-controls').innerText(),/武僧|Monk/);
  await page.locator('.class-confirm-controls button').click();
  const classState=await page.evaluate(()=>({core:S.cls?.n,wow:S.wowClassId,confirmed:S.classConfirmed}));
  assert.equal(classState.wow,'monk');assert.equal(classState.confirmed,true);
  await page.evaluate(()=>{S.level=3;S.classLevels={[S.cls.n]:3};renderLevel()});
  await page.waitForFunction(()=>document.querySelectorAll('#subGrid [data-sub]').length===3);
  const subs=await page.locator('#subGrid [data-sub]').evaluateAll(xs=>xs.map(x=>x.innerText.replace(/\s+/g,' ').trim()));
  assert.ok(subs.some(x=>/酒仙|Brewmaster/.test(x)));assert.ok(subs.some(x=>/織霧|Mistweaver/.test(x)));assert.ok(subs.some(x=>/御風|Windwalker/.test(x)));
  await page.locator('#subGrid [data-sub]').filter({hasText:'酒仙'}).click();
  await page.waitForFunction(()=>document.querySelector('#subComparisonPreview')?.textContent?.includes('PRIVATE_TEST_DESCRIPTION'));
  await page.locator('#confirmSubclass').click();
  const saved=await page.evaluate(()=>serialize());
  assert.equal(saved.dlcId,'wow-2026');assert.equal(saved.wowClassId,'monk');assert.equal(saved.wowSpecializationId,'monk.brewmaster');
  assert.deepEqual(Object.keys(saved.wowProvider).sort(),['campaignId','contentBundleSha','manifestSha','revision','sourceSnapshotSha']);
  const restore=await page.evaluate(save=>{resetState();const result=deserialize(save);return{result,state:{core:S.cls?.n,wowClassId:S.wowClassId,wowSpecializationId:S.wowSpecializationId,sub:S.sub,confirmed:S.subConfirmed}}},saved);
  assert.equal(restore.result.ok,true);assert.equal(restore.state.wowClassId,'monk');assert.equal(restore.state.wowSpecializationId,'monk.brewmaster');assert.equal(restore.state.confirmed,true);
  const denied=await page.evaluate(save=>{const bad=structuredClone(save);bad.wowProvider.manifestSha='tampered';return deserialize(bad)},saved);
  assert.equal(denied.ok,false);
  assert.deepEqual(errors,[]);
  await page.close();

  const normal=await browser.newPage({viewport:{width:390,height:844}});
  await normal.goto(url+'?view=creator',{waitUntil:'domcontentloaded'});
  await normal.waitForFunction(()=>document.querySelectorAll('#classGrid .pick-card').length>=12);
  assert.equal(await normal.locator('#classGrid [data-wow-class-id]').count(),0);
  assert.equal(await normal.locator('#classGrid [data-class-name]').count(),12);
  await normal.close();
  console.log(JSON.stringify({status:'WOW_PRIVATE_CREATOR_IDENTITY_UI_ROUNDTRIP_PASS',officialClasses:13,lockedMinLevel3:3,monkSpecializations:3,privatePreview:true,saveRoundtrip:true,tamperDenied:true,ordinary2024Unchanged:true,pageErrors:0}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});

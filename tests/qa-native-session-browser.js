const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const url=process.env.QA_BASE?process.env.QA_BASE+'/index.html':pathToFileURL(path.resolve(__dirname,'../index.html')).href;
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof renderFinal==='function'&&typeof classResources==='function');
  const initial=await page.evaluate(()=>{
   S.ruleset='2024';S.cls=CLASSES.find(c=>c.n==='德魯伊');S.level=4;S.classLevels={[S.cls.n]:4};
   ABILITIES.forEach(a=>S.base[a.k]=10);S.base.wis=16;
   document.getElementById('fName').value='原生跑團簡表測試';
   S.play.hp=null;S.play.hpMax=null;S.play.thp=2;S.play.res={ws:0};S.slotsUsed={};
   go(7);if(!saveCurrent(true))throw Error('cannot save initial character');
   return {id:S.id,hp:S.play.hp,max:S.play.hpMax};
  });
  await page.locator('#rulesetModal.open').waitFor({state:'visible',timeout:5000});
  await page.locator('#closeRuleset').click();
  const status=page.locator('#finalSheet .native-play-status');
  assert.equal(await status.isVisible(),true,'native tracker visible in original character sheet');
  assert.equal(await page.locator('a[href*="session.html"]').count(),0,'no standalone entry');
  assert.equal(await status.locator('[data-hp-quick]').count(),2,'one-tap HP controls');
  assert.equal(await page.locator('#finalJumpNav button[data-sheet-jump=status]').count(),1,'native section in jump nav');
  const ordering=await page.evaluate(()=>{
   const fs=document.querySelector('#finalSheet');
   return [...fs.children].map(el=>el.matches('.native-play-status')?'status':el.querySelector('.slot-track')?'slots':el.className||'unknown');
  });
  assert(ordering.indexOf('status')>0,'native section after header and abilities');
  assert(ordering.indexOf('slots')>ordering.indexOf('status'),'spell slot tracker beside status');
  await status.locator('[data-hp-quick="-1"]').click();
  assert.deepEqual(await page.evaluate(()=>[S.play.hp,S.play.thp]),[initial.hp,1],'damage absorbs temporary HP first');
  await page.locator('.native-play-status [data-hp-quick="-1"]').click();
  await page.locator('.native-play-status [data-hp-quick="-1"]').click();
  assert.deepEqual(await page.evaluate(()=>[S.play.hp,S.play.thp]),[initial.hp-1,0],'HP decreases after temp HP depleted');
  await page.locator('.native-play-status [data-hp-quick="1"]').click();
  assert.equal(await page.evaluate(()=>S.play.hp),initial.hp,'one tap heals 1');
  assert.match(await page.locator('#finalSheet .fs-statrow').innerText(),new RegExp(String(initial.hp)+'\\s*\\/\\s*'+String(initial.max)),'header shows current/max HP');
  await page.locator('#finalSheet [data-res="ws"][data-d="1"]').click();
  assert.equal(await page.evaluate(()=>S.play.res.ws),1,'class resource uses same state');
  await page.locator('#finalSheet [data-slot="l1"][data-d="1"]').click();
  assert.equal(await page.evaluate(()=>S.slotsUsed.l1),1,'spell slot uses same state');
  const note=page.locator('#playNotes');
  await note.fill('原生跑團備註');
  await page.waitForTimeout(1100);
  const persisted=await page.evaluate(id=>JSON.parse(localStorage.getItem('dnd5r:char:'+id)),initial.id);
  assert.equal(persisted.play.res.ws,1,'class resource saved');
  assert.equal(persisted.slotsUsed.l1,1,'spell slot saved');
  assert.equal(persisted.play.notes,'原生跑團備註','notes saved');
  await page.reload();
  await page.evaluate(()=>go(7));
  assert.equal(await page.evaluate(()=>S.play.hp),initial.hp,'reload restores HP');
  assert.equal(await page.evaluate(()=>S.play.res.ws),1,'reload restores resource');
  assert.equal(await page.evaluate(()=>S.slotsUsed.l1),1,'reload restores spell slot');
  await page.locator('#finalJumpNav [data-sheet-jump=status]').click();
  assert.equal(await page.locator('#finalJumpNav [data-sheet-jump=status]').getAttribute('aria-current'),'location');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no mobile horizontal overflow');
  const minHeight=await page.locator('.native-play-status [data-hp-quick="-1"]').evaluate(el=>el.getBoundingClientRect().height);
  assert(minHeight>=44,'mobile touch target >=44px');
  assert.deepEqual(errors,[],'no browser JS errors');
  console.log('PASS native session: original website, no standalone link, temp HP/HP, slot/class resources, notes, reload, mobile nav, 390px');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
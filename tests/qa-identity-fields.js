const {chromium}=require('playwright');
const assert=require('assert');
const fs=require('fs');
const path=require('path');

(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1792,height:1000}});
  const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(process.env.QA_URL||'http://127.0.0.1:18766/index.html',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.getElementById('rulesetModal')?.classList.remove('open'));

  const repaired=JSON.parse(fs.readFileSync('D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/soren-repair-input.json','utf8'));
  repaired._save.meta.align='混亂善良';
  repaired._save.meta.faith='摩拉丁';
  repaired._save.bio.allies='信仰：摩拉丁（Moradin）';

  const loaded=await page.evaluate(save=>{
    const r=deserialize(save); refreshAll(); update(); go(7); renderFinal();
    return {
      result:r,
      inputAlign:document.getElementById('fAlign').value,
      inputFaith:document.getElementById('fFaith').value,
      sideAlign:document.getElementById('shAlign').textContent,
      sideFaith:document.getElementById('shFaith').textContent,
      sideId:document.getElementById('shId').textContent,
      finalText:document.getElementById('finalSheet').innerText,
      allies:document.querySelector('[data-bio="allies"]')?.value||''
    };
  },repaired._save);

  assert.equal(loaded.inputAlign,'混沌善良');
  assert.equal(loaded.inputFaith,'摩拉丁');
  assert.equal(loaded.sideAlign,'混沌善良');
  assert.equal(loaded.sideFaith,'摩拉丁');
  assert(!loaded.sideId.includes('混沌善良'));
  assert(!loaded.sideId.includes('摩拉丁'));
  assert(loaded.finalText.includes('陣營'));
  assert(loaded.finalText.includes('混沌善良'));
  assert(loaded.finalText.includes('信仰／神祇'));
  assert(loaded.finalText.includes('摩拉丁'));
  assert.equal(loaded.allies,'');
  assert(loaded.result.warn.some(x=>x.includes('信仰資料移至')));

  const dlP=page.waitForEvent('download');
  await page.evaluate(()=>exportJSON());
  const dl=await dlP;
  const out=path.resolve('tmp/qa-identity.json');fs.mkdirSync(path.dirname(out),{recursive:true});await dl.saveAs(out);
  const json=JSON.parse(fs.readFileSync(out,'utf8'));
  assert.equal(json['陣營'],'混沌善良');
  assert.equal(json['信仰'],'摩拉丁');
  assert.equal(json['角色設定']['盟友與組織'],'');
  assert.deepEqual(errors,[]);

  await page.screenshot({path:'D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/identity-final.png',fullPage:false});
  console.log(JSON.stringify({align:loaded.sideAlign,faith:loaded.sideFaith,alliesMigrated:loaded.allies==='',jsonAlign:json['陣營'],jsonFaith:json['信仰']}));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
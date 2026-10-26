const {chromium}=require('playwright');
const assert=require('assert');
const fs=require('fs');
const path=require('path');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.QA_URL||'http://127.0.0.1:18766/index.html',{waitUntil:'networkidle'});
 await page.evaluate(()=>document.getElementById('rulesetModal')?.classList.remove('open'));

 const setup=async(name,level=1)=>{
  await page.evaluate(({name,level})=>{
   S.ruleset='2024';syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n===name);S.level=level;S.classLevels={[name]:level};S.sub=null;
   S.bg=BACKGROUNDS_2024.find(x=>x.n==='罪犯');S.sp=SPECIES_2024.find(x=>x.n==='人類');
   S.languageChoices={};document.getElementById('fName').value='語言測試';go(4);update();renderLanguages();
  },{name,level});
 };

 await setup('戰士',1);
 let state=await page.evaluate(()=>({slots:document.querySelectorAll('[data-language]').length,summary:languageSummary(),bg:document.getElementById('languageSources').innerText,nextDisabled:document.getElementById('next4').disabled}));
 assert.equal(state.slots,2);assert.equal(state.summary.text,'通用語');assert.equal(state.summary.missing.length,2);assert(state.bg.includes('2024 背景不提供額外語言'));assert.equal(state.nextDisabled,true);
 await page.selectOption('[data-language="base1"]','矮人語');
 await page.selectOption('[data-language="base2"]','精靈語');
 state=await page.evaluate(()=>({summary:languageSummary(),side:document.getElementById('shProfs').innerText,nextDisabled:document.getElementById('next4').disabled}));
 assert.deepEqual(state.summary.languages,['通用語','矮人語','精靈語']);assert(state.side.includes('語言:通用語、矮人語、精靈語'));assert.equal(state.nextDisabled,false);
 await page.evaluate(()=>go(7));
 const finalText=await page.locator('#finalSheet').innerText();
 assert(finalText.includes('語言'));assert(finalText.includes('通用語、矮人語、精靈語'));
 const dlPromise=page.waitForEvent('download');await page.evaluate(()=>exportJSON());const dl=await dlPromise;const jsonPath=path.resolve('tmp/qa-language-export.json');fs.mkdirSync(path.dirname(jsonPath),{recursive:true});await dl.saveAs(jsonPath);const exported=JSON.parse(fs.readFileSync(jsonPath,'utf8'));assert.deepEqual(exported.語言,['通用語','矮人語','精靈語']);assert.deepEqual(exported._save.languageChoices,{base1:'矮人語',base2:'精靈語'});

 await page.evaluate(()=>{S.ruleset='2024';syncRulesetUI();S.cls=CLASSES.find(x=>x.n==='遊蕩者');S.level=3;S.classLevels={遊蕩者:1};S.sub=3;S.bg=BACKGROUNDS_2024.find(x=>x.n==='罪犯');S.sp=SPECIES_2024.find(x=>x.n==='人類');S.languageChoices={};document.getElementById('fName').value='等級保護測試';renderLanguages();update()});
 state=await page.evaluate(()=>({level:S.level,classLevels:{...S.classLevels},slots:languageSummary().slots.map(x=>x.k)}));
 assert.equal(state.level,3);assert.deepEqual(state.classLevels,{遊蕩者:3});assert.deepEqual(state.slots,['base1','base2','rogue1']);

 await setup('遊蕩者',1);
 state=await page.evaluate(()=>({slots:languageSummary().slots.map(x=>x.k),text:languageSummary().text}));
 assert.deepEqual(state.slots,['base1','base2','rogue1']);assert(state.text.includes('盜賊黑話'));
 await page.selectOption('[data-language="base1"]','矮人語');
 await page.selectOption('[data-language="base2"]','精靈語');
 await page.selectOption('[data-language="rogue1"]','天界語');
 state=await page.evaluate(()=>languageSummary());
 assert.deepEqual(state.languages,['通用語','盜賊黑話','矮人語','精靈語','天界語']);

 await setup('德魯伊',1);
 state=await page.evaluate(()=>languageSummary());
 assert(state.languages.includes('德魯伊語'));assert.equal(state.slots.length,2);

 await setup('遊俠',2);
 state=await page.evaluate(()=>({keys:languageSummary().slots.map(x=>x.k),rare:[...document.querySelector('[data-language="ranger1"]').options].map(x=>x.value)}));
 assert.deepEqual(state.keys,['base1','base2','ranger1','ranger2']);assert(state.rare.includes('地底通用語'));

 await page.evaluate(()=>{S.ruleset='2014';syncRulesetUI();S.cls=CLASSES.find(x=>x.n==='戰士');S.level=1;S.classLevels={戰士:1};S.bg=BACKGROUNDS_2014.find(x=>x.n==='侍僧');S.sp=SPECIES_2014.find(x=>x.n==='人類');S.bgChoices14={};S.languageChoices={};document.getElementById('fName').value='2014語言測試';go(4);update();renderLanguages()});
 state=await page.evaluate(()=>({keys:languageSummary().slots.map(x=>x.k),missing:languageSummary().missing.length}));
 assert.deepEqual(state.keys,['race1','lang1','lang2']);assert.equal(state.missing,3);
 await page.selectOption('[data-language="race1"]','矮人語');await page.selectOption('[data-language="lang1"]','精靈語');await page.selectOption('[data-language="lang2"]','龍語');
 state=await page.evaluate(()=>({summary:languageSummary(),bg:{...S.bgChoices14}}));assert.deepEqual(state.summary.languages,['通用語','矮人語','精靈語','龍語']);assert.deepEqual(state.bg,{lang1:'精靈語',lang2:'龍語'});

 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({fighter:'PASS',rogue:'PASS',druid:'PASS',ranger:'PASS',legacy2014:'PASS'}));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
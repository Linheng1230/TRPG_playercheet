"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof go==="function"&&typeof languageSummary==="function"&&typeof deserialize==="function");
  await page.waitForTimeout(350);
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  const init=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");S.level=1;S.classLevels={"戰士":1};
   S.languageChoices={};S.languageLocks={};S.bgChoices14={};
   S.base={str:15,dex:13,con:14,int:10,wis:12,cha:8};
   document.getElementById("fName").value="語言確認鎖定測試";go(4);update();saveCurrent(true);
   return S.id;
  });
  assert.match(await page.locator(".step-panel[data-step='4'] .step-title").innerText(),/詳情／語言/,"details/languages heading");
  assert.equal(await page.locator("#languagePanel .t").innerText(),"詳情 · 語言");
  assert.equal(await page.locator("#languageChoices select").count(),2,"2024 default languages");
  assert.equal(await page.locator("#confirmLanguages").isDisabled(),true,"confirmation disabled before all choices");
  assert.equal(await page.locator("#next4").isDisabled(),true,"cannot advance before confirmation");
  await page.locator('[data-language="base1"]').selectOption("龍語");
  assert.equal(await page.locator("#confirmLanguages").isDisabled(),true,"still missing one language");
  await page.locator('[data-language="base2"]').selectOption("矮人語");
  assert.equal(await page.locator("#confirmLanguages").isEnabled(),true);
  assert.equal(await page.locator("#next4").isDisabled(),true,"complete selection still requires explicit confirm");
  page.once("dialog",d=>d.dismiss());
  await page.locator("#confirmLanguages").click();
  assert.equal(await page.evaluate(()=>Object.keys(S.languageLocks).length),0,"cancel keeps editable");
  assert.equal(await page.locator('[data-language="base1"]').isEnabled(),true);
  page.once("dialog",d=>d.accept());
  await page.locator("#confirmLanguages").click();
  assert.equal(await page.evaluate(()=>languageSummary().confirmed),true,"confirmed");
  assert.equal(await page.locator("#next4").isEnabled(),true,"advance unlocked");
  assert.match(await page.locator("#languageConfirmed").innerText(),/已全部確認並鎖定/);
  assert.equal(await page.locator('[data-language="base1"]').isDisabled(),true);
  assert.equal(await page.locator('[data-language="base2"]').isDisabled(),true);
  const official=await page.evaluate(id=>JSON.parse(localStorage.getItem("dnd5r:char:"+id)),init);
  assert.equal(official.languageChoices.base1,"龍語");assert.equal(official.languageChoices.base2,"矮人語");
  assert.equal(Object.keys(official.languageLocks).length,2,"saved authoritative language locks");
  await page.evaluate(()=>{
   const s=document.querySelector('[data-language="base1"]');s.disabled=false;s.value="精靈語";s.dispatchEvent(new Event("change",{bubbles:true}));
  });
  assert.equal(await page.evaluate(()=>S.languageChoices.base1),"龍語","programmatic changes blocked");
  await page.reload();await page.waitForFunction(()=>typeof languageSummary==="function");await page.waitForTimeout(350);
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>go(4));
  assert.equal(await page.evaluate(()=>languageSummary().confirmed),true,"lock survives reload");
  assert.equal(await page.locator('[data-language="base1"]').isDisabled(),true);

  // Ranger gains two new languages at level 2: earlier confirmed base selections remain locked.
  await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=1;S.classLevels={"遊俠":1};
   S.languageChoices={};S.languageLocks={};update();go(4);
  });
  await page.locator('[data-language="base1"]').selectOption("龍語");
  await page.locator('[data-language="base2"]').selectOption("矮人語");
  page.once("dialog",d=>d.accept());await page.locator("#confirmLanguages").click();
  await page.evaluate(()=>{S.level=2;S.classLevels={"遊俠":2};update()});
  assert.equal(await page.locator("#languageChoices select").count(),4,"new level-up language slots");
  assert.equal(await page.locator('[data-language="base1"]').isDisabled(),true,"previous selection stays locked");
  assert.equal(await page.locator('[data-language="ranger1"]').isEnabled(),true,"new ranger choice selectable");
  assert.equal(await page.locator("#next4").isDisabled(),true,"new choices require additional confirmation");
  await page.locator('[data-language="ranger1"]').selectOption("深淵語");
  await page.locator('[data-language="ranger2"]').selectOption("天界語");
  page.once("dialog",d=>d.accept());await page.locator("#confirmLanguages").click();
  assert.equal(await page.evaluate(()=>languageSummary().confirmed),true);
  assert.equal(await page.locator('[data-language="ranger1"]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>S.languageChoices.base1),"龍語");
  assert.equal(await page.evaluate(()=>Object.keys(S.languageLocks).length),4);

  // 2014 background slots are saved in bgChoices14, not in 2024 languageChoices.
  const oldVersion=await page.evaluate(()=>{
   S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");
   S.level=1;S.classLevels={"戰士":1};S.sp=SPECIES_2014.find(s=>s.n==="人類");
   S.bg=BACKGROUNDS_2014.find(b=>b.n==="侍僧");S.languageLocks={};S.languageChoices={};S.bgChoices14={};
   update();go(4);
   return languageSummary().slots.map(x=>({k:x.k,store:x.store||"character"}));
  });
  assert(oldVersion.some(s=>s.store==="bg14"),"2014 background special slots present");
  assert(oldVersion.some(s=>s.k==="race1"),"2014 human language slot present");
  await page.locator('[data-language="race1"]').selectOption("矮人語");
  await page.locator('[data-language="lang1"]').selectOption("精靈語");
  await page.locator('[data-language="lang2"]').selectOption("巨人語");
  page.once("dialog",d=>d.accept());await page.locator("#confirmLanguages").click();
  const legacyTest=await page.evaluate(()=>{
   const current=serialize();const actual={locks:current.languageLocks,background:current.bgChoices14,base:current.languageChoices};
   delete current.languageLocks;
   const result=deserialize(current);update();go(4);
   return {before:actual,valid:result.ok,locked:languageSummary().confirmed,choices:languageSummary().languages};
  });
  assert.equal(Object.keys(legacyTest.before.locks).length,3,"2014 background and race locks persisted");
  assert.equal(legacyTest.before.background.lang1,"精靈語");
  assert.equal(legacyTest.before.background.lang2,"巨人語");
  assert.equal(legacyTest.valid,true);
  assert.equal(legacyTest.locked,false,"legacy save not silently locked");
  assert(legacyTest.choices.includes("精靈語"),"legacy language preserved");
  assert.equal(await page.locator("#confirmLanguages").isEnabled(),true,"old save user can confirm");
  for(const width of [360,390,480,1440]){
   await page.setViewportSize({width,height:width>700?900:844});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"no horizontal overflow "+width);
   if(width<700)assert(await page.locator("#languageConfirmBar button").evaluate(el=>el.getBoundingClientRect().height>=44),"touch target >=44px");
  }
  assert.deepEqual(errors,[],"no browser JS errors");
  console.log("PASS language confirm: 2024 2 slots / double-check cancel+accept / locked persistence / future ranger slots / 2014 background choices / legacy save / mobile 360-1440");
 }finally{await browser.close()}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});

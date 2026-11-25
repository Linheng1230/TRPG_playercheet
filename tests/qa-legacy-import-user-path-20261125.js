"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   page.on("dialog",async d=>{await d.accept()});
   await page.goto(process.env.QA_URL||"http://127.0.0.1:18779/index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>document.querySelector("#btnRoster")&&typeof handleImport==="function");
   await page.locator("#rulesetModal.open").waitFor({state:"visible",timeout:10000});
   await page.locator("#closeRuleset").click();
   await page.locator("#rulesetModal.open").waitFor({state:"hidden"});
   const state={v:7,ruleset:"2024",cls:"野蠻人",bg:"士兵",sp:"獸人",level:4,
     method:"custom",base:{str:18,dex:14,con:18,int:9,wis:12,cha:11},
     bonusMode:"21",bonus:{b2:"dex",b1:"con",c1:"",c2:"",c3:""},
     asi:{"4":{t:"feat",feat:"衝鋒者",a1:"",a2:""}},
     gear:{customLanguages:["龍語","通用手語"]},meta:{name:"匯入自動化測試"}};
   const readable={背景:"士兵",工具熟練:"骰子組合",屬性:{力量:{專長加值:0},敏捷:{專長加值:0}},_save:state};
   await page.locator("#btnRoster").click();
   assert.equal(await page.locator("#rosterModal.open").count(),1,"roster visible");
   const filechooserPromise=page.waitForEvent("filechooser");
   await page.locator("#actImport").click();
   const filechooser=await filechooserPromise;
   await filechooser.setFiles({name:"qa-legacy-character.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(readable),"utf8")});
   await page.waitForFunction(()=>typeof S!=="undefined"&&!!S.bgChoice2024?.tool&&document.querySelector("#rosterModal:not(.open)"));
   const imported=await page.evaluate(()=>({
      tool:S.bgChoice2024.tool,
      languages:{...S.languageChoices},
      languageOptions:[...document.querySelectorAll("#languageChoices select")].map(x=>x.value),
      ability:S.asi[4]?.featAb||null,
      level:S.level,
      score:{str:finalScore("str"),dex:finalScore("dex")},
      stored:!!localStorage.getItem(SK.char(S.id))
   }));
   assert.equal(imported.tool,"骰子組");
   assert.deepEqual({...imported.languages},{base1:"龍語",base2:"通用手語"});
   assert.deepEqual(imported.languageOptions,["龍語","通用手語"]);
   assert.equal(imported.ability,null,"no guessed strength or dexterity");
   assert.equal(imported.level,4);
   assert.equal(imported.stored,true);
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof languageSummary==="function");
   const after=await page.evaluate(()=>({tool:S.bgChoice2024.tool,languageChoices:{...S.languageChoices},featAb:S.asi[4]?.featAb||null}));
   assert.equal(after.tool,"骰子組");
   assert.deepEqual({...after.languageChoices},{base1:"龍語",base2:"通用手語"});
   assert.equal(after.featAb,null);
   assert.deepEqual(errors,[],"no pageerror");
   console.log("PASS true UI import: roster -> file chooser -> JSON import -> user-visible selected options -> storage -> reload");
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

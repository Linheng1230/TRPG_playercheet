"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18779/index.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof handleImport==="function"&&typeof deserialize==="function");
  const value=await page.evaluate(()=>{
   const payload={v:7,ruleset:"2024",cls:"野蠻人",bg:"士兵",sp:"獸人",level:4,method:"custom",
     base:{str:18,dex:14,con:18,int:9,wis:12,cha:11},bonus:{b2:"dex",b1:"con"},
     gear:{customLanguages:["龍語","通用手語"]}};
   handleImport(JSON.stringify({背景:"士兵",工具熟練:"骰子組合",_save:payload}));
   renderLanguages();
   const snapshot={tool:S.bgChoice2024.tool,languageChoices:{...S.languageChoices},
     text:languageSummary().languages,missing:languageSummary().missing.length,
     confirmation:languageSummary().confirmed,
     options:[...document.querySelectorAll("#languageChoices select")].map(s=>s.value)};
   const saved=serialize();
   deserialize(saved);
   snapshot.roundtrip={...S.languageChoices};
   return snapshot;
  });
  assert.equal(value.tool,"骰子組");
  assert.deepEqual(value.options,["龍語","通用手語"]);
  assert.equal(value.missing,0);
  assert.equal(value.confirmation,false);
  assert.deepEqual({...value.roundtrip},{base1:"龍語",base2:"通用手語"});
  assert.deepEqual(errors,[]);
  console.log("PASS browser legacy JSON -> state -> language selections -> serialize -> deserialize");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

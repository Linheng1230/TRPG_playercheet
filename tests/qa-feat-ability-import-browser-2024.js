"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18779/index.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof handleImport==="function"&&typeof featAbilityMap==="function");
  await page.evaluate(()=>window.alert=()=>{});
  const value=await page.evaluate(()=>{
   const base=()=>({v:7,ruleset:"2024",cls:"野蠻人",bg:"士兵",sp:"獸人",level:4,method:"custom",
     base:{str:18,dex:14,con:18,int:9,wis:12,cha:11},bonus:{b2:"dex",b1:"con"},
     asi:{"4":{t:"feat",feat:"衝鋒者"}},gear:{customLanguages:["龍語","通用手語"]}});
   const read=(p,points)=>({背景:"士兵",工具熟練:"骰子組合",屬性:{力量:{專長加值:points.str||0},敏捷:{專長加值:points.dex||0},體質:{專長加值:0},智力:{專長加值:0},感知:{專長加值:0},魅力:{專長加值:0}},_save:p});
   const results=[];
   for(const points of [{str:0,dex:0},{str:1,dex:0},{str:0,dex:1}]){
     const p=base();handleImport(JSON.stringify(read(p,points)));
     const item={featAb:S.asi[4]?.featAb||null,points:featAbilityMap(),scoreStr:finalScore("str"),scoreDex:finalScore("dex")};
     const saved=serialize();deserialize(saved);
     item.roundtrip=S.asi[4]?.featAb||null;
     results.push(item);
   }
   return results;
  });
  assert.equal(value[0].featAb,null);
  assert.equal(value[0].points.str,0);
  assert.equal(value[0].points.dex,0);
  assert.equal(value[1].featAb,"str");
  assert.equal(value[1].points.str,1);
  assert.equal(value[1].scoreStr,19);
  assert.equal(value[1].roundtrip,"str");
  assert.equal(value[2].featAb,"dex");
  assert.equal(value[2].points.dex,1);
  assert.equal(value[2].scoreDex,17);
  assert.equal(value[2].roundtrip,"dex");
  assert.deepEqual(errors,[]);
  console.log("PASS browser feat import: absent choice stays open; explicit STR/DEX +1; score and roundtrip");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

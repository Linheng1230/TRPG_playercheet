"use strict";
const assert=require("assert"),{chromium}=require("playwright");
const url=process.env.QA_URL||"http://127.0.0.1:18948/index.html";
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 try{
 for(const width of [390,1440]){
  const p=await b.newPage({viewport:{width,height:844}}),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  await p.goto(url,{waitUntil:"networkidle"});
  await p.evaluate(()=>{document.querySelector("#rulesetModal")?.classList.remove("open");S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="法師");S.level=4;S.classLevels={"法師":4};S.asi={};S.base={str:10,dex:14,con:13,int:15,wis:12,cha:15};S.sub=0;go(5)});
  assert(await p.locator('[data-feat-browse="4"]').count(),"reverse shortcut");
  await p.locator('[data-feat-browse="4"]').click();
  assert(await p.locator('#refTabs [data-r="gfeat"].active').count(),"opened feat reference tab");
  assert(await p.locator('[data-feat-import-slot]').count()>=1,"target slot selection");
  await p.locator('[data-gfeat-id="actor"] [data-feat-import]').click();
  assert.equal(await p.evaluate(()=>S.step),5,"redirected to level page");
  assert.deepStrictEqual(await p.evaluate(()=>({type:S.asi[4]?.t,feat:S.asi[4]?.feat})),{type:"feat",feat:"演員"});
  assert(await p.locator('[data-asilv="4"] [data-role=feat]').inputValue()==="演員");
  let save=await p.evaluate(()=>JSON.parse(JSON.stringify(serialize())));
  await p.evaluate(x=>{deserialize(x);renderLevel()},save);
  assert.equal(await p.evaluate(()=>S.asi[4]?.feat),"演員","JSON persistence");
  await p.locator('[data-feat-browse="4"]').click();
  p.once("dialog",d=>d.dismiss());
  await p.locator('[data-gfeat-id="chef"] [data-feat-import]').click();
  assert.equal(await p.evaluate(()=>S.asi[4]?.feat),"演員","cancel replacement unchanged");
  p.once("dialog",d=>d.accept());
  await p.locator('[data-gfeat-id="chef"] [data-feat-import]').click();
  assert.equal(await p.evaluate(()=>S.asi[4]?.feat),"廚師","accept replacement");
  await p.evaluate(()=>{S.asi={};S.base.cha=8;refTab="gfeat";gfeatRefFilter.category="all";go(8);document.querySelector('#refTabs [data-r="gfeat"]').classList.add("active")});
  await p.locator('[data-gfeat-id="actor"] [data-feat-import]').click();
  assert.equal(await p.evaluate(()=>S.asi[4]),undefined,"13+ prerequisite rejects");
  await p.locator('[data-gf-category="origin"]').click();
  assert.equal(await p.locator('[data-feat-category="origin"] [data-feat-import]').count(),0,"origin feats cannot import via level ASI");
  await p.evaluate(()=>{S.level=19;S.classLevels={"法師":19};S.asi={};go(5)});
  await p.locator("[data-boon-browse]").click();
  assert.equal(await p.evaluate(()=>gfeatRefFilter.category),"boon","epic boon reverse shortcut");
  assert(await p.locator('[data-feat-category="boon"] [data-feat-import]').count()>0,"19th epic boon available");
  await p.locator('[data-feat-category="boon"] [data-feat-import]').first().click();
  assert.equal(await p.evaluate(()=>S.step),5,"boon redirect");
  assert(await p.evaluate(()=>!!S.boon),"boon persisted into canonical field");
  const overflowing=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(overflowing<=1,"no horizontal overflow "+width+": "+overflowing);
  assert.deepStrictEqual(errors,[],"browser page errors");
  console.log("PASS feat-import "+width+" 2024 lookup→ASI+shortcut+replacement+prereq+origin+boon+save");
  await p.close();
 }
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});

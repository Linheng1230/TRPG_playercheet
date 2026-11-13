"use strict";
// PHB2024 resource summaries are a UI projection; counter mechanics remain in S.play.
const assert=require("assert");
const path=require("path");
const {chromium}=require("playwright");
const SITE=process.env.QA_URL||"http://127.0.0.1:19753/index.html";
const cases=[
 ["2024","野蠻人","rage",[[1,2],[3,3],[6,4],[12,5],[17,6]]],
 ["2024","牧師","cd",[[1,0],[2,2],[6,3],[18,4]]],
 ["2024","德魯伊","ws",[[1,0],[2,2],[6,3],[17,4]]],
 ["2024","戰士","sw",[[1,2],[4,3],[10,4]]],
 ["2024","聖武士","cd",[[1,0],[3,2],[7,2],[11,3]]],
 ["2024","遊俠","hm",[[1,2],[5,3],[9,4],[13,5],[17,6]]],
 ["2024","吟遊詩人","bi",[[1,1],[5,1],[18,1]]],
 ["2024","武僧","ki",[[1,0],[2,2],[15,15]]],
 ["2024","術士","is",[[1,2],[7,2]]],
 ["2024","術士","sp",[[1,0],[2,2],[5,5]]],
 ["2024","法師","ar",[[1,1]]],
 ["2014","牧師","cd",[[1,0],[2,1],[6,2],[18,3]]],
 ["2014","德魯伊","ws",[[1,0],[2,2],[6,2],[17,2]]],
 ["2014","戰士","sw",[[1,1],[4,1],[10,1]]],
 ["2014","聖武士","cd",[[1,0],[3,1],[11,1]]],
 ["2014","術士","is",[[1,0],[7,0]]],
 ["2014","遊俠","hm",[[1,0],[13,0]]],
 ["2014","戰士","ai",[[1,0],[2,1],[17,2]]],
 ["2014","戰士","ind",[[1,0],[9,1],[13,2],[17,3]]],
 ["2014","武僧","ki",[[1,0],[2,2],[15,15]]],
 ["2014","法師","ar",[[1,1]]],
];
const expected2024=["野蠻人","吟遊詩人","牧師","德魯伊","戰士","武僧","聖武士","遊俠","術士","法師"];
const expected2014=["野蠻人","吟遊詩人","牧師","德魯伊","戰士","武僧","聖武士","術士","法師"];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
   const errors=[];
   page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(SITE+"?resource-hints-qa="+Date.now()+"-"+width,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   for(const [ruleset,name,key,checks] of cases){
    for(const [level,want] of checks){
     const r=await page.evaluate(({ruleset,name,level})=>{
      S.ruleset=ruleset;S.cls=CLASSES.find(x=>x.n===name);S.level=level;
      S.base={str:12,dex:12,con:12,int:12,wis:14,cha:10};
      S.sp={n:"半身人"};
      return classResources();
     },{ruleset,name,level});
     const hit=r.find(x=>x.k===key);
     assert.strictEqual(hit?.max||0,want,ruleset+" "+name+" "+key+" lv"+level);
     assert(!r.some(x=>x.k==="luck"),"halfling Lucky must not be limited");
     for(const resource of r){
      assert(resource.effect&&resource.recovery,ruleset+" "+name+" "+resource.k+" missing summary");
      assert(resource.effect.length<=90&&resource.recovery.length<=90,ruleset+" "+name+" summary too long");
     }
    }
   }
   for(const rs of ["2014","2024"]){
    for(const name of rs==="2024"?expected2024:expected2014){
     const x=await page.evaluate(({rs,name})=>{
      S.ruleset=rs;S.cls=CLASSES.find(c=>c.n===name);S.level=20;S.base={str:12,dex:12,con:12,int:12,wis:14,cha:16};
      return classResources();
     },{rs,name});
     assert(x.length>0,rs+" "+name+" should have resource summaries");
     assert(x.every(r=>r.effect.includes("。")&&r.recovery.includes("。")),rs+" "+name+" punctuated hints");
    }
   }
   for(const rs of ["2024","2014"]){
    const state=await page.evaluate(rs=>{
     resetAll();S.sp=null;S.ruleset=rs;syncRulesetUI();
     S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;
     S.classLevels={"德魯伊":4};
     S.play.res={};S.play.resMax={};S.play.custom=[];
     S.base={str:12,dex:12,con:14,int:10,wis:16,cha:10};
     renderFinal();go(7);
     return {keys:classResources().map(x=>x.k)};
    },rs);
    assert(state.keys.includes("ws"),rs+" druid shape resource");
    const row=page.locator('[data-res-help="ws"]');
    assert.strictEqual(await row.count(),1,rs+" resource help in DOM");
    assert((await row.innerText()).includes("效果："));
    assert((await row.innerText()).includes("恢復："));
    const hintMetrics=await row.evaluate(el=>({
     size:parseFloat(getComputedStyle(el).fontSize),
     lines:el.getBoundingClientRect().height/getComputedStyle(el).lineHeight.replace("px",""),
     visible:el.getBoundingClientRect().width>0
    }));
    assert(hintMetrics.size>=14&&hintMetrics.visible,rs+" legibility "+JSON.stringify(hintMetrics));
    await page.locator('[data-res="ws"][data-d="1"]').click();
    assert.strictEqual((await page.locator('[data-res-help="ws"]').count()),1,"hint persists after decrement");
    assert.strictEqual((await page.locator('[data-res="ws"]').first().locator("xpath=..").locator(".rv").innerText()).trim(),"1");
    await page.locator('[data-rmax="ws"]').fill("5");
    await page.locator('[data-rmax="ws"]').press("Tab");
    const save=await page.evaluate(()=>serialize());
    assert.strictEqual(save.play.res.ws,1,rs+" used preserved");
    assert.strictEqual(save.play.resMax.ws,5,rs+" max preserved");
    const rt=await page.evaluate(save=>{
      const ok=deserialize(save).ok;renderFinal();return {ok,used:S.play.res.ws,max:S.play.resMax.ws,help:document.querySelector('[data-res-help="ws"]')?.innerText||""};
    },save);
    assert(rt.ok&&rt.used===1&&rt.max===5&&rt.help.includes("恢復："),rs+" roundtrip");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
    assert(overflow<=3,rs+" "+width+" horizontal overflow "+overflow);
    const out=path.join("D:/Tools/zizi-ai-runtime","trpg-resource-hints-"+rs+"-"+width+".png");
    await page.locator("#finalSheet").screenshot({path:out,timeout:30000});
   }
   assert.deepStrictEqual(errors,[],"JS page errors");
   console.log("PASS "+width+"px: 2014/2024 12 class coverage, count thresholds, hints, click +/- max, JSON roundtrip, no overflow");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exit(1)});

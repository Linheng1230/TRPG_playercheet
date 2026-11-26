"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19959/index.html";
const OUT=process.env.QA_CLASS_OUT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/class-limited-use-matrix-20261118";
const mandatory=[
 ["野蠻人","眾神戰士",3,"狂熱者之道"],["野蠻人","狂熱威儀",10,"狂熱者之道"],["野蠻人","超越死亡之怒",14,"狂熱者之道"],
 ["聖武士","聖光揮擊",2],["聖武士","忠誠坐騎",5],["牧師","神聖介入",10],
 ["德魯伊","荒野復甦",5],["武僧","非凡代謝",2],["遊俠","不倦",10],
 ["遊俠","自然面紗",14],["術士","術法恢復",5],["野蠻人","持久狂暴",15],
 ["遊蕩者","命運一擊",20],["邪術師","魔法機巧",2],["邪術師","聯絡宗主",9],
 ["邪術師","秘傳奧法",11],["邪術師","秘傳奧法",13],["邪術師","秘傳奧法",15],["邪術師","秘傳奧法",17],
 ["法師","招牌法術",20],
 ["吟遊詩人","蠱惑魔法",3,"魅音學院"],["吟遊詩人","威嚴斗篷",6,"魅音學院"],
 ["吟遊詩人","不可摧折的威嚴",14,"魅音學院"],
 ["牧師","護衛閃光",3,"光明領域"],["牧師","戰爭祭司",3,"戰爭領域"],
 ["戰士","戰鬥優勢",3,"戰鬥大師"],["戰士","靈能力量",3,"靈能武士"],
 ["遊蕩者","靈能力量",3,"靈魂之刃"],["遊俠","妖精增援",11,"精類浪遊者"],
 ["遊俠","迷霧漫遊者",15,"精類浪遊者"],["術士","龍翼",14,"龍族血脈"],
 ["邪術師","妖精步伐",3,"至高妖精宗主"],["邪術師","治療之光",3,"天界宗主"],
 ["法師","幻影造物",6,"幻術師"],["法師","天眼通",10,"預言師"],
 ["聖武士","神聖光環",20,"奉獻誓言"],["聖武士","現世傳說",20,"榮耀誓言"],
 ["聖武士","遠古勇士",20,"古賢誓言"],["聖武士","復仇天使",20,"復仇誓言"]
];
function setup(cfg){
 resetAll();
 S.ruleset=cfg.edition;syncRulesetUI();
 S.cls=CLASSES.find(c=>c.n===cfg.class);
 S.level=cfg.level;S.classLevels={[cfg.class]:cfg.level};
 S.sub=cfg.sub<0?null:cfg.sub;S.sp=(cfg.edition==="2024"?SPECIES_2024:SPECIES_2014).find(x=>x.n==="人類");
 S.spChoices={};
 S.base={str:16,dex:14,con:14,int:12,wis:18,cha:18};
 S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"QA_CLASS_"+cfg.class+"_"+cfg.level};
 S.slotsUsed={l1:1,l2:0};
 document.getElementById("fName").value="QA_CLASS_"+cfg.class+"_"+cfg.level;
 renderFinal();go(11);renderPlayStatusTab();
 const p=PROG_2024[cfg.class],meta=PLAY_CLASS_LIMITED_USE_META_2024;
 const subName=p.subs?.[cfg.sub]?.n||"";
 const sourceGrants=m=>cfg.edition==="2024"&&m[0]===cfg.class&&m[3]<=cfg.level&&(!m[1]||m[1]===subName)&&
  String(m[1]?p.subs?.[cfg.sub]?.f?.[m[3]]||"":p.f?.[m[3]]||"").split("、")
  .some(v=>v.trim().split(/[（(]/)[0].trim()===m[2]);
 const expected=meta.filter(sourceGrants);
 const rows=classResources().filter(x=>String(x.k).startsWith("class-use:2024:"));
 const counters=[...document.querySelectorAll('#psResources [data-ps-resource^="class-use:2024:"]')].map(el=>el.dataset.psResource);
 return {
  expected:expected.map(m=>({feature:m[2],at:m[3],key:"class-use:2024:"+[cfg.class,m[1],m[4]].map(encodeURIComponent).join("|"),cap:m[5],rest:m[6],label:m[7],hint:m[8]})),
  actual:rows.map(x=>({key:x.k,max:x.max,rest:x.rest,ruleLength:x.rule?.length||0,effect:x.effect,recovery:x.recovery})),
  counters,spells:S.slotsUsed.l1,
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  name:cfg.class,level:cfg.level,subName,
  scheme:S.ruleset
 };
}
async function clickScenario(browser,cfg,report){
 const width=cfg.width||390;
 const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>d.accept());
 await page.goto(URL+"?class-free-click="+Date.now()+"-"+encodeURIComponent(cfg.class),{waitUntil:"networkidle",timeout:45000});
 await page.waitForFunction(()=>typeof window.ClassResourceMetrics5R!=="undefined",null,{timeout:15000});
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
 const snap=await page.evaluate(setup,{edition:"2024",class:cfg.class,level:cfg.level,sub:cfg.sub??null});
 await page.waitForTimeout(300);
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
 const id=snap.actual.find(x=>x.key.includes(cfg.identifier));
 assert(id,"Expected class use not found "+JSON.stringify(cfg)+" "+JSON.stringify(snap));
 const row=page.locator('#psResources [data-ps-resource="'+id.key+'"]');
 assert.equal(await row.count(),1,"resource DOM once");
 assert((await row.innerText()).includes("已使用 0 /"),"starts unused");
 assert.equal(await row.locator('button[data-ps-action="res"]').count(),2);
 const preSlots=await page.evaluate(()=>S.slotsUsed.l1||0);
 const spend=async()=>{await row.locator('button[data-ps-action="res"][data-ps-delta="1"]').click()};
 await spend();
 assert((await row.innerText()).includes("已使用 1 /"),"button spends");
 assert.equal(await page.evaluate(()=>S.slotsUsed.l1||0),preSlots,"free use must not spend spell slot");
 await page.locator('#playStatusBody [data-ps-action="undo"]').click();
 assert((await row.innerText()).includes("已使用 0 /"),"undo restores");
 await spend();
 if(cfg.idShortOne){
  await spend();
  assert((await row.innerText()).includes("已使用 2 /"),"two psi dice spent");
 }
 const data=await page.evaluate(()=>serialize());
 const round=await page.evaluate(obj=>{const r=deserialize(obj);renderFinal();go(11);renderPlayStatusTab();return {ok:r.ok,play:S.play.res}},data);
 assert(round.ok&&round.play[id.key]===(cfg.idShortOne?2:1),"JSON roundtrip preserve use");
 await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
 await page.locator('#psRestDialog [data-rest-submit]').click();
 const shortExpected=cfg.idShortOne?"已使用 1 /":cfg.shortRest?"已使用 0 /":"已使用 1 /";
 assert((await row.innerText()).includes(shortExpected),"short rest: "+cfg.class+" "+cfg.identifier);
 await page.locator('#psRestDialog [data-rest-close]').click();
 if(!cfg.shortRest){
  await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
  assert((await row.innerText()).includes("已使用 0 /"),"long rest");
  await page.locator('#psRestDialog [data-rest-close]').click();
 }
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert(overflow<=2,"overflow "+overflow);
 assert.deepEqual(errors,[],"page errors");
 const screenshot=path.join(OUT,"class-free-"+cfg.class+"-"+cfg.level+"-"+width+".png");
 if(cfg.screen!==false)await row.screenshot({path:screenshot});
 report.clicks.push({class:cfg.class,level:cfg.level,identifier:cfg.identifier,width,shortRest:cfg.shortRest||false,shortOne:cfg.idShortOne||false,ok:true});
 await page.close();
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:process.env.CI?undefined:"chrome"});
 const report={result:"RUNNING",url:URL,started:new Date().toISOString(),mandatoryCount:mandatory.length,cases:[],clicks:[],negative:[]};
 try{
  const levels=[...Array(20)].map((_,i)=>i+1);
  const widths=[320,390,1440];
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(URL+"?class-use-matrix="+width+"-"+Date.now(),{waitUntil:"networkidle",timeout:50000});
   await page.waitForFunction(()=>typeof window.ClassResourceMetrics5R!=="undefined",null,{timeout:15000});
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const source=await page.evaluate(()=>{
    const manifest=PLAY_CLASS_LIMITED_USE_META_2024;
    return {meta:manifest.map(m=>({cls:m[0],sub:m[1],name:m[2],level:m[3],id:m[4]})),classes:CLASSES.map(c=>c.n)};
   });
   assert.equal(source.classes.length,12,"must retain 12 classes");
   for(const [cls,feature,at,sub=""] of mandatory){
    const x=source.meta.filter(m=>m.cls===cls&&m.name===feature&&m.level===at&&m.sub===sub);
    assert(x.length>=1,"mandatory class feature not in limited-use metadata: "+[cls,sub,feature,at]);
   }
   for(const cls of source.classes){
    for(const sub of [-1,0,1,2,3]){
     // Check all 20 levels on desktop/mobile; 320px boundary levels for a faster mobile sweep.
     for(const level of (width===320?[1,2,3,5,6,10,11,14,15,17,20]:levels)){
      const cfg={edition:"2024",class:cls,sub,level};
      const r=await page.evaluate(setup,cfg);
      const label=[width,cls,r.subName||"none",level].join("|");
      assert.equal(r.scheme,"2024",label+" edition");
      assert.deepEqual(r.actual.map(x=>x.key),r.expected.map(x=>x.key),label+" missing/duplicate tracker");
      assert.deepEqual(r.counters,r.expected.map(x=>x.key),label+" counters not rendered");
      if(cls==="野蠻人"){
       const ids=r.actual.map(x=>x.key.split("|").pop());
       assert(!ids.includes("battering-roots")&&!ids.includes("fanatical-focus"),label+" bogus rest counters");
       if(r.subName==="狂熱者之道"){
        assert.equal(ids.includes("warrior-of-the-gods"),level>=3,label+" healing pool boundary");
        assert.equal(ids.includes("zealous-presence"),level>=10,label+" Zealous Presence boundary");
        assert.equal(ids.includes("rage-of-the-gods"),level>=14,label+" Rage of Gods boundary");
       }else assert(!ids.some(x=>["warrior-of-the-gods","zealous-presence","rage-of-the-gods"].includes(x)),label+" other subclass contamination");
      }
      for(const x of r.actual){
       assert(x.max>0&&x.ruleLength>20,label+" missing cap/canonical rule "+x.key);
       assert(x.recovery&&x.effect,label+" missing effect/recovery");
      }
      const maxFor=e=>e.cap==="wis"||e.cap==="cha"?4:e.cap==="con"?2:e.cap==="pb2"?2*(Math.floor((level-1)/4)+2):e.cap==="superiority"?(level>=15?6:level>=7?5:4):e.cap==="level-plus-one"?1+level:e.cap==="zealot-healing-dice"?(level>=17?7:level>=12?6:level>=6?5:4):1;
      r.actual.forEach((x,i)=>{
       const e=r.expected[i];
       assert.equal(x.max,maxFor(e),label+" cap "+x.key);
       const expectedRest=cls==="牧師"&&r.subName==="光明領域"&&e.feature==="護衛閃光"&&level>=6?"short":e.rest;
       assert.equal(x.rest,expectedRest,label+" recovery type "+x.key);
      });
      assert(r.overflow<=2,label+" horizontal overflow "+r.overflow);
      report.cases.push({width,cls,sub:r.subName||"",level,trackers:r.actual.length,overflow:r.overflow,ok:true});
     }
    }
   }
   assert.deepEqual(errors,[],"JS errors width="+width);
   report.negative.push({width,all20Levels:true,classes:12,subclasses:48});
   await page.close();
   console.log("PASS class use matrix",width,report.cases.filter(c=>c.width===width).length);
  }
  const legacy=await browser.newPage();
  await legacy.goto(URL+"?legacy-class-free="+Date.now(),{waitUntil:"networkidle",timeout:45000});
  const old=await legacy.evaluate(setup,{edition:"2014",class:"聖武士",sub:0,level:5});
  assert.equal(old.actual.length,0,"2014 Paladin must not gain 2024 free smite");
  report.negative.push({edition:"2014",class:"聖武士",level:5,freeUses:0});
  await legacy.close();
  await clickScenario(browser,{class:"聖武士",level:2,identifier:"smite-free",width:390},report);
  await clickScenario(browser,{class:"聖武士",level:5,identifier:"steed-free",width:1440},report);
  await clickScenario(browser,{class:"邪術師",level:11,identifier:"mystic-arcanum-6",width:390},report);
  await clickScenario(browser,{class:"法師",level:20,identifier:"signature-spell-1",shortRest:true,width:390},report);
  await clickScenario(browser,{class:"牧師",level:3,sub:3,identifier:"war-priest",shortRest:true,width:390},report);
  await clickScenario(browser,{class:"戰士",level:3,sub:3,identifier:"psi-energy-dice",idShortOne:true,width:390},report);
  await clickScenario(browser,{class:"術士",level:5,identifier:"sorcerous-restoration",width:390},report);
  const zealotPage=await browser.newPage();
  await zealotPage.goto(URL,{waitUntil:"networkidle"});
  const zealotIndex=await zealotPage.evaluate(()=>PROG_2024["野蠻人"].subs.findIndex(x=>x.n==="狂熱者之道"));
  await zealotPage.close();
  assert(zealotIndex>=0,"Zealot subclass stable identity");
  await clickScenario(browser,{class:"野蠻人",level:14,sub:zealotIndex,identifier:"zealous-presence",width:390},report);
  await clickScenario(browser,{class:"野蠻人",level:14,sub:zealotIndex,identifier:"rage-of-the-gods",width:1440},report);
  await clickScenario(browser,{class:"野蠻人",level:17,sub:zealotIndex,identifier:"warrior-of-the-gods",width:390},report);
  report.result="PASS";
  console.log("PASS 2024 class limited uses",JSON.stringify({cases:report.cases.length,mandatory:mandatory.length,clicks:report.clicks.length,negative:report.negative.length}));
 }catch(e){report.result="FAIL";report.error=String(e.stack||e);console.error("FAIL",report.error);process.exitCode=1}
 finally{report.completed=new Date().toISOString();fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify(report,null,2));await browser.close()}
})();
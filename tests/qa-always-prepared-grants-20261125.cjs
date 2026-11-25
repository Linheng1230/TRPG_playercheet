"use strict";
const assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const path=require("node:path");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18787/index.html";
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  let baselineIntercepted=0;
  if(process.env.QA_BASELINE==="1"){
   const repo=path.resolve(__dirname,"..");
   const baselineRef=process.env.QA_BASELINE_REF||"db805ad5282374a9c6cb8c215976381609cf856e";
   const baseline=execFileSync("git",["show",baselineRef+":assets/grant-cards-5r.js"],{cwd:repo,encoding:"utf8"});
   await page.route(/grant-cards-5r\.js/,route=>{baselineIntercepted++;return route.fulfill({status:200,contentType:"text/javascript",body:baseline})});
  }
  await page.goto(URL+"?qa-always-prepared=1",{waitUntil:"networkidle"});
  if(process.env.QA_BASELINE==="1"&&baselineIntercepted!==1)throw Error("baseline script interception was not applied");
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const result=await page.evaluate(()=>{
   const fails=[],observations={};
   const ok=(name,condition,details={})=>{if(!condition)fails.push({name,details});};
   const fresh=(name,level,sub=null,edition="2024")=>{
    resetAll();S.ruleset=edition;syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n===name)||null;
    S.level=level;S.classLevels={[name]:level};
    S.sub=sub&&PROG_2024[name]?PROG_2024[name].subs.findIndex(x=>x.n===sub):null;
    S.sp=SPECIES_2024[0];S.bg=BACKGROUNDS_2024[0];
    S.spChoices={};S.featSpells={};S.classChoices2024={};
    S.asi={};S.asiByClass={};S.cantrips=new Set();S.prepared=new Set();
    S.spellbook=new Set();S.customSpells=[];S.invocations=new Set();
    S.base={str:12,dex:16,con:13,int:10,wis:16,cha:11};
    S.bonusMode="21";S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};
    S.skills=new Set();S.languageChoices={};S.originFeatChoices={};
   };
   const hunters=normalizeSpellName2024("獵人印記");
   fresh("遊俠",1);
   let grants=grantedSpells2024();
   const ranger=grants.find(x=>x.n===hunters);
   ok("ranger1-auto-prepared",!!ranger&&ranger.mode==="prepared"&&ranger.src.includes("宿敵"),{grants:grants.slice(0,6).map(x=>({n:x.n,src:x.src,mode:x.mode}))});
   S.prepared.add(hunters);
   renderSpells();
   const fixed=document.querySelector('[data-fixed-spell="'+hunters+'"]');
   const selectable=document.querySelector('button[data-prep="'+hunters+'"]');
   ok("creator-fixed-card",!!fixed&&fixed.textContent.includes("始終準備"),{text:fixed?.textContent?.slice(0,140)});
   ok("creator-selected-once-only",!S.prepared.has(hunters)&&!!selectable?.disabled,{prepared:[...S.prepared],disabled:selectable?.disabled});
   const sheet=spellSheet();
   ok("final-pdf-spell-sheet",sheet.includes(hunters)&&sheet.includes("始終準備"),{found:sheet.includes(hunters)});
   renderPlayStatusTab();
   const play=document.querySelector("#psActions");
   ok("play-status-action-deck",!!play&&play.textContent.includes(hunters),{hasPlay:!!play,excerpt:play?.textContent?.slice(0,240)});
   const saved=JSON.parse(JSON.stringify(serialize()));
   const imported=deserialize(saved);
   renderSpells();renderPlayStatusTab();
   ok("save-reload-granted-still-present",imported.ok&&grantedSpells2024().some(x=>x.n===hunters)&&!S.prepared.has(hunters),{imported,prepared:[...S.prepared]});
   observations.ranger={grant:ranger,card:fixed?.textContent?.slice(0,140),slotList:play?.textContent?.slice(0,230)};
   fresh("聖武士",2);
   grants=grantedSpells2024();
   ok("paladin-smite-always-prepared",grants.some(x=>x.n===normalizeSpellName2024("至聖斬")&&x.mode==="prepared"),{grants:grants.map(x=>({n:x.n,mode:x.mode,src:x.src}))});
   observations.paladin=grants.map(x=>x.n);
   fresh("德魯伊",3,"星辰結社");
   grants=grantedSpells2024();
   ok("stars-druid-granted",grants.some(x=>x.n===normalizeSpellName2024("曳光彈")),{names:grants.map(x=>x.n)});
   fresh("遊俠",3);
   S.sp=SPECIES_2024.find(x=>x.n==="精靈");
   S.spChoices={eLine:"卓爾",eCast:"wis"};
   grants=grantedSpells2024();
   const hasDrow=grants.some(x=>x.n===normalizeSpellName2024("妖火"));
   const hasHunter=grants.some(x=>x.n===hunters);
   ok("species-plus-class-no-duplicates",hasDrow&&hasHunter&&new Set(grants.map(x=>x.n)).size===grants.length,{names:grants.map(x=>x.n)});
   observations.species=grants.map(x=>x.n);
   const sourceExpectations={
     "德魯伊||德魯伊語|1":["動物交談"],
     "吟遊詩人|魅音學院|蠱惑魔法|3":["魅惑類人","鏡影術"],
     "吟遊詩人|魅音學院|威嚴斗篷|6":["命令術"],
     "戰士|靈能武士|念動大師|18":["心靈遙控"],
     "遊俠||宿敵獵殺|1":["獵人印記"],
     "聖武士||聖光揮擊|2":["至聖斬"],
     "聖武士||忠誠坐騎|5":["尋獲坐騎"],
     "邪術師||聯絡宗主|9":["異界探知"],
     "邪術師|舊日支配者|駭異惡咒|10":["脆弱詛咒"],
     "法師|防護師|破法者|10":["法術反制","解除魔法"],
     "法師|幻術師|幻影造物|6":["野獸召喚術","妖精召喚術"],
     "吟遊詩人||造物之言|20":["律令醫療","律令死亡"],
     "德魯伊|星辰結社|星圖|3":["神導術","曳光彈"]
   };
   observations.sourceScan=Object.fromEntries(Object.entries(sourceExpectations).map(([k,expected])=>{
     const raw=window.ZIZI_5R_FULL_FEATURE_RULES?.[k]||"";
     const found=grantSpellEntriesFromRuleText2024(raw);
     ok("canonical-feature-grant-"+k,!!raw&&expected.every(n=>found.some(g=>g.sp.n===n&&g.mode==="prepared")),{expected,found:found.map(x=>({name:x.sp.n,mode:x.mode}))});
     return [k,found.map(x=>x.sp.n)];
   }));
   for(const writing of ["hunter's mark","Hunter's Mark","HUNTER'S MARK"]){
     const found=grantSpellEntriesFromRuleText2024("你始終準備了法術"+writing+"。");
     ok("case-insensitive-grant-"+writing,found.some(x=>x.sp.n===hunters&&x.mode==="prepared"),{found:found.map(x=>x.sp.n)});
   }
   const mereMention=grantSpellEntriesFromRuleText2024("被你的hunter's mark標記的目標會受到傷害。");
   ok("no-grant-without-grant-verb",mereMention.length===0,{found:mereMention.map(x=>x.sp.n)});
   fresh("遊俠",1,null,"2014");
   const legacy=grantedSpells2024();
   ok("2014-never-inherit-2024-grants",legacy.length===0,{legacy});
   return {fails,observations};
  });
  console.log(JSON.stringify({url:URL,errors,...result},null,2));
  assert.equal(errors.length,0,"browser runtime errors");
  assert.equal(result.fails.length,0,"end-to-end always-prepared regressions");
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

"use strict";
const assert=require("assert");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.goto(URL,{waitUntil:"networkidle"});
 await page.evaluate(()=>document.getElementById("rulesetModal")?.classList.remove("open"));
 const out=await page.evaluate(()=>{
  S.ruleset="2024";syncRulesetUI();
  const tx=id=>document.getElementById(id)?.textContent||"";
  renderClasses();
  const classes=tx("classGrid");
  S.cls=CLASSES.find(x=>x.n==="戰士");S.level=20;S.classLevels={戰士:20};S.sub=PROG_2024["戰士"].subs.findIndex(x=>x.n==="戰鬥大師");
  S.bg=BACKGROUNDS_2024.find(x=>x.n==="農夫");S.sp=SPECIES_2024.find(x=>x.n==="人類");S.spChoices={sizeChoice:"中型"};S.skills=new Set();
  renderOrigin();renderSkills();renderLevel();
  const backgrounds=tx("bgGrid"),species=tx("spGrid"),skills=tx("skillGrid"),fighter=tx("lvlBody");
  S.sp=SPECIES_2024.find(x=>x.n==="歌利亞");S.spChoices={giant:"雲巨人的躍遷"};renderOrigin();
  const goliath={detail:tx("spDetail"),options:[...document.querySelectorAll("#spDetail select[data-spch='giant'] option")].map(x=>x.textContent)};
  S.sp=SPECIES_2024.find(x=>x.n==="提夫林");S.spChoices={sizeChoice:"中型",fLine:"冥界",fCast:"cha"};renderOrigin();
  const tiefling={detail:tx("spDetail"),options:[...document.querySelectorAll("#spDetail select[data-spch='fLine'] option")].map(x=>x.textContent)};
  S.cls=CLASSES.find(x=>x.n==="術士");S.level=20;S.classLevels={術士:20};S.sub=0;S.metamagic=new Set(["加速法術"]);renderLevel();
  const sorcerer=tx("lvlBody");
  S.cls=CLASSES.find(x=>x.n==="邪術師");S.level=20;S.classLevels={邪術師:20};S.sub=0;S.invocations=new Set(["契約之刃"]);renderLevel();
  const warlock=tx("lvlBody");
  const warlockFilter=document.querySelector('.spell-filter-chip[data-sf-group="cls"][data-sf-value="K"]')?.textContent||"";
  S.cls=CLASSES.find(x=>x.n==="牧師");S.level=7;S.classLevels={牧師:7};S.sub=0;renderLevel();const cleric=tx("lvlBody");
  S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=7;S.classLevels={德魯伊:7};S.sub=0;renderLevel();const druid=tx("lvlBody");
  refTab="weapon";renderRef();const weaponRef=tx("refBody");
  refTab="mastery";renderRef();const masteryRef=tx("refBody");
  S.cls=CLASSES.find(x=>x.n==="邪術師");S.level=5;S.classLevels={邪術師:5};S.sub=0;S.bg=BACKGROUNDS_2024.find(x=>x.n==="農夫");S.sp=SPECIES_2024.find(x=>x.n==="提夫林");S.spChoices={sizeChoice:"中型",fLine:"冥界",fCast:"cha"};S.skills=new Set(["動物馴養","說服"]);renderFinal();const final=tx("finalSheet");
  S.ruleset="2014";syncRulesetUI();const filter2014=document.querySelector('.spell-filter-chip[data-sf-group="cls"][data-sf-value="K"]')?.textContent||"";
  return {classes,backgrounds,species,skills,fighter,goliath,tiefling,sorcerer,warlock,warlockFilter,cleric,druid,weaponRef,masteryRef,final,filter2014};
 });
 const checks=[
  [out.classes.includes("魔契師")&&!out.classes.includes("邪術師"),"class display"],
  [["騙子","農民","警衛","智者","流浪者"].every(x=>out.backgrounds.includes(x)),"background display"],
  [["特技","馴獸","遊說"].every(x=>out.skills.includes(x))&&!out.skills.includes("動物馴養"),"skill display"],
  [["雲之遠跡（雲巨人）","火之燃燒（火巨人）","霜之刺骨（霜巨人）","山之翻撞（山丘巨人）","石之堅韌（石巨人）","嵐之暴鳴（風暴巨人）"].every(x=>out.goliath.options.includes(x)),"goliath options"],
  [["巨人先祖","身強力壯","大型形態"].every(x=>out.goliath.detail.includes(x))&&!out.goliath.detail.includes("高大身形"),"goliath traits"],
  [["深淵","幽冥","煉獄"].every(x=>out.tiefling.options.includes(x)),"tiefling options"],
  [["邪魔遺贈","異界存在"].every(x=>out.tiefling.detail.includes(x)),"tiefling traits"],
  [out.fighter.includes("武器精通")&&out.fighter.includes("突襲")&&!out.fighter.includes("武器掌握"),"fighter level UI"],
  [out.sorcerer.includes("瞬發法術")&&!out.sorcerer.includes("加速法術"),"metamagic display"],
  [out.warlock.includes("刃之魔契")&&!out.warlock.includes("契約之刃"),"invocation display"],
  [out.warlockFilter==="魔契師"&&out.filter2014==="邪術師","ruleset-sensitive warlock label"],
  [["聖職","保護者","奇術使","受祝擊","強力施法"].every(x=>out.cleric.includes(x)),"cleric nested choices"],
  [["原初職能","術師","衛士","元素之怒","原力蠻擊"].every(x=>out.druid.includes(x)),"druid nested choices"],
  [out.weaponRef.includes("精通")&&!out.weaponRef.includes("掌握屬性"),"weapon ref"],
  [out.masteryRef.includes("武器精通")||out.masteryRef.includes("精通屬性"),"mastery ref"],
  [out.final.includes("魔契師")&&out.final.includes("農民")&&out.final.includes("幽冥")&&!out.final.includes("邪術師"),"final sheet canonical identity"]
 ];
 const failed=checks.filter(x=>!x[0]).map(x=>x[1]);
 console.log(JSON.stringify({pass:!errors.length&&!failed.length,failed,errors,samples:{warlockFilter:out.warlockFilter,goliathOptions:out.goliath.options,tieflingOptions:out.tiefling.options,goliath:out.goliath.detail.slice(0,1200),fighter:out.fighter.slice(0,1800),sorcerer:out.sorcerer.slice(0,1200),warlock:out.warlock.slice(0,1200),cleric:out.cleric.slice(0,1400),druid:out.druid.slice(0,1400),final:out.final.slice(0,1800)}},null,2));
 assert.deepEqual(errors,[]);
 assert.deepEqual(failed,[]);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

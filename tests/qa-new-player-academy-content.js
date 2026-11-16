/* 10｜新手創角教學｜Architecture Contract v1 靜態 QA
 * node tests/qa-new-player-academy-content.js
 * 不載入網站 UI、不部署、不變動角色 State。
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const ROOT=path.resolve(__dirname,"..");
const asset=path.join(ROOT,"assets","new-player-academy-content-2024.js");
const code=fs.readFileSync(asset,"utf8");
const source=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const contract=fs.readFileSync(path.join(ROOT,"docs","NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md"),"utf8");
const data=require(asset);
const chapterIds=["lesson.welcome","lesson.class","lesson.abilities","lesson.checks","lesson.origin","lesson.details","lesson.turn","lesson.spells","lesson.sheet","lesson.next"];
const routeIds=["creator.class","creator.origin","creator.abilities","creator.skills","creator.details","creator.level","creator.spells","creator.sheet","reference.rules","reference.spells","reference.shop","reference.characters","reference.adventures"];
const chapters=new Set(chapterIds),routes=new Set(routeIds),results=[];
function check(name,fn){try{fn();results.push({name,pass:true});console.log("PASS",name);}catch(error){results.push({name,pass:false,error:String(error.stack||error)});console.error("FAIL",name,error.message);}}
function sameSet(actual,expected,label){
  assert.equal(actual.length,expected.length,label+" count");
  assert.equal(new Set(actual).size,actual.length,label+" duplicates");
  assert.deepEqual([...actual].sort(),[...expected].sort(),label+" mismatch");
}
function creatorRows(regex,context={}){
  const match=source.match(regex);assert(match,"Missing Creator catalog");
  const name=match[0].match(/^const\s+(\w+)/)[1];
  return vm.runInNewContext(match[0]+"\n"+name,context);
}
function action(item){
  assert(item.nextAction,item.id+" missing CTA");
  const a=item.nextAction;
  assert.equal(Object.keys(a).sort().join(","),"creatorStepId,label,mode",item.id);
  assert(routes.has(a.creatorStepId),item.id+" unknown route "+a.creatorStepId);
  assert.equal(a.mode,"inspect",item.id+" must not auto-submit");
  assert(a.label && a.label.length<=80,item.id+" CTA too long");
}
function prose(item){
  assert(item.title && item.summary && item.example,item.id+" incomplete teaching example");
  assert(item.summary.length<=160 && item.example.length<=130,item.id+" too long");
  action(item);
}
function freezeCheck(v){if(v&&typeof v==="object"){assert(Object.isFrozen(v));Object.values(v).forEach(freezeCheck);}}
const topic=id=>{const x=data.topics.find(x=>x.id===id);assert(x,id);return x.summary+" "+x.example;};
check("2024-only-content-contract",()=>{
  assert.equal(data.schemaVersion,1);assert.equal(data.bridgeContractVersion,1);
  assert.equal(data.locale,"zh-TW");assert.equal(data.ruleset,"2024");
  assert(data.sourceOfTruth.includes("5RTools"));assert(data.integrationNote.includes("AcademyBridge"));
  assert(data.integrationNote.includes("2014"));
});
check("node-and-browser-parity-plus-deep-freeze",()=>{
  const sandbox=vm.createContext({});vm.runInContext(code,sandbox,{timeout:1000});
  assert.deepEqual(Object.keys(sandbox),["ZIZI_NEW_PLAYER_ACADEMY_2024"]);
  assert.equal(JSON.stringify(sandbox.ZIZI_NEW_PLAYER_ACADEMY_2024),JSON.stringify(data));
  freezeCheck(data);
  assert.throws(()=>{data.lessons[0].title="wrong";},TypeError);
});
check("official-13-creator-routes-and-creation-order",()=>{
  sameSet(data.creatorStepIds,routeIds,"Creator routes");
  assert.deepEqual(data.creationOrder.slice(0,3),["creator.class","creator.origin","creator.abilities"]);
  assert(data.creationOrder.indexOf("creator.details")>data.creationOrder.indexOf("creator.abilities"));
  assert.deepEqual(data.lessonOrder,chapterIds);
  for(const id of routeIds)assert(contract.includes(id),"Architecture route missing: "+id);
  for(const id of ["creator.background","creator.species","creator.languages","creator.finish"])
    assert(!data.creatorStepIds.includes(id),"Forbidden virtual step "+id);
});
check("all-ten-lessons-teach-real-steps-and-test-comprehension",()=>{
  sameSet(Object.keys(data.guides||{}),chapterIds,"guide chapters");
  const keywords={"lesson.welcome":"DM","lesson.class":"職業","lesson.abilities":"屬性",
    "lesson.checks":"d20","lesson.origin":"背景","lesson.details":"裝備",
    "lesson.turn":"動作","lesson.spells":"法術","lesson.sheet":"AC","lesson.next":"JSON"};
  const examples=new Set();
  for(const id of chapterIds){
    const guide=data.guides[id];
    assert(guide.goal.length>=18,id+" missing concrete goal");
    assert.equal(guide.steps.length,3,id+" must include 3 real how-to steps");
    for(const step of guide.steps){
      assert(step.title.length>=3&&step.detail.length>=28,id+" shallow action step");
      assert(!/TODO|待補|即將推出/.test(step.detail),id+" placeholder step");
    }
    assert(guide.worked.length>=45,id+" needs a worked DM/player example");
    assert(guide.worked.includes(keywords[id])||guide.steps.some(s=>s.detail.includes(keywords[id])),id+" topic drift: "+keywords[id]);
    examples.add(guide.worked);
    assert(guide.question.length>=15&&guide.options.length===2,id+" requires an actual question");
    assert.equal(guide.options.filter(o=>o.correct).length,1,id+" must have one valid explanation");
    guide.options.forEach(o=>assert(o.text.length>=2&&o.feedback.length>=16,id+" answer choice or explanation missing"));
    assert(guide.exit.length>=16,id+" missing actionable exit check");
  }
  assert.equal(examples.size,10,"worked examples must differ by chapter");
});
check("exact-ten-lesson-ids-with-readable-chapters",()=>{
  sameSet(data.lessons.map(x=>x.id),chapterIds,"lesson IDs");
  for(const c of data.lessons){
    assert.equal(c.academyStepId,c.id);assert(contract.includes(c.id),c.id+" missing from spec");
    assert(Array.isArray(c.topicIds)&&c.topicIds.length>0,c.id+" no topics");
    prose(c);
  }
});
check("twenty-seven-fully-linked-topic-sections",()=>{
  assert.equal(data.topics.length,27);
  sameSet(data.topics.map(x=>x.id),[...new Set(data.topics.map(x=>x.id))],"topics");
  const linked=data.lessons.flatMap(x=>x.topicIds);
  sameSet(linked,data.topics.map(x=>x.id),"chapter topic references");
  for(const t of data.topics){
    assert(/^topic\.[a-z0-9.-]+$/.test(t.id),t.id);
    assert(chapters.has(t.academyStepId),t.id+" unknown chapter");
    assert(data.lessons.find(x=>x.id===t.academyStepId).topicIds.includes(t.id));
    prose(t);
  }
  for(const id of ["topic.welcome","topic.roles","topic.creating-order","topic.class.subclasses",
    "topic.origin.background","topic.origin.background-asi","topic.origin.species",
    "topic.abilities.six","topic.abilities.modifier","topic.abilities.standard-array",
    "topic.check.d20","topic.check.proficiency","topic.check.skills","topic.check.saves",
    "topic.equipment.start","topic.spells.basics","topic.spells.slots","topic.spells.concentration",
    "topic.sheet.identity","topic.sheet.overview","topic.sheet.turn","topic.review"])
    assert(data.topics.some(x=>x.id===id),"Missing topic "+id);
});
check("all-12-classes-match-live-creator",()=>{
  const rows=creatorRows(/const CLASSES=\[[\s\S]*?\n\];/,{ALL_SKILLS:[]});
  sameSet(data.classes.map(x=>x.catalogName),rows.map(x=>x.n),"classes");
  for(const c of data.classes){
    prose(c);assert.equal(c.academyStepId,"lesson.class");
    assert.equal(c.nextAction.creatorStepId,"creator.class");
    assert(!("features" in c||"progression" in c),"Not a second mechanics database");
  }
  assert(data.classes.find(x=>x.catalogName==="邪術師").title.includes("契術師"));
});
check("all-16-backgrounds-match-live-2024",()=>{
  const rows=creatorRows(/const BACKGROUNDS_2024=\[[\s\S]*?\n\];/);
  sameSet(data.backgrounds.map(x=>x.catalogName),rows.map(x=>x.n),"backgrounds");
  for(const b of data.backgrounds){
    prose(b);assert.equal(b.academyStepId,"lesson.origin");
    assert.equal(b.nextAction.creatorStepId,"creator.origin");
    assert(!("feat" in b||"ab" in b||"sk" in b),"No duplicate background rules");
  }
  assert.deepEqual(Array.from(rows.find(x=>x.n==="士兵").ab),["str","dex","con"]);
});
check("all-10-species-match-live-2024",()=>{
  const rows=creatorRows(/const SPECIES_2024=\[[\s\S]*?\n\];/);
  sameSet(data.species.map(x=>x.catalogName),rows.map(x=>x.n),"species");
  for(const s of data.species){
    prose(s);assert.equal(s.academyStepId,"lesson.origin");
    assert.equal(s.nextAction.creatorStepId,"creator.origin");
    assert(!("traits" in s||"speed" in s),"No duplicate species rules");
  }
});
check("six-ability-cards",()=>{
  sameSet(data.abilities.map(x=>x.catalogName),["力量","敏捷","體質","智力","感知","魅力"],"abilities");
  for(const a of data.abilities){
    prose(a);assert.equal(a.academyStepId,"lesson.abilities");
    assert.equal(a.nextAction.creatorStepId,"creator.abilities");
  }
});
check("critical-2024-ASI-modifier-and-subclass-regressions",()=>{
  const b=topic("topic.origin.background-asi");
  assert(/\+2/.test(b)&&/三項各 \+1/.test(b)&&/不能同一項 \+3/.test(b)&&/最高為 20/.test(b));
  assert(/士兵.*力量.*敏捷.*體質/.test(b));
  assert(/物種不再提供創角屬性加值/.test(topic("topic.origin.species")));
  assert(/3 級選子職業/.test(topic("topic.class.subclasses")));
  assert(/15、14、13、12、10、8/.test(topic("topic.abilities.standard-array")));
  assert(/向下取整/.test(topic("topic.abilities.modifier")));
});
check("d20-spells-slots-concentration-and-sheet-regressions",()=>{
  assert(/DC/.test(topic("topic.check.d20")));
  assert(/熟練加值.*\+2/.test(topic("topic.check.proficiency")));
  assert(/豁免/.test(topic("topic.check.saves")));
  assert(/戲法.*法術位/.test(topic("topic.spells.basics")));
  assert(/已準備或已知法術.*法術位/.test(topic("topic.spells.slots")));
  assert(/同一時間只能維持一個/.test(topic("topic.spells.concentration")));
  assert(/AC/.test(topic("topic.sheet.overview")));
  assert(/陣營/.test(topic("topic.sheet.identity")));
});
check("finish-checklist-is-navigation-not-creator-state",()=>{
  assert.equal(data.finishChecklist.length,11);
  const keys=new Set();
  for(const item of data.finishChecklist){
    assert(/^check\.[a-z]+$/.test(item.id));
    assert(!keys.has(item.id),item.id);keys.add(item.id);
    assert(routes.has(item.creatorStepId));
    assert(item.label&&item.label.length>=10);
    assert(!("complete" in item||"confirmed" in item),"No fake Creator completion");
  }
  assert.equal(data.finishChecklist.find(x=>x.id==="check.spells").conditional,"spellcaster");
});
check("mock-AcademyBridge-v1-route-packets",()=>{
  const calls=[];
  const bridge={openCreator(r){
    assert.equal(r.v,1);assert.equal(r.source,"lesson");
    assert(chapters.has(r.academyStepId));
    assert(routes.has(r.creatorStepId));
    assert.equal(r.returnURL,"./academy.html");
    assert.equal(r.returnStep,r.academyStepId);
    assert.equal(r.mode,"inspect");calls.push(r);return {ok:true};
  }};
  for(const l of data.lessons){
    const a=l.nextAction;
    assert(bridge.openCreator({v:1,source:"lesson",academyStepId:l.id,
      creatorStepId:a.creatorStepId,returnURL:"./academy.html",
      returnStep:l.id,mode:a.mode}).ok);
  }
  assert.equal(calls.length,10);
});
check("no-2014-state-autoswitch-or-parallel-route",()=>{
  assert(!/\b(?:document|localStorage|sessionStorage|fetch|XMLHttpRequest)\s*[.(]/.test(code));
  assert(!/\b(?:S\.\w+|autoSave\s*\(|renderFinal\s*\(|\bgo\s*\()/.test(code));
  assert(!/forceApply|skipConfirm/.test(code));
  assert(data.integrationNote.includes("不自行操作 Creator"));
  assert(!fs.existsSync(path.join(ROOT,"assets","new-player-academy-content-2014.js")));
});
const bad=results.filter(r=>!r.pass);
const final={
  tests:results.length,passed:results.length-bad.length,failed:bad.length,
  lessons:data.lessons.length,topics:data.topics.length,classes:data.classes.length,
  backgrounds:data.backgrounds.length,species:data.species.length,abilities:data.abilities.length,
  checklist:data.finishChecklist.length,status:"SOURCE_ONLY_NOT_INTEGRATED_NOT_DEPLOYED"
};
console.log(bad.length?"ACADEMY_CONTENT_STATIC_FAIL":"ACADEMY_CONTENT_STATIC_PASS",JSON.stringify(final));
if(bad.length){for(const b of bad)console.error(b.name,b.error);process.exitCode=1;}

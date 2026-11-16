"use strict";
// 30｜AcademyBridge v1 contract QA. No UI integration or Live claims.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const API=require("../assets/new-player-academy-bridge.js");
let count=0;
const test=(label,fn)=>{fn();count++;console.log("PASS",label);};
function mockStorage(seed) {
  const map=new Map(seed||[]);
  return {map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
}
function fixture(opts={}) {
  const session=opts.sessionStorage||mockStorage();
  const local=opts.localStorage||mockStorage();
  const S={ruleset:"2024",cls:null,bg:null,sp:null,step:0,confirmed:false};
  const events=[];
  const host={
    sessionStorage:session,localStorage:local,
    getRuleset:()=>S.ruleset,getCreatorStep:()=>S.step,hasCharacter:()=>!!S.cls,
    navigateCreator:(step,view,route)=>{events.push(["creator",step,view,route]);S.step=step;return true;},
    navigateAcademy:(url,id)=>{events.push(["academy",url,id]);return true;},
    isValidSuggestion:(kind,ref,edition)=>edition==="2024"&&kind==="class"&&["戰士","法師"].includes(ref),
    canOpenCreatorStep:()=>!S.confirmed,
    acceptQuestionSetId:id=>id==="class-fit-v1"
  };
  return {S,events,host,session,local,bridge:API.createBridge(host)};
}
const route=(step="creator.abilities",override={})=>({
  v:1,source:"lesson",academyStepId:"lesson.abilities",creatorStepId:step,
  returnURL:"./academy.html",returnStep:"lesson.abilities",mode:"inspect",...override
});
const progress=(override={})=>({
  v:1,curriculumVersion:"academy-v1",activeSource:"quiz",
  academyStepId:"quiz.q05",completedStepIds:["lesson.welcome","quiz.q01"],
  questionSetId:"class-fit-v1",answers:{Q1:"A",Q5:"D"},updatedAt:1794800000,...override
});
test("13 stable Academy IDs match 2024 Creator routes, skipping pre-existing play step 11",()=>{
  const expected=["creator","origin","abilities","skills","details","level","prepare","sheet",
    "rules","spells","shop","characters","adventures"];
  assert.equal(Object.keys(API.STEPS).length,13);
  Object.entries(API.STEPS).forEach(([,item],i)=>assert.deepEqual(item,[i>=11?i+1:i,expected[i]]));
  assert.deepEqual(API.STEPS["reference.characters"],[12,"characters"]);
  assert.deepEqual(API.STEPS["reference.adventures"],[13,"adventures"]);
  assert.equal(Object.values(API.STEPS).some(([step])=>step===11),false);
});
test("creator/lesson return works through validated session route",()=>{
  const f=fixture();
  assert.equal(f.bridge.openCreator(route()).ok,true);
  assert.deepEqual(f.events[0].slice(0,3),["creator",2,"abilities"]);
  assert.equal(f.bridge.getRoute().returnStep,"lesson.abilities");
  assert.equal(f.bridge.returnToAcademy().ok,true);
  assert.deepEqual(f.events.at(-1),["academy","./academy.html?step=lesson.abilities","lesson.abilities"]);
  assert.equal(f.S.cls,null);
  assert.equal(f.S.step,2);
});
test("session reload reads exact learning location, no S serialization",()=>{
  const f=fixture();
  f.bridge.openCreator(route("creator.skills"));
  const reloaded=API.createBridge(f.host);
  assert.equal(reloaded.returnToAcademy().returnStep,"lesson.abilities");
  assert.equal(reloaded.getCreatorSnapshot().creatorStepId,"creator.skills");
  assert.equal(reloaded.getCreatorSnapshot().characterPresent,false);
});
test("unknown creator/learning IDs and mismatched source are rejected",()=>{
  const f=fixture();
  for(const broken of [
    route("creator.absent"),
    route("creator.class",{academyStepId:"lesson.absent",returnStep:"lesson.absent"}),
    route("creator.class",{source:"practice"}),
    route("creator.class",{returnStep:"lesson.class"})
  ]) assert.equal(f.bridge.openCreator(broken).reason,"invalid-route");
  assert.equal(f.events.length,0);
});
test("returnURL cannot jump to external, protocol, host, traversal or encoded attacks",()=>{
  const f=fixture();
  ["https://bad.test","javascript:alert(1)","//bad.test/","../academy.html",
    "./academy.html?next=https://bad.test","\\academy.html","data:text/html,x"].forEach(url=>{
    assert.equal(f.bridge.openCreator(route("creator.class",{returnURL:url})).reason,"invalid-route");
  });
  assert.equal(f.bridge.returnToAcademy().reason,"missing-or-invalid-return");
  assert.equal(f.events.length,0);
});
test("suggestion requires verified canonical 2024 catalog, never mutates character",()=>{
  const f=fixture();
  const suggestion={kind:"class",canonicalRef:"戰士",catalogVersion:"2024"};
  assert.equal(f.bridge.openCreator(route("creator.class",{source:"quiz",academyStepId:"quiz.result",
    returnStep:"quiz.result",mode:"suggest",suggestion})).ok,true);
  assert.equal(f.S.cls,null);
  assert.equal(f.S.confirmed,false);
  assert.equal(f.bridge.getRoute().suggestion.canonicalRef,"戰士");
  assert.equal(f.bridge.openCreator(route("creator.class",{suggestion:{...suggestion,canonicalRef:"未知職業"}})).reason,"invalid-canonical-ref");
});
test("locked selection is blocked by host confirmation gate",()=>{
  const f=fixture();
  f.S.confirmed=true;
  assert.equal(f.bridge.openCreator(route("creator.class")).reason,"confirmation-gate");
  assert.equal(f.events.length,0);
});
test("2014 is isolated and never changes edition",()=>{
  const f=fixture();
  f.S.ruleset="2014";
  assert.equal(f.bridge.openCreator(route()).reason,"edition-2014");
  assert.equal(f.bridge.getCreatorSnapshot().ruleset,"2014");
  assert.equal(f.S.ruleset,"2014");
  assert.equal(f.events.length,0);
});
test("progress saves separately from Creator keys and roundtrips",()=>{
  const f=fixture();
  assert.deepEqual(f.bridge.saveProgress(progress()),{ok:true,persisted:true});
  assert.equal(f.local.map.has(API.PROGRESS_KEY),true);
  assert.equal(f.local.map.has("dnd5r:current"),false);
  assert.equal(f.local.map.has("dnd5r:roster"),false);
  const saved=API.createBridge(f.host).restoreProgress();
  assert.deepEqual(saved.answers,{Q1:"A",Q5:"D"});
  assert.equal(saved.academyStepId,"quiz.q05");
});
test("invalid progress and stale question set do not restore stale answers",()=>{
  const f=fixture();
  assert.equal(f.bridge.saveProgress(progress({academyStepId:"quiz.unknown"})).reason,"invalid-progress");
  assert.equal(f.bridge.saveProgress(progress({answers:{Q2:"<script>"}})).reason,"invalid-progress");
  assert.equal(f.bridge.saveProgress(progress({questionSetId:"older-v0"})).ok,true);
  assert.equal(API.createBridge(f.host).restoreProgress().answers,undefined);
});
test("progress storage denied degrades in memory without claiming persistence",()=>{
  const fail={getItem(){throw Error("blocked");},setItem(){throw Error("blocked");}};
  const f=fixture({localStorage:fail});
  assert.deepEqual(f.bridge.saveProgress(progress()),{ok:true,persisted:false,reason:"storage-unavailable"});
  assert.equal(f.bridge.getProgressPersistence(),false);
  assert.equal(f.bridge.restoreProgress().academyStepId,"quiz.q05");
});
test("session storage unavailable fails closed before navigation",()=>{
  const fail={getItem(){throw Error("blocked");},setItem(){throw Error("blocked");}};
  const f=fixture({sessionStorage:fail});
  assert.equal(f.bridge.openCreator(route()).reason,"session-storage-unavailable");
  assert.equal(f.events.length,0);
});
test("corrupt or future route fails safe with no external navigation",()=>{
  const session=mockStorage([[API.ROUTE_KEY,"{bad json"]]);
  const f=fixture({sessionStorage:session});
  assert.equal(f.bridge.returnToAcademy().reason,"missing-or-invalid-return");
  session.setItem(API.ROUTE_KEY,JSON.stringify({...route(),v:2}));
  assert.equal(f.bridge.returnToAcademy().reason,"missing-or-invalid-return");
  assert.equal(f.events.length,0);
});
test("browser module exposes exactly one configured AcademyBridge global",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../assets/new-player-academy-bridge.js"),"utf8");
  const browser={document:{}};browser.globalThis=browser;
  vm.runInNewContext(source,browser,{timeout:1000});
  assert.equal(typeof browser.DND5RAcademyBridge.openCreator,"function");
  assert.equal(browser.DND5RAcademyBridge.openCreator(route()).reason,"not-configured");
  assert.equal(browser.ZIZI_NEW_PLAYER_ACADEMY_BRIDGE,undefined);
  const f=fixture();
  browser.DND5RAcademyBridge.configure(f.host);
  assert.equal(browser.DND5RAcademyBridge.openCreator(route()).ok,true);
});
test("no duplicate Creator state/rules/commit/serialize in bridge",()=>{
  const src=fs.readFileSync(path.join(__dirname,"../assets/new-player-academy-bridge.js"),"utf8");
  assert.equal(/\bS\.(cls|bg|sp|level|sub|ruleset)\b/.test(src),false);
  assert.equal(/\b(confirmClass|_commitClass|_commitChoice|resetState|deserialize|autoSave)\s*\(/.test(src),false);
  assert.equal(/\b(CLASSES|BACKGROUNDS|SPECIES_2024|PROG_2024)\s*=/.test(src),false);
});
console.log("PASS QA-new-player-academy-bridge ("+count+" checks)");

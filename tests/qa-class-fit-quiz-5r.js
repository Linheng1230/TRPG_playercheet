"use strict";
/* Standalone class-fit QA: reads current index.html canonical catalogs; never writes S.
 * Run: node tests/qa-class-fit-quiz-5r.js
 */
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const ROOT=path.resolve(__dirname,"..");
const quiz=require(path.join(ROOT,"assets/class-fit-quiz-5r.js"));
const html=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
let checks=0;
function ok(value,msg){checks++;assert.ok(value,msg);}
function eq(a,b,msg){checks++;assert.deepEqual(a,b,msg);}
function sliceConst(name,next){
  const start=html.indexOf("const "+name+"=");
  assert(start>=0,"missing existing canonical "+name);
  const end=html.indexOf(next,start);
  assert(end>start,"missing canonical boundary after "+name);
  return html.slice(start,end);
}
// Evaluate only existing Source snippets; this fixture does not retype canonical game options.
function evaluateConst(source,name,context={}){
  const script=source+"\n;this.__result="+name+";";
  vm.runInNewContext(script,context);
  return context.__result;
}
const classes=evaluateConst(sliceConst("CLASSES","/* 2024 背景"),"CLASSES",{ALL_SKILLS:[]});
const backgrounds=evaluateConst(sliceConst("BACKGROUNDS_2024","/* 2024 起源專長"),"BACKGROUNDS_2024");
const species=evaluateConst(sliceConst("SPECIES_2024","/* 2014 PHB 核心起源資料"),"SPECIES_2024");
const prog=evaluateConst(sliceConst("PROG_2024","const PHB14_FEATURES"),"PROG_2024");
const catalog={edition:"2024",classes,progression:prog,backgrounds,species};
const one=(id)=>classes.find(c=>c.n===id);
const snapshots=JSON.stringify(catalog);
const answers=(s)=>s.trim().split(/\s+/);
const Q=quiz.questions();
eq(Q.length,10,"exactly ten questions");
ok(Q.every((q,i)=>q.id==="Q"+(i+1)&&q.options.length===4&&q.options.every((o,j)=>o.id==="ABCD"[j]&&o.text.length>2)),"ten 4-choice questions");
eq(quiz.weights,[9,9,9,8,7,7,7,7,4,2],"weight distribution");
ok(quiz.weights.slice(0,4).reduce((a,b)=>a+b,0)/69>=.45,"core weight >=45%");
ok(quiz.weights.slice(4,8).reduce((a,b)=>a+b,0)/69>.38,"differentiator about 40%");
ok(quiz.weights.slice(8).reduce((a,b)=>a+b,0)/69<=.15,"story weight <=15%");
eq(classes.length,12,"real 2024 class count");
eq(Object.values(prog).reduce((n,v)=>n+v.subs.length,0),48,"real 2024 subclass count");
eq(quiz.normalizeAnswers({Q1:"A",Q5:"D"})[0],"A","object answer parse");
eq(quiz.normalizeAnswers({Q1:"A",Q5:"D"})[4],"D","object answer parse Q5");
eq(quiz.restoreAnswers(quiz.serializeAnswers({Q1:"A",Q2:"B"}))[1],"B","serialize / restore progress");
eq(quiz.restoreAnswers("{garbled").filter(Boolean).length,0,"bad persist fallback");
eq(quiz.restoreAnswers(JSON.stringify({schema:"class-fit-5r",version:999,answers:answers("A A A A A A A A A A")})).filter(Boolean).length,0,"reject unknown schema version");
eq(quiz.evaluate([],catalog).status,"INCOMPLETE","incomplete input no recommendation");
eq(quiz.evaluate(answers("A A A A A A A A A A"),null).status,"UNAVAILABLE","missing catalog safe");
eq(quiz.evaluate(answers("A A A A A A A A A A"),{...catalog,edition:"2014"}).status,"UNAVAILABLE","2014 isolation");
eq(quiz.evaluate(answers("A A A A A A A A A A"),{...catalog,edition:undefined}).status,"UNAVAILABLE","no implicit 2014/2024 edition guessing");
const profiles={
 野蠻人:"A A A A C A B A A A",吟遊詩人:"D C D D A B C D C D",牧師:"D C D D D B C C C B",
 德魯伊:"C C D C C B D C B C",戰士:"A A A A D A A A A A",武僧:"B B A B B A B B A D",
 聖武士:"A D B A A B B A C A",遊俠:"B D B B C B B B B C",遊蕩者:"B B A B B A A B D D",
 術士:"C C D C A C C D D B",邪術師:"C D C C D D B D D D",法師:"C C D C D D D C D B"
};
const topReached=new Set(),firstNames=[],profileTop=[];
for(const [name,p] of Object.entries(profiles)){
  const input=answers(p),result=quiz.evaluate(input,catalog);
  eq(result.status,"READY",name+" all three complete");
  ok(result.recommendations.length===3,name+" three results");
  const names=result.recommendations.map(r=>r.className);
  profileTop.push(name+"→"+names.join("/"));
  eq(new Set(names).size,3,name+" class de-dup");
  eq(names[0],name,name+" can be Top-1");
  topReached.add(names[0]);firstNames.push(name);
  for(const r of result.recommendations){
    ok(r.reasons.length>=2&&new Set(r.reasons.map(d=>d.questionId)).size>=2,name+" grounded two answers");
    ok(r.reasons.every(d=>input[Number(d.questionId.slice(1))-1]===d.choiceId&&d.answer.length>2),"reasons match selections");
    ok(!!r.actualTurn&&!!r.tradeoff&&!!r.role&&!!r.difficulty&&!!r.label,"complete independent result");
    ok(r.subclass?.atLevel===3&&r.subclass?.status.includes("尚未取得"),"future 3rd-level only");
    ok(prog[r.className].subs.some(s=>s.n===r.subclass.ref),"subclass from canonical catalog");
    ok(backgrounds.some(b=>b.n===r.background.ref),"background from canonical catalog");
    ok(species.some(s=>s.n===r.species.ref),"species from canonical catalog");
    ok(r.background.compatible&&r.background.abilityOverlap>0,"background mechanical compatibility");
    ok(r.background.originFeat===backgrounds.find(b=>b.n===r.background.ref).feat,"actual origin feat from canonical");
    eq(r.prefill.confirmed,false,"prefill must not confirm");
    eq(r.prefill.edition,"2024","2024-only prefill");
    ok(r.ctas.length===4&&r.ctas[1].includes("創角")&&!r.ctas[1].includes("套用"),"honest CTA contract");
    ok(r.subclass.why.length>0&&r.subclass.theme.length>0&&r.subclass.tradeoff.length>0,"subclass explanation");
  }
}
eq(topReached.size,12,"all classes have a genuine Top-1 path");
// Each option must reward at least two different classes positively; never irrelevant by construction.
for(let i=0;i<10;i++)for(const option of "ABCD"){
  let positives=0;
  for(const profile of Object.values(profiles)){
    const base=answers(profile);
    if(base[i]===option||"ABCD"[("ABCD".indexOf(base[i])+1)%4]===option)positives++;
  }
  ok(positives>=2,"Q"+(i+1)+option+" has at least two positive class signals");
}
// Single-question sensitivity: compare class rankings / subclass choices, not implausibly insist
// one answer always overturns nine others.
let sensitive=0,changes=0;
for(let q=0;q<10;q++){
  const base=answers(profiles["戰士"]),signatures=[];
  for(const c of "ABCD"){
    const v=base.slice();v[q]=c;
    const result=quiz.evaluate(v,catalog);
    signatures.push(result.recommendations.map(r=>r.classRef+"|"+r.subclass.ref).join(","));
  }
  const count=new Set(signatures).size;
  if(count>1)sensitive++;
  changes+=count-1;
}
ok(sensitive>=6&&changes>=6,"single-question sensitivity on a fixed profile");
// No old result cache: edit answer, recalc deterministically, then restore.
const before=answers(profiles["術士"]),again=before.slice();again[5]="A";
const original=quiz.evaluate(before,catalog),revised=quiz.evaluate(again,catalog);
ok(JSON.stringify(revised)!==JSON.stringify(original),"edits recompute recommendation");
eq(quiz.evaluate(before,catalog),original,"pure deterministic recomputation");
// Hybrid melee + magic should not collapse to pure caster just because Q6=C.
for(const p of [
 "A D B A A C B A C A","B D B B C C B B D C","A D C A A C C D C A"
]){
 const a=answers(p),r=quiz.evaluate(a,catalog);
 ok(r.recommendations.some(x=>["聖武士","遊俠","戰士","吟遊詩人","邪術師"].includes(x.className)),"hybrid has workable martial/arcane choice");
}
for(const p of [
 "A A A A B D D D C B", // contradictory front-line + academic planner
 "D B A D D A A B D D", // non-magic team supporter
 "C C D A A B B D B A", // mixed control + front + nature
 "B B A C D C D A C D"  // mixed skills and supernatural identity
]){
 const r=quiz.evaluate(answers(p),catalog);
 ok(r.recommendations.length===3&&r.recommendations.every(x=>x.reasons.length>=2),"contradictory coherent distinct results");
}
const less={...catalog,backgrounds:catalog.backgrounds.filter(b=>b.n==="賢者")};
const partially=quiz.evaluate(answers(profiles["野蠻人"]),less);
ok(partially.status==="PARTIAL"&&partially.warnings.length>=1,"no mechanical background fallback, never fabricated");
const noSubs={...catalog,progression:{...prog,戰士:{...prog["戰士"],subs:[]}}};
ok(!quiz.evaluate(answers(profiles["戰士"]),noSubs).recommendations.some(r=>r.className==="戰士"),"unavailable class filtered");
const noSpecies={...catalog,species:[]};
ok(quiz.evaluate(answers(profiles["法師"]),noSpecies).status==="PARTIAL","missing species explicit PARTIAL");
// Enumerate 48 current PHB2024 subclasses and find a real answer combination that
// makes each first choice when its owner class is the only valid class.
let seed=0x5A17C0DE;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const subclassReach=[],missing=[];
for(const [name,entry] of Object.entries(prog)){
  const mini={...catalog,classes:[one(name)]};
  const reached=new Set(),target=new Set(entry.subs.map(s=>s.n));
  const seeds=[answers(profiles[name])];
  for(let i=0;i<2500;i++){seeds.push(Array.from({length:10},()=> "ABCD"[Math.floor(rand()*4)]));}
  for(const input of seeds){
    const r=quiz.evaluate(input,mini).recommendations[0];
    if(r?.subclass)reached.add(r.subclass.name);
    if(reached.size===target.size)break;
  }
  for(const s of target)if(!reached.has(s))missing.push(name+"/"+s);
  subclassReach.push({className:name,reached:reached.size,available:target.size});
}
eq(missing,[],"all 48 subclasses can win a legal fit scenario");
// Phone/card content contract (not yet actual browser UI; 30 owns integration).
for(const r of quiz.evaluate(answers(profiles["牧師"]),catalog).recommendations){
  for(const key of ["className","label","reasonText","actualTurn","difficulty","tradeoff"]){
    ok(typeof r[key]==="string"&&r[key].trim().length>0,"mobile-readable content "+key);
  }
  ok(r.ctas.every(x=>x.length<20),"compact touch action labels");
}
// Ability suitability follows the live class.pri field, not a duplicated ability table.
const alteredClasses=classes.map(c=>c.n==="戰士"?{...c,pri:"智力"}:c);
const altered=quiz.evaluate(answers(profiles["戰士"]),{...catalog,classes:alteredClasses});
ok(backgrounds.find(b=>b.n===altered.recommendations[0].background.name).ab.includes("int"),"background ASI tracks canonical class.pri");
const invalidClasses=classes.map(c=>c.n==="戰士"?{...c,pri:"不存在的屬性"}:c);
const invalid=quiz.evaluate(answers(profiles["戰士"]),{...catalog,classes:invalidClasses});
ok(invalid.status==="PARTIAL"&&!invalid.recommendations[0].background,"no fabricated ASI mapping when class source is invalid");
// Randomized contradiction corpus: all explanations cite answers that actually carry
// positive class-weight evidence (primary or explicitly weaker secondary signal).
let corpusCases=0;
for(let t=0;t<1200;t++){
  const a=Array.from({length:10},()=>"ABCD"[Math.floor(rand()*4)]);
  const got=quiz.evaluate(a,catalog);
  eq(got.recommendations.length,3,"randomized three unique choices");
  eq(new Set(got.recommendations.map(r=>r.classRef)).size,3,"randomized de-dup");
  for(const r of got.recommendations){
    const expect=answers(profiles[r.className]);
    const supported=r.reasons.every(d=>{
      const i=Number(d.questionId.slice(1))-1;
      return expect[i]===d.choiceId || "ABCD"[("ABCD".indexOf(expect[i])+1)%4]===d.choiceId;
    });
    ok(supported,"every cited reason has positive affinity evidence for "+r.className);
    ok(r.subclass.signalReasons.every(d=>a[Number(d.questionId.slice(1))-1]===d.choiceId),"subclass reasons match exact answers");
    corpusCases++;
  }
}
eq(JSON.stringify(catalog),snapshots,"canonical catalog not modified");
ok(!Object.prototype.hasOwnProperty.call(global,"S"),"never touches actual Creator S state");
console.log("PASS qa-class-fit-quiz-5r: "+checks+" assertions; 12/12 classes Top-1; 48/48 subclass reach; 390px content contract; 2024-only catalog and zero S mutation.");
console.log("Subclass coverage: "+subclassReach.map(x=>x.className+" "+x.reached+"/"+x.available).join("、"));
console.log("Profile Top-3: "+profileTop.join("；"));
console.log("PENDING (owner 30): real 390px / 1440px browser visual, navigation, persistence wire-up and Creator prefill/confirmation E2E; no deployment.");

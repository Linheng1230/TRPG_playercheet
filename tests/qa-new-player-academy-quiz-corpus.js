"use strict";
/**
 * Independent workstream 90 SOURCE-ONLY quiz corpus verification.
 * Loads the real canonical catalog through the existing Creator page.
 * Never mutates Creator S, stores nothing in the site and does not approve release.
 *
 * Run (while local HTTP server serves repo):
 *   QA_URL=http://127.0.0.1:18990/index.html node tests/qa-new-player-academy-quiz-corpus.js
 */
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const quiz=require(path.join(ROOT,"assets/class-fit-quiz-5r.js"));
const cases=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures","new-player-academy-qa-cases.json"),"utf8")).cases;
const URL=process.env.QA_URL||"http://127.0.0.1:18990/index.html";
const sourceFiles=["index.html","assets/class-fit-quiz-5r.js","tests/fixtures/new-player-academy-qa-cases.json"];
const hash=f=>crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT,f))).digest("hex");
const startHashes=Object.fromEntries(sourceFiles.map(f=>[f,hash(f)]));
const profiles={
 "野蠻人":"A A A A C A B A A A","吟遊詩人":"D C D D A B C D C D",
 "牧師":"D C D D D B C C C B","德魯伊":"C C D C C B D C B C",
 "戰士":"A A A A D A A A A A","武僧":"B B A B B A B B A D",
 "聖武士":"A D B A A B B A C A","遊俠":"B D B B C B B B B C",
 "遊蕩者":"B B A B B A A B D D","術士":"C C D C A C C D D B",
 "邪術師":"C D C C D D B D D D","法師":"C C D C D D D C D B"
};
function checksForResult(input,result,catalog,id){
 assert.equal(result.status,"READY",id+" status");
 assert.equal(result.recommendations.length,3,id+" recommendation count");
 assert.equal(new Set(result.recommendations.map(r=>r.classRef)).size,3,id+" 3 distinct classes");
 for(const r of result.recommendations){
  assert(catalog.classes.some(c=>c.n===r.classRef),id+" invalid class "+r.classRef);
  assert(catalog.progression[r.classRef].subs.some(s=>s.n===r.subclass?.ref),id+" invalid subclass");
  assert(catalog.backgrounds.some(b=>b.n===r.background?.ref),id+" invalid background");
  assert(catalog.species.some(s=>s.n===r.species?.ref),id+" invalid species");
  assert.equal(r.prefill?.confirmed,false,id+" confirmed without user");
  assert.equal(r.prefill?.edition,"2024",id+" wrong edition");
  assert.equal(r.subclass?.atLevel,3,id+" subclass not at Lv3");
  assert.equal(r.background?.compatible,true,id+" background not compatible");
  assert(r.reasons.length>=2,id+" lack reasons");
  assert(new Set(r.reasons.map(x=>x.questionId)).size>=2,id+" same question reason");
  assert(r.reasons.every(x=>input[Number(x.questionId.slice(1))-1]===x.choiceId),id+" reasons do not match answers");
  assert(r.actualTurn&&r.tradeoff&&r.difficulty,id+" not usable as beginner recommendation");
 }
}
function lcg(seed){let a=seed>>>0;return ()=>((a=(Math.imul(a,1664525)+1013904223)>>>0)>>>0);}
(async()=>{
 let browser;const report={schema:"new-player-90-independent-quiz-v1",url:URL,
  sourceHashes:startHashes,corpus:[],classCoverage:[],subclassCoverage:[],
  sourceOnly:true,integration:false,release:"BLOCKED",warnings:[]};
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  const errs=[];page.on("pageerror",e=>errs.push(e.message));
  await page.goto(URL+"?qa90-quiz-catalog=1",{waitUntil:"networkidle"});
  const catalog=await page.evaluate(()=>({
   edition:"2024",classes:CLASSES,progression:PROG_2024,
   backgrounds:BACKGROUNDS_2024,species:SPECIES_2024
  }));
  assert.equal(catalog.classes.length,12,"real Creator class count");
  assert.equal(Object.values(catalog.progression).reduce((n,x)=>n+x.subs.length,0),48,"real Creator subclass count");
  assert.equal(errs.length,0,"page errors: "+errs.join(" | "));
  for(const c of cases){
   assert.equal(c.answers.length,10,c.id+" answer count");
   const result=quiz.evaluate(c.answers,catalog);
   checksForResult(c.answers,result,catalog,c.id);
   const variants=new Set();
   for(const option of "ABCD"){
    const a=c.answers.slice();a[0]=option;
    const v=quiz.evaluate(a,catalog);
    variants.add(v.recommendations.map(r=>r.classRef+"|"+r.subclass?.ref).join(","));
   }
   report.corpus.push({id:c.id,top3:result.recommendations.map(r=>r.classRef),
     topSubclass:result.recommendations[0].subclass.ref,answerQ1OutcomeVariants:variants.size});
  }
  assert(report.corpus.filter(c=>c.answerQ1OutcomeVariants>1).length>=3,
   "insensitive across independent corpus Q1");
  for(const [cls,s] of Object.entries(profiles)){
   const input=s.split(" "),result=quiz.evaluate(input,catalog);
   checksForResult(input,result,catalog,"Top1-"+cls);
   assert.equal(result.recommendations[0].classRef,cls,"unreachable Top-1 "+cls);
   report.classCoverage.push(cls);
  }
  for(const c of catalog.classes){
   const subs=catalog.progression[c.n].subs.map(s=>s.n),targets=new Set(subs);
   const reached=new Set(),mini={...catalog,classes:[c]};
   const base=profiles[c.n].split(" ");
   // Deterministic targeted traversal first, randomized full vectors second.
   const focus=[8,7,5,3,4,1];
   for(let combo=0;combo<4096&&reached.size<targets.size;combo++){
    const answer=base.slice();let n=combo;
    for(const q of focus){answer[q]="ABCD"[n%4];n=Math.floor(n/4);}
    const choice=quiz.evaluate(answer,mini).recommendations[0]?.subclass?.ref;
    if(targets.has(choice))reached.add(choice);
   }
   const next=lcg(0x5A17C0DE+c.n.length+c.n.charCodeAt(0));
   for(let i=0;i<4000&&reached.size<targets.size;i++){
    const answer=Array.from({length:10},()=> "ABCD"[next()%4]);
    const choice=quiz.evaluate(answer,mini).recommendations[0]?.subclass?.ref;
    if(targets.has(choice))reached.add(choice);
   }
   report.subclassCoverage.push({className:c.n,expected:subs,reachable:[...reached],
     missing:subs.filter(s=>!reached.has(s))});
  }
  const missing=report.subclassCoverage.flatMap(x=>x.missing.map(s=>x.className+"|"+s));
  report.coverage={cases:cases.length,topOneClasses:report.classCoverage.length,
    subclassesReached:48-missing.length,subclassesExpected:48,missing};
  const changed=sourceFiles.filter(f=>hash(f)!==startHashes[f]);
  report.sourceChangedDuringQA=changed;
  assert.deepEqual(changed,[],"source changed during QA: "+changed.join(","));
  report.status=missing.length?"FAIL_INDEPENDENT_SUBCLASS_COVERAGE":"TARGETED_PASS_ONLY";
  if(missing.length)process.exitCode=1;
  await context.close();
 }catch(e){report.status="FAIL";report.error=String(e.stack||e);process.exitCode=1;}
 finally{if(browser)await browser.close();}
 console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
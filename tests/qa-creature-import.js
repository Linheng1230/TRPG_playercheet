"use strict";
const assert=require("assert"),{chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const b=await chromium.launch({channel:"chrome",headless:true});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];
  async function clickImport(btn){
   const card=btn.locator("xpath=ancestor::details");
   if(!(await card.evaluate(e=>e.open)))await card.locator("summary").click();
   await btn.click();
  }

  p.on("pageerror",e=>errors.push(e.message));
  await p.goto(URL+"?qa=creature-import",{waitUntil:"networkidle"});
  if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
  await p.evaluate(()=>{
   window.confirm=()=>true;window.alert=()=>{};
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;S.sub=null;S.classLevels={"德魯伊":4};
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   S.familiar=null;
   go(8);refTab="creature";renderRef();
  });
  assert(await p.locator('button[data-pr-filter="cr"][data-pr-value="0"]').count(),"CR filter");
  assert(await p.locator('button[data-pr-filter="size"][data-pr-value="T"]').count(),"size filter");
  assert(await p.locator('button[data-pr-filter="type"][data-pr-value="beast"]').count(),"type filter");
  assert(await p.locator('button[data-pr-filter="type"][data-pr-value="other"]').count(),"special types normalized to one filter");
  assert(!(await p.locator('button[data-pr-filter="type"]').allTextContents()).some(x=>x.includes("{\'choose\'")),"no raw upstream object leaked as filter label");
  await p.locator('button[data-pr-filter="cr"][data-pr-value="0"]').click();
  await p.locator('button[data-pr-filter="size"][data-pr-value="T"]').click();
  await p.locator('button[data-pr-filter="type"][data-pr-value="beast"]').click();
  const filtered=await p.evaluate(()=>{
   const xs=[...document.querySelectorAll(".creature-card .pr-name")].map(n=>n.textContent.split("｜").at(-1).trim());
   return {xs,state:[creatureRefState.cr,[...creatureRefState.size],[...creatureRefState.type]]};
  });
  assert.equal(filtered.state[0],"0");
  assert(filtered.state[1].includes("T")&&filtered.state[2].includes("beast"));
  assert(filtered.xs.includes("Cat")&&!filtered.xs.includes("Imp"),"filters intersect");
  await p.locator('button[data-pr-filter="cr"][data-pr-value="all"]').click();
  await p.locator('button[data-pr-filter="size"][data-pr-value="all"]').click();
  await p.locator('button[data-pr-filter="type"][data-pr-value="all"]').click();
  const wolf=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Wolf"&&x.source==="XMM").id);
  const eagle=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Eagle"&&x.source==="XMM").id);
  assert(await p.locator('button[data-ci-import="wildShape"][data-ci-id="'+wolf+'"]').count(),"wild action");
  await clickImport(p.locator('button[data-ci-import="wildShape"][data-ci-id="'+wolf+'"]'));
  assert(await p.locator("#ciSheet").count(),"final sheet has creature section");
  await p.locator('[data-ci-open="1"]').click();
  const fromSheet=await p.evaluate(()=>({
   step:S.step,
   mode:[...creatureRefState.mode],
   druidLevel:creatureRefState.druidLevel,
   moon:creatureRefState.moon
  }));
  assert.equal(fromSheet.step,8,"character sheet quick link");
  assert.deepEqual(fromSheet.mode,["wildshape"],"character sheet directs to Druid forms");
  assert.equal(fromSheet.druidLevel,4,"Druid filter follows actual class level");
  await p.evaluate(()=>go(7));
  assert(await p.locator("#ciSheet").textContent().then(t=>t.includes("Wolf")),"imported wolf stat appears");
  let save=await p.evaluate(()=>JSON.parse(JSON.stringify(serialize())));
  assert(save.creatureLibrary.wildShape.includes(wolf)&&save.v===10,"save schema");
  await p.evaluate(save=>{deserialize(save);renderFinal();},save);
  assert(await p.evaluate(wolf=>S.creatureLibrary.wildShape.includes(wolf),wolf),"round-trip");
  const eligibility=await p.evaluate(eagle=>{
   const x=ZIZI_5R_CREATURES.find(x=>x.id===eagle);
   const before=CreatureImport5R.wildEligible(S,x);
   S.level=8;S.classLevels={"德魯伊":8};
   const after=CreatureImport5R.wildEligible(S,x);
   const lim=CreatureImport5R.wildLimit(S);
   return {before,after,lim};
  },eagle);
  assert.deepEqual(eligibility,{before:false,after:true,lim:8},"flight limits");
  const cap=await p.evaluate(()=>{
   S.level=2;S.classLevels={"德魯伊":2};S.sub=null;S.creatureLibrary.wildShape=[];
   const xs=ZIZI_5R_CREATURES.filter(x=>x.source==="XMM"&&CreatureImport5R.wildEligible(S,x)).slice(0,5);
   for(const x of xs)CreatureImport5R.add("wildShape",x.id,"");
   return {max:CreatureImport5R.wildLimit(S),count:S.creatureLibrary.wildShape.length};
  });
  assert.equal(cap.max,4);assert.equal(cap.count,4,"known-form cap");
  const moon=await p.evaluate(()=>{
   S.level=3;S.classLevels={"德魯伊":3};S.sub=PROG_2024["德魯伊"].subs.findIndex(x=>x.n==="月亮結社");
   const bear=ZIZI_5R_CREATURES.find(x=>x.name==="Brown Bear"&&x.source==="XMM");
   return {hasMoon:CreatureImport5R.wildEligible(S,bear),bear:bear?.name};
  });
  assert(moon.hasMoon,"moon higher CR");
  await p.evaluate(()=>{
   S.cls=CLASSES.find(x=>x.n==="遊俠");S.level=3;S.classLevels={"遊俠":3};
   S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獸王");
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};S.classChoices2024={};
   go(7);
  });
  await p.locator('[data-ci-open="1"]').click();
  const land=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Beast of the Land"&&x.source==="XPHB").id);
  assert(await p.locator('button[data-ci-import="companion"][data-ci-id="'+land+'"]').count(),"companion button");
  await clickImport(p.locator('button[data-ci-import="companion"][data-ci-id="'+land+'"]'));
  assert.equal(await p.evaluate(()=>S.classChoices2024["遊俠"].primalBeast),"大地野獸","uses original subclass choice");
  assert(await p.locator("#ciSheet").textContent().then(t=>t.includes("Beast of the Land")),"companion sheet");
  await p.evaluate(()=>{
   S.cls=CLASSES.find(x=>x.n==="法師");S.level=5;S.classLevels={"法師":5};S.sub=null;
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   go(7);
  });
  await p.locator('[data-ci-open="1"]').click();
  const skeleton=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Skeleton"&&x.source==="XMM").id);
  const sum= p.locator('button[data-ci-import="summon"][data-ci-id="'+skeleton+'"]');
  assert(await sum.count(),"spell summon reference");
  await clickImport(sum.first());
  assert(await p.evaluate(()=>S.creatureLibrary.summons.some(x=>x.creatureId.includes("skeleton")&&x.spell==="Animate Dead")),"summon saved");
  await p.evaluate(()=>{
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   go(8);refTab="creature";renderRef();
  });
  const cat=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Cat"&&x.source==="XMM").id);
  await clickImport(p.locator('button[data-ci-import="familiar"][data-ci-id="'+cat+'"]'));
  assert(await p.locator(".wf-selected").count(),"familiar usable by non-warlock spellcaster as reference");
  assert.equal(await p.evaluate(()=>S.familiar.creatureId),cat,"familiar existing save slot");
  const imp=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Imp"&&x.source==="XMM").id);
  assert(!await p.evaluate(imp=>CreatureImport5R.add("familiar",imp,""),imp),"chain-only imp rejected for wizard");
  await p.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="邪術師");S.level=3;S.classLevels={"邪術師":3};
   S.sub=null;S.invocations=new Set(["鎖鏈之契"]);S.familiar=null;
   go(7);
  });
  await p.locator('[data-ci-open="1"]').click();
  await clickImport(p.locator('button[data-ci-import="familiar"][data-ci-id="'+imp+'"]'));
  assert.equal(await p.evaluate(()=>S.familiar?.creatureId),imp,"pact chain imp imported from reference");
  const no14=await p.evaluate(()=>{
   S.ruleset="2014";syncRulesetUI();
   const original=S.familiar?.creatureId;
   const x=ZIZI_5R_CREATURES.find(x=>x.name==="Wolf"&&x.source==="XMM");
   const result=CreatureImport5R.add("wildShape",x.id,"");
   return {result,unchanged:S.familiar?.creatureId===original};
  });
  assert.equal(no14.result,false,"2014 branch must not use 2024 imported rules");
  assert(no14.unchanged,"2014 branch must not wipe older character data");
  const old=await p.evaluate(()=>{
   const data=serialize();delete data.creatureLibrary;data.v=9;
   deserialize(data);
   return S.creatureLibrary;
  });
  assert.deepEqual(old,{wildShape:[],summons:[],mounts:[]},"legacy migration");
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=1,"390px overflow "+overflow);
  assert.deepEqual(errors,[],"page errors");
  console.log(JSON.stringify({result:"PASS",filterCount:filtered.xs.length,wildShape:cap,moon,companion:"大地野獸",summon:"Animate Dead",familiar:"Cat",mobileOverflow:overflow}));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

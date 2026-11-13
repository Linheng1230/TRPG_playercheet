"use strict";
const assert=require("assert"),{chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const b=await chromium.launch({channel:"chrome",headless:true});
 try{
  const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];
  p.on("pageerror",e=>errors.push(e.message));
  await p.goto(URL+"?qa=mount-tiers",{waitUntil:"networkidle"});
  if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
  await p.evaluate(()=>{
   window.alert=()=>{};window.confirm=()=>true;
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="戰士");S.level=3;S.classLevels={"戰士":3};
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   go(8);refTab="creature";
   creatureRefState.q="";
   creatureRefState.mode=new Set(["player"]);
   creatureRefState.source.clear();creatureRefState.cr="all";
   creatureRefState.size.clear();creatureRefState.type.clear();renderRef();
  });
  const button=n=>p.locator('button[data-pr-filter="mode"][data-pr-value="'+n+'"]');
  const names=async()=>p.locator(".creature-card .pr-name").allTextContents().then(a=>a.map(s=>s.split("｜").pop().trim()));
  const ST=["Camel","Elephant","Draft Horse","Riding Horse","Mastiff","Mule","Pony","Warhorse"];
  await button("mount").click();
  assert.deepEqual(await p.evaluate(()=>[...creatureRefState.mode]),["mount"],"click clears default player preset");
  const all=await names();
  assert.equal(all.length,46,"all mount categories union to 46");
  for(const v of ST)assert(all.includes(v),"missing standard animal "+v);
  for(const v of ["Baboon","Badger","Bat","Awakened Shrub"])assert(!all.includes(v),"not mount "+v);
  assert.equal(all[0],"Camel","standard mounts sorted above special candidates");
  const note=await p.locator(".pr-note").allTextContents();
  assert(note.some(s=>s.includes("裝備表 8 種")&&s.includes("至少大一級")&&s.includes("受訓")),"conditions and sourcing visible");
  await button("mountStandard").click();
  assert.deepEqual(await p.evaluate(()=>[...creatureRefState.mode]),["mountStandard"],"specific tier replaces broad union");
  const standard=await names();
  assert.deepEqual([...standard].sort(),[...ST].sort(),"exact PHB table names, including 3 Medium standard animals");
  const metadata=await p.locator(".creature-card .pr-meta").allTextContents();
  assert.equal(metadata.filter(s=>s.includes("中型")).length,3,"3 medium standard animals");
  assert(metadata.every(s=>s.includes("大型")||s.includes("巨型")||s.includes("中型")));
  for(const v of ["Mastiff","Mule","Pony"]){
   const card=p.locator(".creature-card").filter({has:p.locator(".pr-name", {hasText:"｜"+v})});
   const tags=await card.locator(".pr-tags").textContent();
   assert(tags.includes("限小型以下騎乘者"),"medium mount rider limit "+v);
  }
  assert.equal(await p.locator(".pr-standard-mount").count(),8,"distinguish standard mounts visually");
  await p.locator(".pr-list").screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-mount-tiers-standard-mobile.png"});
  await button("mountSpell").click();
  assert.deepEqual([...(await names())].sort(),[...ST,"Otherworldly Steed"].sort(),"standard + spell are a true multi-select union");
  assert.deepEqual((await p.evaluate(()=>[...creatureRefState.mode])).sort(),["mountSpell","mountStandard"],"tier multi selection");
  await button("mountStandard").click();
  assert.deepEqual(await names(),["Otherworldly Steed"],"spell tier stands alone");
  await button("mountSpecial").click();
  let two=await names();assert.equal(two.length,38,"spell + 37 special");
  await button("mountSpell").click();
  const special=await names();
  assert.equal(special.length,37,"37 special Large+ Beasts");
  assert(special.includes("Giant Spider")&&special.includes("Giant Fly"));
  assert(!special.includes("Warhorse")&&!special.includes("Mastiff")&&!special.includes("Otherworldly Steed"));
  await button("mount").click();
  assert.deepEqual(await p.evaluate(()=>[...creatureRefState.mode]),["mount"],"all mounts resets narrower tiers");
  await button("mountStandard").click();
  const ponyId=await p.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Pony"&&x.source==="XMM").id);
  const importBtn=p.locator('button[data-ci-import="mount"][data-ci-id="'+ponyId+'"]');
  assert.equal(await importBtn.count(),1,"medium standard mount can be imported");
  const detail=importBtn.locator("xpath=ancestor::details");
  if(!(await detail.evaluate(el=>el.open)))await detail.locator("summary").click();
  await importBtn.click();
  const state=await p.evaluate(id=>({stored:S.creatureLibrary.mounts.includes(id),exported:serialize().creatureLibrary.mounts.includes(id),step:S.step}),ponyId);
  assert.deepEqual(state,{stored:true,exported:true,step:7},"import and save mounts");
  const saved=await p.evaluate(()=>JSON.parse(JSON.stringify(serialize())));
  await p.evaluate(blob=>{deserialize(blob);renderFinal();},saved);
  assert(await p.evaluate(id=>S.creatureLibrary.mounts.includes(id),ponyId),"medium mount survives JSON roundtrip");
  assert((await p.locator("#ciSheet").textContent()).includes("Pony"),"final sheet lists imported standard mount");
  await p.evaluate(()=>{go(8);refTab="creature";creatureRefState.mode=new Set(["mountStandard"]);renderRef()});
  for(const width of [390,480,1440]){
   await p.setViewportSize({width,height:844});
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=1,"horizontal overflow "+width+"="+overflow);
  }
  assert.deepEqual(errors,[],"browser errors");
  console.log(JSON.stringify({result:"PASS",all:all.length,standard:standard.length,spell:1,special:special.length,medium:3,stored:state.stored}));
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});

"use strict";
const assert=require("assert"),{chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL+"?qa=wildshape-reasons",{waitUntil:"networkidle"});
  await page.evaluate(()=>{
   document.getElementById("rulesetModal")?.classList.remove("open");
   window.alert=message=>{window.__lastAlert=message;};
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="德魯伊");
   S.level=4;S.classLevels={"德魯伊":4};S.sub=null;
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   go(8);refTab="creature";
   creatureRefState.mode=new Set(["wildshape"]);
   creatureRefState.source=new Set();creatureRefState.cr="all";
   creatureRefState.size=new Set();creatureRefState.type=new Set();
   creatureRefState.druidLevel=8;creatureRefState.moon=false;
   renderRef();
  });
  const id=async name=>page.evaluate(name=>ZIZI_5R_CREATURES.find(x=>x.name===name&&x.source===(name==="Giant Fly"?"XDMG":"XMM"))?.id,name);
  async function note(name){
   const n=await id(name);
   const wrap=page.locator('.ci-quick-action:has(button[data-ci-id="'+n+'"])');
   assert(await wrap.isVisible(),name+" must have a visible short reason");
   const button=wrap.locator('button[data-ci-id="'+n+'"]');
   assert(await button.isDisabled(),name+" cannot import yet");
   const text=(await wrap.locator('.ci-quick-reason').innerText()).trim();
   assert(text.length<=45,"keep concise: "+name+" "+text);
   assert(!text.includes("等級／結社不符合"),"do not use generic reason: "+text);
   return text;
  }
  const bat=await note("Bat");
  const fly=await note("Giant Fly");
  assert.equal(bat,"有飛行速度，需德魯伊 8 級");
  assert.equal(fly,bat,"Large Giant Fly is blocked by flying, not its size");
  assert(!fly.includes("大型")&&!fly.includes("坐騎"),"size is not a Wild Shape prohibition");
  const wolfId=await id("Wolf");
  assert(await page.locator('.ci-quick-action button[data-ci-id="'+wolfId+'"]').isEnabled());
  await page.evaluate(()=>{creatureRefState.moon=true;creatureRefState.druidLevel=4;renderRef();});
  const bear=await note("Brown Bear");
  assert.equal(bear,"CR 1：一般需 8 級／月亮結社 3 級");
  await page.evaluate(()=>{creatureRefState.druidLevel=6;renderRef();});
  const boar=await note("Giant Boar");
  assert.equal(boar,"CR 2，僅月亮結社 6 級以上");
  await page.evaluate(()=>{
   S.sub=PROG_2024["德魯伊"].subs.findIndex(x=>x.n==="月亮結社");
   S.level=3;S.classLevels={"德魯伊":3};renderRef();
  });
  const boarMoon=await note("Giant Boar");
  assert.equal(boarMoon,"CR 2，月亮結社需 6 級");
  await page.evaluate(()=>{creatureRefState.druidLevel=8;renderRef();});
  const moonBat=await note("Bat");
  assert.equal(moonBat,"有飛行速度，需德魯伊 8 級");
  const bearId=await id("Brown Bear");
  assert(await page.locator('.ci-quick-action button[data-ci-id="'+bearId+'"]').isEnabled(),"Moon Druid at 3 can use CR1");
  await page.evaluate(()=>{S.level=8;S.classLevels={"德魯伊":8};renderRef();});
  assert(await page.locator('.ci-quick-action button[data-ci-id="'+await id("Bat")+'"]').isEnabled(),"fly available at lv8");
  await page.evaluate(()=>{S.level=1;S.classLevels={"德魯伊":1};S.sub=null;renderRef();});
  const noFeature=await note("Wolf");
  assert.equal(noFeature,"需德魯伊 2 級");
  await page.evaluate(()=>{S.cls=null;renderRef();});
  const missing=await note("Wolf");
  assert.equal(missing,"請先建立或讀取德魯伊角色");
  await page.evaluate(()=>{
   S.cls=CLASSES.find(x=>x.n==="德魯伊");
   S.ruleset="2014";syncRulesetUI();renderRef();
  });
  const legacy=await note("Wolf");
  assert.equal(legacy,"目前僅支援 2024 德魯伊");
  const overflows=[];
  for(const width of [390,480,1440]){
   await page.setViewportSize({width,height:900});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=1,"horizontal overflow "+width+" "+overflow);
   overflows.push([width,overflow]);
  }
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;S.classLevels={"德魯伊":4};
   S.sub=null;creatureRefState.druidLevel=8;creatureRefState.moon=false;renderRef();
  });
  const shot=page.locator('.ci-quick-action:has(button[data-ci-id="'+await id("Giant Fly")+'"])');
  await shot.screenshot({path:"D:/Tools/zizi-ai-runtime/wildshape-shortreason-giantfly-390.png"});
  assert.deepEqual(errors,[],"no page errors");
  console.log(JSON.stringify({result:"PASS",bat,fly,bear,boar,boarMoon,moonBat,noFeature,missing,legacy,overflows}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

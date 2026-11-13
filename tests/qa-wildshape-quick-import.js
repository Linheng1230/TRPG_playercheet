"use strict";
const {chromium}=require("playwright"),assert=require("assert");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 try{
  await page.goto(URL+"?qa=wildshape-quick",{waitUntil:"networkidle"});
  await page.evaluate(()=>{
   document.getElementById("rulesetModal")?.classList.remove("open");
   window.alert=msg=>{window.__lastAlert=msg;};
   window.confirm=()=>true;
   S.ruleset="2024";syncRulesetUI();
   S.cls=null;S.level=4;S.classLevels={};
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   go(8);refTab="creature";
   creatureRefState.mode=new Set(["wildshape"]);
   creatureRefState.source=new Set(["XMM"]);
   creatureRefState.druidLevel=4;creatureRefState.moon=false;
   renderRef();
  });
  const moon=page.locator('button[data-pr-filter="moon"][data-pr-value="moon"]');
  const base=page.locator('button[data-pr-filter="moon"][data-pr-value="base"]');
  assert.equal(await moon.count(),1,"Moon must be a visible pressable button");
  assert.equal(await base.count(),1,"ordinary druid should be explicit alternative");
  assert.equal(await page.locator("#creatureMoon").count(),0,"the tiny disconnected checkbox is gone");
  assert.equal(await base.getAttribute("aria-pressed"),"true");
  const bearId=await page.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Brown Bear"&&x.source==="XMM").id);
  assert.equal(await page.locator('.pr-quick-wrap button[data-ci-id="'+bearId+'"]').count(),0,"ordinary druid should not include brown bear at level 4");
  await moon.click();
  assert.equal(await moon.getAttribute("aria-pressed"),"true","moon style persists");
  assert.equal(await base.getAttribute("aria-pressed"),"false");
  const bear=page.locator('.pr-quick-wrap button[data-ci-id="'+bearId+'"]');
  assert.equal(await bear.count(),1,"Moon displays eligible shape in list");
  assert(await bear.isVisible(),"import action must be visible without expanding details");
  assert(await bear.isDisabled(),"without a character, import should show disabled with reason");
  assert((await bear.locator("xpath=..").textContent()).includes("請先建立或讀取德魯伊角色"));
  assert(!(await page.locator('.pr-quick-wrap:has(button[data-ci-id="'+bearId+'"]) details').evaluate(x=>x.open)),"creature details remain collapsed");
  const moonCss=await moon.evaluate(e=>({box:e.getBoundingClientRect().toJSON(),background:getComputedStyle(e).backgroundColor,fontWeight:getComputedStyle(e).fontWeight}));
  assert(+moonCss.fontWeight>=700,"moon button bold enough");
  await page.locator(".pr-moon-picker").screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-wildshape-moon-filter-390.png"});
  await bear.locator("xpath=..").screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-wildshape-quick-disabled-390.png"});
  await page.evaluate(()=>{
   S.cls=CLASSES.find(x=>x.n==="德魯伊");
   S.level=4;S.classLevels={"德魯伊":4};
   S.sub=PROG_2024["德魯伊"].subs.findIndex(x=>x.n==="月亮結社");
   renderRef();
  });
  const enabledBear=page.locator('.pr-quick-wrap button[data-ci-id="'+bearId+'"]');
  assert(await enabledBear.isEnabled(),"Moon druid at level 4 can import bear");
  await enabledBear.screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-wildshape-quick-enabled-390.png"});
  await enabledBear.click();
  const store=await page.evaluate(id=>({step:S.step,has:S.creatureLibrary.wildShape.includes(id),saved:serialize().creatureLibrary.wildShape.includes(id)}),bearId);
  assert.deepStrictEqual(store,{step:7,has:true,saved:true},"click must import and navigate");
  const saved=await page.evaluate(()=>JSON.parse(JSON.stringify(serialize())));
  await page.evaluate(data=>{deserialize(data);renderFinal();},saved);
  assert(await page.evaluate(id=>S.creatureLibrary.wildShape.includes(id),bearId),"reload retains imported shape");
  await page.evaluate(()=>{
   S.cls=CLASSES.find(x=>x.n==="德魯伊");
   S.level=4;S.classLevels={"德魯伊":4};S.sub=null;
   S.creatureLibrary={wildShape:[],summons:[],mounts:[]};
   go(8);refTab="creature";
   creatureRefState.moon=false;creatureRefState.mode=new Set(["wildshape"]);
   renderRef();
  });
  const wolfId=await page.evaluate(()=>ZIZI_5R_CREATURES.find(x=>x.name==="Wolf"&&x.source==="XMM").id);
  const wolfBtn=page.locator('.pr-quick-wrap button[data-ci-id="'+wolfId+'"]');
  assert(await wolfBtn.isVisible() && await wolfBtn.isEnabled(),"base Druid Wolf import in collapsed list");
  assert(!(await wolfBtn.locator("xpath=../preceding-sibling::details").evaluate(e=>e.open)),"wolf details still collapsed");
  await wolfBtn.click();
  assert(await page.evaluate(id=>S.creatureLibrary.wildShape.includes(id),wolfId),"base druid wolf imported directly");
  const overflows=[];
  for(const width of [390,480,1440]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{go(8);refTab="creature";creatureRefState.mode=new Set(["wildshape"]);renderRef();});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   overflows.push({width,overflow});
   assert(overflow<=1,"no horizontal overflow at "+width);
  }
  assert.deepEqual(errors,[],"no browser exceptions");
  console.log(JSON.stringify({result:"PASS",moonCss,store,overflows}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

"use strict";
const assert=require("assert");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL+"?qa=mount-filter",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>{
   go(8);refTab="creature";renderRef();
   creatureRefState.q="";creatureRefState.mode=new Set(["player"]);
   creatureRefState.source.clear();creatureRefState.cr="all";
   creatureRefState.size.clear();creatureRefState.type.clear();renderRef();
  });
  const button=val=>page.locator('button[data-pr-filter="mode"][data-pr-value="'+val+'"]');
  const names=async()=>page.locator(".creature-card .pr-name").allTextContents();
  assert.equal(await button("player").getAttribute("aria-pressed"),"true");
  const initial=await names();assert(initial.length>50,"players show many reference options");
  await button("mount").click();
  const mode=await page.evaluate(()=>[...creatureRefState.mode]);
  assert.deepEqual(mode,["mount"],"mount selection clears default player preset");
  assert.equal(await button("player").getAttribute("aria-pressed"),"false");
  assert.equal(await button("mount").getAttribute("aria-pressed"),"true");
  const mountRows=await names();
  assert(mountRows.length>0&&mountRows.length<60,"mount list finite not mixed with all player options");
  for(const name of ["Baboon","Badger","Bat","Awakened Shrub"]){
   assert(!mountRows.some(n=>n.includes("｜"+name)),name+" wrongly included as mount");
  }
  assert(mountRows.some(n=>n.includes("｜Warhorse")),"warhorse listed");
  assert(mountRows.some(n=>n.includes("｜Otherworldly Steed")),"Find Steed retained");
  assert(mountRows.some(n=>n.includes("｜Giant Fly")),"canonical large mount candidate retained for DM adjudication");
  const meta=await page.locator(".creature-card .pr-meta").allTextContents();
  assert(meta.every(t=>t.includes("大型")||t.includes("巨型")),"no Medium, Small, or Tiny among generic candidates");
  const note=await page.locator(".pr-note").allTextContents();
  assert(note.some(s=>s.includes("比騎乘者至少大一級")&&s.includes("DM")),"mount rule + DM anatomy gate explained");
  await page.screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-mount-filter-20261113-mobile.png",fullPage:false});
  await button("mount").click();
  assert.deepEqual(await page.evaluate(()=>[...creatureRefState.mode]),["player"],"toggle off restores player preset, not all monsters");
  await button("mount").click();
  await button("wildshape").click();
  assert.deepEqual(await page.evaluate(()=>[...creatureRefState.mode]).then(a=>a.sort()),["mount","wildshape"].sort(),"explicit compound categories still supported");
  await button("player").click();
  assert.deepEqual(await page.evaluate(()=>[...creatureRefState.mode]),["player"],"player preset resets compound selection");
  await button("all").click();
  assert.deepEqual(await page.evaluate(()=>[...creatureRefState.mode]),[],"all works independently");
  await button("mount").click();
  assert.deepEqual(await page.evaluate(()=>[...creatureRefState.mode]),["mount"],"all to mount works");
  for(const size of [390,480,1440]){
   await page.setViewportSize({width:size,height:844});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=1,"no horizontal overflow "+size+"="+overflow);
  }
  assert.deepEqual(errors,[],"no browser errors");
  console.log(JSON.stringify({result:"PASS",initial:initial.length,mounts:mountRows.length,mode,excludes:["Baboon","Badger","Bat","Awakened Shrub"],overflows:[390,480,1440]}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

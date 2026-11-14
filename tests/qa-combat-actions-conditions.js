"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright"),path=require("node:path"),fs=require("node:fs");
const {pathToFileURL}=require("node:url");
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe"});
 try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  const page=await ctx.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  const base=path.resolve(__dirname,".."),url=process.env.QA_BASE?process.env.QA_BASE+"/index.html":pathToFileURL(path.join(base,"index.html")).href;
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof renderRef==="function"&&typeof go==="function",{timeout:30000});
  await page.waitForTimeout(300);
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>go(8));
  const tabs=page.locator("#refTabs button");
  assert.equal(await tabs.count(),10,"existing eight tabs plus two new");
  assert.equal(await page.locator('#refTabs [data-r="actions"]').innerText(),"行動教學");
  assert.equal(await page.locator('#refTabs [data-r="conditions"]').innerText(),"狀態");
  const bounds=await tabs.evaluateAll(xs=>xs.map(x=>{const a=x.getBoundingClientRect();return {w:a.width,h:a.height,left:a.left,right:a.right,scroll:x.scrollWidth,client:x.clientWidth}}));
  assert(bounds.every(x=>x.h>=44&&x.left>=-1&&x.right<=392&&x.scroll<=x.client+1),JSON.stringify(bounds));
  await page.locator('#refTabs [data-r="actions"]').click();
  const panel=page.locator("#refBody [data-combat-actions]");
  assert.equal(await panel.locator("#rc-action + .rc-grid details").count(),12,"12 core actions");
  assert.match(await panel.innerText(),/附贈動作|反應|免費物件互動/);
  for(const term of ["攻擊","疾行","撤離","閃避","協助","躲藏","影響","魔法","準備","搜尋","研究","使用物品"]){
   assert(await panel.locator("#rc-action + .rc-grid summary").allTextContents().then(xs=>xs.some(x=>x.includes(term))),term);
  }
  assert.match(await panel.innerText(),/反應：藉機攻擊/);
  assert.match(await panel.innerText(),/反應：準備動作/);
  assert.match(await panel.innerText(),/反應：法術／特性/);
  await panel.locator("#rc-action + .rc-grid summary").filter({hasText:"協助"}).click();
  assert.match(await panel.innerText(),/力量|DC 10|感知/);
  const navTop=await panel.locator('.rc-jump a[href="#rc-reaction"]').boundingBox();
  assert(navTop&&navTop.height>=44,"jump targets");
  await page.locator('#refTabs [data-r="conditions"]').click();
  const state=page.locator("#refBody [data-combat-conditions]");
  assert.equal(await state.locator("details").count(),8,"default common conditions");
  assert.match(await state.innerText(),/倒地/);assert.match(await state.innerText(),/目盲/);assert.match(await state.innerText(),/束縛/);
  assert.match(await state.innerText(),/5 呎內攻擊者/,"collapsed cards show immediate effects");
  const prone=state.locator("details").first();
  assert.equal(await prone.isVisible(),true);
  await prone.locator("summary").click();
  assert.match(await prone.innerText(),/速度的一半/);
  await state.locator('[data-combat-condition-filter="all"]').click();
  assert.equal(await state.locator("details").count(),15,"all 15 official 2024 conditions");
  for(const key of ["目盲","震懾","昏迷","石化","耳聾","隱形","力竭"]){
   assert(await state.locator("details summary").allTextContents().then(xs=>xs.some(x=>x.includes(key))),key);
  }
  await state.locator('[data-combat-condition-filter="hazard"]').click();
  assert.equal(await state.locator("details").count(),3,"burning, bleeding, bloodied separated");
  assert.match(await state.innerText(),/燃燒/);assert.match(await state.innerText(),/1d4/);
  assert.match(await state.innerText(),/流血/);assert.match(await state.innerText(),/沒有通用/);
  await state.locator('details').first().locator("summary").click();
  assert.match(await state.innerText(),/翻滾滅火/);
  await page.locator('#refTabs [data-r="tool"]').click();
  assert(await page.locator("#refBody").innerText().then(s=>s.length>50),"original tool quick ref preserved");
  await page.locator('#refTabs [data-r="conditions"]').click();
  const sizes=[360,390,480,1440];for(const width of sizes){
   await page.setViewportSize({width,height:width>700?900:844});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"no global overflow at "+width);
   const fit=await tabs.evaluateAll(xs=>xs.filter(x=>!x.hidden).every(x=>{const a=x.getBoundingClientRect();return a.width>=90&&a.height>=44&&a.left>=-1&&a.right<=innerWidth+2}));
   assert(fit,"reference tabs fit, readable at "+width);
  }
  await page.setViewportSize({width:390,height:844});
  fs.mkdirSync(path.join(base,"tmp"),{recursive:true});
  await page.screenshot({path:path.join(base,"tmp","qa-ref-conditions-mobile-390.png")});
  assert.deepEqual(errors,[],"browser errors");
  console.log("PASS combat reference E2E: 10 tabs, 12 actions, reaction+bonus+free, 15 statuses, 3 hazards, filtered, 360/390/480/1440, old tool tab");
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
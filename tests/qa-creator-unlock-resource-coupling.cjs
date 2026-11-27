const assert=require("node:assert/strict"),path=require("node:path"),{pathToFileURL}=require("node:url"),{chromium}=require("playwright");
const base=process.env.QA_URL||pathToFileURL(path.resolve(__dirname,"../index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{...(process.platform==="win32"?{channel:"chrome"}:{})}:{})});
 try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
  await page.goto(base,{waitUntil:"networkidle"});if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>{
   resetAll();S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="遊俠");S.bg=BACKGROUNDS.find(x=>x.n==="隱士");S.sp=SPECIES.find(x=>x.n==="矮人");S.classConfirmed=true;S.bgConfirmed=true;S.spConfirmed=true;
   S.base={str:10,dex:15,con:14,int:10,wis:15,cha:8};S.level=5;S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],magicItems:[],magicAttuned:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};renderFinal();go(14);
  });
  await page.locator('[data-classgear="A"]').click();await page.locator('[data-bggear="B"]').click();
  const pane=page.locator("[data-starting-resources-2024]");assert.equal(await pane.count(),1);
  assert.equal(await page.evaluate(()=>S.gear.gold.gp),57);
  const g=pane.locator("input[type=number]").first();await g.fill("5");await g.press("Tab");
  const common=await page.evaluate(()=>ZIZI_5R_MAGIC_ITEMS.find(x=>x.rarity==="common").id);
  const staff="staff-of-the-python|xdmg",slots=pane.locator(".sr5-slot"),c=slots.nth(0),u=slots.nth(1);
  await c.locator("select").first().selectOption("choose");await c.locator("select").last().selectOption(common);
  assert.equal(await u.locator("select").nth(1).inputValue(),"armaments");
  await u.locator("select").nth(1).selectOption("relics");const d100=u.locator("input[type=number]");await d100.fill("88");await d100.press("Tab");
  // Synthetic local test table, not published or represented as official.
  const alternative=await page.evaluate(()=>ZIZI_5R_MAGIC_ITEMS.find(x=>x.rarity==="uncommon"&&x.id!=="staff-of-the-python|xdmg").id);
  await pane.locator("details summary").click();
  await pane.locator("input[type=file]").setInputFiles({name:"synthetic-test.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({tables:{"relics:uncommon":[{min:1,max:85,id:alternative},{min:86,max:90,id:staff},{min:91,max:100,id:alternative}]}}))});
  await page.waitForFunction(()=>document.querySelector(".sr5-slot:last-child")?.textContent.includes("已使用本機表查詢"));
  assert.equal(await u.locator("select").last().locator("option").count(),2);
  assert.equal(await u.locator("select").last().inputValue(),staff,"exact row is auto-selected after authorized local import");
  assert(await pane.getByRole("button",{name:"DM 已同意，確認領取額外資源"}).isEnabled());
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=3,"overflow");
  if(process.env.QA_SCREENSHOT_DIR)await pane.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,"starting-resources-"+width+".png")});
  await pane.getByRole("button",{name:"DM 已同意，確認領取額外資源"}).click();
  const snap=await page.evaluate(()=>serialize());
  assert.equal(snap.gear.gold.gp,682);assert.equal(snap.gear.magicItems.find(x=>x.id===staff).qty,1);assert.equal(snap.gear.magicItems.find(x=>x.id===common).qty,1);
  assert.deepEqual(snap.gear.magicAttuned,[]);assert.equal(snap.gear.startingResources2024.records[1].verification,"local-table");
  assert.equal(await pane.getByRole("button",{name:"DM 已同意，確認領取額外資源"}).count(),0);
  await page.locator("[data-startgear-final]").click();await page.locator("#nextGear").click();
  assert.equal(await page.locator("#finalSheet .pr-magic-owned").count(),2);
  await page.evaluate(()=>{saveCurrent(true)});await page.reload({waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  // read saved snapshot and load the actual existing serializer path
  await page.evaluate(id=>{loadChar(id);go(14)},snap.id);
  assert.equal(await page.evaluate(()=>S.gear.gold.gp),682);
  await page.locator("[data-startgear-reopen]").click();
  assert.equal(await pane.getByRole("button",{name:"DM 已同意，確認領取額外資源"}).count(),0);
  assert.equal(await page.evaluate(()=>S.gear.magicItems.find(x=>x.id==="staff-of-the-python|xdmg").qty),1);
  const beforeCorrection=await page.evaluate(()=>serialize());
  await page.evaluate(()=>go(0));
  await page.locator('.step-panel.active [data-creator-unlock="class"]').click();
  await page.locator('[data-class-name="戰士"]').click();
  await page.locator('.step-panel.active .class-confirm-controls button.btn-next').click();
  const changed=await page.evaluate(()=>serialize());
  assert.equal(changed.cls,"戰士");assert.equal(changed.level,5);assert.equal(changed.id,snap.id);
  assert.deepEqual(changed.gear.startingResources2024,beforeCorrection.gear.startingResources2024);
  assert.equal(changed.gear.gold.gp,675,"only old seven GP class grant removed");
  assert.equal(changed.gear.magicItems.find(x=>x.id===staff).qty,1);
  assert(!changed.gear.classPackage24);assert.equal(changed.gear.bgPackage24,beforeCorrection.gear.bgPackage24);
  await page.evaluate(()=>go(14));
  await page.locator('[data-classgear="B"]').click();
  const afterNew=await page.evaluate(()=>serialize());
  assert.equal(afterNew.gear.magicItems.find(x=>x.id===staff).qty,1);
  assert.deepEqual(afterNew.gear.startingResources2024,beforeCorrection.gear.startingResources2024);
  assert.equal(await pane.getByRole("button",{name:"DM 已同意，確認領取額外資源"}).count(),0);
  const beforeBackground=await page.evaluate(()=>serialize());
  await page.evaluate(()=>go(1));
  await page.locator('.step-panel.active [data-creator-unlock="bg"]').click();
  await page.locator('[data-step="1"] .pick-card').filter({hasText:"士兵"}).first().click();
  const bgBeforeConfirm=await page.evaluate(()=>serialize());
  assert.equal(bgBeforeConfirm.bg,"士兵");assert.equal(bgBeforeConfirm.level,5);assert.equal(bgBeforeConfirm.id,snap.id);
  assert.deepEqual(bgBeforeConfirm.gear.startingResources2024,beforeBackground.gear.startingResources2024);
  assert.equal(bgBeforeConfirm.gear.magicItems.find(x=>x.id===staff).qty,1);
  assert.equal(bgBeforeConfirm.gear.gold.gp,beforeBackground.gear.gold.gp-50);
  assert.equal(bgBeforeConfirm.gear.classPackage24,beforeBackground.gear.classPackage24);
  assert(!bgBeforeConfirm.gear.bgPackage24);
  console.log("PASS background correction after resources",width,"receipt retained, background grant rolled back only");
  console.log("PASS class correction after resources",width,"retain level, receipt, items; class grant rollback only; no duplicate resources");
  assert.deepEqual(errors,[]);
  console.log("PASS",width,"gold +625; canonical staff/common; actual gear buttons; local table lookup; final sheet; persisted reload; no second grant; no overflow");
  await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});

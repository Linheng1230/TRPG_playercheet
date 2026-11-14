"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18766").replace(/\/$/,"");
const cases=[{ruleset:"2024",width:390,height:844},{ruleset:"2014",width:1440,height:900}];
async function navigateCreationStep(page,i){
  const toggle=page.locator("#stepNav .nav-ux-steps-toggle");
  if(await toggle.count()){
   if((await toggle.getAttribute("aria-expanded"))!=="true")await toggle.click();
  }
  const step=page.locator("#stepNav .nav-secondary button").nth(i);
  await step.click();
}
async function acceptNextConfirm(page,locator){
 let confirmed=false;
 page.once("dialog",async d=>{confirmed=d.type()==="confirm";await d.accept()});
 await locator.click();
 assert(confirmed,"real confirmation dialog must appear");
}
async function runCase(browser,{ruleset,width,height}){
 const context=await browser.newContext({viewport:{width,height},acceptDownloads:true,reducedMotion:"reduce"});
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const uniqueName="UX-QA-"+ruleset+"-"+width;
 const result=await page.goto(base+"/index.html?live-ux-c="+ruleset+"-"+width,{waitUntil:"domcontentloaded"});
 assert.equal(result.status(),200,"site must answer 200");
 await page.waitForTimeout(380); // initial ruleset modal appears shortly after first visit
 if(!(await page.locator("#rulesetModal.open").count()))await page.locator("#btnRuleset").click();
 await page.locator('[data-ruleset="'+ruleset+'"]').click();
 await page.locator('#classGrid [data-class-name="戰士"]').click();
 await acceptNextConfirm(page,page.locator("[data-step='0'] .class-confirm-controls button"));
 await navigateCreationStep(page,1);
 await page.locator("#bgGrid .pick-card").filter({hasText:"隱士"}).first().click();
 if(ruleset==="2014")await page.locator('[data-bg14="lang1"]').selectOption({index:1});
 await acceptNextConfirm(page,page.locator(".confirm-bg button"));
 await page.locator("#spGrid .pick-card").filter({hasText:ruleset==="2014"?"提夫林":"矮人"}).first().click();
 await acceptNextConfirm(page,page.locator(".confirm-sp button"));
 await navigateCreationStep(page,2);
 for(const [key,value] of [["str","15"],["dex","14"],["con","13"],["int","12"],["wis","10"],["cha","8"]]){
  await page.locator('#abilityGrid select[data-ab="'+key+'"]').selectOption(value);
 }
 if(ruleset==="2024"){
  await page.locator('[data-bk="b2"]').selectOption("wis");
  await page.locator('[data-bk="b1"]').selectOption("con");
 }
 await acceptNextConfirm(page,page.locator("#confirmAbilities"));
 await navigateCreationStep(page,3);
 for(let i=0;i<2;i++){
  const choice=page.locator("#skillGrid .skill-chip:not(:disabled):not(.selected)").first();
  assert(await choice.isVisible(),"player must be able to choose skill "+i);
  await choice.click();
 }
 await acceptNextConfirm(page,page.locator(".confirm-skills button"));
 await navigateCreationStep(page,4);
 await page.locator("#fName").fill(uniqueName);
 await page.locator("#fPlayer").fill("網站 UX 驗收");
 await page.locator("#stepNav .nav-primary button").filter({hasText:"角色卡"}).click();
 const sheet=page.locator("#finalSheet");
 assert(await sheet.isVisible(),"character sheet accessible by real global nav click");
 assert((await sheet.locator(".fs-name").textContent()).includes(uniqueName),"real typed name reaches character sheet");
 assert.equal(await sheet.locator(".fs-abrow .ab-box").count(),6,"six generated ability boxes");
 assert.equal(await sheet.locator(".fs-statrow .stat-box").count(),6,"six combat stats");
 const mods=await sheet.locator(".fs-abrow .am").allInnerTexts();
 assert(mods.every(v=>v!=="—"),"ability modifiers should not be blank");
 await sheet.locator(".fs-abrow .ab-source").first().locator("summary").click();
 assert(await sheet.locator(".fs-abrow .ab-source").first().evaluate(el=>el.open),"source breakdown opens via click");
 await page.locator('#finalJumpNav [data-sheet-jump="equipment"]').click();
 assert.equal(await page.locator("#finalJumpNav [aria-current='location']").getAttribute("data-sheet-jump"),"equipment");
 const acBefore=Number((await sheet.locator(".fs-statrow .stat-box").nth(1).locator(".sv").innerText()).trim());
 await sheet.locator("#shieldChk").check();
 const acAfter=Number((await sheet.locator(".fs-statrow .stat-box").nth(1).locator(".sv").innerText()).trim());
 assert.equal(acAfter,acBefore+2,"equipment change updates canonical AC in role sheet");
 const toolbar=page.locator('.step-panel[data-step="7"] .fs-toolbar');
 const exports=toolbar.locator(".fs-export-options");
 await exports.locator("summary").click();
 assert(await exports.evaluate(el=>el.open),"collapsed export menu opens by click");
 const [download]=await Promise.all([page.waitForEvent("download",{timeout:20000}),exports.locator("button").filter({hasText:"匯出 JSON"}).click()]);
 assert(download.suggestedFilename().endsWith(".json"),"real export produces JSON download");
 await toolbar.locator('[data-go="11"]').click();
 assert(await page.locator('.step-panel[data-step="11"].active').count(),"run-status action switches view");
 await page.locator("#stepNav .nav-primary button").filter({hasText:"角色卡"}).click();
 assert((await page.locator("#finalSheet .fs-name").textContent()).includes(uniqueName),"return keeps character");
 await toolbar.locator('[data-go="5"]').click();
 assert(await page.locator('.step-panel[data-step="5"].active').count(),"level-up action switches view");
 await page.locator("#stepNav .nav-primary button").filter({hasText:"角色卡"}).click();
 await page.emulateMedia({media:"print"});
 assert.equal(await toolbar.evaluate(el=>getComputedStyle(el).display),"none","print hides action toolbar");
 await page.emulateMedia({media:"screen"});
 const metrics=await page.locator("#finalSheet").evaluate(el=>({sheetWidth:Math.round(el.getBoundingClientRect().width),viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth}));
 assert(metrics.overflow<=2,"no horizontal scroll in real user flow "+JSON.stringify(metrics));
 assert.deepEqual(errors,[],"no runtime exceptions");
 const screenshot=path.join(__dirname,"..","tmp","qa-final-sheet-ux","real-ui-"+ruleset+"-"+width+".png");
 fs.mkdirSync(path.dirname(screenshot),{recursive:true});
 await page.screenshot({path:screenshot,fullPage:false});
 console.log("PASS REAL-UI final-sheet "+ruleset+" "+width+"px: choose class/origin/stats/skills, confirm, card, AC, JSON export, run-state and level-up, print");
 await context.close();
}
(async()=>{const browser=await chromium.launch({headless:true});try{for(const c of cases)await runCase(browser,c)}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

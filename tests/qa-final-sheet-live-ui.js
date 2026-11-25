"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18766").replace(/\/$/,"");
const folio=process.env.QA_FOLIO==="1";
const cases=[{ruleset:"2024",width:390,height:844},{ruleset:"2014",width:1440,height:900}];
if(folio)cases.push({ruleset:"2024",width:1440,height:900});
async function navigateCreationStep(page,i){
  // Follow the visible Next button, as a new player would. The optional
  // "創角步驟" menu is collapsed by default and must not gate this workflow.
  let active=Number(await page.locator(".step-panel.active").getAttribute("data-step"));
  assert(active<=i,"Creator advanced past the requested step "+i);
  // Some legacy confirmation paths return to the class step. Follow every
  // visible Next control again rather than assuming which step is still active.
  while(active<i){
   const next=page.locator("#next"+active);
   assert(await next.isVisible(),"Next button must be visible on creator step "+active);
   assert(await next.isEnabled(),"Next button must be enabled after confirmation on step "+active);
   await next.click();
   const arrived=Number(await page.locator(".step-panel.active").getAttribute("data-step"));
   assert.equal(arrived,active+1,"Next button did not advance from step "+active);
   active=arrived;
  }
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
  if(ruleset==="2014"){
   // Legacy starting gear must be resolved before its visible Next button unlocks.
   // Use the real starting-gold flow so no weapon package is silently invented.
   await page.locator('#classDetail [data-start-mode="gold"]').click();
   await page.locator("#rollStartGold14").click();
   assert(await page.locator("#next0").isEnabled(),"2014 starting gold unlocks progression");
  }
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
 await page.locator("#stepNav .nav-primary > button:not(.nav-ux-back)").filter({hasText:"角色卡"}).click();
 const sheet=page.locator("#finalSheet");
 assert(await sheet.isVisible(),"character sheet accessible by real global nav click");
 assert((await sheet.locator(".fs-name").textContent()).includes(uniqueName),"real typed name reaches character sheet");
 assert.equal(await sheet.locator(".fs-abrow .ab-box").count(),6,"six generated ability boxes");
 assert.equal(await sheet.locator(".fs-statrow .stat-box").count(),8,"original six combat stats plus spell DC and attack");
 const glanceLabels=await sheet.locator(".fs-statrow .stat-box .sl").allInnerTexts();
 assert(glanceLabels[0].startsWith("生命值")&&glanceLabels[1]==="護甲等級"&&glanceLabels[2].startsWith("先攻")&&glanceLabels[3]==="速度"&&glanceLabels[4]==="熟練加值"&&glanceLabels[5]==="被動察覺","original six canonical stats retained");
 assert.deepEqual(glanceLabels.slice(6),["法術豁免 DC","法術攻擊命中"],"two new casting values projected into existing sheet");
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
 if(folio){
   const badge=sheet.locator(".wcs-equipment-ac strong");
   assert.equal(Number(await badge.textContent()),acAfter,"ornamental AC reads canonical value");
   const portrait=sheet.locator("#portraitFrame img");
   const fixture=path.join(__dirname,"..","assets","species-watercolor");
   async function upload(name){
     const [chooser]=await Promise.all([page.waitForEvent("filechooser"),sheet.locator("#pPick").click()]);
     await chooser.setFiles(path.join(fixture,name+".webp"));
     await portrait.waitFor({state:"visible"});
     await page.waitForFunction(()=>{const i=document.querySelector("#portraitFrame img");return !!i?.complete&&i.naturalWidth>0;});
   }
   await upload("elf");
   const first=await portrait.getAttribute("src");
   await upload("human");
   await page.waitForFunction(first=>document.querySelector("#portraitFrame img")?.getAttribute("src")!==first,first);
   const current=await portrait.getAttribute("src");
   assert(current&&current!==first,"replace uploads a different image");
   await page.locator("#btnRoster").click();
   await page.locator("#actSaveNow").click();
   await page.locator("#closeRoster").click();
   await page.reload({waitUntil:"domcontentloaded"});
   await page.locator("#stepNav .nav-primary > button:not(.nav-ux-back)").filter({hasText:"角色卡"}).click();
   assert((await sheet.locator(".fs-name").textContent()).includes(uniqueName),"real saved character restored");
   assert.equal(await portrait.getAttribute("src"),current,"uploaded portrait survives fresh reload");
   await page.locator('#finalJumpNav [data-sheet-jump="equipment"]').click();
   const g=await sheet.evaluate(el=>{
     const p=el.querySelector(".portrait-col"),gear=el.querySelector("#final-jump-equipment"),r=p.getBoundingClientRect(),q=gear.getBoundingClientRect();
     return {rail:p.parentElement===el,fit:getComputedStyle(p.querySelector("img")).objectFit,sticky:getComputedStyle(p).position,right:r.x>q.right,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(g.rail,width>=1100);
   assert.equal(g.fit,"contain");
   assert(g.overflow<=2,JSON.stringify(g));
   if(width>=1100)assert(g.right&&g.sticky==="sticky",JSON.stringify(g));
   assert.equal(Number(await badge.textContent()),acAfter,"AC persists with portrait");
   const evidence=path.join(__dirname,"..","tmp","qa-final-sheet-ux","folio-"+ruleset+"-"+width+".png");
   fs.mkdirSync(path.dirname(evidence),{recursive:true});
   await page.screenshot({path:evidence});
   await acceptNextConfirm(page,sheet.locator("#pDel"));
   await portrait.waitFor({state:"detached"});
   assert.equal(await sheet.locator(":scope > .portrait-col").count(),0,"remove collapses right rail");
   console.log("PASS FOLIO REAL-UI "+ruleset+" "+width+"px: upload, replace, save, reload, equipment AC, remove");
 }
 const toolbar=page.locator('.step-panel[data-step="7"] .fs-toolbar');
 const exports=toolbar.locator(".fs-export-options");
 await exports.locator("summary").click();
 assert(await exports.evaluate(el=>el.open),"collapsed export menu opens by click");
 const [download]=await Promise.all([page.waitForEvent("download",{timeout:20000}),exports.locator("button").filter({hasText:"匯出 JSON"}).click()]);
 assert(download.suggestedFilename().endsWith(".json"),"real export produces JSON download");
 await toolbar.locator('[data-go="11"]').click();
 assert(await page.locator('.step-panel[data-step="11"].active').count(),"run-status action switches view");
 await page.locator("#stepNav .nav-primary > button:not(.nav-ux-back)").filter({hasText:"角色卡"}).click();
 assert((await page.locator("#finalSheet .fs-name").textContent()).includes(uniqueName),"return keeps character");
 await toolbar.locator('[data-go="5"]').click();
 assert(await page.locator('.step-panel[data-step="5"].active').count(),"level-up action switches view");
 await page.locator("#stepNav .nav-primary > button:not(.nav-ux-back)").filter({hasText:"角色卡"}).click();
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
async function verifyPublishedFolio(){
 const sha=process.env.QA_EXPECTED_SHA;
 if(!folio||!sha)return;
 const crypto=require("node:crypto");
 let version;
 for(let i=0;i<12;i++){
   try{const r=await fetch(base+"/site-version.json?qa="+sha,{cache:"no-store"});version=await r.json();if(version.sha===sha)break;}catch{}
   await new Promise(r=>setTimeout(r,5000));
 }
 assert.equal(version?.sha,sha,"exact published SHA");
 for(const file of ["assets/watercolor-alpha20.css","assets/watercolor-alpha20.js","assets/watercolor-ornaments/painted-icons.webp","assets/watercolor-ornaments/shield.svg"]){
   const response=await fetch(base+"/"+file+"?qa="+sha);
   assert.equal(response.status,200,file);
   const digest=b=>crypto.createHash("sha256").update(b).digest("hex");
   assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(fs.readFileSync(path.join(__dirname,"..",file))),"published bytes "+file);
 }
 console.log("PASS FOLIO PUBLISHED SHA + four artwork files "+sha);
}
(async()=>{await verifyPublishedFolio();const browser=await chromium.launch({headless:true});try{for(const c of cases)await runCase(browser,c)}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

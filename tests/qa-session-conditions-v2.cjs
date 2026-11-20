"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");

const root=path.resolve(__dirname,"..");
const url=pathToFileURL(path.join(root,"index.html")).href;
const output=process.env.PLAY_STATUS_V2_QA_DIR||"D:\\Tools\\zizi-ai-runtime\\trpg-playercheet-qa\\play-status-v2-20261118";
fs.mkdirSync(output,{recursive:true});

function loadModule(){
 const context={};
 vm.runInNewContext(fs.readFileSync(path.join(root,"assets","session-effects-2024.js"),"utf8"),context);
 return context.DND5RSessionEffects;
}

function unitProjection(){
 const effects=loadModule();
 const expected=new Map([[0,[0,30]],[1,[-2,25]],[2,[-4,20]],[5,[-10,5]],[6,[-12,0]]]);
 for(const [level,[penalty,speed]] of expected){
  const play=Object.freeze({exhaustion2024:level,conditions2024:Object.freeze({})});
  const before=JSON.stringify(play),got=effects.project(play,30);
  assert.equal(got.d20Penalty,penalty,`D20 penalty level ${level}`);
  assert.equal(got.speedAfterExhaustion,speed,`speed level ${level}`);
  assert.equal(got.effectiveSpeed,speed,`effective speed level ${level}`);
  assert.equal(JSON.stringify(play),before,"projection must be pure");
 }
 assert.equal(effects.project({exhaustion2024:6},0).effectiveSpeed,0,"zero base speed stays bounded");
 for(const id of effects.SPEED_ZERO){
  const got=effects.project({exhaustion2024:2,conditions2024:{[id]:true}},30);
  assert.equal(got.speedAfterExhaustion,20,`${id} preserves exhaustion projection`);
  assert.equal(got.effectiveSpeed,0,`${id} sets effective speed to zero`);
 }
 const proneLow=effects.project({exhaustion2024:1,conditions2024:{prone:true}},30,11);
 assert.equal(proneLow.effectiveSpeed,25,"prone does not halve speed");
 assert.equal(proneLow.standCost,12,"stand cost rounds down from effective speed");
 assert.equal(proneLow.canStand,false,"insufficient movement cannot stand");
 assert.equal(effects.project({exhaustion2024:1,conditions2024:{prone:true}},30,12).canStand,true);
 assert.equal(effects.project({conditions2024:{prone:true,grappled:true}},30,30).canStand,false,"speed zero cannot stand");
 assert.equal(effects.movementCost(1,true),2,"crawl adds one foot per foot");
 assert.equal(effects.movementCost(7,true),14);
 assert.equal(effects.movementCost(7,false),7);
 assert.equal(effects.applyD20(6,2),2,"level-based D20 projection");
 assert.equal(effects.applyD20(6,effects.project({exhaustion2024:5},30)),-4,"projection-based D20 value");
 assert.equal(effects.summaryHTML({},"2014",[]),"","2014 has no condition summary");
 assert.match(effects.canonicalInfo("prone",[["倒地","Prone","5 呎規則。","爬行與站起規則。"]]).rule,/5 呎/u);
}

async function prepare(page,{conditions={},exhaustion=0,concentration=""}={}){
 await page.goto(url,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.DND5RSessionEffects&&typeof go==="function");
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").evaluate(el=>el.click());
 await page.evaluate(({conditions,exhaustion,concentration})=>{
  S.ruleset="2024";syncRulesetUI();S.id=newId();
  S.cls=CLASSES.find(x=>x.n==="法師");S.level=5;S.classLevels={法師:5};
  S.sp=SPECIES_2024.find(x=>x.n==="人類");
  S.base={str:10,dex:14,con:14,int:16,wis:12,cha:8};
  S.play={hp:25,hpMax:hpTotal(),thp:0,hd:5,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"V2 QA",conditions2024:{...conditions},exhaustion2024:exhaustion,concentration2024:concentration,concentrationChecks2024:[]};
  S.slotsUsed={};document.querySelector("#fName").value="狀態 V2 QA "+S.id;
  go(11);document.querySelector("#rulesetModal")?.classList.remove("open");
 },{conditions,exhaustion,concentration});
 await page.waitForTimeout(100);
 await page.evaluate(()=>document.querySelector("#rulesetModal")?.classList.remove("open"));
}

async function interactionQA(browser){
 const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 const errors=[],dialogs=[];
 page.on("pageerror",error=>errors.push(String(error)));
 page.on("dialog",async dialog=>{dialogs.push(dialog.type());await dialog.dismiss();});
 await prepare(page);
 const rootPanel=page.locator("#playStatusBody");
 const sourceBefore=await page.evaluate(()=>({base:JSON.stringify(S.base),scores:ABILITIES.map(a=>finalScore(a.k)),speed:speedInfo().total,attack:playStatusSpellcasting()[0].attack,pb:pb()}));

 await rootPanel.locator('[data-session-condition="prone"]').click();
 await rootPanel.locator("#sessionExhaustion").selectOption("2");
 assert.equal(await rootPanel.locator("[data-session-chip]").count(),2,"toggle and exhaustion create chips");
 assert.match(await rootPanel.locator(".session-current").innerText(),/倒地/u);
 assert.match(await rootPanel.locator(".session-current").innerText(),/力竭 2/u);
 const projection=await page.evaluate(()=>DND5RSessionEffects.project(S.play,speedInfo().total));
 assert.equal(projection.characterSpeed,30);assert.equal(projection.speedAfterExhaustion,20);assert.equal(projection.effectiveSpeed,20);assert.equal(projection.standCost,10);
 assert.match(await rootPanel.locator(".session-projection").innerText(),/站起要花 10 呎/u);
 assert.match(await rootPanel.locator(".ps-run-metric").filter({hasText:"速度"}).innerText(),/20 呎/u,"effective speed remains in HUD");
 await rootPanel.locator("#psStats summary").click();
 assert.match(await rootPanel.locator(".ps-stat").filter({hasText:"法術命中加值"}).innerText(),/\+2/u,"advanced spell attack follows exhaustion");
 assert.match(await rootPanel.locator(".ps-ability").filter({hasText:"智力"}).innerText(),/D20 [-−]1/u);
 const sourceAfter=await page.evaluate(()=>({base:JSON.stringify(S.base),scores:ABILITIES.map(a=>finalScore(a.k)),speed:speedInfo().total,attack:playStatusSpellcasting()[0].attack,pb:pb()}));
 assert.deepEqual(sourceAfter,sourceBefore,"derived display must not mutate character sources");

 await rootPanel.locator('[data-session-chip="prone"]').click();
 const sheet=rootPanel.locator("#sessionConditionDialog");
 assert(await sheet.evaluate(el=>el.open),"tap opens the rule sheet");
 assert.match(await sheet.innerText(),/5 呎/u);assert.match(await sheet.innerText(),/攻擊擲骰/u);assert.match(await sheet.innerText(),/爬行/u);assert.match(await sheet.innerText(),/不會減半/u);
 const ruleStyle=await sheet.locator(".session-dialog-body").evaluate(el=>({size:parseFloat(getComputedStyle(el).fontSize),lineHeight:parseFloat(getComputedStyle(el).lineHeight),scrollWidth:el.scrollWidth,width:el.clientWidth}));
 assert(ruleStyle.size>=15&&ruleStyle.lineHeight>=26,"rule sheet is legible");
 assert(ruleStyle.scrollWidth<=ruleStyle.width+1,"rule sheet has no horizontal overflow");
 await page.screenshot({path:path.join(output,"play-status-condition-sheet-390.png"),fullPage:false});
 await sheet.locator("[data-session-dialog-close]").first().click();

 await rootPanel.locator('[data-session-condition="poisoned"]').click();
 let poison=rootPanel.locator('[data-session-chip="poisoned"]');
 await poison.dispatchEvent("pointerdown",{button:0,isPrimary:true,pointerId:11,pointerType:"touch",clientX:20,clientY:20});
 await poison.dispatchEvent("pointermove",{button:0,isPrimary:true,pointerId:11,pointerType:"touch",clientX:20,clientY:58});
 await poison.dispatchEvent("pointercancel",{button:0,isPrimary:true,pointerId:11,pointerType:"touch",clientX:20,clientY:58});
 await page.waitForTimeout(620);
 assert.equal(await page.evaluate(()=>!!S.play.conditions2024.poisoned),true,"scroll/pointercancel must not remove");
 poison=rootPanel.locator('[data-session-chip="poisoned"]');
 await poison.dispatchEvent("pointerdown",{button:0,isPrimary:true,pointerId:12,pointerType:"touch",clientX:20,clientY:20});
 await page.waitForTimeout(620);
 assert.equal(await page.evaluate(()=>!!S.play.conditions2024.poisoned),false,"550ms long press removes immediately");
 assert.equal(await rootPanel.locator('[data-session-chip="poisoned"]').count(),0);

 await rootPanel.locator('[data-session-condition="blinded"]').click();
 const blind=rootPanel.locator('[data-session-chip="blinded"]');
 await blind.focus();await page.keyboard.press("Enter");
 assert(await sheet.evaluate(el=>el.open),"keyboard opens the rule sheet");
 const remove=sheet.locator("[data-session-remove]");
 assert(await remove.isVisible(),"visible alternate remove action");
 assert((await remove.boundingBox()).height>=44,"remove action has a 44px target");
 await remove.click();
 assert.equal(await page.evaluate(()=>!!S.play.conditions2024.blinded),false,"visible action removes condition");

 await rootPanel.locator("[data-session-start]").click();
 assert.equal(await page.evaluate(()=>S.play.concentration2024),"專注中");
 assert.match(await rootPanel.locator(".session-current").innerText(),/專注：專注中/u);
 await rootPanel.locator('[data-session-condition="stunned"]').click();
 assert.equal(await page.evaluate(()=>S.play.concentration2024),"","incapacitated status breaks concentration");
 await rootPanel.locator('[data-ps-action="undo"]').click();
 assert.equal(await page.evaluate(()=>S.play.concentration2024),"專注中","undo restores concentration");
 assert.equal(await page.evaluate(()=>!!S.play.conditions2024.stunned),false,"undo removes breaking status");
 await rootPanel.locator('[data-session-chip="concentration"]').click();
 assert.match(await sheet.locator("[data-session-remove]").innerText(),/結束專注/u);
 await sheet.locator("[data-session-remove]").click();
 assert.equal(await page.evaluate(()=>S.play.concentration2024),"");

 await rootPanel.locator("[data-session-start]").click();
 await rootPanel.locator("#sessionExhaustion").selectOption("6");
 assert.equal(await page.evaluate(()=>S.play.concentration2024),"","exhaustion 6 breaks concentration");
 assert.match(await rootPanel.locator(".session-projection-death").innerText(),/角色死亡/u);
 await rootPanel.locator('[data-ps-action="undo"]').click();
 assert.equal(await page.evaluate(()=>S.play.concentration2024),"專注中");
 assert.equal(await page.evaluate(()=>S.play.exhaustion2024),2);

 const serialized=await page.evaluate(()=>serialize());
 await page.evaluate(save=>{deserialize(save);go(11);},serialized);
 assert.equal(await page.evaluate(()=>S.play.exhaustion2024),2,"serialize/deserialize keeps exhaustion");
 assert.equal(await page.evaluate(()=>!!S.play.conditions2024.prone),true,"serialize/deserialize keeps condition");
 await page.waitForTimeout(1200);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.DND5RSessionEffects&&typeof go==="function");
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").evaluate(el=>el.click());
 await page.locator("#stepNav .nav-primary button").filter({hasText:"跑團狀態"}).click();
 assert.equal(await page.locator("#sessionExhaustion").inputValue(),"2","UI reload reads saved exhaustion");
 assert.equal(await page.locator('[data-session-condition="prone"]').getAttribute("aria-pressed"),"true","UI reload reads saved condition");

 await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();renderPlayStatusTab();});
 assert.equal(await rootPanel.locator(".session-current,.session-projection,[data-session-condition]").count(),0,"2014 remains isolated");
 assert.deepEqual(dialogs,[],"no JavaScript prompt/alert in V2 flow");
 assert.deepEqual(errors,[],"no page errors in V2 flow");
 await page.close();
}

async function responsiveQA(browser){
 const captures=[];
 for(const width of [320,390,480,1440]){
  const page=await browser.newPage({viewport:{width,height:width===1440?900:844},hasTouch:width<600});
  const errors=[];page.on("pageerror",error=>errors.push(String(error)));
  await prepare(page,{conditions:{blinded:true,charmed:true,deafened:true,frightened:true,grappled:true,invisible:true,poisoned:true,prone:true,restrained:true},exhaustion:5,concentration:"祝福術"});
  await page.evaluate(()=>window.scrollTo(0,Math.max(700,document.querySelector("#psLife")?.offsetTop||0)));
  await page.waitForTimeout(120);
  const geometry=await page.evaluate(()=>{
   const jump=document.querySelector(".ps-jump-nav"),current=document.querySelector(".session-current"),jr=jump.getBoundingClientRect(),cr=current.getBoundingClientRect();
   const controls=[...document.querySelectorAll("#playStatusBody [data-session-condition],#playStatusBody [data-session-chip],#playStatusBody .session-condition-details summary,#playStatusBody #sessionExhaustion")].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height});
   return {documentOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,currentOverflow:current.scrollWidth-current.clientWidth,summaryHeight:cr.height,chipHeight:current.querySelector(".session-current-chips").getBoundingClientRect().height,jumpBottom:jr.bottom,currentTop:cr.top,currentRight:cr.right,currentLeft:cr.left,position:getComputedStyle(current).position,minControl:Math.min(...controls.map(el=>el.getBoundingClientRect().height))};
  });
  assert(geometry.documentOverflow<=1,`document overflow ${width}: ${geometry.documentOverflow}`);
  assert(geometry.currentOverflow<=1,`summary overflow ${width}: ${geometry.currentOverflow}`);
  assert.equal(geometry.position,"sticky",`summary sticky ${width}`);
  assert(geometry.currentTop>=geometry.jumpBottom+5,`sticky bars overlap ${width}: ${JSON.stringify(geometry)}`);
  assert(geometry.currentLeft>=-1&&geometry.currentRight<=width+1,`summary outside viewport ${width}`);
  if(width<=480){assert(geometry.minControl>=43.5,`mobile target under 44px ${width}: ${geometry.minControl}`);assert(geometry.summaryHeight<=100,`compact mobile sticky summary too tall ${width}: ${geometry.summaryHeight}`);}
  const file=path.join(output,`play-status-conditions-v2-${width}.png`);
  await page.screenshot({path:file,fullPage:false});captures.push(file);
  assert.deepEqual(errors,[],`page errors width ${width}`);
  await page.close();
 }
 return captures;
}

(async()=>{
 unitProjection();
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  await interactionQA(browser);
  const captures=await responsiveQA(browser);
  const report={status:"PASS",unit:"projection boundaries, speed-zero combinations, prone movement",browser:"tap, long press, cancel, keyboard removal, concentration, undo, 2014, save/readback",viewports:[320,390,480,1440],captures,generatedAt:new Date().toISOString()};
  fs.writeFileSync(path.join(output,"qa-session-conditions-v2.json"),JSON.stringify(report,null,2)+"\n","utf8");
  console.log("PASS: session conditions V2 projection, interaction, persistence, isolation, responsive screenshots");
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {pathToFileURL} = require("node:url");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const out = process.env.MOBILE_P0_QA_DIR || "D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/mobile-run-p0-20261119";
fs.mkdirSync(out, {recursive:true});
const evidence = [];

async function prepare(page, edition="2024") {
  await page.goto(url, {waitUntil:"domcontentloaded"});
  await page.waitForFunction(() => window.DND5RSessionEffects && typeof go === "function");
  await page.evaluate(ed => {
    S.ruleset=ed;syncRulesetUI();S.id=newId();
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=5;S.classLevels={法師:5};
    S.sp=SPECIES_2024.find(x=>x.n==="人類");
    S.base={str:10,dex:14,con:14,int:16,wis:12,cha:8};
    S.play={hp:25,hpMax:25,thp:0,hd:5,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"P0 QA",conditions2024:{},exhaustion2024:0,concentration2024:"",concentrationChecks2024:[]};
    S.slotsUsed={};
    const slots=playStatusSlots();
    if(slots[0])S.slotsUsed[slots[0].key]=1;
    document.querySelector("#fName").value="Mobile P0 QA "+S.id;
    go(11);
    document.querySelector("#rulesetModal")?.classList.remove("open");
  }, edition);
  await page.waitForTimeout(120);
  await page.evaluate(()=>document.querySelector("#rulesetModal")?.classList.remove("open"));
  await page.locator("#playStatusBody .ps-run-hud").waitFor({state:"visible",timeout:15000});
}

async function responsive(browser) {
  for(const width of [320,390,480,1440]){
    const page=await browser.newPage({viewport:{width,height:width===1440?900:844},hasTouch:width<600});
    const errors=[];page.on("pageerror",e=>errors.push(String(e)));
    await prepare(page);
    await page.locator("#playStatusBody [data-session-condition='prone']").click();
    await page.locator("#playStatusBody #sessionExhaustion").selectOption("2");
    // Return to the actual run-mode entry viewport after changing a deep status control.
    await page.evaluate(()=>{
      const hero=document.querySelector(".ps-hero");
      const global=document.querySelector("#stepNav");
      const offset=(global?.getBoundingClientRect().height||0)+8;
      const top=Math.max(0,scrollY+hero.getBoundingClientRect().top-offset);
      document.documentElement.style.scrollBehavior="auto";
      window.scrollTo({top,behavior:"instant"});
      document.scrollingElement.scrollTop=top;
    });
    await page.waitForTimeout(180);
    const hud=page.locator(".ps-run-hud");
    const t=await hud.innerText();
    for(const term of ["HP","AC","速度","生命骰","20 呎"])assert(t.includes(term),"HUD lacks "+term+" at "+width);
    const first=await page.evaluate(()=>{
      const r=document.querySelector(".ps-run-hud").getBoundingClientRect();
      const j=document.querySelector(".ps-jump-nav").getBoundingClientRect();
      const s=document.querySelector(".session-current").getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,hudTop:r.top,hudBottom:r.bottom,statusBottom:s.bottom,navHeight:j.height,statusHeight:s.height,viewport:innerHeight,buttons:[...document.querySelectorAll(".ps-run-hud button")].map(x=>x.getBoundingClientRect().height)};
    });
    assert(first.overflow<=1,"page overflow at "+width+": "+JSON.stringify(first));
    assert(first.hudTop>=-1 && first.hudBottom<first.viewport-90,"HUD not fully on first screen at "+width+": "+JSON.stringify(first));
    if(width<=480){
      assert(first.statusBottom<first.viewport,"conditions invisible on first screen at "+width+": "+JSON.stringify(first));
      assert(first.navHeight<=62,"nav too tall at "+width);
      assert(first.statusHeight<=100,"status bar too tall at "+width);
    }
    assert(first.buttons.every(v=>v>=43.5),"quick action height below 44px at "+width);
    const file=path.join(out,"mobile-p0-"+width+"-first-screen.png");
    await page.screenshot({path:file,fullPage:false});
    await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
    await page.waitForTimeout(140);
    const sticky=await page.evaluate(()=>{
      const j=document.querySelector(".ps-jump-nav").getBoundingClientRect();
      const s=document.querySelector(".session-current").getBoundingClientRect();
      return {navBottom:j.bottom,statusTop:s.top,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    });
    assert(sticky.statusTop>=sticky.navBottom+3,"sticky overlap at "+width+": "+JSON.stringify(sticky));
    assert(sticky.overflow<=1,"scroll overflow at "+width);
    if(width===390)await page.screenshot({path:path.join(out,"mobile-p0-390-scrolled.png")});
    assert.deepEqual(errors,[],"browser errors width "+width);
    evidence.push({width,first,sticky,file});
    await page.close();
  }
}

async function actions(browser) {
  const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await prepare(page);
  const hp=await page.evaluate(()=>S.play.hp);
  await page.locator(".ps-run-hud [data-mrm-action='damage1']").click();
  assert.equal(await page.evaluate(()=>S.play.hp),hp-1,"HUD damage action");
  assert(await page.locator("#playStatusBody [data-ps-action='undo']").isEnabled(),"HUD action creates Undo record");
  await page.locator("#playStatusBody [data-ps-action='undo']").click();
  assert.equal(await page.evaluate(()=>S.play.hp),hp,"HUD action Undo restores HP");
  await page.locator(".ps-run-hud [data-mrm-action='damage1']").click();
  await page.locator(".ps-run-hud [data-mrm-action='heal1']").click();
  assert.equal(await page.evaluate(()=>S.play.hp),hp,"HUD heal action");
  const hd=await page.evaluate(()=>S.play.hd);
  await page.locator(".ps-run-hud [data-mrm-action='hd']").click();
  assert.equal(await page.evaluate(()=>S.play.hd),hd-1,"HUD hit die action");
  let meter=page.locator("#psSlots .ps-counter-progress").first();
  assert(await meter.count()>0,"No spell slot meter");
  await page.locator("#psSlots").screenshot({path:path.join(out,"mobile-p0-390-slots.png")});
  const max=Number(await meter.getAttribute("aria-valuemax"));
  const before=Number(await meter.getAttribute("aria-valuenow"));
  assert(max>0&&before>0,"invalid meter count "+before+"/"+max);
  if(max<=12)assert.equal(await meter.locator(".ps-segment").count(),max,"segment count");
  await page.locator("#psSlots [data-ps-action='slot'][data-ps-delta='1']").first().click();
  assert.equal(Number(await meter.getAttribute("aria-valuenow")),before-1,"spend spell slot");
  await page.locator("#psSlots [data-ps-action='slot'][data-ps-delta='-1']").first().click();
  assert.equal(Number(await meter.getAttribute("aria-valuenow")),before,"restore spell slot");
  await page.evaluate(()=>{S.play.custom.push({n:"QA resource",max:20,used:5,rest:"manual"});renderPlayStatusTab()});
  const big=page.locator("#psResources .ps-counter-progress[aria-valuemax='20']");
  assert.equal(await big.getAttribute("aria-valuenow"),"15","large resource exact count");
  assert.equal(await big.locator(".ps-segment-track").count(),1,"large resource continuous track");
  await page.locator("#psResources").screenshot({path:path.join(out,"mobile-p0-390-resources.png")});
  await page.locator("#sessionExhaustion").selectOption("2");
  await page.locator("[data-session-condition='prone']").click();
  assert.equal(await page.evaluate(()=>speedInfo().total),30,"base speed unchanged");
  assert((await page.locator(".ps-run-hud").innerText()).includes("20 呎"),"effective speed in HUD");
  const saved=await page.evaluate(()=>({hp:S.play.hp,hd:S.play.hd,slotsUsed:{...S.slotsUsed}}));
  await page.waitForTimeout(1200);
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.DND5RSessionEffects&&typeof go==="function");
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").evaluate(el=>el.click());
  await page.locator("#stepNav .nav-primary button").filter({hasText:"跑團狀態"}).click();
  assert.equal(await page.evaluate(()=>S.play.hp),saved.hp,"HP persistence");
  assert.equal(await page.evaluate(()=>S.play.hd),saved.hd,"HD persistence");
  assert.equal(await page.locator("#sessionExhaustion").inputValue(),"2","exhaustion persistence");
  assert((await page.locator(".ps-run-hud").innerText()).includes("20 呎"),"speed projection persistence");
  assert.equal(Number(await page.locator("#psSlots .ps-counter-progress").first().getAttribute("aria-valuenow")),before,"spell slot persistence");
  await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();renderPlayStatusTab()});
  assert.equal(await page.locator("#playStatusBody .session-current").count(),0,"2014 conditions isolation");
  assert.equal(await page.locator("#playStatusBody .ps-run-hud").count(),1,"2014 HUD presentation");
  assert.deepEqual(errors,[],"browser errors in actions");
  evidence.push({actions:"PASS",hp:saved.hp,hd:saved.hd,slotRemaining:before});
  await page.close();
}

(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});
 let status="FAIL",message="";
 try{
   await responsive(browser);
   await actions(browser);
   status="PASS";
   console.log("PASS mobile P0: responsive, sticky, HUD actions, slots/resources, persistence, 2014");
 }catch(e){message=String(e.stack||e);console.error(message);process.exitCode=1}
 finally{await browser.close();fs.writeFileSync(path.join(out,"qa-mobile-run-p0.json"),JSON.stringify({status,message,evidence},null,2))}
})();
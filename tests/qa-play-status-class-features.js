"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const SITE = process.env.QA_URL || "http://127.0.0.1:18766/index.html";

async function setCharacter(page, name, ruleset, level, subclass = 0) {
 return page.evaluate(({ name, ruleset, level, subclass }) => {
  S.ruleset = ruleset;
  syncRulesetUI();
  S.cls = CLASSES.find(c => c.n === name);
  if (!S.cls) throw Error("Unknown class " + name);
  S.level = level;
  S.classLevels = {[name]: level};
  S.sub = subclass;
  S.sp = (ruleset === "2024" ? SPECIES_2024 : SPECIES_2014)[0];
  S.bg = (ruleset === "2024" ? BACKGROUNDS_2024 : BACKGROUNDS_2014)[0];
  S.base = {str:16, dex:12, con:14, int:10, wis:14, cha:14};
  S.play = S.play || {};
  S.play.res = {};
  S.play.resMax = {};
  S.play.custom = [];
  go(11);
  return {
   classes: Object.keys(PROG_2024),
   features: document.querySelectorAll(".ps-feature-item").length,
   resourceCount: document.querySelectorAll(".ps-resource-entry").length,
   missingRecovery: [...document.querySelectorAll(".ps-resource-entry")].filter(el => !el.querySelector(".ps-resource-hint")?.textContent.includes("恢復：")).map(el => el.dataset.psResource),
   wrongRule: [...document.querySelectorAll(".ps-resource-tip")].filter(el => !el.dataset.tip).map(el => el.textContent),
   errors: document.documentElement.scrollWidth - innerWidth
  };
 }, {name, ruleset, level, subclass});
}

(async () => {
 const browser = await chromium.launch({headless:true});
 const reports = [];
 try {
  for (const width of [1440, 480, 390]) {
   const page = await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors = [];
   page.on("pageerror", error => errors.push(String(error)));
   await page.goto(SITE + "?ps-feature-qa=" + width, {waitUntil:"networkidle"});
   if (await page.locator("#rulesetModal.open").count()) await page.locator("#closeRuleset").click();
   const barbarian = await setCharacter(page,"野蠻人","2024",3,0);
   assert(barbarian.features >= 3, "Barbarian lvl 3 features missing");
   assert.equal(barbarian.resourceCount, 1, "Rage must have one tracked counter");
   assert.deepEqual(barbarian.missingRecovery, [], "Rage recovery hint missing");
   assert.deepEqual(barbarian.wrongRule, [], "Rage feature small-card has no rule");
   const hint = page.locator('[data-ps-res-help="rage"]');
   assert.equal(await hint.count(),1,"Rage recovery hint must appear in native Play Status");
   const text = await hint.innerText();
   assert(text.includes("效果：") && text.includes("恢復："), "Rage effect/recovery labels");
   assert(text.includes("短休回1") && text.includes("長休全回"),"PHB2024 Rage rest rules");
   const rage = page.locator('.ps-resource-tip[data-tip-title="狂暴"]');
   assert.equal(await rage.count(),1,"Clickable full rule Rage card");
   const full = await rage.getAttribute("data-tip");
   assert(full.includes("短休") && full.includes("長休") && full.length>80, "Rage must link to canonical full text");
   await rage.click();
   assert(await page.locator("#featureTip").isVisible(),"Rage shared full-rule popover on click");
   await page.keyboard.press("Escape");
   const library = page.locator(".ps-feature-library");
   assert(await library.count()===1,"Class features library");
   await library.locator("summary").click();
   assert(await library.locator(".ps-feature-item").count()>=3,"Class features of current level");
   assert((await library.locator(".ps-feature-group").count())>=2,"Chosen Barbarian subclass group must appear");
   const subclassGroup=library.locator(".ps-feature-group").nth(1);
   const frenzy = subclassGroup.locator(".ps-feature-chip[data-tip]").first();
   assert.equal(await frenzy.count(),1,"Chosen subclass must have a canonical rule card");
   assert((await frenzy.getAttribute("data-tip")).length>50,"Full subclass rule not just summary");
   await frenzy.click();
   assert(await page.locator("#featureTip").isVisible(),"Subclass uses shared full-rule popover");
   await page.keyboard.press("Escape");
   const screenshots=path.resolve(__dirname,"../tmp");
   fs.mkdirSync(screenshots,{recursive:true});
   await page.locator("#playStatusBody").screenshot({path:path.join(screenshots,"qa-play-status-class-features-"+width+".png")});
   await page.locator('[data-ps-action="res"][data-ps-key="rage"][data-ps-delta="1"]').click();
   assert.equal(await page.evaluate(()=>S.play.res.rage),1,"Rage spent counter updates");
   const saved=await page.evaluate(()=>serialize());
   const restored=await page.evaluate(saved=>({ok:deserialize(saved).ok,spent:S.play.res.rage}),saved);
   assert(restored.ok&&restored.spent===1,"Rage counter JSON roundtrip");
   const l15=await setCharacter(page,"野蠻人","2024",15,0);
   assert(l15.features>barbarian.features,"Progression should reveal higher class features");
   assert((await page.locator('[data-ps-res-help="rage"]').innerText()).includes("擲先攻"),"Level 15 rage additional recovery");
   const classCoverage=[];
   for (const name of barbarian.classes) {
    const result=await setCharacter(page,name,"2024",3,0);
    assert(result.features>0,"Missing class feature cards for "+name);
    assert.deepEqual(result.missingRecovery,[],"Missing resource recovery for "+name);
    assert.deepEqual(result.wrongRule,[],"Missing resource full card for "+name);
    classCoverage.push(name);
   }
   assert.equal(classCoverage.length,12,"2024 12 classes");
   await setCharacter(page,"遊蕩者","2024",3,0);
   assert(await page.locator(".ps-feature-item").count()>0,"Rogue without resource count still has feature cards");
   await setCharacter(page,"邪術師","2024",3,0);
   assert(await page.locator(".ps-feature-item").count()>0,"Warlock without resource count still has feature cards");
   const old=await setCharacter(page,"野蠻人","2014",3,0);
   assert.equal(old.resourceCount,1,"Legacy rage resources");
   const oldHint=await page.locator('[data-ps-res-help="rage"]').innerText();
   assert(oldHint.includes("長休全回")&&!oldHint.includes("短休回1"),"2014 must not inherit 2024 Rage recovery");
   assert(await page.locator(".ps-feature-item").count()>0,"2014 feature library");
   await page.locator(".ps-feature-library > summary").click();
   const dims=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    hintFont:parseFloat(getComputedStyle(document.querySelector(".ps-resource-hint")).fontSize),
    featureTip:!!document.querySelector(".ps-feature-library .ps-feature-chip")
   }));
   assert(dims.overflow<=2,"Horizontal overflow at "+width+" px: "+dims.overflow);
   assert(dims.hintFont>=14,"Resource hint text too small");
   assert(dims.featureTip,"Feature cards missing");
   assert.deepEqual(errors,[],"Browser page JS errors");
   reports.push({width,barbarianResource:true,card:true,subclassCard:true,level15Recovery:true,classes:classCoverage.length,legacy2014:true,roundTrip:true,overflow:dims.overflow});
   await page.close();
  }
  console.log(JSON.stringify({pass:true,reports},null,2));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack||error);process.exitCode=1});

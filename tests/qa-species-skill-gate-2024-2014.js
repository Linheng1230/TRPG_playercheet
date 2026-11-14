"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19757/index.html";
async function choose(page,name,container){
 const item=page.locator(container+" button.pick-card").filter({has:page.locator(".name").filter({hasText:name})}).first();
 await item.click();
}
async function go(page,step){
 const toggle=page.locator("#stepNav .nav-primary .nav-ux-steps-toggle");
 await toggle.click();
 assert.equal(await toggle.getAttribute("aria-expanded"),"true");
 await page.locator("#stepNav .nav-secondary button").nth(step).click({timeout:8000});
 await page.locator('.step-panel[data-step="'+step+'"].active').waitFor({state:"visible"});
}
async function open(page,ruleset,cls,race){
 await page.goto(URL+"?skill-gate-qa="+Date.now()+"-"+Math.random(),{waitUntil:"networkidle"});
 const rules=page.locator("#rulesetModal");
 if(!await rules.isVisible())await page.locator("#btnRuleset").click();
 await page.locator('[data-ruleset="'+ruleset+'"]').click();
 await page.locator('#classGrid button[data-class-name="'+cls+'"]').click();
 page.once("dialog",dialog=>dialog.accept());
 await page.locator(".class-confirm-controls button").filter({hasText:/確定職業|確認職業/}).click();
 await go(page,1);
 await choose(page,"隱士","#bgGrid");
 if(ruleset==="2014")await page.locator('[data-bg14="lang1"]').selectOption({index:1});
 page.once("dialog",dialog=>dialog.accept());await page.locator(".confirm-bg button").click();
 await choose(page,race,"#spGrid");
 if(ruleset==="2024"){
   await page.locator('[data-spch="eSkill"]').selectOption("求生");
   await page.locator('[data-spch="eLine"]').selectOption("卓爾");
   await page.locator('[data-spch="eCast"]').selectOption("wis");
   page.once("dialog",dialog=>dialog.accept());await page.locator("[data-confirm-species-choices]").click();
 }
 page.once("dialog",dialog=>dialog.accept());await page.locator(".confirm-sp button").click();
}
async function abilities(page){
 await go(page,2);
 for(const [k,val] of [["str","15"],["dex","14"],["con","13"],["int","12"],["wis","10"],["cha","8"]]){
  await page.locator('#abilityGrid select[data-ab="'+k+'"]').selectOption(val);
 }
}
function skill(page,name){return page.locator('#skillGrid button[data-skill="'+name+'"]')}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   // 2024 Elf Perception choice Survival must be pre-owned, not selectable as Druid class skill.
   await open(page,"2024","德魯伊","精靈");
   await abilities(page);
   await page.locator('[data-bk="b2"]').selectOption("wis");
   await page.locator('[data-bk="b1"]').selectOption("con");
   page.once("dialog",dialog=>dialog.accept());await page.locator("#confirmAbilities").click();
   await go(page,3);
   const survival=skill(page,"求生");
   assert(await survival.isDisabled(),"2024 species already owns survival");
   assert((await survival.innerText()).includes("已擁有（種族）"));
   assert.strictEqual(await survival.getAttribute("data-skill-owned"),"種族");
   assert(await skill(page,"醫藥").isDisabled(),"background fixed");
   assert((await skill(page,"醫藥").innerText()).includes("已擁有（背景）"));
   assert(await page.locator("#next3").isDisabled(),"next stays disabled until double-confirmed");
   await skill(page,"自然").click();await skill(page,"洞悉").click();
   assert.strictEqual(await page.locator(".confirm-skills strong").innerText(),"已選 2／2 項職業技能");
   const finalButton=page.locator(".confirm-skills button");
   page.once("dialog",dialog=>dialog.dismiss());await finalButton.click();
   assert(await skill(page,"自然").isEnabled(),"cancel must preserve edit state");
   let confirmedMessage="";page.once("dialog",dialog=>{confirmedMessage=dialog.message();dialog.accept()});await finalButton.click();
   assert(confirmedMessage.includes("無法修改"),"dialog states irreversible");
   assert((await page.locator(".confirm-skills").innerText()).includes("已確認並鎖定"));
   assert.strictEqual(await page.locator(".confirm-skills button").count(),0,"no unlock control");
   assert(await skill(page,"自然").isDisabled(),"chosen class skill locked");
   assert(await page.locator("#next3").isEnabled(),"next allowed after final confirmation");
   const before=await page.locator("#skillHint").innerText();
   assert(before.includes("職業技能已正式鎖定"));
   await page.waitForTimeout(1300);
   await page.reload({waitUntil:"networkidle"});
   if(await page.locator("#rulesetModal").isVisible())await page.locator("#closeRuleset").click();
   await go(page,3);
   assert(await skill(page,"求生").isDisabled(),"species owned persists on reload");
   assert((await page.locator(".confirm-skills").innerText()).includes("已確認並鎖定"),"final lock persists after reload");
   assert(await skill(page,"自然").isDisabled());
   await go(page,1);
   assert(await page.locator('[data-spch="eSkill"]').isDisabled(),"upstream species skill source locked");
   assert.strictEqual(await page.locator(".confirm-bg button").count(),0,"background permanently locked");
   await go(page,3);
   let over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(over<=3,"2024 "+width+" no horizontal overflow: "+over);
   await page.close();
   // 2014 half-elf chooses species skill in skill step, class cannot duplicate.
   const old=await browser.newPage({viewport:{width,height:width===390?844:900}});
   old.on("pageerror",e=>errors.push(e.message));
   await open(old,"2014","德魯伊","半精靈");
   await abilities(old);
   await old.locator('[data-raceab="flex1"]').selectOption("str");
   await old.locator('[data-raceab="flex2"]').selectOption("dex");
   old.once("dialog",dialog=>dialog.accept());await old.locator("#confirmAbilities").click();
   await go(old,3);
   await old.locator('[data-raceskill="hSkill"]').selectOption("求生");
   await old.locator('[data-raceskill="eSkill"]').selectOption("洞悉");
   assert(await skill(old,"求生").isDisabled(),"2014 race survival is pre-owned");
   assert((await skill(old,"求生").innerText()).includes("已擁有（種族）"));
   await skill(old,"自然").click();await skill(old,"察覺").click();
   old.once("dialog",dialog=>dialog.accept());await old.locator(".confirm-skills button").click();
   assert(await old.locator('[data-raceskill="hSkill"]').isDisabled(),"2014 race skill locked");
   assert(await skill(old,"察覺").isDisabled());
   await old.waitForTimeout(1250);await old.reload({waitUntil:"networkidle"});await go(old,3);
   assert((await old.locator(".confirm-skills").innerText()).includes("已確認並鎖定"),"2014 reload lock");
   over=await old.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(over<=3,"2014 "+width+" no horizontal overflow: "+over);
   assert.deepEqual(errors,[],"No page JS error");
   console.log("QA_PASS "+width+"px 2024 Elf/Druid Survival and 2014 Half-Elf, locked choices, confirm cancel/accept, persistence, layout");
   await old.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("QA_FAIL "+(e.stack||e));process.exit(1)});

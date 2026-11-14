"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>typeof go==="function"&&typeof renderLevel==="function"&&typeof saveCurrent==="function");
    await page.waitForTimeout(350);
    if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
    const init=await page.evaluate(()=>{
      S.ruleset="2024";syncRulesetUI();
      S.cls=CLASSES.find(c=>c.n==="野蠻人");
      S.classConfirmed=true;S.level=3;S.classLevels={"野蠻人":3};
      S.bg=null;S.sp=null;S.skills=new Set(["運動","求生"]);S.skillsConfirmed=true;
      ABILITIES.forEach(a=>S.base[a.k]=12);S.base.str=16;S.base.con=14;
      document.getElementById("fName").value="原初知識驗收測試";
      S.primalSkill="";S.primalSkillConfirmed=false;S.mastery=new Set();
      go(5);saveCurrent(true);
      return {id:S.id,pool:masteryPool().map(w=>w[0]),choice:S.cls.sk};
    });
    assert(init.choice.includes("自然"),"2024 barbarian Primal Knowledge choice exists");
    assert(init.pool.length>0&&init.pool.every(x=>x.endsWith("近戰")),"Barbarian weapon mastery is melee only");
    assert.equal(await page.locator("#primalSel").isEnabled(),true);
    assert.equal(await page.locator("#confirmPrimalSkill").isDisabled(),true);
    await page.locator("#primalSel").selectOption("自然");
    assert.equal(await page.locator("#confirmPrimalSkill").isEnabled(),true);
    page.once("dialog",d=>d.dismiss());
    await page.locator("#confirmPrimalSkill").click();
    assert.equal(await page.evaluate(()=>S.primalSkillConfirmed),false,"cancel keeps choice editable");
    page.once("dialog",d=>d.accept());
    await page.locator("#confirmPrimalSkill").click();
    assert.equal(await page.evaluate(()=>S.primalSkillConfirmed),true,"confirmation locks choice");
    assert.equal(await page.locator("#primalSel").isDisabled(),true);
    assert.match(await page.locator("#primalConfirmed").innerText(),/已鎖定，無法修改/);
    const persist=await page.evaluate(id=>JSON.parse(localStorage.getItem("dnd5r:char:"+id)),init.id);
    assert.equal(persist.primalSkill,"自然");
    assert.equal(persist.primalSkillConfirmed,true,"save schema lock persists");
    await page.evaluate(()=>{
      const el=document.getElementById("primalSel");
      el.disabled=false;el.value="察覺";el.dispatchEvent(new Event("change",{bubbles:true}));
    });
    assert.equal(await page.evaluate(()=>S.primalSkill),"自然","guard disallows programmatic change after confirmation");
    await page.reload();
    await page.waitForFunction(()=>typeof go==="function");
    await page.waitForTimeout(300);
    if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
    await page.evaluate(()=>go(5));
    assert.equal(await page.evaluate(()=>S.primalSkillConfirmed),true,"reload restores lock");
    assert.equal(await page.locator("#primalSel").isDisabled(),true);
    const legacy=await page.evaluate(()=>{
      const save=serialize();delete save.primalSkillConfirmed;
      const info=deserialize(save);go(5);
      return {ok:info.ok,selected:S.primalSkill,locked:S.primalSkillConfirmed};
    });
    assert(legacy.ok);
    assert.equal(legacy.selected,"自然","legacy choice retained");
    assert.equal(legacy.locked,false,"legacy save not silently locked");
    assert.equal(await page.locator("#primalSel").isEnabled(),true);
    let tierLabels=await page.locator("#mastGrid .mastery-tier h4").allTextContents();
    assert.equal(tierLabels.length,2,"two weapon tiers");
    assert(tierLabels[0].includes("簡易武器")&&tierLabels[1].includes("軍用武器"));
    const rangedCount=await page.locator("#mastGrid .mastery-subgroup").evaluateAll(xs=>xs.filter(x=>x.querySelector("h5")?.textContent.includes("遠程")).reduce((sum,x)=>sum+x.querySelectorAll("[data-mw]").length,0));
    assert.equal(rangedCount,0,"barbarian cannot choose ranged weapon mastery");
    assert.equal(await page.locator("#mastGrid .mastery-subgroup").count(),4,"both tiers each have melee/ranged category");
    await page.locator('#mastGrid [data-mw="巨斧"]').click();
    assert.equal(await page.evaluate(()=>S.mastery.has("巨斧")),true,"weapon selection still updates canonical state");
    const migration=await page.evaluate(()=>{
      const save=serialize();save.mastery=["巨斧","長弓"];
      const response=deserialize(save);go(5);
      return {valid:[...S.mastery],warn:response.warn};
    });
    assert.deepEqual(migration.valid,["巨斧"],"old illegal ranged mastery removed");
    assert(migration.warn.some(w=>w.includes("近戰武器")),"old save issue disclosed");
    await page.evaluate(()=>{
      S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="戰士");S.level=3;S.classLevels={"戰士":3};S.mastery=new Set();go(5);
    });
    assert.equal(await page.locator("#mastGrid .mastery-tier").count(),2);
    assert((await page.locator('#mastGrid .mastery-subgroup [data-mw="長弓"]').count())>0,"fighter ranged weapon mastery retained");
    for(const width of [360,390,480,1440]){
      await page.setViewportSize({width,height:width>700?900:844});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,"no overflow "+width);
    }
    await page.evaluate(()=>{
      S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="野蠻人");S.level=3;S.classLevels={"野蠻人":3};go(5);
    });
    assert.equal(await page.locator("#primalSel").count(),0,"2014 has no 2024 primal knowledge choice");
    assert.deepEqual(errors,[],"no browser JavaScript errors");
    console.log("PASS 2024 Barbarian: level3 Primal Knowledge confirmed/locked, cancellation, persisted reload, legacy migration, melee-only mastery, two-tier/four-group layout, fighter, 2014, mobile");
  }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures","legacy-wizard.json"),"utf8")).save;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const core=o=>({
  cls:o.cls,level:o.level,sp:o.sp,bg:o.bg,sub:o.sub,
  cantrips:[...(o.cantrips||[])].sort(),spellbook:[...(o.spellbook||[])].sort(),prepared:[...(o.prepared||[])].sort(),
  play:o.play,slotsUsed:o.slotsUsed,meta:o.meta
});
(async()=>{let browser;try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(URL+"?stage0-runtime=1",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const seeded=await page.evaluate(save=>{
    const r=deserialize(save);if(!r.ok)throw new Error("fixture deserialize failed");
    S.id=newId();document.querySelector("#fName").value="Stage0 驗收法師";
    go(7);renderFinal();saveCurrent(true);
    return {id:S.id,maxHP:S.play.hpMax};
  },fixture);
  assert(seeded.maxHP>5,"fixture max HP must be > 5");
  await page.locator("#hpAmt").fill("5");await page.locator('[data-hp="dmg"]').click();
  await page.locator("#hpAmt").fill("3");await page.locator('[data-hp="temp"]').click();
  await page.locator('[data-ds="s2"]').click();
  await page.locator('[data-insp="1"]').click();
  assert.equal(await page.locator('[data-res="ar"][data-d="1"]').count(),1,"wizard Arcane Recovery control missing");
  await page.locator('[data-res="ar"][data-d="1"]').click();
  assert.equal(await page.locator('[data-slot="l1"][data-d="1"]').count(),1,"level 1 spell slot control missing");
  await page.locator('[data-slot="l1"][data-d="1"]').click();
  await page.locator("#playNotes").fill("11/14 Stage 0：已使用奧術恢復，記得補藥水。");
  await sleep(1150);
  const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem(SK.char(id))),seeded.id);
  assert(saved,"autosave missing");
  assert.equal(saved.play.hp,seeded.maxHP-5);
  assert.equal(saved.play.thp,3);
  assert.deepEqual(saved.play.ds,{s:2,f:0});
  assert.equal(saved.play.insp,true);
  assert.equal(saved.play.res.ar,1);
  assert.equal(saved.slotsUsed.l1,1);
  assert(saved.play.notes.includes("Stage 0"));

  await page.reload({waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const afterReload=await page.evaluate(id=>{loadChar(id);go(7);renderFinal();return serialize()},seeded.id);
  assert.deepEqual(core(afterReload),core(saved),"reload/read-back drift");
  assert((await page.locator("#playNotes").inputValue()).includes("Stage 0"),"notes UI did not read back");

  await page.evaluate(()=>openRoster());
  const downloadPromise=page.waitForEvent("download");
  await page.locator('[data-exp="'+seeded.id+'"]').click();
  const download=await downloadPromise,exportedPath=await download.path();
  const exported=JSON.parse(fs.readFileSync(exportedPath,"utf8"));
  assert.deepEqual(core(exported),core(saved),"exported JSON drift");

  const ctx2=await browser.newContext({viewport:{width:390,height:844}});
  const mobile=await ctx2.newPage();mobile.on("pageerror",e=>errors.push("mobile:"+String(e)));
  await mobile.goto(URL+"?stage0-recovery=1",{waitUntil:"networkidle"});
  if(await mobile.locator("#closeRuleset").isVisible())await mobile.locator("#closeRuleset").click();
  await mobile.locator("#fileInput").setInputFiles(exportedPath);
  await sleep(250);
  const recovered=await mobile.evaluate(()=>{
    const r=getRoster();if(!r.length)throw new Error("import produced empty roster");
    loadChar(r[0].id);go(7);renderFinal();
    return {save:serialize(),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      notes:document.querySelector("#playNotes")?.value||"",hpVisible:!!document.querySelector('[data-hp="dmg"]'),
      slotVisible:!!document.querySelector('[data-slot="l1"]')};
  });
  assert.deepEqual(core(recovered.save),core(exported),"clean-profile JSON recovery drift");
  assert(recovered.overflow<=1,"mobile horizontal overflow");
  assert(recovered.notes.includes("Stage 0"),"mobile notes missing");
  assert(recovered.hpVisible&&recovered.slotVisible,"mobile runtime controls missing");
  assert.equal(errors.length,0,"page errors: "+errors.join(" | "));
  console.log(JSON.stringify({id:seeded.id,hp:saved.play.hp,thp:saved.play.thp,deathSaves:saved.play.ds,
    inspiration:saved.play.insp,arcaneRecoveryUsed:saved.play.res.ar,level1SlotsUsed:saved.slotsUsed.l1,
    notesRecovered:recovered.notes,mobileOverflow:recovered.overflow,failureCount:0},null,2));
  await ctx2.close();await ctx.close();
}finally{if(browser)await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

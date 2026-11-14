"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const BASE=process.env.QA_BASE||"http://127.0.0.1:18766";
const css=(v)=>parseFloat(v)||0;
const stableState=raw=>{const x=JSON.parse(raw);delete x.ts;return x};
async function start(page){
 const resp=await page.goto(BASE+"/index.html",{waitUntil:"domcontentloaded"});
 assert.equal(resp.status(),200);
 await page.waitForFunction(()=>typeof go==="function"&&typeof renderFinal==="function"&&typeof window.getComputedStyle==="function");
 await page.waitForTimeout(400);
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
}
async function makeCharacter(page,ruleset,cls){
 return page.evaluate(({ruleset,cls})=>{
  resetState();S.ruleset=ruleset;syncRulesetUI();
  S.cls=CLASSES.find(x=>x.n===cls);S.classConfirmed=true;
  S.level=ruleset==="2024"?5:3;
  S.classLevels={[cls]:S.level};
  S.sp=(ruleset==="2024"?SPECIES_2024:SPECIES_2014).find(x=>x.n==="人類")||(ruleset==="2024"?SPECIES_2024:SPECIES_2014)[0];
  S.bg=(ruleset==="2024"?BACKGROUNDS_2024:BACKGROUNDS_2014)[0];
  S.base={str:12,dex:14,con:14,int:16,wis:13,cha:10};
  S.gear.weapons=["木杖"];S.gear.gold={pp:0,gp:25,sp:1,cp:0};
  if(ruleset==="2024"&&cls==="法師"){
   const cant=SPELLS.find(sp=>sp.lv===0&&sp.cls.includes("W"));
   const lvl=SPELLS.find(sp=>sp.lv===1&&sp.cls.includes("W"));
   S.cantrips=new Set([cant.n]);S.prepared=new Set([lvl.n]);S.spellbook=new Set([lvl.n]);
  }
  if(ruleset==="2014"&&cls==="法師"){
   const can=SPELLS14.find(sp=>sp.lv===0&&sp.cls.includes("W"));
   const lvl=SPELLS14.find(sp=>sp.lv===1&&sp.cls.includes("W"));
   S.spellByClass={法師:{cantrips:[can.n],book:[lvl.n],known:[],prepared:[lvl.n]}};
  }
  go(7);
  const values=ABILITIES.map(a=>({name:a.n,score:finalScore(a.k),modifier:finalScore(a.k)!=null?fmt(mod(finalScore(a.k))):"—",
    save:saveTotal(a.k)!=null?fmt(saveTotal(a.k)):"—",prof:saveProfSet().has(a.k),
    breakdown:abilityScoreBreakdown(a.k)}));
  return {values,serialized:JSON.stringify(serialize())};
 },{ruleset,cls});
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const screenshots=path.join(__dirname,"..","tmp","qa-final-sheet-ux");
 fs.mkdirSync(screenshots,{recursive:true});
 try{
  for(const width of [360,390,480,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width>=768?900:844},reducedMotion:"reduce"});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   const styles=[];page.on("response",r=>{if(r.url().includes("final-sheet-ux-5r.css"))styles.push(r.status())});
   await start(page);
   assert(styles.includes(200),"final-sheet UX stylesheet must load");
   const baseline=await makeCharacter(page,"2024","法師");
   const ui=await page.evaluate(()=>{
    const css=v=>parseFloat(v)||0;
    const root=document.getElementById("finalSheet");
    const stats=[...root.querySelectorAll(".fs-statrow .stat-box")].map(x=>({val:x.querySelector(".sv")?.textContent,caption:x.querySelector(".sl")?.textContent}));
    const abilities=[...root.querySelectorAll(".fs-abrow .ab-box")].map(x=>({
     name:x.querySelector(".an")?.textContent,modifier:x.querySelector(".am")?.textContent,
     modPx:css(getComputedStyle(x.querySelector(".am")).fontSize),
     score:x.querySelector(".as-score")?.textContent,save:x.querySelector(".as-save")?.textContent,
     detail:x.querySelector(".ab-breakdown")?.textContent,detailOpen:x.querySelector(".ab-source")?.open
    }));
    const toolbar=document.querySelector(".step-panel[data-step='7'] .fs-toolbar");
    const buttons=[...toolbar.querySelectorAll("button")].map(x=>({text:x.textContent,step:x.dataset.go||"",onclick:x.getAttribute("onclick")||""}));
    const exports=toolbar.querySelector(".fs-export-options");
    const firstSection=root.querySelector(".fs-sec");
    const spell=root.querySelector(".spell-sheet");
    const spellEntry=spell?.querySelector(".ss-entry");
    const gear=root.querySelector('#armorSel');
    const inputs=[...root.querySelectorAll('.gear-ctl input:not([type=checkbox]),.gear-ctl select')].map(x=>({
     id:x.id,height:x.getBoundingClientRect().height,font:css(getComputedStyle(x).fontSize)
    }));
    const fullRule=root.querySelector(".fs-sec .trait-rules");
    const nav=document.querySelector("#finalJumpNav");
    return {
     stats,abilities,buttons,
     exportInitiallyClosed:exports&&!exports.open,
     quickStepButtons:toolbar.querySelectorAll("[data-go]").length,
     spellCount:spell?.querySelectorAll(".ss-entry").length||0,
     spellNamePx:spellEntry?css(getComputedStyle(spellEntry.querySelector(".ss-entry-name")).fontSize):0,
     spellMetaPx:spellEntry?css(getComputedStyle(spellEntry.querySelector(".ss-entry-field")).fontSize):0,
     firstSectionPx:firstSection?css(getComputedStyle(firstSection).fontSize):0,
     featuresPx:fullRule?css(getComputedStyle(fullRule).fontSize):null,
     inputs,
     printRootDisplay:getComputedStyle(root).display,
     navKeys:[...nav.querySelectorAll("[data-sheet-jump]")].map(x=>x.dataset.sheetJump),
     topOverflow:document.documentElement.scrollWidth-innerWidth,
     cardWidth:root.getBoundingClientRect().width,
     navCount:document.querySelectorAll("#finalJumpNav").length
    };
   });
   assert.equal(ui.stats.length,6,"must retain all six combat stats");
   assert.equal(ui.abilities.length,6,"must retain all six ability scores");
   for(let i=0;i<6;i++){
    const v=baseline.values[i],el=ui.abilities[i];
    assert.equal(el.name,v.name);
    assert.equal(el.modifier,v.modifier,"modifier must remain canonical");
    assert(el.score.includes(String(v.score??"—")),"score must remain visible");
    assert(el.save.includes(v.save),"saving throw must remain visible");
    assert(el.detail.includes(v.breakdown),"all modifier source rules must remain accessible");
    assert(!el.detailOpen,"do not expand all six breakdowns by default");
    assert(el.modPx>=28,"modifier must be prominent "+width+": "+JSON.stringify(el));
   }
   assert(ui.firstSectionPx>=15.5,"character features main text >=15.5px");
   if(ui.featuresPx!=null)assert(ui.featuresPx>=15.5,"trait rule body >=15.5px");
   assert(ui.spellCount>=2,"prepared and cantrip spells remain present");
   assert(ui.spellNamePx>=15.5,"spell name >=15.5px");
   assert(ui.spellMetaPx>=(width<=620?13.5:14),"spell metadata stays readable >=13.5px on mobile and >=14px desktop");
   assert(ui.inputs.every(x=>x.height>=43&&x.font>=15),"equipment controls touch-size and legibility");
   assert.equal(ui.exportInitiallyClosed,true);
   assert.equal(ui.quickStepButtons,2,"no duplicate global navigation buttons in toolbar");
   assert.equal(ui.buttons.length,6,"six distinct actions, not old seven");
   assert.deepEqual(ui.buttons.filter(x=>x.step).map(x=>x.step),["11","5"]);
   assert(ui.navKeys.includes("spells")&&ui.navKeys.includes("equipment")&&ui.navKeys.includes("skills"),"existing section nav retained");
   assert.equal(ui.navCount,1,"no second section nav created");
   assert(ui.topOverflow<=2,"no page overflow "+width+" "+JSON.stringify(ui));
   await page.locator("#finalSheet .ab-source").first().locator("summary").click();
   assert(await page.locator("#finalSheet .ab-source").first().evaluate(el=>el.open),"touch/keyboard ability source accessible");
   const exportMenu=page.locator(".step-panel[data-step='7'] .fs-export-options");
   await exportMenu.locator("summary").click();
   assert(await exportMenu.evaluate(el=>el.open),"other export menu opens");
   assert.equal(await exportMenu.locator("button").count(),3);
   await page.screenshot({path:path.join(screenshots,"wizard-"+width+".png"),fullPage:false});
   const savedAfterDisplay=await page.evaluate(()=>JSON.stringify(serialize()));
   assert.deepEqual(stableState(savedAfterDisplay),stableState(baseline.serialized),"view controls must not mutate character save state (ignore volatile updated timestamp)");
   // Existing section index is still the only place for on-sheet jumps.
   await page.locator('#finalJumpNav [data-sheet-jump="equipment"]').click();
   const jump=await page.evaluate(()=>{
    const b=document.querySelector('#finalJumpNav [data-sheet-jump="equipment"]');
    const target=document.getElementById(b.getAttribute("aria-controls"));
    return {active:document.querySelector("#finalJumpNav [aria-current=location]")?.dataset.sheetJump,
      target:target.getBoundingClientRect().top,nav:document.querySelector("#finalJumpNav").getBoundingClientRect().bottom};
   });
   assert.equal(jump.active,"equipment");
   assert(jump.target>=jump.nav-4,"equipment jump should not hide target behind sticky nav");
   // Real actionable controls must still reach the requested page.
   await page.locator('.step-panel[data-step="7"] .fs-toolbar [data-go="11"]').click();
   assert.equal(await page.evaluate(()=>S.step),11);
   await page.evaluate(()=>go(7));
   await page.locator('.step-panel[data-step="7"] .fs-toolbar [data-go="5"]').click();
   assert.equal(await page.evaluate(()=>S.step),5);
   await page.evaluate(()=>go(7));
   await page.emulateMedia({media:"print"});
   assert.equal(await page.locator(".fs-toolbar").evaluate(el=>getComputedStyle(el).display),"none");
   assert.equal(await page.locator("#finalSheet .ab-source").first().evaluate(el=>getComputedStyle(el).display),"none");
   assert.equal(await page.locator("#finalSheet").evaluate(el=>getComputedStyle(el).display),"block");
   await page.emulateMedia({media:"screen"});
   // 2014 and 2024 share the same visual hierarchy but different rule data.
   const classic=await makeCharacter(page,"2014","法師");
   const classicUI=await page.evaluate(()=>({ruleset:S.ruleset,abl:document.querySelectorAll("#finalSheet .ab-box").length,
     spells:document.querySelectorAll("#finalSheet .ss-entry").length,gear:document.querySelectorAll("#finalSheet .wpn-row").length,
     overflow:document.documentElement.scrollWidth-innerWidth,saved:JSON.stringify(serialize())}));
   assert.equal(classicUI.ruleset,"2014");
   assert.equal(classicUI.abl,6);
   assert(classicUI.spells>=1,"2014 spells must not disappear");
   assert(classicUI.gear>=2,"2014 weapons must remain");
   assert(classicUI.overflow<=2,"2014 no overflow "+width);
   assert.deepEqual(stableState(classicUI.saved),stableState(classic.serialized),"2014 rendering may not mutate save (ignore volatile updated timestamp)");
   await page.screenshot({path:path.join(screenshots,"2014-"+width+".png"),fullPage:false});
   assert.deepEqual(errors,[],"no page JS errors "+width);
   console.log("PASS final-sheet UX "+width+"px 2024+2014: hierarchy, six ability sources, equipment, spells, shortcuts, print and no overflow");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

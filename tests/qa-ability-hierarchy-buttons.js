"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright"),path=require("node:path");
const {pathToFileURL}=require("node:url");
const url=process.env.QA_URL||pathToFileURL(path.resolve(__dirname,"../index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 let checks=0;
 const ok=(value,label)=>{assert(value,label);checks++};
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url+"?qa-ability-multiselect=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>go(8));
  await page.addStyleTag({content:"#rulesetModal{display:none!important;pointer-events:none!important}"});
  ok(await page.locator(".ability-ref-card").count()>400,"legacy full-list default");
  await page.locator("[data-ar-category='class']").click();
  ok(await page.locator("[data-ar-class]").count()===12,"12 classes");
  ok(await page.locator(".ability-ref-card").count()===0,"class selection awaits picks");
  const ids=await page.evaluate(()=>({
   warlock:Object.keys(PROG_2024).find(x=>displayName5R("classes",x).includes("契術師")),
   druid:Object.keys(PROG_2024).find(x=>displayName5R("classes",x).includes("德魯伊"))
  }));
  ok(ids.warlock&&ids.druid,"class ids");
  await page.locator('[data-ar-class="'+ids.warlock+'"]').click();
  await page.locator('[data-ar-class="'+ids.druid+'"]').click();
  ok(await page.locator('[data-ar-class][aria-pressed="true"]').count()===2,"two classes active");
  const classes=await page.evaluate(()=>({chosen:[...abilityRefFilter.classes],rows:abilityRefFilteredRows5R()}));
  ok(classes.chosen.length===2,"two classes in model");
  ok(classes.rows.length>0&&classes.rows.every(x=>ids.warlock===x.classId||ids.druid===x.classId),"only selected classes");
  ok(classes.rows.every(x=>x.kind!=="subclass"),"initial base features only");
  const subs=await page.evaluate(ids=>({
   fey:PROG_2024[ids.warlock].subs.find(x=>displayName5R("subclasses",x.n).includes("至高妖精宗主"))?.n,
   stars:PROG_2024[ids.druid].subs.find(x=>displayName5R("subclasses",x.n).includes("星辰結社"))?.n,
   land:PROG_2024[ids.druid].subs.find(x=>displayName5R("subclasses",x.n).includes("大地結社"))?.n
  }),ids);
  ok(subs.fey&&subs.stars&&subs.land,"cross-class subclass choices");
  const pressSub=async(cls,sub)=>page.locator('[data-ar-subclass="'+cls+'|'+sub+'"]').click();
  await pressSub(ids.warlock,subs.fey);
  await pressSub(ids.druid,subs.stars);
  await pressSub(ids.druid,subs.land);
  ok(await page.locator('[data-ar-subclass][aria-pressed="true"]').count()===3,"three subclasses active");
  let state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.some(x=>x.classId===ids.warlock&&x.kind==="class"),"warlock base features");
  ok(state.some(x=>x.classId===ids.druid&&x.kind==="class"),"druid base features");
  ok(state.some(x=>x.classId===ids.warlock&&x.subclassId===subs.fey),"warlock fey included");
  ok(state.some(x=>x.classId===ids.druid&&x.subclassId===subs.stars),"druid stars included");
  ok(state.some(x=>x.classId===ids.druid&&x.subclassId===subs.land),"druid land included");
  ok(state.every(x=>x.kind!=="subclass"||
    x.classId===ids.warlock&&x.subclassId===subs.fey||
    x.classId===ids.druid&&[subs.stars,subs.land].includes(x.subclassId)),"cross-class contamination blocked");
  await pressSub(ids.druid,subs.stars);
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(!state.some(x=>x.classId===ids.druid&&x.subclassId===subs.stars),"toggle subclass off");
  await pressSub(ids.warlock,"all");
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.some(x=>x.classId===ids.warlock&&x.kind==="subclass"&&x.subclassId!==subs.fey),"all subclasses for that class");
  ok(state.every(x=>x.classId!==ids.druid||x.kind!=="subclass"||x.subclassId===subs.land),"all limited to owning class");
  await pressSub(ids.warlock,"base");
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.every(x=>x.classId!==ids.warlock||x.kind!=="subclass"),"base clears only owning class");
  ok(state.some(x=>x.classId===ids.druid&&x.subclassId===subs.land),"other class choices retained");
  await page.locator("[data-ar-level='1-4']").click();
  await page.locator("[data-ar-level='11-16']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.length>0&&state.every(x=>+x.level>=1&&+x.level<=4||+x.level>=11&&+x.level<=16),"multiple level OR bands");
  ok(await page.locator("[data-ar-level][aria-pressed='true']").count()===2,"two level chips");
  await page.locator("[data-ar-level='1-4']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.length>0&&state.every(x=>+x.level>=11&&+x.level<=16),"toggle level removes band");
  await page.locator("[data-ar-level='all']").click();
  ok(await page.evaluate(()=>abilityRefFilter.levelBands.size===0),"all levels clears bands");
  await page.locator("[data-ar-category='species']").click();
  await page.locator("[data-ar-category='feat']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.some(x=>x.kind==="species")&&state.some(x=>x.kind==="feat")&&state.some(x=>x.kind==="class"),"three categories in union");
  ok(await page.locator("[data-ar-category][aria-pressed='true']").count()===3,"three category chips");
  await page.locator("[data-ar-category='feat']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(!state.some(x=>x.kind==="feat")&&state.some(x=>x.kind==="species"),"toggle category off");
  await page.locator('[data-ar-class="'+ids.warlock+'"]').click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.some(x=>x.kind==="species")&&state.some(x=>x.classId===ids.druid)&&!state.some(x=>x.classId===ids.warlock),"remove one class and preserve others");
  await page.locator("[data-ar-category='all']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  ok(state.length>400,"all categories restores default");
  ok(await page.locator("[data-ar-category='all']").getAttribute("aria-pressed")==="true","all category aria state");
  await page.locator("[data-ar-clear]").click();
  ok(await page.evaluate(()=>abilityRefFilter.categories.size===0&&abilityRefFilter.classes.size===0&&abilityRefFilter.subclasses.size===0&&abilityRefFilter.levelBands.size===0&&abilityRefFilter.actions.size===0),"reset all groups");
  await page.locator("#abilityRefQ").fill("神導術");await page.waitForTimeout(200);
  ok(await page.locator(".ability-ref-card").count()>0,"text search still works");
  await page.locator("#abilityRefQ").fill("");await page.waitForTimeout(200);
  await page.locator("[data-ar-category='class']").click();
  await page.locator('[data-ar-class="'+ids.warlock+'"]').click();
  await page.locator('[data-ar-class="'+ids.druid+'"]').click();
  await pressSub(ids.warlock,subs.fey);
  await pressSub(ids.druid,subs.stars);
  const layout=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
   subgroups:document.querySelectorAll(".ability-ref-subgroups>[data-ar-subgroup]").length,
   buttons:[...document.querySelectorAll(".ability-ref-chips button")].every(x=>x.getAttribute("aria-pressed")!==null),
   category:abilityRefFilter.categories.has("class")
  }));
  ok(layout.overflow<=1,"390px mobile no horizontal overflow");
  ok(layout.subgroups===2,"two independent subclass panels");
  ok(layout.buttons&&layout.category,"accessible pressed states");
  await page.setViewportSize({width:360,height:740});
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),"360px mobile overflow");
  await page.evaluate(()=>{S.ruleset="2014";renderRef()});
  ok(await page.locator(".ability-ref-card").count()===0,"2014 lookup remains unchanged");
  ok(errors.length===0,"no runtime errors: "+errors.join(";"));
  console.log("PASS ability multi-select hierarchy",checks,"checks; class/subclass/category/level/clear/mobile/2014");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

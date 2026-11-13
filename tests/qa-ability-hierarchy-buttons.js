"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {pathToFileURL}=require("node:url"),path=require("node:path");
const url=process.env.QA_URL||pathToFileURL(path.resolve(__dirname,"../index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 let cases=0;
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url+"?qa-ability-hierarchy=1",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>go(8));
  await page.addStyleTag({content:"#rulesetModal{display:none!important;pointer-events:none!important}"});
  assert.equal(await page.locator("[data-ar-category='class']").count(),1);cases++;
  assert.equal(await page.locator(".ability-ref-card").count()>400,true,"legacy all ability default");cases++;
  await page.locator("[data-ar-category='class']").click();
  assert.equal(await page.locator("[data-ar-class]").count(),12,"all 12 classes");cases++;
  assert.equal(await page.locator(".ability-ref-card").count(),0,"prompt to select class");cases++;
  for(const cls of ["戰士","牧師","德魯伊","術士","契術師","遊俠","法師"]){
    const actual=await page.evaluate(cls=>Object.keys(PROG_2024).find(k=>displayName5R("classes",k).includes(cls)),cls);
    assert(actual,"missing class "+cls);
    await page.locator("[data-ar-class]").filter({hasText:cls}).first().click();
    const state=await page.evaluate(()=>({cls:abilityRefFilter.classId,base:abilityRefFilteredRows5R(),sub:abilityRefFilter.subclassId,mode:abilityRefFilter.mode}));
    assert.equal(state.cls,actual,cls+" class selection");cases++;
    assert.equal(state.sub,"base");cases++;
    assert.equal(state.mode,"all");cases++;
    assert(state.base.length>0&&state.base.every(x=>x.classId===actual&&x.kind!=="subclass"),cls+" no mixed class/subclass");cases++;
    assert.equal(await page.locator("[data-ar-subclass]").count(),(await page.evaluate(cls=>PROG_2024[cls].subs.length,actual))+2);cases++;
  }
  const warlock=await page.evaluate(()=>Object.keys(PROG_2024).find(k=>displayName5R("classes",k).includes("契術師")));
  await page.locator("[data-ar-class='"+warlock+"']").click();
  const fey=await page.evaluate(cls=>PROG_2024[cls].subs.find(x=>displayName5R("subclasses",x.n).includes("至高妖精宗主"))?.n,warlock);
  assert(fey,"fey patron exists");
  await page.locator("[data-ar-subclass='"+fey+"']").click();
  let state=await page.evaluate(()=>({rows:abilityRefFilteredRows5R(),category:abilityRefFilter.category,sub:abilityRefFilter.subclassId}));
  assert.equal(state.category,"class");assert.equal(state.sub,fey);cases+=2;
  assert(state.rows.some(x=>x.kind==="class")&&state.rows.some(x=>x.kind==="subclass"),"base + selected subclass");cases++;
  assert(state.rows.every(x=>x.classId===warlock&&(x.kind!=="subclass"||x.subclassId===fey)),"no other patron");cases++;
  await page.locator("[data-ar-level='1-4']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  assert(state.length>0&&state.every(x=>+x.level>=1&&+x.level<=4),"level band");cases++;
  await page.locator("[data-ar-subclass='all']").click();
  const allRows=await page.evaluate(()=>abilityRefFilteredRows5R());
  assert(allRows.length>=state.length&&allRows.some(x=>x.kind==="subclass"),"all subclasses comparison");cases++;
  await page.locator("[data-ar-category='species']").click();
  assert.equal(await page.locator("[data-ar-class]").count(),0,"hide class choices after switching");cases++;
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  assert(state.length>0&&state.every(x=>x.kind==="species"),"species classification");cases++;
  await page.locator("[data-ar-category='feat']").click();
  state=await page.evaluate(()=>abilityRefFilteredRows5R());
  assert(state.length>0&&state.every(x=>x.kind==="feat"),"feat classification");cases++;
  for(const kind of ["boon","style","maneuver","metamagic","invocation"]){
    await page.locator("[data-ar-category='"+kind+"']").click();
    state=await page.evaluate(()=>abilityRefFilteredRows5R());
    assert(state.length>0&&state.every(x=>x.kind===kind),kind+" classification");cases++;
  }
  await page.locator("[data-ar-clear]").click();
  assert.equal(await page.locator("[data-ar-category='all']").getAttribute("aria-pressed"),"true");cases++;
  await page.locator("#abilityRefQ").fill("神導術");await page.waitForTimeout(200);
  assert((await page.locator(".ability-ref-card").count())>0,"search survives");cases++;
  await page.locator("[data-ar-category='class']").click();
  await page.locator("[data-ar-class='"+warlock+"']").click();
  await page.locator("[data-ar-subclass='"+fey+"']").click();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=1,"mobile overflow "+overflow);cases++;
  assert.deepEqual(errors,[],"browser page errors");
  console.log("PASS hierarchical ability quick reference",cases,"cases; 12 class buttons; warlock/fey; sub + class; levels; categories; mobile");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

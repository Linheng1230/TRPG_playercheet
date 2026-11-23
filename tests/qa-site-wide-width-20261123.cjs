"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const url=process.env.QA_URL||"http://127.0.0.1:18912/";
const output=process.env.QA_OUTPUT||path.join(__dirname,"..","tmp","qa-site-wide-width");
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_CHANNEL?{channel:process.env.QA_BROWSER_CHANNEL}:{})});
 const records=[],failures=[];
 try{
 const cases=[
  ...["creator","sheet","play","spells","shop","characters","adventures","rules"].map(route=>({file:"index.html?view="+route,route,width:1648})),
  ...["creator","play","spells","rules"].map(route=>({file:"index.html?view="+route,route,width:390})),
  {file:"index.html?view=play",route:"play",width:320},
  {file:"index.html?view=play",route:"play",width:480},
  {file:"home.html",route:"home",width:320},
  {file:"academy.html",route:"academy",width:320},
  {file:"index.html?view=play",route:"play",width:768},
  {file:"index.html?view=play",route:"play",width:1280},
  {file:"index.html?view=play",route:"play",width:1920},
  ...["creator","sheet","play","spells","shop","characters","adventures","rules"].map(route=>({file:"index.html?view="+route,route,width:2560})),
  {file:"index.html?view=play",route:"play",width:3200},
  {file:"home.html",route:"home",width:2560},
  {file:"academy.html",route:"academy",width:2560},
  {file:"home.html",route:"home",width:3200},
  {file:"academy.html",route:"academy",width:3200},
  {file:"home.html",route:"home",width:1648},{file:"home.html",route:"home",width:390},
  {file:"academy.html",route:"academy",width:1648},{file:"academy.html",route:"academy",width:390}
 ];
 for(const spec of cases){
  const context=await browser.newContext({viewport:{width:spec.width,height:930},locale:"zh-TW",deviceScaleFactor:1});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  try{
   await page.goto(url+spec.file,{waitUntil:"domcontentloaded",timeout:45000});
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   if(spec.route==="play"){
    await page.waitForFunction(()=>typeof go==="function",{timeout:15000});
    await page.evaluate(()=>{
     S.ruleset="2024";syncRulesetUI();S.id=newId();
     S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};
     S.sp=SPECIES_2024.find(x=>x.n==="人類");
     S.base={str:10,dex:14,con:14,int:10,wis:18,cha:10};
     S.play={hp:31,hpMax:31,thp:0,hd:4,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"SITE WIDTH QA"};
     document.getElementById("fName").value="QA_WIDTH_TEST";
     go(11);
    });
    if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
    if([390,1648].includes(spec.width)){
     const root=page.locator("#playStatusBody");
     const before=await root.locator(".ps-run-hp-row strong").innerText();
     await root.locator(".ps-run-hud [data-ps-action=damage1]").click();
     assert.notEqual(await root.locator(".ps-run-hp-row strong").innerText(),before,"HUD damage must still work");
     await root.locator("[data-ps-action=undo]").click();
     assert.equal(await root.locator(".ps-run-hp-row strong").innerText(),before,"Undo must restore HP");
    }
   }
   const metric=await page.evaluate(({route})=>{
    const rect=(q)=>{const e=document.querySelector(q);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {left:+r.left.toFixed(1),right:+r.right.toFixed(1),width:+r.width.toFixed(1),maxWidth:c.maxWidth,display:c.display}};
    return {route,viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,main:rect("body.wcs-inner main"),workspace:rect("body.wcs-inner .workspace"),play:rect("#playStatusBody"),home:rect("body.wcs-demo.wcs-home .wcs-shell"),academy:rect(".academy-wrap"),active:document.querySelector(".step-panel.active")?.dataset.step,cssMaxCap:getComputedStyle(document.documentElement).getPropertyValue("--site-canvas-max").trim(),hasCSS:[...document.styleSheets].some(s=>s.href?.includes("site-wide-width.css?v=20261123-v2-uncapped"))};
   },{route:spec.route});
   assert(metric.hasCSS,"missing correct versioned CSS "+spec.route);
   assert.equal(metric.cssMaxCap,"none","fixed canvas cap or stale cache "+JSON.stringify(metric));
   assert(metric.overflow<=1,"document horizontal overflow "+JSON.stringify(metric));
   if(spec.width>=1280){
    const canvas=metric.main||metric.home||metric.academy;
    assert(canvas,"missing root canvas "+spec.route);
    // Regression for PR #109 false PASS: a hard 1880 CSS-pixel cap looks fine at
    // <=1920px but creates huge side bands on ultrawide or zoomed-out screens.
    assert(canvas.width>=spec.width*.98,"canvas not nearly edge-to-edge "+JSON.stringify(metric));
    assert(canvas.left<=spec.width*.012,"left artwork band too large "+JSON.stringify(metric));
    assert(spec.width-canvas.right<=spec.width*.012,"right artwork band too large "+JSON.stringify(metric));
    if(spec.route==="play"){
      assert(metric.workspace.width>=spec.width*.9,"play workspace still clamped "+JSON.stringify(metric));
      assert(metric.play&&metric.play.width>=spec.width*.87,"play status width-capped "+JSON.stringify(metric));
    }
   }
   if(spec.width===390&&spec.route==="play")assert(metric.play?.width<=390,"play overflows mobile");
   if(spec.route==="creator"&&spec.width>=2050){
    const columns=await page.locator("#classGrid").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length);
    assert.equal(columns,6,"ultrawide class picker must use six readable columns");
   }
   if(["creator","play","spells","sheet","home","academy"].includes(spec.route)&&[390,1648,1920,2560,3200].includes(spec.width)){
    // The ruleset dialog can initialize after DOMContentLoaded on the first visit.
    if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.waitForTimeout(80);
    await page.screenshot({path:path.join(output,"width-"+spec.route+"-"+spec.width+".png"),fullPage:false});
   }
   const record={route:spec.route,width:spec.width,cssMaxCap:metric.cssMaxCap,canvas:(metric.main||metric.home||metric.academy)?.width,workspace:metric.workspace?.width,play:metric.play?.width,overflow:metric.overflow,active:metric.active,errors:errors.length,status:"PASS"};
   records.push(record);console.log("WIDTH_QA "+JSON.stringify(record));
   assert.deepEqual(errors,[],"JS error "+spec.route+" "+spec.width);
  }catch(e){failures.push({route:spec.route,width:spec.width,error:String(e.message||e)});console.error("WIDTH_QA_FAIL "+JSON.stringify(failures[failures.length-1]));}
  finally{await context.close();}
 }
 }finally{await browser.close()}
 const report={result:failures.length?"FAIL":"PASS",checks:records.length,records,failures};
 fs.writeFileSync(path.join(output,"report.json"),JSON.stringify(report,null,2));
 console.log("WIDTH_QA_REPORT "+JSON.stringify({result:report.result,checks:records.length,failures}));
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

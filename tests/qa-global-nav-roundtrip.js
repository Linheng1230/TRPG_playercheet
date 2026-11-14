"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const base=process.env.QA_BASE||"http://127.0.0.1:18766";
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 try{
  for(const width of [360,390,480,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width>=768?900:844},reducedMotion:"reduce"});
   const pageErrors=[];
   page.on("pageerror",e=>pageErrors.push(String(e.message)));
   await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof window.SiteNavUX5R==="object"&&typeof go==="function");
   // The first-visit ruleset dialog is scheduled by boot() after a short delay.
   await page.waitForTimeout(350);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const primary=page.locator("#stepNav .nav-primary button");
   assert.deepEqual(await primary.allTextContents(),["角色創建","角色卡","規則速查","法術圖鑑","商店購物","角色百科","冒險圖鑑","跑團狀態"]);
   assert.equal(await page.locator("#stepNav .nav-ux-back").count(),0,"no redundant return on first load");
   const initial=await page.evaluate(()=>{
    if(innerWidth===480){S.ruleset="2014";syncRulesetUI()}
    S.cls=CLASSES.find(c=>c.n==="德魯伊");
    S.level=4;S.classLevels={[S.cls.n]:4};
    ABILITIES.forEach(a=>S.base[a.k]=10);S.base.dex=14;S.base.con=14;S.base.wis=16;
    S.sp=(S.ruleset==="2014"?SPECIES_2014:SPECIES_2024)[0];
    S.bg=(S.ruleset==="2014"?BACKGROUNDS_2014:BACKGROUNDS_2024)[0];
    S.play.notes="跨頁保留測試";
    document.getElementById("fName").value="全站導覽 QA";
    go(3);
    const filler=document.createElement("div");
    filler.id="qa-site-nav-filler";filler.style.height="1100px";
    document.querySelector('.step-panel[data-step="3"]').appendChild(filler);
    window.scrollTo({top:600,behavior:"instant"});
    return {ruleset:S.ruleset};
   });
   const start=await page.evaluate(()=>({y:window.scrollY,navTop:document.getElementById("stepNav").getBoundingClientRect().top,sticky:getComputedStyle(document.getElementById("stepNav")).position,navHeight:document.getElementById("stepNav").getBoundingClientRect().height}));
   assert(start.y>400,"test scroll must reach lower content "+width);
   assert.equal(start.sticky,"sticky","primary navigation must stay fixed "+width);
   assert(Math.abs(start.navTop)<3,"primary nav must stick at viewport top "+width);
   await primary.nth(1).click();
   assert.equal(await page.evaluate(()=>S.step),7,"role card selected");
   assert.equal(await page.locator("#stepNav .nav-ux-back").count(),1,"exactly one history back button");
   assert.match(await page.locator("#stepNav .nav-ux-back").getAttribute("aria-label"),/技能.*原本閱讀位置/);
   assert.equal(await page.locator("#stepNav .nav-primary button.active").innerText(),"角色卡");
   const back=page.locator("#stepNav .nav-ux-back");
   const rect=await back.boundingBox();
   assert(rect&&rect.width>=43&&rect.height>=43,"back button touch target >= 44px "+width);
   await back.click();
   const restored=await page.evaluate(()=>({step:S.step,y:window.scrollY,notes:S.play.notes}));
   assert.equal(restored.step,3,"return to last creator subpage "+width);
   assert.equal(restored.notes,"跨頁保留測試","navigation must preserve character state");
   assert(Math.abs(restored.y-start.y)<=12,"restore exact scroll position "+width+" "+JSON.stringify({start,restored}));
   const secondary=await page.evaluate(()=>{
    const el=document.querySelector("#stepNav .nav-secondary");
    const max=el.scrollWidth-el.clientWidth;
    el.scrollLeft=Math.min(120,Math.max(0,max));
    const before=el.scrollLeft;
    renderNav();
    return {max,before,after:document.querySelector("#stepNav .nav-secondary").scrollLeft};
   });
   assert(Math.abs(secondary.before-secondary.after)<=2,"preserve horizontal subnav position across rerender "+width+" "+JSON.stringify(secondary));
   await page.evaluate(()=>go(9));
   await primary.nth(1).click();
   await primary.nth(3).click();
   assert.equal(await page.evaluate(()=>S.step),9,"return to the independent spell reference page "+width);
   const quick=await page.evaluate(()=>{
    const nav=document.getElementById("stepNav");
    const main=nav.querySelectorAll(".nav-primary button");
    const secondary=nav.querySelectorAll(".nav-secondary");
    return {
     viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,
     primaryCount:main.length,primaryFit:nav.querySelector(".nav-primary").scrollWidth>=nav.querySelector(".nav-primary").clientWidth,
     secondaryCount:secondary.length,navVisible:nav.getBoundingClientRect().height>0,
     uniqueReturn:nav.querySelectorAll(".nav-ux-back").length===1,
     selected:nav.querySelectorAll(".nav-primary button[aria-current=page]").length===1,
     subSelected:nav.querySelectorAll(".nav-secondary button[aria-current=page]").length===1,
     navTop:nav.getBoundingClientRect().top
    };
   });
   assert(quick.documentWidth<=quick.viewport+2,"no page-level horizontal overflow at "+width+" "+JSON.stringify(quick));
   assert(quick.primaryFit,"primary nav supports horizontal scrolling at "+width);
   assert.equal(quick.primaryCount,8,"all navigation destinations present without duplicates");
   assert.equal(quick.secondaryCount,0,"independent entry does not duplicate a submenu");
   assert(quick.uniqueReturn&&quick.selected,"correct active entry and one back control");
   const print=await page.evaluate(()=>{const el=document.getElementById("stepNav");return el.matches("nav.steps")});
   assert(print,"unchanged original nav element");
   await page.emulateMedia({media:"print"});
   assert.equal(await page.locator("#stepNav").evaluate(el=>getComputedStyle(el).display),"none","nav hidden when printing");
   await page.emulateMedia({media:"screen"});
   fs.mkdirSync(path.join(__dirname,"..","tmp","qa-ux-global-nav"),{recursive:true});
   await page.screenshot({path:path.join(__dirname,"..","tmp","qa-ux-global-nav","nav-"+width+".png")});
   const charBoundary=await page.evaluate(()=>{
    const oldId=S.id;S.id="qa-new-character-"+Date.now();renderNav();
    return {different:S.id!==oldId,backButtons:document.querySelectorAll("#stepNav .nav-ux-back").length};
   });
   assert(charBoundary.different&&charBoundary.backButtons===0,"switching character must clear stale back history "+width);
   assert.deepEqual(pageErrors,[],"no page runtime errors at "+width);
   results.push({width,ruleset:initial.ruleset,returnedY:restored.y,initialY:start.y,secondary,quick,errors:pageErrors.length});
   await page.close();
   console.log("PASS global nav two-way "+width+"px "+initial.ruleset);
  }
 }finally{await browser.close()}
 console.log(JSON.stringify({pass:true,results},null,2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

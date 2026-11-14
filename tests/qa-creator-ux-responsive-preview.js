"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const base=process.env.QA_BASE||"http://127.0.0.1:18766";
const widths=[390,480,768,1440];
const waitModal=async page=>{
 await page.waitForTimeout(300);
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
};
const confirmClick=async(page,locator,accept=true)=>{
 page.once("dialog",d=>accept?d.accept():d.dismiss());
 await locator.click();
};
const placement=async(page,kind,inline)=>{
 const config={
  class:["classGrid","classDetail",'[data-step="0"] .class-confirm-controls'],
  bg:["bgGrid","bgDetail",".confirm-bg"],
  sp:["spGrid","spDetail",".confirm-sp"],
  subclass:["subGrid","subclassPreview","#subclassConfirm,#subclassConfirmed"]
 }[kind];
 const x=await page.evaluate(([gridId,detailId,barSelector])=>{
  const g=document.getElementById(gridId),detail=document.getElementById(detailId),bar=document.querySelector(barSelector);
  const selected=g.querySelector(".pick-card.selected");
  return {
   hasDetail:!!detail,hasBar:!!bar,inside:g.contains(detail),
   directlyAfter:!!selected&&selected.nextElementSibling===detail,
   siblingAfter:g.nextElementSibling===detail,
   afterDetail:!!bar&&!!(detail.compareDocumentPosition(bar)&Node.DOCUMENT_POSITION_FOLLOWING),
   unique:document.querySelectorAll("#"+detailId).length===1,
   controls:!!selected&&selected.getAttribute("aria-controls")===detailId,
   font:detail?getComputedStyle(detail).fontSize:null,
   selected:!!selected
  };
 },config);
 assert(x.hasDetail&&x.unique&&x.selected&&x.controls,"a single selected detail for "+kind+": "+JSON.stringify(x));
 assert.equal(x.inside,inline,"responsive placement for "+kind+": "+JSON.stringify(x));
 if(inline)assert(x.directlyAfter,"detail must immediately follow selected card "+kind+": "+JSON.stringify(x));
 else assert(x.siblingAfter,"desktop detail follows card grid "+kind+": "+JSON.stringify(x));
 assert(x.afterDetail&&x.hasBar,"confirmation after description "+kind+": "+JSON.stringify(x));
 return x;
};
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},reducedMotion:"reduce"});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof window.CreatorUX5R?.afterRender==="function"&&typeof go==="function");
   await waitModal(page);
   const inline=width<=700;
   await page.evaluate(()=>{
    resetState();S.ruleset="2024";syncRulesetUI();go(0);renderClasses();
   });
   assert(await page.locator("#next0").isDisabled(),"cannot advance before class lock "+width);
   await page.locator('[data-class-name="遊俠"]').click();
   assert.equal(await page.evaluate(()=>S.cls),null,"preview does not commit a class");
   await placement(page,"class",inline);
   assert((await page.locator("#classDetail").innerText()).includes("遊俠"));
   await page.locator('[data-class-name="德魯伊"]').click();
   await placement(page,"class",inline);
   assert((await page.locator("#classDetail").innerText()).includes("德魯伊"),"switching pending class redraws full preview");
   assert.equal(await page.locator("#classDetail").count(),1,"no duplicate class preview");
   const font=await page.locator("#classGrid .pick-card .desc").first().evaluate(el=>({px:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight)}));
   assert(font.px>=15&&font.line>=font.px*1.65,"readable class card description "+width+" "+JSON.stringify(font));
   const button=page.locator('[data-step="0"] .class-confirm-controls button');
   await confirmClick(page,button,false);
   assert.equal(await page.evaluate(()=>S.classConfirmed),false,"dismiss must leave class pending");
   await confirmClick(page,button);
   assert.equal(await page.evaluate(()=>S.classConfirmed),true,"class locked");
   assert(!(await page.locator("#next0").isDisabled()),"confirmed 2024 class enables next step");
   await placement(page,"class",inline);
   await page.evaluate(()=>go(2));
   const methodSizes=await page.locator("#methodTabs button").evaluateAll(btns=>btns.map(b=>({h:b.getBoundingClientRect().height,font:parseFloat(getComputedStyle(b).fontSize)})));
   assert(methodSizes.every(x=>x.h>=44&&x.font>=15),"accessible method controls "+width+" "+JSON.stringify(methodSizes));
   await page.evaluate(()=>go(1));
   await page.locator("#bgGrid .pick-card").filter({hasText:"罪犯"}).first().click();
   await placement(page,"bg",inline);
   await page.locator("#bgGrid .pick-card").filter({hasText:"士兵"}).first().click();
   await placement(page,"bg",inline);
   assert.equal(await page.evaluate(()=>S.bg.n),"士兵");
   await page.locator("#spGrid .pick-card").filter({hasText:"精靈"}).first().click();
   await placement(page,"sp",inline);
   await page.locator("#spDetail [data-spch=eLine]").selectOption("卓爾");
   await placement(page,"sp",inline);
   assert.equal(await page.evaluate(()=>S.spChoices.eLine),"卓爾","re-rendered species choices retained");
   await page.locator("#spGrid .pick-card").filter({hasText:"矮人"}).first().click();
   await placement(page,"sp",inline);
   assert.equal(await page.evaluate(()=>S.sp.n),"矮人");
   await page.evaluate(()=>go(3));
   const skillSize=await page.locator("#skillGrid .skill-chip").first().evaluate(el=>({h:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
   assert(skillSize.h>=48&&skillSize.font>=15,"readable and tappable skill options "+width+" "+JSON.stringify(skillSize));
   await page.evaluate(()=>go(4));
   const formSize=await page.locator("#fName").evaluate(el=>({h:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
   assert(formSize.h>=44&&formSize.font>=16,"prevent small mobile form input zoom "+width+" "+JSON.stringify(formSize));
   await page.evaluate(()=>go(1));
   // A viewport change must move the SAME DOM nodes back, with no duplicate rules.
   await page.setViewportSize({width:1440,height:900});
   await page.waitForFunction(()=>!document.getElementById("bgGrid").contains(document.getElementById("bgDetail")));
   await placement(page,"bg",false);await placement(page,"sp",false);
   await page.setViewportSize({width,height:width===1440?900:844});
   await page.waitForFunction(want=>document.getElementById("bgGrid").contains(document.getElementById("bgDetail"))===want,inline);
   await placement(page,"bg",inline);await placement(page,"sp",inline);
   await page.evaluate(()=>{
    S.ruleset="2024";
    S.cls=CLASSES.find(c=>c.n==="戰士");S.classConfirmed=true;
    S.level=3;S.classLevels={"戰士":3};S.sub=null;S.subConfirmed=false;pendingSubclass=null;S.style="";
    go(5);
   });
   const levelSize=await page.locator("#lvlBody .lvl-ctl button").first().evaluate(el=>({h:el.getBoundingClientRect().height,w:el.getBoundingClientRect().width}));
   assert(levelSize.h>=44&&levelSize.w>=44,"level-up plus/minus touch target "+width+" "+JSON.stringify(levelSize));
   const styleSize=await page.locator("#styleSel").evaluate(el=>({h:el.getBoundingClientRect().height,font:parseFloat(getComputedStyle(el).fontSize)}));
   assert(styleSize.h>=44&&styleSize.font>=15,"legible level-up style chooser "+width+" "+JSON.stringify(styleSize));
   await page.locator("#subGrid [data-sub]").first().click();
   assert.equal(await page.evaluate(()=>S.sub),null,"subclass preview must not commit");
   await placement(page,"subclass",inline);
   assert(await page.locator("#subclassPreview .subclass-preview-tier").count()>=3,"full subclass progression visible");
   const prose=await page.locator("#subclassPreview .subclass-feature-body").first().evaluate(el=>({
    font:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight)
   }));
   assert(prose.font>=15&&prose.line>=prose.font*1.7,"full subclass body readability");
   await confirmClick(page,page.locator("#confirmSubclass"));
   assert.equal(await page.evaluate(()=>S.subConfirmed),true,"subclass locked");
   await placement(page,"subclass",inline);
   const viewport=await page.evaluate(()=>({
    scroll:document.documentElement.scrollWidth, width:innerWidth,htmlHeight:document.documentElement.scrollHeight,
    detailCount:[...document.querySelectorAll("#classDetail,#bgDetail,#spDetail,#subclassPreview")].length
   }));
   assert(viewport.scroll<=viewport.width+2,"no page overflow "+width+" "+JSON.stringify(viewport));
   assert.equal(viewport.detailCount,4,"no duplicated detail nodes");
   await page.evaluate(()=>go(0));
   fs.mkdirSync(path.join(__dirname,"..","tmp","qa-creator-ux"),{recursive:true});
   await page.screenshot({path:path.join(__dirname,"..","tmp","qa-creator-ux","creator-"+width+".png"),fullPage:false});
   await page.evaluate(()=>go(1));
   await page.screenshot({path:path.join(__dirname,"..","tmp","qa-creator-ux","origin-"+width+".png"),fullPage:false});
   assert.deepEqual(errors,[],"no runtime errors "+width);
   console.log("PASS creator UX "+width+"px inline="+inline+" class/origin/subclass/lock/resize/readability/overflow");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

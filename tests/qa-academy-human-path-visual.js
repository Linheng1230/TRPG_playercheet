"use strict";
/* Regression against a real player route: Home -> class-fit quiz -> canonical Creator.
 * Preserves former crushed-grid geometry gates while replacing retired lesson/practice expectations.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18766/").replace(/\/?$/,"/");
const outDir=process.env.QA_SCREENSHOT_DIR||null;
const reports=[];
async function heroArt(page,width,phase){
 const hero=page.locator(".academy-hero");
 await hero.scrollIntoViewIfNeeded();
 await hero.evaluate(async e=>{
  const url=getComputedStyle(e,"::before").backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];
  if(!url)throw Error("hero art missing");
  const im=new Image();im.src=url;await im.decode();
 });
 const actual=await hero.screenshot({animations:"disabled"});
 const hidden=await page.addStyleTag({content:".academy-hero::before{visibility:hidden!important}"});
 let blank;
 try{blank=await hero.screenshot({animations:"disabled"})}finally{await hidden.evaluate(e=>e.remove())}
 const result=await page.evaluate(async ({a,b})=>{
  async function pixels(s){const i=new Image();i.src="data:image/png;base64,"+s;await i.decode();const c=document.createElement("canvas");c.width=i.width;c.height=i.height;const x=c.getContext("2d");x.drawImage(i,0,0);return {w:c.width,h:c.height,p:x.getImageData(0,0,c.width,c.height).data}}
  const x=await pixels(a),y=await pixels(b);let sum=0,n=0,changed=0;
  // Rightmost illustrated zone, excluding ornamental edges and mobile action row.
  for(let j=8;j<Math.min(x.h-8,innerWidth<=760?72:x.h-8);j++)for(let i=Math.floor(x.w*(innerWidth<=760?.77:.80));i<x.w-8;i++){
   const k=(j*x.w+i)*4,d=(Math.abs(x.p[k]-y.p[k])+Math.abs(x.p[k+1]-y.p[k+1])+Math.abs(x.p[k+2]-y.p[k+2]))/3;sum+=d;n++;if(d>=18)changed++;
  }
  return {mean:sum/n,fraction:changed/n,opacity:Number(getComputedStyle(document.querySelector(".academy-hero"),"::before").opacity)};
 },{a:actual.toString("base64"),b:blank.toString("base64")});
 console.log("HERO_ART",width,phase,JSON.stringify(result));
 assert(result.mean>=12&&result.fraction>=.20,width+" "+phase+" hero illustration washed out: "+JSON.stringify(result));
 assert(result.opacity>=.85,width+" "+phase+" hero opacity");
 if(outDir)await hero.screenshot({path:path.join(outDir,"hero-"+phase+"-"+width+".png"),animations:"disabled"});
 await page.evaluate(()=>scrollTo(0,0));
}
async function run(browser,width){
 const context=await browser.newContext({viewport:{width,height:width<=480?640:900}});
 const page=await context.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 page.on("dialog",d=>d.accept());
 try{
  await page.goto(base+"home.html",{waitUntil:"networkidle"});
  await page.getByRole("link",{name:"我是新手，先學怎麼創建角色"}).click();
  await page.waitForURL(/academy\.html/);
  assert.equal(await page.locator("#academyQuiz").count(),1,"missing fit quiz entry");
  assert.equal(await page.locator(".academy-tabs").count(),0,"retired lesson/practice tabs are still shown");
  await heroArt(page,width,"quiz");
  const questionArt=new Set();
  for(let i=0;i<10;i++){
   const art=page.locator(".academy-question-art");
   await art.evaluate(async img=>{await img.decode();if(!img.naturalWidth)throw Error("missing painted question art")});
   questionArt.add(await art.getAttribute("src"));
   assert((await art.getAttribute("src")).includes("academy-watercolor-art/"));
   if(width<=480){const b=await page.locator(".academy-choice").first().boundingBox();assert(b&&b.y>=0&&b.y+b.height<=640,"first answer above fold "+width+" "+JSON.stringify(b));}
   assert.equal(await art.getAttribute("aria-hidden"),"true");
   const layout=await page.locator(".academy-choice-list").evaluate(e=>({cols:getComputedStyle(e).gridTemplateColumns.split(" ").length,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}));
   assert.equal(layout.cols,width>760?2:1,"responsive answer layout");
   assert(layout.overflow<=2,"quiz horizontal overflow");
   const choice=page.locator(".academy-choice").first();
   assert(await choice.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16&&e.scrollWidth<=e.clientWidth+2),"readable choice without clipping");
   if(outDir&&i===2)await page.screenshot({path:path.join(outDir,"academy-question-"+width+".png"),fullPage:false,animations:"disabled"});
   await choice.click();
   assert.equal(await choice.getAttribute("aria-pressed"),"true");
   const next=page.locator(".academy-nav button").last();
   assert.equal(await next.isEnabled(),true);
   await next.click();
  }
  assert.equal(questionArt.size,10,"ten distinct existing painted question motifs");
  await heroArt(page,width,"results");
  const beforeReload=await page.locator(".academy-result-card h3").allTextContents();
  await page.reload({waitUntil:"networkidle"});
  assert.deepEqual(await page.locator(".academy-result-card h3").allTextContents(),beforeReload,"restored recommendations");
  await heroArt(page,width,"results-reload");
  const icons=page.locator(".academy-result-card .academy-class-art");
  assert.equal(await icons.count(),3,"each recommendation has class art");
  await icons.evaluateAll(async imgs=>{await Promise.all(imgs.map(async img=>{await img.decode();if(!img.naturalWidth)throw Error("missing class art")}))});
  const recs=await page.locator("#academyResult1,#academyResult2,#academyResult3").evaluateAll(cards=>
   cards.map(card=>({height:Math.round(card.getBoundingClientRect().height),
     width:Math.round(card.getBoundingClientRect().width),
     detailOpen:!!card.querySelector("details")?.open,
     cta:card.querySelector("[data-action=academy-start-class]")?.textContent||"",
     title:card.querySelector("h3")?.textContent||""})));
  assert.equal(recs.length,3,"expected three distinct recommendations");
  assert.equal(new Set(recs.map(x=>x.title)).size,3,"duplicate suggested class");
  for(const r of recs){
   assert(r.height<=680,"overlong recommendation card "+r.height+"px at "+width);
   assert(!r.detailOpen,"extra class details must be collapsed");
   assert(r.cta.includes("進入創角器"),"incorrect CTA");
  }
  if(outDir)await page.screenshot({path:path.join(outDir,"academy-results-"+width+".png"),fullPage:true,animations:"disabled"});
  await page.locator("#academyResult1 [data-action=academy-start-class]").click();
  await page.waitForURL(/index\.html\?view=creator/);
  await page.waitForTimeout(350);
  if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
  await page.locator("#academyGuidedCoach").waitFor();
  assert.match(await page.locator("#coachHeading").innerText(),/1 \/ 9/);
  assert.match(await page.locator("#coachLead").innerText(),/測驗選擇已帶入職業卡/);
  assert.equal(await page.locator("#academyRecommendedClass,#academyCreatorReturn").count(),0,"duplicate quiz banners");
  const state=await page.evaluate(()=>{
   const main=document.querySelector("main");
   const rail=main?.querySelector(":scope > .wcs-creator-rail");
   const workspace=main?.querySelector(":scope > .workspace");
   const coach=document.getElementById("academyGuidedCoach");
   const grid=document.getElementById("classGrid");
   const box=x=>{if(!x)return null;const b=x.getBoundingClientRect();return {x:Math.round(b.x),width:Math.round(b.width)};};
   return {children:[...main.children].map(x=>x.className),workspace:box(workspace),
    rail:box(rail),grid:box(grid),
    cardWidths:[...grid.querySelectorAll(":scope > [data-class-name]")].map(x=>Math.round(x.getBoundingClientRect().width)),
    directBar:coach?.parentElement===main,coachWithinWorkspace:workspace?.contains(coach),
    pending:typeof pendingClassChoice!=="undefined"?pendingClassChoice?.n:null,
    selected:[...grid.querySelectorAll(".selected")].map(x=>x.dataset.className),
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    currentClass:S.cls?.n||null,confirmed:S.classConfirmed};
  });
  assert(!state.directBar&&state.coachWithinWorkspace,"academy coach must not disturb main CSS grid");
  assert.equal(state.pending,recs[0].title,"quiz class should already be selected in native Creator");
  assert.deepEqual(state.selected,[recs[0].title],"exactly one selected class card");
  assert.equal(state.children.length,2,"Creator main should only have workspace and preview");
  assert.equal(state.rail,null,"redundant left creator rail must not exist");
  assert.equal(state.cardWidths.length,12,"Creator class list incomplete");
  assert.equal(state.currentClass,null,"quiz must not select class");
  assert.equal(state.confirmed,false,"quiz must not confirm class");
  const min=Math.min(...state.cardWidths);
  assert(min>=(width>=1360?175:width<=480?125:160),"CRUSHED CLASS CARDS: "+min+" at "+width+"px");
  if(width>=1360){
   assert(state.workspace.width>=620,"Creator workspace too narrow");
   assert(state.workspace.x>=0,"Creator workspace must remain in viewport");
  }
  assert(state.overflow<=2,"horizontal overflow "+state.overflow);
  if(outDir)await page.screenshot({path:path.join(outDir,"academy-creator-"+width+".png"),animations:"disabled"});
  await page.locator('[data-step="0"] .class-confirm-controls button').click();
  assert.equal(await page.evaluate(()=>S.classConfirmed),true,"existing Creator class confirmation failed");
  await page.locator("#next0").click();
  // The coach intentionally renders after a requestAnimationFrame in its click
  // listener. Assert the underlying real Creator navigation first, then wait
  // for that one visual frame instead of racing an immediate DOM read.
  await page.waitForFunction(()=>typeof S!=="undefined"&&S.step===1,null,{timeout:10000});
  await page.waitForFunction(()=>document.getElementById("coachHeading")?.textContent?.includes("2 / 9")&&
    document.getElementById("coachLead")?.textContent?.includes("背景與物種"),null,{timeout:10000});
  assert.match(await page.locator("#coachHeading").innerText(),/2 \/ 9/);
  assert.match(await page.locator("#coachLead").innerText(),/背景與物種/);
  assert.equal(errors.length,0,"page JS errors: "+errors.join("|"));
  reports.push({width,recommendations:recs.map(({width,height,title})=>({width,height,title})),minCardWidth:min,state,errors});
 }finally{await context.close();}
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.QA_CHROME_CHANNEL?{channel:process.env.QA_CHROME_CHANNEL}:process.platform==="win32"?{channel:"chrome"}:{})});
 try{for(const width of [320,390,480,1440,1649])await run(browser,width);}
 finally{await browser.close();}
 console.log("PASS HUMAN_PATH_ACADEMY_QUIZ_GUIDED_GRID",JSON.stringify(reports));
})().catch(e=>{console.error("FAIL HUMAN_PATH_ACADEMY_QUIZ_GUIDED_GRID",e.stack||e);process.exitCode=1;});

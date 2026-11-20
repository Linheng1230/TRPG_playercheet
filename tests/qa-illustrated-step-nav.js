"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const out="D:/Tools/zizi-ai-runtime/qa-watercolor-steps-icons-20261116";
const types={".html":"text/html",".css":"text/css",".js":"application/javascript",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".json":"application/json",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"home.html");
 if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return}
 res.writeHead(200,{"Content-Type":types[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"});
 fs.createReadStream(f).pipe(res);
});
(async()=>{
 let browser;fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const base="http://127.0.0.1:"+server.address().port;
 try{
  browser=await chromium.launch({channel:"chrome",headless:true});
  for(const {name,w,h} of [{name:"mobile320",w:320,h:700},{name:"mobile390",w:390,h:844},{name:"desktop1440",w:1440,h:900}]){
   const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url())});
   await page.goto(base+"/index.html?view=creator",{waitUntil:"networkidle"});
   if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
   const nav=await page.evaluate(()=>{
     const strip=document.querySelector("#stepNav .nav-ux-strip");
     const secondary=strip.querySelector(".nav-secondary");
     return {strip: getComputedStyle(strip).display,position:getComputedStyle(strip).position,steps:secondary.querySelectorAll("button").length,
      visible:strip.getBoundingClientRect().height>=38,collapsedToggle:document.querySelectorAll(".nav-ux-steps-toggle").length,
      primary:document.querySelector(".nav-primary").getBoundingClientRect().height,
      secondary:secondary.getBoundingClientRect().height,
      overflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(nav.strip,"flex");assert.equal(nav.position,"static");assert.ok(nav.visible);
   assert.equal(nav.collapsedToggle,0);assert.equal(nav.steps,await page.evaluate(()=>S.ruleset==="2024"?8:7));assert.ok(nav.primary<=55);assert.ok(nav.secondary>=38);assert.ok(nav.overflow<=0);
   const art=await page.evaluate(()=>{
    const card=document.querySelector("#classGrid .pick-card");
    const icon=card.querySelector("img.wcs-alpha-class-icon");
    const st=getComputedStyle(icon);
    return {width:icon.naturalWidth,height:icon.naturalHeight,bg:icon.getAttribute("src"),fit:st.objectFit,legacy:getComputedStyle(card,"::before").display,
      positions:[...document.querySelectorAll("#classGrid .pick-card")].map(e=>e.querySelector("img.wcs-alpha-class-icon")?.getAttribute("src")||""),
      sizes:[...document.querySelectorAll("#classGrid .pick-card")].map(e=>e.clientWidth)};
   });
   assert.equal(art.width,360);assert.equal(art.height,232);assert.ok(art.bg.includes("watercolor-icons-alpha/"));assert.equal(art.fit,"contain");assert.equal(art.legacy,"none");
   assert.equal(new Set(art.positions).size,12);
   await page.locator("#classGrid .pick-card").nth(3).click();
   const changed=await page.locator("#classGrid .pick-card").evaluateAll(cards=>cards.map(e=>e.querySelector("img.wcs-alpha-class-icon")?.getAttribute("src")||""));
   assert.deepEqual(changed,art.positions,"class icon may not shift after confirmation bar inserted");
   assert.equal(await page.locator(".wcs-creator-rail,.wcs-rail-step").count(),0,"duplicate left rail removed");
   assert.equal(await page.locator("main.wcs-creator-mode").count(),0,"stale three-column rail layout removed");
   await page.locator("#stepNav .nav-secondary button").nth(1).click();
   assert.equal(await page.locator(".step-panel.active").getAttribute("data-step"),"1");
   assert.ok(await page.locator("#stepNav .nav-ux-strip").isVisible(),"canonical top stages remain visible");
   await page.locator("#stepNav .nav-secondary button").nth(2).click();
   assert.equal(await page.locator(".step-panel.active").getAttribute("data-step"),"2");
   await page.locator("#stepNav .nav-secondary button").nth(0).click();
   await page.waitForTimeout(300); // renderNav fade-in should finish before visual evidence
   assert.equal(await page.locator(".step-panel.active").getAttribute("data-step"),"0");
   const visual=await page.locator(".step-panel.active").evaluate(el=>({
      opacity:Number(getComputedStyle(el).opacity),
      visible:el.getBoundingClientRect().height>200,
      text:el.querySelector(".step-title")?.textContent||""
   }));
   assert.ok(visual.opacity>.97&&visual.visible&&visual.text.includes("選擇職業"),"creator panel must be actually visible after navigation");
   await page.screenshot({path:path.join(out,"creator-"+name+".png"),fullPage:false});
   await page.goto(base+"/home.html",{waitUntil:"networkidle"});
   const cards=await page.evaluate(()=>({
    height:document.querySelector(".wcs-entry-art").getBoundingClientRect().height,
    artHeight:document.querySelector(".wcs-entry-art img.wcs-alpha-icon").getBoundingClientRect().height,
    artNaturalHeight:document.querySelector(".wcs-entry-art img.wcs-alpha-icon").naturalHeight,
    overflow:document.documentElement.scrollWidth-innerWidth
   }));
   assert.ok(cards.height>=(w>700?103:79));assert.equal(cards.artNaturalHeight,288);
   assert.ok(cards.artHeight<=cards.height+1&&cards.artHeight>50);assert.ok(cards.overflow<=0);
   await page.screenshot({path:path.join(out,"home-"+name+".png"),fullPage:false});
   assert.deepEqual(errors,[],name+" browser errors");
   console.log("PASS STEPS+ICONS "+name+" "+JSON.stringify({nav,art:{width:art.width,height:art.height,unique:12},cards}));
   await page.close();
  }
  console.log("PASS ALL STEP NAV AND WATERCOLOUR ICON REGRESSIONS");
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exitCode=1});

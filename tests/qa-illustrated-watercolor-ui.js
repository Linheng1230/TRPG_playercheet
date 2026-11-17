"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,".."),out="D:/Tools/zizi-ai-runtime/qa-illustrated-watercolor-20261116";
const map={".avif":"image/avif",".webp":"image/webp",".svg":"image/svg+xml",".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"home.html");
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end("not found");return}
 res.writeHead(200,{"Content-Type":(map[path.extname(file)]||"application/octet-stream")+";charset=utf-8","Cache-Control":"no-store"});
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 let b;await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+server.address().port;fs.mkdirSync(out,{recursive:true});
 const size=(name)=>fs.statSync(path.join(root,"assets",name)).size;
 assert.ok(size("fantasy-watercolor-scene.webp")>100000,"Desktop art needs high-quality pixels");
 assert.ok(size("watercolor-icon-atlas.webp")>25000,"Homepage watercolor atlas must be legible");
 assert.ok(size("watercolor-class-icons.webp")>15000,"Tightly framed class watercolor atlas must be legible");
 assert.ok(size("fantasy-watercolor-mobile.webp")>35000,"Mobile illustration must be legible");
 try{
  b=await chromium.launch({headless:true,channel:"chrome"});
  for(const {name,w,h} of [{name:"small",w:320,h:700},{name:"mobile",w:390,h:844},{name:"narrow",w:480,h:800},{name:"desktop",w:1440,h:900}]){
   for(const pageName of ["home","index"]){
    const page=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
    const errors=[];const images=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());if(r.url().endsWith(".webp"))images.push({name:r.url().split("/").pop(),status:r.status()})});
    await page.goto(base+"/"+pageName+".html"+(pageName==="index"?"?view=creator":""),{waitUntil:"networkidle"});
    if(pageName==="index"&&await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
    const st=await page.evaluate(pageName=>{
      const st=x=>getComputedStyle(document.querySelector(x));
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyImg:st("body").backgroundImage,
      nav:pageName==="home"?document.querySelector(".wcs-home-topbar").getBoundingClientRect().height:document.querySelector("nav.steps").getBoundingClientRect().height,
      cardCount:pageName==="home"?document.querySelectorAll(".wcs-home-card").length:document.querySelectorAll("#classGrid .pick-card").length,
      navCount:document.querySelectorAll(".wcs-hero-nav a").length,
      navIcons:document.querySelectorAll(".wcs-hero-nav a svg.wcs-nav-icon").length,
      mural:st(pageName==="home"?".wcs-mobile-mural":".wcs-inner-mural").backgroundImage,
      columns:getComputedStyle(document.querySelector(pageName==="home"?".wcs-home-grid":"#classGrid")).gridTemplateColumns.split(" ").filter(Boolean).length,
      art:[...document.querySelectorAll(pageName==="home"?".wcs-home-card img.wcs-alpha-icon":"#classGrid img.wcs-alpha-class-icon")].map(el=>({src:el.getAttribute("src"),decoded:el.complete&&el.naturalWidth>0})),
      oldSpriteDisplay:getComputedStyle(document.querySelector(pageName==="home"?".wcs-home-card .wcs-entry-art":"#classGrid .pick-card"),"::before").display,
      rail:document.querySelector(".wcs-creator-rail")?getComputedStyle(document.querySelector(".wcs-creator-rail")).display:"none",
      currentStep:document.querySelector(".step-panel.active")?.dataset.step};
    },pageName);
    assert.ok(st.scrollWidth<=st.width,pageName+" "+name+" horizontal overflow "+JSON.stringify(st));
    assert.deepEqual(errors,[],pageName+" "+name+" browser errors");
    assert.equal(st.cardCount,pageName==="home"?8:12,pageName+" card count");
    if(w>=700||pageName==="index")assert.ok(st.bodyImg.includes("fantasy-watercolor-scene.webp"),"real painted background URL expected");
    assert.equal(st.art.length,pageName==="home"?8:12,"independent alpha artwork count");
    assert.ok(st.art.every(x=>x.decoded&&x.src.includes(".png?v=ref-complete-v2")),"current versioned transparent watercolor PNG failed to load");
    assert.equal(st.oldSpriteDisplay,"none","opaque sprite pseudo-element still shown");
    if(pageName==="home"){assert.equal(st.navCount,9);assert.equal(st.navIcons,9,"hand-drawn navigation icons");assert.equal(st.columns,w<700?2:4);if(w<700)assert.ok(st.mural.includes("fantasy-watercolor-mobile.webp"),"mobile homepage needs real illustration");}
    else {assert.equal(st.currentStep,"0");assert.equal(st.columns,w<700?2:4);if(w===1440)assert.equal(st.rail,"block");if(w<700)assert.ok(st.mural.includes("fantasy-watercolor-mobile.webp"),"mobile creator needs real illustration");}
    if(pageName==="index"){
      const icons=()=>page.locator("#classGrid .pick-card").evaluateAll(els=>els.map(e=>e.querySelector("img.wcs-alpha-class-icon")?.getAttribute("src")||""));
      const before=await icons();
      assert.equal(new Set(before).size,12,"twelve distinct class PNGs");
      await page.locator("#classGrid .pick-card").nth(3).click();
      assert.ok(await page.locator("#classGrid .pick-card").nth(3).evaluate(e=>e.classList.contains("selected")),"Druid selected");
      assert.deepEqual(await icons(),before,"class art identity must not shift when confirmation panel is inserted");
      const cardWidth=await page.locator("#classGrid .pick-card").evaluateAll(els=>Math.max(...els.map(e=>e.scrollWidth-e.clientWidth)));
      assert.ok(cardWidth<=1,"class titles and icons must not overflow horizontally");
    }
    await page.screenshot({path:path.join(out,pageName+"-"+name+".png"),fullPage:pageName==="home"||name==="mobile"});
    console.log("PASS ILLUSTRATED "+pageName+" "+name+" "+JSON.stringify({...st,images}));
    await page.close();
   }
  }
  console.log("PASS ALL ILLUSTRATED SCREENS");
 }finally{await b?.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error("FAIL ILLUSTRATED",e.stack||e);process.exitCode=1});

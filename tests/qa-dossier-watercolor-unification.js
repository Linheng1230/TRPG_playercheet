"use strict";
/* Existing watercolor/dossier material parity and real browser user path.
 * No generated art, canonical rule/state changes or print/PDF overrides.
 * QA_BASE=http://127.0.0.1:18826/ node tests/qa-dossier-watercolor-unification.js
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const style=fs.readFileSync(path.join(root,"assets/dossier-watercolor-unification.css"),"utf8");
const html=Object.fromEntries(["home.html","academy.html","index.html"].map(f=>[f,fs.readFileSync(path.join(root,f),"utf8")]));
const linked="dossier-watercolor-unification.css?v=20261125-dossier-1";
for(const [file,content] of Object.entries(html)) assert(content.includes(linked),file+" must use one shared stylesheet");
assert(html["academy.html"].includes("watercolor-visual-system.css"),"Academy must share dossier tokens");
assert(html["academy.html"].includes('body class="academy-dossier"'),"Academy opt-in expected");
assert(html["academy.html"].includes("watercolor-icons-alpha/sheet.png"),"Existing painted PNG emblem expected");
assert(html["home.html"].includes("watercolor-icons-alpha/creator.png"),"Reuse original academy raster art");
assert(html["home.html"].includes("watercolor-icons-alpha/sheet.png"),"Reuse original Creator raster art");
for(const asset of ["watercolor-visual-system.css","watercolor-icons-alpha/creator.png",
  "fantasy-watercolor-scene.webp","watercolor-icons-alpha/sheet.png",
  "watercolor-icons-alpha/creator.png","watercolor-icons-alpha/sheet.png"]){
  assert(fs.existsSync(path.join(root,"assets",asset)),"Missing existing original art: "+asset);
}
for(const name of ["watercolor-visual-system.css","watercolor-icons-alpha/*.png",
  "fantasy-watercolor-scene.webp"]){
  assert(style.includes(name)||Object.values(html).some(s=>s.includes(name)),"Asset must be reused "+name);
}
assert(style.trim().startsWith("/*"),"Header must explain scope");
assert(style.includes("@media screen {"),"Never affect print/PDF output");
assert(style.includes("body.wcs-home")&&style.includes("body.wcs-inner")&&style.includes("body.academy-dossier"),"Three-page coverage");
assert(!/font-size:\s*(?:1[0-3])px/.test(style),"No undersized body text rules");
assert(style.includes("watercolor-icons-alpha/*.png"),"Keep existing PNG artwork");
assert(!/\.svg(?:[\x22\x27?\s]|$)/i.test(style),"No hand-drawn replacement SVG in new visual skin");
assert(!/<svg\b/i.test(html["home.html"])&&!/<svg\b/i.test(html["academy.html"]),"Home and Academy should use existing PNG instead of primitive SVG symbols");
console.log("PASS dossier watercolor static: 3 linked routes, canonical art and typography only");

let chromium;
try{({chromium}=require("playwright"))}
catch(e){throw new Error("Playwright unavailable for real visual QA: "+e.message)}
const base=(process.env.QA_BASE||"http://127.0.0.1:18826/").replace(/\/?$/,"/");
const sizes=[390,480,1440];
const over=()=>document.documentElement.scrollWidth-document.documentElement.clientWidth;
const report=[];
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try{
    for(const width of sizes){
      const context=await browser.newContext({viewport:{width,height:width<=390?844:900},deviceScaleFactor:1});
      const page=await context.newPage();
      const errors=[],bad=[];
      page.on("pageerror",e=>errors.push(e.message));
      page.on("response",r=>{
        const u=r.url();
        if(r.status()>=400 && /\.(svg|png|webp|css)(?:\?|$)/i.test(u))bad.push(r.status()+" "+u);
      });
      await page.goto(base+"home.html",{waitUntil:"networkidle"});
      assert.equal(await page.locator(".wcs-home-card").count(),8,"8 original feature cards");
      assert.equal(await page.locator(".wcs-home-card .wcs-alpha-icon").count(),8,"No duplicate card illustrations");
      assert.equal(await page.locator(".dossier-entry-link").count(),2);
      assert.equal(await page.locator(".dossier-entry-link img.dossier-icon").count(),2);
      assert.equal(await page.locator(".wcs-hero-nav img.dossier-nav-art").count(),10);
      const homeMetrics=await page.evaluate(()=>{
        const e=document.querySelector(".wcs-home-card");
        const c=getComputedStyle(e);
        return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          borderRadius:c.borderRadius,illustration:e.querySelector("img").naturalWidth,
          hasStyle:[...document.styleSheets].some(s=>s.href?.includes("dossier-watercolor-unification.css"))};
      });
      assert(homeMetrics.hasStyle && homeMetrics.illustration>0,"Home visual CSS and original PNG loaded");
      assert(homeMetrics.borderRadius.includes("px"),"Organic card frame");
      assert(homeMetrics.overflow<=2,"home overflow "+width+" "+homeMetrics.overflow);
      await page.getByRole("link",{name:"我是新手，先學怎麼創建角色"}).click();
      await page.waitForURL(/academy\.html/);
      const academy=await page.evaluate(()=>{
        const hero=getComputedStyle(document.querySelector(".academy-hero"));
        const c=document.querySelector(".academy-choice");
        return {body:document.body.className,
          background:getComputedStyle(document.querySelector(".academy-hero"),"::before").backgroundImage,
          color:hero.color,
          displayFont:getComputedStyle(document.querySelector(".academy-hero h1")).fontFamily,
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          css:[...document.styleSheets].some(x=>x.href?.includes("dossier-watercolor-unification.css")),
          icon:(document.querySelector(".academy-brand img.dossier-icon")?.naturalWidth||0)>0,
          size:c?getComputedStyle(c).fontSize:null};
      });
      assert(academy.body.includes("academy-dossier")&&academy.css&&academy.icon,"Academy reuses dossier design");
      assert(academy.background.includes("fantasy-watercolor-scene.webp"),"Reuse fantasy background, no regeneration");
      assert(academy.overflow<=2,"Academy overflow "+width+" "+academy.overflow);
      assert((await page.locator(".academy-choice-list .academy-choice").count())===4,"Quiz has four options");
      const first=page.locator(".academy-choice").first();
      const firstSize=await first.evaluate(e=>parseFloat(getComputedStyle(e).fontSize));
      assert(firstSize>=15,"Quiz body size 15px+");
      const bounding=await first.boundingBox(); assert(bounding.height>=44,"Tap target >=44px");
      await first.click();
      assert.equal(await first.getAttribute("aria-pressed"),"true","Quiz selection remains working");
      await page.locator(".academy-nav button").last().click();
      await page.reload({waitUntil:"networkidle"});
      assert.match(await page.locator(".academy-progress").innerText(),/2\s*\/\s*10/,"Reload preserves quiz progress");
      await page.goto(base+"index.html?view=creator",{waitUntil:"domcontentloaded"});
      await page.locator("#classGrid .pick-card").first().waitFor({state:"visible",timeout:15000});
      const creator=await page.evaluate(()=>{
        const el=document.querySelector("#classGrid .pick-card");
        return {borderRadius:getComputedStyle(el).borderRadius,
          font:getComputedStyle(el).fontFamily,
          illustration:document.querySelector("#classGrid .wcs-alpha-class-icon")?.naturalWidth||0,
          overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
          css:[...document.styleSheets].some(x=>x.href?.includes("dossier-watercolor-unification.css"))};
      });
      assert(creator.css && creator.borderRadius.includes("px"),"Creator dossier frame linked");
      assert(creator.illustration>0,"Original class watercolor art retained");
      assert(creator.overflow<=2,"Creator horizontal overflow "+width+" "+creator.overflow);
      assert.deepEqual(errors,[],"JavaScript errors at "+width);
      assert.deepEqual(bad,[],"Missing existing CSS/art at "+width);
      report.push({width,home:homeMetrics.overflow,academy:academy.overflow,creator:creator.overflow,
        cards:8,originalIconsLoaded:true,selected:true,errors:0,brokenAssets:0});
      await context.close();
    }
    console.log("PASS dossier watercolor real UI: "+JSON.stringify(report));
  }finally{await browser.close()}
})().catch(err=>{console.error("FAIL dossier watercolor real UI",err.stack);process.exitCode=1});

"use strict";
/* Real-browser QA for 20 independent alpha icons on responsive cards.
 * CSS/DOM presence alone isn't acceptance; preserve screenshots for visual review.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"tmp","qa-watercolor-alpha20","browser");
const MIMES={".html":"text/html",".js":"application/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml",".json":"application/json",".webp":"image/webp",".woff2":"font/woff2"};
const HOME=["creator","sheet","rules","spells","shop","characters","adventures","play"];
const CLASSES=["野蠻人","吟遊詩人","牧師","德魯伊","戰士","武僧","聖武士","遊俠","遊蕩者","術士","邪術師","法師"];
const SLUGS=["barbarian","bard","cleric","druid","fighter","monk","paladin","ranger","rogue","sorcerer","warlock","wizard"];
const widths=[320,390,480,768,1440];
const server=http.createServer((req,res)=>{
  const file=path.resolve(ROOT,decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"home.html");
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end("not found");return}
  res.writeHead(200,{"Content-Type":(MIMES[path.extname(file)]||"application/octet-stream")+"; charset=utf-8","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
});
async function check(page,which,width){
  const details=await page.evaluate(({which})=>{
    const selector=which==="home"?".wcs-home-card":"#classGrid .pick-card";
    const cards=[...document.querySelectorAll(selector)];
    return {
      documentOverflow:document.documentElement.scrollWidth-innerWidth,
      cardCount:cards.length,
      render:cards.map((card,i)=>{
        const art=card.querySelector(which==="home"?".wcs-alpha-icon":".wcs-alpha-class-icon");
        const slot=which==="home"?card.querySelector(".wcs-entry-art"):card;
        const b=art?.getBoundingClientRect(),s=slot.getBoundingClientRect();
        const style=art?getComputedStyle(art):null;
        return {i,route:card.dataset.route||"",classname:card.dataset.className||"",src:art?.getAttribute("src")||"",
          decoded:!!art&&art.complete&&art.naturalWidth>0&&art.naturalHeight>0,
          naturalWidth:art?.naturalWidth||0,naturalHeight:art?.naturalHeight||0,
          imgCount:card.querySelectorAll(which==="home"?"img.wcs-alpha-icon":"img.wcs-alpha-class-icon").length,
          tagFontPx:which==="class"?parseFloat(getComputedStyle(card.querySelector(".tag")).fontSize):null,
          tagLinePx:which==="class"?parseFloat(getComputedStyle(card.querySelector(".tag")).lineHeight):null,
          centerError:b?Math.round(((b.left+b.right)/2-(s.left+s.right)/2)*10)/10:999,
          fit:style?.objectFit||"",box:b?{l:b.left,t:b.top,r:b.right,b:b.bottom}:null,
          card:{l:s.left,t:s.top,r:s.right,b:s.bottom},
          pseudo:which==="home"?getComputedStyle(slot,"::before").display:getComputedStyle(card,"::before").display,
          spriteBg:which==="home"?getComputedStyle(slot,"::before").backgroundImage:getComputedStyle(card,"::before").backgroundImage,
        };
      })
    };
  },{which});
  if(details.documentOverflow>1){
    const leaking=await page.evaluate(()=>[...document.querySelectorAll("body *")].map(el=>{
       const r=el.getBoundingClientRect(),s=getComputedStyle(el);
       return {tag:el.tagName,id:el.id,cls:typeof el.className==="string"?el.className.slice(0,90):"",x:r.x,right:r.right,width:r.width,overflowX:s.overflowX}
    }).filter(x=>x.right>innerWidth+2 && x.width<innerWidth*3).sort((a,b)=>b.right-a.right).slice(0,12));
    console.log("OVERFLOW_DEBUG",which,width,JSON.stringify(leaking));
  }
  assert.ok(details.documentOverflow<=1,which+" "+width+" horizontal overflow: "+details.documentOverflow);
  assert.equal(details.cardCount,which==="home"?8:12);
  for(const item of details.render){
    const expected=which==="home"?HOME[item.i]:SLUGS[item.i];
    assert.equal(item.route||item.classname,which==="home"?expected:CLASSES[item.i],"stable card mapping "+item.i);
    if(which==="class")assert.ok(item.tagFontPx>=12.9&&item.tagFontPx<=13.1&&item.tagLinePx>=18&&item.tagLinePx<=18.6,"class tag readability "+expected+" "+item.tagFontPx+"/"+item.tagLinePx);
    assert.ok(item.src.split("?")[0].endsWith("/"+expected+".png")&&item.src.includes("?v=original-watercolor-v3"),"incorrect/old cached art identity "+expected+" "+item.src);
    assert.equal(item.imgCount,1,"duplicate/missing independent icon "+expected);
    assert.ok(item.decoded,"broken icon file "+expected);
    assert.equal(item.naturalWidth,which==="home"?480:360,"icon dimensions "+expected);
    assert.equal(item.naturalHeight,which==="home"?288:232,"icon dimensions "+expected);
    assert.equal(item.fit,"contain","not preserving aspect ratio "+expected);
    assert.equal(item.pseudo,"none","old sprite pseudo remains "+expected);
    assert.ok(item.spriteBg==="none","old opaque sprite is still CSS "+expected);
    assert.ok(Math.abs(item.centerError)<=2.1,"misaligned icon "+expected+" "+item.centerError);
    assert.ok(item.box.l>=item.card.l-1&&item.box.r<=item.card.r+1,"icon exceeds card "+expected);
    assert.ok(item.box.t>=item.card.t-1&&item.box.b<=item.card.b+1,"icon exceeds card vertically "+expected);
  }
  console.log("PASS "+which+" "+width+" "+details.cardCount+" independent alpha icons / centered / decoded / no sprite");
  return details;
}
(async()=>{
  let browser;fs.mkdirSync(OUT,{recursive:true});
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  try{
    browser=await chromium.launch({headless:true,channel:process.env.QA_CHROME_CHANNEL||"chrome"});
    for(const width of widths){
      const page=await browser.newPage({viewport:{width,height:width===1440?900:844},deviceScaleFactor:1});
      const errors=[];
      page.on("pageerror",e=>errors.push("JS "+e.message));
      page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url())});
      await page.goto(base+"/home.html",{waitUntil:"networkidle"});
      await page.locator(".wcs-alpha-icon").first().waitFor();
      await page.evaluate(async()=>Promise.all([...document.querySelectorAll(".wcs-alpha-icon")].map(img=>img.decode())));
      await check(page,"home",width);
      await page.locator(".wcs-home-grid").screenshot({path:path.join(OUT,"home-icons-"+width+".png")});
      await page.screenshot({path:path.join(OUT,"home-viewport-"+width+".png")});
      await page.locator(".wcs-home-card[data-route=creator]").click();
      await page.waitForURL(/index\.html\?view=creator/);
      await page.waitForLoadState("networkidle");
      if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
      await page.locator("#classGrid .wcs-alpha-class-icon").first().waitFor();
      await page.evaluate(async()=>Promise.all([...document.querySelectorAll(".wcs-alpha-class-icon")].map(img=>img.decode())));
      await check(page,"class",width);
      // Capture the true top-of-page viewport FIRST. Element.screenshot would otherwise
      // auto-scroll the grid under the fixed navigation, obscuring the first two icons.
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:path.join(OUT,"class-viewport-"+width+".png"),fullPage:false});
      await page.screenshot({path:path.join(OUT,"class-full-"+width+".png"),fullPage:true});
      // Do not use element.screenshot as the visual oracle: it auto-scrolls beneath
      // the sticky navigation and misleadingly hides the first row of class icons.
      // Check the actual visible first-row hit path, then keep full/viewport images.
      const firstRowVisible=await page.evaluate(()=>{
        const card=document.querySelector("#classGrid .pick-card");
        const art=card?.querySelector("img.wcs-alpha-class-icon");
        if(!art)return false;
        const r=art.getBoundingClientRect();
        const hit=document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2);
        return hit===card||card.contains(hit);
      });
      assert.equal(firstRowVisible,true,"first class icon is covered by sticky navigation");
      const before=await page.locator("#classGrid .pick-card").evaluateAll(els=>els.map(c=>c.dataset.className));
      await page.locator("#classGrid .pick-card").nth(3).click();
      await page.locator("#classGrid .pick-card.selected").first().waitFor();
      await page.locator("#classGrid .wcs-alpha-class-icon").first().waitFor();
      await page.evaluate(async()=>Promise.all([...document.querySelectorAll(".wcs-alpha-class-icon")].map(img=>img.decode())));
      await check(page,"class",width);
      const after=await page.locator("#classGrid .pick-card").evaluateAll(els=>els.map(c=>c.dataset.className));
      assert.deepEqual(after,before,"class identity changed after selection");
      assert.equal(await page.locator("#classGrid .pick-card.selected").getAttribute("data-class-name"),"德魯伊");
      await page.locator("#classGrid").screenshot({path:path.join(OUT,"class-selected-"+width+".png")});
      assert.deepEqual(errors,[],"browser errors "+width);
      await page.close();
    }
    console.log("PASS BROWSER ALL 5 WIDTHS (home 8 + class 12 + selection mutation)");
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error("FAIL BROWSER ALPHA20",e.stack||e);process.exitCode=1});

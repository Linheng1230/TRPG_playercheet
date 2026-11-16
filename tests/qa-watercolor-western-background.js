/**
 * Stage C Western fantasy watercolor/reading-contrast regression.
 * Uses local HTTP + installed Chrome, without external resources.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const OUT="D:/Tools/zizi-ai-runtime/visual-qa-20261116";
const profiles=[{name:"mobile",width:390,height:844},{name:"narrow",width:480,height:800},{name:"desktop",width:1440,height:900}];
const server=http.createServer((req,res)=>{
  const p=path.resolve(ROOT,decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"home.html");
  if(!p.startsWith(ROOT+path.sep)||!fs.existsSync(p)||!fs.statSync(p).isFile()){res.writeHead(404);res.end();return;}
  const ext=path.extname(p);
  const type={".html":"text/html",".css":"text/css",".js":"application/javascript",".svg":"image/svg+xml",".png":"image/png",".json":"application/json",".woff2":"font/woff2"}[ext]||"application/octet-stream";
  res.writeHead(200,{"Content-Type":type+"; charset=utf-8","Cache-Control":"no-store"});
  fs.createReadStream(p).pipe(res);
});
function luminance(color){
  const m=String(color).match(/rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  assert.ok(m,"bad rgb="+color);
  const f=x=>{x=Number(x)/255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)};
  return .2126*f(m[1])+.7152*f(m[2])+.0722*f(m[3]);
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
(async()=>{
  const iconXml=fs.readFileSync(path.join(ROOT,"assets","watercolor-icons.svg"),"utf8");
  assert.ok(iconXml.includes("Western fantasy dragon"),"Western dragon symbol missing");
  const backSvg=fs.readFileSync(path.join(ROOT,"assets","watercolor-western-background.svg"),"utf8");
  assert.ok(backSvg.includes("FOUR legs")&&backSvg.includes("griffin"),"wrong fantasy creatures");
  fs.mkdirSync(OUT,{recursive:true});
  let browser;await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const base="http://127.0.0.1:"+server.address().port;
  try{
    browser=await chromium.launch({headless:true,channel:"chrome"});
    for(const d of profiles){
      for(const name of ["home","index"]){
        const page=await browser.newPage({viewport:{width:d.width,height:d.height},deviceScaleFactor:1});
        const errors=[];
        page.on("pageerror",e=>errors.push("JS "+e.message));
        page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url())});
        await page.goto(base+"/"+name+".html"+(name==="index"?"?view=creator":""),{waitUntil:"networkidle"});
        if(name==="index"&&await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
        const state=await page.evaluate(name=>{
          const el=x=>document.querySelector(x),st=x=>getComputedStyle(el(x));
          return {
            overflow:document.documentElement.scrollWidth-innerWidth,
            background:st("body").backgroundImage,
            headerHeight:el("header")?.getBoundingClientRect().height,
            navHeight:el("nav.steps")?.getBoundingClientRect().height,
            color:st(name==="home"?".wcs-hero-sub":".step-hint").color,
            paperColor:st(name==="home"?".wcs-home-card":".workspace").backgroundColor,
            cardCount:el(".wcs-home-grid")?.querySelectorAll(".wcs-home-card").length,
            activeStep:el(".step-panel.active")?.dataset.step,
            panels:document.querySelectorAll(".step-panel").length,
            firstCardColor:el(".pick-card")?st(".pick-card").backgroundColor:null,
            firstCardText:el(".pick-card .desc")?st(".pick-card .desc").color:null,
            bodyClass:document.body.className
          };
        },name);
        assert.ok(state.overflow<=0,name+" "+d.name+" horizontal overflow "+state.overflow);
        assert.deepEqual(errors,[],name+" "+d.name+" browser errors");
        assert.ok(state.background.includes("watercolor-western-background.svg")=== (d.width>700),name+" "+d.name+" background asset responsive");
        if(name==="home"){
          assert.equal(state.cardCount,8,d.name+" eight entries");
        }else{
          assert.equal(state.activeStep,"0",d.name+" creator routing");
          assert.equal(state.panels,14,d.name+" original panels intact");
          assert.ok(state.navHeight<=55,d.name+" one-row nav <=55px: "+state.navHeight);
          const textRatio=contrast(state.firstCardText,state.firstCardColor);
          assert.ok(textRatio>=4.5,d.name+" class description text contrast "+textRatio.toFixed(2));
          console.log("CONTRAST "+d.name+" pick-card="+textRatio.toFixed(2)+":1");
        }
        await page.screenshot({path:path.join(OUT,name+"-"+d.name+".png"),fullPage:d.width===1440?false:true});
        console.log("PASS WESTERN "+name+" "+d.name+" "+d.width+"x"+d.height+" overflow="+state.overflow);
        await page.close();
      }
    }
    console.log("PASS WESTERN WATERCOLOUR TARGETED");
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(e=>{console.error("FAIL WESTERN WATERCOLOUR",e.stack||e);process.exitCode=1});

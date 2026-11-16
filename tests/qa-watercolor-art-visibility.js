/**
 * Visible illustration gate: checks rendered pixel difference vs same page with art hidden.
 * This closes the 2026-11-16 false PASS where assets loaded but were invisible.
 * Run: node tests/qa-watercolor-art-visibility.js
 */
"use strict";
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const OUT=process.env.CI?path.join(ROOT,"tmp","qa-watercolor-art-visibility"):"D:/Tools/zizi-ai-runtime/visual-qa-20261116/visibility";
const cases=[
 {name:"home-mobile",file:"home.html",width:390,height:844,selector:".wcs-mobile-mural",limit:.12},
 {name:"inner-mobile",file:"index.html?view=creator",width:390,height:844,selector:".wcs-inner-mural",limit:.12},
 {name:"home-desktop",file:"home.html",width:1440,height:900,selector:".wcs-home",limit:.08,region:{x:.77,y:.08,w:.23,h:.37}},
 {name:"inner-desktop",file:"index.html?view=creator",width:1440,height:900,selector:".wcs-inner-mural",limit:.07}
];
function makeServer(){
 return http.createServer((req,res)=>{
  const name=decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"home.html";
  const file=path.resolve(ROOT,name);
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
  const ext=path.extname(file);
  const mime={".html":"text/html",".css":"text/css",".svg":"image/svg+xml",".js":"application/javascript",".json":"application/json",".png":"image/png"}[ext]||"application/octet-stream";
  res.writeHead(200,{"Content-Type":mime+"; charset=utf-8","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
 });
}
async function imageDelta(page,base,hidden,rect){
 return page.evaluate(async ({base,hidden,rect})=>{
  async function data(b64){
   const img=new Image();img.src="data:image/png;base64,"+b64;await img.decode();
   const cvs=document.createElement("canvas");cvs.width=img.width;cvs.height=img.height;
   const ctx=cvs.getContext("2d",{willReadFrequently:true});ctx.drawImage(img,0,0);
   return {width:img.width,height:img.height,pixels:ctx.getImageData(0,0,img.width,img.height).data};
  }
  const a=await data(base),b=await data(hidden);
  if(a.width!==b.width||a.height!==b.height)throw Error("size mismatch");
  const x0=Math.max(0,Math.floor(rect.x)),y0=Math.max(0,Math.floor(rect.y));
  const x1=Math.min(a.width,Math.ceil(rect.x+rect.width)),y1=Math.min(a.height,Math.ceil(rect.y+rect.height));
  let changed=0,total=0,sum=0;
  for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){
    const i=(y*a.width+x)*4;
    const d=Math.abs(a.pixels[i]-b.pixels[i])+Math.abs(a.pixels[i+1]-b.pixels[i+1])+Math.abs(a.pixels[i+2]-b.pixels[i+2]);
    total++;sum+=d;if(d>=34)changed++;
  }
  return {fraction:changed/total,meanDelta:sum/total,changed,total,rect};
 },{base:base.toString("base64"),hidden:hidden.toString("base64"),rect});
}
(async()=>{
 const server=makeServer();let browser;
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 try{
  browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
  fs.mkdirSync(OUT,{recursive:true});
  const url="http://127.0.0.1:"+server.address().port;
  for(const test of cases){
   const page=await browser.newPage({viewport:{width:test.width,height:test.height},deviceScaleFactor:1});
   await page.goto(url+"/"+test.file,{waitUntil:"networkidle"});
   if(test.file.startsWith("index")&&await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const rect=await page.evaluate(test=>{
      if(test.region)return {x:innerWidth*test.region.x,y:innerHeight*test.region.y,width:innerWidth*test.region.w,height:innerHeight*test.region.h};
      const r=document.querySelector(test.selector).getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};
   },test);
   const withArt=await page.screenshot({fullPage:false});
   fs.writeFileSync(path.join(OUT,test.name+".png"),withArt);
   await page.addStyleTag({content:
    "body.wcs-home, body.wcs-inner{background-image:none!important}"+
    ".wcs-mobile-mural,.wcs-inner-mural{background-image:none!important}"
   });
   const withoutArt=await page.screenshot({fullPage:false});
   const result=await imageDelta(page,withArt,withoutArt,rect);
   console.log(JSON.stringify({name:test.name,changedPercent:(result.fraction*100).toFixed(1),meanDelta:result.meanDelta.toFixed(1),minimumPercent:test.limit*100,rect}));
   assert.ok(result.fraction>=test.limit,test.name+" ART_NOT_PERCEPTIBLE: "+(result.fraction*100).toFixed(1)+"% pixels changed");
   assert.ok(result.meanDelta>=5,test.name+" ART_TOO_FAINT mean="+result.meanDelta);
   await page.close();
  }
  console.log("PASS VISIBLE WESTERN FANTASY ART (PIXEL-BASED) "+OUT);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error("FAIL PIXEL VISIBILITY",e.stack||e);process.exitCode=1});

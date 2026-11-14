"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const root=path.resolve(__dirname,"..");
const types={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".css":"text/css;charset=utf-8",".json":"application/json;charset=utf-8"};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.stat(file,(e,st)=>{if(e||!st.isFile()){res.writeHead(404);return res.end()}
 res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});fs.createReadStream(file).pipe(res)});
});
(async()=>{
 const base=await new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port)));
 let browser;
 try{browser=await chromium.launch({headless:true})}
 catch(err){if(!/Executable doesn't exist/i.test(err.message))throw err;browser=await chromium.launch({headless:true,channel:"chrome"})}
 const expected=["生命值","死亡豁免","英雄激勵","職業資源","法術位","特性說明"];
 const targetIds=["psLife","psDeath","psInspiration","psResources","psSlots","psFeatures"];
 const output=process.env.QA_SCREEN_DIR||"";
 if(output)fs.mkdirSync(output,{recursive:true});
 try{
  for(const width of [390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},reducedMotion:"reduce"});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));page.setDefaultTimeout(8000);
   await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function"&&window.PlayStatusCreatures5R);
   await page.waitForTimeout(250);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};
    ABILITIES.forEach(a=>S.base[a.k]=10);S.base.con=14;S.base.wis=16;S.base.dex=14;
    S.play.hp=null;S.play.hpMax=null;S.play.hd=null;S.play.ds={s:0,f:0};
    S.play.res={};S.play.resMax={};S.play.custom=[];S.slotsUsed={};S.play.insp=false;
    document.getElementById("fName").value="新版跑團導覽 QA";go(11);
   });
   const nav=page.locator("#playStatusBody > .ps-jump-nav");
   await nav.waitFor({state:"visible"});
   const labels=await nav.locator(".ps-jump-scroll button").allTextContents();
   assert.deepEqual(labels,expected,"six direct shortcuts required, no duplicate groups");
   assert.equal(await page.locator('#playStatusBody [data-ps-action="creatureJump"]').count(),0);
   const geometry=await nav.evaluate(el=>{
    const buttons=[...el.querySelectorAll("button")];
    const scroll=el.querySelector(".ps-jump-scroll");
    return {wrap:getComputedStyle(scroll).flexWrap,rows:[...new Set(buttons.map(b=>b.offsetTop))],
      heights:buttons.map(b=>b.getBoundingClientRect().height),horizontal:scroll.scrollWidth-scroll.clientWidth,
      documentOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   assert.equal(geometry.wrap,"nowrap");assert.equal(geometry.rows.length,1);
   assert(geometry.heights.every(h=>h>=43));assert(geometry.documentOverflow<=2);
   if(width===390)assert(geometry.horizontal>0,"mobile shortcuts need horizontal swipe");
   await page.evaluate(()=>{
    const el=document.querySelector("#playStatusBody > .ps-jump-nav");
    window.scrollTo(0,Math.ceil(window.scrollY+el.getBoundingClientRect().top+240));
   });
   await page.waitForTimeout(120);
   const sticky=await page.evaluate(()=>{
    const el=document.querySelector("#playStatusBody > .ps-jump-nav");
    return {top:el.getBoundingClientRect().top,global:document.querySelector("#stepNav").getBoundingClientRect().height};
   });
   assert(Math.abs(sticky.top-sticky.global)<10,"sticky nav must be below global nav "+JSON.stringify(sticky));
   if(output)await page.screenshot({path:path.join(output,"e-live-sticky-"+width+".png"),fullPage:false});
   for(let i=0;i<labels.length;i++){
    const button=nav.locator('button[data-ps-jump="'+targetIds[i]+'"]');
    assert.equal(await button.count(),1);
    await button.click();
    const rect=await page.evaluate(id=>{
      const el=document.getElementById(id);
      if(!el)return null;
      const bar=document.querySelector(".ps-jump-nav");
      return {top:el.getBoundingClientRect().top,global:document.querySelector("#stepNav").getBoundingClientRect().height,
        bar:bar.getBoundingClientRect().height,height:innerHeight,open:el.tagName==="DETAILS"?el.open:null};
    },targetIds[i]);
    assert(rect,"missing "+targetIds[i]);
    assert(rect.top>=rect.global+rect.bar-20 && rect.top<rect.height,"jump hidden under sticky bars "+targetIds[i]+" "+JSON.stringify(rect));
    if(targetIds[i]==="psFeatures")assert.equal(rect.open,true,"features shortcut should expand full-rule cards");
   }
   await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
   const hpBefore=await page.evaluate(()=>S.play.hp);
   await page.locator('#playStatusBody [data-ps-action="heal1"]').click();
   assert.equal(await page.evaluate(()=>S.play.hp),hpBefore+1);
   assert.deepEqual(await nav.locator("button").allTextContents(),expected,"shortcut survives state rerender");
   assert.equal(await page.locator("#stepNav .nav-ux-back").count(),1,"existing global back preserved");
   if(width===390){
    await page.evaluate(()=>{S.cls=CLASSES.find(c=>c.n==="野蠻人");S.classLevels={野蠻人:4};S.slotsUsed={};renderPlayStatusTab()});
    const noSlots=await nav.locator("button").allTextContents();
    assert(!noSlots.includes("法術位"),"barbarian without slots must hide spell shortcut");
    assert(noSlots.includes("職業資源")&&noSlots.includes("特性說明"));
   }
   assert.deepEqual(errors,[],"no page errors");
   console.log("PASS E modern sticky quick-nav "+width+"px: "+labels.join(" / "));
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;server.close()});
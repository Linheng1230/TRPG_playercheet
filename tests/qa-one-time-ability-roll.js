"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".pdf":"application/pdf",".wasm":"application/wasm"};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
 const name=path.resolve(ROOT,"."+pathname);
 if(!(name===ROOT||name.startsWith(ROOT+path.sep))){res.writeHead(403);res.end();return;}
 fs.readFile(name,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{"Content-Type":types[path.extname(name)]||"application/octet-stream"});res.end(data);});
});
const listen=(s)=>new Promise((resolve,reject)=>{s.once("error",reject);s.listen(0,"127.0.0.1",resolve)});
async function confirmByClick(page,selector){page.once("dialog",d=>d.accept());await page.locator(selector).click();}
async function prepare(page,url,ruleset){
 await page.goto(url,{waitUntil:"domcontentloaded"});
 // First-visit ruleset modal opens 150 ms after boot.
 await page.waitForTimeout(250);
 if(await page.locator("#rulesetModal").isVisible()){
   await page.locator('[data-ruleset="'+ruleset+'"]').click();
   if(await page.locator("#rulesetModal").isVisible())await page.locator("#closeRuleset").click();
 }
 await page.locator('#classGrid [data-class-name="德魯伊"]').click();
 await confirmByClick(page,"[data-step='0'] .class-confirm-controls button");
 if(ruleset==="2014"){
   await page.locator('#classDetail [data-start-mode="gold"]').click();
   await page.locator("#rollStartGold14").click();
 }
 await page.locator("#next0").click();
 await page.locator("#bgGrid button.pick-card").filter({hasText:"隱士"}).first().click();
 if(ruleset==="2014"){
   await page.locator('[data-bg14="lang1"]').selectOption({index:1});
   await confirmByClick(page,".confirm-bg button");
   await page.locator("#spGrid button.pick-card").filter({hasText:"半精靈"}).first().click();
   await confirmByClick(page,".confirm-sp button");
 }else{
   await confirmByClick(page,".confirm-bg button");
   await page.locator("#spGrid button.pick-card").filter({hasText:"精靈"}).first().click();
   await page.locator('[data-spch="eSkill"]').selectOption("求生");
   await page.locator('[data-spch="eLine"]').selectOption("卓爾");
   await page.locator('[data-spch="eCast"]').selectOption("wis");
   await confirmByClick(page,"[data-confirm-species-choices]");
   await confirmByClick(page,".confirm-sp button");
 }
 await page.locator("#next1").click();
 await page.locator('#methodTabs [data-m="roll"]').click();
}
async function testAt(browser,url,width,ruleset){
 const ctx=await browser.newContext({viewport:{width,height:width===390?844:900}});
 const page=await ctx.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await prepare(page,url,ruleset);
 const button=page.locator("#rollBtn");
 assert(await button.isEnabled(),"first roll available");
 assert.equal(await page.locator("#rollResult").innerText(),"","empty before roll");
 // Save the current character before opening another tab, as in normal browsing.
 await page.waitForTimeout(1200);
 const peer=await ctx.newPage();await peer.goto(url,{waitUntil:"domcontentloaded"});
 assert.equal(await peer.evaluate(()=>S.id),await page.evaluate(()=>S.id),"same saved character in both tabs");
 await button.click();
 const first=await page.locator("#rollResult").innerText();
 const nums=(first.match(/\d+/g)||[]).map(Number);
 assert.equal(nums.length,6,"six results");assert(nums.every(x=>x>=3&&x<=18),"4d6 drop lowest bounds");
 assert(await button.isDisabled(),"immediately locked");
 assert((await button.innerText()).includes("不可重新投擲"),"visible lock feedback");
 const saved=await page.evaluate(()=>serialize());assert.deepEqual(saved.rolled,nums,"saved results");
 await page.locator('#methodTabs [data-m="array"]').click();
 await page.locator('#methodTabs [data-m="roll"]').click();
 assert(await button.isDisabled(),"switching methods preserves lock");
 assert.equal(await page.locator("#rollResult").innerText(),first);
 await page.reload({waitUntil:"domcontentloaded"});
 await page.locator("#next0").click();
 await page.locator("#next1").click();
 assert(await button.isDisabled(),"reload preserves lock");
 assert.equal(await page.locator("#rollResult").innerText(),first);
 await peer.locator("#next0").click();
 await peer.locator("#next1").click();
 await peer.locator('#methodTabs [data-m="roll"]').click();
 assert(await peer.locator("#rollBtn").isDisabled(),"pre-existing tab locked");
 assert.equal(await peer.locator("#rollResult").innerText(),first);
 assert.deepEqual(errors,[],"no browser runtime errors");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(overflow<=3,"viewport overflow "+width+": "+overflow);
 await ctx.close();
 console.log("PASS "+ruleset+" "+width+"px: once, switch, reload, cross-tab, save, layout");
}
(async()=>{await listen(server);const url=process.env.QA_URL||"http://127.0.0.1:"+server.address().port+"/index.html";
 let browser;
 try{
   try{browser=await chromium.launch({headless:true})}catch(e){browser=await chromium.launch({headless:true,channel:"chrome"})}
   for(const ruleset of ["2024","2014"])for(const width of [390,1440])await testAt(browser,url,width,ruleset);
   console.log("PASS one-time-roll UAT");
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error("FAIL one-time-roll UAT:",e.stack||e);process.exitCode=1;});

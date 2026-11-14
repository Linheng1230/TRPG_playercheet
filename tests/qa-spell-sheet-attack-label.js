"use strict";
const assert=require("node:assert/strict");
const path=require("node:path"),fs=require("node:fs"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "")||"index.html";
 const file=path.resolve(root,rel);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}
 const ext=path.extname(file);res.writeHead(200,{"Content-Type":ext===".html"?"text/html; charset=utf-8":ext===".js"?"text/javascript; charset=utf-8":ext===".css"?"text/css; charset=utf-8":"application/octet-stream"});res.end(data);
 });
});
(async()=>{
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.goto(process.env.QA_URL||"http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
   const result=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};S.base.wis=18;
    S.cantrips=new Set([SPELLS.find(s=>s.eng==="Poison Spray").n]);
    S.prepared=new Set([SPELLS.find(s=>s.eng==="Entangle").n]);
    const sheet=spellSheet();
    const doc=new DOMParser().parseFromString(sheet,"text/html");
    const header=doc.querySelector(".ss-head");
    const text=header?.textContent.replace(/\s+/g," ").trim()||"";
    const label=[...header?.querySelectorAll("span")||[]].find(x=>x.textContent.trim().startsWith("攻擊命中"));
    const expected=fmt(pb()+mod(finalScore("wis")));
    return {text,label:label?.textContent.trim()||"",expected,hasOtherSections:!!doc.querySelector(".ss-slots")};
   });
   assert(result.text.includes("德魯伊"),"Druid spell-sheet header missing");
   assert(result.text.includes("豁免 DC"),"Save DC label missing");
   assert.equal(result.label,"攻擊命中 "+result.expected,"Spell attack modifier or label changed");
   assert(result.hasOtherSections,"Other spell-sheet sections disappeared");
   console.log(JSON.stringify({PASS:true,width,...result}));
   await page.close();
  }
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

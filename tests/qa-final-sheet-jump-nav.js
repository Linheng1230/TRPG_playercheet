"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".woff2":"font/woff2",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const file=path.resolve(root,rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,st)=>{
  if(err||!st.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":mime[path.extname(file).toLowerCase()]||"application/octet-stream"});
  fs.createReadStream(file).pipe(res);
 });
});
const listen=()=>new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html")));
(async()=>{
 const url=await listen();
 const browser=await chromium.launch({channel:"chrome",headless:true});
 const report=[];
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(url,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const initial=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=5;S.classLevels={法師:5};S.sub=null;
    S.sp=SPECIES_2024.find(x=>x.n==="矮人");
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="商人");
    S.base={str:8,dex:12,con:14,int:16,wis:13,cha:10};
    const can=SPELLS.find(x=>x.lv===0&&x.cls.includes("W"));
    const lvl=SPELLS.find(x=>x.lv===1&&x.cls.includes("W"));
    S.cantrips=new Set([can.n]);S.prepared=new Set([lvl.n]);S.spellbook=new Set([lvl.n]);
    go(7);
    const nav=document.querySelector("#finalJumpNav");
    return {keys:[...nav.querySelectorAll("button")].map(b=>b.dataset.sheetJump),sticky:getComputedStyle(nav).position,navTop:Number.parseFloat(getComputedStyle(nav).top),primaryHeight:document.querySelector("nav.steps").getBoundingClientRect().height,htmlWidth:document.documentElement.scrollWidth,viewport:innerWidth,hasAttributeTargets:[...nav.querySelectorAll("button")].every(b=>!!document.getElementById(b.getAttribute("aria-controls")))};
   });
   const expected=["overview","status","slots","attributes","skills","class","species","spells","equipment","notes","creatures"];
   assert.deepEqual(initial.keys,expected,"Only actual character-sheet sections should be indexed");
   assert.equal(initial.sticky,"sticky");
   assert(Math.abs(initial.navTop-initial.primaryHeight)<3,"Sheet nav must be below global nav");
   assert(initial.hasAttributeTargets,"Each shortcut must resolve to a real section");
   assert(initial.htmlWidth<=initial.viewport+2,"No horizontal page overflow");
   const visited={};
   for(const key of ["spells","equipment","status","slots","notes","creatures","overview"]){
    await page.locator('#finalJumpNav [data-sheet-jump="'+key+'"]').click();
    const position=await page.evaluate(key=>{
     const nav=document.querySelector("#finalJumpNav");
     const button=nav.querySelector('[data-sheet-jump="'+key+'"]');
     const el=document.getElementById(button.getAttribute("aria-controls"));
     return {scroll:scrollY,targetTop:el.getBoundingClientRect().top,navBottom:nav.getBoundingClientRect().bottom,navTop:nav.getBoundingClientRect().top,primaryBottom:document.querySelector("nav.steps").getBoundingClientRect().bottom,current:nav.querySelector('button[aria-current="location"]')?.dataset.sheetJump};
    },key);
    assert.equal(position.current,key,"Navigation button should be active");
    assert(position.scroll>0,"Shortcut "+key+" did not scroll: "+JSON.stringify(position));
    assert(position.targetTop>=position.navBottom-4,"Target "+key+" is hidden behind sticky nav");
    assert(position.navTop>=position.primaryBottom-3,"Navigation overlaps global sticky nav");
    visited[key]=Math.round(position.scroll);
   }
   await page.locator('#finalJumpNav [data-sheet-jump="status"]').click();
   fs.mkdirSync(path.join(root,"tmp"),{recursive:true});
   await page.screenshot({path:path.join(root,"tmp","qa-final-sheet-jump-nav-"+width+".png")});
   await page.locator("#hpAmt").fill("2");
   await page.locator('#finalSheet [data-hp="heal"]').click();
   assert.equal(await page.locator("#finalJumpNav button").count(),expected.length,"Rerender must preserve section navigation");
   assert.equal(await page.locator('#finalJumpNav [aria-current="location"]').getAttribute("data-sheet-jump"),"status","State update must preserve jump selection");
   await page.emulateMedia({media:"print"});
   assert.equal(await page.locator("#finalJumpNav").evaluate(el=>getComputedStyle(el).display),"none","Print/PDF must exclude jump nav");
   await page.emulateMedia({media:"screen"});
   const extra=await page.evaluate(()=>{
    S.cls=CLASSES.find(x=>x.n==="戰士");S.level=2;S.classLevels={戰士:2};S.sub=null;S.cantrips.clear();S.prepared.clear();S.spellbook.clear();
    go(7);
    const fighter=[...document.querySelectorAll("#finalJumpNav button")].map(x=>x.dataset.sheetJump);
    const fighterCreatureId=document.querySelector("#ciSheet")?.id;
    S.cls=CLASSES.find(x=>x.n==="邪術師");S.level=3;S.classLevels={邪術師:3};S.sub=null;go(7);
    const warlock=[...document.querySelectorAll("#finalJumpNav button")].map(x=>x.dataset.sheetJump);
    const warlockFamiliarId=document.querySelector("#warlockFamiliar")?.id;
    S.ruleset="2014";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="戰士");S.sp=SPECIES_2014[0];S.bg=BACKGROUNDS_2014[0];S.level=2;S.classLevels={戰士:2};S.sub=null;go(7);
    const legacy=[...document.querySelectorAll("#finalJumpNav button")].map(x=>x.dataset.sheetJump);
    return {fighter,warlock,legacy,fighterCreatureId,warlockFamiliarId};
   });
   assert(!extra.fighter.includes("spells")&&!extra.fighter.includes("slots")&&!extra.fighter.includes("familiar"),"Noncaster must hide missing shortcuts");
   assert(extra.warlock.includes("familiar"),"Warlock familiar section must be indexed");
   assert.equal(extra.warlockFamiliarId,"warlockFamiliar","Existing familiar event selector must be preserved");
   assert.equal(extra.fighterCreatureId,"ciSheet","Existing creature import event selector must be preserved");
   assert(!extra.legacy.includes("familiar")&&!extra.legacy.includes("slots")&&!extra.legacy.includes("creatures"),"2014 noncaster must not link nonexistent content");
   assert.deepEqual(errors,[],"No page errors");
   await page.close();
   report.push({width,keys:initial.keys,jumps:visited,noncaster:extra.fighter,warlockFamiliar:true,legacy:true,printHidden:true,reRender:true,overflow:false});
  }
  console.log(JSON.stringify({pass:true,report},null,2));
 }finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1;});

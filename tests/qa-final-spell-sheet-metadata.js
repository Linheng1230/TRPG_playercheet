"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const path=require("node:path");
const {spawn}=require("node:child_process");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".ttf":"font/ttf",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const file=path.resolve(root,rel);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":types[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
 });
});
function listen(){return new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html")));}
async function runExisting(name,url){
 return new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[path.resolve(root,"tests",name)],{cwd:root,env:{...process.env,QA_URL:url},windowsHide:true});
  let out="",err="";
  p.stdout.on("data",d=>out+=String(d));p.stderr.on("data",d=>err+=String(d));
  p.on("error",reject);
  p.on("close",code=>{
   if(code===0){resolve({test:name,pass:true,output:out.trim().slice(-350)});return;}
   let details="";
   try{
    const results=JSON.parse(out.trim());
    if(Array.isArray(results))details=JSON.stringify(results.filter(x=>x.pass===false).map(x=>({
     label:x.label,width:x.width,errors:x.errors,
     bodyW:x.metrics?.bodyW,viewportW:x.metrics?.viewportW,
     entryOverflow:x.metrics?.entryOverflow,full:x.metrics?.full,
     blocks:x.metrics?.blocks,dualTextNodes:x.metrics?.dualTextNodes
    })));
   }catch(e){details=out.slice(0,1600);}
   reject(new Error(name+" FAILED code="+code+"\n"+err.slice(-1200)+"\nFAILED_METRICS="+details));
  });
 });
}
async function main(){
 const url=await listen();
 const browser=await chromium.launch({channel:"chrome",headless:true});
 const report={screens:[],existing:[]};
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e.message)));
   await page.goto(url,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const meta=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    const samples=SPELLS.map(sp=>({sp,meta:spellMetaDb()[sp.n]||{}}));
    const priced=samples.find(x=>String(x.meta.comp||"").includes("價值")&&String(x.meta.comp||"").includes("會消耗"));
    const concentration=samples.find(x=>x.sp.con&&x.meta.time&&x.meta.dur);
    const ritual=samples.find(x=>x.sp.rit&&x.meta.time);
    const ordinary=samples.find(x=>!x.sp.con&&!x.sp.rit&&x.meta.range&&x.meta.comp);
    if(!priced||!concentration||!ritual||!ordinary)throw Error("missing representative canonical spells");
    const picked=[ordinary,concentration,ritual,priced];
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=5;S.classLevels={法師:5};
    S.sp=SPECIES_2024.find(x=>x.n==="人類");
    S.sub=null;S.cantrips=new Set([ordinary.sp.n]);
    S.prepared=new Set([concentration.sp.n,ritual.sp.n,priced.sp.n]);
    S.spellbook=new Set([ordinary.sp.n,concentration.sp.n,ritual.sp.n,priced.sp.n]);
    go(7);
    const sheet=spellSheet();
    const root=document.querySelector("#finalSheet");
    root.innerHTML=sheet;
    const entries=[...root.querySelectorAll(".ss-entry")];
    const pricedEntry=entries.find(el=>el.dataset.sheetSpell===priced.sp.n);
    const longBodyCount=entries.filter(el=>!!el.querySelector(".ss-entry-rule")).length;
    const cost=pricedEntry?.querySelector(".ss-comp .ss-v")?.textContent||"";
    const headings=[...root.querySelectorAll(".ss-bt")].map(e=>({text:e.textContent,align:getComputedStyle(e).textAlign}));
    const short=entries.find(el=>el.dataset.sheetSpell===ordinary.sp.n);
    const conEntry=entries.find(el=>el.dataset.sheetSpell===concentration.sp.n);
    const ritEntry=entries.find(el=>el.dataset.sheetSpell===ritual.sp.n);
    const entriesData=entries.slice(0,4).map(el=>({name:el.dataset.sheetSpell,components:el.querySelector(".ss-comp")?.textContent,time:el.querySelector(".ss-entry-meta")?.textContent}));
    const noCasterHTML=spellSheetBlock("固定／特性授予法術（1）",[{mark:"❧",lv:ritual.sp.lv+" 環",n:ritual.sp.n,tag:"固定習得 · 測試來源",d:ritual.sp.d}],"ss-always");
    S.ruleset="2014";syncRulesetUI();
    const s2014=SPELLS14.find(x=>x.rit)||SPELLS14[0];
    const legacyHTML=spellSheetBlock("2014 法術",[{n:s2014.n,lv:s2014.lv,tag:"來源",d:s2014.d}]);
    S.ruleset="2024";syncRulesetUI();
    const allText=root.textContent;
    const overflow=document.documentElement.scrollWidth>innerWidth+1;
    return {total:SPELLS.length,entries:entries.length,entryNames:entriesData,flags:{con:!!conEntry?.querySelector(".ss-flag.con"),rit:!!ritEntry?.querySelector(".ss-flag.rit")},cost,sourceCost:priced.meta.comp,longBodyCount,fullRule:priced.sp.d,headings,shortHeight:short?Math.round(short.getBoundingClientRect().height):0,overflow,legacyHTML,grantHTML:noCasterHTML,containsLongRule:allText.includes(priced.sp.d.slice(0,25)),fullSheetText:allText.length};
   });
   assert.equal(meta.total,391);
   assert(meta.entries>=4,"Final sheet should render all chosen spells");
   assert(meta.flags.con&&meta.flags.rit,"Concentration and ritual flags must be separate");
   assert(meta.cost.includes("價值")&&meta.cost.includes("會消耗"),"Material prices and consumption must survive");
   assert(meta.cost.includes("材（M）"),"2024 component label must be 材（M）");
   assert.equal(meta.longBodyCount,0,"Compact sheet must not render expanded spell effects");
   assert.equal(meta.containsLongRule,false,"Long effect must remain in lookup, not final sheet");
   assert(meta.headings.every(x=>x.align==="center"),"Section titles should be centered");
   console.log("SHEET_ROW_HEIGHT_DIAG",JSON.stringify({width,height:meta.shortHeight,overflow:meta.overflow,spells:meta.entries}));
   assert(meta.shortHeight>0&&meta.shortHeight<180,"Single ordinary spell row should remain compact: "+width+"px height="+meta.shortHeight);
   assert(!meta.overflow,"Document must not overflow at "+width+"px");
   assert(meta.entryNames.every(x=>x.components&&x.time.includes("聲／勢／材")),"Components must remain visible");
   assert(meta.grantHTML.includes("固定習得 · 測試來源")&&meta.grantHTML.includes("儀式"),"Granted spell must retain source and ritual");
   assert(meta.legacyHTML.includes("2014 法術"),"2014 renderer must still work");
   assert(meta.entryNames.every(x=>x.time.includes("學派")&&x.time.includes("施法時間／動作")&&x.time.includes("施法距離")&&x.time.includes("持續時間")),"Every entry needs metadata");
   assert.deepEqual(errors,[],"No pageerrors");
   await page.screenshot({path:path.join(root,"tmp","qa-final-spell-sheet-"+width+".png"),fullPage:true});
   report.screens.push({width,entries:meta.entries,rowHeight:meta.shortHeight,material:meta.cost.slice(0,170),overflow:false,expandedEffects:meta.longBodyCount});
   await page.close();
  }
  for(const name of ["qa-spell-components-2024.js","qa-granted-spell-cards.js","qa-spell-readability.js","qa-2024-export-and-spell-ui.js"]){
   try{report.existing.push(await runExisting(name,url));}
   catch(error){report.existing.push({test:name,pass:false,error:String(error.message||error).slice(0,1200)});}
  }
  const failed=report.existing.filter(x=>!x.pass);
  console.log(JSON.stringify({pass:!failed.length,...report},null,2));
  if(failed.length)throw new Error(failed.map(x=>x.test+": "+x.error).join("\n"));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1;});

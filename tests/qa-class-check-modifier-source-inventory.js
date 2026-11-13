"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,".."),snapshot=path.join(__dirname,"fixtures","class-check-modifier-candidates-20261113.json");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".woff2":"font/woff2",".otf":"font/otf"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const p=path.resolve(root,rel);if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(p,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{"Content-Type":mime[path.extname(p)]||"application/octet-stream"});fs.createReadStream(p).pipe(res);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  const page=await browser.newPage();await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
  const result=await page.evaluate(()=>{
   const sources={ALLDESC,SUBD,ALLDESC14,CLASSDESC_2024};
   const trigger=/(?:技能|檢定|先攻|豁免|被動|熟練|專精|優勢|劣勢|d20)/;
   const impact=/(?:加上|加值|額外|提高|一半|熟練|專精|優勢|劣勢|重擲|視為|改為|減值|最低|替代|增幅|骰|擲)/;
   const keys=new Set();
   function walk(x,source,prefix=""){
    if(!x||typeof x!=="object")return;
    for(const [k,v] of Object.entries(x)){
     const id=prefix?prefix+"|"+k:k;
     if(typeof v==="string"&&trigger.test(v)&&impact.test(v))keys.add(source+":"+id);
     else if(v&&typeof v==="object"&&!Array.isArray(v))walk(v,source,id);
    }
   }
   for(const [source,x] of Object.entries(sources))walk(x,source);
   return {names:[...keys].sort((a,b)=>a.localeCompare(b,"zh")),sourceClasses:Object.keys(PROG_2024).sort((a,b)=>a.localeCompare(b,"zh"))};
  });
  assert.equal(result.sourceClasses.length,12,"Full 12 class source inventory must remain visible");
  const must=["ALLDESC:萬事通","ALLDESC:異界魅力","ALLDESC14:全能高手","SUBD:恐懼伏擊者"];
  for(const x of must)assert(result.names.includes(x),"Critical modifier source missing: "+x);
  if(process.argv.includes("--refresh-baseline")){
   fs.mkdirSync(path.dirname(snapshot),{recursive:true});
   fs.writeFileSync(snapshot,JSON.stringify(result,null,2)+"\n","utf8");
   console.log("BASELINE_CAPTURED",JSON.stringify({classes:result.sourceClasses.length,candidates:result.names.length,file:snapshot}));
  }else{
   const known=JSON.parse(fs.readFileSync(snapshot,"utf8"));
   const added=result.names.filter(x=>!known.names.includes(x)),removed=known.names.filter(x=>!result.names.includes(x));
   assert.deepEqual(result.sourceClasses,known.sourceClasses,"Class inventory changed; update check-effect audit");
   if(added.length||removed.length)throw Error("CLASS_CHECK_MODIFIER_SOURCE_DRIFT: new or removed check-related rule text requires review. Added: "+JSON.stringify(added)+" Removed: "+JSON.stringify(removed));
   console.log(JSON.stringify({pass:true,classCount:result.sourceClasses.length,candidates:result.names.length,sourceDrift:0,guard:"New candidate requires reviewing then regenerating baseline"}));
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;try{server.close()}catch(_){}});

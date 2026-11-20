"use strict";
/* One-shot, isolated local HTTP QA: self-closing server and owned child processes. */
const fs=require("node:fs");
const path=require("node:path");
const http=require("node:http");
const cp=require("node:child_process");
const root=path.resolve(__dirname,"..");
const evidence=path.resolve(root,"..","academy-inline-20261120-evidence");
fs.mkdirSync(evidence,{recursive:true});
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",
 ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",
 ".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{
 const raw=new URL(req.url,"http://127.0.0.1").pathname;
 let decoded;try{decoded=decodeURIComponent(raw)}catch(_){res.writeHead(400);return res.end("Bad path")}
 const target=path.resolve(root,"."+decoded);
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end("Forbidden")}
 fs.readFile(target,(err,bytes)=>{
  if(err){res.writeHead(err.code==="ENOENT"?404:500);return res.end("Missing")}
  res.setHeader("Content-Type",mime[path.extname(target)]||"application/octet-stream");
  res.setHeader("Cache-Control","no-store");
  res.end(bytes);
 });
});
function run(name,env) {
 return new Promise(resolve=>{
  const child=cp.spawn(process.execPath,[path.join(root,"tests",name)],{
   cwd:root,env:{...process.env,...env},windowsHide:true});
  let out="",err="",done=false;
  child.stdout.on("data",b=>{out+=b.toString("utf8")});
  child.stderr.on("data",b=>{err+=b.toString("utf8")});
  const timer=setTimeout(()=>{if(!done)child.kill();},120000);
  child.on("error",e=>{err+=e.message;});
  child.on("close",code=>{done=true;clearTimeout(timer);resolve({test:name,code,stdout:out.slice(-3500),stderr:err.slice(-1200)});});
 });
}
server.listen(0,"127.0.0.1",async()=>{
 const port=server.address().port;
 const env={QA_URL:"http://127.0.0.1:"+port+"/index.html",QA_BASE:"http://127.0.0.1:"+port+"/",
  QA_ACADEMY_CRITICAL_REPORT:path.join(evidence,"candidate-critical.json"),
  QA_ACADEMY_EVIDENCE_DIR:evidence};
 const tests=process.argv.slice(2);
 const selected=tests.length?tests:["qa-save-migration-fixtures.js","qa-2014-matrix.js","qa-module-smoke.js"];
 const results=[];
 try{for(const test of selected)results.push(await run(test,env));}
 finally{await new Promise(resolve=>server.close(resolve));}
 const report={createdAt:new Date().toISOString(),sourceRoot:root,port,results};
 fs.writeFileSync(path.join(evidence,"http-regressions.json"),JSON.stringify(report,null,2),"utf8");
 console.log(JSON.stringify(results.map(x=>({test:x.test,code:x.code,out:x.stdout.slice(-600),error:x.stderr.slice(-480)}))));
 if(results.some(x=>x.code!==0))process.exitCode=1;
});

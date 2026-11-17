"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/,"")||"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404).end();return;}
  res.writeHead(200,{"Content-Type":file.endsWith(".js")?"text/javascript; charset=utf-8":file.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream"}).end(data);
 });
});
(async()=>{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{
  for(const width of [320,390,1440]){
   const page=await browser.newPage({viewport:{width,height:860},hasTouch:width<500,isMobile:width<500});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const result=await page.evaluate(()=>{
    S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="邪術師");S.level=5;S.sub=null;S.subConfirmed=false;
    S.invocations=new Set(["痛苦爆轟","斥退爆轟","秘法長矛"]);
    S.base={str:8,dex:14,con:14,int:12,wis:10,cha:18};
    S.cantrips=new Set(["Eldritch Blast"]);
    go(5);
    const keys=["agonizingCantrip","repellingCantrip","spearCantrip"];
    const rows=keys.map(key=>{
     const sel=document.querySelector('[data-c24key="'+key+'"]');
     const note=sel?.parentElement?.querySelector(".invocation-rule-note");
     return {key,exists:!!sel,text:note?.innerText||"",visible:!!note&&note.getBoundingClientRect().width>0,selected:sel?.value||""};
    });
    const modern=activeOptionText5R("invocations","痛苦爆轟");
    S.ruleset="2014";
    const legacy=activeOptionText5R("invocations","痛苦爆轟");
    S.ruleset="2024";
    return {rows,modern,legacy,sub:S.sub,level:S.level,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
   });
   assert.equal(result.rows.length,3);
   for(const row of result.rows){assert(row.exists&&row.visible&&row.text.length>20,"visible mechanics missing: "+row.key);}
   assert.match(result.rows[0].text,/魅力調整值/);
   assert.match(result.rows[1].text,/推離你.*10.*呎/);
   assert.match(result.rows[2].text,/射程.*30.*呎/);
   assert.match(result.modern,/選擇.*戲法/);
   assert(!result.modern.startsWith("每當你施放魔能爆"),"2024 must not show 2014-only effect");
   assert(result.legacy.includes("魔能爆"),"2014 full-rule source preserved");
   assert.equal(result.sub,null,"reading invocation rules cannot select subclass");
   assert.equal(result.level,5);
   assert(result.overflow<=2,"horizontal overflow "+result.overflow+" at "+width);
   await page.locator('[data-c24key="agonizingCantrip"]').scrollIntoViewIfNeeded();
   const rule=page.locator('[data-c24key="agonizingCantrip"]').locator("xpath=..").locator(".invocation-rule-note");
   assert(await rule.isVisible(),"Mobile rule note must be visible");
   const bounding=await rule.boundingBox();
   assert(bounding.width>100&&bounding.height>30,"rule note has physical dimensions");
   if(!process.env.CI)await page.screenshot({path:"D:\\Tools\\zizi-ai-runtime\\trpg-playercheet-qa\\warlock-invocation-"+width+"-20261117.png"});
   assert.deepEqual(errors,[]);
   console.log("WARLOCK_INVOCATION_DESCRIPTION_PASS",JSON.stringify({width,notes:result.rows.length,visible:true,overflow:result.overflow}));
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});

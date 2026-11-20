"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),http=require("node:http"),cp=require("node:child_process"),assert=require("node:assert/strict");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,".."),temp=fs.mkdtempSync(path.join(os.tmpdir(),"dnd5r-update-"));
const baseSha="a".repeat(40),newSha="b".repeat(40),out=path.join(temp,"dnd5r-pages-site");
let servedSha=baseSha;
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,"");
  if(name==="site-version.json"){
   res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"});
   res.end(JSON.stringify({schemaVersion:1,sha:servedSha}));return;
  }
  const f=path.resolve(out,name||"home.html");
  const rel=path.relative(out,f);
  if(rel.startsWith("..")||path.isAbsolute(rel)){res.writeHead(403);res.end();return}
  fs.readFile(f,(e,data)=>{
   if(e){res.writeHead(404);res.end();return}
   res.writeHead(200,{"Content-Type":(mime[path.extname(f)]||"application/octet-stream")+"; charset=utf-8","Cache-Control":"no-store"});
   res.end(data);
  });
 }catch{res.writeHead(400);res.end()}
});
const goto=async (p,route)=>{
 const result=await p.goto(route,{waitUntil:"domcontentloaded",timeout:35000});
 assert.equal(result.status(),200);
 await p.waitForFunction(()=>!!window.DND5RUpdateNotice,{timeout:15000});
};
(async()=>{
 const build=cp.spawnSync(process.execPath,[path.join(root,"scripts/prepare-pages-site.cjs"),out],{cwd:root,encoding:"utf8",env:{...process.env,GITHUB_SHA:baseSha}});
 assert.equal(build.status,0,"cannot prepare candidate site: "+build.stderr);
 await new Promise((ok,fail)=>server.listen(0,"127.0.0.1",ok).once("error",fail));
 const base="http://127.0.0.1:"+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.BRAVE_PATH||process.platform==="win32"?{executablePath:process.env.BRAVE_PATH||"C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe"}:{}),args:["--disable-extensions"]});
 try{
  const homeCtx=await browser.newContext({viewport:{width:390,height:844},locale:"zh-TW",reducedMotion:"reduce"});
  const home=await homeCtx.newPage();
  const issues=[];home.on("pageerror",e=>issues.push(e.message));
  await goto(home,base+"/home.html");
  await home.waitForTimeout(400);
  assert.equal(await home.locator("#dnd5r-version-notice").count(),0,"no false positive on current version");
  servedSha=newSha;
  await home.evaluate(()=>window.DND5RUpdateNotice.checkNow());
  const box=home.locator("#dnd5r-version-notice");
  assert(await box.isVisible(),"new version must be visible");
  const width=await box.evaluate(e=>e.getBoundingClientRect().width);
  assert(width<=390-26,"mobile notice fits viewport");
  if(process.env.QA_EVIDENCE_DIR){fs.mkdirSync(process.env.QA_EVIDENCE_DIR,{recursive:true});await home.screenshot({path:path.join(process.env.QA_EVIDENCE_DIR,"site-update-home-390.png"),animations:"disabled"})}
  const buttons=box.getByRole("button");
  assert.equal(await buttons.count(),2);
  assert((await buttons.first().evaluate(e=>e.getBoundingClientRect().height))>=44,"tap target accessible");
  await box.getByRole("button",{name:"稍後再說"}).click();
  assert.equal(await box.count(),0,"defer closes notice");
  await home.evaluate(()=>window.DND5RUpdateNotice.checkNow());
  assert.equal(await box.count(),0,"defer suppresses same version for session");
  assert.deepEqual(issues,[],"home no browser JS errors");
  await homeCtx.close();

  const home2Ctx=await browser.newContext({viewport:{width:1440,height:900},locale:"zh-TW"});
  const home2=await home2Ctx.newPage();
  await goto(home2,base+"/home.html");
  await home2.locator("#dnd5r-version-notice").waitFor();
  await home2.getByRole("button",{name:"立即更新"}).click();
  await home2.waitForURL(u=>u.searchParams.get("_dnd5r_build")===newSha.slice(0,12),{timeout:15000});
  await home2Ctx.close();

  const ctx=await browser.newContext({viewport:{width:390,height:844},locale:"zh-TW",reducedMotion:"reduce"});
  const page=await ctx.newPage();
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(e.message));
  await goto(page,base+"/index.html?view=creator");
  await page.waitForTimeout(410);
  if(!(await page.locator("#rulesetModal.open").count()))await page.locator("#btnRuleset").click();
  await page.locator('[data-ruleset="2024"]').click();
  await page.locator('#classGrid [data-class-name="戰士"]').click();
  page.once("dialog",d=>d.accept());
  await page.locator("[data-step='0'] .class-confirm-controls button").click();
  const charRecord=()=>page.evaluate(()=>{
   const keys=Object.keys(localStorage).filter(k=>k.startsWith("dnd5r:char:"));
   const records=keys.map(k=>JSON.parse(localStorage.getItem(k)||"null"));
   return records.find(r=>r?.cls==="戰士")||null;
  });
  const snap=await page.evaluate(()=>({id:S.id,cls:S.cls?.n,slotsUsed:S.slotsUsed,play:S.play}));
  assert.equal(snap.cls,"戰士","real creator class selection ready");
  await page.locator("#dnd5r-version-notice").waitFor();
  await page.getByRole("button",{name:"立即更新"}).click();
  await page.waitForURL(u=>u.searchParams.get("_dnd5r_build")===newSha.slice(0,12),{timeout:16000});
  const save=await charRecord();
  assert(save&&save.id===snap.id&&save.cls===snap.cls,"canonical local character persisted through update");
  assert.equal(await page.evaluate(()=>localStorage.getItem(SK.cur)),snap.id,"active character pointer survives refresh");
  assert.deepEqual(save.slotsUsed,snap.slotsUsed,"spell slot usage preserved");
  assert.deepEqual(save.play,snap.play,"play resources and HP preserved");
  assert.deepEqual(pageErrors,[],"creator reload no JS errors");
  await ctx.close();

  const pointerCtx=await browser.newContext({viewport:{width:390,height:844},locale:"zh-TW",reducedMotion:"reduce"});
  await pointerCtx.addInitScript(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){
    if(String(k)==="dnd5r:current")throw new DOMException("current pointer write failed","QuotaExceededError");
    return original.call(this,k,v);
   };
  });
  const pointerPage=await pointerCtx.newPage();
  await goto(pointerPage,base+"/index.html?view=creator");
  await pointerPage.locator("#dnd5r-version-notice").waitFor();
  const beforePointerUrl=pointerPage.url();
  await pointerPage.getByRole("button",{name:"立即更新"}).click();
  assert.equal(pointerPage.url(),beforePointerUrl,"failed active-character pointer write blocks reload");
  assert(await pointerPage.locator(".dnd5r-update-error").isVisible(),"pointer write failure shows warning");
  await pointerCtx.close();

  const blockedCtx=await browser.newContext({viewport:{width:320,height:844},locale:"zh-TW",reducedMotion:"reduce"});
  await blockedCtx.addInitScript(()=>{
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){
    if(String(k).startsWith("dnd5r:char:"))throw new DOMException("quota exhausted","QuotaExceededError");
    return original.call(this,k,v);
   };
  });
  const blocked=await blockedCtx.newPage();
  await goto(blocked,base+"/index.html?view=creator");
  await blocked.locator("#dnd5r-version-notice").waitFor();
  const originalUrl=blocked.url();
  await blocked.getByRole("button",{name:"立即更新"}).click();
  assert.equal(blocked.url(),originalUrl,"failed save cannot navigate");
  assert(await blocked.locator(".dnd5r-update-error").isVisible(),"save failure explained");
  if(process.env.QA_EVIDENCE_DIR)await blocked.screenshot({path:path.join(process.env.QA_EVIDENCE_DIR,"site-update-save-blocked-320.png"),animations:"disabled"});
  assert.equal(await blocked.getByRole("button",{name:"再試一次"}).isEnabled(),true,"user may retry");
  await blockedCtx.close();
  console.log("PASS real browser home and creator: same version quiet; newer version; defer; mobile/desktop; safe local roundtrip; quota failure blocks reload");
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exitCode=1}).finally(async()=>{await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true})});

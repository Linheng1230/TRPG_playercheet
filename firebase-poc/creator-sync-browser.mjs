import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
const here=path.dirname(fileURLToPath(import.meta.url));
const source=process.env.CREATOR_QA_SOURCE;
if(!source||!fs.existsSync(path.join(source,"index.html")))throw Error("CREATOR_QA_SOURCE must be an isolated exact git archive");
const previewOnly=process.env.CREATOR_PREVIEW_ONLY==="true";
const dist=path.join(here,"qa-output",previewOnly?"creator-real-dist":"creator-sync-dist");
const built=fs.readFileSync(path.join(dist,"creator-bridge.html"),"utf8");
const tags=[...built.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="\.\/assets\/[^"]+"[^>]*>(?:<\/script>)?/g)]
  .map(m=>m[0].replaceAll('"./assets/','"/firebase-poc/assets/')).join("\n");
assert(tags.includes("creatorBridge-"),"built bridge tags missing");
const native=fs.readFileSync(path.join(source,"index.html"),"utf8");
assert(native.includes("</body>")&&!native.includes("firebase-creator-sync-root"));
const instrumented=native.replace("</body>",'<div id="firebase-creator-sync-root"></div>\n'+tags+'\n</body>');
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".mjs":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".svg":"image/svg+xml",".woff2":"font/woff2",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,"http://127.0.0.1"),name=decodeURIComponent(url.pathname);
  if(name==="/"||name==="/index.html"){res.writeHead(200,{"content-type":mime[".html"],"cache-control":"no-store"});res.end(instrumented);return;}
  // Keep the existing creator's actual cloud-vault navigation functional in
  // this isolated preview. Never serve the production Convex vault here.
  if(name==="/cloud-vault"){res.writeHead(302,{location:"/cloud-vault/"});res.end();return;}
  const prefix=name.startsWith("/cloud-vault/")?"/cloud-vault/":name.startsWith("/firebase-poc/")?"/firebase-poc/":null;
  const base=prefix?dist:name.startsWith("/assets/")?source:null;
  if(!base){res.writeHead(404);res.end();return;}
  const relative=prefix?name.slice(prefix.length)||"index.html":name.slice(1);
  const f=path.resolve(base,relative);
  if(!f.startsWith(path.resolve(base)+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"content-type":mime[path.extname(f).toLowerCase()]||"application/octet-stream","cache-control":"no-store"});
  fs.createReadStream(f).pipe(res);
 }catch{res.writeHead(400);res.end();}
});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(previewOnly?5197:0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
if(previewOnly){
  console.log("REAL_TEST_PREVIEW_ONLY http://localhost:5197/index.html#firebase-creator-sync-root");
  console.log("No automated login or writes; use the authorized isolated Firebase test project.");
  process.on("SIGINT",()=>server.close(()=>process.exit(0)));
}else{
const exe=process.env.BROWSER_EXE||(process.platform==="win32"?"C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe":undefined);
const browser=await chromium.launch({headless:true,args:["--no-sandbox"],...(exe?{executablePath:exe}:{})});
const report={scope:"LOCAL EXACT GIT SNAPSHOT + SYNTHETIC GOOGLE AUTH/FIRESTORE EMULATORS; NO PRODUCTION",creatorSha:process.env.CREATOR_QA_SHA,utc:new Date().toISOString(),steps:[],pass:false};
const step=(name)=>{report.steps.push(name);console.log("PASS "+name)};
const output=process.env.CREATOR_QA_REPORT||path.join(here,"qa-output","CREATOR_SYNC_BROWSER.json");
const marker="QA_GOOGLE_SYNC_"+Date.now().toString(36);
const email=marker.toLowerCase()+"@example.test";
let a,b;
async function fresh(width){
 const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
 const blocked=new Set();
 await context.route("**/*",route=>{
  const url=new URL(route.request().url());
  if(["127.0.0.1","localhost"].includes(url.hostname)||["data:","blob:"].includes(url.protocol))return route.continue();
  // Firebase browser popup resolver loads public gapi JS even with Auth Emulator.
  // Do not allow Google sign-in, identity APIs, or any remote Firestore requests.
  if(url.protocol==="https:"&&url.hostname==="apis.google.com"&&route.request().resourceType()==="script")return route.continue();
  blocked.add(url.hostname);return route.abort();
 });
 const page=await context.newPage(),errors=[];
 page.on("dialog",d=>void d.accept());page.on("pageerror",e=>errors.push(String(e)));
 await page.goto(origin+"/index.html",{waitUntil:"domcontentloaded",timeout:45000});
 await page.waitForTimeout(400);
 if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
 await page.locator("#firebase-creator-sync-root summary").waitFor({timeout:20000});
 return {context,page,root:page.locator("#firebase-creator-sync-root"),errors,blocked};
}
async function login(s,mail,label,existing=false){
 const modal=s.page.locator("#rulesetModal.open");
 if(await modal.count())await s.page.locator("#closeRuleset").click();
 // Observe click and popup together, so a blocked click cannot leave an
 // unhandled rejected promise and suppress diagnostic evidence.
 const [pop]=await Promise.all([
   s.page.waitForEvent("popup",{timeout:30000}),
   s.root.getByRole("button",{name:"使用 Google 登入",exact:true}).click({timeout:15000})
 ]);
 await pop.waitForLoadState("domcontentloaded");
 assert(pop.url().startsWith("http://127.0.0.1:9099/emulator/auth/handler"),"AUTH_POPUP_NOT_EMULATOR");
 if(existing){
   const match=pop.getByText(mail,{exact:true});
   if(await match.count())await match.first().click();
   else{await pop.getByText(mail,{exact:false}).first().click({timeout:10000});}
 }else{
   await pop.getByRole("button",{name:/Add new account/i}).click();
   await pop.locator("input").nth(0).fill(mail);
   await pop.locator("input").nth(1).fill(label);
   await pop.getByRole("button",{name:/Sign in with Google.com/i}).click();
 }
 await s.root.getByRole("button",{name:"登出 Google",exact:true}).waitFor({timeout:20000});
}
const readCurrent=(s)=>s.page.evaluate(()=>{const id=localStorage.getItem("dnd5r:current");const raw=localStorage.getItem("dnd5r:char:"+id);return {id,raw,hp:JSON.parse(raw||"null")?.play?.hp,name:JSON.parse(raw||"null")?.meta?.name};});
async function play(s){
 await s.page.locator("#stepNav .nav-primary button").filter({hasText:"跑團狀態"}).click();
 await s.page.locator('#playStatusBody [data-ps-action="damage1"]').waitFor({timeout:15000});
}
async function damage(s){
 const before=await readCurrent(s);
 await s.page.locator('#playStatusBody [data-ps-action="damage1"]').click();
 await s.page.waitForFunction(({id,hp})=>JSON.parse(localStorage.getItem("dnd5r:char:"+id)||"null")?.play?.hp===hp-1,{id:before.id,hp:before.hp},{timeout:15000});
 return readCurrent(s);
}
const rev=async(s)=>Number((await s.root.getByText(/自動同步中 · 修訂/).innerText()).match(/修訂\s+(\d+)/)?.[1]??0);
async function waitRevision(s,prev){
 await s.page.waitForFunction(p=>Array.from(document.querySelectorAll("#firebase-creator-sync-root strong")).some(el=>{const m=el.textContent.match(/自動同步中 · 修訂\s+(\d+)/);return m&&Number(m[1])>p}),prev,{timeout:20000});
}
try{
 a=await fresh(1440);
 // User's ordinary roster navigation, not a direct internal QA entry.
 await a.page.locator("#actCloudVault").waitFor({state:"attached"});
 const rosterButton=a.page.locator("#btnRoster");
 const fallback=a.page.getByRole("button",{name:"角色庫",exact:true}).first();
 if(await rosterButton.isVisible())await rosterButton.click();else await fallback.click();
 await a.page.locator("#actCloudVault").click();
 await a.page.waitForURL("**/cloud-vault/");
 await a.page.getByRole("heading",{name:"Google 登入與 GM 雲端角色卡"}).waitFor({timeout:15000});
 await a.page.getByRole("button",{name:"使用 Google 登入",exact:true}).waitFor({timeout:15000});
 await a.page.getByRole("link",{name:"返回創角器與 Google 自動同步"}).click();
 await a.root.getByRole("button",{name:"使用 Google 登入",exact:true}).waitFor({timeout:15000});
 step("real creator roster cloud-vault button and return link navigate without 404");
 // The route contract is a separate guest session. A returned empty creator
 // opens its startup ruleset modal again; do not race that modal against OAuth.
 assert.deepEqual(a.errors,[],"guest navigation browser errors");
 await a.context.close();
 a=await fresh(1440);
 const fixture=JSON.parse(fs.readFileSync(path.join(source,"tests","fixtures","legacy-wizard.json"),"utf8")).save;
 fixture.meta={...(fixture.meta||{}),name:marker};
 fixture.play={...(fixture.play||{}),hp:12,hpMax:100000,thp:0,hd:4,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"isolated synthetic QA"};
 await a.page.locator("#fileInput").setInputFiles({name:marker+".json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(fixture))});
 await a.page.waitForFunction(m=>{const id=localStorage.getItem("dnd5r:current");return JSON.parse(localStorage.getItem("dnd5r:char:"+id)||"null")?.meta?.name===m},marker,{timeout:20000});
 const initial=await readCurrent(a);assert(initial.id&&initial.raw);
 step("actual latest-main creator native JSON import created canonical local Save");
 await login(a,email,"QA Same Google");
 await a.root.getByRole("combobox",{name:"選擇本機角色"}).selectOption(initial.id);
 await a.root.getByRole("button",{name:"綁定 Google 並同步"}).click();
 await a.root.getByText(/角色已綁定目前 Google 帳號/).waitFor({timeout:20000});
 assert(await rev(a)>=1);
 step("actual creator Google popup + explicit local character UID binding");
 await play(a);
 const beforeA=await rev(a),changedA=await damage(a);
 await waitRevision(a,beforeA);
 step("real run-mode HP click automatically wrote newer Firestore revision");
 b=await fresh(390);
 assert.equal((await readCurrent(b)).raw,null);
 await login(b,email,"QA Same Google",true);
 await b.root.getByRole("button",{name:"從雲端讀回 "+marker,exact:true}).waitFor({timeout:20000});
 await b.root.getByRole("button",{name:"從雲端讀回 "+marker,exact:true}).click();
 await b.root.getByText(/已從 Google 雲端讀回角色/).waitFor({timeout:20000});
 const recovered=await readCurrent(b);
 assert.equal(recovered.id,changedA.id);assert.equal(recovered.hp,changedA.hp);assert.equal(recovered.name,marker);
 step("independent mobile browser, same synthetic Google identity, native creator read-back exact ID and HP");
 await b.page.reload({waitUntil:"domcontentloaded",timeout:45000});
 await b.root.getByText(/自動同步中 · 修訂/).waitFor({timeout:20000});
 step("fresh creator reload resumed only the previously authorized same-account tab");
 await play(b);
 const beforeB=await rev(b),changedB=await damage(b);
 await waitRevision(b,beforeB);
 step("second device's real HP click synchronized after reload");
 await a.root.getByRole("button",{name:"停止同步"}).click();
 await a.root.getByRole("button",{name:"從雲端讀回 "+marker,exact:true}).click();
 await a.root.getByText(/已從 Google 雲端讀回角色/).waitFor({timeout:20000});
 assert.equal((await readCurrent(a)).hp,changedB.hp);
 step("first device safely fast-forwarded its clean local baseline");
 await play(a);
 const beforeNext=await rev(a);await damage(a);
 await waitRevision(a,beforeNext);
 const beforeLast=await rev(a),newer=await damage(a);
 await waitRevision(a,beforeLast);
 const stale=await damage(b);
 await b.root.getByText(/本機與雲端版本不同/).waitFor({timeout:20000});
 assert.equal((await readCurrent(b)).hp,stale.hp);
 assert.equal((await readCurrent(a)).hp,newer.hp);
 step("conflicting stale browser save stopped without erasing its local edit");
 await a.root.getByRole("button",{name:"登出 Google"}).click();
 await a.root.getByRole("button",{name:"使用 Google 登入"}).waitFor({timeout:15000});
 await login(a,"other-"+email,"QA Other Google");
 await a.root.getByRole("combobox",{name:"選擇本機角色"}).waitFor({timeout:15000});
 assert.equal(await a.root.getByRole("button",{name:"從雲端讀回 "+marker,exact:true}).count(),0);
 const options=await a.root.getByRole("combobox",{name:"選擇本機角色"}).locator("option").allTextContents();
 assert(!options.some(s=>s.includes(marker)));
 assert.equal(await a.root.getByText(/自動同步中 · 修訂/).count(),0);
 step("same-browser Google account switch hides previous owner's cloud and bound local character; sync stopped");
 const overflow=await b.root.evaluate(el=>el.scrollWidth-el.clientWidth);assert(overflow<=1,"mobile sync panel horizontal overflow "+overflow);
 step("390px mobile Google panel does not overflow");
 assert.deepEqual([...a.errors,...b.errors],[],"native creator browser errors");
 report.pass=true;
 console.log("CREATOR_SYNC_BROWSER="+report.steps.length+"/"+report.steps.length+" PASS");
}catch(e){
 report.error=String(e?.stack||e);
 for(const [label,s] of [["A",a],["B",b]])if(s)try{
   console.error("DIAG "+label+" "+JSON.stringify({panel:(await s.root.innerText()).slice(-1800),errors:s.errors.slice(0,5),blockedHosts:[...s.blocked]}));
 }catch{}
 console.error(report.error);process.exitCode=1;
}finally{
 fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
}

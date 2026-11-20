"use strict";
const assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const reports=process.env.QA_EVIDENCE_DIR||path.join(root,"tmp","play-action-deck");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
async function startServer(){
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost");
  const p=path.resolve(root,"."+decodeURIComponent(url.pathname));
  const relative=path.relative(root,p);
  if(relative.startsWith("..")||path.isAbsolute(relative)){res.writeHead(403);res.end();return}
  fs.readFile(p,(err,data)=>{
   if(err){res.writeHead(404);res.end();return}
   res.setHeader("Content-Type",(mime[path.extname(p)]||"application/octet-stream")+"; charset=utf-8");
   res.writeHead(200);res.end(data);
  });
 });
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 return {server,url:"http://127.0.0.1:"+server.address().port+"/index.html"};
}
(async()=>{
 const {server,url}=await startServer();
 const localBrave="C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"&&fs.existsSync(localBrave)?{executablePath:localBrave}:{})});
 fs.mkdirSync(reports,{recursive:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:"zh-TW"});
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>typeof renderPlayStatusTab==="function"&&!!window.PlayActionDeck5R,{timeout:30000});
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  const basics=await page.evaluate(()=>{
   S.ruleset="2024";
   S.cls=CLASSES.find(c=>c.n==="法師");
   S.level=5;S.classLevels={[S.cls.n]:5};S.sub=null;
   ABILITIES.forEach(a=>S.base[a.k]=12);S.base.con=14;S.base.int=18;
   document.getElementById("fName").value="隔離測試法師";
   const get=e=>SPELLS.find(s=>s.eng===e)?.n||null;
   const names=Object.fromEntries(["Shield","Misty Step","Counterspell","Cure Wounds","Healing Word","Alarm","Fireball","Mage Hand"].map(x=>[x,get(x)]));
   S.cantrips=new Set([names["Mage Hand"]].filter(Boolean));
   S.prepared=new Set(Object.entries(names).filter(([k,v])=>v&&k!=="Mage Hand").map(([,v])=>v));
   S.customSpells=[];S.play.hp=null;S.play.hpMax=null;S.play.hd=null;S.slotsUsed={};
   go(11);
   return {names,pre:[...S.prepared],can:[...S.cantrips]};
  });
  console.log("DATA",JSON.stringify(basics));
  const coverage=await page.evaluate(()=>{
   const counts={action:0,bonus:0,reaction:0,other:0},otherTimes=new Set(),missing=[];
   for(const sp of SPELLS){
    const time=SPELL_META[sp.n]?.time||"";
    if(!time)missing.push(sp.eng||sp.n);
    const bucket=window.PlayActionDeck5R.classify(time);
    counts[bucket]++;
    if(bucket==="other")otherTimes.add(time);
   }
   return {total:SPELLS.length,counts,missing:missing.slice(0,15),otherTimes:[...otherTimes].slice(0,40)};
  });
  console.log("ALL_2024_CASTING_TIME_COVERAGE",JSON.stringify(coverage));
  assert.equal(coverage.total,391,"391 PHB2024 canonical spells");
  for(const k of ["Shield","Misty Step","Counterspell","Healing Word","Cure Wounds","Alarm"])assert(basics.names[k],"missing canonical 2024 spell: "+k);
  const groups=await page.locator("#psActions [data-ps-action-group]").evaluateAll(es=>Object.fromEntries(es.map(e=>[e.getAttribute("data-ps-action-group"),Array.from(e.querySelectorAll(".ps-ad-card")).map(c=>c.textContent.replace(/\s+/g," ").slice(0,110))])));
  console.log("2024_GROUPS",JSON.stringify(groups));
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  function contains(bucket,name){return groups[bucket].some(s=>s.includes(name))}
  assert(contains("reaction",basics.names.Shield),"Shield reaction");
  assert(contains("reaction",basics.names.Counterspell),"Counterspell reaction");
  assert(contains("bonus",basics.names["Misty Step"]),"Misty Step bonus");
  assert(contains("bonus",basics.names["Healing Word"]),"Healing Word bonus");
  assert(contains("action",basics.names["Cure Wounds"]),"Cure Wounds action");
  assert(contains("other",basics.names.Alarm),"Alarm longer casting time");
  const card=page.locator("#psActions [data-ps-action-group=reaction] .ps-ad-card").first();
  await card.locator("summary").click();
  assert(await card.locator(".ss-entry").count()>=1,"canonical rule card used");
  assert((await card.innerText()).length>100,"full rules visible");
  await page.screenshot({path:path.join(reports,"action-deck-390.png"),fullPage:true});
  const saved=await page.evaluate(()=>({ok:saveCurrent(true),id:S.id}));
  assert(saved.ok&&saved.id,"official character save accepted");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof renderPlayStatusTab==="function");
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>go(11));
  assert(await page.locator("#psActions [data-ps-action-group=reaction] .ps-ad-card").count()>=2,"reaction spells survive save/reload");
  assert(await page.locator("#psActions [data-ps-action-group=bonus] .ps-ad-card").count()>=2,"bonus spells survive save/reload");
  for(const width of [360,480,1440]){
   await page.setViewportSize({width,height:900});
   const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,board:document.querySelector("#psActions")?.getBoundingClientRect().width}));
   assert(size.scroll<=size.inner+1,"no overflow at "+width+"px: "+JSON.stringify(size));
   if(width===1440)await page.screenshot({path:path.join(reports,"action-deck-1440.png"),fullPage:false});
  }
  const granted=await page.evaluate(()=>{
   S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="戰士");
   S.level=5;S.classLevels={[S.cls.n]:5};
   S.sp=SPECIES_2024.find(sp=>sp.n==="精靈");
   S.spChoices.eLine="高等精靈";S.spChoices.eCast="cha";
   S.cantrips=new Set();S.prepared=new Set();S.customSpells=[];S.styleCantrips2024=[];
   const source=grantedSpells2024().map(x=>x.n);
   go(11);
   return {source,shown:[...document.querySelectorAll("#psActions .ps-ad-card")].map(x=>x.innerText)};
  });
  assert(granted.source.includes(basics.names["Misty Step"]),"high elf grants Misty Step");
  assert(granted.shown.some(x=>x.includes(basics.names["Misty Step"])),"granted bonus spell appears without prepared spell");
  const noCaster=await page.evaluate(()=>{
   S.sp=null;S.spChoices={};S.level=2;S.classLevels={[S.cls.n]:2};S.cantrips.clear();S.prepared.clear();go(11);
   return document.querySelectorAll("#psActions .ps-ad-card").length;
  });
  assert.equal(noCaster,0,"noncaster without grants shows no borrowed spells");
  await page.evaluate(()=>{
   S.ruleset="2014";S.cls=CLASSES.find(c=>c.n==="法師");S.level=5;S.classLevels={[S.cls.n]:5};
   const reaction=SPELLS14.find(sp=>/盾|護盾/.test(sp.n)&&spellMetaDb()[sp.n]?.time?.includes("反應"));
   const chosen=reaction||SPELLS14.find(sp=>/盾|護盾/.test(sp.n));
   if(!chosen)throw Error("2014 shield not found");
   S.spellByClass={"法師":{cantrips:[],known:[],book:[chosen.n],prepared:[chosen.n]}};
   S.cantrips=new Set();S.prepared=new Set();S.customSpells=[];
   go(11);
  });
  const legacy=await page.locator("#psActions").innerText();
  assert(legacy.includes("2014")||legacy.includes("法術")||legacy.includes("盾"),"2014 action deck renders");
  console.log("2014_GROUPS",JSON.stringify(await page.locator("#psActions [data-ps-action-group]").evaluateAll(es=>es.map(e=>[e.dataset.psActionGroup,e.querySelectorAll(".ps-ad-card").length]))));
  assert.deepEqual(errors,[],"no client errors");
  console.log("PASS BROWSER: 2024 class-projected spell action/bonus/reaction/long, canonical full rules, 360/390/480/1440 responsive, 2014 render");
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exitCode=1});

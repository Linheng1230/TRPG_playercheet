"use strict";
const assert=require("node:assert/strict");
const crypto=require("node:crypto"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const SITE=(process.env.QA_LIVE_SITE||"https://linheng1230.github.io/TRPG_playercheet/").replace(/\/?$/,"/");
const QA_SHA=process.env.QA_EXPECTED_SHA||"";
const file=path.resolve(__dirname,"../index.html");
const sum=buf=>crypto.createHash("sha256").update(buf).digest("hex");
(async()=>{
 const local=fs.readFileSync(file);
 const response=await fetch(SITE+"index.html?live-class-qa="+encodeURIComponent(QA_SHA),{cache:"no-store"});
 assert.equal(response.status,200,"Production Pages must be reachable");
 const live=Buffer.from(await response.arrayBuffer());
 if(process.env.QA_SKIP_PARITY!=="1")assert.equal(sum(live),sum(local),"Published index.html differs from the reviewed repository version; wait for deployment, do not claim Live PASS");
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 const routes=[
  {cls:"遊俠",sub:"獵人",level:3,key:"hunterPrey"},
  {cls:"遊俠",sub:"獵人",level:7,key:"hunterDefense"},
  {cls:"野蠻人",sub:"野心之道",level:6,key:"wildAspect"},
  {cls:"法師",sub:"預言師",level:10,key:"thirdEye"}
 ];
 try{
  for(const width of [320,390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(SITE+"?qa="+encodeURIComponent(QA_SHA),{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   if(process.env.QA_SKIP_PARITY!=="1"){
    // Three verified truncation regressions: quotes inside unescaped HTML attributes
    // must not terminate the canonical tooltip before the end of its rule text.
    for(const item of [{cls:"吟遊詩人",level:20,key:"造物之言"},
                       {cls:"德魯伊",level:2,key:"荒野變身"},
                       {cls:"邪術師",level:1,key:"魔能祈喚"}]){
     const probe=await page.evaluate(({cls,level,key})=>{
      S.ruleset="2024";S.cls=CLASSES.find(c=>c.n===cls);S.level=level;S.sub=null;
      const el=document.createElement("div");
      el.innerHTML=featSpan(key,{cls,sub:"",lv:level});
      return {text:el.querySelector("[data-tip]")?.getAttribute("data-tip")||"",
              full:window.ZIZI_5R_FULL_FEATURE_RULES?.[cls+"||"+key+"|"+level]||""};
     },item);
     assert(probe.full.length>70,item.key+" canonical rule unavailable");
     assert.equal(probe.text,probe.full,item.key+" live tooltip HTML attribute truncated");
    }
   }
   for(const item of routes){
    const data=await page.evaluate(({cls,sub,level,key})=>{
     S.ruleset="2024";S.cls=CLASSES.find(c=>c.n===cls);S.level=level;
     S.sub=PROG_2024[cls].subs.findIndex(x=>x.n===sub);S.subConfirmed=true;
     S.base={str:12,dex:14,con:14,int:12,wis:16,cha:18};
     S.classChoices2024={};S.invocations=new Set();pendingSubclass=null;
     go(5);
     const select=document.querySelector('select[data-c24key="'+key+'"]');
     const details=select?.parentElement?.querySelector(".class-choice-variant-preview");
     const options=[...details?.querySelectorAll(".choice-menu-option")||[]];
     return {found:!!select,details:!!details,options:options.map(x=>x.innerText.trim()),
             before:JSON.stringify({sub:S.sub,choices:S.classChoices2024,confirmed:S.subConfirmed}),
             overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
    },item);
    assert(data.found&&data.details,item.key+" not visible on live Pages "+width);
    assert(data.options.length>=2&&data.options.every(x=>x.length>=20),item.key+" canonical rules incomplete "+width);
    await page.locator('select[data-c24key="'+item.key+'"]').locator("xpath=..").locator(".class-choice-variant-preview summary").click();
    assert(await page.locator(".class-choice-variant-preview").evaluate(el=>el.open),"Details must open by touch/click");
    const after=await page.evaluate(()=>JSON.stringify({sub:S.sub,choices:S.classChoices2024,confirmed:S.subConfirmed}));
    assert.equal(after,data.before,item.key+" preview changed selection");
    assert(data.overflow<=2,item.key+" horizontal overflow "+data.overflow+" at "+width);
    if(!process.env.CI){
     const dir=path.resolve(__dirname,"../tmp/qa-class-live");
     fs.mkdirSync(dir,{recursive:true});
     await page.screenshot({path:path.join(dir,item.key+"-"+width+".png")});
    }else{
     const dir=path.resolve(__dirname,"../tmp/qa-class-live");
     fs.mkdirSync(dir,{recursive:true});
     await page.screenshot({path:path.join(dir,item.key+"-"+width+".png")});
    }
    console.log("PUBLISHED_PREVIEW_PASS",JSON.stringify({width,key:item.key,options:data.options.length,overflow:data.overflow}));
   }
   assert.deepEqual(errors,[],"Live browser errors");
   await page.close();
  }
 }finally{await browser.close();}
 console.log("PUBLISHED_SHA256_PARITY_PASS",JSON.stringify({site:SITE,expected:sum(local),sha:QA_SHA}));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

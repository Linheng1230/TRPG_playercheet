"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {chromium}=require("playwright");
const site=String(process.env.QA_LIVE_SITE||"https://linheng1230.github.io/TRPG_playercheet/").replace(/\/?$/,"/");
const expected=String(process.env.QA_EXPECTED_SHA||"");
const root=path.resolve(__dirname,".."),out=path.join(root,"tmp","qa-subclass-semantic-live");
const hash=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
async function bytes(file){
 const r=await fetch(site+file+(file.includes("?")?"&":"?")+"qa="+expected,{cache:"no-store"});
 if(!r.ok)throw Error("LIVE_HTTP_"+r.status+" "+file);
 return Buffer.from(await r.arrayBuffer());
}
(async()=>{
 if(!/^[a-f0-9]{40}$/i.test(expected))throw Error("QA_EXPECTED_SHA_REQUIRED");
 fs.mkdirSync(out,{recursive:true});
 let verified=false,last="";
 for(let attempt=0;attempt<15;attempt++){
  try{
   const version=JSON.parse((await bytes("site-version.json")).toString("utf8"));
   assert.equal(version.sha,expected,"Published version SHA differs");
   const index=(await bytes("index.html")).toString("utf8");
   for(const asset of ["assets/subclass-preview-readability-5r.js","assets/subclass-preview-readability-5r.css"]){
    assert(index.includes(asset+"?v=20261123-a1"),"Published index missing new asset "+asset);
    const remote=await bytes(asset),local=fs.readFileSync(path.join(root,asset));
    assert.equal(hash(remote),hash(local),"Live asset hash mismatch "+asset);
   }
   verified=true;break;
  }catch(e){last=String(e);if(attempt<14)await sleep(5000);}
 }
 assert(verified,"Pages SHA / artifact readback BLOCKED: "+last);
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{
  for(const width of [320,390,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   const res=await page.goto(site+"index.html?subclass-live="+expected,{waitUntil:"networkidle"});
   assert.equal(res.status(),200);
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="野蠻人");S.level=14;
    S.sub=null;S.subConfirmed=false;pendingSubclass=null;
    S.base={str:18,dex:14,con:16,int:8,wis:12,cha:10};
    go(5);
   });
   const choices=page.locator("[data-sub-preview]");
   assert.equal(await choices.count(),4,"Four subclass comparisons must exist");
   const before=await page.evaluate(()=>JSON.stringify({sub:S.sub,confirmed:S.subConfirmed,pending:pendingSubclass,choices:S.classChoices2024}));
   await choices.first().click();
   const read=page.locator("#subclassPreview .subclass-rule-readable").first();
   await read.waitFor({state:"visible"});
   const actual=await page.evaluate(()=>{
    const block=document.querySelector("#subclassPreview .subclass-rule-readable");
    const text=block?.textContent||"",font=getComputedStyle(block?.querySelector(".subclass-rule-paragraph"));
    const normalized=v=>String(v||"").replace(/\s/gu,"");
    const prog=PROG_2024[S.cls.n],sub=prog.subs[0],first=Object.entries(sub.f).sort((a,b)=>Number(a[0])-Number(b[0]))[0];
    const feat=first[1].split("、")[0];
    const full=resolveFeatureRule2024(S.cls.n,sub.n,feat,Number(first[0]));
    return {textLen:text.length,parity:normalized(text)===normalized(full),
     type:parseFloat(font.fontSize),line:parseFloat(font.lineHeight)/parseFloat(font.fontSize),
     ink:document.querySelectorAll("#subclassPreview .sr-dice,#subclassPreview .sr-save,#subclassPreview .sr-action,#subclassPreview .sr-resource,#subclassPreview .damage-semantic").length,
     overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
     enhanced:ZIZI_SUBCLASS_READABILITY_5R.stats().active};
   });
   assert(actual.textLen>65&&actual.parity,"Canonical first feature text changed");
   assert(actual.type>=15&&actual.line>=1.7,"Unreadable long text "+JSON.stringify(actual));
   assert(actual.ink>0,"Semantic highlight absent");
   assert(actual.overflow<=2,"Horizontal overflow "+actual.overflow);
   assert(actual.enhanced,"Subclass highlighter not active");
   const after=await page.evaluate(()=>JSON.stringify({sub:S.sub,confirmed:S.subConfirmed,pending:pendingSubclass,choices:S.classChoices2024}));
   assert.equal(after,before,"Preview changed character state");
   const lastTier=page.locator("#subclassPreview .subclass-preview-tier").last();
   await lastTier.locator("summary").click();
   assert(await lastTier.evaluate(el=>el.open),"Last tier not operable");
   await lastTier.scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,"live-"+width+".png"),fullPage:false});
   assert.deepEqual(errors,[],"Browser errors on Pages");
   console.log("LIVE_SUBCLASS_READABILITY_PASS",JSON.stringify({sha:expected,width,...actual,selectionUnchanged:true}));
   await page.close();
  }
 }finally{await browser.close();}
 console.log("LIVE_SUBCLASS_SITE_SHA_PASS",expected);
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

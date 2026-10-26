"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,"assets/data/feature-override-manifest.json"),"utf8"));
 assert(Array.isArray(manifest.overrides),"manifest.overrides missing");
 const by=new Map(manifest.overrides.map(x=>[x.key,x]));
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(URL+"?override-provenance=1",{waitUntil:"networkidle"});
  const runtime=await page.evaluate(()=>({
    overrideKeys:Object.keys(window.ZIZI_5R_FEATURE_OVERRIDES||{}),
    canonicalKeys:Object.keys(window.ZIZI_5R_FULL_FEATURE_RULES||{})
  }));
  const failures=[];
  if(errors.length)failures.push(...errors.map(error=>({kind:"page-error",error})));
  const allowed=new Set(["redundant_exact","canonical_level_fallback","manual_exception"]);
  for(const key of runtime.overrideKeys){
    const row=by.get(key);
    if(!row){failures.push({kind:"missing-manifest",key});continue}
    if(!allowed.has(row.status))failures.push({kind:"bad-status",key,status:row.status});
    if(!String(row.reason||"").trim())failures.push({kind:"missing-reason",key});
    if(!String(row.source||"").trim())failures.push({kind:"missing-source",key});
    if(row.status==="manual_exception"){
      const silent=runtime.canonicalKeys.filter(k=>k.startsWith(key+"|"));
      if(silent.length)failures.push({kind:"manual-canonical-collision",key,canonical:silent});
    }
  }
  for(const key of by.keys())if(!runtime.overrideKeys.includes(key))failures.push({kind:"stale-manifest-entry",key});
  const counts={};for(const r of manifest.overrides)counts[r.status]=(counts[r.status]||0)+1;
  console.log(JSON.stringify({runtimeOverrides:runtime.overrideKeys.length,manifest:manifest.overrides.length,counts,failures,failureCount:failures.length},null,2));
  assert.equal(failures.length,0,"override provenance failures="+failures.length);
 }finally{if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert"),{chromium}=require("playwright");
const ROOT=path.resolve(__dirname,".."),URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{let b;try{
 b=await chromium.launch({headless:true,channel:"chrome"});const p=await b.newPage();
 await p.goto(URL+"?no-overrides=1",{waitUntil:"networkidle"});
 const o=await p.evaluate(()=>({global:typeof window.ZIZI_5R_FEATURE_OVERRIDES,scripts:[...document.scripts].map(s=>s.src),full:Object.keys(window.ZIZI_5R_FULL_FEATURE_RULES||{}).length,resolver:typeof window.resolveFeatureRule2024}));
 const prov=JSON.parse(fs.readFileSync(path.join(ROOT,"assets/data/feature-5r-manual-provenance.json"),"utf8"));
 const fail=[];if(o.global!=="undefined")fail.push("override global exists");if(o.scripts.some(x=>x.includes("feature-5r-overrides.js")))fail.push("override script loaded");if(o.resolver!=="function")fail.push("resolver missing");if(o.full<396)fail.push("canonical map too small");if((prov.migratedRuntimeDependencies||[]).length!==11)fail.push("provenance count");
 console.log(JSON.stringify({o,provenance:(prov.migratedRuntimeDependencies||[]).length,fail,failureCount:fail.length},null,2));assert.equal(fail.length,0);
}finally{if(b)await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
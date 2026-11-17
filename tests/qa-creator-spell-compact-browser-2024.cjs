"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const base=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.CI?undefined:"chrome"});
 const results=[];
 try{
  for(const width of [320,390,1440]){
   const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844},isMobile:width<600,hasTouch:width<600});
   const p=await ctx.newPage();
   const errors=[];
   p.on("pageerror",e=>errors.push(e.message));
   await p.goto(base+"?qa-creator-compact-color="+width,{waitUntil:"networkidle",timeout:45000});
   const result=await p.evaluate(()=>{
    const view=globalThis.ZIZI_CREATOR_SPELL_PREVIEW_2024,spellBody=document.querySelector("#spellBody");
    if(!view||!spellBody)return {error:"creator preview helper/root missing"};
    const wrapper=document.createElement("div");wrapper.className="creator-spell-card";
    const sd=document.createElement("span");sd.className="sd";wrapper.append(sd);spellBody.append(wrapper);
    const probe="<img src=x onerror=alert(1)> 優勢 劣勢 豁免 主要動作 附贈動作 反應 儀式 專注 2d6 火焰";
    view.appendEmphasis(sd,probe);
    const kinds=["advantage","disadvantage","save","main","bonus","reaction","ritual","concentration","numeric","damage"];
    const tokens={};
    for(const k of kinds){
      const x=sd.querySelector(".creator-semantic-"+k),css=x?getComputedStyle(x):null;
      tokens[k]={present:!!x,text:x?.textContent,color:css?.color,background:css?.backgroundColor};
    }
    const unsafe=sd.querySelector("img,script,iframe")!==null;
    const escaped=sd.textContent===probe;
    const f=document.createElement("div");wrapper.append(f);
    view.renderCompact(f,"觸碰一名生物，使其獲得優勢；造成2d6火焰傷害；5級3d6、11級4d6、17級5d6；豁免失敗時持續受到傷害，目標每回合結束可以重複豁免，成功時效果提前結束，不能因摘要省略限制與解除條件。".repeat(3));
    const first=f.querySelector(".creator-preview-lead")?.textContent||"";
    const n=[...f.querySelectorAll(".creator-preview-value")].map(x=>x.textContent);
    const hint=f.querySelector(".creator-preview-details-hint")?.textContent||"";
    wrapper.remove();
    return {tokens,unsafe,escaped,first,n,hint};
   });
   if(result.error)throw Error(result.error);
   assert.equal(result.unsafe,false,"Unsafe HTML evaluated");
   assert.equal(result.escaped,true,"Rule text was not preserved as plain text");
   for(const [kind,v] of Object.entries(result.tokens)){
    assert(v.present,"Missing semantic highlight "+kind);
    assert(v.color&&v.background&&!/(transparent|rgba\(0, 0, 0, 0\))/.test(v.background),"No accessible color/band for "+kind);
   }
   assert(result.first.includes("優勢"),"Main sentence changed");
   for(const token of ["2d6","5級","3d6","11級","4d6","17級","5d6"])
    assert((result.first+" "+result.n.join(" ")).includes(token),"Compact numeric summary hides "+token);
   assert(result.hint.includes("完整說明"),"Missing disclosure that details remain available");
   assert.deepEqual(errors,[],"Browser JS error");
   results.push({width,status:"PASS",highlightKinds:Object.keys(result.tokens).length});
   await ctx.close();
  }
 }finally{await browser.close()}
 console.log("COMPACT_COLOR_BROWSER_QA",JSON.stringify(results));
})().catch(e=>{console.error("COMPACT_COLOR_BROWSER_QA_FAIL",e.stack);process.exitCode=1});

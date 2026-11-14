"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const url=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(url,{waitUntil:"domcontentloaded"});
   const result=await page.evaluate(async()=>{
    const targets=["spellBody","finalSheet","playStatusBody","srefBody","spellTip"];
    const sample="1d12毒素傷害、1d8 火焰傷害、2d6 寒冷、1d10閃電、3d6 心靈傷害。火焰球和寒冷天氣不是傷害。";
    const entries=targets.map(id=>{
     const el=document.createElement("div");el.dataset.damageQa=id;el.textContent=sample;
     document.getElementById(id).appendChild(el);return {id,el};
    });
    await new Promise(r=>setTimeout(r,150));
    const items=entries.map(({id,el})=>({
     id,unchanged:el.textContent===sample,
     colored:[...el.querySelectorAll(".damage-semantic")].map(x=>({type:x.dataset.damageType,text:x.textContent,weight:getComputedStyle(x).fontWeight,border:getComputedStyle(x).borderBottomWidth})),
     labels:el.textContent
    }));
    entries.forEach(x=>x.el.remove());
    return {items,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   const expectTypes=["poison","fire","cold","lightning","psychic"];
   for(const x of result.items){
    assert(x.unchanged,x.id+" changed underlying text");
    assert.deepEqual(x.colored.map(v=>v.type),expectTypes,width+" "+x.id+" missing colors");
    assert(x.colored.every(v=>v.border==="2px" && Number(v.weight)>=700),width+" "+x.id+" not visibly colored");
   }
   assert(result.overflow<=2,width+" horizontal overflow");
   assert(!errors.length,"browser errors "+JSON.stringify(errors));
   console.log("PASS",width,result.items.map(x=>x.id).join(","),"5 types visible and text invariant");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
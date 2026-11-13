"use strict";
const assert=require("assert"),{chromium}=require("playwright");
(async()=>{
const b=await chromium.launch({headless:true,channel:"chrome"});const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on("pageerror",e=>errors.push(e.message));
try{
await p.goto(process.env.QA_URL||"http://127.0.0.1:18948/index.html",{waitUntil:"networkidle"});
await p.evaluate(()=>{document.querySelector("#rulesetModal")?.classList.remove("open");S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="法師");S.classLevels={"法師":8};S.level=8;S.asiByClass={};S.base={str:10,dex:14,con:13,int:15,wis:12,cha:15};featImportSlotKey="";refTab="gfeat";go(8);document.querySelectorAll('#refTabs [data-r]').forEach(x=>x.classList.toggle("active",x.dataset.r==="gfeat"))});
assert.equal(await p.locator('[data-feat-import-slot]').count(),2,"2014 supports 2 ASI slots");
await p.locator('[data-gfeat-id="演員"] [data-feat-import]').click();
assert.equal(await p.evaluate(()=>Object.keys(S.asiByClass).length),0,"no implicit selection when multiple slots");
await p.locator('[data-feat-import-slot="法師|8"]').click();
await p.locator('[data-gfeat-id="演員"] [data-feat-import]').click();
assert.equal(await p.evaluate(()=>S.asiByClass["法師"]?.[8]?.feat),"演員","2014 feat assigned level 8");
assert.equal(await p.evaluate(()=>S.asiByClass["法師"]?.[4]),undefined,"level 4 untouched");
await p.locator('[data-feat-browse="4"]').click();
assert.equal(await p.evaluate(()=>featImportSelectedSlot()?.lv),4,"reverse link selects level 4");
await p.locator('[data-gfeat-id="演員"] [data-feat-import]').click();
assert.equal(await p.evaluate(()=>S.asiByClass["法師"]?.[4]),undefined,"2014 duplicate blocked");
const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
assert(overflow<=1,"2014 mobile no horizontal scroll");
assert.deepStrictEqual(errors,[]);
console.log("PASS 2014 multiple ASI slots, explicit target, duplicate guard, reverse shortcut");
}finally{await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});

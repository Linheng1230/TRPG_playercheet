"use strict";
const {chromium}=require("playwright"),assert=require("assert");
const url=process.env.QA_URL||"http://127.0.0.1:18952/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [390,1440]){
   const p=await browser.newPage({viewport:{width,height:844}}),errors=[];
   p.on("pageerror",e=>errors.push(e.message));
   const response=await p.goto(url,{waitUntil:"domcontentloaded"});
   assert.strictEqual(response?.status(),200,"creator test page must be served successfully");
   await p.waitForFunction(()=>typeof window.resetState==="function"&&typeof window.go==="function",{timeout:20000});
   await p.waitForTimeout(350); // boot schedules first-visit ruleset modal asynchronously
   await p.evaluate(()=>{document.querySelector("#rulesetModal")?.classList.remove("open");resetState();go(0);renderClasses();});
   assert.equal(await p.locator("[data-step='0'] .class-confirm-controls .btn-next").isDisabled(),true);
   await p.locator('[data-class-name="法師"]').click();
   assert.equal(await p.evaluate(()=>S.cls),null,"tap must not commit");
   assert((await p.locator("[data-step='0'] .class-confirm-controls").innerText()).includes("確認後將無法修改"));
   p.once("dialog",d=>{assert(d.message().includes("確認後將無法修改"));return d.dismiss()});
   await p.locator("[data-step='0'] .class-confirm-controls button").click();
   assert.equal(await p.evaluate(()=>S.cls),null,"cancel must leave pending");
   p.once("dialog",d=>d.accept());
   await p.locator("[data-step='0'] .class-confirm-controls button").click();
   assert.deepStrictEqual(await p.evaluate(()=>({name:S.cls.n,locked:S.classConfirmed})),{name:"法師",locked:true},"confirmed");
   assert((await p.locator("[data-step='0'] .class-confirm-controls").innerText()).includes("無法修改"));
   assert.equal(await p.locator("[data-step='0'] .class-confirm-controls button").count(),0,"no modify class button");
   await p.locator('[data-class-name="德魯伊"]').click();
   assert.equal(await p.evaluate(()=>S.cls.n),"法師","cannot change locked class");
   const save=await p.evaluate(()=>{S.level=4;S.classLevels={"法師":4};saveCurrent(true);return JSON.parse(JSON.stringify(serialize()))});
   assert.equal(save.classConfirmed,true);
   await p.reload({waitUntil:"networkidle"});
   assert.deepStrictEqual(await p.evaluate(()=>({name:S.cls?.n,locked:S.classConfirmed,level:S.level})),{name:"法師",locked:true,level:4},"fresh reload");
   assert.equal(await p.locator("[data-step='0'] .class-confirm-controls button").count(),0,"fresh reload must not ask confirmation");
   const legacy=JSON.parse(JSON.stringify(save));delete legacy.classConfirmed;
   await p.evaluate(x=>{deserialize(x);refreshAll()},legacy);
   assert.equal(await p.evaluate(()=>S.classConfirmed),true,"legacy existing class auto-confirmed");
   assert.equal(await p.locator("[data-step='0'] .class-confirm-controls button").count(),0);
   const pending=JSON.parse(JSON.stringify(save));pending.classConfirmed=false;
   await p.evaluate(x=>{deserialize(x);refreshAll()},pending);
   assert.equal(await p.evaluate(()=>S.classConfirmed),false,"explicit pending remains pending");
   assert.equal(await p.locator("[data-step='0'] .class-confirm-controls button").count(),1);
   assert((await p.locator("[data-step='0'] .class-confirm-controls").innerText()).includes("確認後將無法修改"));
   assert((await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);
   assert.deepStrictEqual(errors,[]);
   console.log("PASS CLASS CONFIRM "+width+" cancel/confirm/lock/oldsave/pending/fresh-reload");
   await p.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

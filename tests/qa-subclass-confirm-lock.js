"use strict";
const {chromium}=require("playwright"),assert=require("assert");
(async()=>{const b=await chromium.launch({headless:true,channel:"chrome"});try{
for(const width of [390,1440]){
const p=await b.newPage({viewport:{width,height:844}}),errs=[];p.on("pageerror",e=>errs.push(e.message));
await p.goto(process.env.QA_URL||"http://127.0.0.1:18945/index.html",{waitUntil:"networkidle"});
   await p.waitForTimeout(350); // boot schedules first-visit ruleset modal asynchronously
await p.evaluate(()=>{document.querySelector("#rulesetModal")?.classList.remove("open");S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");S.level=3;S.classLevels={"戰士":3};S.sub=null;S.subConfirmed=false;pendingSubclass=null;go(5);renderLevel()});
const candidates=p.locator("#subGrid [data-sub]");
assert(await candidates.count()>=2);
await candidates.nth(0).click();
assert.equal(await p.evaluate(()=>S.sub),null,"selection must be pending until confirmed");
assert(await p.locator("#confirmSubclass").isEnabled(),"confirmation button");
p.once("dialog",async d=>{assert(d.message().includes("無法修改"));await d.dismiss()});
await p.locator("#confirmSubclass").click();
assert.equal(await p.evaluate(()=>S.sub),null,"cancel must not commit");
p.once("dialog",async d=>{assert(d.message().includes("無法修改"));await d.accept()});
await p.locator("#confirmSubclass").click();
assert.equal(await p.evaluate(()=>S.subConfirmed),true,"confirmed flag");
assert.equal(await p.evaluate(()=>S.sub),0,"committed subclass");
assert.equal(await p.locator("#confirmSubclass").count(),0,"confirm hidden after lock");
assert(await p.locator("#subGrid [data-sub]").first().isDisabled(),"choice disabled after lock");
const saved=await p.evaluate(()=>JSON.parse(JSON.stringify(serialize())));
assert.equal(saved.subConfirmed,true,"lock stored");
await p.evaluate(save=>{deserialize(save);go(5);renderLevel()},saved);
assert.equal(await p.evaluate(()=>S.subConfirmed),true,"lock persisted");
assert(await p.locator("#subGrid [data-sub]").nth(1).isDisabled(),"reloaded lock preserved");
const legacy=JSON.parse(JSON.stringify(saved));delete legacy.subConfirmed;
await p.evaluate(save=>{deserialize(save);go(5);renderLevel()},legacy);
assert.equal(await p.evaluate(()=>S.subConfirmed),false,"legacy has not been forcibly locked");
assert.equal(await p.locator("#confirmSubclass").count(),1,"legacy allows confirming");
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,"no horizontal overflow");
assert.deepStrictEqual(errs,[]);
console.log("PASS subclass-confirm browser width="+width+" cancel/confirm/lock/persistence/legacy/mobile");
await p.close()
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

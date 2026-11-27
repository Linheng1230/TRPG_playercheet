
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const BASE=(process.env.QA_BASE||"http://127.0.0.1:18791/").replace(/\/?$/,"/");
const out=process.env.QA_OUT||path.join(require("node:os").tmpdir(),"trpg-creator-unlock-human-path");
fs.mkdirSync(out,{recursive:true});
const results=[];
const lock=(p,k)=>p.locator('.step-panel.active [data-creator-unlock="'+k+'"]');
const snap=async p=>p.evaluate(()=>{const o=serialize();delete o.ts;return o;});
async function dialog(p,loc,accept,isUnlock=false){
 let message="";
 p.once("dialog",d=>{message=d.message();return accept?d.accept():d.dismiss()});
 await loc.click();
 if(isUnlock){assert(message.includes("DM")&&message.includes("不可任意更換")&&message.includes("修正誤選"),message);}
 else assert(message.includes("確認"),message);
}
async function undo(p,k,check,selector=null){
 const el=selector?p.locator(selector):lock(p,k).first();
 if(!await el.isVisible()){console.log("UNLOCK_DIAG",JSON.stringify(await p.evaluate(()=>({url:location.href,helper:typeof addCreatorUnlock,render:renderLanguages.toString().includes("addCreatorUnlock"),errors:window.__unlockErrors,step:S.step,locks:S.languageLocks,active:document.querySelector(".step-panel.active")?.dataset.step,controls:[...document.querySelectorAll("[data-creator-unlock]")].map(x=>({k:x.dataset.creatorUnlock,label:x.getAttribute("aria-label"),visible:!!x.getClientRects().length})),language:document.getElementById("languageChoices")?.outerHTML.slice(0,5000)}))));}assert(await el.isVisible(),"visible "+k);
 const pre=await snap(p);
 await dialog(p,el,false,true);assert.deepEqual(await snap(p),pre,k+" cancel must not mutate state");
 await dialog(p,el,true,true);
 await check();
 const post=await snap(p);
 for(const field of ["id","level","meta","bio","portrait","rolled","customSpells"]){assert.deepEqual(post[field],pre[field],k+" preserve "+field)}
 assert(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=2,k+" no horizontal overflow");
 results.push(k+" cancel/accept/preserve");
}
async function go(p,n){
 const order=[0,1,2,3,4,5,6,14];
 const nav=p.locator('#stepNav .nav-secondary button').nth(order.indexOf(n));
 assert(await nav.isVisible(),"visible creator step "+n);await nav.click();
 assert.equal(await p.locator('.step-panel.active').getAttribute('data-step'),String(n));
}
async function origin(p){
 await p.locator('#bgGrid .pick-card').filter({hasText:"士兵"}).first().click();
 if(await p.locator("[data-bg24tool]").count())await p.locator("[data-bg24tool]").selectOption({index:1});
 await dialog(p,p.locator(".confirm-bg button.btn-next"),true);
 await p.locator('#spGrid .pick-card').filter({hasText:"精靈"}).first().click();
 await p.locator('[data-spch="eSkill"]').selectOption("求生");
 await p.locator('[data-spch="eLine"]').selectOption("卓爾");
 await p.locator('[data-spch="eCast"]').selectOption("wis");
 await dialog(p,p.locator("[data-confirm-species-choices]"),true);
 await dialog(p,p.locator(".confirm-sp button.btn-next"),true);
}
async function skillConfirm(p){
 const b=p.locator(".confirm-skills button.btn-next");
 for(let i=0;i<12&&!await b.isEnabled();i++){
  const c=p.locator('#skillGrid button.skill-chip:not(.fixed):not(.selected):not(:disabled)').first();
  if(!await c.count())break;
  await c.click();
 }
 assert(await b.isEnabled(),"skills ready");
 await dialog(p,b,true);
}
async function init(p){
 await p.goto(BASE+"home.html?unlock=real-path",{waitUntil:"domcontentloaded"});
 await p.locator('a[href="./index.html?view=creator"]:visible').first().click();
 await p.waitForURL(/index\.html/);
 await p.waitForFunction(()=>typeof resetState==="function");console.log("BOOT", await p.evaluate(()=>({url:location.href,helper:typeof addCreatorUnlock,src:renderLanguages.toString().includes("addCreatorUnlock")})));
 await p.waitForTimeout(350);
 if(await p.locator("#rulesetModal.open").count())await p.locator('[data-ruleset="2024"]').click();
 await p.locator('[data-class-name="野蠻人"]').click();
 await dialog(p,p.locator(".step-panel.active .class-confirm-controls button.btn-next"),true);
 await p.locator("#next0").click();
 await origin(p);
 await p.locator("#next1").click();
 // Real one-time dice roll; preserve results across unlock and reload.
 await p.locator('#methodTabs [data-m="roll"]').click();
 await p.locator("#rollBtn").click();
 const roll=await p.evaluate(()=>[...S.rolled]);assert.equal(roll.length,6);
 for(const [i,key] of ["str","dex","con","int","wis","cha"].entries())await p.locator('#abilityGrid [data-ab="'+key+'"]').selectOption(String(roll[i]));
 await p.locator('[data-bk="b2"]').selectOption("str");
 await p.locator('[data-bk="b1"]').selectOption("con");
 await dialog(p,p.locator("#confirmAbilities"),true);
 await p.locator("#next2").click();
 await skillConfirm(p);
 await p.locator("#next3").click();
 await p.locator("#fName").fill("QA 修正角色");
 await p.locator('[data-language="base1"]').selectOption("龍語");
 await p.locator('[data-language="base2"]').selectOption("矮人語");
 await dialog(p,p.locator("#confirmLanguages"),true);
 await p.waitForTimeout(1000);
}
(async()=>{
 const b=await chromium.launch({args:["--no-proxy-server"],headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});
 try{
  for(const width of [390,1440]){
   const p=await b.newPage({viewport:{width,height:844},isMobile:width===390,hasTouch:width===390});
   const errors=[];p.on("pageerror",e=>{errors.push(e.message);console.log("PAGE_ERROR",e.message)});
   await init(p);
   // Per-language unlock must not touch other slot.
   await undo(p,"language",async()=>{
     assert(await p.locator('[data-language="base1"]').isEnabled());
     assert(await p.locator('[data-language="base2"]').isDisabled());
     assert(await p.locator("#next4").isDisabled());
   },'.row:has([data-language="base1"]) [data-creator-unlock="language"]');
   await p.locator('[data-language="base1"]').selectOption("精靈語");
   await dialog(p,p.locator("#confirmLanguages"),true);
   assert(await p.locator('[data-language="base1"]').isDisabled());
   await go(p,2);
   const rolled=await p.evaluate(()=>[...S.rolled]);
   await undo(p,"abilities",async()=>{
     assert(await p.locator("#rollBtn").isDisabled());
     assert(await p.locator('[data-ab="str"]').isEnabled());
     assert(await p.locator("#next2").isDisabled());
   });
   assert.deepEqual(await p.evaluate(()=>[...S.rolled]),rolled);
   await p.reload({waitUntil:"domcontentloaded"});await p.waitForTimeout(500);
   await go(p,2);
   assert.equal(await p.evaluate(()=>S.abilitiesConfirmed),false);
   assert(await p.locator("#rollBtn").isDisabled());
   await dialog(p,p.locator("#confirmAbilities"),true);
   await go(p,3);
   await undo(p,"skills",async()=>assert.equal(await p.evaluate(()=>S.skillsConfirmed),false));
   await skillConfirm(p);
   await go(p,1);
   await undo(p,"bg",async()=>{
    const st=await p.evaluate(()=>({bg:S.bgConfirmed,sp:S.spConfirmed,ab:S.abilitiesConfirmed,skills:S.skillsConfirmed}));assert.deepEqual(st,{bg:false,sp:true,ab:false,skills:false});
    assert(await p.locator("#bgGrid .pick-card").first().isEnabled());
   });
   await dialog(p,p.locator(".confirm-bg button.btn-next"),true);
   await undo(p,"species",async()=>{
    assert(await p.locator('[data-spch="eLine"]').isEnabled());
    assert.equal(await p.evaluate(()=>S.spConfirmed||S.speciesChoicesConfirmed),false);
   });
   await p.locator('[data-spch="eCast"]').selectOption("cha");
   await dialog(p,p.locator("[data-confirm-species-choices]"),true);
   await dialog(p,p.locator(".confirm-sp button.btn-next"),true);
   await undo(p,"sp",async()=>assert.equal(await p.evaluate(()=>S.spConfirmed),false));
   await dialog(p,p.locator("[data-confirm-species-choices]"),true);
   await dialog(p,p.locator(".confirm-sp button.btn-next"),true);
   await go(p,2);await dialog(p,p.locator("#confirmAbilities"),true);
   await go(p,3);await skillConfirm(p);
   // Real upgrade, selection and confirmation controls; no fixture injection.
   await go(p,5);
   for(let i=1;i<19;i++)await p.locator('#lvUp').click();
   assert.equal(await p.evaluate(()=>S.level),19);
   await p.locator('#subGrid [data-sub]').first().click();
   await dialog(p,p.locator('#confirmSubclass'),true);
   await p.locator('#primalSel').selectOption({index:1});
   await dialog(p,p.locator('#confirmPrimalSkill'),true);
   const f4=p.locator('.asi-block[data-asilv="4"]');
   await f4.locator('[data-role="t"]').selectOption('feat');
   const feat=await p.evaluate(()=>{const pool=GFEATS.filter(x=>!featImportReason(x,{className:S.cls.n,lv:4}));return (pool.find(x=>x.id==="durable")||pool.find(x=>!x.ab)||pool[0]).n});
   await f4.locator('[data-role="feat"]').selectOption(feat);
   if(await f4.locator('[data-role="featAb"]').count())await f4.locator('[data-role="featAb"]').selectOption({index:1});
   await dialog(p,p.locator('[data-confirm-feat="4"]'),true);
   const boon=await p.evaluate(()=>BOONS.find(f=>f.id==="boon-of-speed").n);
   await p.locator('#boonInput').selectOption(boon);
   if(await p.locator('#boonAbSel').count())await p.locator('#boonAbSel').selectOption({index:1});
   await dialog(p,p.locator('#confirmBoon'),true);
   await undo(p,"sub",async()=>{assert(await p.locator("#confirmSubclass").isVisible());assert(await p.locator("#subGrid [data-sub]").first().isEnabled())});
   await dialog(p,p.locator("#confirmSubclass"),true);
   await undo(p,"primal",async()=>assert(await p.locator("#primalSel").isEnabled()));
   await dialog(p,p.locator("#confirmPrimalSkill"),true);
   await undo(p,"feat",async()=>assert(await p.locator('.asi-block[data-asilv="4"] select[data-role="feat"]').isEnabled()));
   await dialog(p,p.locator('[data-confirm-feat="4"]'),true);
   await undo(p,"boon",async()=>assert(await p.locator("#boonInput").isEnabled()));
   await dialog(p,p.locator("#confirmBoon"),true);
   const identity=await snap(p);
   await go(p,0);
   await undo(p,"class",async()=>assert.equal(await p.evaluate(()=>S.classConfirmed),false));
   await p.locator('[data-class-name="戰士"]').click();
   await dialog(p,p.locator(".step-panel.active .class-confirm-controls button.btn-next"),true);
   const a=await p.evaluate(()=>({id:S.id,cls:S.cls.n,level:S.level,story:S.bio.story,gear:S.gear.items,rolled:S.rolled,locked:S.classConfirmed,sub:S.sub}));
   assert.equal(a.cls,"戰士");assert.equal(a.level,19);assert.equal(a.story,identity.bio.story);assert.equal(a.gear,identity.gear.items);assert.deepEqual(a.rolled,rolled);assert(a.locked);assert.equal(a.sub,null);
   await p.screenshot({path:path.join(out,"class-"+width+".png"),fullPage:false});
   assert.deepEqual(errors,[]);results.push("2024 "+width+" complete");
   await p.close();
  }
  console.log(JSON.stringify({pass:true,results}));
  fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({pass:true,results},null,2));
 }catch(e){fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({pass:false,results,error:e.stack},null,2));throw e}
 finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

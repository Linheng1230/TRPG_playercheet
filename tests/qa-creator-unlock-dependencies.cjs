
"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const BASE=(process.env.QA_BASE||"http://127.0.0.1:18791/").replace(/\/?$/,"/");
const out=process.env.QA_OUT||path.join(require("node:os").tmpdir(),"trpg-creator-unlock-qa");
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
 // Use the actual secondary navigation button if visible; test setup may select the step directly.
 const btn=p.locator(".nav-secondary button").filter({hasText:new RegExp(n===0?"職業":n===1?"種族／背景":n===2?"屬性":n===3?"技能":n===4?"詳情":n===5?"升級":"^$")});
 if(await btn.count()===1&&await btn.isVisible()){await btn.click();if(await p.locator(".step-panel.active").getAttribute("data-step")==String(n))return;}
 await p.evaluate(n=>go(n),n);
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
 const resp=await p.goto(BASE+"index.html?unlock=preview-v3",{waitUntil:"domcontentloaded"}); const html=await resp.text(); console.log("RESPONSE",resp.url(),html.length,html.includes("function addCreatorUnlock")); assert(html.includes("function addCreatorUnlock"),"wrong HTML served");
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
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await init(p);
 await p.evaluate(()=>{
 S.level=4;S.classLevels={[S.cls.n]:4};S.method="custom";S.base={str:15,dex:14,con:13,int:10,wis:10,cha:14};
 S.asi={4:{t:"feat",feat:GFEATS.find(f=>f.id==="actor").n,featAb:"cha"}};
 S.featConfirmed={[featConfirmKey(S.cls.n,4)]:S.asi[4].feat};
 S.abilitiesConfirmed=true;go(2);renderMethod();renderBonus();update();saveCurrent(true);
 });
 assert(await p.evaluate(()=>featIsConfirmed(S.cls.n,4)));
 await undo(p,"abilities",async()=>assert(await p.locator('[data-abn="cha"]').isEnabled()));
 await p.locator('[data-abn="cha"]').fill("8"); await p.locator('[data-abn="cha"]').press("Tab"); await p.waitForTimeout(100);
 await dialog(p,p.locator("#confirmAbilities"),true);
 assert.equal(await p.evaluate(()=>featIsConfirmed(S.cls.n,4)),false);
 assert.equal(await p.evaluate(()=>S.asi[4].feat),await p.evaluate(()=>GFEATS.find(f=>f.id==="actor").n));
 await go(p,5);assert(await p.locator("#next5").isDisabled());
 console.log("PASS invalid dependent feat unlocks without deleting selected draft; next step guarded");
 // Legacy multiclass test uses synthetic data only for an already-created character.
 await p.evaluate(()=>{
 S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");S.classConfirmed=true;S.skillsConfirmed=true;
 S.level=7;S.classLevels={[S.cls.n]:4,["法師"]:3};S.base={str:15,dex:14,con:13,int:15,wis:12,cha:14};
 S.classSubs={["法師"]:0};S.spellByClass={["法師"]:{cantrips:["QA"]}};S.asiByClass={};
 S.startGear14={mode:"kit"};go(0);renderClasses();update();
 });
 const before=await p.evaluate(()=>({id:S.id,level:S.level,subs:JSON.stringify(S.classSubs),spells:JSON.stringify(S.spellByClass)}));
 await undo(p,"class",async()=>assert.equal(await p.evaluate(()=>S.classConfirmed),false));
 await p.locator('[data-class-name="野蠻人"]').click();
 await dialog(p,p.locator(".step-panel.active .class-confirm-controls button.btn-next"),true);
 const after=await p.evaluate(()=>({id:S.id,level:S.level,levels:S.classLevels,subs:JSON.stringify(S.classSubs),spells:JSON.stringify(S.spellByClass)}));
 assert.equal(after.id,before.id);assert.equal(after.level,7);
 assert.equal(after.levels["野蠻人"],4);assert.equal(after.levels["法師"],3);assert.equal(after.subs,before.subs);assert.equal(after.spells,before.spells);
 console.log("PASS 2014 initial class correction preserves secondary class level, subclass and spell state");
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

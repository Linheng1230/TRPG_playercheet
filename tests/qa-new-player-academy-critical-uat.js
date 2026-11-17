"use strict";
/* 90 isolated critical A06/A07/A08/A10/A11 acceptance QA against clean candidate.
   Does not write Creator state on disk outside browser's fresh ephemeral context. */
const {chromium}=require("playwright");
const fs=require("fs");
const BASE=(process.env.QA_URL||"http://127.0.0.1:18766/index.html").replace(/index\.html(?:\?.*)?$/,"");
const OUT=process.env.QA_ACADEMY_CRITICAL_REPORT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/new-player-90/a-critical-qa.json";
const results=[],details=[];
async function mark(id,fn){
 try{const d=await fn();results.push({id,status:"PASS",detail:d});return true}
 catch(e){results.push({id,status:"FAIL",error:String(e.stack||e)});return false}
}
const assert=(ok,msg)=>{if(!ok)throw Error(msg)};
const errors=[];let browser;
async function initPage(context){
 const p=await context.newPage();
 p.on("pageerror",e=>errors.push(e.message));
 await p.goto(BASE+"index.html?view=creator",{waitUntil:"networkidle"});
 const close=p.locator("#closeRuleset");
 if(await close.isVisible())await close.click();
 return p;
}
async function seed(page,ruleset,confirmed){
 return page.evaluate(({ruleset,confirmed})=>{
  resetAll();
  S.ruleset=ruleset;syncRulesetUI();
  S.cls=CLASSES.find(c=>c.n==="法師");
  S.classLevels={"法師":3};S.level=3;S.classConfirmed=confirmed;
  S.gear=Object.assign({},S.gear,{items:"QA 任務道具｜保留",gold:{pp:0,gp:50,sp:0,cp:0}});
  S.spellbook=new Set([SPELLS.find(x=>x.lv===1&&x.cls.includes("W"))?.n||"魔法飛彈"]);
  S.id=newId();
  const saved=saveCurrent(true);
  return {saved,id:S.id,cls:S.cls.n,confirmed:S.classConfirmed,spellbook:[...S.spellbook],items:S.gear.items,
   ruleset:S.ruleset,meta:serialize().meta};
 },{ruleset,confirmed});
}
(async()=>{
 browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  await mark("A07_unconfirmed_class_reload_does_not_auto_confirm",async()=>{
   const ctx=await browser.newContext({viewport:{width:1440,height:900}});
   const p=await initPage(ctx);
   const before=await seed(p,"2024",false);assert(before.saved!==false,"saveCurrent failed");
   await p.reload({waitUntil:"networkidle"});
   const after=await p.evaluate(()=>({cls:S.cls?.n,confirmed:S.classConfirmed,saved:serialize().classConfirmed}));
   assert(after.cls==="法師"&&!after.confirmed&&!after.saved,"stored unconfirmed class incorrectly confirmed");
   await ctx.close();return {before,after};
  });
  await mark("A06_confirmed_existing_character_not_overwritten_by_quiz",async()=>{
   const ctx=await browser.newContext({viewport:{width:1440,height:900}});
   const p=await initPage(ctx);
   const before=await seed(p,"2024",true);assert(before.saved!==false,"save failed");
   await p.goto(BASE+"academy.html?step=quiz.intro",{waitUntil:"networkidle"});
   await p.locator("#academyQuiz").click();
   for(let n=0;n<10;n++){
     await p.locator(".academy-choice").first().click();
     await p.locator(".academy-nav button").filter({hasText:n===9?"查看三組推薦":"下一題"}).click();
   }
   const suggested=await p.locator("#academyResult1 h3").innerText();
   await p.locator("#academyResult1 [data-action=academy-start-class]").click();
   await p.waitForURL(/index\.html\?view=creator/);
   const after=await p.evaluate(()=>({cls:S.cls?.n,confirmed:S.classConfirmed,
     items:S.gear.items,spellbook:[...S.spellbook],ruleset:S.ruleset,
     banner:document.getElementById("academyRecommendedClass")?.innerText||"",
     confirmCtrl:document.querySelector('.step-panel[data-step="0"] > .class-confirm-controls')?.innerText||"",
     availableModifyButtons:[...document.querySelectorAll("button")].filter(x=>/修改職業/.test(x.innerText)).length}));
   assert(suggested!=="法師","test profile must recommend a different class");
   assert(after.cls===before.cls&&after.confirmed===true,"Existing confirmed class was overwritten/unlocked");
   assert(after.items===before.items,"Existing gear lost");
   assert(JSON.stringify(after.spellbook)===JSON.stringify(before.spellbook),"Existing spells changed");
   assert(after.ruleset==="2024","edition changed");
   assert(after.banner.includes(suggested),"recommended hint not visible");
   assert(!after.banner.includes("修改職業")&&after.banner.includes("新建角色"),"misleading recommendation for confirmed class");
   await ctx.close();return {suggested,before,after};
  });
  await mark("A08_2014_saved_character_isolated_after_academy",async()=>{
   const ctx=await browser.newContext({viewport:{width:390,height:844}});
   const p=await initPage(ctx);
   const before=await seed(p,"2014",true);assert(before.saved!==false,"save failed");
   await p.goto(BASE+"academy.html?step=lesson.abilities",{waitUntil:"networkidle"});
   await p.locator(".academy-further-reading summary").click();
   await p.locator(".academy-topic button").first().click();
   await p.waitForURL(/index\.html\?view=/);
   const after=await p.evaluate(()=>({cls:S.cls?.n,edition:S.ruleset,gear:S.gear.items,
     banner:document.getElementById("academyCreatorReturn")?.innerText||"",
     returnButton:document.querySelector("#academyCreatorReturn button")?.innerText||""}));
   assert(after.edition==="2014","edition was automatically switched");
   assert(after.cls===before.cls&&after.gear===before.items,"2014 saved char overwritten");
   assert(after.banner.includes("2014"),"2014 incompatibility warning missing");
   await ctx.close();return {before,after};
  });
  await mark("A10_storage_denied_fails_soft",async()=>{
   const ctx=await browser.newContext({viewport:{width:390,height:844}});
   await ctx.addInitScript(()=>{
     const orig=Storage.prototype.setItem;
     Storage.prototype.setItem=function(k,v){
       if(String(k).startsWith("dnd5r:academy:"))throw new DOMException("Quota","QuotaExceededError");
       return orig.call(this,k,v);
     };
   });
   const p=await ctx.newPage();const errs=[];
   p.on("pageerror",e=>errs.push(e.message));
   await p.goto(BASE+"academy.html",{waitUntil:"networkidle"});
   await p.locator("#academyQuiz").click();
   const notice=(await p.locator("#academyNotice").innerText());
   assert(notice.includes("無法保存進度"),"no progress persistence warning");
   assert(errs.length===0,"JS error: "+errs.join("|"));
   await ctx.close();return {notice,errorCount:errs.length};
  });
  await mark("A11_external_return_url_is_rejected",async()=>{
   const ctx=await browser.newContext({viewport:{width:390,height:844}});
   const p=await ctx.newPage();
   await p.goto(BASE+"academy.html?step=lesson.abilities",{waitUntil:"networkidle"});
   await p.locator(".academy-further-reading summary").click();
   await p.locator(".academy-topic button").first().click();
   await p.waitForURL(/index\.html\?view=/);
   const u=new URL(p.url());u.searchParams.set("returnURL","https://attacker.invalid/");
   await p.goto(u.toString(),{waitUntil:"networkidle"});
   if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
   const result=await p.evaluate(()=>({
      label:document.querySelector("#academyCreatorReturn button")?.textContent||"",
      externalLinks:[...document.querySelectorAll("#academyCreatorReturn a")].map(a=>a.href),
      route:window.DND5RAcademyBridge?.getRoute(),
      step:S.step
   }));
   assert(result.label.includes("首頁"),"malicious returnURL unexpectedly accepted");
   assert(result.externalLinks.length===0,"external return navigation present");
   await p.locator("#academyCreatorReturn button").click();
   await p.waitForURL(/academy\.html/);
   assert(new URL(p.url()).origin===new URL(BASE).origin,"external navigation occurred");
   await ctx.close();return result;
  });
 }finally{await browser.close();}
 const total=results.length,failures=results.filter(r=>r.status!=="PASS");
 fs.writeFileSync(OUT,JSON.stringify({source:"origin/main isolated candidate",url:BASE,at:new Date().toISOString(),
    total,pass:total-failures.length,fail:failures.length,results,extraPageErrors:errors},null,2),"utf8");
 console.log(JSON.stringify({total,pass:total-failures.length,fail:failures.length,
  failures:failures.map(x=>({id:x.id,error:x.error.slice(0,600)}))}));
 process.exitCode=failures.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=2});
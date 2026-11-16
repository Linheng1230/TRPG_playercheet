"use strict";
/* 90 independent A01/A04/A09/A12/A14 browser test against one source candidate. */
const {chromium}=require("playwright");
const fs=require("fs"),path=require("path");
const BASE=(process.env.QA_URL||"http://127.0.0.1:18766/index.html").replace(/index\.html(?:\?.*)?$/,"");
const ROOT=process.env.QA_ACADEMY_EVIDENCE_DIR||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/new-player-90";fs.mkdirSync(ROOT,{recursive:true});
const assert=(v,m)=>{if(!v)throw new Error(m)};
const results=[];let browser;
async function run(id,fn) {
 try{const detail=await fn();results.push({id,status:"PASS",detail});}
 catch(e){results.push({id,status:"FAIL",error:String(e.stack||e)});}
}
(async()=>{
 browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
 await run("A01_home_expert_creator_no_quiz",async()=>{
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();await p.goto(BASE+"home.html",{waitUntil:"networkidle"});
  const direct=p.getByRole("link",{name:"我已經會創角，直接開始"});
  assert(await direct.count()===1,"missing direct creator shortcut");
  await direct.focus();await p.keyboard.press("Enter");
  await p.waitForURL(/index\.html\?view=creator/);
  const r=await p.evaluate(()=>({step:S.step,edition:S.ruleset,academyReturn:!!document.getElementById("academyCreatorReturn")}));
  assert(r.step===0&&!r.academyReturn,"expert route hijacked by academy");
  await ctx.close();return r;
 });
 await run("A04_academy_progress_restores_after_fresh_browser_tab",async()=>{
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();await p.goto(BASE+"academy.html",{waitUntil:"networkidle"});
  const btn=p.locator(".academy-nav button").filter({hasText:"下一步"});
  await btn.click();await btn.click();
  const title=await p.locator("#academyContentTitle").innerText();
  assert(title.includes("屬性"),"did not reach lesson abilities");
  await p.close();
  const q=await ctx.newPage();await q.goto(BASE+"academy.html",{waitUntil:"networkidle"});
  const resumed=await q.locator("#academyContentTitle").innerText();
  assert(resumed===title,"study progress did not survive reopening tab");
  await ctx.close();return {title,resumed};
 });
 await run("A09_quiz_answer_edit_and_skip_are_real",async()=>{
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  const p=await ctx.newPage();await p.goto(BASE+"academy.html",{waitUntil:"networkidle"});
  await p.locator("#academyQuiz").click();
  await p.locator(".academy-choice").first().click();
  const first=await p.locator(".academy-choice").first().getAttribute("aria-pressed");
  assert(first==="true","initial answer not selected");
  await p.locator(".academy-nav button").filter({hasText:"下一題"}).click();
  await p.locator(".academy-nav button").filter({hasText:"上一題"}).click();
  await p.locator(".academy-choice").nth(1).click();
  const pressed=await p.locator(".academy-choice").evaluateAll(a=>a.map(x=>x.getAttribute("aria-pressed")));
  assert(pressed[0]==="false"&&pressed[1]==="true","edit did not replace original answer");
  await p.locator(".academy-nav button").filter({hasText:"跳過測驗，直接創角"}).click();
  await p.waitForURL(/index\.html\?view=creator/);
  const after=await p.evaluate(()=>({classRef:S.cls?.n||null,confirmed:S.classConfirmed,step:S.step}));
  assert(after.classRef===null&&!after.confirmed,"quiz skip unexpectedly selected class");
  await ctx.close();return {pressed,after};
 });
 await run("A12_keyboard_touch_accessibility_semantics_responsive",async()=>{
  const rows=[];
  for(const width of [390,480,1440]){
   const mobile=width===390;
   const ctx=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile});
   const p=await ctx.newPage();const errs=[];p.on("pageerror",e=>errs.push(e.message));
   await p.goto(BASE+"academy.html",{waitUntil:"networkidle"});
   const quiz=p.getByRole("button",{name:"先測適合的職業"});
   await quiz.focus();await p.keyboard.press("Enter");
   assert((await p.locator("#academyContentTitle").innerText()).includes("職業"),"keyboard Enter did not open quiz");
   if(mobile)await p.locator(".academy-choice").first().tap();
   else await p.locator(".academy-choice").first().click();
   assert((await p.locator(".academy-choice").first().getAttribute("aria-pressed"))==="true","touch/click did not select choice");
   const roles=await ctx.newCDPSession(p).then(async session=>{
    const ax=await session.send("Accessibility.getFullAXTree");
    await session.detach();
    const names=ax.nodes.filter(x=>["heading","button","navigation"].includes(x.role?.value));
    return {meaningfulRoleNodes:names.length,headings:names.filter(x=>x.role?.value==="heading").length};
   });
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,"horizontal overflow "+width+":"+overflow);
   assert(roles.heading!==0||roles.headings>0,"accessibility tree no headings");
   assert(errs.length===0,"JS page errors: "+errs.join("|"));
   await p.screenshot({path:path.join(ROOT,"candidate-a12-quiz-"+width+".png"),animations:"disabled"});
   rows.push({width,overflow,roles,errors:errs});
   await ctx.close();
  }
  return rows;
 });
 await run("A14_academy_to_saved_creator_json_reload_pdf_final_sheet",async()=>{
  const ctx=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const p=await ctx.newPage(),errs=[];p.on("pageerror",e=>errs.push(e.message));
  await p.goto(BASE+"index.html?view=creator",{waitUntil:"networkidle"});
  if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
  const baseline=await p.evaluate(()=>{
    resetAll();S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="法師");S.level=3;S.classLevels={"法師":3};S.classConfirmed=true;
    S.sp=SPECIES_2024.find(x=>x.n==="矮人");
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="罪犯")||BACKGROUNDS_2024[0];
    S.base={str:8,dex:14,con:14,int:16,wis:12,cha:10};
    S.gear.items="QA 裝備內容必須保留";
    S.id=newId();
    document.querySelector("#fName").value="學院 QA 法師";
    saveCurrent(true);return {id:S.id,cls:S.cls.n,sp:S.sp.n,bg:S.bg.n,
      gear:S.gear.items,edition:S.ruleset,confirmed:S.classConfirmed};
  });
  await p.goto(BASE+"academy.html?step=lesson.abilities",{waitUntil:"networkidle"});
  await p.locator(".academy-further-reading summary").click();
   await p.locator(".academy-topic button").first().click();
  await p.waitForURL(/index\.html\?view=/);
  const beforeReload=await p.evaluate(()=>({id:S.id,cls:S.cls?.n,edition:S.ruleset}));
  assert(beforeReload.id===baseline.id&&beforeReload.cls===baseline.cls,"academy navigation changed char");
  await p.reload({waitUntil:"networkidle"});
  if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
  const readback=await p.evaluate(()=>({id:S.id,cls:S.cls?.n,sp:S.sp?.n,bg:S.bg?.n,
    gear:S.gear.items,edition:S.ruleset,confirmed:S.classConfirmed}));
  for(const k of Object.keys(baseline))assert(JSON.stringify(readback[k])===JSON.stringify(baseline[k]),"reload field changed: "+k);
  const jsonPromise=p.waitForEvent("download");
  await p.evaluate(()=>exportAll());
  const jsonDownload=await jsonPromise;
  const jsonPath=path.join(ROOT,"candidate-a14-roster-export.json");
  await jsonDownload.saveAs(jsonPath);
  const savedJSON=JSON.parse(fs.readFileSync(jsonPath,"utf8"));
  const record=savedJSON.chars.find(c=>c.id===baseline.id);
  assert(record&&record.ruleset==="2024"&&record.cls===baseline.cls,"JSON export lost Creator canonical character");
  const pdfPromise=p.waitForEvent("download");
  await p.evaluate(()=>exportOfficialCharacterSheet());
  const pdfDownload=await pdfPromise;
  const pdfPath=path.join(ROOT,"candidate-a14-2024-from-academy.pdf");
  await pdfDownload.saveAs(pdfPath);
  assert(fs.statSync(pdfPath).size>10000,"PDF invalidly small");
  const sheet=await p.evaluate(()=>{go(7);return {step:S.step,name:document.querySelector("#shName")?.textContent||"",
    identity:document.querySelector("#shId")?.textContent||""};});
  assert(sheet.step===7&&sheet.identity.includes("法師"),"Final Sheet lost chosen class");
  assert(errs.length===0,"page error(s): "+errs.join("|"));
  await ctx.close();
  return {baseline,readback,jsonExport:{type:savedJSON.type,count:savedJSON.count,
    record:{id:record.id,cls:record.cls,ruleset:record.ruleset}},
    pdfPath,pdfBytes:fs.statSync(pdfPath).size,finalSheet:sheet};
 });
 }finally{await browser.close()}
 const failed=results.filter(r=>r.status!=="PASS");
 const report={at:new Date().toISOString(),source:BASE,pass:results.length-failed.length,
  fail:failed.length,results};
 fs.writeFileSync(path.join(ROOT,"candidate-a01-a04-a09-a12-a14.json"),JSON.stringify(report,null,2),"utf8");
 console.log(JSON.stringify({pass:report.pass,fail:report.fail,
  statuses:results.map(x=>({id:x.id,status:x.status,error:x.error?.slice(0,600)}))}));
 process.exitCode=failed.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=2});
"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19785/index.html";
const groupOrder=["str","dex","con","int","wis","cha"];
const counts=[1,3,0,5,5,4];
async function setup(page,edition){
 await page.goto(URL+"?creator-skill-groups="+edition+"-"+Date.now(),{waitUntil:"networkidle"});
 await page.evaluate(edition=>{
   S.ruleset=edition;
   S.cls=CLASSES.find(x=>x.n==="德魯伊");
   S.bg=(edition==="2014"?BACKGROUNDS_2014:BACKGROUNDS_2024).find(x=>x.n==="隱士");
   S.sp=(edition==="2014"?SPECIES_2014:SPECIES_2024).find(x=>x.n==="人類");
   if(!S.cls||!S.bg||!S.sp)throw Error("test fixture class/background/species missing");
   S.skills=new Set();
   S.skillsConfirmed=false;
   S.spChoices={};
   pendingSkills=null;
   renderSkills();
   document.querySelectorAll(".step-panel").forEach(panel=>{
     panel.classList.toggle("active",panel.dataset.step==="3");
     panel.style.display=panel.dataset.step==="3"?"block":"none";
   });
   const modal=document.querySelector("#rulesetModal");if(modal)modal.style.display="none";
 });
}
function skill(page,name){return page.locator('#skillGrid button[data-skill="'+name+'"]')}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const width of [320,390,480,1440]){
   for(const edition of ["2024","2014"]){
    const page=await browser.newPage({viewport:{width,height:width===1440?900:860},deviceScaleFactor:1});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await setup(page,edition);
    const initial=await page.evaluate(()=>{
      const groups=[...document.querySelectorAll("#skillGrid .creator-skill-group")];
      const entries=groups.map(g=>({key:g.dataset.ability,cards:[...g.querySelectorAll("button[data-skill]")].map(b=>b.dataset.skill),empty:g.querySelector(".creator-skill-empty")?.textContent||"",rect:g.getBoundingClientRect().toJSON()}));
      const all=[...document.querySelectorAll("#skillGrid button[data-skill]")];
      const descriptions=all.map(b=>b.querySelector(".creator-skill-description")?.textContent||"");
      return {entries,skillKeys:all.map(b=>b.dataset.skill),descriptions,
       expected:SKILLS.map(s=>({n:s.n,a:s.a})),wording:all.map(b=>b.querySelector(".creator-skill-name")?.innerText||""),
       overflow:document.documentElement.scrollWidth-innerWidth,
       gridWidth:document.querySelector("#skillGrid").getBoundingClientRect().width};
    });
    assert.deepEqual(initial.entries.map(g=>g.key),groupOrder,"six ability groups in canonical order");
    assert.deepEqual(initial.entries.map(g=>g.cards.length),counts,"18 skill partition and zero constitution");
    assert.deepEqual(initial.entries.flatMap(g=>g.cards).sort(),initial.expected.map(x=>x.n).sort(),"every skill appears exactly once");
    assert(initial.entries[2].empty.includes("體質沒有固定對應的技能"),"constitution note");
    assert(initial.descriptions.every(t=>t.trim().length>=8&&!t.includes("undefined")),"all 18 concise descriptions");
    for(const g of initial.entries)for(const n of g.cards)assert.equal(initial.expected.find(x=>x.n===n)?.a,g.key,"wrong skill ability");
    assert(initial.overflow<=3,"horizontal overflow at "+width+" "+edition+": "+initial.overflow);
    assert(initial.entries.every(x=>x.rect.left>=-2&&x.rect.right<=width+2&&x.rect.width>0),"group card outside viewport "+width+" "+edition);
    assert(await skill(page,"醫藥").isDisabled(),"background-owned skill disabled");
    assert((await skill(page,"醫藥").innerText()).includes("已擁有（背景）"),"background source label");
    assert(await skill(page,"雜技").isDisabled(),"non-class skill disabled");
    assert((await skill(page,"雜技").innerText()).includes("本職不可選"),"unavailable label");
    const click=async name=>page.evaluate(name=>document.querySelector('#skillGrid button[data-skill="'+name+'"]').click(),name);
    await click("自然");await click("洞悉");
    assert.equal(await page.locator(".confirm-skills strong").innerText(),"已選 2／2 項職業技能");
    assert.equal(await skill(page,"自然").getAttribute("aria-pressed"),"true");
    await click("察覺");
    assert.equal(await skill(page,"察覺").getAttribute("aria-pressed"),"false","cannot exceed class pick limit");
    const confirm=page.locator(".confirm-skills button");
    assert(await confirm.isEnabled(),"confirm activated at exact choice count");
    page.once("dialog",d=>d.accept());await confirm.evaluate(el=>el.click());
    assert((await page.locator(".confirm-skills").innerText()).includes("已確認並鎖定"),"confirmation locks class skills");
    assert(await skill(page,"自然").isDisabled(),"selected skill locked after confirm");
    const state=await page.evaluate(()=>({confirmed:S.skillsConfirmed,skills:[...S.skills],valid:classSkillSelectionValid()}));
    assert(state.confirmed&&state.valid&&state.skills.length===2,"canonical skill state unchanged");
    assert.deepEqual(errors,[],"no browser JS error");
    if(width===390&&edition==="2024")await page.screenshot({path:"D:/Tools/zizi-ai-runtime/skill-ui-creator-20261119-390px.png",fullPage:true});
    if(width===1440&&edition==="2024")await page.screenshot({path:"D:/Tools/zizi-ai-runtime/skill-ui-creator-20261119-1440px.png",fullPage:true});
    console.log("QA_PASS "+width+"px "+edition+" partition=1/3/0/5/5/4, 18 descriptions, selection, ownership, lock, overflow="+initial.overflow);
    await page.close();
   }
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("QA_FAIL "+(e.stack||e));process.exitCode=1});

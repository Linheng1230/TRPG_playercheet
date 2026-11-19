"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const list=[
 ["野蠻人",2,"動物馴養 運動 威嚇 自然 察覺 求生"],
 ["吟遊詩人",3,"*"],
 ["牧師",2,"歷史 洞悉 醫藥 說服 宗教"],
 ["德魯伊",2,"奧秘 動物馴養 洞悉 醫藥 自然 察覺 宗教 求生"],
 ["戰士",2,"雜技 動物馴養 運動 歷史 洞悉 威嚇 說服 察覺 求生"],
 ["武僧",2,"雜技 運動 歷史 洞悉 宗教 隱匿"],
 ["聖武士",2,"運動 洞悉 威嚇 醫藥 說服 宗教"],
 ["遊俠",3,"動物馴養 運動 洞悉 調查 自然 察覺 隱匿 求生"],
 ["遊蕩者",4,"雜技 運動 欺瞞 洞悉 威嚇 調查 察覺 說服 巧手 隱匿"],
 ["術士",2,"奧秘 欺瞞 洞悉 威嚇 說服 宗教"],
 ["邪術師",2,"奧秘 欺瞞 歷史 威嚇 調查 自然 宗教"],
 ["法師",2,"奧秘 歷史 洞悉 調查 醫藥 自然 宗教"]
];
const allSkills="運動 雜技 巧手 隱匿 奧秘 歷史 調查 自然 宗教 動物馴養 洞悉 醫藥 察覺 求生 欺瞞 威嚇 表演 說服".split(" ");
function chosenNames(edition,name,raw){
 if(raw==="*")return allSkills;
 if(edition==="2014"&&name==="戰士")return raw.split(" ").filter(x=>x!=="說服");
 if(edition==="2014"&&name==="遊蕩者"){const n=raw.split(" ");n.splice(n.indexOf("說服"),0,"表演");return n;}
 return raw.split(" ");
}
async function go(page,step){
 const t=page.locator("#stepNav .nav-ux-steps-toggle");
 if(await t.count()&&(await t.getAttribute("aria-expanded"))!=="true")await t.click();
 await page.locator("#stepNav .nav-secondary button").nth(step).click();
}
async function open(page,edition){
 await page.goto(URL+"?class-skill-qa="+edition+"-"+Date.now(),{waitUntil:"networkidle"});
 if(!await page.locator("#rulesetModal").isVisible())await page.locator("#btnRuleset").click();
 await page.locator('[data-ruleset="'+edition+'"]').click();
}
async function setClass(page,name){
 await page.locator('#classGrid button[data-class-name="'+name+'"]').click();
 page.once("dialog",d=>d.accept());
 await page.locator(".class-confirm-controls button").filter({hasText:/確定職業|確認職業/}).click();
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync("tmp/qa-class-skills",{recursive:true});
 try{
  for(const edition of ["2024","2014"])for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:width===390?844:900}});
   const page=await context.newPage(),errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   await open(page,edition);
   assert.equal(await page.locator("#classGrid button[data-class-name]").count(),12);
   for(const [name,count,raw] of list){
    await page.locator('#classGrid button[data-class-name="'+name+'"]').click();
    const keys=chosenNames(edition,name,raw),shown=await page.evaluate(names=>names.map(n=>displayName5R("skills",n)),keys);
    const expected="職業技能：任選 "+count+" 項（"+(keys.length===18?"全部 18 項技能皆可選：":"")+shown.join("／")+"）";
    const el=page.locator("#classDetail [data-class-skill-list]");
    assert.equal(await el.count(),1,"detail summary exists for "+name);
    assert.equal(await el.textContent(),expected,edition+" "+name+" class list");
   }
   assert.deepEqual(errors,[],"no class preview JS error");
   const over=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(over<=3,"class summary overflow "+edition+" "+width+" = "+over);
   if(width===390)await page.locator("#classDetail").screenshot({path:"tmp/qa-class-skills/preview-"+edition+".png"});
   await context.close();
   console.log("PASS preview "+edition+" "+width+" all 12 class names and full canonical skill pools");
  }
  for(const edition of ["2024","2014"])for(const cls of ["戰士","遊蕩者"]){
   const context=await browser.newContext({viewport:{width:390,height:844}});
   const page=await context.newPage();await open(page,edition);await setClass(page,cls);await go(page,1);
   await page.locator("#bgGrid button.pick-card").filter({has:page.locator(".name").filter({hasText:"隱士"})}).first().click();
   if(edition==="2014")await page.locator('[data-bg14="lang1"]').selectOption({index:1});
   page.once("dialog",d=>d.accept());await page.locator(".confirm-bg button").click();
   const sp=edition==="2014"?"半獸人":"獸人";
   await page.locator("#spGrid button.pick-card").filter({has:page.locator(".name").filter({hasText:sp})}).first().click();
   page.once("dialog",d=>d.accept());await page.locator(".confirm-sp button").click();
   await go(page,2);
   for(const [k,v] of [["str","15"],["dex","14"],["con","13"],["int","12"],["wis","10"],["cha","8"]])
    await page.locator('#abilityGrid select[data-ab="'+k+'"]').selectOption(v);
   if(edition==="2024"){
    await page.locator('[data-bk="b2"]').selectOption("wis");
    await page.locator('[data-bk="b1"]').selectOption("con");
   }
   page.once("dialog",d=>d.accept());await page.locator("#confirmAbilities").click();
   await go(page,3);
   const text=await page.locator("#classSkillSummary").textContent();
   assert(text.includes("職業技能：任選 "+(cls==="遊蕩者"?4:2)+" 項"),"step 4 summary count");
   assert.equal(await page.locator("#skillGrid button[data-skill]").count(),18,"18 skills still visible");
   if(cls==="戰士")assert.equal(await page.locator('#skillGrid button[data-skill="說服"]').isDisabled(),edition==="2014","fighter PHB edition pool");
   if(cls==="遊蕩者")assert.equal(await page.locator('#skillGrid button[data-skill="表演"]').isDisabled(),edition==="2024","rogue PHB edition pool");
   await page.locator("#skillGrid").screenshot({path:"tmp/qa-class-skills/skills-"+edition+"-"+cls+".png"});
   console.log("PASS actual creator "+edition+" "+cls+" pool and step 4 summary");
   await context.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL "+(e.stack||e));process.exitCode=1});

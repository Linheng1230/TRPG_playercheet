"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright"),PDFLib=require(path.resolve("assets/vendor/pdf-lib.min.js"));
const base=(process.env.QA_BASE||"http://127.0.0.1:18766").replace(/\/$/,"");
const out=path.resolve(process.env.QA_PDF_DIR||"tmp/pdf-skill-parity");fs.mkdirSync(out,{recursive:true});
// Verified against the actual printed row positions in the original two templates.
// 2014's English field IDs are historically out of order; do NOT infer from names.
const order14=["運動","巧手","隱匿","雜技","調查","歷史","奧秘","自然","宗教","動物馴養","洞悉","醫藥","察覺","求生","欺瞞","威嚇","表演","說服"];
const ids14=["Acrobatics","Animal","Arcana","Athletics","Deception ","History ","Insight","Intimidation","Investigation ","Medicine","Nature","Perception ","Performance","Persuasion","Religion","SleightofHand","Stealth ","Survival"];
const map14=Object.fromEntries(order14.map((n,i)=>[n,[ids14[i],"Check Box "+(23+i)]]));
const map24=Object.fromEntries(Object.entries({運動:"str-ath",雜技:"dex-acr",巧手:"dex-soh",隱匿:"dex-ste",奧秘:"int-arc",歷史:"int-his",調查:"int-inv",自然:"int-nat",宗教:"int-rel",動物馴養:"wis-ah",洞悉:"wis-ins",醫藥:"wis-med",察覺:"wis-per",求生:"wis-sur",欺瞞:"chr-dec",威嚇:"chr-thr",表演:"chr-per",說服:"chr-psu"}).map(([n,f])=>[n,[f,f+"-c"]]));
const cases=[
 {rs:"2024",cls:"遊俠",lv:3,bg:"流浪兒",sp:"半身人",skills:["察覺","求生","動物馴養"],expert:["隱匿"],repro:true},
 {rs:"2024",cls:"吟遊詩人",lv:5,skills:["隱匿","奧秘","察覺"],expert:["隱匿","奧秘"]},
 {rs:"2024",cls:"德魯伊",lv:1,skills:["醫藥","自然"],expert:[],order:"魔法師"},
 {rs:"2014",cls:"吟遊詩人",lv:5,skills:["隱匿","察覺","奧秘"],expert:["隱匿","察覺"]},
 {rs:"2014",cls:"遊蕩者",lv:5,skills:["隱匿","察覺","調查","威嚇"],expert:["隱匿","察覺"]}
];
async function fixture(page,c){
 await page.goto(base+"/index.html?view=creator&qa=pdf-skill-fixture",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>typeof serialize==="function"&&typeof S!=="undefined");
 return page.evaluate(c=>{
  document.getElementById("rulesetModal")?.classList.remove("open");
  S.ruleset=c.rs;syncRulesetUI();S.cls=CLASSES.find(x=>x.n===c.cls);S.level=c.lv;S.classLevels={[c.cls]:c.lv};S.classSubs={};S.sub=null;
  S.sp=(c.rs==="2024"?SPECIES_2024:SPECIES_2014).find(x=>x.n===(c.sp||"矮人"));S.spChoices={};
  S.bg=c.rs==="2024"?BACKGROUNDS_2024.find(x=>x.n===(c.bg||"商人")):BACKGROUNDS_2014.find(x=>x.n==="平民英雄")||BACKGROUNDS_2014[0];
  S.method="custom";S.base={str:12,dex:c.repro?14:15,con:12,int:7,wis:c.repro?17:19,cha:11};
  S.bonusMode="21";S.bonus=c.repro?{b2:"wis",b1:"dex",c1:"",c2:"",c3:""}:{b1:"",b2:"",c1:"",c2:"",c3:""};
  S.skills=new Set(c.skills);S.expertise=new Set(c.expert);S.classChoices14=c.rs==="2014"?{[c.cls]:{expertise:c.expert}}:{};S.classChoices2024={};S.asi={};S.asiByClass={};S.primalOrder=c.order||"";S.divineOrder="";S.originFeatChoices={};S.featSpells={};
  S.classConfirmed=S.bgConfirmed=S.spConfirmed=S.abilitiesConfirmed=S.skillsConfirmed=true;
  S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],items:"",gold:{gp:0,cp:0,sp:0,pp:0}};S.bio={look:"",story:"",traits:"",allies:"",notes:""};
  document.getElementById("fName").value="QA PDF Skill "+c.rs+" "+c.cls;
  return serialize();
 },c);
}
async function checkPublishedVersion(){
 const expected=process.env.QA_EXPECTED_SHA;if(!expected)return;
 let found="";
 for(let attempt=0;attempt<12;attempt++){
  try{const r=await fetch(base+"/site-version.json?qa="+Date.now(),{cache:"no-store"});if(r.ok)found=(await r.json()).sha;if(found===expected)return;}catch(_){}
  await new Promise(r=>setTimeout(r,5000));
 }
 assert.equal(found,expected,"exact published SHA");
}
async function run(){
 await checkPublishedVersion();
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});const report=[];
 try{
  // Test the actual visible file chooser/import and character sheet/export buttons.
  const seed=await browser.newPage();const fixtures=[];
  for(const c of cases)fixtures.push(await fixture(seed,c));
  await seed.close();
  for(const width of [390,1440])for(const [i,c] of cases.entries()){
   const context=await browser.newContext({viewport:{width,height:844},acceptDownloads:true,isMobile:width===390,hasTouch:width===390});
   const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
   await page.goto(base+"/home.html?qa=pdf-skill-parity",{waitUntil:"domcontentloaded"});
   await page.locator('a[href="./index.html?view=creator"]:visible').first().click();
   await page.waitForFunction(()=>typeof deserialize==="function");await page.waitForTimeout(400);
   if(await page.locator("#rulesetModal.open").count())await page.locator('[data-ruleset="'+c.rs+'"]').click();
   await page.locator("#btnRoster").click();const ch=page.waitForEvent("filechooser");
   await page.locator("#actImport").click();await (await ch).setFiles({name:"qa-synthetic-"+i+".json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({_save:fixtures[i]}))});
   await page.waitForFunction(c=>S.cls?.n===c.cls&&S.ruleset===c.rs&&S.level===c.lv,c);
   await page.locator('#stepNav .nav-primary').getByText("角色卡",{exact:true}).click();
   assert(await page.locator("#finalSheet").isVisible());
   const rows=await page.evaluate(()=>{
    const sec=[...document.querySelectorAll("#finalSheet .fs-sec")].find(x=>x.querySelector(".st")?.textContent==="技能"),lis=[...sec.querySelectorAll("li")];
    if(lis.length!==18)throw Error("Expected 18 visible skill rows");
    return SKILLS.map((sk,i)=>{const li=lis[i],name=displayName5R("skills",sk.n),marker=li.textContent.trim()[0],value=li.querySelector("b").textContent.trim();
     if(!li.textContent.includes(name)||!["◇","◆","❖"].includes(marker))throw Error("DOM skill identity mismatch "+sk.n);
     return {id:sk.n,name,marker,value};});
   });
   if(c.expert.length)assert(rows.some(r=>r.marker==="❖"),"fixture expertise actually rendered");
   assert(rows.some(r=>r.marker==="◇")&&rows.some(r=>r.marker==="◆"),"fixture exercises untrained and trained");
   if(c.repro){
    const r=rows.find(x=>x.id==="隱匿");assert.deepEqual([r.name,r.value,r.marker],["隱匿","+6","❖"]);
    assert.equal(rows.find(x=>x.id==="雜技").name,"特技");assert.equal(rows.find(x=>x.id==="說服").name,"說服");
   }
   const dl=page.waitForEvent("download",{timeout:90000});await page.locator('button[onclick="exportOfficialCharacterSheet()"]:visible').first().click();
   const filename=c.rs+"-"+i+"-"+width+".pdf",file=path.join(out,filename);await (await dl).saveAs(file);
   const pdf=await PDFLib.PDFDocument.load(fs.readFileSync(file)),form=pdf.getForm(),map=c.rs==="2014"?map14:map24;
   for(const r of rows){
    const [num,check]=map[r.id],label="skill-label-"+num;
    const f=form.getTextField(num),b=form.getCheckBox(check),l=form.getTextField(label);
    assert.equal(f.getText(),r.value,r.id+" numeric");assert.equal(l.getText(),r.name,r.id+" name");
    assert.equal(b.isChecked(),r.marker!=="◇",r.id+" proficiency");assert(!f.isReadOnly()&&!b.isReadOnly(),r.id+" editable originals");
    const w=b.acroField.getWidgets()[0],ap=w.getAppearances().normal,state=w.getAppearanceState(),stream=pdf.context.lookup(ap.get(state));
    const raw=Buffer.from(PDFLib.decodePDFRawStream(stream).decode()).toString("latin1");
    assert.equal(raw.split(/\r?\n/).filter(x=>x.trim()==="f").length,r.marker==="❖"?4:r.marker==="◆"?1:0,r.id+" actual visible mark fill");
    assert.equal(raw.split(/\r?\n/).filter(x=>x.trim()==="S").length,r.marker==="◇"?1:0,r.id+" actual visible mark stroke");
    r.field=num;r.checkbox=check;r.labelField=label;
   }
   // Prove existing numeric and binary checkbox fields are still writable
   // without modifying the saved download or any player data.
   const first=rows[0],numeric=form.getTextField(first.field),box=form.getCheckBox(first.checkbox);
   numeric.setText("+9");if(box.isChecked())box.uncheck();else box.check();
   const edited=await PDFLib.PDFDocument.load(await pdf.save({updateFieldAppearances:false})),ef=edited.getForm();
   assert.equal(ef.getTextField(first.field).getText(),"+9");assert.equal(ef.getCheckBox(first.checkbox).isChecked(),first.marker==="◇");
   assert.deepEqual(errors,[]);report.push({fixture:c,width,file:filename,rows,pages:pdf.getPageCount(),fields:form.getFields().length});
   console.log("PASS",c.rs,c.cls,width,"18 names/values/marks, editable fields",pdf.getPageCount(),"pages");
   await context.close();
  }
 }finally{await browser.close();}
 await checkPublishedVersion();
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({fieldParityPass:true,sha:process.env.QA_EXPECTED_SHA||null,report},null,2));console.log("PASS",report.length,"actual UI exports");
}
run().catch(e=>{console.error(e.stack||e);process.exitCode=1});

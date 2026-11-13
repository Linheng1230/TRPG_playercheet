"use strict";
const assert=require("node:assert/strict"),http=require("node:http"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const PDFLib=require(path.resolve("assets/vendor/pdf-lib.min.js"));
const root=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8",".otf":"font/otf",".woff2":"font/woff2",".png":"image/png",".pdf":"application/pdf"};
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const f=path.resolve(root,name);
 if(!f.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(f,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"});
 fs.createReadStream(f).pipe(res);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const url="http://127.0.0.1:"+server.address().port+"/index.html";
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
 try{
  await page.goto(url,{waitUntil:"networkidle"});
  await page.evaluate(()=>document.getElementById("rulesetModal")?.classList.remove("open"));
  const result=await page.evaluate(()=>{
   const rows=[];
   function test(name,ok,extra){if(!ok)throw Error(name+" FAILED "+JSON.stringify(extra));rows.push(name);}
   function setup(rs,cls,lv,bgName){
    S.ruleset=rs;syncRulesetUI();S.cls=CLASSES.find(x=>x.n===cls);S.level=lv;S.classLevels={[cls]:lv};S.classSubs={};S.sub=null;S.sp=rs==="2024"?SPECIES_2024.find(x=>x.n==="矮人"):SPECIES_2014.find(x=>x.n==="矮人");
    S.spChoices={};S.bg=rs==="2024"?BACKGROUNDS_2024.find(x=>x.n===(bgName||"商人")):BACKGROUNDS_2014.find(x=>x.n===(bgName||"平民英雄"))||BACKGROUNDS_2014[0];
    S.base={str:12,dex:14,con:12,int:12,wis:18,cha:12};S.skills=new Set();S.expertise=new Set();S.asi={};S.asiByClass={};S.classChoices14={};S.classChoices2024={};S.primalOrder="";S.divineOrder="";S.originFeatChoices={};S.featSpells={};S.bonus={b1:"",b2:"",c1:"",c2:"",c3:""};
    S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],items:"",gold:{gp:0,cp:0,sp:0,pp:0}};S.bio={look:"",story:"",traits:"",allies:"",notes:""};
    document.getElementById("fName").value="QA_跨職業檢定";
   }
   const val=n=>skillCheckTotal(SKILLS.find(x=>x.n===n));
   const t=(a,b,label)=>test(label,a===b,{actual:a,expected:b});
   setup("2024","吟遊詩人",1);t(val("奧秘"),1,"2024 bard lv1 absent");
   S.level=2;S.classLevels={吟遊詩人:2};t(val("奧秘"),2,"2024 bard lv2 half");t(initiativeDetails().total,2,"2024 bard initiative no half");
   S.skills.add("奧秘");t(val("奧秘"),3,"2024 bard prof no Jack");S.expertise.add("奧秘");t(val("奧秘"),5,"2024 bard expertise doubled");
   S.skills.clear();S.expertise.clear();
   for(const [level,want] of [[5,2],[9,3],[20,4]]){S.level=level;S.classLevels={吟遊詩人:level};t(val("奧秘"),want,"2024 bard floor "+level);}
   setup("2024","吟遊詩人",2,"衛士");t(initiativeDetails().total,4,"2024 alert initiative PB");t(val("奧秘"),2,"2024 bard + alert skill half");
   setup("2014","吟遊詩人",1);t(initiativeDetails().total,2,"2014 bard lv1 initiative");S.level=2;S.classLevels={吟遊詩人:2};t(initiativeDetails().total,3,"2014 bard lv2 initiative +1");t(val("奧秘"),2,"2014 bard skill +1");
   setup("2014","戰士",7);S.sub=PROG_2014["戰士"].subs.findIndex(x=>x.n==="冠軍");t(initiativeDetails().total,4,"2014 champion ceil PB/2");
   t(val("運動"),3,"2014 champion strength check");S.skills.add("運動");t(val("運動"),4,"2014 champion prof no extra");
   S.skills.clear();S.level=13;S.classLevels={戰士:11,吟遊詩人:2};t(initiativeDetails().total,5,"2014 multiclass champion beats bard no double");
   S.asiByClass={戰士:{4:{t:"feat",feat:"警覺"}}};t(initiativeDetails().total,10,"2014 alert + champion");
   setup("2024","遊俠",3);S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="精類浪遊者");t(val("欺瞞"),5,"2024 fey charisma plus wis");
   t(val("運動"),1,"2024 fey nonchar untouched");
   setup("2024","遊俠",3);S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="幽域追獵者");t(initiativeDetails().total,6,"2024 gloom wis initiative");
   setup("2024","戰士",3);S.sub=PROG_2024["戰士"].subs.findIndex(x=>x.n==="冠軍");
   test("2024 champion initiative advantage not numeric",initiativeDetails().total===2&&initiativeDetails().notes.some(x=>x.includes("優勢")));
   test("2024 champion athletics advantage not numeric",skillRollNotes(SKILLS.find(x=>x.n==="運動")).some(x=>x.includes("優勢")));
   setup("2024","遊蕩者",7);S.skills.add("求生");test("2024 reliable talent d20 floor tooltip",skillRollNotes(SKILLS.find(x=>x.n==="求生")).some(x=>x.includes("d20"))&&skillCheckTotal(SKILLS.find(x=>x.n==="求生"))===7);
   setup("2014","遊蕩者",11);S.skills.add("求生");test("2014 reliable talent level 11",skillRollNotes(SKILLS.find(x=>x.n==="求生")).some(x=>x.includes("d20")));
   setup("2024","野蠻人",3);test("2024 primal knowledge conditional STR",skillRollNotes(SKILLS.find(x=>x.n==="雜技")).some(x=>x.includes("狂暴"))&&val("雜技")===2);
   setup("2024","牧師",1);S.divineOrder="奇術師";t(val("奧秘"),5,"2024 cleric thaumaturge still works");
   setup("2024","德魯伊",1);S.primalOrder="魔法師";t(val("自然"),5,"2024 druid magician still works");
   setup("2024","聖武士",6);test("2024 paladin saves include aura",saveTotal("str")===2);
   setup("2024","武僧",14);test("2024 monk save proficiency all",saveProfSet().has("cha")&&saveTotal("cha")===6);
   setup("2014","戰士",14);S.classLevels={戰士:13,武僧:1};test("2014 monk multiclass save gate",!saveProfSet().has("cha"));
   setup("2014","戰士",4);S.asiByClass={戰士:{4:{t:"feat",feat:"敏銳觀察"}}};test("2014 observant passive+5",passivePerceptionTotal()===10+val("察覺")+5);
   setup("2024","聖武士",6);S.base.cha=8;t(saveTotal("str"),2,"2024 paladin aura minimum +1 with negative CHA");
   setup("2014","聖武士",6);S.base.cha=8;t(saveTotal("str"),2,"2014 paladin aura minimum +1 with negative CHA");
   const classes=Object.keys(PROG_2024);test("all twelve classes indexed",classes.length===12);
   for(const rs of ["2024","2014"])for(const n of classes){setup(rs,n,1);const v=val("奧秘"),i=initiativeDetails()?.total;test(rs+" "+n+" base checks finite",Number.isFinite(v)&&Number.isFinite(i));}
   setup("2024","吟遊詩人",2,"衛士");S.spChoices={};
   const orig={class:S.cls?.n,level:S.level,feat:S.bg.feat,total:initiativeDetails().total,check:val("奧秘")};
   const data=serialize();deserialize(data);
   test("2024 JSON roundtrip",S.cls?.n===orig.class&&S.bg?.feat===orig.feat&&initiativeDetails().total===orig.total&&val("奧秘")===orig.check);
   go(7);
   const skillSec=[...document.querySelectorAll("#finalSheet .fs-sec")].find(x=>x.querySelector(".st")?.textContent==="技能");
   test("2024 UI Jack present",skillSec.innerText.includes("萬事通"));
   test("2024 UI initiative corrected",document.querySelector(".fs-statrow")?.innerText.includes("+4"));
   return {rows,count:rows.length,initiative:initiativeDetails().total,skill:val("奧秘")};
  });
  if(errors.length)throw Error("Page errors "+errors.join(" | "));
  const width=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth}));
  assert(width.scrollWidth<=width.viewport+1,"390px mobile character sheet must not overflow "+JSON.stringify(width));
  fs.mkdirSync(path.resolve("tmp"),{recursive:true});
  await page.screenshot({path:path.resolve("tmp/qa-class-check-modifiers-390.png"),fullPage:false});
  const dl=page.waitForEvent("download",{timeout:30000});
  await page.evaluate(()=>exportOfficialCharacterSheet());
  const download=await dl;const output=path.resolve("tmp/qa-class-check-modifiers-2024.pdf");
  await download.saveAs(output);
  const d=await PDFLib.PDFDocument.load(fs.readFileSync(output));const f=d.getForm();
  const pdf={initiative:f.getTextField("initiative").getText(),arcana:f.getTextField("int-arc").getText(),passive:f.getTextField("passiv-dcp").getText()};
  assert.equal(pdf.initiative,"+4");assert.equal(pdf.arcana,"+2");
  await page.evaluate(()=>{
   S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="吟遊詩人");S.level=5;S.classLevels={吟遊詩人:5};S.classSubs={};S.sub=null;
   S.sp=SPECIES_2014.find(x=>x.n==="矮人")||SPECIES_2014[0];S.spChoices={};S.bg=BACKGROUNDS_2014[0];
   S.base={str:12,dex:14,con:12,int:12,wis:18,cha:12};S.skills=new Set();S.expertise=new Set();S.classChoices14={};S.asi={};S.asiByClass={吟遊詩人:{4:{t:"feat",feat:"警覺"}}};S.originFeatChoices={};S.bonus={b1:"",b2:"",c1:"",c2:"",c3:""};
   document.getElementById("fName").value="QA_2014_全能高手";go(7);
   if(initiativeDetails().total!==8)throw Error("2014 sheet initiative must include Jack and Alert");
  });
  const dl14=page.waitForEvent("download",{timeout:30000});await page.evaluate(()=>exportOfficialCharacterSheet());
  const file14=path.resolve("tmp/qa-class-check-modifiers-2014.pdf");await (await dl14).saveAs(file14);
  const d14=await PDFLib.PDFDocument.load(fs.readFileSync(file14)),f14=d14.getForm();
  const pdf14={initiative:f14.getTextField("Initiative").getText(),passive:f14.getTextField("Passive").getText(),arcana:f14.getTextField("Insight").getText()};
  assert.equal(pdf14.initiative,"+8");assert.equal(pdf14.passive,"15");assert.equal(pdf14.arcana,"+2");
  console.log(JSON.stringify({pass:true,count:result.count,classes:24,pdf2024:pdf,pdf2014:pdf14,nonRedundantChecks:result.rows.filter(x=>x.includes("champion")||x.includes("bard")||x.includes("gloom"))},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error("QA_FAIL",e.stack||e);process.exitCode=1;try{server.close()}catch(_){}});

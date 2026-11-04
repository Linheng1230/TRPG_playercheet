"use strict";
const {chromium}=require("playwright");
const fs=require("fs");
const path=require("path");
const PDFLib=require(path.resolve("assets/vendor/pdf-lib.min.js"));
const url=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const output=path.resolve("tmp/qa-2024-dwarf-soulknife.pdf");

(async()=>{
 fs.mkdirSync(path.dirname(output),{recursive:true});
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage();
 const errs=[];page.on("pageerror",e=>errs.push(String(e)));
 await page.goto(url,{waitUntil:"networkidle"});
 await page.evaluate(()=>{
   document.getElementById("rulesetModal")?.classList.remove("open");
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="遊蕩者");S.level=3;S.classLevels={遊蕩者:3};
   S.sub=PROG_2024["遊蕩者"].subs.findIndex(x=>x.n==="靈魂之刃");
   S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.spChoices={};
   S.bg=BACKGROUNDS_2024.find(x=>x.n==="罪犯")||BACKGROUNDS_2024[0];
   S.base={str:8,dex:17,con:16,int:10,wis:12,cha:10};
   S.skills=new Set(["隱匿","巧手","察覺","欺瞞"]);
   S.gear={armor:"鑲釘皮甲",unarmored:"auto",shield:false,weapons:["匕首"],miscAC:0,miscLabel:"",items:"盜賊工具、背包",gold:{pp:0,gp:20,sp:0,cp:0}};
   S.bio={look:"",traits:"",story:"",allies:"",notes:""};
   document.getElementById("fName").value="矮人魂刃PDF回歸";
   update();
 });
 const dl=page.waitForEvent("download");
 await page.evaluate(()=>exportOfficialCharacterSheet());
 const download=await dl;await download.saveAs(output);
 const state=await page.evaluate(()=>({fit:window.__lastPdfFitReport}));
 await browser.close();
 if(errs.length)throw new Error("page errors: "+errs.join(" | "));
 for(const [name,result] of Object.entries(state.fit||{}))if(result?.overflow)throw new Error("PDF overflow: "+name+" "+JSON.stringify(result));
 if(!state.fit?.classFeatures?.blockSplit)throw new Error("class feature PDF did not split on Feature block boundaries");
 const doc=await PDFLib.PDFDocument.load(fs.readFileSync(output));const form=doc.getForm();
 const species=form.getTextField("speice-trat").getText()||"";
 const classText=((form.getTextField("class-a-1").getText()||"")+"\n"+(form.getTextField("class-a-2").getText()||""));
 const norm=s=>String(s||"").replace(/\s+/g,"");
 const speciesNorm=norm(species),classNorm=norm(classText);
 const mustSpecies=["石中精妙","附贈動作","60尺","震顫感知","10分鐘","熟練加值","長休"];
 const mustClass=["靈能力量","3級4枚d6","短休恢復1枚","長休全恢復","念刃","1d6心靈+該次攻擊屬性","60/120尺","侵擾","1d4心靈+該次攻擊屬性"];
 for(const t of mustSpecies)if(!speciesNorm.includes(norm(t)))throw new Error("species PDF missing: "+t+"\n"+species);
 for(const t of mustClass)if(!classNorm.includes(norm(t)))throw new Error("class PDF missing: "+t+"\n"+classText);
 if(species.includes("你讓感官沉入")||classText.includes("你把自己的靈能凝成"))throw new Error("PDF should omit flavor prose to preserve space");
 if((state.fit?.species?.size||0)<5)throw new Error("species PDF font too small: "+JSON.stringify(state.fit.species));
 if((state.fit?.classFeatures?.size||0)<5)throw new Error("class PDF font too small: "+JSON.stringify(state.fit.classFeatures));
 console.log(JSON.stringify({
   pass:true,
   fit:state.fit,
   speciesChars:species.length,
   classChars:classText.length,
   species,
   classText
 },null,2));
})().catch(e=>{console.error(e);process.exit(1)});

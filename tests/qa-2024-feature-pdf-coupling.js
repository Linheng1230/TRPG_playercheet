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
 const state=await page.evaluate(()=>{
   const cls=S.cls.n,p=prog(),sub=p.subs[S.sub],rules=[];
   for(const [subName,levels] of [["",p.f],[sub.n,sub.f]])for(const [lv,raw] of Object.entries(levels||{})){
    if(+lv>S.level)continue;
    for(const name of String(raw).split("、")){
     const key=name.split("(")[0].trim().replace(/^武器掌握增至\s*\d+\s*種$/,"武器掌握");
     const rule=window.resolveFeatureRule2024(cls,subName,key,+lv);
     if(rule)rules.push({key:[cls,subName,key,lv].join("|"),text:canonicalClassTermText5R(rule)});
    }
   }
   return {fit:window.__lastPdfFitReport,expectedRules:rules};
 });
 await browser.close();
 if(errs.length)throw new Error("page errors: "+errs.join(" | "));
 for(const [name,result] of Object.entries(state.fit||{}))if(result?.overflow)throw new Error("PDF overflow: "+name+" "+JSON.stringify(result));
 if(!state.fit?.classFeatures?.blockSplit&&!state.fit?.classFeatures?.continued)throw new Error("class feature PDF did not split on Feature block boundaries");
 const doc=await PDFLib.PDFDocument.load(fs.readFileSync(output));const form=doc.getForm();
  // Check rendered widget appearance, not just the stored field text.
  for(const fieldName of ['class-a-1','class-a-2',...form.getFields().map(f=>f.getName()).filter(n=>n.startsWith('5r-appendix-'))]){
    const widget=form.getTextField(fieldName).acroField.getWidgets()[0];
    const stream=doc.context.lookup(widget.getAppearances().normal);
    const appearance=Buffer.from(PDFLib.decodePDFRawStream(stream).decode()).toString('latin1');
    const baselines=[...appearance.matchAll(/1 0 0 1 [0-9.-]+ ([0-9.-]+) Tm/g)].map(m=>Number(m[1]));
    if(!baselines.length || baselines.some(y=>y<1 || y>widget.getRectangle().height))
      throw new Error('Clipped class feature appearance: '+fieldName+' '+baselines.join(','));
  }

 const species=form.getTextField("speice-trat").getText()||"";
 const appendix=form.getFields().filter(f=>f.getName().startsWith("5r-appendix-class-features-")).map(f=>f.getText()||"");
 const classText=appendix.length?appendix.join("\n"):((form.getTextField("class-a-1").getText()||"")+"\n"+(form.getTextField("class-a-2").getText()||""));
 if(state.fit.classFeatures.continued&&appendix.length!==state.fit.classFeatures.appendixPages)throw new Error("PDF continuation count drift");
 const norm=s=>String(s||"").replace(/\s+/g,"");
 const speciesNorm=norm(species),classNorm=norm(classText);
 const mustSpecies=["石中精妙","附贈動作","60呎","震顫感知","10分鐘","熟練加值","長休"];
 const mustClass=["靈能力量","遊蕩者3級：靈能骰d6，共4枚","完成一次短休時也會重獲一枚已消耗的靈能骰","完成一次長休時重獲所有已消耗的靈能骰","靈振訣竅","心靈低語","念刃","1d6點心靈傷害","附加用於該次攻擊檢定的屬性調整值","60/120呎","侵擾","此附贈攻擊的傷害骰為1d4"];
 if(state.expectedRules.length<6)throw new Error("Too few canonical rules resolved");
 for(const {key,text} of state.expectedRules)if(!classNorm.includes(norm(text)))throw new Error("PDF canonical rule omitted or truncated: "+key);
 for(const t of mustSpecies)if(!speciesNorm.includes(norm(t)))throw new Error("species PDF missing: "+t+"\n"+species);
 for(const t of mustClass)if(!classNorm.includes(norm(t)))throw new Error("class PDF missing: "+t+"\n"+classText);
 if(species.includes("你讓感官沉入"))throw new Error("PDF should omit flavor prose to preserve space");
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

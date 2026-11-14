const {chromium}=require("playwright");const fs=require("fs");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome",acceptDownloads:true});
 const p=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];p.on("pageerror",e=>errors.push(e.message));p.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await p.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html"),{waitUntil:"networkidle"});
 if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
 const runtime=await p.evaluate(()=>({script:[...document.scripts].map(s=>s.src).find(x=>x.includes("character-sheet-export.js"))||"",exporterHasBake:String(window.exportOfficialCharacterSheet||"").includes("bakeCritical2024")}));
 const state=await p.evaluate(()=>{
   resetAll();S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="遊蕩者");S.level=3;S.classLevels={"遊蕩者":3};
   S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.bg=BACKGROUNDS.find(x=>x.n==="罪犯")||BACKGROUNDS[0];
   S.gear=Object.assign({armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}},S.gear||{});
   S.bio={look:"85歲男性矮人，身材矮壯結實，灰白色長髮與濃密鬍鬚。",traits:"熱愛鋼鐵與鍛造工藝，追尋各式武器並研究其造型與工藝。",story:"離開熟悉的鍛造生活後踏上旅途，為的是尋找新的武器工藝與靈感，並在冒險中磨練自己。這段旅程也讓他逐漸理解武器不只是工具，而是承載製作者意志與使用者故事的作品。",allies:"",notes:""};
   S.base={str:12,dex:18,con:14,int:10,wis:13,cha:11};S.skills=new Set(["雜技","巧手","隱匿","調查"]);S.expertise=new Set(["巧手","隱匿"]);
   document.querySelector("#fName").value="索倫・心鑄";document.querySelector("#fPlayer").value="子子";
   const save=serialize();save.meta.align="混亂善良";deserialize(save);
   return {align:document.querySelector("#fAlign").value,prof:proficiencySummary14()};
 });
 const dlPromise=p.waitForEvent("download");
 await p.evaluate(()=>exportOfficialCharacterSheet());
 const dl=await dlPromise;const out="D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/pdf-export-fix-smoke.pdf";await dl.saveAs(out);
 const fit=await p.evaluate(()=>window.__lastPdfFitReport);const bake=await p.evaluate(()=>window.__lastPdfCriticalBake);
 const b64=fs.readFileSync(out).toString("base64");
 const fields=await p.evaluate(async b64=>{
   const bin=atob(b64),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
   const d=await PDFLib.PDFDocument.load(u),f=d.getForm();
   const txt=n=>{try{return f.getTextField(n).getText()||""}catch(e){return ""}};
   const chk=n=>{try{return f.getCheckBox(n).isChecked()}catch(e){return null}};
   return {Ali:txt("Ali"),species:txt("speice-trat"),bg:txt("BG_AND_PER"),light:chk("light"),medium:chk("medium"),heavy:chk("heavy"),shieldProf:chk("shld_pro")};
 },b64);
 await b.close();
 const pass=!errors.length&&runtime.script.includes("character-sheet-export.js?v=")&&runtime.exporterHasBake&&state.align==="混沌善良"&&/輕甲/.test(String(state.prof?.armor||""))&&bake?.alignment===true&&bake?.light===true&&bake?.medium===true&&bake?.heavy===true&&bake?.shield===true&&fields.Ali===""&&fields.light===null&&fields.medium===null&&fields.heavy===null&&fields.shieldProf===null&&!/[•?]/.test(fields.species)&&fit?.background?.size>=5.5&&!fit?.background?.overflow;
 const result={errors,runtime,state,fit,bake,fields:{...fields,species:fields.species.slice(0,900),bg:fields.bg.slice(0,900)},pass,pdf:out};
 fs.writeFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/qa-pdf-export-fixes.json",JSON.stringify(result,null,2),"utf8");
 console.log(JSON.stringify(result,null,2));process.exit(pass?0:1);
})().catch(e=>{console.error(e);process.exit(2)});

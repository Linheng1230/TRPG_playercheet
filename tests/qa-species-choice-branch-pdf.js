"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const PDFLib=require(path.resolve(__dirname,"../assets/vendor/pdf-lib.min.js"));
const base=process.env.QA_URL||"http://127.0.0.1:19991/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage({acceptDownloads:true});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 const samples=[
  {sp:"精靈",key:"eLine",choice:"卓爾",include:["120呎","已選：卓爾"],exclude:["35呎","你的速度提升至35呎"]},
  {sp:"精靈",key:"eLine",choice:"木精靈",include:["35呎","已選：木精靈"],exclude:["120呎","你的黑暗視覺提升至120呎"]},
  {sp:"侏儒",key:"gLine",choice:"岩石侏儒",include:["已選：岩石侏儒"],exclude:["次級幻象"]},
  {sp:"提夫林",key:"fLine",choice:"深淵",include:["已選：深淵"],exclude:["黯蝕傷害的抗性"]},
  {sp:"歌利亞",key:"giant",choice:"霜巨人的寒意",include:["已選：霜之刺骨（霜巨人）"],exclude:["以一個附贈動作"]},
  {sp:"龍裔",key:"dAnc",choice:"黑龍",include:["已選：黑龍","強酸"],exclude:["閃電","寒冷"]}
 ];
 try{
  await page.goto(base,{waitUntil:"domcontentloaded"});
  fs.mkdirSync(path.resolve(__dirname,"../tmp"),{recursive:true});
  for(const spec of samples){
   await page.evaluate(s=>{
    S.ruleset="2024";syncRulesetUI();
    S.sp=SPECIES_2024.find(x=>x.n===s.sp);
    S.spChoices={[s.key]:s.choice};
    S.cls=CLASSES.find(x=>x.n==="德魯伊");
    S.level=4;S.classLevels={"德魯伊":4};S.sub=null;
    S.bg=BACKGROUNDS_2024[0];
    S.base={str:12,dex:14,con:14,int:12,wis:17,cha:10};
    S.skills=new Set();S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};
    S.bio={look:"",traits:"",story:"",allies:"",notes:""};
    document.getElementById("fName").value="物種血系 PDF 驗收";
   },spec);
   const promise=page.waitForEvent("download",{timeout:60000});
   await page.evaluate(()=>exportOfficialCharacterSheet());
   const dl=await promise;
   const file=path.resolve(__dirname,"../tmp/qa-species-branch-"+spec.sp+"-"+spec.choice+".pdf");
   await dl.saveAs(file);
   const doc=await PDFLib.PDFDocument.load(fs.readFileSync(file));
   const text=doc.getForm().getTextField("speice-trat").getText()||"";
   const cleaned=text.replace(/[：:]/g,":").replace(/\s+/g,"");
   const fit=await page.evaluate(()=>window.__lastPdfFitReport?.species||null);
   for(const x of spec.include)assert(cleaned.includes(x.replace(/[：:]/g,":").replace(/\s+/g,"")),spec.sp+" "+spec.choice+" PDF missing "+x+" "+text.slice(0,650));
   for(const x of spec.exclude)assert(!cleaned.includes(x.replace(/\s+/g,"")),spec.sp+" "+spec.choice+" PDF includes sibling "+x);
   assert(fit&&!fit.overflow,spec.sp+" "+spec.choice+" PDF field overflow "+JSON.stringify(fit));
   assert(!/<(?:div|span|li)\b/.test(text),spec.sp+" PDF raw HTML leak");
   console.log("PASS species PDF",spec.sp,spec.choice,JSON.stringify({chars:text.length,font:fit.size,overflow:fit.overflow}));
  }
  assert.deepEqual(errors,[]);
  console.log("PASS 6 actual species choice PDF exports");
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

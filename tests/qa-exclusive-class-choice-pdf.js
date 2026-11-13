"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const PDFLib=require(path.resolve(__dirname,"../assets/vendor/pdf-lib.min.js"));
const pageUrl=process.env.QA_URL||"http://127.0.0.1:19876/index.html";
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const ctx=await browser.newContext({acceptDownloads:true});
  const page=await ctx.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  try{
    await page.goto(pageUrl,{waitUntil:"networkidle"});
    for(const [cls,lv,field,option,must,exclude,sub] of [
      ["德魯伊",4,"primalOrder","魔法師","奧秘和自然","中甲受訓",""],
      ["德魯伊",4,"primalOrder","守望者","中甲受訓","奧秘和自然",""],
      ["牧師",3,"divineOrder","奇術師","奧秘和宗教","重甲受訓",""],
      ["遊俠",3,"hunterPrey","巨像屠夫","1d8","另一個尚未被","獵人"],
      ["野蠻人",6,"wildAspect","黑豹","攀爬速度","黑暗視覺","野心之道"],
      ["法師",10,"thirdEye","識破隱形","不消耗法術位","120呎黑暗視覺","預言師"],
      ["野蠻人",3,"onuse","未選","每次啟動狂暴時","<div","野心之道"],
      ["德魯伊",3,"onuse","未選","每次進入星辰形態","<div","星辰結社"],
      ["吟遊詩人",3,"onuse","未選","詩人激勵骰","<div","勇氣學院"]
    ]){
      const state=await page.evaluate(({cls,lv,field,option,sub})=>{
        document.querySelector("#rulesetModal")?.classList.remove("open");
        resetAll();S.ruleset="2024";syncRulesetUI();
        S.cls=CLASSES.find(x=>x.n===cls);S.level=lv;S.classLevels={[cls]:lv};
        S.sub=sub?PROG_2024[cls].subs.findIndex(x=>x.n===sub):null;
        S.sp=SPECIES_2024[0];S.bg=BACKGROUNDS_2024[0];
        S.base={str:13,dex:12,con:14,int:13,wis:17,cha:11};
        S.skills=new Set(["奧秘"]);S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};
        S.bio={look:"",traits:"",story:"",allies:"",notes:""};
        S.classChoices2024={};S.asi={};S.divineOrder="";S.primalOrder="";S.blessed="";S.efury="";
        if(["hunterPrey","wildAspect","thirdEye"].includes(field))classChoiceStore2024(cls)[field]=option;else if(field!=="onuse")S[field]=option;
        document.getElementById("fName").value="測試角色";
        update();
        const summary=classChoiceSummary2024(cls);
        return {summary,selected:option};
      },{cls,lv,field,option,sub});
      assert(!state.summary.some(x=>x.includes("<div")||x.includes("<span")),cls+" summary contains HTML");
      const waiting=page.waitForEvent("download",{timeout:60000});
      await page.evaluate(()=>exportOfficialCharacterSheet());
      const dl=await waiting;
      const fit=await page.evaluate(()=>window.__lastPdfFitReport);
      assert(!Object.entries(fit||{}).some(([,value])=>value?.overflow),cls+" "+field+" PDF overflow");
      const dest=path.resolve(__dirname,"../tmp/qa-exclusive-choice-"+field+"-"+option+".pdf");
      fs.mkdirSync(path.dirname(dest),{recursive:true});await dl.saveAs(dest);
      const doc=await PDFLib.PDFDocument.load(fs.readFileSync(dest));
      const form=doc.getForm(),all=(form.getTextField("class-a-1").getText()||"")+(form.getTextField("class-a-2").getText()||"");
      const compact=t=>t.replace(/\s+/g,"");
      assert(compact(all).includes(compact(must)),cls+" "+option+" missing chosen PDF mechanic: "+all.slice(0,500));
      assert(!compact(all).includes(compact(exclude)),cls+" "+option+" gained unselected PDF mechanic");
      assert(!/<(?:div|span|li)\b/i.test(all),cls+" "+option+" leaked HTML into PDF");
      console.log("PASS PDF choice",cls,option);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

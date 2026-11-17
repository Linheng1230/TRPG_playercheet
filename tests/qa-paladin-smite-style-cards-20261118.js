"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18876/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const results=[];
 try{
  for(const width of [390,1440]){
   const p=await browser.newPage({viewport:{width,height:width===390?844:900}});
   const pageErrors=[];p.on("pageerror",e=>pageErrors.push(e.message));
   await p.goto(URL,{waitUntil:"networkidle"});
   const r=await p.evaluate(()=>{
    const errors=[],check=(cond,what)=>{if(!cond)errors.push(what)};
    const fresh=(name,lv,sub="")=>{
     resetAll();S.ruleset="2024";syncRulesetUI();
     S.cls=CLASSES.find(x=>x.n===name);S.level=lv;S.classLevels={[name]:lv};
     S.sub=sub?PROG_2024[name].subs.findIndex(x=>x.n===sub):null;
     S.classChoices2024={};S.asi={};S.asiByClass={};S.classSubs={};S.spellByClass={};
     S.style="";S.styleCantrips2024=[];S.mastery=new Set();S.cantrips=new Set();S.prepared=new Set();S.spellbook=new Set();
     S.metamagic=new Set();S.invocations=new Set();S.expertise=new Set();
     S.bg=BACKGROUNDS_2024[0];S.sp=SPECIES_2024[0];S.spChoices={};S.bgChoice2024={tool:""};
     S.bonusMode="21";S.bonus={b2:"wis",b1:"con",c1:"",c2:"",c3:""};
     S.base={str:13,dex:14,con:14,int:10,wis:12,cha:16};S.skills=new Set();
     S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};
     S.bio={look:"",traits:"",story:"",allies:"",notes:""};
     document.getElementById("fName").value="QA";document.getElementById("fPlayer").value="QA";
    };
    const key="聖武士||聖光揮擊|2";
    const m=globalThis.ZIZI_5R_FEATURE_NAMES?.[key];
    check(m?.zh==="聖武斬"&&m?.en==="Paladin's Smite","class feature bilingual identity");
    check(displayFeatureLabel5R("聖武士","","聖光揮擊",2)==="聖武斬 Paladin's Smite","class feature display label");
    check(globalThis.ZIZI_5R_CANONICAL_NAMES?.spells?.["Divine Smite"]==="至聖斬","spell canonical identity unchanged");
    const all=[...FSTYLES,...Object.values(CLASS_STYLE_EXTRAS_2024).flat()];
    const styleCards=all.map(st=>{
      const outer=document.createElement("div");outer.innerHTML=fightingStyleRefSpan2024(st.n);
      const el=outer.querySelector(".ft[data-tip]");
      const want=st.id?globalThis.ZIZI_5R_FEAT_RULES?.[st.id]?.text:st.d;
      check(!!el&&!!want&&el.dataset.tip===want&&el.getAttribute("role")==="button","style card "+st.n);
      return {name:st.n,chars:el?.dataset.tip?.length||0};
    });
    fresh("聖武士",2);S.style="防禦";renderFinal();
    let nodes=[...document.querySelectorAll("#finalSheet .ft[data-tip]")];
    check(nodes.some(el=>el.textContent.includes("聖武斬 Paladin's Smite")),"Paladin Lv2 rendered class feature title");
    check(nodes.some(el=>el.textContent.includes("防禦")&&el.dataset.tip===globalThis.ZIZI_5R_FEAT_RULES["defense"].text),"Paladin Lv2 selected style full canonical tooltip");
    const saved=serialize(),d=deserialize(JSON.parse(JSON.stringify(saved)));
    renderFinal();
    check(d?.ok&&S.style==="防禦"&&document.querySelector("#finalSheet .ft[data-tip-title='防禦']"),"Paladin style JSON roundtrip");
    renderLevel();
    check(document.querySelectorAll(".style-rule-guide .ft[data-tip]").length>=11,"Paladin creator all styles help");
    const expected=[["戰士",1,10],["遊俠",2,11]];
    for(const [name,lv,count] of expected){
     fresh(name,lv);S.style="防禦";renderLevel();
     check(document.querySelectorAll(".style-rule-guide .ft[data-tip]").length>=count,name+" creator style list");
     renderFinal();
     check([...document.querySelectorAll("#finalSheet .ft[data-tip]")].some(el=>el.textContent.includes("防禦")),"final style "+name);
    }
    fresh("戰士",7,"冠軍");S.style="防禦";classChoiceStore2024("戰士").championStyle="雙武器戰鬥";renderFinal();
    check([...document.querySelectorAll("#finalSheet .ft[data-tip]")].some(el=>el.textContent.includes("雙武器戰鬥")),"Champion additional style");
    renderClassChoices2024("戰士",7);
    check(renderClassChoices2024("戰士",7).includes("data-tip="),"Champion creator chosen style tooltip");
    for(const [name,choice] of [["聖武士","受祝福的勇士"],["遊俠","德魯伊教戰士"]]){
      fresh(name,2);S.style=choice;renderFinal();
      check([...document.querySelectorAll("#finalSheet .ft[data-tip]")].some(el=>el.textContent.includes(choice)),"special style "+choice);
    }
    // Check pinned feature popup uses same renderer, not a distinct style modal.
    fresh("聖武士",2);S.style="防禦";renderFinal();
    const node=[...document.querySelectorAll("#finalSheet .ft[data-tip]")].find(el=>el.dataset.tipTitle==="防禦");
    if(node){placeFeatureTip(node,true);
      const rect=featureTip.getBoundingClientRect();
      check(rect.left>=-1&&rect.right<=innerWidth+1&&!featureTip.hidden,"pinned popup viewport");
      check(featureTip.scrollWidth<=featureTip.clientWidth+1,"pinned popup horizontal overflow");
      closeAllRulePopovers();
    }
    return {errors,styleCards,paladinFeature:m,paladinSpell:globalThis.ZIZI_5R_CANONICAL_NAMES.spells["Divine Smite"]};
   });
   results.push({width,pageErrors,...r});
   await p.close();
  }
 }finally{await browser.close()}
 console.log(JSON.stringify(results,null,2));
 assert(results.every(r=>!r.errors.length&&!r.pageErrors.length),"Fighting style/smite targeted QA failed");
})().catch(e=>{console.error(e);process.exit(1)});

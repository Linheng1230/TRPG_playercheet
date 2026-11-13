"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {pathToFileURL}=require("node:url");
const path=require("node:path");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(String(e)));
  await page.goto(pathToFileURL(path.resolve(__dirname,"../index.html")).href+"?qa-exclusive-feature=1",{waitUntil:"domcontentloaded"});
  const result=await page.evaluate(()=>{
   const problems=[],cases=[];
   const check=(condition,label,detail="")=>{cases.push(label);if(!condition)problems.push({label,detail})};
   const fresh=(name,lv,sub="")=>{
    resetAll();
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n===name);S.level=lv;S.classLevels={[name]:lv};
    S.sub=sub?PROG_2024[name].subs.findIndex(x=>x.n===sub):null;
    S.classChoices2024={};S.asi={};S.asiByClass={};S.classSubs={};S.spellByClass={};
    S.boon="";S.boonAb="";S.boonChoices={energy:[],skill:""};S.style="";S.styleCantrips2024=[];
    S.mastery=new Set();S.primalSkill="";S.cantrips=new Set();S.spellbook=new Set();S.prepared=new Set();S.customSpells=[];
    S.metamagic=new Set();S.invocations=new Set();S.expertise=new Set();S.divineOrder="";S.primalOrder="";S.blessed="";S.efury="";
    S.featSpells={};S.originFeatChoices={};S.spChoices={};S.bgChoice2024={tool:""};S.languageChoices={};
    S.bg=BACKGROUNDS_2024[0];S.sp=SPECIES_2024[0];
    S.bonusMode="21";S.bonus={b2:"wis",b1:"con",c1:"",c2:"",c3:""};
    S.base={str:13,dex:14,con:13,int:12,wis:15,cha:11};S.skills=new Set();
    S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};
    S.bio={look:"QA",traits:"QA",story:"QA",allies:"",notes:""};S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};
    document.getElementById("fName").value="QA角色";document.getElementById("fPlayer").value="QA玩家";
   };
   const card=k=>document.querySelector('.choice-feature-card[data-chosen-feature="'+k+'"]');
   const tip=key=>{const arr=[...document.querySelectorAll("#finalSheet .ft[data-tip]")];return arr.find(x=>x.textContent.includes(key))?.dataset.tip||""};
   const checkCase=(cls,lv,field,options,feature,allowed,forbidden,sub="")=>{
    for(const opt of options){
     fresh(cls,lv,sub);
     if(field==="hunterPrey"||field==="hunterDefense")classChoiceStore2024(cls)[field]=opt;
     else S[field]=opt;
     renderFinal();
     const box=card(feature),text=box?.textContent||"";
     check(!!box,cls+" "+feature+" "+opt+" card");
     const at=feature==="原初秩序"||feature==="神聖秩序"?1:feature==="獵手的殺技"?3:7;
     const spec=exclusiveChoiceSpec5R(cls,sub,feature,at),canon=canonicalChoiceSplit5R(cls,sub,feature,at),idx=spec?.options.findIndex(x=>x.n===opt);
     const actualFull=box?.querySelector(".ft[data-tip]")?.dataset.tip||"";
     check(!!canon&&idx>=0&&actualFull.includes(canon.effects[idx])&&!actualFull.includes(canon.effects[1-idx]),cls+" "+opt+" uses only full canonical branch",actualFull.slice(0,200));
     check(text.includes(allowed[opt]),cls+" "+opt+" selected effect",text.slice(0,250));
     check(!text.includes(forbidden[opt]),cls+" "+opt+" excluded effect",text.slice(0,250));
     const parent=tip(displayFeatureName5R(cls,sub,feature,feature==="原初秩序"||feature==="神聖秩序"?1:feature==="獵手的殺技"?3:7));
     check(parent.includes("二選一")&&!parent.includes(forbidden[opt]),cls+" "+feature+" parent not flattened",parent.slice(0,200));
     const saved=JSON.parse(JSON.stringify(serialize())),read=deserialize(saved);
     check(read.ok,cls+" "+opt+" JSON roundtrip");
     renderFinal();check(!!card(feature)&&card(feature).dataset.chosenOption===opt,cls+" "+opt+" rerender");
    }
   };
   checkCase("德魯伊",4,"primalOrder",["魔法師","守望者"],"原初秩序",{"魔法師":"德魯伊法術列表","守望者":"中甲"},{"魔法師":"軍用武器","守望者":"奧秘"});
   checkCase("牧師",4,"divineOrder",["奇術師","衛道者"],"神聖秩序",{"奇術師":"牧師法術列表","衛道者":"重甲"},{"奇術師":"軍用武器","衛道者":"宗教"});
   checkCase("牧師",14,"blessed",["神聖打擊","強效施法"],"受祝打擊",{"神聖打擊":"2d8","強效施法":"臨時生命值"},{"神聖打擊":"牧師戲法的傷害","強效施法":"武器攻擊"});
   checkCase("德魯伊",15,"efury",["強效施法","原初打擊"],"元素之怒",{"強效施法":"300呎","原初打擊":"2d8"},{"強效施法":"獸形攻擊","原初打擊":"戲法的傷害"});
   checkCase("遊俠",3,"hunterPrey",["巨像屠夫","滅族者"],"獵手的殺技",{"巨像屠夫":"1d8","滅族者":"額外攻擊"},{"巨像屠夫":"另一個尚未","滅族者":"生命值未滿"},"獵人");
   checkCase("遊俠",7,"hunterDefense",["衝出重圍","多重防禦"],"防禦戰術",{"衝出重圍":"藉機攻擊","多重防禦":"其他攻擊"},{"衝出重圍":"後續","多重防禦":"藉機攻擊"},"獵人");
   for(const id of Object.keys(EXCLUSIVE_RULE_ANCHORS_5R)){const [cls,sub,key,lv]=id.split("|"),parts=canonicalChoiceSplit5R(cls,sub,key,+lv),raw=window.resolveFeatureRule2024(cls,sub,key,+lv);const norm=v=>String(v||"").replace(/\s+/g,"");check(!!parts&&parts.effects.every(Boolean)&&norm(parts.intro+" "+parts.effects.join(" "))===norm(raw),"canonical source split "+id);}
   // Nested choices omitted by upstream flattening: verify generated pinned 5RTools projection.
   const nested=window.ZIZI_5R_NESTED_CHOICE_RULES||{};
   check(Object.keys(nested).length===3,"pinned nested map includes 3 Wild Heart traits");
   for(const key of Object.keys(nested)){
     check(nested[key].options?.length===3&&nested[key].options.every(x=>!!x.name&&!!x.text),"source has 3 complete choices "+key);
   }
   for(const opt of ["貓頭鷹","黑豹","鮭魚"]){
     fresh("野蠻人",6,"野心之道");classChoiceStore2024("野蠻人").wildAspect=opt;renderFinal();
     const box=card("荒野形貌"),source=nested["野蠻人|野心之道|荒野形貌|6"],idx=source.options.findIndex(x=>x.name===opt);
     check(!!box&&box.dataset.chosenOption===opt,"barbarian aspect chosen "+opt);
     check(idx>=0&&box?.querySelector(".ft")?.dataset.tip===source.options[idx].text,"barbarian aspect canonical chosen only "+opt);
     check(source.options.every((row,i)=>i===idx||!box?.querySelector(".ft")?.dataset.tip.includes(row.text)),"barbarian aspect not blended "+opt);
     const restored=deserialize(JSON.parse(JSON.stringify(serialize())));renderFinal();
     check(restored.ok&&card("荒野形貌")?.dataset.chosenOption===opt,"barbarian aspect roundtrip "+opt);
   }
   for(const opt of THIRD_EYE_2024){
     fresh("法師",10,"預言師");classChoiceStore2024("法師").thirdEye=opt;renderFinal();
     const box=card("天眼通"),rule=canonicalChoiceSplit5R("法師","預言師","天眼通",10),idx=THIRD_EYE_2024.indexOf(opt);
     check(!!box&&box.dataset.chosenOption===opt,"diviner chosen "+opt);
     check(idx>=0&&box?.querySelector(".ft")?.dataset.tip.includes(rule.effects[idx]),"diviner chosen source "+opt);
     check(rule.effects.every((x,i)=>i===idx||!box?.querySelector(".ft")?.dataset.tip.includes(x)),"diviner no false grants "+opt);
     const restored=deserialize(JSON.parse(JSON.stringify(serialize())));renderFinal();
     check(restored.ok&&card("天眼通")?.dataset.chosenOption===opt,"diviner roundtrip "+opt);
   }
   const dynamicCases=[
     ["野蠻人",3,"野心之道","荒野之怒",3],
     ["野蠻人",14,"野心之道","荒野偉力",3],
     ["德魯伊",3,"星辰結社","星辰形態",3],
     ["吟遊詩人",3,"勇氣學院","戰鬥激勵",2],
     ["術士",14,"異怪心靈","血肉啟示",4],
     ["邪術師",6,"至高妖精宗主","迷霧遁走",2]
   ];
   for(const [cls,lv,sub,key,count] of dynamicCases){
     fresh(cls,lv,sub);renderFinal();
     const menu=choiceOnUseSpec5R(cls,sub,key,lv),box=document.querySelector('.choice-menu-card[data-use-time-feature="'+key+'"]');
     check(!!menu&&!menu.error&&menu.options?.length===count,cls+" "+key+" has distinct alternatives");
     check(!!box&&box.querySelectorAll(".choice-menu-option").length===count,cls+" "+key+" inline option cards");
     check(menu?.options?.every(x=>box?.textContent.includes(x.n)),cls+" "+key+" all option labels");
     check(!card(key),cls+" "+key+" not a permanently selected benefit");
     check((choiceOnUseRuleText5R(cls,sub,key,lv)||"").includes("不代表全部"),cls+" "+key+" explicitly non automatic");
   }
   // Multi-learn options: only learned maneuvers/metamagic show individual complete rule cards.
   fresh("戰士",3,"戰鬥大師");
   const fighterStore=classChoiceStore2024("戰士");
   fighterStore.maneuvers=MANEUVERS_2024.slice(0,3);
   renderFinal();
   const fighterCards=[...document.querySelectorAll('.learned-choice-cards[data-learned-kind="maneuvers"] [data-learned-option]')];
   check(fighterCards.length===3,"fighter 3 selected maneuver cards");
   check(fighterCards.every(el=>window.ZIZI_5R_MANEUVERS[el.dataset.learnedOption]===el.querySelector(".ft")?.dataset.tip),"fighter cards from canonical maneuvers");
   check(!document.querySelector('[data-learned-option="'+MANEUVERS_2024[3]+'"]'),"fighter unlearned maneuver hidden");
   let round=deserialize(JSON.parse(JSON.stringify(serialize())));renderFinal();
   check(round.ok&&document.querySelectorAll('.learned-choice-cards[data-learned-kind="maneuvers"] [data-learned-option]').length===3,"fighter selected cards roundtrip");
   fresh("術士",2);S.metamagic=new Set(METAMAGIC.slice(0,2).map(x=>x.n));renderFinal();
   const metaCards=[...document.querySelectorAll('.learned-choice-cards[data-learned-kind="metamagic"] [data-learned-option]')];
   check(metaCards.length===2,"sorcerer 2 selected metamagic cards");
   check(metaCards.every(el=>el.querySelector(".ft")?.dataset.tip===activeOptionText5R("metamagic",el.dataset.learnedOption)),"sorcerer metamagic source rule text");
   check(!document.querySelector('[data-learned-option="'+METAMAGIC[2].n+'"]'),"sorcerer unlearned metamagic hidden");
   round=deserialize(JSON.parse(JSON.stringify(serialize())));renderFinal();
   check(round.ok&&document.querySelectorAll('.learned-choice-cards[data-learned-kind="metamagic"] [data-learned-option]').length===2,"sorcerer selected cards roundtrip");
   fresh("德魯伊",4);renderFinal();
   check(!card("原初秩序"),"no-choice must not grant subcard");
   check(tip("原初職能").includes("尚未選擇"),"no-choice parent explicit");
   fresh("德魯伊",15);S.efury="強效施法";renderFinal();
   check(tip("元素神威").replace(/\s+/g,"").includes("300呎")&&!tip("元素神威").includes("2d8"),"druid enhancer choice-specific");
   fresh("牧師",14);S.blessed="神聖打擊";renderFinal();
   const clericEnh=featSpan("強化受祝打擊",{cls:"牧師",sub:"",lv:14});check(clericEnh.includes("2d8")&&!clericEnh.includes("臨時生命值"),"cleric enhancer choice-specific",clericEnh);
   for(const cls of Object.keys(PROG_2024)){fresh(cls,3);renderFinal();check(!document.querySelector("#finalSheet .choice-feature-card"),"12-class unselected "+cls)}
   fresh("德魯伊",4);S.primalOrder="魔法師";renderFinal();
   const width=document.documentElement.scrollWidth;check(width<=innerWidth+1,"mobile width 390",width);
   return {count:cases.length,problems,classes:Object.keys(PROG_2024).length};
  });
  assert.deepEqual(pageErrors,[],"Browser script errors");
  assert.deepEqual(result.problems,[],"Choice parent/child UI regression");
  console.log("PASS 5R class choice cards",JSON.stringify({checks:result.count,classes:result.classes}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

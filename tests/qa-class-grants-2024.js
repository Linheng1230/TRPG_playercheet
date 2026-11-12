"use strict";
const assert=require("assert");
const fs=require("fs");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18767/index.html";
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 const pageErrors=[];page.on("pageerror",e=>pageErrors.push(String(e)));
 await page.goto(URL+"?qa-class-grants-2024=1",{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const out=await page.evaluate(()=>{
  const failures=[],report={};
  const ok=(cond,label,detail={})=>{if(!cond)failures.push({label,detail})};
  const fresh=(name,lv,subName=null)=>{
   resetAll();S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n===name);S.level=lv;S.classLevels={[name]:lv};
   const p=PROG_2024[name];S.sub=subName?p.subs.findIndex(x=>x.n===subName):null;
   S.classChoices2024={};S.asi={};S.asiByClass={};S.classSubs={};S.spellByClass={};
   S.boon="";S.boonAb="";S.boonChoices={energy:[],skill:""};S.style="";S.styleCantrips2024=[];
   S.mastery=new Set();S.primalSkill="";S.cantrips=new Set();S.spellbook=new Set();S.prepared=new Set();S.customSpells=[];
   S.metamagic=new Set();S.invocations=new Set();S.expertise=new Set();S.divineOrder="";S.primalOrder="";S.blessed="";S.efury="";
   S.featSpells={};S.originFeatChoices={};S.spChoices={};S.bgChoice2024={tool:""};S.languageChoices={};
   S.bg=BACKGROUNDS_2024[0];S.sp=SPECIES_2024[0];S.bonusMode="21";S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};
   S.base={str:12,dex:13,con:13,int:13,wis:17,cha:11};S.skills=new Set();
   S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};
   S.bio={look:"QA",traits:"QA",story:"QA",allies:"",notes:""};S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};
   for(const id of ["fName","fPlayer","fFaith","fGender","fAge"])document.getElementById(id).value="QA";
   document.getElementById("fAlign").value="絕對中立";
  };
  // Real user case: Druid 3 / Circle of the Stars / Hermit.
  fresh("德魯伊",3,"星辰結社");S.bg=BACKGROUNDS_2024.find(x=>x.n==="隱士");
  S.bonusMode="21";S.bonus={b2:"wis",b1:"con",c1:"",c2:"",c3:""};S.primalOrder="魔法師";
  renderFinal();renderSpells();
  const dg=grantedSpells2024().map(x=>x.n),ds=classChoiceSummary2024("德魯伊");
  ok(finalScore("con")===14&&finalScore("wis")===19,"druid-final-abilities",{con:finalScore("con"),wis:finalScore("wis")});
  ok(abilityScoreBreakdown("wis").includes("基礎 17")&&abilityScoreBreakdown("wis").includes("背景 +2"),"druid-wis-breakdown",{v:abilityScoreBreakdown("wis")});
  ok(["動物交談","神導術","曳光彈"].every(n=>dg.includes(n)),"druid-fixed-grants",{dg});
  ok(S.primalOrder==="魔法師"&&ds.some(x=>x.includes("原初")&&x.includes("術師")),"druid-primal-order",{state:S.primalOrder,ds});
  report.druid={con:finalScore("con"),wis:finalScore("wis"),grants:dg,summary:ds};

  // Lore Bard: class-granted skills and Magical Discoveries are real derived state.
  fresh("吟遊詩人",6,"傳識學院");let st=classChoiceStore2024("吟遊詩人");
  const loreOpts=classSkillChoiceOptions2024([],ALL_SKILLS).slice(0,3);st.loreSkills=loreOpts;
  const mdOpts=classChoiceSpellOptions2024("CDW",castInfo()?.max||3);st.magicalDiscoveries=mdOpts.slice(0,2);
  const bardSkills=featSkillState2024().skills,bg=grantedSpells2024().map(x=>x.n);
  ok(loreOpts.every(x=>bardSkills.has(x)),"lore-skills-derived",{loreOpts,have:[...bardSkills]});
  ok(st.magicalDiscoveries.every(x=>bg.includes(x)),"lore-discoveries-granted",{want:st.magicalDiscoveries,have:bg});
  report.lore={skills:loreOpts,discoveries:st.magicalDiscoveries};

  // Gloom Stalker Iron Mind: WIS normally, alternate INT/CHA only if WIS is already proficient.
  fresh("遊俠",7,"幽域追獵者");let saves=saveProfSet();
  ok(saves.has("wis"),"gloom-default-wis",{saves:[...saves]});
  const resilient=GFEATS.find(x=>x.save&&Array.isArray(x.ab)&&x.ab.includes("wis"));
  if(resilient){S.asi={4:{t:"feat",feat:resilient.n,featAb:"wis"}};classChoiceStore2024("遊俠").ironMindSave="智力";saves=saveProfSet();ok(saves.has("wis")&&saves.has("int"),"gloom-alt-int",{feat:resilient.n,saves:[...saves]})}
  report.gloom={saves:[...saves]};

  // Fixed subclass choices do not project illegal stale values.
  fresh("野蠻人",3,"狂熱者之道");st=classChoiceStore2024("野蠻人");st.zealotDamage="火焰";
  ok(!classChoiceSummary2024("野蠻人").some(x=>x.includes("火焰")),"zealot-illegal-inert",{summary:classChoiceSummary2024("野蠻人")});
  st.zealotDamage="光耀";ok(classChoiceSummary2024("野蠻人").some(x=>x.includes("光耀")),"zealot-legal-summary",{summary:classChoiceSummary2024("野蠻人")});
  fresh("術士",6,"龍族血脈");st=classChoiceStore2024("術士");st.draconicDamage="力場";
  ok(!classChoiceSummary2024("術士").some(x=>x.includes("力場")),"draconic-illegal-inert",{summary:classChoiceSummary2024("術士")});
  st.draconicDamage="火焰";ok(classChoiceSummary2024("術士").some(x=>x.includes("火焰")),"draconic-legal-summary",{summary:classChoiceSummary2024("術士")});

  // Warlock Tome / invocation target legality / repeatable invocations / Mystic Arcanum and round-trip.
  fresh("邪術師",11,PROG_2024["邪術師"].subs[0].n);S.invocations=new Set(["巨冊之契","痛苦爆轟","斥退爆轟","秘法長矛","先民教誨"]);st=classChoiceStore2024("邪術師");
  st.tomeCantrips=SPELLS.filter(x=>x.lv===0).slice(0,3).map(x=>x.n);st.tomeRituals=SPELLS.filter(x=>x.lv===1&&x.rit).slice(0,2).map(x=>x.n);
  const damageCandidates=warlockInvocationCandidateCantrips2024("damage"),attackCandidates=warlockInvocationCandidateCantrips2024("attack"),spearCandidates=warlockInvocationCandidateCantrips2024("spear");
  const shared=attackCandidates.find(n=>spearCandidates.includes(n))||attackCandidates[0]||damageCandidates[0],secondDamage=damageCandidates.find(n=>n!==shared)||damageCandidates[0];
  st.agonizingCantrip=shared||"";st.repellingCantrip=shared||"";st.spearCantrip=shared||"";
  S.cantrips=new Set([shared,secondDamage].filter(n=>SPELLS.some(sp=>sp.n===n&&sp.lv===0&&sp.cls.includes("K"))));
  const lessonOpts=originFeatOptions().filter(n=>n!==S.bg?.feat&&n!==S.spChoices.hFeat),baseLesson=lessonOpts.find(n=>!featSpellDef(n))||lessonOpts[0],magicLesson=lessonOpts.find(n=>featId5R(n)==="magic-initiate");
  st.lessonsFeat=baseLesson;st.invocationRepeats=[{id:"r1",n:"先民教誨",feat:magicLesson},{id:"r2",n:"痛苦爆轟",cantrip:secondDamage}];
  if(magicLesson){const d=featSpellDef(magicLesson),ch={};for(const pk of d.picks){const opts=typeof pk.opts==="function"?pk.opts(ch):pk.opts;ch[pk.k]=opts.find(x=>!Object.values(ch).includes(x))||opts[0]}S.featSpells["ogwl-r1"]=ch}
  st.arcanum6=classChoiceSpellOptions2024("K",6,{level:6})[0]||"";
  const damage=warlockInvocationCantripOptions2024("damage"),attack=warlockInvocationCantripOptions2024("attack"),spear=warlockInvocationCantripOptions2024("spear"),wg=grantedSpells2024().map(x=>x.n),tome=[...st.tomeCantrips,...st.tomeRituals];
  ok(damage.every(n=>S.cantrips.has(n)||st.tomeCantrips.includes(n))&&damage.includes(st.agonizingCantrip),"warlock-invocation-targets-known",{known:[...S.cantrips],damage});
  ok(tome.every(n=>wg.includes(normalizeSpellName2024(n))),"warlock-tome-grants",{want:tome,have:wg});
  ok(wg.includes(normalizeSpellName2024(st.arcanum6)),"warlock-arcanum-grant",{arcanum:st.arcanum6,have:wg});
  ok(invocationSelectionCount2024()===invocationCount()&&invocationRepeatChoicesReady2024(),"warlock-repeat-ready",{count:invocationSelectionCount2024(),max:invocationCount(),repeats:st.invocationRepeats});
  ok(validLessonInvocationSelections2024().some(x=>x.rep?.id==="r1"),"warlock-repeat-lessons-pipeline",{lessons:validLessonInvocationSelections2024()});
  const save=JSON.parse(JSON.stringify(serialize())),before={tome:[...st.tomeCantrips],rit:[...st.tomeRituals],arc:st.arcanum6,repeats:JSON.parse(JSON.stringify(st.invocationRepeats))};
  const dr=deserialize(save);renderFinal();renderSpells();const wr=classChoiceStore2024("邪術師"),finalWarlock=document.querySelector("#finalSheet")?.innerText||"";
  ok(dr.ok&&JSON.stringify(before.tome)===JSON.stringify(wr.tomeCantrips)&&JSON.stringify(before.rit)===JSON.stringify(wr.tomeRituals)&&before.arc===wr.arcanum6&&JSON.stringify(before.repeats)===JSON.stringify(wr.invocationRepeats),"warlock-roundtrip",{dr,before,after:wr});
  ok(finalWarlock.includes("再次選取"),"warlock-repeat-final-render",{text:finalWarlock.slice(0,1200)});
  report.warlock={damage:damage.length,attack:attack.length,spear:spear.length,tome,arcanum:st.arcanum6,repeats:wr.invocationRepeats};

  // Malformed imported invocation target must not become a known cantrip by projection.
  fresh("邪術師",2,PROG_2024["邪術師"].subs[0].n);S.invocations=new Set(["痛苦爆轟","魔鬼視界","秘法心智"]);st=classChoiceStore2024("邪術師");
  const injected=warlockInvocationCandidateCantrips2024("damage")[0]||"";st.agonizingCantrip=injected;
  ok(!warlockInvocationCantripOptions2024("damage").includes(injected)&&!invocationRequiredCantrips2024().includes(injected),"warlock-import-target-not-known",{injected,known:[...S.cantrips]});
  renderSpells();ok(!S.cantrips.has(injected),"warlock-render-does-not-auto-learn",{injected,known:[...S.cantrips]});

  // Wizard school free book, mastery/signature constraints.
  fresh("法師",20,"防護師");st=classChoiceStore2024("法師");const school=wizardSavantSchool2024("防護師");
  const init=classChoiceSpellOptions2024("W",2,{minLv:1,school});st.savantInitial=init.slice(0,2);
  for(let sl=3;sl<=9;sl++)st["savant"+sl]=classChoiceSpellOptions2024("W",sl,{level:sl,school})[0]||"";
  const w1=SPELLS.filter(x=>x.lv===1&&x.cls.includes("W")&&spellMetaDb()[x.n]?.time==="動作").map(x=>x.n);
  const w2=SPELLS.filter(x=>x.lv===2&&x.cls.includes("W")&&spellMetaDb()[x.n]?.time==="動作").map(x=>x.n);
  const w3=SPELLS.filter(x=>x.lv===3&&x.cls.includes("W")).map(x=>x.n);S.spellbook=new Set([...w1.slice(0,1),...w2.slice(0,1),...w3.slice(0,2)]);
  st.spellMastery1=w1[0];st.spellMastery2=w2[0];st.signatureSpells=w3.slice(0,2);
  const free=wizardFreeSpellbookSpells2024().map(x=>x.n),book=wizardBookNames2024(),wizGrants=grantedSpells2024().map(x=>x.n);
  ok(free.length>=2&&st.savantInitial.every(n=>free.includes(n)),"wizard-savant-free-book",{free,initial:st.savantInitial});
  ok(st.signatureSpells.every(n=>book.includes(n))&&wizGrants.includes(st.spellMastery1)&&wizGrants.includes(st.spellMastery2),"wizard-mastery-signature",{book,grants:wizGrants});
  const wrong=SPELLS.find(x=>x.lv===1&&x.cls.includes("W")&&x.school!==school)?.n;if(wrong){st.savantInitial=[wrong,init[0]];ok(!wizardFreeSpellbookSpells2024().some(x=>x.n===wrong),"wizard-wrong-school-inert",{wrong,free:wizardFreeSpellbookSpells2024().map(x=>x.n)})}
  report.wizard={freeCount:free.length,bookCount:book.length,mastery:[st.spellMastery1,st.spellMastery2],signature:st.signatureSpells};

  // Diviner Third Eye must not auto-grant See Invisibility unless that option is selected.
  fresh("法師",10,"預言師");st=classChoiceStore2024("法師");st.thirdEye="黑暗視覺";
  let tg=grantedSpells2024().map(x=>x.n);ok(!tg.includes(normalizeSpellName2024("識破隱形")),"third-eye-no-false-grant",{tg});
  st.thirdEye="識破隱形";tg=grantedSpells2024().map(x=>x.n);ok(tg.includes(normalizeSpellName2024("識破隱形")),"third-eye-selected-grant",{tg});
  report.thirdEye=tg;

  // Malformed imported combat state must be inert in mechanics.
  fresh("法師",3,"防護師");S.mastery=new Set([WEAPONS[0][1]]);S.style="防禦";S.metamagic=new Set([METAMAGIC[0].n]);S.expertise=new Set(["運動","察覺"]);
  ok(validMasterySet2024().size===0&&validClassStyle2024()===""&&validMetamagicSet2024().size===0&&featSkillState2024().expertise.size===0,"malformed-state-inert",{mastery:[...validMasterySet2024()],style:validClassStyle2024(),meta:[...validMetamagicSet2024()],exp:[...featSkillState2024().expertise]});
  return {failures,report};
 });
 const result={pageErrors,...out,failureCount:pageErrors.length+out.failures.length};
 console.log(JSON.stringify(result,null,2));assert.equal(result.failureCount,0);
 fs.writeFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/class-grants-2024-report.json",JSON.stringify(result,null,2),"utf8");
}finally{if(browser)await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});

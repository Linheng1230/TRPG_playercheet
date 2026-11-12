"use strict";
const fs=require("fs");
const {chromium}=require("playwright");

const ROOT=process.env.FIVERTOOLS_ROOT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024";
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const sourceSpells=JSON.parse(fs.readFileSync(ROOT+"/data__spells__spells-phb2024.json","utf8").replace(/^\uFEFF/,"")).spell;
const sourceFeats=JSON.parse(fs.readFileSync(ROOT+"/data__feats.json","utf8").replace(/^\uFEFF/,"")).feat.filter(x=>x.source==="PHB2024");

const originNames=new Set(["Alert","Crafter","Healer","Lucky","Magic Initiate","Musician","Savage Attacker","Skilled","Tavern Brawler","Tough"]);
const styleNames=new Set(["Archery","Blind Fighting","Defense","Dueling","Great Weapon Fighting","Interception","Protection","Thrown Weapon Fighting","Two-Weapon Fighting","Unarmed Fighting"]);
const slug=s=>String(s).toLowerCase().normalize("NFKD").replace(/[’']/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const generalSource=sourceFeats.filter(x=>!originNames.has(x.ENG_name)&&!styleNames.has(x.ENG_name)&&!x.ENG_name.startsWith("Boon of "));
const boonSource=sourceFeats.filter(x=>x.ENG_name.startsWith("Boon of "));
const styleSource=sourceFeats.filter(x=>styleNames.has(x.ENG_name));
const originSource=sourceFeats.filter(x=>originNames.has(x.ENG_name));
const abilityChoices=x=>{
  const a=x.ability?.[0]; if(!a)return [];
  if(a.choose?.from)return [...a.choose.from].sort();
  return Object.keys(a).filter(k=>["str","dex","con","int","wis","cha"].includes(k)).sort();
};
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const missing13=["hail-of-thorns","nystuls-magic-aura","melfs-acid-arrow","cordon-of-arrows","beast-sense","leomunds-tiny-hut","lightning-arrow","crusaders-mantle","leomunds-secret-chest","vitriolic-sphere","summon-celestial","arcane-gate","otilukes-freezing-sphere"];

(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage();
  const pageErrors=[];page.on("pageerror",e=>pageErrors.push(String(e)));
  await page.goto(URL,{waitUntil:"networkidle"});
  const data=await page.evaluate(()=>({
    spells:SPELLS.map(s=>({eng:s.eng,identifier:s.identifier,lv:s.lv,school:s.school,con:s.con,rit:s.rit,signature:s.signature})),
    origin:Object.entries(ORIGIN_FEAT_IDENTIFIER_2024).map(([n,id])=>({n,id,d:FEATS[n]})),
    general:GFEATS_2024.map(f=>({n:f.n,id:f.id,p:f.p,d:f.d,ab:f.ab||[]})),
    styles:FSTYLES.map(f=>({n:f.n,id:f.id,d:f.d})),
    boons:BOONS.map(b=>({n:b.n,id:b.id,d:b.d,ab:b.ab||[]})),
    saveVersion:SAVE_VERSION
  }));
  assert(!pageErrors.length,"page errors: "+pageErrors.join(" | "));

  assert(data.spells.length===391&&new Set(data.spells.map(x=>x.identifier)).size===391,"2024 spell count/identity parity failed");
  for(const id of missing13)assert(data.spells.some(s=>s.identifier===id),"missing spell: "+id);
  const byEng=new Map(data.spells.map(x=>[x.eng,x]));
  for(const sp of sourceSpells){
    const got=byEng.get(sp.ENG_name);assert(got,"runtime missing source spell: "+sp.ENG_name);
    assert(got.lv===sp.level&&got.school===sp.school&&got.con===!!sp.duration?.[0]?.concentration&&got.rit===!!sp.meta?.ritual,"spell structure mismatch: "+sp.ENG_name);
    assert(got.signature,"spell signature missing: "+sp.ENG_name);
  }

  assert(sourceFeats.length===75,"5RTools PHB2024 feat source count changed: "+sourceFeats.length);
  assert(originSource.length===10&&generalSource.length===43&&styleSource.length===10&&boonSource.length===12,"5RTools feat category counts changed");
  assert(data.origin.length===10&&data.general.length===43&&data.boons.length===12,"runtime feat category counts failed");
  const runtimeCoreStyles=data.styles.filter(x=>x.id!=="druidic-warrior");
  assert(runtimeCoreStyles.length===10,"runtime core fighting-style count failed");

  const idsEq=(got,src,label)=>{
    const a=[...got].sort(),b=[...src].sort();
    assert(JSON.stringify(a)===JSON.stringify(b),label+" identity mismatch\n"+JSON.stringify({got:a,src:b}));
  };
  idsEq(data.origin.map(x=>x.id),originSource.map(x=>slug(x.ENG_name)),"origin feat");
  idsEq(data.general.map(x=>x.id),generalSource.map(x=>slug(x.ENG_name)),"general feat");
  idsEq(runtimeCoreStyles.map(x=>x.id),styleSource.map(x=>slug(x.ENG_name)),"fighting style");
  idsEq(data.boons.map(x=>x.id),boonSource.map(x=>slug(x.ENG_name)),"epic boon");

  const generalById=new Map(data.general.map(x=>[x.id,x]));
  for(const src of generalSource){
    const got=generalById.get(slug(src.ENG_name));assert(got,"missing general feat "+src.ENG_name);
    if(src.ability)assert(JSON.stringify([...got.ab].sort())===JSON.stringify(abilityChoices(src)),"ability choice mismatch: "+src.ENG_name);
    const pre=src.prerequisite||[];
    if(pre.some(x=>x.ability))assert(/13\+/.test(got.p),"ability prerequisite not represented: "+src.ENG_name);
    if(pre.some(x=>x.spellcasting2020))assert(/施法/.test(got.p),"spellcasting prerequisite not represented: "+src.ENG_name);
    if(pre.some(x=>x.proficiency))assert(got.p&&got.p!=="—","proficiency prerequisite not represented: "+src.ENG_name);
    assert(got.d&&got.d.length>8,"empty general feat summary: "+src.ENG_name);
  }

  const feat=id=>generalById.get(id);
  assert(feat("weapon-master"),"Weapon Master missing");
  assert(/熟練加值/.test(feat("great-weapon-master").d)&&!/-5|\+10/.test(feat("great-weapon-master").d),"Great Weapon Master stale");
  assert(/死亡豁免/.test(feat("durable").d),"Durable stale");
  assert(/60呎/.test(feat("spell-sniper").d)&&!/射程加倍/.test(feat("spell-sniper").d),"Spell Sniper stale");
  assert(/熟練加值數量/.test(feat("ritual-caster").d),"Ritual Caster stale");
  assert(data.origin.find(x=>x.id==="magic-initiate").d.includes("施法屬性"),"Magic Initiate ability choice missing");
  assert(data.styles.find(x=>x.id==="protection").d.includes("下回合開始"),"Protection stale");
  const boon=id=>data.boons.find(x=>x.id===id);
  assert(/2d4/.test(boon("boon-of-fate").d)&&!/20 或 1/.test(boon("boon-of-fate").d),"Boon of Fate stale");
  assert(/10d10/.test(boon("boon-of-recovery").d),"Boon of Recovery stale");
  assert(/撤離/.test(boon("boon-of-speed").d)&&!/水面/.test(boon("boon-of-speed").d),"Boon of Speed stale");
  assert(/心靈/.test(boon("boon-of-the-night-spirit").d)&&/光耀/.test(boon("boon-of-the-night-spirit").d),"Boon of Night Spirit stale");

  const state=await page.evaluate(()=>{
    const out={};

    // Battle Master + background/origin choices + v9 round-trip.
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="戰士");S.level=3;S.classLevels={戰士:3};S.style="防禦";
    S.sub=PROG_2024["戰士"].subs.findIndex(x=>x.n==="戰鬥大師");
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="工匠");S.bgChoice2024={tool:"木匠工具"};
    S.sp=SPECIES_2024.find(x=>x.n==="人類");S.spChoices={hSkill:"察覺",hFeat:"多才多藝"};
    S.originFeatChoices={background:{feat:"匠人",picks:["木雕工具","皮匠工具","石工工具"]},human:{feat:"多才多藝",picks:["奧秘","歷史","陶匠工具"]}};
    S.skills=new Set(S.cls.sk.slice(0,S.cls.skc));S.mastery=new Set(masteryPool().slice(0,masteryCount()).map(x=>x[1]));S.expertise=new Set();S.metamagic=new Set();S.invocations=new Set();
    const studentSkill=FIGHTER_STUDENT_SKILLS_2024.find(x=>!skillOwnedOutsideClassChoice2024(x));
    S.classChoices2024={戰士:{maneuvers:MANEUVERS_2024.slice(0,3),studentTool:"鐵匠工具",studentSkill}};
    S.asi={};S.featSpells={};S.boon="";S.boonAb="";S.boonChoices={energy:[],skill:""};
    out.ready={background:backgroundChoicesReady14(),species:speciesChoicesReady(),cls:classChoicesReady2024()};
    out.toolsBefore=proficiencySummary14().tools;
    const saved=serialize();
    S.classChoices2024={};S.bgChoice2024={tool:""};S.originFeatChoices={};
    out.loaded=deserialize(saved);
    out.roundtrip={classChoices:S.classChoices2024.戰士,bgTool:S.bgChoice2024.tool,origin:S.originFeatChoices,style:S.style};

    // General feat skill mechanics.
    S.level=4;S.classLevels={戰士:4};
    S.asi={4:{t:"feat",feat:"技藝專家",featAb:"int",featSkill:"奧秘",featExpertise:"奧秘"}};
    out.skillExpert={prof:allSkills().has("奧秘"),expert:hasExpertise("奧秘")};
    S.asi={4:{t:"feat",feat:"敏思",featAb:"int",featUpgrade:"調查"}};
    out.keenExisting={prof:allSkills().has("調查"),expert:hasExpertise("調查")};
    S.asi={4:{t:"feat",feat:"敏思",featAb:"int",featUpgrade:"自然"}};
    out.keenNew={prof:allSkills().has("自然"),expert:hasExpertise("自然")};
    S.level=1;out.ritual=[featSpellDef("儀式施法者").picks.length];
    S.level=5;out.ritual.push(featSpellDef("儀式施法者").picks.length);
    S.level=9;out.ritual.push(featSpellDef("儀式施法者").picks.length);

    // Magic Initiate: required spellcasting ability + spells.
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=1;S.classLevels={法師:1};S.sub=null;S.style="";S.styleCantrips2024=[];S.asi={};S.classChoices2024={};
    S.mastery=new Set();S.expertise=new Set();S.metamagic=new Set();S.invocations=new Set();S.primalSkill="";
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="侍僧");S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.spChoices={};S.originFeatChoices={};S.featSpells={};
    const mi=featSpellDef(S.bg.feat),clericCantrips=SPELLS.filter(x=>x.lv===0&&x.cls.includes("C")),clericL1=SPELLS.filter(x=>x.lv===1&&x.cls.includes("C"));
    out.magicInitiateBefore=classChoicesReady2024();
    S.featSpells.ogbg={ab:"感知",c1:clericCantrips[0].n,c2:clericCantrips[1].n,s1:clericL1[0].n};
    out.magicInitiateAfter=classChoicesReady2024();
    const miSaved=serialize();S.featSpells={};deserialize(miSaved);out.magicInitiateRoundtrip=JSON.parse(JSON.stringify(S.featSpells.ogbg));


    // Epic Boons: required inner choices and Boon of Skill mechanics.
    S.cls=CLASSES.find(x=>x.n==="術士");S.level=19;S.classLevels={術士:19};S.sub=PROG_2024["術士"].subs.findIndex(x=>x.n==="狂野魔法");S.style="";S.styleCantrips2024=[];S.featSpells={};S.classChoices2024={};
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="流浪兒");S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.spChoices={};S.originFeatChoices={};S.expertise=new Set();S.mastery=new Set();S.invocations=new Set();S.metamagic=new Set(METAMAGIC.slice(0,metamagicCount()).map(x=>x.n));
    S.asi={};(PROG_2024["術士"].asi||[]).filter(x=>x<=19).forEach(lv=>S.asi[lv]={t:"a2",a1:"cha"});
    S.boon="能量抗性恩賜";S.boonAb="int";S.boonChoices={energy:["火焰"],skill:""};out.energyOne=classChoicesReady2024();
    S.boonChoices.energy=["火焰","寒冷"];out.energyTwo=classChoicesReady2024();
    S.boon="技藝恩賜";S.boonAb="wis";S.boonChoices={energy:[],skill:"察覺"};out.skillBoonReady=classChoicesReady2024();
    out.skillBoon={allSkills:allSkills().size,expert:hasExpertise("察覺")};
    S.expertise.add("察覺");out.skillBoonDuplicateExpertise=classChoicesReady2024();S.expertise.delete("察覺");
    const boonSaved=serialize();S.boonChoices={energy:[],skill:""};deserialize(boonSaved);out.boonRoundtrip=JSON.parse(JSON.stringify(S.boonChoices));

    return out;
  });

  assert(Object.values(data.origin).every(Boolean),"origin feat mapping bad");
  assert(Object.values(state.ready).every(Boolean),"2024 required choices invalid: "+JSON.stringify(state.ready));
  for(const tool of ["木工工具","木雕工具","皮革工工具","泥瓦工工具","陶工工具","鐵匠工具"])assert(state.toolsBefore.includes(tool),"canonical tool display missing: "+tool+"; actual="+state.toolsBefore);
  assert(state.loaded.ok&&state.roundtrip.bgTool==="木匠工具"&&state.roundtrip.classChoices.maneuvers.length===3&&state.roundtrip.style==="防禦","v9 round-trip failed");
  assert(state.skillExpert.prof&&state.skillExpert.expert,"Skill Expert mechanics failed");
  assert(state.keenExisting.prof&&state.keenExisting.expert,"Keen Mind proficiency->expertise failed");
  assert(state.keenNew.prof&&!state.keenNew.expert,"Keen Mind new proficiency failed");
  assert(JSON.stringify(state.ritual)==="[2,3,4]","Ritual Caster PB scaling failed: "+JSON.stringify(state.ritual));
  assert(state.magicInitiateBefore===false&&state.magicInitiateAfter===true,"Magic Initiate required choice gate failed");
  assert(state.magicInitiateRoundtrip.ab==="感知"&&state.magicInitiateRoundtrip.c1&&state.magicInitiateRoundtrip.c2&&state.magicInitiateRoundtrip.s1,"Magic Initiate round-trip failed");
  assert(state.energyOne===false&&state.energyTwo===true,"Boon of Energy Resistance choice gate failed");
  assert(state.skillBoonReady===true&&state.skillBoon.allSkills===18&&state.skillBoon.expert===true,"Boon of Skill mechanics failed");
  assert(state.skillBoonDuplicateExpertise===false,"Boon of Skill allowed pre-existing expertise");
  assert(state.boonRoundtrip.skill==="察覺","Epic Boon choice round-trip failed");

  console.log(JSON.stringify({
    spells:{count:data.spells.length,unique:new Set(data.spells.map(x=>x.identifier)).size,missing13:0},
    feats:{source:sourceFeats.length,origin:data.origin.length,general:data.general.length,styles5R:runtimeCoreStyles.length,boons:data.boons.length},
    saveVersion:data.saveVersion,state
  },null,2));
 } finally {
   if(browser)await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"}),p=await b.newPage();
 const errs=[];p.on("pageerror",e=>errs.push(String(e)));
 await p.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
 const out=await p.evaluate(()=>{
  const canon=globalThis.ZIZI_5R_CANONICAL_NAMES;
  const eq=(a,b)=>({missing:b.filter(x=>!a.includes(x)),extra:a.filter(x=>!b.includes(x))});
  const classes=CLASSES.map(x=>displayName5R("classes",x.n)).sort();
  const backgrounds=BACKGROUNDS_2024.map(x=>displayName5R("backgrounds",x.n)).sort();
  const species=SPECIES_2024.map(x=>displayName5R("species",x.n)).sort();
  const subclasses=Object.values(PROG_2024).flatMap(x=>(x.subs||[]).map(s=>displayName5R("subclasses",s.n))).sort();
  const feats=[...Object.keys(ORIGIN_FEAT_IDENTIFIER_2024).map(n=>canonicalFeatName5R(n)),...GFEATS_2024.map(canonicalFeatName5R),...FSTYLES.map(canonicalFeatName5R),...BOONS.map(canonicalFeatName5R)].sort();
  const active=[...METAMAGIC.map(x=>canonicalActiveName5R(x.n)),...INVOCATIONS.map(x=>canonicalActiveName5R(x.n))].sort();
  const maneuvers=Object.keys(globalThis.ZIZI_5R_MANEUVERS||{}).map(n=>displayName5R("maneuvers",n)).sort();
  const masteries=Object.keys(MASTERY).map(n=>displayName5R("masteries",n)).sort();
  const weapons=WEAPONS.map(x=>displayName5R("weapons",x[1])).sort();
  const skills=SKILLS.map(x=>displayName5R("skills",x.n)).sort();
  const featWant=Object.values(canon.feats).map(x=>x.zh).sort();
  const opt=Object.entries(canon.optionalFeatures);
  const activeWant=opt.filter(([,x])=>(x.featureType||[]).some(t=>t==="MM"||t==="EI")).map(([,x])=>x.zh).sort();
  const maneuverWant=opt.filter(([,x])=>(x.featureType||[]).includes("MV:B")).map(([,x])=>x.zh).sort();
  const masteryWant=opt.filter(([,x])=>(x.featureType||[]).includes("MP")).map(([,x])=>x.zh).sort();
  const weaponWant=Object.values(canon.items).filter(x=>["M","R"].includes(x.type)).map(x=>x.zh).sort();
  const skillWant=["特技","馴獸","奧秘","運動","欺瞞","歷史","洞悉","威嚇","調查","醫藥","自然","察覺","表演","遊說","宗教","巧手","隱匿","求生"].sort();
  return {
   counts:{classes:classes.length,backgrounds:backgrounds.length,species:species.length,subclasses:subclasses.length,feats:feats.length,active:active.length,maneuvers:maneuvers.length,masteries:masteries.length,weapons:weapons.length,skills:skills.length},
   diff:{
    classes:eq(classes,Object.values(canon.classes).sort()),
    backgrounds:eq(backgrounds,Object.values(canon.backgrounds).sort()),
    species:eq(species,Object.values(canon.races).sort()),
    subclasses:eq(subclasses,Object.values(canon.subclasses).sort()),
    feats:eq(feats,featWant),active:eq(active,activeWant),maneuvers:eq(maneuvers,maneuverWant),masteries:eq(masteries,masteryWant),weapons:eq(weapons,weaponWant),skills:eq(skills,skillWant)
   }
  };
 });
 assert.deepEqual(errs,[]);
 for(const [k,d] of Object.entries(out.diff)) assert.deepEqual(d,{missing:[],extra:[]},k+" canonical name mismatch");
 console.log(JSON.stringify({pass:true,...out},null,2));await b.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
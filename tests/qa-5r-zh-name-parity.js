const {chromium}=require("playwright");
const assert=require("assert");
const sameSet=(a,b)=>{const aa=[...new Set(a)].sort(),bb=[...new Set(b)].sort();return JSON.stringify(aa)===JSON.stringify(bb)?null:{have:aa,want:bb}};
(async()=>{
 let b;try{
  b=await chromium.launch({headless:true,channel:"chrome"});
  const p=await b.newPage({viewport:{width:1440,height:900}});
  const errors=[];p.on("pageerror",e=>errors.push(e.message));p.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  await p.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html")+"?zh-name-parity=1",{waitUntil:"networkidle"});
  if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
  const out=await p.evaluate(()=>{
   const c=globalThis.ZIZI_5R_CANONICAL_NAMES||{},m=globalThis.ZIZI_5R_NAME_MIGRATIONS||{};
   const vals=o=>Object.values(o||{});
   const byType=t=>Object.entries(c.optionalFeatures||{}).filter(([,v])=>(v.featureType||[]).includes(t)).map(([,v])=>v.zh);
   const featObjs=[...Object.entries(ORIGIN_FEAT_IDENTIFIER_2024||{}).map(([n,id])=>({n,id})),...(GFEATS_2024||[]),...(FSTYLES||[]),...(BOONS||[])];
   const featIds=[...new Set(featObjs.map(x=>x.id).filter(Boolean))];
   const items=Object.entries(c.items||{}).map(([en,v])=>({en,...v}));
   const itemZh=types=>items.filter(x=>types.includes(x.type)).map(x=>x.zh);
   const localFeatureKeys=Object.keys(globalThis.ZIZI_5R_FULL_FEATURE_RULES||{}),mappedFeatureKeys=Object.keys(globalThis.ZIZI_5R_FEATURE_NAMES||{});
   return {
    source:c.source,
    spellCount:SPELLS.length,spellMismatch:SPELLS.filter(x=>c.spells?.[x.eng]!==x.n).map(x=>({en:x.eng,have:x.n,want:c.spells?.[x.eng]})),
    species:[SPECIES_2024.map(x=>displayName5R("species",x.n)),vals(c.races)],
    backgrounds:[BACKGROUNDS_2024.map(x=>displayName5R("backgrounds",x.n)),vals(c.backgrounds)],
    skills:[SKILLS.map(x=>displayName5R("skills",x.n)),vals(c.skills)],
    classes:[CLASSES.map(x=>displayName5R("classes",x.n)),vals(c.classes)],
    subclasses:[Object.values(PROG_2024).flatMap(x=>(x.subs||[]).map(s=>displayName5R("subclasses",s.n))),vals(c.subclasses)],
    featIdsCount:featIds.length,featExpectedCount:Object.keys(c.feats||{}).length,
    featMismatch:featObjs.filter(x=>x.id&&c.feats?.[x.id]?.zh&&canonicalFeatName5R(x)!==c.feats[x.id].zh).map(x=>({id:x.id,have:canonicalFeatName5R(x),want:c.feats[x.id].zh})),
    metamagic:[METAMAGIC.map(x=>canonicalActiveName5R(x.n)),byType("MM")],
    invocations:[INVOCATIONS.map(x=>canonicalActiveName5R(x.n)),byType("EI")],
    maneuvers:[MANEUVERS_2024.map(x=>displayName5R("maneuvers",x)),byType("MV:B")],
    masteries:[Object.keys(MASTERY).map(x=>displayName5R("masteries",x)),byType("MP").map(x=>({"橫掃":"順劈","擦掠":"擦傷","失衡":"擊倒","侵擾":"擾敵"}[x]||x))],
    weapons:[WEAPONS.map(x=>displayName5R("weapons",x[1])),itemZh(["M","R"])],
    armors:[ARMORS.map(x=>displayName5R("armors",x.n)),itemZh(["LA","MA","HA"])],
    shield:[displayName5R("armors","盾牌"),items.find(x=>x.en==="Shield")?.zh||""],
    tools:[[...new Set([...ARTISAN_TOOLS_2014,...INSTRUMENTS_2014,...GAMING_2014,"盜賊工具","易容工具","偽造工具","草藥工具","領航工具","毒藥工具"].map(x=>displayName5R("tools",x)))],itemZh(["AT","T","GS","INS"])],
    featureCoverage:{local:localFeatureKeys.length,mapped:mappedFeatureKeys.length,missing:localFeatureKeys.filter(k=>!globalThis.ZIZI_5R_FEATURE_NAMES?.[k]),extra:mappedFeatureKeys.filter(k=>!globalThis.ZIZI_5R_FULL_FEATURE_RULES?.[k]),blank:mappedFeatureKeys.filter(k=>!String(globalThis.ZIZI_5R_FEATURE_NAMES?.[k]?.zh||"").trim())},
    migrationCounts:Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Object.keys(v||{}).length]))
   };
  });
  const mismatches={};
  for(const k of ["species","backgrounds","skills","classes","subclasses","metamagic","invocations","maneuvers","masteries","weapons","armors","tools"]){const d=sameSet(out[k][0],out[k][1]);if(d)mismatches[k]=d}
  const pass=!errors.length&&out.source==="5RTools PHB2024 fixed snapshot"&&out.spellCount===391&&!out.spellMismatch.length&&out.featIdsCount===out.featExpectedCount&&!out.featMismatch.length&&!Object.keys(mismatches).length&&out.shield[0]===out.shield[1]&&out.featureCoverage.local===396&&out.featureCoverage.mapped===396&&!out.featureCoverage.missing.length&&!out.featureCoverage.extra.length&&!out.featureCoverage.blank.length;
  console.log(JSON.stringify({errors,out,mismatches,pass},null,2));
  assert(pass,"5R Traditional Chinese name parity failed");
 }finally{if(b)await b.close()}
})().catch(e=>{console.error(e);process.exit(1)});

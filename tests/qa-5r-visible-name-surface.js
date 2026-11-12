const {chromium}=require("playwright"),assert=require("assert");
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"}),p=await b.newPage({viewport:{width:390,height:844}});
 const errors=[];p.on("pageerror",e=>errors.push(String(e)));
 await p.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
 if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
 const out=await p.evaluate(()=>{
  S.ruleset="2024";syncRulesetUI();renderClasses();renderOrigin();
  const txt=(sel,root=document)=>[...root.querySelectorAll(sel)].map(x=>x.textContent.trim()).filter(Boolean);
  const canon=globalThis.ZIZI_5R_CANONICAL_NAMES,mig=globalThis.ZIZI_5R_NAME_MIGRATIONS||{};
  const classes=txt("#classGrid .name"),backgrounds=txt("#bgGrid .name"),species=txt("#spGrid .name");
  const subclasses=[];const traitLegacy=[];const optionLegacy=[];const classOptionLegacy=[];
  const oldTrait=new Set(Object.keys(mig.speciesTraits||{})),oldOpt=new Set(Object.keys(mig.speciesOptions||{})),oldClassOpt=new Set(Object.keys(mig.classOptions||{}));
  for(const c of CLASSES){S.cls=c;S.level=20;S.classLevels={[c.n]:20};S.sub=null;renderLevel();subclasses.push(...txt("#subGrid .name"));for(const el of document.querySelectorAll("[data-order],[data-strike]")){const t=el.textContent.trim();if(oldClassOpt.has(t))classOptionLegacy.push({class:c.n,text:t})}}
  for(const sp of SPECIES_2024){S.sp=sp;S.spChoices={};renderOrigin();for(const el of document.querySelectorAll("#spDetail .trait-name")){const t=el.textContent.trim();if(oldTrait.has(t)&&mig.speciesTraits[t]!==t)traitLegacy.push({species:sp.n,text:t,want:mig.speciesTraits[t]})}for(const el of document.querySelectorAll("#spDetail select option")){const t=el.textContent.trim();if(oldOpt.has(t)&&mig.speciesOptions[t]!==t)optionLegacy.push({species:sp.n,text:t,want:mig.speciesOptions[t]})}}
  const visible={
   classes,backgrounds,species,subclasses,
   wantClasses:Object.entries(canon.classes).map(([en,zh])=>zh+' '+en),wantBackgrounds:Object.entries(canon.backgrounds).map(([en,zh])=>zh+' '+en),wantSpecies:Object.entries(canon.races).map(([en,zh])=>zh+' '+en),wantSubclasses:Object.entries(canon.subclasses).map(([key,zh])=>zh+' '+key.split('|').slice(1).join('|').trim())
  };
  return {visible,traitLegacy,optionLegacy,classOptionLegacy,bodyWidth:document.body.scrollWidth,viewport:innerWidth};
 });
 assert.deepEqual(errors,[]);
 assert(same(out.visible.classes,out.visible.wantClasses),"class cards not canonical");
 assert(same(out.visible.backgrounds,out.visible.wantBackgrounds),"background cards not canonical");
 assert(same(out.visible.species,out.visible.wantSpecies),"species cards not canonical");
 assert(same(out.visible.subclasses,out.visible.wantSubclasses),"subclass cards not canonical");
 assert.deepEqual(out.traitLegacy,[],"legacy species trait label visible");
 assert.deepEqual(out.optionLegacy,[],"legacy species option label visible");
 assert.deepEqual(out.classOptionLegacy,[],"legacy class option label visible");
 assert(out.bodyWidth<=out.viewport+2,"mobile horizontal overflow");
 console.log(JSON.stringify({pass:true,counts:{classes:out.visible.classes.length,backgrounds:out.visible.backgrounds.length,species:out.visible.species.length,subclasses:out.visible.subclasses.length},traitLegacy:out.traitLegacy,optionLegacy:out.optionLegacy,classOptionLegacy:out.classOptionLegacy,mobile:{body:out.bodyWidth,viewport:out.viewport}},null,2));
 await b.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19974/index.html";
const OUT=process.env.QA_OUTPUT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/species-feature-matrix-20261118";
const widths=[320,390,480,1440],levels=[1,2,3,4,5,9,13,15];
const counterRules={
 "2024|矮人|石知覺":["pb","long"],
 "2024|阿斯莫|治癒之手":["once","long"],
 "2024|阿斯莫|天界啟示(3級起)":["once","long"],
 "2024|龍裔|吐息武器":["pb","long"],
 "2024|龍裔|龍族飛翔(5級起)":["once","long"],
 "2024|歌利亞|巨人血統":["pb","long"],
 "2024|歌利亞|巨大形態(5級起)":["once","long"],
 "2024|獸人|腎上腺衝刺":["pb","long"],
 "2024|獸人|不屈堅韌":["once","long"],
 "2014|龍裔|吐息武器":["once","short"],
 "2014|半獸人|不屈耐力":["once","long"]
};
function setup(o){
 resetAll();S.ruleset=o.ruleset;syncRulesetUI();
 S.cls=CLASSES.find(x=>x.n===o.cls);S.sub=null;
 S.sp=(o.ruleset==="2024"?SPECIES_2024:SPECIES_2014).find(x=>x.n===o.species);
 S.spChoices={};if(o.key)S.spChoices[o.key]=o.value;
 if(o.key==="eLine")S.spChoices.eCast="wis";
 if(o.key==="gLine")S.spChoices.gCast="wis";
 if(o.key==="fLine")S.spChoices.fCast="cha";
 S.level=o.lv;S.classLevels={[o.cls]:o.lv};
 S.base={str:14,dex:12,con:16,int:10,wis:14,cha:14};
 S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"QA "+o.species+" LV"+o.lv};
 S.slotsUsed={l1:1};document.getElementById("fName").value="QA 種族特性 "+o.species+" "+o.lv;
 renderFinal();go(11);renderPlayStatusTab();
 const m=(raw)=>{
  const txt=String(raw),match=txt.match(/^([^:：]+)[:：](.*)$/);
  const name=(match?match[1]:txt).trim();
  const gate=o.ruleset==="2024"?name.match(/[(（](\d+)級起[)）]/):null;
  return {name,unlock:gate?+gate[1]:1};
 };
 const originals=S.sp.traits.map(m);
 const subrace=S.sp.ch?.find(c=>c.k==="subrace")?.opts.includes(S.spChoices.subrace)?S.spChoices.subrace:"";
 if(o.ruleset==="2014"&&subrace&&SUBRACE14[subrace])originals.push(...SUBRACE14[subrace].traits.map(m));
 const expected=originals.filter(x=>x.unlock<=o.lv);
 const visible=[...document.querySelectorAll("#psSpeciesFeatures [data-ps-species-feature]")].map(el=>({
  name:el.dataset.psSpeciesFeature,text:el.textContent,
  full:el.querySelector(".ps-feature-chip.ft")?.dataset.tip||"",
  selected:el.querySelectorAll(".ps-feature-chip.ft").length>1
 }));
 const resources=[...document.querySelectorAll('#psResources [data-ps-resource^="species-feature:"]')].map(el=>({
  key:el.dataset.psResource,text:el.innerText,
  buttons:el.querySelectorAll('button[data-ps-action="res"]').length
 }));
 const meta=expected.flatMap(x=>{
  const conf=({
   "2024|矮人|石知覺":["pb","long"],"2024|阿斯莫|治癒之手":["once","long"],"2024|阿斯莫|天界啟示(3級起)":["once","long"],
   "2024|龍裔|吐息武器":["pb","long"],"2024|龍裔|龍族飛翔(5級起)":["once","long"],"2024|歌利亞|巨人血統":["pb","long"],"2024|歌利亞|巨大形態(5級起)":["once","long"],
   "2024|獸人|腎上腺衝刺":["pb","long"],"2024|獸人|不屈堅韌":["once","long"],"2014|龍裔|吐息武器":["once","short"],"2014|半獸人|不屈耐力":["once","long"]
  })[o.ruleset+"|"+o.species+"|"+x.name];
  return conf?[{name:x.name,max:conf[0]==="pb"?pb():1,rest:conf[1]}]:[];
 });
 return {expected,visible,meta,resources,allTraits:S.sp.traits.length,
  canonicalMissing:o.ruleset==="2024"?expected.filter(x=>!window.ZIZI_5R_SPECIES_RULES?.[S.sp.n+"|"+x.name]).map(x=>x.name):expected.filter(x=>!RACE_TRAIT_DESC14?.[x.name]).map(x=>x.name),
  speciesName:S.sp.n,level:S.level,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
  spellCantrips:featGrantedSpells({keepDistinctSources:true}).filter(x=>x.lv===0).map(x=>x.n)};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:process.env.CI?undefined:"chrome"});
 const report={source:URL,started:new Date().toISOString(),profiles:[],checks:[],samples:[],result:"RUNNING",missing2014:[]};
 try{
  const seed=await browser.newPage();
  await seed.goto(URL+"?species-feature-discover="+Date.now(),{waitUntil:"domcontentloaded",timeout:45000});
  await seed.waitForFunction(()=>typeof window.spellLinkedTextHTML2024==="function",null,{timeout:20000});
  const profiles=await seed.evaluate(()=>{
   const result=[],classes=["聖武士","德魯伊","法師","牧師","遊俠","術士","邪術師","吟遊詩人"];
   for(const ruleset of ["2024","2014"]){
    const catalog=ruleset==="2024"?SPECIES_2024:SPECIES_2014;
    catalog.forEach((sp,i)=>{
     const choice=(sp.ch||[]).find(c=>ruleset==="2014"?c.k==="subrace":c.t==="opt");
     const options=choice?(ruleset==="2024"?SP_OPTS[choice.opts].map(x=>x.n):choice.opts):[null];
     for(const opt of options)result.push({ruleset,species:sp.n,cls:classes[(i+result.length)%classes.length],key:choice?.k||"",value:opt});
    });
   }
   return result;
  });
  await seed.close();
  report.profiles=profiles;
  for(const width of widths){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",x=>errors.push(String(x)));
   page.on("dialog",d=>d.accept());
   await page.goto(URL+"?qa-species-feature="+width+"-"+Date.now(),{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForFunction(()=>typeof window.spellLinkedTextHTML2024==="function",null,{timeout:20000});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   for(const p of profiles){
    for(const lv of levels){
     const o={...p,lv},id=[width,p.ruleset,p.species,p.value||"base",lv].join("|");
     const state=await page.evaluate(setup,o);
     assert.equal(state.speciesName,p.species,id+" wrong species");
     assert.equal(state.visible.length,state.expected.length,id+" trait count "+JSON.stringify(state));
     assert.deepEqual(state.visible.map(x=>x.name),state.expected.map(x=>x.name),id+" trait identities");
     if(p.ruleset==="2024"){
      assert.deepEqual(state.canonicalMissing,[],id+" missing 5RTools rule");
      if(p.key)assert(state.visible.some(x=>x.selected),id+" chosen branch not visible");
     }
     else if(state.canonicalMissing.length)report.missing2014.push({id,missing:state.canonicalMissing});
     assert.equal(state.resources.length,state.meta.length,id+" counter count mismatch");
     for(const expected of state.meta){
      const row=state.resources.find(x=>x.key.includes(encodeURIComponent(expected.name)));
      assert(row,id+" counter missing "+expected.name);
      assert(row.text.includes("剩餘 "+expected.max),id+" counter wrong max "+expected.name);
      assert.equal(row.buttons,2,id+" counter buttons");
     }
     if(p.ruleset==="2024"&&p.species==="矮人"){
      assert.equal(state.visible.some(x=>x.name==="石知覺"&&x.text.includes("石中精妙")),true,id+" Stonecunning label");
      const row=state.resources.find(x=>x.key.includes(encodeURIComponent("石知覺")));
      assert(row&&row.text.includes("石中精妙"),id+" Stonecunning counter");
     }
     if(p.ruleset==="2024"&&p.species==="阿斯莫"&&lv<3)assert(!state.visible.some(x=>x.name.includes("天界啟示")),id+" Aasimar premature");
     if(p.ruleset==="2024"&&p.species==="龍裔"&&lv<5)assert(!state.visible.some(x=>x.name.includes("龍族飛翔")),id+" dragon flight premature");
     if(p.ruleset==="2024"&&p.species==="歌利亞"&&lv<5)assert(!state.visible.some(x=>x.name.includes("巨大形態")),id+" Large Form premature");
     assert(state.overflow<=2,id+" overflow "+state.overflow);
     report.checks.push({id,visible:state.visible.length,counters:state.resources.length,overflow:state.overflow,status:"PASS"});
    }
   }
   assert.deepEqual(errors,[],"JS errors at "+width);
   report.samples.push({width,cases:report.checks.filter(x=>x.id.startsWith(width+"|")).length});
   await page.close();
   console.log("PASS SPECIES FEATURE COVERAGE",width,report.samples[report.samples.length-1].cases);
  }
  // Real clicks through the existing Play Status action path, including short-rest 2014 breath.
  for(const [ruleset,species,cls,lv,shouldShortRecover] of [
   ["2024","矮人","聖武士",2,false],
   ["2024","龍裔","德魯伊",5,false],
   ["2024","阿斯莫","牧師",3,false],
   ["2024","歌利亞","遊俠",5,false],
   ["2024","獸人","術士",9,false],
   ["2014","龍裔","法師",3,true],
   ["2014","半獸人","邪術師",5,false]
  ]){
   const page=await browser.newPage({viewport:{width:390,height:844}});
   await page.goto(URL+"?species-feature-click="+Date.now(),{waitUntil:"domcontentloaded",timeout:45000});
   await page.waitForFunction(()=>typeof window.spellLinkedTextHTML2024==="function",null,{timeout:20000});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.evaluate(setup,{ruleset,species,cls,lv});
   // Page startup can schedule the ruleset modal 150 ms later (index.html boot); dismiss it via UI after startup settles.
   await page.waitForTimeout(280);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   await page.locator("#rulesetModal").waitFor({state:"hidden",timeout:5000});
   const row=page.locator('#psResources [data-ps-resource^="species-feature:"]').first();
   assert(await row.count(),ruleset+" "+species+" resource missing for click");
   const buttons=row.locator('button[data-ps-action="res"]');
   const before=await row.innerText();
   await buttons.filter({hasText:"消耗"}).click();
   assert((await row.innerText()).includes("已使用 1 /"),ruleset+" "+species+" click failed");
   await page.locator('#playStatusBody [data-ps-action="undo"]').click();
   assert((await row.innerText()).includes("已使用 0 /"),ruleset+" "+species+" undo failed");
   await buttons.filter({hasText:"消耗"}).click();
   const save=await page.evaluate(()=>serialize());
   const same=await page.evaluate(data=>{const x=deserialize(data);renderFinal();go(11);renderPlayStatusTab();return x.ok},save);
   assert(same,ruleset+" "+species+" JSON roundtrip");
   assert((await row.innerText()).includes("已使用 1 /"),ruleset+" "+species+" save lost spent count");
   await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
   await page.locator('#psRestDialog [data-rest-submit]').click();
   assert((await row.innerText()).includes(shouldShortRecover?"已使用 0 /":"已使用 1 /"),ruleset+" "+species+" short rest incorrect");
   await page.locator('#psRestDialog [data-rest-close]').click();
   if(!shouldShortRecover){
    await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
    assert((await row.innerText()).includes("已使用 0 /"),ruleset+" "+species+" long rest incorrect");
    await page.locator('#psRestDialog [data-rest-close]').click();
   }
   report.samples.push({ruleset,species,lv,click:"PASS",shortRest:shouldShortRecover?"recovered":"unchanged"});
   if(ruleset==="2024"&&species==="矮人"){
    // The ruleset welcome modal may reopen after a synthetic deserialize; dismiss via its real button.
    if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
    await page.locator("#psSpeciesFeatures summary").click();
    const chip=page.locator('#psSpeciesFeatures [data-ps-species-feature="石知覺"] .ps-feature-chip.ft');
    assert(await chip.isVisible(),"Stonecunning full rule chip not clickable");
    assert((await chip.getAttribute("data-tip")).includes("60呎"),"Stonecunning canonical detail missing");
    await chip.click();
    assert(await page.locator("#featureTip").isVisible(),"Stonecunning rules popover did not open");
    await page.keyboard.press("Escape");
    assert(!(await page.locator("#featureTip").isVisible()),"Escape did not close Stonecunning rules popover");
    await page.locator("#psResources").screenshot({path:path.join(OUT,"dwarf-paladin-lv2-390.png")});
   }
   await page.close();
  }
  report.result="PASS";
  console.log("PASS species feature full matrix",JSON.stringify({profiles:profiles.length,cases:report.checks.length,widths,samples:report.samples.length,missing2014:report.missing2014.length}));
 }catch(e){report.result="FAIL";report.error=String(e.stack||e);console.error("FAIL "+report.error);process.exitCode=1}
 finally{report.completed=new Date().toISOString();fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify(report,null,2));await browser.close()}
})();
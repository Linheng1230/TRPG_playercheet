"use strict";
// Cross-ruleset browser matrix for species innate *limited* cast resources.
// Character profiles are generated from the site's existing canonical species and
// class data; no mirror rules table or production character data is modified.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19992/index.html";
const OUT=process.env.QA_MATRIX_OUT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/species-atwill-lv1-15-20261117";
const levels=Array.from({length:15},(_,i)=>i+1);
const boundaries=[1,2,3,4,5,8,9,12,13,15];
const profiles=[
 {id:"24-drow-druid",ruleset:"2024",cls:"德魯伊",species:"精靈",eLine:"卓爾",kind:"two",cantrips:1,expected:["妖火","黑暗術"]},
 {id:"24-high-elf-wizard",ruleset:"2024",cls:"法師",species:"精靈",eLine:"高等精靈",kind:"two",cantrips:1,expected:["偵測魔法","迷蹤步"]},
 {id:"24-wood-elf-ranger",ruleset:"2024",cls:"遊俠",species:"精靈",eLine:"木精靈",kind:"two",cantrips:1,expected:["大步奔行","行動無蹤"]},
 {id:"24-forest-gnome-cleric",ruleset:"2024",cls:"牧師",species:"侏儒",gLine:"森林侏儒",kind:"pb",cantrips:1,expected:["動物交談"]},
 {id:"24-rock-gnome-bard",ruleset:"2024",cls:"吟遊詩人",species:"侏儒",gLine:"岩石侏儒",kind:"none",cantrips:2,expected:[]},
 {id:"24-infernal-tiefling-warlock",ruleset:"2024",cls:"邪術師",species:"提夫林",fLine:"九獄",kind:"two",cantrips:2,expected:["煉獄叱喝","黑暗術"]},
 {id:"24-abyssal-tiefling-sorcerer",ruleset:"2024",cls:"術士",species:"提夫林",fLine:"深淵",kind:"two",cantrips:2},
 {id:"24-chthonic-tiefling-paladin",ruleset:"2024",cls:"聖武士",species:"提夫林",fLine:"冥界",kind:"two",cantrips:2},
 {id:"24-aasimar-wizard",ruleset:"2024",cls:"法師",species:"阿斯莫",kind:"none",cantrips:1,expected:[]},
 {id:"24-human-druid",ruleset:"2024",cls:"德魯伊",species:"人類",kind:"none",cantrips:0,expected:[]},
 {id:"14-drow-cleric",ruleset:"2014",cls:"牧師",species:"精靈",subrace:"卓爾",kind:"two",cantrips:1,expected:["妖火術","黑暗術"]},
 {id:"14-tiefling-wizard",ruleset:"2014",cls:"法師",species:"提夫林",kind:"two",cantrips:1},
 {id:"14-forest-gnome-warlock",ruleset:"2014",cls:"邪術師",species:"侏儒",subrace:"森林侏儒",kind:"none",cantrips:1,expected:[]}
];
const wanted=p=>p.kind==="pb"?1:p.kind==="two"?Number(p.level>=3)+Number(p.level>=5):0;
const pb=lv=>Math.floor((lv-1)/4)+2;
function setup(p){
 resetAll();S.ruleset=p.ruleset;syncRulesetUI();
 S.cls=CLASSES.find(x=>x.n===p.cls);if(!S.cls)throw Error("Unknown class "+p.cls);
 S.sp=(p.ruleset==="2014"?SPECIES_2014:SPECIES_2024).find(x=>x.n===p.species);
 if(!S.sp)throw Error("Unknown species "+p.species);
 S.spChoices={};for(const key of ["eLine","gLine","fLine","subrace"])if(p[key])S.spChoices[key]=p[key];
 if(p.eLine)S.spChoices.eCast="wis";if(p.gLine)S.spChoices.gCast="wis";if(p.fLine)S.spChoices.fCast="cha";
 S.level=p.level;S.classLevels={[p.cls]:p.level};S.sub=null;
 S.base={str:12,dex:14,con:14,int:10,wis:18,cha:16};
 S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"QA_"+p.id+"_"+p.level};
 S.slotsUsed={l1:1,l2:0};
 const name="QA_"+p.id+"_Lv"+p.level;document.getElementById("fName").value=name;
 renderFinal();go(11);renderPlayStatusTab();
 const grants=playStatusSpeciesSpellGrants().map(g=>({n:g.name,max:g.max,k:g.k}));
 const all=featGrantedSpells({keepDistinctSources:true}).map(g=>({n:g.n,lv:g.lv,src:g.src}));
 return {grants,all,classKeys:classResources().map(x=>x.k),
  preview:document.querySelector("#psResources")?.innerText.slice(0,150),
  serialized:serialize()};
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({headless:true,channel:process.env.CI?undefined:"chrome"});
 const result={source:URL,profiles:profiles.map(x=>x.id),date:new Date().toISOString(),checked:[],samples:[],status:"RUNNING"};
 try{
  for(const width of [320,390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:850}});
   page.setDefaultTimeout(11000);
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   page.on("dialog",d=>d.accept());
   await page.goto(URL+"?qa-atwill="+width+"-"+Date.now(),{waitUntil:"networkidle",timeout:35000});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   for(const template of profiles){
    for(const level of ([320,480].includes(width)?boundaries:levels)){
     const p={...template,level},label=p.id+" LV"+level+" "+width+"px";
     const state=await page.evaluate(setup,p);
     const expected=wanted(p);
     assert.equal(state.grants.length,expected,label+" limited count "+JSON.stringify(state.grants));
     assert(state.grants.every(x=>x.max>0),label+" species resources must all be finite");
     assert.equal(await page.locator("#psResources .ps-species-unlimited").count(),0,label+" at-will card present");
     assert.equal(await page.locator("#psResources").getByText("物種／種族免費施法").count(),expected?1:0,label+" heading without limited grants");
     const spellCantrips=state.all.filter(x=>x.lv===0);
     assert(spellCantrips.length>=p.cantrips,label+" original cantrips were deleted");
     if(p.expected)for(const [i,name] of p.expected.entries()){
      if(p.kind==="two" && level<(i===0?3:5))continue;
      assert(state.grants.some(g=>g.n===name),label+" expected innate spell "+name+" not present "+JSON.stringify(state.grants));
     }
     for(const grant of state.grants){
      assert(grant.k.startsWith("species-cast:"),label+" bad namespaced key");
      assert.equal(grant.max,p.kind==="pb"?pb(level):1,label+" proficiency scaling");
      const card=page.locator('#psResources [data-ps-resource="'+grant.k+'"]');
      assert.equal(await card.count(),1,label+" missing counter "+grant.n);
      assert((await card.innerText()).includes("已使用 0 / "+grant.max),label+" counter maximum incorrect");
      assert.equal(await card.locator('button[data-ps-action="res"]').count(),2,label+" action buttons missing");
     }
     const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
     assert(overflow<=2,label+" horizontal overflow="+overflow);
     if(width===390&&[1,3,5,9,13,15].includes(level)){
      const sample=path.join(OUT,p.id+"-lv"+level+".json");
      fs.writeFileSync(sample,JSON.stringify(state.serialized,null,2),"utf8");
      result.samples.push({id:p.id,level,file:path.basename(sample)});
     }
     // UI consume/undo, slot isolation, short/long rest and serializer round-trip
     // at proficiency and spell unlock boundaries for distinct class/lineage combinations.
     if(expected>0&&[3,5,9,13,15].includes(level)&&width!==320){
      const g=state.grants[0],card=page.locator('#psResources [data-ps-resource="'+g.k+'"]');
      const beforeSlot=await page.evaluate(()=>S.slotsUsed.l1||0);
      await card.locator('button[data-ps-action="res"][data-ps-delta="1"]').click();
      assert((await card.innerText()).includes("已使用 1 / "+g.max),label+" spend failed");
      assert.equal(await page.evaluate(()=>S.slotsUsed.l1||0),beforeSlot,label+" spell slot altered");
      await page.locator('#playStatusBody [data-ps-action="undo"]').click();
      assert((await card.innerText()).includes("已使用 0 / "+g.max),label+" undo failed");
      await card.locator('button[data-ps-action="res"][data-ps-delta="1"]').click();
      const saved=await page.evaluate(()=>serialize());
      assert.equal(saved.play.res[g.k],1,label+" save lost usage");
      const restore=await page.evaluate(obj=>{const o=deserialize(obj);renderFinal();go(11);renderPlayStatusTab();return {ok:o.ok,used:S.play.res}},saved);
      assert(restore.ok&&restore.used[g.k]===1,label+" JSON round-trip failed");
      await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
      await page.locator('#psRestDialog [data-rest-submit]').click();
      assert((await card.innerText()).includes("已使用 1 / "+g.max),label+" short rest restored incorrectly");
      await page.locator('#psRestDialog [data-rest-close]').click();
      await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
      assert((await card.innerText()).includes("已使用 0 / "+g.max),label+" long rest failed");
      await page.locator('#psRestDialog [data-rest-close]').click();
     }
     result.checked.push({profile:p.id,edition:p.ruleset,cls:p.cls,species:p.species,level,width,finite:state.grants.map(x=>({name:x.n,max:x.max})),atWillResources:0,canonicalCantrips:spellCantrips.length,overflow,pass:true});
    }
   }
   assert.deepEqual(errors,[],"runtime errors at "+width+"px");
   const screenshot=path.join(OUT,"resource-list-"+width+"px.png");
   await page.screenshot({path:screenshot,fullPage:false});
   result["screenshot"+width]=screenshot;
   await page.close();
   console.log("PASS viewport",width,"cases",result.checked.filter(x=>x.width===width).length);
  }
  result.status="PASS";
  console.log("PASS SPECIES AT-WILL LV1-LV15 MATRIX",JSON.stringify({cases:result.checked.length,profiles:profiles.length,widths:[320,390,480,1440],samples:result.samples.length}));
 }catch(e){result.status="FAIL";result.error=String(e.stack||e);console.error(result.error);process.exitCode=1}
 finally{result.completed=new Date().toISOString();fs.writeFileSync(path.join(OUT,"report.json"),JSON.stringify(result,null,2),"utf8");await browser.close()}
})();
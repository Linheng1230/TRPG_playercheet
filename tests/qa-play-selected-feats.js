"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const SITE=process.env.QA_URL||"http://127.0.0.1:18977/index.html";
const OUT=process.env.QA_SCREENSHOT_DIR||path.join(require("node:os").tmpdir(),"dnd5r-play-selected-feats-qa");
(async()=>{
 const browser=await chromium.launch({headless:true});
 const results=[];
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(SITE+"?qa-feat="+width,{waitUntil:"networkidle"});
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const first=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};S.sub=0;
    S.sp=SPECIES_2024.find(x=>x.n==="人類")||SPECIES_2024[0];
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="士兵")||BACKGROUNDS_2024[0];
    S.base={str:12,dex:14,con:14,int:10,wis:18,cha:10};
    S.spChoices={hFeat:"法術新手(法師)"};
    S.asi={4:{t:"feat",feat:GFEATS_2024.find(x=>x.id==="war-caster")?.n||GFEATS_2024[0].n,featAb:"wis"}};
    S.featSpells={oghu:{ab:"智力",c1:"法師之手",c2:"光亮術",s1:"護盾術"}};
    S.originFeatChoices={};
    S.boon="";S.style="";
    S.play={hp:null,thp:0,hd:4,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};
    go(11);
    return {entries:playStatusSelectedFeats(),expected:S.bg.feat};
   });
   assert(first.entries.length>=3,"2024 background, species & level feat should appear");
   assert(first.entries.some(f=>f.name===first.expected),"origin feat missing");
   assert(first.entries.some(f=>f.source.includes("額外專長")),"species feat missing");
   assert(first.entries.some(f=>f.source.includes("升級專長")),"level feat missing");
   assert(first.entries.some(f=>f.choices.includes("法師之手")),"chosen feat spell names missing");
   assert(first.entries.every(f=>f.full.length>20),"canonical full rules missing for some 2024 feats");
   const lib=page.locator("#psSelectedFeats");
   assert.equal(await lib.count(),1,"selected feats block missing");
   const shortcut=page.locator(".ps-jump-scroll [data-ps-jump=\"psSelectedFeats\"]");
   assert.equal(await shortcut.count(),1,"selected-feat jump shortcut missing");
   await shortcut.click();
   assert(await lib.evaluate(e=>e.open),"selected-feat jump must expand the section");
   assert.equal(await lib.locator(".ps-selected-feat").count(),first.entries.length);
   assert(await lib.locator(".ps-selected-feat-effect").first().innerText().then(x=>x.length>20),"full effects not directly visible");
   assert(await lib.locator(".ps-selected-feat-choice").count()>0,"chosen options not visible");
   const chip=lib.locator(".ps-feature-chip.ft").first();
   await chip.click();
   assert(await page.locator("#featureTip").isVisible(),"shared tooltip did not open");
   await page.keyboard.press("Escape");
   const before=await page.evaluate(()=>playStatusSelectedFeats().map(x=>[x.name,x.choices,x.full]));
   const saved=await page.evaluate(()=>serialize());
   const reloaded=await page.evaluate(saved=>{const r=deserialize(saved);renderPlayStatusTab();return {ok:r.ok,entries:playStatusSelectedFeats().map(x=>[x.name,x.choices,x.full])}},saved);
   assert(reloaded.ok,"save deserialize failed");
   assert.deepEqual(reloaded.entries,before,"feat choice changed after save round trip");
   await page.locator("#psSelectedFeats > summary").click();
   const layout=await page.evaluate(()=>({
     overflow:document.documentElement.scrollWidth-innerWidth,
     font:parseFloat(getComputedStyle(document.querySelector(".ps-selected-feat-effect")).fontSize),
     count:document.querySelectorAll(".ps-selected-feat").length
   }));
   assert(layout.overflow<=2,"horizontal overflow at "+width+": "+layout.overflow);
   assert(layout.font>=15,"feat effect text smaller than 15 px");
   fs.mkdirSync(OUT,{recursive:true});
   await page.locator("#psSelectedFeats").screenshot({path:path.join(OUT,"2024-"+width+".png")});
   const selectedSpell=await page.evaluate(()=>{
     const chosen=GFEATS_2024.find(x=>x.id==="fey-touched");
     if(!chosen)throw Error("canonical Fey Touched unavailable");
     S.asi[4]={t:"feat",feat:chosen.n,featAb:"wis"};
     S.featSpells["asi德魯伊4"]={s1:"祝福術"};
     renderPlayStatusTab();
     return playStatusSelectedFeats().find(x=>x.name===chosen.n);
   });
   assert(selectedSpell&&selectedSpell.choices.includes("祝福術"),"ASI feat chosen spell missing");
   assert.equal((selectedSpell.choices.match(/祝福術/g)||[]).length,1,"ASI feat spell choice duplicated");
   assert(await page.locator("#psSelectedFeats .ps-selected-feat-choice").count()>0,
    "chosen spell options must appear in play status");
   const styles=await page.evaluate(()=>{
     const previous={cls:S.cls,level:S.level,style:S.style};
     const check=(cls,lv,style)=>{
       S.cls=CLASSES.find(x=>x.n===cls);S.level=lv;S.style=style;
       return playStatusSelectedFeats().find(x=>x.name===style)||null;
     };
     const core=check("戰士",1,FSTYLES[0].n);
     const pal=check("聖武士",2,"受祝福的勇士");
     const ranger=check("遊俠",2,"德魯伊教戰士");
     Object.assign(S,previous);
     return {core,pal,ranger,palSource:fightingStyleExtra2024("受祝福的勇士")?.d,
       rangerSource:fightingStyleExtra2024("德魯伊教戰士")?.d};
   });
   assert(styles.core?.full.length>20,"PHB2024 fighting style canonical effect missing");
   assert(styles.pal?.full.length>20,"Paladin bonus fighting style effect missing");
   assert(styles.ranger?.full.length>20,"Ranger bonus fighting style effect missing");
   assert.equal(styles.pal.full,styles.palSource,"Paladin option must use original class style source");
   assert.equal(styles.ranger.full,styles.rangerSource,"Ranger option must use original class style source");
   const epic=await page.evaluate(()=>{
     S.level=19; S.classLevels={德魯伊:19}; S.boon=BOONS[0].n;
     renderPlayStatusTab();
     return playStatusSelectedFeats();
   });
   assert(epic.some(x=>x.source.includes("史詩恩賜")&&x.full.length>20),"epic boon full rule missing at lvl19");
   const old=await page.evaluate(()=>{
     S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="戰士");S.level=4;S.classLevels={戰士:4};S.sub=0;
     S.sp=SPECIES_2014.find(x=>x.n==="人類")||SPECIES_2014[0];
     S.bg=BACKGROUNDS_2014[0];S.spChoices={hFeat:GFEATS[0].n};
     S.asi={};S.asiByClass={戰士:{4:{t:"feat",feat:GFEATS[1].n}}};S.boon="";S.style="";
     S.play={hp:null,thp:0,hd:4,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};
     renderPlayStatusTab();return playStatusSelectedFeats();
   });
   assert.equal(old.length,2,"2014 species and class level feats should appear");
   assert(old.every(x=>x.full.length>0),"2014 full rules missing");
   assert.equal(await page.locator("#psSelectedFeats .ps-selected-feat").count(),2);
   assert.deepEqual(errors,[],"JS page errors");
   results.push({width,origin:true,species:true,asi:true,epic:true,legacy:true,choice:true,roundTrip:true,tooltip:true,overflow:layout.overflow,effectFont:layout.font});
   await page.close();
  }
  console.log(JSON.stringify({pass:true,results},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

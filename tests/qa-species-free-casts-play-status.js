"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const cases=[
 {ruleset:"2024",species:"精靈",eLine:"卓爾",level:1,want:[],cantrips:["舞光術"]},
 {ruleset:"2024",species:"精靈",eLine:"卓爾",level:3,want:[["妖火",1]],cantrips:["舞光術"]},
 {ruleset:"2024",species:"精靈",eLine:"卓爾",level:4,want:[["妖火",1]],cantrips:["舞光術"]},
 {ruleset:"2024",species:"精靈",eLine:"卓爾",level:5,want:[["妖火",1],["黑暗術",1]],cantrips:["舞光術"]},
 {ruleset:"2024",species:"精靈",eLine:"高等精靈",level:5,want:[["偵測魔法",1],["迷蹤步",1]],cantrips:["魔法伎倆"]},
 {ruleset:"2024",species:"精靈",eLine:"木精靈",level:5,want:[["大步奔行",1],["行動無蹤",1]],cantrips:["德魯伊伎倆"]},
 {ruleset:"2024",species:"侏儒",gLine:"森林侏儒",level:5,want:[["動物交談",3]],cantrips:["次級幻象"]},
 {ruleset:"2024",species:"提夫林",fLine:"九獄",level:5,want:[["煉獄叱喝",1],["黑暗術",1]],cantrips:["奇術","火焰箭"]},
 {ruleset:"2014",species:"精靈",subrace:"卓爾",level:4,want:[["妖火術",1]],cantrips:["舞光術"]},
 {ruleset:"2014",species:"精靈",subrace:"卓爾",level:5,want:[["妖火術",1],["黑暗術",1]],cantrips:["舞光術"]}
];
const setup=({ruleset,species,eLine,gLine,fLine,subrace,level})=>{
 resetAll();S.ruleset=ruleset;syncRulesetUI();
 S.cls=CLASSES.find(x=>x.n==="德魯伊");S.sub=null;
 S.sp=(ruleset==="2024"?SPECIES_2024:SPECIES_2014).find(x=>x.n===species);
 if(!S.sp)throw Error("Species missing: "+species+" "+ruleset);
 S.spChoices={};if(eLine){S.spChoices.eLine=eLine;S.spChoices.eCast="wis";}
 if(gLine){S.spChoices.gLine=gLine;S.spChoices.gCast="wis";}
 if(fLine){S.spChoices.fLine=fLine;S.spChoices.fCast="wis";}
 if(subrace)S.spChoices.subrace=subrace;
 S.level=level;S.classLevels={"德魯伊":level};S.base={str:12,dex:14,con:14,int:10,wis:18,cha:12};
 S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:""};
 S.slotsUsed={l1:1};renderFinal();go(11);renderPlayStatusTab();
 return {grants:playStatusSpeciesSpellGrants().map(x=>({n:x.name,max:x.max,k:x.k})),classKeys:classResources().map(x=>x.k)};
};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const report=[];
 try{
  for(const width of [320,390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];page.on("pageerror",x=>errors.push(String(x)));
   await page.goto(URL+"?qa-species="+Date.now()+width,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   for(const item of cases){
    const state=await page.evaluate(setup,item);
    assert.equal(state.grants.filter(x=>x.max>0).length,item.want.length,JSON.stringify(item)+" limited");
    assert.equal(state.grants.filter(x=>x.max===0).length,item.cantrips.length,JSON.stringify(item)+" cantrips");
    for(const [name,max] of item.want){
     const x=state.grants.find(x=>x.n===name);assert(x,name+" source missing: "+JSON.stringify(state.grants));
     assert.equal(x.max,max,name+" maximum incorrect");
     const row=page.locator('#psResources [data-ps-resource="'+x.k+'"]');
     assert.equal(await row.count(),1,name+" counter missing");
     assert((await row.innerText()).includes("剩餘 "+max));
    }
    for(const name of item.cantrips){
     const el=page.locator("#psResources .ps-species-unlimited").filter({hasText:name});
     assert.equal(await el.count(),1,name+" unlimited missing");
     assert.equal(await el.locator("button").count(),0,name+" should not be consumed");
    }
    assert.equal(state.classKeys.includes("ws"),item.level>=2,"Existing Wild Shape level gate incorrect");
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert(overflow<=2,JSON.stringify(item)+" horizontal overflow "+overflow);
    if(item.ruleset==="2024"&&item.eLine==="卓爾"&&item.level===4){
     const star=await page.evaluate(()=>{S.sub=PROG_2024["德魯伊"].subs.findIndex(x=>x.n==="星辰結社");renderPlayStatusTab();return classResources().map(x=>({k:x.k,max:x.max}));});
     assert(star.some(x=>x.k==="ws"&&x.max===2),"Wild Shape unchanged with Stars subclass");
     assert(star.some(x=>x.k==="stars-guiding-bolt"&&x.max===4),"Guiding Bolt class free casts unchanged");
     const faerie=state.grants.find(x=>x.n==="妖火");
     const row=page.locator('#psResources [data-ps-resource="'+faerie.k+'"]');
     assert.equal(await page.locator('#psResources .ps-species-unlimited').count(),1);
     await row.locator('button[data-ps-action="res"][data-ps-delta="1"]').click();
     assert((await row.innerText()).includes("已使用 1 / 1"),"click should spend one");
     let st=await page.evaluate(k=>({spent:S.play.res[k],slot:S.slotsUsed.l1}),faerie.k);
     assert.deepEqual(st,{spent:1,slot:1},"free cast never consumes slot");
     await page.locator('#playStatusBody [data-ps-action="undo"]').click();
     assert((await row.innerText()).includes("已使用 0 / 1"),"undo should restore");
     await row.locator('button[data-ps-action="res"][data-ps-delta="1"]').click();
     const save=await page.evaluate(()=>serialize());
     assert.equal(save.play.res[faerie.k],1,"save should preserve spent");
     const restored=await page.evaluate(data=>{const ok=deserialize(data).ok;renderFinal();go(11);renderPlayStatusTab();return {ok,grants:playStatusSpeciesSpellGrants().length}},save);
     assert(restored.ok&&restored.grants>=2,"deserialize should restore grants");
     assert((await row.innerText()).includes("已使用 1 / 1"),"reload UI retains spent");
     await page.locator('#playStatusBody button[data-ps-action="rest-short"]').click();
     await page.locator('#psRestDialog [data-rest-submit]').click();
     assert((await row.innerText()).includes("已使用 1 / 1"),"short rest must not restore free cast");
     await page.locator('#psRestDialog [data-rest-close]').click();
     await page.locator('#playStatusBody button[data-ps-action="rest-long"]').click();
     assert((await row.innerText()).includes("已使用 0 / 1"),"long rest restores free cast");
     await page.locator('#psRestDialog [data-rest-close]').click();
    }
   }
   assert.deepEqual(errors,[],"page JS errors");
   report.push({width,cases:cases.length,status:"PASS"});
   await page.close();
  }
  console.log("PASS species free casts",JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exitCode=1});

"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19960/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.CI?undefined:"chrome"});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(URL+"?class-limited-baseline="+Date.now(),{waitUntil:"networkidle",timeout:45000});
  const a=await page.evaluate(()=>{
   if(typeof resetAll==="function")resetAll();
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(c=>c.n==="聖武士");S.level=2;S.classLevels={"聖武士":2};S.sub=null;
   S.base={str:16,dex:10,con:14,int:10,wis:12,cha:16};
   S.sp=SPECIES_2024.find(s=>s.n==="人類");S.spChoices={};
   S.play={hp:null,hpMax:null,thp:0,hd:null,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"QA Paladins Smite"};
   renderFinal();go(11);renderPlayStatusTab();
   return {feature:PROG_2024["聖武士"].f[2],resourceKeys:classResources().map(r=>r.k),seen:document.querySelector("#psResources")?.textContent?.includes("至聖斬")||false};
  });
  assert(a.feature.includes("聖光揮擊"),"canonical class feature must be present");
  assert(a.resourceKeys.some(k=>String(k).startsWith("class-use:2024:")), "REGRESSION: Paladin's Smite free once/LR missing from play-status resource counters "+JSON.stringify(a));
  console.log("PASS Paladin 2024 level2 class free-cast resource granted");
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exitCode=1});

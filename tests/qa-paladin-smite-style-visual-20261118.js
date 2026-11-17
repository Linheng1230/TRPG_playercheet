"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {chromium}=require("playwright");
const url=process.env.QA_URL||"http://127.0.0.1:18876/index.html";
const dest="D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/screenshots";
(async()=>{
 fs.mkdirSync(dest,{recursive:true});
 const b=await chromium.launch({channel:"chrome",headless:true});
 const rows=[];
 try{
  for(const width of [390,1440]){
   const page=await b.newPage({viewport:{width,height:width===390?844:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(url,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
     resetAll();S.ruleset="2024";syncRulesetUI();
     S.cls=CLASSES.find(c=>c.n==="聖武士");S.level=2;S.classLevels={"聖武士":2};S.style="防禦";
     S.sp=SPECIES_2024[0];S.spChoices={};S.bg=BACKGROUNDS_2024[0];
     S.base={str:16,dex:10,con:14,int:8,wis:10,cha:16};S.skills=new Set(["運動","說服"]);
     S.gear={armor:"鏈甲",unarmored:"auto",shield:true,weapons:["長劍"],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0}};
     document.getElementById("fName").value="聖武士 QA";
     go(5);
   });
   const details=page.locator(".style-rule-guide summary").first();
   assert(await details.isVisible(),"creator styles details hidden");
   await details.click();
   const before=await page.evaluate(()=>S.style);
   await page.locator(".style-rule-guide .ft[data-tip]").first().click();
   const after=await page.evaluate(()=>({style:S.style,open:featureTip.style.display,pinned:rulePopoverState.pinnedType}));
   assert.equal(before,"防禦");assert.equal(after.style,"防禦");
   assert.equal(after.pinned,"feature","creator click must pin same feature tooltip");
   await page.keyboard.press("Escape");
   const closed=await page.evaluate(()=>featureTip.style.display);
   assert.equal(closed,"none","escape must dismiss style tooltip");
   await page.evaluate(()=>go(7));
   const style=page.locator("#finalSheet .ft[data-tip-title='防禦']").first();
   await style.scrollIntoViewIfNeeded();
   await style.click();
   const info=await page.evaluate(()=>{
      const r=featureTip.getBoundingClientRect(),e=document.documentElement;
      return {tipOpen:featureTip.style.display!=="none",title:featureTip.querySelector(".ft-tip-head")?.textContent,
        tip:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width},
        pageOverflow:e.scrollWidth-e.clientWidth,tipOverflow:featureTip.scrollWidth-featureTip.clientWidth,
        pinned:rulePopoverState.pinnedType};
   });
   await page.screenshot({path:dest+"/smite-style-"+width+"-20261118.png"});
   assert.equal(info.title,"防禦");
   assert(info.tipOpen&&info.pinned==="feature");
   assert(info.tip.left>=-1&&info.tip.right<=width+1,"feature popup viewport overrun");
   assert(info.pageOverflow<=2&&info.tipOverflow<=1,"feature popup overflow");
   assert.deepEqual(errors,[]);
   rows.push({width,creatorTapBefore:before,creatorTapAfter:after,escapeClosed:closed,finalPopup:info});
   await page.close();
  }
 }finally{await b.close()}
 console.log(JSON.stringify({PASS:true,rows,screenshots:dest},null,2));
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

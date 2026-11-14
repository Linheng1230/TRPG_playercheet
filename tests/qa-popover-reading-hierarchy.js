"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({channel:"chrome",headless:true});const results=[];
 for(const width of [1280,390,320]){
  const p=await browser.newPage({viewport:{width,height:740},isMobile:width<700,hasTouch:width<700});
  const errors=[];p.on("pageerror",e=>errors.push(e.message));
  await p.goto(process.env.QA_URL||"http://127.0.0.1:18919/index.html",{waitUntil:"networkidle"});
  const data=await p.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();const out=[];
   for(const [name,kind] of [["魔法伎倆","cantrip"],["火球術","spell"]]){
    const el=spellTip;el.innerHTML=rulePopoverCloseButtonHTML()+spellTipHTML(name);el.style.display="block";el.style.left="8px";el.style.top="8px";
    const description=el.querySelector(kind==="cantrip"?".ct-full .tip-d":".tip-d");
    const secondary=el.querySelector(kind==="cantrip"?".ct-facts":".tip-m");
    const title=el.querySelector(kind==="cantrip"?".ct-head":".tip-t");
    const dimensions=el.getBoundingClientRect();
    const firstText=description?.innerText||"";
    out.push({kind,width:dimensions.width,height:dimensions.height,descriptionFont:parseFloat(getComputedStyle(description).fontSize),descriptionLine:parseFloat(getComputedStyle(description).lineHeight),background:getComputedStyle(el).backgroundColor,order:title.getBoundingClientRect().top<=description.getBoundingClientRect().top&&description.getBoundingClientRect().top<secondary.getBoundingClientRect().top,innerLength:firstText.length,descriptionWords:firstText.slice(0,35),horizontalOverflow:el.scrollWidth>el.clientWidth+2});
   }
   spellTip.style.display="none";
   featureTip.innerHTML=featureTipHTML("你可以使用附贈動作移動至附近的目標，且下一次攻擊檢定具有優勢。","示範特性");
   featureTip.style.display="block";featureTip.style.left="8px";featureTip.style.top="8px";
   const rect=featureTip.getBoundingClientRect();const body=featureTip.querySelector(".ft-rule-val");
   out.push({kind:"feature",width:rect.width,height:rect.height,descriptionFont:parseFloat(getComputedStyle(body).fontSize),descriptionLine:parseFloat(getComputedStyle(body).lineHeight),order:true,innerLength:body.innerText.length,horizontalOverflow:featureTip.scrollWidth>featureTip.clientWidth+2});
   featureTip.style.display="none";
   return out;
  });
  results.push({viewport:width,data,errors});
  await p.close();
 }
 await browser.close();
 console.log(JSON.stringify(results,null,2));
 assert(results.every(r=>r.errors.length===0&&r.data.every(d=>d.width<=Math.min(344,r.viewport-16)+1&&d.height<=470+1&&d.descriptionFont>=14&&d.descriptionLine/d.descriptionFont>=1.58&&d.order&&!d.horizontalOverflow&&d.innerLength>10)));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

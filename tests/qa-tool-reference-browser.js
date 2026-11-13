"use strict";
const assert=require("assert"),{chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18777/index.html",out=process.env.QA_SHOTS||"D:\\Tools\\zizi-ai-runtime";
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"}),errors=[],report=[];
 try{
  for(const [width,height,label] of [[1440,900,"desktop"],[480,900,"narrow"],[390,844,"mobile"]]){
   const p=await b.newPage({viewport:{width,height}});
   p.on("pageerror",e=>errors.push(label+": "+String(e)));
   await p.goto(URL+"?tools-qa="+label,{waitUntil:"domcontentloaded"});
   await p.waitForTimeout(250);const close=p.locator("#closeRuleset");if(await p.locator("#rulesetModal").getAttribute("class").then(x=>x.includes("open")))await close.click();
   await p.evaluate(()=>go(8));
   await p.locator('#refTabs [data-r="tool"]').click();
   assert.equal(await p.locator(".tool-ref-card").count(),37,label+" all 37");
   let metrics=await p.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    font:parseFloat(getComputedStyle(document.querySelector(".tool-ref-guide")).fontSize),
    tabVisible:!document.querySelector('#refTabs [data-r="tool"]').hidden
   }));
   assert(metrics.overflow<=1,label+" overflow "+JSON.stringify(metrics));assert(metrics.font>=15,label+" font");
   await p.locator('[data-tool-group="music"]').click();assert.equal(await p.locator(".tool-ref-card").count(),10,label+" music");
   await p.locator('[data-tool-group="all"]').click();
   await p.locator("#toolRefQ").fill("盜賊");
   await p.waitForTimeout(180);assert.equal(await p.locator(".tool-ref-card").count(),1,label+" search");
   await p.locator(".tool-ref-card summary").click();
   assert((await p.locator(".tool-ref-card .pr-body").innerText()).includes("DC 15"),label+" thieves DC");
   await p.locator("#toolRefQ").fill("");
   await p.waitForTimeout(180);assert.equal(await p.locator(".tool-ref-card").count(),37,label+" reset");
   if(label==="mobile")await p.screenshot({path:out+"\\tools-reference-mobile-20261113.png",fullPage:true});
   if(label==="desktop")await p.screenshot({path:out+"\\tools-reference-desktop-20261113.png",fullPage:false});
   await p.evaluate(()=>{S.ruleset="2014";syncRulesetUI();});
   assert.equal(await p.locator('#refTabs [data-r="tool"]').isVisible(),false,label+" 2014 guard");
   report.push({label,metrics,toolCount:37,filters:true,search:true,details:true,ruleset2014Guard:true});
   await p.close();
  }
  assert.equal(errors.length,0,"page errors: "+errors.join(" | "));
  console.log(JSON.stringify({PASS:true,report,errors},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

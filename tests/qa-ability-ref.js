const {chromium}=require("playwright");const fs=require("fs");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const p=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];p.on("pageerror",e=>errors.push(e.message));p.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await p.goto("http://127.0.0.1:18766/index.html?ability-ref-qa=1",{waitUntil:"networkidle"});
 if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
 await p.evaluate(()=>go(8));await p.waitForTimeout(100);
 const out=await p.evaluate(()=>{
   const rows=abilityRefRows();
   const find=n=>rows.find(x=>x.name===n);
   return {
    total:rows.length,featRules:Object.keys(window.ZIZI_5R_FEAT_RULES||{}).length,activeOptionRules:Object.keys(window.ZIZI_5R_ACTIVE_OPTION_RULES||{}).length,invocationCanonical:Object.keys(window.ZIZI_5R_ACTIVE_OPTION_RULES||{}).filter(k=>k.startsWith("invocations|")).length,metamagicCanonical:Object.keys(window.ZIZI_5R_ACTIVE_OPTION_RULES||{}).filter(k=>k.startsWith("metamagic|")).length,
    active:rows.filter(x=>x.meta.active).length,passive:rows.filter(x=>x.meta.passive).length,druidicWarriorPresent:(FSTYLES||[]).some(x=>x.id==="druidic-warrior"),
    samples:["石知覺","盾牌大師",displayName5R("maneuvers","指揮打擊"),canonicalActiveName5R("加速法術"),canonicalActiveName5R("契約之刃")].map(n=>{const x=find(n);return x?{name:n,source:x.source,active:x.meta.active,actions:x.meta.actions,ranges:x.meta.ranges,dice:x.meta.dice,checks:x.meta.checks,text:x.text.slice(0,180)}:{name:n,missing:true}}),
    cards:document.querySelectorAll(".ability-ref-card").length,
    defaultMode:abilityRefFilter.mode,
    firstNames:[...document.querySelectorAll(".ability-ref-name")].slice(0,10).map(x=>x.textContent.trim())
   }
 });
 await p.locator("#abilityRefQ").fill("DC=8");await p.waitForTimeout(80);
 const dcCount=await p.locator(".ability-ref-card").count();
 await p.locator("#abilityRefQ").fill("");await p.waitForTimeout(60);await p.locator("[data-ar-action='反應']").click();await p.waitForTimeout(80);
 const reactionCount=await p.locator(".ability-ref-card").count();
 await p.screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/ability-ref-desktop.png",fullPage:false});
 const m=await b.newPage({viewport:{width:390,height:844}});m.on("pageerror",e=>errors.push("mobile:"+e.message));
 await m.goto("http://127.0.0.1:18766/index.html?ability-ref-qa=1",{waitUntil:"networkidle"});if(await m.locator("#closeRuleset").isVisible())await m.locator("#closeRuleset").click();await m.evaluate(()=>go(8));await m.waitForTimeout(100);
 const mobile=await m.evaluate(()=>({scrollX:document.documentElement.scrollWidth-document.documentElement.clientWidth,cards:document.querySelectorAll(".ability-ref-card").length,font:parseFloat(getComputedStyle(document.querySelector(".ability-ref-rule")||document.body).fontSize)}));
 await m.screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/ability-ref-mobile.png",fullPage:false});
 await b.close();
 const pass=!errors.length&&out.total>400&&out.featRules>=75&&out.activeOptionRules>=38&&out.invocationCanonical===28&&out.metamagicCanonical===10&&out.active>0&&out.passive>0&&!out.druidicWarriorPresent&&out.cards===out.active&&out.defaultMode==="active"&&out.samples.every(x=>!x.missing)&&out.samples.find(x=>x.name==="石知覺").actions.includes("附贈動作")&&out.samples.find(x=>x.name==="盾牌大師").checks.length>0&&dcCount>0&&reactionCount>0&&mobile.scrollX<=1&&mobile.cards>0&&mobile.font>=15;
 const result={errors,out,dcCount,reactionCount,mobile,pass};
 fs.writeFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/qa-ability-ref.json",JSON.stringify(result,null,2),"utf8");
 console.log(JSON.stringify(result,null,2));process.exit(pass?0:1);
})().catch(e=>{console.error(e);process.exit(2)});
"use strict";
/* Phase B browser QA: actual page navigation + dark card + canonical text parity. */
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const dir=path.resolve("tmp/qa-damage-semantic");
fs.mkdirSync(dir,{recursive:true});
const TYPES=["酸蝕","鈍擊","寒冷","火焰","力場","閃電","黯蝕","穿刺","毒素","心靈","光耀","揮砍","雷鳴"];
async function run(browser,width,height,label){
 const page=await browser.newPage({viewport:{width,height}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(URL,{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const base=await page.evaluate(()=>{
   const helper=window.ZIZI_DAMAGE_SEMANTICS_5R;
   return {ready:!!helper,types:Object.keys(helper?.types||{}),style:[...document.styleSheets].some(s=>s.href?.includes("damage-semantic-5r.css")),
     body:document.body.scrollWidth,viewport:innerWidth};
 });
 assert(base.ready&&base.style,label+": semantic assets not loaded");
 assert.deepEqual(base.types,TYPES,label+": wrong 13 damage types");
 assert(base.body<=base.viewport+2,label+": initial horizontal overflow");
 // Unit/DOM contract: original strings identical, 13 labels, 2 combined lists,
 // four negative class/spell names and both parchment + dark popup contrast.
 const unit=await page.evaluate(()=>{
   const names=Object.keys(window.ZIZI_DAMAGE_SEMANTICS_5R.types);
   const light="#e9dec4",panel="#f5edd9",dark="#2a2118";
   const luminosity=(color)=>{
     const hex=String(color).trim();
     const nums=hex.startsWith("#")
       ?hex.slice(1).match(/.{2}/g).map(x=>parseInt(x,16))
       :Array.from(hex.matchAll(/[0-9]+(?:\\.[0-9]+)?/g)).slice(0,3).map(x=>Number(x[0]));
     const [r,g,b]=nums.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
     return r*.2126+g*.7152+b*.0722;
   };
   const ratio=(a,b)=>{const x=luminosity(a),y=luminosity(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
   const sample=document.createElement("section");sample.id="damageSemanticQASample";
   const text=names.map((n,i)=>(i+1)+"d6 "+n+"傷害。").join(" ")+" 火焰、寒冷或閃電傷害。 抗性：鈍擊、穿刺和揮砍。 火焰球、閃電束、光耀靈光、寒冷天氣。";
   sample.textContent=text;document.querySelector("main").appendChild(sample);
   window.ZIZI_DAMAGE_SEMANTICS_5R.decorate(sample);
   const marks=[...sample.querySelectorAll(".damage-semantic")];
   const negative=[...sample.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join("");
   const lightResults=marks.map(el=>({type:el.dataset.damageType,contrast:ratio(getComputedStyle(el).color,light),panel:ratio(getComputedStyle(el).color,panel),weight:Number(getComputedStyle(el).fontWeight)}));
   const tip=document.getElementById("spellTip"),oldHTML=tip.innerHTML,oldDisplay=tip.style.display;
   tip.innerHTML="<div>"+names.map(n=>n+"傷害。").join(" ")+"</div>";
   tip.style.display="block";tip.style.left="0px";tip.style.top="0px";
   window.ZIZI_DAMAGE_SEMANTICS_5R.decorate(tip);
   const darkResults=[...tip.querySelectorAll(".damage-semantic")].map(el=>({type:el.dataset.damageType,contrast:ratio(getComputedStyle(el).color,dark)}));
   const result={same:sample.textContent===text,count:marks.length,types:new Set(marks.map(x=>x.dataset.damageType)).size,
     negatives:["火焰球","閃電束","光耀靈光","寒冷天氣"].every(x=>negative.includes(x)),
     lightResults,darkResults};
   tip.innerHTML=oldHTML;tip.style.display=oldDisplay;
   sample.remove();return result;
 });
 assert(unit.same,label+": canonical visible text was modified");
 assert(unit.count>=19&&unit.types===13,label+": missing one or more semantic types/list types "+JSON.stringify(unit));
 assert(unit.negatives,label+": spell/feature name was incorrectly highlighted");
 assert(unit.lightResults.every(x=>x.contrast>=4.5&&x.panel>=4.5&&x.weight>=700),label+": parchment contrast below WCAG AA");
 assert(unit.darkResults.length===13&&unit.darkResults.every(x=>x.contrast>=4.5),label+": popup contrast below WCAG AA");

 // Actual human-entry path: top navigation -> spell quick reference -> search.
 await page.locator("#stepNav .nav-primary button",{hasText:"工具速查"}).click();
 await page.locator("#stepNav .nav-secondary button",{hasText:"法表"}).click();
 await page.locator("#srefQ").fill("火球術");
 await page.waitForTimeout(350);
 const spells=await page.locator("#srefBody .sref-entry").count();
 assert(spells>0,label+": spell search returned nothing");
 const entry=page.locator("#srefBody .sref-entry").first();
 const text=await entry.innerText();
 assert(text.includes("火焰傷害"),label+": spell fixture has no fire damage");
 const fire=entry.locator(".sr-rule-content .damage-semantic[data-damage-type=fire]");
 await fire.first().waitFor({state:"attached",timeout:4000});
 assert(await fire.count()>0,label+": real spell rule was not colored");
 const widthState=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth}));
 assert(widthState.overflow<=2,label+": spell list horizontal overflow");
 await fire.first().scrollIntoViewIfNeeded();
 await page.screenshot({path:path.join(dir,label+"-spell.png")});

 // Actual feature/card path: reference tab -> class -> Barbarian -> Rage.
 await page.locator("#stepNav .nav-secondary button",{hasText:"速查"}).first().click();
 await page.locator("#refTabs [data-r=class]").click();
 await page.locator('[data-cr5r-class="野蠻人"]').click();
 await page.locator("#cr5rLv1 summary").click();
 await page.waitForTimeout(200);
 const rage=page.locator("#cr5rLv1 .cr5r-rule");
 assert((await rage.first().innerText()).includes("狂暴")||(await page.locator("#cr5rLv1").innerText()).includes("狂暴"),label+": Rage feature missing");
 const typeCount=await page.locator("#cr5rLv1 .damage-semantic").count();
 assert(typeCount>0,label+": real class feature damage terms not colored");

 // Creature reference is a separate producer. Interact through the real UI.
 await page.locator("#refTabs [data-r=creature]").click();
 const creatureSearch=page.locator("#creatureRefQ");
 assert(await creatureSearch.count(),label+": creature UI unavailable");
 // All-monsters view is a user-facing category control.
 const allMonster=page.locator('#refBody [data-pr-filter="mode"]',{hasText:"全部怪物"}).first();
 if(await allMonster.count())await allMonster.click();
 await page.waitForTimeout(350);
 const creatureCards=await page.locator("#refBody .creature-card").count();
 assert(creatureCards>0,label+": no creature cards rendered");
 const creatureColored=await page.locator("#refBody .creature-card .damage-semantic").count();
 assert(creatureColored>0,label+": no creature rule / resistance semantic colors");
 const creatureOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(creatureOverflow<=2,label+": creature reference overflows horizontally");
 const creatureColor=page.locator("#refBody .creature-card .damage-semantic").first();
 const creatureCard=creatureColor.locator("xpath=ancestor::details[contains(@class, \"creature-card\")]");
 if(await creatureCard.count()){
   if(!(await creatureCard.evaluate(el=>el.open)))await creatureCard.locator("summary").first().click();
   await creatureColor.scrollIntoViewIfNeeded();
 }
 await page.screenshot({path:path.join(dir,label+"-creatures.png")});

 // Integration path: actual final sheet and native Play Status from one ephemeral
 // in-memory PHB2024 Barbarian. Never touch a saved user's character.
 await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(c=>c.n==="野蠻人");
   S.level=3;S.classLevels={"野蠻人":3};S.sub=0;
   S.sp=SPECIES_2024[0];S.bg=BACKGROUNDS_2024[0];
   S.base={str:16,dex:12,con:14,int:10,wis:14,cha:14};
   S.play=S.play||{};S.play.res={};S.play.resMax={};S.play.custom=[];
   go(7);renderFinal();
 });
 await page.waitForTimeout(150);
 const finalTerms=await page.locator("#finalSheet .damage-semantic").count();
 const finalRage=page.locator('#finalSheet .ft[data-tip-title*="狂暴"]').first();
 const finalDebug=await page.locator('#finalSheet .ft[data-tip]').evaluateAll(els=>els.slice(0,25).map(el=>({title:el.getAttribute("data-tip-title"),text:el.textContent.slice(0,45),raw:(el.getAttribute("data-tip")||"").length})));
 await page.screenshot({path:path.join(dir,label+"-final-before.png")});
 assert(await finalRage.count(),label+": final sheet Rage feature card missing: "+JSON.stringify(finalDebug));
 await finalRage.click();
 await page.waitForTimeout(120);
 const finalTooltipTerms=await page.locator("#featureTip .damage-semantic").count();
 assert(finalTooltipTerms>0,label+": final sheet canonical Rage tooltip not decorated");
 const finalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(finalOverflow<=2,label+": final sheet horizontal overflow");
 await page.screenshot({path:path.join(dir,label+"-final.png")});
 await page.keyboard.press("Escape");
 await page.locator("#stepNav .nav-primary button",{hasText:"跑團狀態"}).click();
 const rageCard=page.locator('.ps-resource-tip[data-tip-title="狂暴"]').first();
 assert(await rageCard.count(),label+": Native Play Status Rage card missing");
 await rageCard.click();
 await page.waitForTimeout(120);
 const playTerms=await page.locator("#featureTip .damage-semantic").count();
 assert(playTerms>0,label+": real Play Status full-rule popover not decorated");
 const playOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(playOverflow<=2,label+": Play Status horizontal overflow");
 await page.screenshot({path:path.join(dir,label+"-play.png")});
 await page.keyboard.press("Escape");
 assert.deepEqual(errors,[],label+": page errors");
 await page.close();
 return {label,width,height,types:unit.types,lightMin:Math.min(...unit.lightResults.map(x=>x.contrast)),darkMin:Math.min(...unit.darkResults.map(x=>x.contrast)),realSpell:spells,realRageTerms:typeCount,creatureCards,creatureColored,finalTerms,finalTooltipTerms,playTerms,pass:true};
}
(async()=>{const browser=await chromium.launch({headless:true});try{
 const out=[];for(const [w,h,label] of [[1440,900,"desktop"],[480,760,"narrow"],[390,844,"mobile"]])out.push(await run(browser,w,h,label));
 fs.writeFileSync(path.join(dir,"results.json"),JSON.stringify(out,null,2));
 console.log(JSON.stringify({pass:true,out},null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exit(1)});

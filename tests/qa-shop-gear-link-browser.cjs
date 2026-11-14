"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict"),fs=require("node:fs");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},isMobile:width===390,hasTouch:width===390});
   page.setDefaultTimeout(15000);const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:"networkidle"});
   await page.evaluate(()=>{document.getElementById("rulesetModal")?.classList.remove("open");S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="戰士");S.level=3;S.classLevels={戰士:3};S.gear.gold={pp:0,gp:4000,sp:0,cp:0};S.gear.weapons=[];S.gear.armor="";S.gear.shield=false;go(10)});
   await page.locator('[data-shop-tier="metropolis"]').click();
   for(const item of ["mkt:戰馬","mkt:戰馬","mkt:騎乘鞍座","w:匕首","a:皮甲"]){
    await page.locator('[data-buy="'+item+'"]').click();
   }
   let actual=await page.evaluate(()=>({mounts:S.gear.shopMounts||[],weapons:S.gear.weapons.slice(),armor:S.gear.armor,saddle:S.gear.purchases["mkt:騎乘鞍座"],mountCards:ShopGearLink5R.exportMounts(S)}));
   assert.equal(actual.mounts.length,2);assert(actual.mountCards.every(x=>x.creatureId==="warhorse|xmm"));
   assert.equal(actual.weapons.length,0,"Bought dagger must not automatically go to equipped weapon row");
   assert.equal(actual.armor,"","Bought leather armor must not automatically set AC");
   assert(actual.mounts.every(x=>!x.riding),"Bought mount must not auto-ride");
   await page.evaluate(()=>go(7));
   assert.equal(await page.locator("#finalSheet .sgl-card").count(),2);
   assert.equal(await page.locator('#finalSheet [data-sgl-equip="w:匕首"]').count(),1);
   await page.locator('#finalSheet [data-sgl-equip="w:匕首"]').click();
   await page.locator('#finalSheet [data-sgl-equip="a:皮甲"]').click();
   actual=await page.evaluate(()=>({weapon:S.gear.weapons.slice(),armor:S.gear.armor}));
   assert.equal(actual.weapon.length,1);assert.equal(actual.weapon[0],"匕首");
   assert.equal(actual.armor,"皮甲");
   await page.locator("#finalSheet .sgl-card summary").first().click();
   assert(await page.locator("#finalSheet .sgl-card .ci-stat-grid").first().isVisible(),"Full XMM stat card must render");
   await page.locator("#finalSheet [data-sgl-name]").first().fill("雷霆");
   await page.locator("#finalSheet [data-sgl-name]").first().press("Tab");
   await page.locator("#finalSheet .sgl-card summary").first().click();
   await page.locator("#finalSheet [data-sgl-saddle]").first().selectOption("mkt:騎乘鞍座");
   await page.locator("#finalSheet .sgl-card summary").first().click();
   await page.locator("#finalSheet [data-sgl-ride]").first().click();
   actual=await page.evaluate(()=>ShopGearLink5R.exportMounts(S));
   assert.equal(actual.length,2);assert.equal(actual.filter(x=>x.riding).length,1);
   assert.equal(actual[0].nickname,"雷霆");assert.equal(actual[0].saddle,"mkt:騎乘鞍座");
   assert(PlayStatusCreatures5R.render(S).includes("已購坐騎"),"Play status mount projection missing");
   const saved=await page.evaluate(()=>serialize());
   assert.equal(saved.gear.shopMounts.length,2);
   await page.evaluate(value=>deserialize(value),saved);
   assert.equal(await page.evaluate(()=>ShopGearLink5R.exportMounts(S).length),2,"Save/load must preserve mounts");
   await page.evaluate(()=>go(10));
   await page.locator('[data-refund="mkt:戰馬"]').click();
   actual=await page.evaluate(()=>ShopGearLink5R.exportMounts(S));
   assert.equal(actual.length,1,"Refund must remove one mount instance");
   assert.equal(actual[0].nickname,"雷霆","Refund should retain the mounted named horse");
   await page.evaluate(()=>go(7));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,"Viewport overflow "+width+": "+overflow);
   assert.deepEqual(errors,[],"Unexpected JS errors: "+errors.join("\n"));
   fs.mkdirSync("qa-artifacts",{recursive:true});
   await page.screenshot({path:"qa-artifacts/shop-gear-"+width+".png",fullPage:true});
   console.log(JSON.stringify({pass:true,width,mounts:1,creature:"warhorse|xmm",mounted:true,saddle:true,ownedWornSeparation:true,refund:true,roundtrip:true,overflow}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

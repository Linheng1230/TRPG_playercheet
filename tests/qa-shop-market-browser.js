"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},hasTouch:width===390,isMobile:width===390});
   page.setDefaultTimeout(15000);const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(URL,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");S.level=2;S.classLevels={戰士:2};S.gear.gold={pp:0,gp:1000,sp:0,cp:0};go(10)});
   assert.equal(await page.locator("[data-shop-tier]").count(),5);
   await page.locator('[data-shop-tier="village"]').click();
   await page.locator('[data-shop-cat="坐騎與交通"]').click();
   assert.equal(await page.locator('[data-buy="mkt:戰馬"]').count(),0);
   await page.locator('[data-shop-tier="metropolis"]').click();
   await page.locator('[data-buy="mkt:戰馬"]').click();
   let state=await page.evaluate(()=>({gold:moneyCp()/100,qty:S.gear.purchases["mkt:戰馬"]||0}));
   assert.deepEqual(state,{gold:600,qty:1});
   await page.locator('[data-shop-cat="魔法物品"]').click();
   await page.locator('#shopQ').fill("Potion of Healing");await page.waitForTimeout(250);
   const detail=page.locator('[data-market-detail="Potion of Healing"]');
   assert(await detail.count()>=1);
   const quote=await page.evaluate(()=>window.ShopMarket5R.magic().find(x=>x.en==="Potion of Healing")?.cp);
   assert.equal(quote,5000);
   page.once("dialog",d=>d.accept());
   await page.locator('[data-buy="magic:potion-of-healing|xdmg"]').click();
   state=await page.evaluate(()=>({gold:moneyCp()/100,magic:S.gear.magicItems.find(x=>x.id==="potion-of-healing|xdmg")?.qty||0}));
   assert.deepEqual(state,{gold:550,magic:1});
   await page.locator('[data-refund="magic:potion-of-healing|xdmg"]').click();
   state=await page.evaluate(()=>({gold:moneyCp()/100,magic:S.gear.magicItems.find(x=>x.id==="potion-of-healing|xdmg")?.qty||0}));
   assert.deepEqual(state,{gold:600,magic:0});
   await detail.click();
   assert(await page.locator('#refBody .item-card').count()>=1,"Detail link must open magic item ref");
   assert(await page.locator('[data-market-shop="Potion of Healing"]').count()>=1,"Magic item ref must offer return to shop");
   await page.locator('[data-market-shop="Potion of Healing"]').first().click();
   assert(await page.locator('[data-shop-cat="魔法物品"].active').count()===1,"Return must select magic shop");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,"Unexpected horizontal overflow "+overflow);
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({pass:true,width,purchasedWarhorse:true,magicRefund:true,crossNavigation:true,overflow}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

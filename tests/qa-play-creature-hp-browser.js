"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright"),path=require("node:path"),fs=require("node:fs"),{pathToFileURL}=require("node:url");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{
  for(const width of [390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
   await page.goto(process.env.QA_URL||pathToFileURL(path.join(__dirname,"../index.html")).href,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>window.PlayStatusCreatures5R&&window.ShopGearLink5R&&typeof go==="function");
   const loaded=await page.evaluate(()=>[...document.scripts].map(x=>x.src).filter(Boolean));
   for(const asset of ["play-status-creatures-5r.js","shop-gear-link-5r.js"]){
    assert(loaded.some(src=>src.includes("/assets/"+asset+"?v=20261125-creature-hp-v1")),"New creature HP asset must have fresh cache-busting URL: "+asset);
   }
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const ids=await page.evaluate(()=>{
    const c=window.ZIZI_5R_CREATURES;
    const wild=c.find(x=>x.name==="Cat"&&x.source==="XMM");
    const land=c.find(x=>x.name==="Beast of the Land"&&x.source==="XPHB");
    const summons=c.find(x=>x.name==="Bestial Spirit"&&x.source==="XPHB");
    S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=3;
    S.classLevels={"遊俠":3};S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獸王");S.base={str:10,dex:14,con:14,int:10,wis:18,cha:10};
    S.classChoices2024={"遊俠":{primalBeast:(window.ZIZI_5R_CREATURES_ZH[land.id].nameZh)}};
    S.creatureLibrary={wildShape:[wild.id],mounts:[wild.id],summons:[{creatureId:summons.id,spell:"Summon Beast"}]};
    S.familiar={creatureId:wild.id,spirit:"fey",status:"present"};
    S.gear=S.gear||{};S.gear.purchases={"mkt:乘用馬":2};
    S.gear.shopMounts=[];
    document.getElementById("fName").value="QA Creature HP";go(11);
    return {land:land.id,wild:wild.id,summon:summons.id};
   });
   await page.evaluate(()=>document.getElementById("rulesetModal")?.classList.remove("open"));
   const over=await page.evaluate(()=>({vw:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
   assert(over.html<=over.vw+2&&over.body<=over.vw+2,"Creature HP page horizontal overflow "+JSON.stringify(over));
   if(process.env.QA_SCREENSHOT_DIR){fs.mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});await page.locator("#psCreatures").screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,"play-creature-hp-"+width+".png")});}
   const companion=page.locator('.psc-card[data-psc-kind="companion"]');
   assert.equal(await companion.count(),1);
   assert.equal(await companion.locator(".psc-stat-hint").isVisible(),true,"固定傷害公式不應被藏在收合區");
   assert.match(await companion.locator(".psc-stat-hint").innerText(),/1d8 \+ 2（固定傷害加值，不等於熟練加值）/, "公開跑團狀態的傷害卡應直接說明 +2 為固定傷害而非熟練加值");
   const formula=companion.locator("details.psc-derived");
   await formula.locator("summary").click();
   assert.match(await formula.innerText(),/固定傷害加值，不等於熟練加值/, "計算來源需明示固定 +2 的意義");
   await formula.locator("summary").click();
   assert.match(await companion.locator(".psc-hp-label").innerText(),/20 \/ 20/);
   await companion.locator("[data-psc-amount]").fill("7");
   await companion.locator('[data-psc-op="damage"]').click();
   assert.match(await companion.locator(".psc-hp-label").innerText(),/13 \/ 20/);
   const familiar=page.locator('.psc-card[data-psc-kind="familiar"]');
   await familiar.locator("[data-psc-current]").fill("0");
   await familiar.locator('[data-psc-op="set"]').click();
   assert.match(await familiar.locator(".psc-hp-label").innerText(),/0 \/ 2/);
   const wildShape=page.locator('.psc-card[data-psc-kind="wildShape"]');
   await wildShape.locator("[data-psc-amount]").fill("1");
   await wildShape.locator('[data-psc-op="damage"]').click();
   assert.match(await wildShape.locator(".psc-hp-label").innerText(),/1 \/ 2/);
   const ordinaryMount=page.locator('.psc-card[data-psc-kind="mount"]');
   await ordinaryMount.locator("[data-psc-current]").fill("0");
   await ordinaryMount.locator('[data-psc-op="set"]').click();
   assert.match(await ordinaryMount.locator(".psc-hp-label").innerText(),/0 \/ 2/);
   const summon=page.locator('.psc-card[data-psc-kind="summon"]');
   await summon.locator("[data-psc-max]").fill("35");
   await summon.locator('[data-psc-op="max"]').click();
   assert.match(await summon.locator(".psc-hp-label").innerText(),/35 \/ 35/);
   const mounts=page.locator(".sgl-card[data-psc-kind=ownedMount]");
   assert.equal(await mounts.count(),2);
   await mounts.nth(0).locator("summary").click();
   await mounts.nth(0).locator("[data-psc-amount]").fill("5");
   await mounts.nth(0).locator('[data-psc-op="damage"]').click();
   assert.equal(await mounts.nth(0).getAttribute("open"),"","The purchased mount remains expanded after HP edit");
   const hp=await page.evaluate(()=>JSON.parse(JSON.stringify(S.play.creatureHp)));
   assert.equal(hp["companion|"+ids.land].current,13);
   assert.equal(hp["familiar|"+ids.wild].current,0);
   assert.equal(hp["wildShape|"+ids.wild].current,1);
   assert.equal(hp["mount|"+ids.wild].current,0);
   assert.equal(hp["summon|"+ids.summon+"|Summon Beast"].max,35);
   assert.equal(hp["ownedMount|"+await mounts.nth(0).getAttribute("data-psc-id")].current,8);
   const two=await mounts.evaluateAll(els=>els.map(el=>({id:el.dataset.pscId,hp:el.querySelector(".psc-hp-label")?.textContent})));
   assert.notEqual(two[0].id,two[1].id);assert.notEqual(two[0].hp,two[1].hp);
   const same=await page.evaluate(()=>{const data=serialize();const old=JSON.stringify(S.play.creatureHp);deserialize(data);return JSON.stringify(S.play.creatureHp)===old;});
   assert.equal(same,true);
   const savedId=await page.evaluate(()=>S.id);
   assert(savedId,"Character save ID is required");
   await page.waitForFunction(id=>{
    try{const raw=localStorage.getItem("dnd5r:char:"+id);return !!JSON.parse(raw||"null")?.play?.creatureHp?.["companion|beast-of-the-land|xphb"];}catch{return false}
   },savedId,{timeout:6000});
   await page.reload({waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof loadChar==="function"&&!!window.PlayStatusCreatures5R);
   await page.evaluate(id=>{loadChar(id);go(11);document.getElementById("rulesetModal")?.classList.remove("open");},savedId);
   const persisted=await page.evaluate(()=>JSON.parse(JSON.stringify(S.play.creatureHp)));
   assert.equal(persisted["companion|"+ids.land].current,13);
   assert.equal(persisted["familiar|"+ids.wild].current,0);
   assert.equal(persisted["wildShape|"+ids.wild].current,1);
   assert.equal(persisted["mount|"+ids.wild].current,0);
   assert.equal(persisted["summon|"+ids.summon+"|Summon Beast"].max,35);
   assert.deepEqual(errors,[]);
   console.log("PASS browser "+width+"px: actions, same-shape independent mounts, save roundtrip");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

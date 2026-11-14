"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {pathToFileURL}=require("node:url"),{chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const report=[];
 try{for(const width of [390,480,1440]){
  const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
  await page.goto(pathToFileURL(path.join(root,"index.html")).href,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof go==="function"&&window.PlayStatusCreatures5R&&window.CreatureImport5R);
  await page.waitForTimeout(300);
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  const sample=await page.evaluate(()=>{
   const creatures=window.ZIZI_5R_CREATURES,z=window.ZIZI_5R_CREATURES_ZH;
   const wild=creatures.find(x=>x.isBeast&&!x.isSwarm&&x.wildBaseMin!=null&&x.wildBaseMin<=4);
   const mount=creatures.find(x=>typeof prMountKind==="function"&&prMountKind(x));
   const familiar=creatures.find(x=>typeof prFamiliarKind==="function"&&prFamiliarKind(x)==="normal");
   const companion=creatures.find(x=>x.source==="XPHB"&&x.summonedByClass&&x.summonedByClass.startsWith("Ranger")&&x.name==="Beast of the Land");
   const summoner=creatures.find(x=>x.summonedBySpell&&!String(x.summonedBySpell).includes("Find Familiar"));
   if(!wild||!mount||!familiar||!companion)throw Error("Canonical creature fixture missing");
   S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={德魯伊:4};
   S.base={str:10,dex:12,con:14,int:10,wis:16,cha:10};S.bg=null;S.sp=null;S.sub=null;
   S.classChoices2024={};S.creatureLibrary={wildShape:[wild.id],mounts:[mount.id],summons:summoner?[{creatureId:summoner.id,spell:String(summoner.summonedBySpell).split("|")[0]}]:[]};
   S.familiar={creatureId:familiar.id,spirit:"fey",notes:"",status:"dismissed"};
   document.getElementById("fName").value="QA_已導入生物";go(11);
   return {wild:wild.id,mount:mount.id,familiar:familiar.id,companion:companion.id,companionName:z[companion.id]?.nameZh,
    summon:summoner?.id||null,original:JSON.stringify(S.creatureLibrary)};
  });
  const cards=page.locator("#playStatusBody .psc-card");
  const types=await cards.evaluateAll(els=>els.map(x=>x.dataset.pscKind));
  assert(types.includes("wildShape")&&types.includes("mount")&&types.includes("familiar"),"Druid must have wild shape, mount and familiar projection");
  assert.equal(await page.locator('#playStatusBody .psc-card[data-psc-kind="wildShape"][data-psc-id="'+sample.wild+'"]').count(),1);
  assert.equal(await page.locator('#playStatusBody .psc-card[data-psc-kind="mount"][data-psc-id="'+sample.mount+'"]').count(),1);
  assert.match(await page.locator("#psCreatures").innerText(),/暫時遣返/);
  assert.match(await page.locator("#psCreatures").innerText(),/原始 HP/);
  assert.match(await page.locator("#psCreatures").innerText(),/生物／夥伴／坐騎/);
  const original=await page.evaluate(()=>JSON.stringify(S.creatureLibrary));
  await page.locator('#playStatusBody [data-ps-action="damage1"]').click();
  assert.equal(await page.locator("#playStatusBody .psc-card").count(),types.length,"HP rerender must preserve creature cards");
  assert.equal(await page.evaluate(()=>JSON.stringify(S.creatureLibrary)),original,"Read-only projection cannot mutate saved creature collection");
  await page.locator('#playStatusBody [data-ps-action="creatureJump"]').click();
  assert(await page.locator("#psCreatures").isVisible(),"Quick jump creature section must remain visible");
  await page.locator('#playStatusBody .psc-card[data-psc-kind="wildShape"][data-psc-id="'+sample.wild+'"] [data-ps-action="creature"]').click();
  assert.equal(await page.locator('#finalSheet .ci-card[data-ci-kind="wildShape"][data-ci-id="'+sample.wild+'"]').count(),1,"Full creature card must be targetable by stable source ID");
  assert(await page.locator('#finalSheet .ci-card[data-ci-kind="wildShape"][data-ci-id="'+sample.wild+'"]').evaluate(x=>x.open),"Full card should be expanded after jump");
  await page.evaluate(()=>go(11));
  await page.locator('#playStatusBody .psc-card[data-psc-kind="familiar"] [data-ps-action="creature"]').click();
  assert.equal(await page.locator("#warlockFamiliar").count(),1,"Familiar should navigate to existing canonical sheet");
  await page.evaluate(()=>go(11));
  if(width===390){
   fs.mkdirSync(path.join(root,"tmp"),{recursive:true});
   await page.locator("#psCreatures").screenshot({path:path.join(root,"tmp","qa-play-creatures-390.png")});
  }
  await page.evaluate(name=>{
   S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=3;S.classLevels={遊俠:3};
   S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獸王");
   S.classChoices2024={遊俠:{primalBeast:name}};
   S.base.wis=16;go(11);
  },sample.companionName);
  const companion=page.locator('#playStatusBody .psc-card[data-psc-kind="companion"]');
  assert.equal(await companion.count(),1,"Ranger beast master must appear in run-state");
  const text=await companion.innerText();
  assert(text.includes("野獸打擊命中")&&text.includes("+5"),"Attack should use owner spell attack bonus");
  assert(text.includes("命中傷害")&&text.includes("1d8 +5"),"Damage should use owner Wisdom modifier");
  assert(text.includes("法術豁免 DC")&&text.includes("13"),"DC should be current");
  await page.evaluate(()=>{S.level=5;S.classLevels={遊俠:5};S.base.wis=18;go(11)});
  const newText=await companion.innerText();
  assert(newText.includes("1d8 +6")&&newText.includes("+7"),"Companion should recalculate after level up and Wisdom change");
  const saved=await page.evaluate(()=>serialize());
  await page.evaluate(s=>{const r=deserialize(s);if(!r.ok)throw Error("Saved creature reload failed");go(11)},saved);
  assert.equal(await page.locator('#playStatusBody .psc-card[data-psc-kind="companion"]').count(),1,"Save roundtrip preserves ranger companion");
  assert.equal(await page.locator('#playStatusBody .psc-card[data-psc-kind="mount"]').count(),1,"Save roundtrip preserves mount");
  await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");S.level=3;S.classLevels={戰士:3};go(11)});
  assert.equal(await page.locator("#psCreatures .psc-card").count(),0,"2014 should not silently apply 2024 creature rules");
  const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(overflow.scroll<=overflow.width+2,"No horizontal overflow "+JSON.stringify(overflow));
  assert.deepEqual(errors,[],"No frontend errors");
  report.push({width,wild:sample.wild,mount:sample.mount,familiar:sample.familiar,companion:sample.companion,initial:types,rangerRecalc:true,roundtrip:true});
  await page.close();
 }
 console.log(JSON.stringify({pass:true,screens:report.length,report},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

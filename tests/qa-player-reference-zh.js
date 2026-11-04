"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert"),{chromium}=require("playwright");
const ROOT=path.resolve(__dirname,".."),URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{let b;try{
 b=await chromium.launch({headless:true,channel:"chrome"});
 const p=await b.newPage({viewport:{width:1440,height:900}}),errors=[];
 p.on("pageerror",e=>errors.push(String(e)));
 await p.goto(URL+"?zh-ref-qa=20261027-zh-v4",{waitUntil:"networkidle"});
 if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
 await p.evaluate(()=>go(8));
 const data=await p.evaluate(()=>{
  const I=window.ZIZI_5R_MAGIC_ITEMS||[],IZ=window.ZIZI_5R_MAGIC_ITEMS_ZH||{},C=window.ZIZI_5R_CREATURES||[],CZ=window.ZIZI_5R_CREATURES_ZH||{},M=window.ZIZI_5R_PLAYER_REFERENCE_ZH_META||{};
  const item=n=>{const x=I.find(v=>v.name===n);return x?IZ[x.id]:null};
  const mon=n=>{const x=C.find(v=>v.name===n);return x?CZ[x.id]:null};
  const allZh=JSON.stringify({IZ,CZ});
  const latin=/[A-Za-z]{2,}/;
  return {meta:M,ic:Object.keys(IZ).length,cc:Object.keys(CZ).length,
   itemLatin:Object.values(IZ).filter(z=>latin.test(z.bodyZh||"")).length,
   unresolvedItemRefs:Object.values(IZ).filter(z=>/\{#|\{\{/.test(z.bodyZh||"")).length,
   creatureLatin:Object.values(CZ).filter(z=>latin.test(z.bodyZh||"")).length,
   reps:{
    black:item("Blackrazor"),axe:item("Axe of the Dwarvish Lords"),belt:item("Belt of Cloud Giant Strength"),
    ring:item("Ring of Acid Resistance"),scroll:item("Scroll of Protection (Beasts)"),staff:item("Staff of the Magi"),horn:item("Horn of Blasting"),robe:item("Robe of Useful Items"),
    bestial:mon("Bestial Spirit"),steed:mon("Otherworldly Steed"),baboon:mon("Baboon"),gas:mon("Gas Spore Fungus"),basilisk:mon("Basilisk"),gorgon:mon("Gorgon")
   },memoryCount:(allZh.match(/記憶體/g)||[]).length};
 });
 const fail=[...errors];
 const ok=(v,m)=>{if(!v)fail.push(m)};
 ok(data.meta.source==="tjliqy/5etools-cn","zh source");
 ok(data.meta.branch==="cn2.0","zh branch");
 ok(data.meta.commit==="5cc0bbe2c2b241a334e731af4448bdba2168e8bd","zh commit");
 ok(data.ic===435&&data.cc===520,"projection coverage");
 ok(data.itemLatin===0&&data.creatureLatin===0,"English residue outside names");
 ok(data.unresolvedItemRefs===0,"unexpanded itemEntry references");
 ok(data.reps.ring?.bodyZh?.includes("強酸")&&data.reps.ring?.bodyZh?.includes("珍珠")&&data.reps.ring.bodyZh.length>30,"ring resistance template");
 ok(data.reps.scroll?.bodyZh?.includes("野獸")&&data.reps.scroll.bodyZh.length>100,"scroll protection template");
 ok(data.reps.staff?.bodyZh?.includes("1d12 + 1"),"Staff of the Magi recharge dice");
 ok(data.reps.horn?.bodyZh?.includes("5d6")&&data.reps.horn.bodyZh.includes("20%"),"Horn of Blasting dice and chance");
 ok(data.reps.gas?.bodyZh?.includes("2d4")&&data.reps.gas.bodyZh.includes("2d6"),"Gas Spore Fungus reproduction dice");
 ok(data.reps.gas?.bodyZh?.includes("體質豁免檢定"),"ability attached to saving throw");
 ok((data.reps.basilisk?.bodyZh||"").includes("第一次豁免失敗")||(data.reps.gorgon?.bodyZh||"").includes("第一次豁免失敗"),"first failed save stage");
 ok(data.reps.robe?.bodyZh?.includes("500金幣")||data.reps.robe?.bodyZh?.includes("500 金幣"),"Robe of Useful Items currency");
 ok(data.memoryCount===0,"OpenCC memory-context drift");
 ok(!JSON.stringify(data.reps).includes("內存在"),"awkward spatial conversion");
 ok(!JSON.stringify(data.reps).includes("環階"),"spell-level terminology drift");
 ok(data.reps.black?.nameZh==="黑刃","Blackrazor name");
 ok(data.reps.axe?.nameZh==="矮人王聖斧","Axe name");
 ok(data.reps.belt?.nameZh==="雲巨人之力腰帶","Belt name");
 ok(data.reps.bestial?.nameZh==="野獸靈魄","Bestial Spirit name");
 ok(data.reps.steed?.nameZh==="異界坐騎","Otherworldly Steed name");
 ok(data.reps.baboon?.bodyZh?.includes("未失能")&&data.reps.baboon?.bodyZh?.includes("具有優勢"),"Baboon Pack Tactics mechanics");
 ok(!data.reps.baboon?.bodyZh?.includes("未優勢")&&!data.reps.baboon?.bodyZh?.includes("具有失能"),"Baboon semantic inversion");
 ok(data.reps.bestial?.acZh&&!/[A-Za-z]{2,}/.test(data.reps.bestial.acZh),"Bestial Spirit AC formula zh");
 ok(data.reps.bestial?.hpZh&&!/[A-Za-z]{2,}/.test(data.reps.bestial.hpZh),"Bestial Spirit HP formula zh");

 await p.locator('[data-r="item"]').click();await p.waitForTimeout(60);
 await p.locator("#itemRefQ").fill("黑刃");await p.waitForTimeout(60);
 let cards=await p.locator(".item-card").count();ok(cards>=1,"Chinese item search");
 let card=p.locator(".item-card").first();ok((await card.locator(".pr-name").innerText()).includes("黑刃｜Blackrazor"),"bilingual item title");
 let meta=await card.locator(".pr-meta").innerText();ok(!/artifact|Attunement|wondrous/i.test(meta),"item metadata English");
 await card.locator("summary").click();let body=await card.locator(".pr-body").innerText();
 ok(body.includes("來源：2024 地下城主指南"),"item source zh");ok(!body.includes("Blackrazor"),"item body English name");
 await p.locator("#itemRefQ").fill("Blackrazor");await p.waitForTimeout(60);ok(await p.locator(".item-card").count()>=1,"English item search");

 await p.locator('[data-r="creature"]').click();await p.waitForTimeout(60);
 await p.locator("#creatureRefQ").fill("野獸靈魄");await p.waitForTimeout(60);
 cards=await p.locator(".creature-card").count();ok(cards>=1,"Chinese creature search");
 card=p.locator(".creature-card").first();ok((await card.locator(".pr-name").innerText()).includes("野獸靈魄｜Bestial Spirit"),"bilingual creature title");
 await card.locator("summary").click();body=await card.locator(".pr-body").innerText();
 ok(body.includes("特性")&&body.includes("動作"),"creature section headings");
 ok(!/Bonus Actions|Legendary Actions|Reactions|Spellcasting/i.test(body),"creature body English headings");
 await p.locator("#creatureRefQ").fill("Bestial Spirit");await p.waitForTimeout(60);ok(await p.locator(".creature-card").count()>=1,"English creature search");

 const m=await b.newPage({viewport:{width:390,height:844}});
 await m.goto(URL+"?open=item&v=20261027-zh-v2",{waitUntil:"networkidle"});
 if(await m.locator("#closeRuleset").isVisible())await m.locator("#closeRuleset").click();
 await m.waitForTimeout(200);
 const mob1=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 await m.goto(URL+"?open=creature&v=20261027-zh-v2",{waitUntil:"networkidle"});await m.waitForTimeout(200);
 const mob2=await m.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 ok(mob1<=1&&mob2<=1,"mobile overflow");
 const builder=fs.readFileSync(path.join(ROOT,"scripts/build-5r-zh-projection.py"),"utf8");
 ok(!/DND5e_chm|huiji|ollama|qwen|requests/i.test(builder),"builder has forbidden fallback source");
 console.log(JSON.stringify({data:{meta:data.meta,ic:data.ic,cc:data.cc,itemLatin:data.itemLatin,creatureLatin:data.creatureLatin},mob1,mob2,fail,failureCount:fail.length},null,2));
 assert.equal(fail.length,0,"Traditional Chinese player-reference failures="+fail.length);
 }finally{if(b)await b.close()}})().catch(e=>{console.error(e);process.exit(1)});

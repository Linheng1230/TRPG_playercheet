"use strict";
const fs=require("fs"),assert=require("assert"),{chromium}=require("playwright");
const src=JSON.parse(fs.readFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024/data__items-base.json","utf8").replace(/^\uFEFF/,""));
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"}),p=await b.newPage();
 await p.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
 const data=await p.evaluate(()=>{S.ruleset="2024";syncRulesetUI();return {site:SHOP_TOOLS.filter(x=>x[0]!=="一種樂器").map(x=>({raw:x[0],name:displayName5R("tools",x[0]),value:x[1]})),armor:[...ARMORS.map(x=>({raw:x.n,name:displayName5R("armors",x.n),value:x.gp*100})),{raw:SHIELD.n,name:displayName5R("armors",SHIELD.n),value:SHIELD.gp*100}],enByZh:Object.fromEntries(Object.entries(NAMES5R.items||{}).map(([en,v])=>[v.zh,en]))}});const site=data.site;
 const byEn=new Map(src.baseitem.filter(x=>x.source==="PHB2024").map(x=>[x.ENG_name,x]));
 const missing=[],price=[];
 for(const x of site){
   const row=byEn.get(data.enByZh[x.name]);
   if(!row){missing.push(x);continue}
   if(row.value!==x.value)price.push({name:x.name,have:x.value,want:row.value,en:row.ENG_name});
 }
 const armorMissing=[],armorPrice=[];for(const x of data.armor){const row=byEn.get(data.enByZh[x.name]);if(!row){armorMissing.push(x);continue}if(row.value!==x.value)armorPrice.push({name:x.name,have:x.value,want:row.value,en:row.ENG_name})}
 console.log(JSON.stringify({tools:{site:site.length,missing,price},armor:{site:data.armor.length,missing:armorMissing,price:armorPrice},pass:!missing.length&&!price.length&&!armorMissing.length&&!armorPrice.length},null,2));
 assert.deepEqual(missing,[]);assert.deepEqual(price,[]);assert.deepEqual(armorMissing,[]);assert.deepEqual(armorPrice,[]);await b.close();
})().catch(e=>{console.error(e);process.exit(1)});

const {chromium}=require("playwright");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const page=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto("http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const base=await page.evaluate(()=>{
   const missing=SPELLS.filter(x=>!String(x.eng||"").trim()).map(x=>x.n);
   const expected=globalThis.ZIZI_5R_CANONICAL_NAMES?.spells||{};
   const nameMismatches=SPELLS.filter(x=>expected[x.eng]!==x.n).map(x=>({eng:x.eng,have:x.n,want:expected[x.eng]}));
   const canonicalNames=new Set(Object.values(expected));
   const aliasCollisions=Object.entries(globalThis.SPELLS_2024_LEGACY_NAMES||{}).filter(([legacy,canonical])=>canonicalNames.has(legacy)&&legacy!==canonical).map(([legacy,canonical])=>({legacy,canonical}));
   const fire=SPELLS.find(x=>x.n==="火球術");
   return {count:SPELLS.length,missing,nameMismatches,aliasCollisions,fire:fire?{eng:fire.eng,display:spellNameText(fire)}:null,tip:spellTipHTML("火球術")};
 });
 await page.evaluate(()=>go(9));await page.locator("#srefQ").fill("Fireball");await page.waitForTimeout(100);
 const search=await page.evaluate(()=>({
   names:[...document.querySelectorAll(".sref-entry .sr-name")].map(x=>x.textContent.trim()),
   metas:[...document.querySelectorAll(".sref-entry .sr-meta")].map(x=>x.textContent.trim())
 }));
 const visible=await page.evaluate(()=>({
   rawChineseOnlySref:[...document.querySelectorAll(".sref")].filter(x=>x.textContent.trim()==="火球術").length,
   fireDisplay:[...document.querySelectorAll(".sref")].find(x=>x.dataset.sref==="火球術")?.textContent.trim()||""
 }));
 await b.close();
 const pass=!errors.length&&base.count===391&&!base.missing.length&&!base.nameMismatches.length&&!base.aliasCollisions.length&&base.fire?.eng==="Fireball"&&base.fire.display==="火球術 Fireball"&&base.tip.includes("火球術 Fireball")&&search.names.includes("火球術 Fireball")&&!search.metas.some(x=>/Fireball|Evocation|Wizard|Sorcerer/i.test(x));
 console.log(JSON.stringify({errors,base,search,visible,pass},null,2));process.exit(pass?0:1);
})().catch(e=>{console.error(e);process.exit(2)});
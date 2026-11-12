const {chromium}=require("playwright");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const page=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html"),{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(()=>go(9));await page.waitForTimeout(100);
 const base=await page.evaluate(()=>({
   spells:SPELLS.length,
   ruleCount:Object.keys(globalThis.SPELLS_2024_FULL_RULES||{}).length,
   hasDigestGlobal:typeof globalThis.SPELLS_2024_DIGESTS!=="undefined",
   empty:SPELLS.filter(x=>!x.d).length,
   dualTextNodes:document.querySelectorAll(".sr-d,.sr-full,.sr-full-body").length,
   filters:[...document.querySelectorAll(".spell-filter-chip")].map(x=>x.textContent.trim()),
   bodyOverflow:document.body.scrollWidth>innerWidth+2
 }));
 const click=async(g,v)=>page.locator(`.spell-filter-chip[data-sf-group="${g}"][data-sf-value="${v}"]`).click();
 await click("lv","1");await click("lv","2");await click("cls","W");await click("cls","C");await click("tag","con");await click("comp","v");
 const filtered=await page.evaluate(()=>({
   active:[...document.querySelectorAll(".spell-filter-chip.active")].map(x=>[x.dataset.sfGroup,x.dataset.sfValue]),
   shown:[...document.querySelectorAll(".sref-entry")].map(x=>x.querySelector(".sr-name")?.textContent),
   invalid:[...document.querySelectorAll(".sref-entry")].map(x=>x.dataset.sref).filter(n=>{
     const sp=SPELLS.find(x=>x.n===n);if(!sp)return true;
     const cf=spellComponentFlags(sp);
     return !["1","2"].includes(String(sp.lv))||!/[WC]/.test(sp.cls)||!sp.con||!cf.v;
   }),
   overflow:[...document.querySelectorAll(".spell-filter-panel,.sref-entry,.sr-rule-content")].filter(x=>x.scrollWidth>x.clientWidth+2).length
 }));
 await page.locator("#srefClear").click();
 const cleared=await page.evaluate(()=>({active:document.querySelectorAll(".spell-filter-chip.active").length,q:document.querySelector("#srefQ").value}));
 await b.close();
 const out={errors,base,filtered,cleared};console.log(JSON.stringify(out,null,2));
 if(errors.length||base.spells!==391||base.ruleCount!==391||base.hasDigestGlobal||base.empty||base.dualTextNodes||base.bodyOverflow||filtered.invalid.length||filtered.overflow||cleared.active||cleared.q)process.exit(1);
})().catch(e=>{console.error(e);process.exit(2)});

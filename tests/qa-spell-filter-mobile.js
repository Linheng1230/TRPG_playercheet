const {chromium}=require("playwright");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const page=await b.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html"),{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(()=>go(9));await page.waitForTimeout(100);
 for(const [g,v] of [["tag","con"],["tag","rit"],["lv","0"],["lv","1"],["cls","W"],["cls","C"],["comp","v"],["comp","m"]]){
   await page.locator(`.spell-filter-chip[data-sf-group="${g}"][data-sf-value="${v}"]`).click();
 }
 const out=await page.evaluate(()=>({
   bodyW:document.body.scrollWidth,viewport:innerWidth,
   panelW:document.querySelector("#srefFilters")?.scrollWidth,panelClient:document.querySelector("#srefFilters")?.clientWidth,
   entries:[...document.querySelectorAll(".sref-entry")].length,
   bad:[...document.querySelectorAll("#srefFilters,.sref-entry,.sr-rule-content")].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>({cls:x.className,cw:x.clientWidth,sw:x.scrollWidth})),
   active:document.querySelectorAll(".spell-filter-chip.active").length,
   dualTextNodes:document.querySelectorAll(".sr-d,.sr-full,.sr-full-body").length,
   compText:[...document.querySelectorAll(".sr-meta")].slice(0,3).map(x=>x.innerText)
 }));
 await page.screenshot({path:"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/spell-filter-mobile.png",fullPage:true});
 await b.close();console.log(JSON.stringify({errors,out},null,2));
 if(errors.length||out.bodyW>out.viewport+2||out.bad.length||out.active!==8||out.dualTextNodes)process.exit(1);
})().catch(e=>{console.error(e);process.exit(2)});

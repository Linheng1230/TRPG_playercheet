const {chromium}=require("playwright");
const fs=require("fs");const URL=(process.env.QA_URL||"http://127.0.0.1:18766/index.html");
async function run(width,height,label){
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const page=await b.newPage({viewport:{width,height}});page.setDefaultTimeout(7000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto(URL,{waitUntil:"networkidle"});if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(()=>go(9));
 await page.locator("#srefQ").fill("魔法伎倆");
 // Drain the input handler\'s 110ms debounced render before reading DOM metrics.
 // Otherwise a later async refresh can detach the already-located rule body.
 await page.waitForTimeout(260);
 // Readability tests need one exact canonical spell, not an arbitrary first result from an unfinished filter render.
 // Search-input debounce is covered by its own browser regression; render the selected query deterministically here.
 await page.evaluate(()=>renderSpellRefList());
 const entry=page.locator('.sref-entry[data-sref="魔法伎倆"]');
 await entry.waitFor({state:"visible"});
 await page.waitForFunction(()=>{const n=document.querySelector('.sref-entry[data-sref="魔法伎倆"] .sr-rule-content');return !!n&&n.isConnected&&n.getClientRects().length>0&&parseFloat(getComputedStyle(n).fontSize)>0;});
 const metrics=await entry.evaluate(el=>{
   const full=el.querySelector(".sr-rule-content"),meta=el.querySelector(".sr-meta"),blocks=[...el.querySelectorAll(".sr-rule-block")];
   const cs=x=>getComputedStyle(x),num=v=>parseFloat(v||"0"),fullStyle=cs(full),metaStyle=cs(meta);
   return {bodyW:document.body.scrollWidth,viewportW:innerWidth,entryOverflow:el.scrollWidth-el.clientWidth,
    full:{font:num(fullStyle.fontSize),line:num(fullStyle.lineHeight),color:fullStyle.color,family:fullStyle.fontFamily,width:full.getBoundingClientRect().width,scroll:full.scrollWidth-full.clientWidth},
    meta:{font:num(metaStyle.fontSize),color:metaStyle.color},blocks:blocks.length,
    labels:[...el.querySelectorAll(".sr-rule-label")].map(x=>x.textContent.trim()),fullText:full.innerText,
    dualTextNodes:el.querySelectorAll(".sr-d,.sr-full,.sr-full-body").length};
 });
 await page.screenshot({path:`D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/readability-${label}.png`,fullPage:false});await b.close();
 const minBody=width<=520?15:15.5;
 const checks={noErrors:!errors.length,bodyWidth:metrics.bodyW<=metrics.viewportW+2,entryWidth:metrics.entryOverflow<=2,ruleWidth:metrics.full.scroll<=2,fontSize:metrics.full.font>=minBody,lineHeight:metrics.full.line/metrics.full.font>=1.75,ruleBlocks:metrics.blocks>=3,uniqueRule:!metrics.dualTextNodes,zhFont:/PingFang|Noto Sans|Microsoft JhengHei|system-ui/i.test(metrics.full.family)};
 const pass=Object.values(checks).every(Boolean);
 console.log("SPELL_READABILITY_GATE",JSON.stringify({width,height,label,checks,metrics:{bodyW:metrics.bodyW,viewportW:metrics.viewportW,entryOverflow:metrics.entryOverflow,full:metrics.full,blocks:metrics.blocks,dualTextNodes:metrics.dualTextNodes},errors}));
 return {label,width,height,errors,metrics,pass};
}
(async()=>{const out=[];for(const c of [[1440,900,"desktop"],[480,760,"narrow"],[390,844,"mobile"]])out.push(await run(...c));fs.writeFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/qa-spell-readability.json",JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));process.exit(out.every(x=>x.pass)?0:1)})().catch(e=>{console.error(e);process.exit(2)});

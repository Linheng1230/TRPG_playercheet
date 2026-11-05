const {chromium}=require("playwright");
const fs=require("fs");const URL="http://127.0.0.1:18766/index.html";
async function run(width,height,label){
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const page=await b.newPage({viewport:{width,height}});page.setDefaultTimeout(7000);
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto(URL,{waitUntil:"networkidle"});if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(()=>go(9));await page.waitForTimeout(100);await page.locator("#srefQ").fill("魔法伎倆");await page.waitForTimeout(180);
 const entry=page.locator(".sref-entry").first();
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
 const pass=!errors.length&&metrics.bodyW<=metrics.viewportW+2&&metrics.entryOverflow<=2&&metrics.full.scroll<=2&&metrics.full.font>=minBody&&metrics.full.line/metrics.full.font>=1.75&&metrics.blocks>=3&&!metrics.dualTextNodes&&/PingFang|Noto Sans|Microsoft JhengHei|system-ui/i.test(metrics.full.family);
 return {label,width,height,errors,metrics,pass};
}
(async()=>{const out=[];for(const c of [[1440,900,"desktop"],[480,760,"narrow"],[390,844,"mobile"]])out.push(await run(...c));fs.writeFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/qa-spell-readability.json",JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));process.exit(out.every(x=>x.pass)?0:1)})().catch(e=>{console.error(e);process.exit(2)});
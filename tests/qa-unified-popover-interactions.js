"use strict";
const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const URL=process.env.QA_URL||"http://127.0.0.1:18919/index.html";
(async()=>{
const browser=await chromium.launch({headless:true,channel:"chrome"});
const results=[];
for(const width of [1280,390,320]){
 const page=await browser.newPage({viewport:{width,height:800},hasTouch:width<700,isMobile:width<700});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(URL,{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(()=>{
  S.ruleset="2024";syncRulesetUI();
  const make=(id,cls,tip,title,top)=>{
    const e=document.createElement("span");e.id=id;e.className=cls;
    e.style.cssText="position:fixed;top:"+top+"px;left:20px;padding:8px;background:#e8c66a;color:#221;z-index:201;";
    if(cls==="sref")e.dataset.sref=tip;else {e.dataset.tip=tip;e.dataset.tipTitle=title}
    e.textContent=title;document.body.appendChild(e);
  };
  make("qa-spell", "sref","火球術","火球術",80);
  make("qa-feature","ft","攻擊者對你的攻擊檢定具有劣勢。這個效果持續到你的下回合開始。","閃避特性",180);
 });
 for(const [type,tipId,trigger] of [["spell","#spellTip","#qa-spell"],["feature","#featureTip","#qa-feature"]]){
  const t=page.locator(trigger);
  if(width>=700)await t.hover();else await t.tap();
  const shown=await page.locator(tipId).isVisible();
  const details=await page.locator(tipId).innerText();
  const bounds=await page.locator(tipId).evaluate(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}));
  if(width>=700)await t.click();
  const pin=await page.evaluate(tp=>rulePopoverState.pinnedType===tp,type);
  if(width>=700)await page.mouse.move(width-10,35);
  const remains=await page.locator(tipId).isVisible();
  if(width>=700)await t.click();else await t.tap();
  const closed=!(await page.locator(tipId).isVisible());
  results.push({width,type,shown,pin,remains,closed,bounds,hasFullRule:type==="spell"?details.includes("8d6"):details.includes("劣勢"),errors:[...errors]});
 }
 await page.close();
}
await browser.close();
console.log(JSON.stringify(results,null,2));
assert(results.every(r=>r.shown&&r.pin&&r.remains&&r.closed&&r.hasFullRule&&!r.errors.length&&r.bounds.width<=Math.min(360,r.width-16)+1&&r.bounds.height<=490+1&&r.bounds.scrollWidth<=r.bounds.clientWidth+2));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

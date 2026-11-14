"use strict";
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const url=process.env.QA_URL||"http://192.168.0.248:18887/index.html";
(async()=>{
const browser=await chromium.launch({headless:true,channel:"chrome"});
const reports=[];
for(const [width,height] of [[1280,850],[390,844],[320,700]]){
 const page=await browser.newPage({viewport:{width,height}});
 const errs=[];page.on("pageerror",e=>errs.push(e.message));
 await page.goto(url,{waitUntil:"networkidle"});
 const report=await page.evaluate(()=>{
  const failures=[];
  S.ruleset="2024";syncRulesetUI();
  const spells=SPELLS.filter(sp=>sp.lv===0);
  const source=globalThis.CANTRIP_TOOLTIP_META_2024;
  if(!globalThis.cantripTooltip2024Ready)failures.push("script not loaded");
  if(spells.length!==34)failures.push("unexpected 2024 cantrip count "+spells.length);
  if(Object.keys(source||{}).length!==spells.length)failures.push("metadata projection count mismatch");
  let material=0,saves=0,full=0,scroll=0;
  for(const sp of spells){
    const html=spellTipHTML(sp.n);
    if(!html||!html.includes('data-cantrip-mode="compact"'))failures.push(sp.n+": missing compact");
    if(!html.includes("施法時間")||!html.includes("施法成分")||!html.includes("施法距離")||!html.includes("影響範圍")||!html.includes("攻擊／豁免"))failures.push(sp.n+": missing required fields");
    const entry=source[String(sp.eng||"").toLowerCase()];
    if(!entry)failures.push(sp.n+": metadata identifier missing");
    if(sp.signature.c[2]){material++; if(!entry?.material||!html.includes("材料需求"))failures.push(sp.n+": missing material")}
    if(entry?.save?.length){saves++;if(!html.includes("豁免"))failures.push(sp.n+": missing saving throw")}
    spellTip.innerHTML=rulePopoverCloseButtonHTML()+html;
    spellTip.style.display="block";spellTip.style.left="8px";spellTip.style.top="8px";
    const fullNode=spellTip.querySelector(".ct-full .tip-d");
    if(!fullNode || fullNode.innerHTML!==formatSpellRuleHTML(sp.d))failures.push(sp.n+": full rules changed");
    else full++;
    const box=spellTip.getBoundingClientRect();
    if(box.width>Math.min(innerWidth-16,360)+1||box.height>490+1)failures.push(sp.n+": box bounds "+JSON.stringify({width:box.width,height:box.height,expectedWidth:Math.min(innerWidth-16,360)}));
    if(spellTip.scrollWidth>spellTip.clientWidth+2)failures.push(sp.n+": horizontal overflow");
    if(spellTip.scrollHeight>spellTip.clientHeight)scroll++;
    const b=spellTip.querySelector('[data-cantrip-mode="full"]');
    b.click();
    if(spellTip.querySelector(".ct-full").hidden||!spellTip.querySelector(".ct-summary").hidden)failures.push(sp.n+": full toggle broken");
    spellTip.querySelector('[data-cantrip-mode="compact"]').click();
    if(!spellTip.querySelector(".ct-full").hidden||spellTip.querySelector(".ct-summary").hidden)failures.push(sp.n+": compact toggle broken");
  }
  spellTip.style.display="none";
  const testOther=SPELLS.find(x=>x.lv===1);
  const other=spellTipHTML(testOther.n);
  if(other.includes("data-cantrip-mode")||spellTip.classList.contains("cantrip-compact"))failures.push("1st-level spell affected");
  S.ruleset="2014";syncRulesetUI();
  const spell14=SPELLS14.find(x=>x.lv===0);
  const legacy=spellTipHTML(spell14.n);
  if(legacy.includes("data-cantrip-mode")||spellTip.classList.contains("cantrip-compact"))failures.push("2014 cantrip affected");
  return {total:spells.length,material,saves,full,scroll,failures};
 });
 reports.push({width,height,...report,errors:errs});
 await page.close();
}
await browser.close();
console.log(JSON.stringify(reports,null,2));
assert(reports.every(r=>r.total===34&&r.full===34&&r.material===10&&r.saves===8&&!r.failures.length&&!r.errors.length),"2024 cantrip compact tooltip regression");
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

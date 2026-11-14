const {chromium}=require("playwright");
(async()=>{
 const out=[];
 for(const [w,h,label] of [[1440,900,"desktop"],[480,760,"narrow"],[390,844,"mobile"]]){
  const b=await chromium.launch({headless:true,channel:"chrome"});
  const page=await b.newPage({viewport:{width:w,height:h}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  await page.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html"),{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const metrics=await page.evaluate(()=>{
    const tip=document.querySelector("#spellTip");
    tip.innerHTML=spellTipHTML("變戲法");
    tip.style.display="block";tip.style.left="8px";tip.style.top="8px";
    // 2024 cantrips default to concise mode: verify all legacy rules after switching to Full.
    tip.querySelector('[data-cantrip-mode="full"]')?.click();
    const body=tip.querySelector(".tip-d"),blocks=[...tip.querySelectorAll(".sr-rule-block")],labels=[...tip.querySelectorAll(".sr-rule-label")].map(x=>x.textContent.trim());
    const before=tip.scrollTop;tip.scrollTop=99999;const after=tip.scrollTop;
    return {
      blocks:blocks.length,labels,
      hasLastRule:tip.innerText.includes("一個小飾品不能造成傷害"),
      tipOverflowX:tip.scrollWidth-tip.clientWidth,
      bodyOverflowX:body.scrollWidth-body.clientWidth,
      rect:{left:tip.getBoundingClientRect().left,right:tip.getBoundingClientRect().right,top:tip.getBoundingClientRect().top,bottom:tip.getBoundingClientRect().bottom},
      viewport:{w:innerWidth,h:innerHeight},
      scrollable:tip.scrollHeight>tip.clientHeight,
      scrollWorked:tip.scrollHeight<=tip.clientHeight||after>before,
      pointer:getComputedStyle(tip).pointerEvents,
      lineHeight:parseFloat(getComputedStyle(body).lineHeight),
      fontSize:parseFloat(getComputedStyle(body).fontSize)
    };
  });
  await page.screenshot({path:`D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/spell-tooltip-${label}.png`,fullPage:false});
  await b.close();
  const pass=!errors.length&&metrics.blocks>=3&&metrics.labels.length>=3&&metrics.hasLastRule&&metrics.tipOverflowX<=1&&metrics.bodyOverflowX<=1&&metrics.rect.left>=0&&metrics.rect.right<=w+1&&metrics.pointer==="auto"&&metrics.scrollWorked&&metrics.lineHeight/metrics.fontSize>=1.6;
  out.push({label,w,h,errors,metrics,pass});
 }
 console.log(JSON.stringify(out,null,2));
 process.exit(out.every(x=>x.pass)?0:1);
})().catch(e=>{console.error(e);process.exit(2)});

const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const checks=[];
 for(const w of [1280,390,320]){
  const page=await browser.newPage({viewport:{width:w,height:770},hasTouch:w<700,isMobile:w<700});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.QA_URL||'http://127.0.0.1:18899/index.html',{waitUntil:'networkidle'});
  if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
  await page.evaluate(()=>{
    S.ruleset='2024';syncRulesetUI();
    const span=document.createElement('span');span.className='sref';span.dataset.sref='魔法伎倆';span.id='qa-cantrip-trigger';span.textContent='魔法伎倆';span.style.cssText='position:fixed;left:25px;top:100px;z-index:200;background:yellow;color:black;padding:8px';document.body.appendChild(span);
  });
  const trigger=page.locator('#qa-cantrip-trigger');
  if(w>=700)await trigger.hover();else await trigger.tap();
  const shown=await page.locator('#spellTip').isVisible();
  const full=await page.locator('#spellTip .ct-full').isVisible();
  const modeGone=(await page.locator('#spellTip [data-cantrip-mode]').count())===0;
  const narrow=await page.locator('#spellTip').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));
  if(w>=700)await trigger.click();
  const pinned=await page.evaluate(()=>rulePopoverState.pinnedType==="spell");
  if(w>=700)await page.mouse.move(w-15,30);
  const stillShown=await page.locator('#spellTip').isVisible();
  if(w>=700)await trigger.click();else await trigger.tap();
  const closed=!(await page.locator('#spellTip').isVisible());
  checks.push({width:w,shown,full,modeGone,pinned,stillShown,closed,errors,narrow});
  await page.close();
 }
 await browser.close();console.log(JSON.stringify(checks,null,2));
 if(checks.some(x=>!x.shown||!x.full||!x.modeGone||!x.pinned||!x.stillShown||!x.closed||x.errors.length||x.narrow.w>Math.min(x.width,390)))process.exit(1);
})().catch(e=>{console.error(e.stack||e);process.exit(2)});

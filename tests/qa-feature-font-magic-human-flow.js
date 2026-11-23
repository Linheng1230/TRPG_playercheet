"use strict";
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const url=process.env.QA_URL||'http://127.0.0.1:18766/index.html';
(async()=>{
 const channel=process.env.QA_BROWSER_CHANNEL||(process.env.CI?'':'chrome');
 const browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
 try{
  for(const width of [1440,390]){
   const touch=width===390;
   const ctx=await browser.newContext({viewport:{width,height:touch?844:900},isMobile:touch,hasTouch:touch});
   const page=await ctx.newPage(),errors=[];
   page.setDefaultTimeout(15000);page.on('dialog',d=>d.accept());page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url+'?view=creator&qa-feature-font-20261122',{waitUntil:'networkidle'});
   await page.waitForTimeout(350);
   if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
   await page.locator('#classGrid [data-class-name="術士"]').click();
   await page.locator('.step-panel.active .class-confirm-controls button').click();
   await page.locator('#next0').click();
   await page.locator('#bgGrid .pick-card').filter({hasText:'罪犯'}).first().click();
   await page.locator('.confirm-bg button').click();
   await page.locator('#spGrid .pick-card').filter({hasText:'矮人'}).first().click();
   await page.locator('.confirm-sp button').click();
   await page.locator('#next1').click();
   const sels=page.locator(".step-panel[data-step='2'] select");
   for(const [i,v] of ['15','14','13','12','10','8','int','con'].entries())await sels.nth(i).selectOption(v);
   await page.locator('#confirmAbilities').click();
   await page.locator('#next2').click();
   const skills=page.locator(".step-panel[data-step='3'] button.skill-chip:not(.fixed):not(:disabled)");
   const confirm=page.locator('.confirm-skills button');
   for(let i=0;i<await skills.count()&&!await confirm.isEnabled();i++)await skills.nth(i).click();
   await confirm.click();
   await page.locator('#next3').click();
   await page.locator('#fName').fill('QA 魔力泉湧');
   await page.locator('#fPlayer').fill('QA Local');
   const lang=page.locator('#languageChoices select');
   for(let i=0;i<await lang.count();i++)await lang.nth(i).selectOption({index:i+1});
   await page.locator('#confirmLanguages').click();
   await page.locator('#next4').click();
   await page.locator('#lvUp').click();
   const feature=page.locator('#lvlBody .ft[data-tip]').filter({hasText:/魔力泉湧|魔源之泉/}).first();
   assert(await feature.count(),'Font of Magic trigger missing in actual level-up screen');
   await feature.scrollIntoViewIfNeeded();
   if(touch)await feature.tap();else await feature.click();
   const popup=page.locator('#featureTip.rule-popover-pinned');
   await popup.waitFor({state:'visible'});
   const info=await popup.evaluate(el=>{
    const box=el.getBoundingClientRect(),body=el.innerText;
    return {text:body,first:body.slice(0,500),x:box.x,right:box.right,
      height:el.clientHeight,scrollHeight:el.scrollHeight,horiz:el.scrollWidth-el.clientWidth};
   });
   for(const [lv,cost,min] of [[1,2,2],[2,3,3],[3,5,5],[4,6,7],[5,7,9]])
    assert(info.text.includes(lv+'環法術位')&&info.text.includes('消耗'+cost+'術法點')&&info.text.includes('最低術士'+min+'級'),
      'missing '+lv+' ratio');
   assert(info.first.includes('1環法術位')&&info.first.includes('5環法術位'),'ratios are not near top');
   assert(info.x>=-1&&info.right<=width+1&&info.horiz<=1,'overflow '+JSON.stringify(info));
   if(touch){
    fs.mkdirSync(path.resolve('tmp'),{recursive:true});
    await popup.screenshot({path:path.resolve('tmp/qa-feature-font-human-390.png')});
   }
   assert.deepEqual(errors,[],'page JS errors');
   console.log('PASS REAL_CREATOR_FONT_MAGIC',width,'first_screen_ratios_5_of_5',info.scrollHeight>info.height?'scrollable':'fits');
   await ctx.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL REAL_CREATOR_FONT_MAGIC',e.stack);process.exitCode=1});

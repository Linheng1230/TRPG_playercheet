'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
const qa=path.join(process.cwd(),'tmp','qa-creator-spell-glance-20261119');
fs.mkdirSync(qa,{recursive:true});
const root=(process.env.QA_BASE||process.env.QA_LIVE_ROOT||'http://127.0.0.1:18766/').replace(/\/?$/,'/');
const cases=[
 {width:320,height:700,cls:'德魯伊',name:'德魯伊伎倆'},
 {width:390,height:844,cls:'德魯伊',name:'四象法門'},
 {width:1440,height:900,cls:'德魯伊',name:'德魯伊伎倆'},
 {width:320,height:700,cls:'法師',name:'尋獲魔寵'},
 {width:390,height:844,cls:'法師',name:'尋獲魔寵'},
 {width:1440,height:900,cls:'法師',name:'尋獲魔寵'}
];
async function toCreatorSpellStep(page,cls){
 await page.locator('[data-class-name="'+cls+'"]').click();
 await page.locator('.step-panel.active .class-confirm-controls button').click();
 await page.locator('#next0').click();
 await page.locator('#bgGrid .pick-card').filter({hasText:'罪犯'}).first().click();
 await page.locator('.confirm-bg button').click();
 await page.locator('#spGrid .pick-card').filter({hasText:'矮人'}).first().click();
 await page.locator('.confirm-sp button').click();
 await page.locator('#next1').click();
 const sels=page.locator(".step-panel[data-step='2'] select");
 for(const [i,v] of ['15','14','13','12','10','8','int','con'].entries())await sels.nth(i).selectOption(v);
 await page.locator('#confirmAbilities').click();await page.locator('#next2').click();
 const skills=page.locator(".step-panel[data-step='3'] button.skill-chip:not(.fixed):not(:disabled)");
 const confirm=page.locator('.confirm-skills button');
 if(!await confirm.isEnabled())for(let i=0;i<await skills.count()&&!await confirm.isEnabled();i++)await skills.nth(i).click();
 await confirm.click();await page.locator('#next3').click();
 await page.locator('#fName').fill('QA 法術手機內容與浮窗');
 await page.locator('#fPlayer').fill('Layout regression');
 const lang=page.locator('#languageChoices select');
 for(let i=0;i<await lang.count();i++)await lang.nth(i).selectOption({index:i+1});
 await page.locator('#confirmLanguages').click();await page.locator('#next4').click();
 if(cls==='德魯伊')await page.locator('.step-panel.active [data-order="魔法師"]').click();
 await page.locator('#next5').click();
}
async function swipePopover(page,popup){
 const box=await popup.boundingBox();
 if(!box)throw Error('Popup invisible');
 if(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches)){
  const cdp=await page.context().newCDPSession(page);
  const x=Math.round(box.x+box.width*0.5);
  const start=Math.round(box.y+box.height*0.77);
  const end=Math.max(Math.round(box.y+55),start-280);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:start}]});
  for(let i=1;i<=13;i++){
   const y=Math.round(start+(end-start)*i/13);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
   await page.waitForTimeout(13);
  }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 }else{
  await page.mouse.move(box.x+box.width*0.55,box.y+box.height*0.65);
  await page.mouse.wheel(0,850);
 }
 await page.waitForTimeout(260);
}
async function openPopup(page,trigger,touch){
 await trigger.scrollIntoViewIfNeeded();
 if(touch)await trigger.tap();else{await trigger.hover();await trigger.click();}
 await page.locator('#spellTip.rule-popover-pinned .rule-popover-close').waitFor({state:'visible'});
}
async function inspectPopup(page,spell){
 return await page.evaluate(name=>{
  const tip=document.getElementById('spellTip'),close=tip.querySelector('.rule-popover-close');
  const body=tip.querySelector('.tip-d'),src=SPELLS.find(s=>s.n===name);
  const r=tip.getBoundingClientRect(),b=close.getBoundingClientRect(),at=document.elementFromPoint(b.left+b.width/2,b.top+b.height/2);
  const clean=x=>String(x||'').replace(/\s+/gu,'');
  return {pinned:tip.classList.contains('rule-popover-pinned'),visible:tip.style.display==='block',
   aria:tip.getAttribute('aria-hidden'),scrollTop:tip.scrollTop,maxScroll:tip.scrollHeight-tip.clientHeight,
   closeTop:b.top,closeBottom:b.bottom,tipTop:r.top,tipBottom:r.bottom,buttonVisible:b.top>=r.top-1&&b.bottom<=r.bottom+1&&b.top>=0&&b.bottom<=innerHeight,
   hitTest:at===close||close.contains(at),position:getComputedStyle(close).position,
   buttonSize:[b.width,b.height],textParity:clean(body?.textContent)===clean(src?.d),
   verticalOverflow:document.documentElement.scrollWidth-innerWidth,scrollWidth:tip.scrollWidth-tip.clientWidth,
   closeLabel:close.getAttribute('aria-label')};
 },spell);
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),runs=[];
 try{
 for(const c of cases){
  const touch=c.width<=390;
  const context=await browser.newContext({viewport:{width:c.width,height:c.height},isMobile:touch,hasTouch:touch});
  const page=await context.newPage();page.setDefaultTimeout(16000);page.on('dialog',d=>d.accept());
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(root+'index.html?spell-mobile-layout-uat=20261116',{waitUntil:'networkidle',timeout:38000});
  await page.waitForFunction(()=>window.spellSemanticAudit2024?.total===98,{timeout:15000});
  if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
  await toCreatorSpellStep(page,c.cls);
  const cards=await page.evaluate(()=>{
   const all=[...document.querySelectorAll('.step-panel.active .spell-grid .creator-spell-card')]
     .filter(c=>c.getClientRects().length&&!c.hidden);
   return {count:all.length,
    problems:all.map(c=>{
     const sd=c.querySelector('.sd'),cr=c.getBoundingClientRect(),sr=sd?.getBoundingClientRect();
     return {name:c.querySelector('.sref')?.dataset.sref||'',cardHeight:cr.height,cardScroll:c.scrollHeight,
      sdHeight:sd?.clientHeight||0,sdScroll:sd?.scrollHeight||0,sdBottom:sr?.bottom||0,cardBottom:cr.bottom,
      clip:getComputedStyle(sd).webkitLineClamp,overflow:getComputedStyle(sd).overflow,display:getComputedStyle(sd).display,
      within:cr.left>=-2&&cr.right<=innerWidth+2};
    }).filter(r=>r.cardScroll-r.cardHeight>2||r.sdScroll-r.sdHeight>2||r.sdBottom>r.cardBottom+1||!r.within),
    summary:all.slice(0,3).map(c=>({name:c.querySelector('.sref')?.dataset.sref,height:c.clientHeight,full:c.scrollHeight})),
    pageOverflow:document.documentElement.scrollWidth-innerWidth};
  });
  // Real creator cards, not direct calls to a private preview helper.
  const glance=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.step-panel.active .creator-spell-card')].filter(c=>c.getClientRects().length&&!c.hidden);
    const issues=[],samples=[];
    for(const card of cards){
      const sd=card.querySelector('.sd'),name=card.querySelector('.sref')?.dataset.sref||'';
      const content=sd?.textContent||'',sc=sd?getComputedStyle(sd):null;
      if(!sd?.querySelector('.sr-readable'))issues.push(name+': missing semantic text');
      if(!content||content.length>113)issues.push(name+': text length '+content.length);
      if(/升環施法|高環施法|戲法強化|(?:5|11|17)級\s*\d+\s*[dD]\d+/.test(content))
        issues.push(name+': scaling visible in glance');
      if(!sc||parseFloat(sc.fontSize)<14)issues.push(name+': font below 14px');
      if(!sd?.title.includes('完整規則'))issues.push(name+': no complete rule hint');
      if(sd?.scrollHeight>sd?.clientHeight+2)issues.push(name+': preview clipped/overflow');
      samples.push({name,short:content.length,html:sd?.innerHTML.slice(0,130)});
    }
    const allStyle=cards.flatMap(c=>[...c.querySelectorAll('.sd strong')].map(el=>({
      cls:el.className,color:getComputedStyle(el).color,parent:getComputedStyle(c.querySelector('.sd')).color
    })));
    const mark=key=>allStyle.some(x=>x.cls.includes(key)&&x.color!==x.parent);
    const main=cards.some(c=>c.dataset.creatorAction==='main'&&c.querySelector('.creator-spell-action'));
    const bonus=cards.some(c=>c.dataset.creatorAction==='bonus'&&c.querySelector('.creator-spell-action'));
    return {issues,samples:samples.slice(0,7),count:cards.length,main,bonus,
      marks:{attack:mark('sp-preview-attack'),save:mark('sr-save'),
        dice:mark('sr-dice'),damage:mark('sr-damage'),action:mark('sr-action')}};
  });
  const trigger=page.locator('.step-panel.active .sref[data-sref="'+c.name+'"]').first();
  await trigger.waitFor({state:'visible'});
  await trigger.scrollIntoViewIfNeeded();
  await page.screenshot({path:qa+'/spell-glance-creator-card-'+c.cls+'-'+c.width+'.png'});
  await openPopup(page,trigger,touch);
  const before=await inspectPopup(page,c.name);
  const popup=page.locator('#spellTip');
  await swipePopover(page,popup);
  const after=await inspectPopup(page,c.name);
  await page.screenshot({path:qa+'/spell-glance-popup-detail-'+c.cls+'-'+c.width+'.png'});
  const close=page.locator('#spellTip .rule-popover-close');
  if(touch)await close.tap();else await close.click();
  const closed=await page.evaluate(()=>spellTip.style.display==='none'&&spellTip.getAttribute('aria-hidden')==='true');
  // Re-open and close by tapping/clicking the same real trigger, verifying the original toggle path.
  await openPopup(page,trigger,touch);
  if(touch)await trigger.tap();else await trigger.click();
  const toggleClosed=await page.evaluate(()=>spellTip.style.display==='none');
  const pass=errors.length===0&&cards.count>0&&glance.count>0&&glance.issues.length===0&&glance.main&&glance.marks.save&&glance.marks.attack&&cards.problems.length===0&&cards.pageOverflow<=2&&
   before.pinned&&before.visible&&before.textParity&&before.position==='sticky'&&
   after.scrollTop>0&&after.maxScroll>0&&after.buttonVisible&&after.hitTest&&after.position==='sticky'&&
   after.buttonSize.every(n=>n>=34)&&after.textParity&&after.scrollWidth<=2&&closed&&toggleClosed;
  runs.push({cls:c.cls,name:c.name,width:c.width,height:c.height,pass,errors,cards,glance,before,after,closed,toggleClosed});
  await context.close();
 }
 }finally{await browser.close();}
 const report={pass:runs.every(x=>x.pass),runs};
 fs.writeFileSync(qa+'/spell-quick-glance-creator-qa.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({pass:report.pass,runs:runs.map(r=>({cls:r.cls,width:r.width,spell:r.name,pass:r.pass,errors:r.errors,
    cardCount:r.cards.count,glanceProblems:r.glance.issues,glanceMarks:r.glance.marks,scroll:r.after.scrollTop,closeVisible:r.after.buttonVisible,
    touchHit:r.after.hitTest,position:r.after.position,clickedClose:r.closed,toggled:r.toggleClosed}))},null,2));
 process.exitCode=report.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});

'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('fs');
const site=process.env.QA_URL||'http://127.0.0.1:18766/index.html';
const qaDir='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa';
fs.mkdirSync(qaDir,{recursive:true});
const scenes=[[1440,900,'desktop'],[480,760,'narrow'],[390,844,'mobile']];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const results=[];
 try{
  for(const [width,height,label] of scenes){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
   const pageErrors=[];
   page.on('pageerror',err=>pageErrors.push(String(err)));
   await page.goto(site,{waitUntil:'domcontentloaded',timeout:25000});
   await page.waitForFunction(()=>!!window.cantripReadableRules2024,{timeout:20000});
   const facts=await page.evaluate(()=>{
    S.ruleset='2024';
    const normalize=s=>String(s||'').replace(/\s+/g,'');
    const list=SPELLS.filter(sp=>sp.lv===0);
    const parityMiss=[],sampleInfo=[];
    const metrics={save:0,damage:0,long:0,enhance:0,nonCanonicalDamage:0};
    for(const sp of list){
     const root=document.createElement('div');
     root.innerHTML=formatSpellRuleHTML(sp.d);
     if(normalize(root.textContent)!==normalize(sp.d))parityMiss.push(sp.eng||sp.n);
     if(root.querySelector('.sr-save'))metrics.save++;
     if(root.querySelector('.sr-damage'))metrics.damage++;
     if([...root.querySelectorAll('.sr-damage')].some(el=>!el.classList.contains('damage-semantic')||!el.dataset.damageType))metrics.nonCanonicalDamage++;
     if(sp.d.length>250&&root.querySelectorAll('.sr-rule-block').length>1)metrics.long++;
     if(root.textContent.includes('戲法強化：'))metrics.enhance++;
    }
    const first=SPELLS.find(sp=>sp.lv===1);
    const otherUntouched=first&&!formatSpellRuleHTML(first.d).includes('sr-readable');
    const save=list.find(sp=>/豁免/.test(sp.d)&&/傷害/.test(sp.d));
    const long=list.slice().sort((a,b)=>b.d.length-a.d.length)[0];
    for(const sp of [save,long]){
     const trigger=document.createElement('span');
     trigger.dataset.sref=sp.n;trigger.textContent=sp.n;
     document.body.appendChild(trigger);
     showSpellTip(trigger,true);
     const full=spellTip.querySelector('.ct-full'),body=full?.querySelector('.tip-d');
     const text=body?.textContent||'';
     sampleInfo.push({
      name:sp.n,initialFull:!!full&&!full.hidden,noModeToggle:!spellTip.querySelector('[data-cantrip-mode]'),
      parity:normalize(text)===normalize(sp.d),
      font:parseFloat(getComputedStyle(body).fontSize),
      line:parseFloat(getComputedStyle(body).lineHeight),
      noHorizontalOverflow:spellTip.scrollWidth<=spellTip.clientWidth+2,
      damageNodes:body?.querySelectorAll('.sr-damage').length||0,
      saveNodes:body?.querySelectorAll('.sr-save').length||0,
      ruleBlocks:body?.querySelectorAll('.sr-rule-block').length||0
     });
     closeRulePopover('spell',true);trigger.remove();
    }
    return {count:list.length,parityMiss,metrics,otherUntouched,sampleInfo,wholePageOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   await page.evaluate(()=>{const sp=SPELLS.find(sp=>sp.lv===0&&/豁免/.test(sp.d)&&/傷害/.test(sp.d));spellTip.innerHTML=rulePopoverCloseButtonHTML()+spellTipHTML(sp.n);spellTip.style.display='block';spellTip.style.left='8px';spellTip.style.top='8px';});
   await page.screenshot({path:qaDir+'/spell-readable-save-'+label+'.png'});
   await page.evaluate(()=>{const sp=SPELLS.filter(sp=>sp.lv===0).sort((a,b)=>b.d.length-a.d.length)[0];spellTip.innerHTML=rulePopoverCloseButtonHTML()+spellTipHTML(sp.n);spellTip.style.display='block';spellTip.style.left='8px';spellTip.style.top='8px';});
   await page.screenshot({path:qaDir+'/spell-readable-long-'+label+'.png'});
   const pass=!pageErrors.length&&facts.count>20&&facts.parityMiss.length===0&&facts.metrics.save>0&&facts.metrics.damage>0&&facts.metrics.nonCanonicalDamage===0&&facts.metrics.long>0&&facts.metrics.enhance>0&&facts.otherUntouched&&facts.sampleInfo.every(x=>x.initialFull&&x.noModeToggle&&x.parity&&x.font>=13&&x.line/x.font>=1.6&&x.noHorizontalOverflow)&&facts.wholePageOverflow<=2;
   results.push({label,width,height,pass,pageErrors,facts});
   await page.close();
  }
 } finally {await browser.close();}
 const output={phase:'zero-cantrips',pass:results.every(x=>x.pass),results};
 fs.writeFileSync(qaDir+'/spell-readable-phase0-report.json',JSON.stringify(output,null,2),'utf8');
 console.log(JSON.stringify(output));
 process.exitCode=output.pass?0:1;
})().catch(err=>{console.error(err.stack||err);process.exitCode=2;});
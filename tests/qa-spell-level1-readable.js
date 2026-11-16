'use strict';
const fs=require('node:fs');
const {chromium}=require('playwright');
const site=process.env.QA_URL||'http://127.0.0.1:18768/index.html';
const dir='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa';
fs.mkdirSync(dir,{recursive:true});
const scenes=[[1440,900,'desktop'],[480,760,'narrow'],[390,844,'mobile'],[320,700,'small-mobile']];
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const results=[];
 try{
  for(const [width,height,label] of scenes){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto(site,{waitUntil:'networkidle',timeout:35000});
   await page.waitForFunction(()=>!!window.spellReadableRules2024,{timeout:15000});
   if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
   const facts=await page.evaluate(()=>{
    S.ruleset='2024';
    const norm=x=>String(x||'').replace(/\s+/gu,'');
    const first=SPELLS.filter(sp=>sp.lv===1);
    const issues=[],summary={damage:0,save:0,dice:0,long:0,higher:0,labeled:0,tooltip:0,noncanonical:0};
    for(const sp of first){
     const wrapper=document.createElement('div');wrapper.innerHTML=formatSpellRuleHTML(sp.d);
     if(norm(wrapper.textContent)!==norm(sp.d))issues.push(sp.n+' content parity');
     if(!wrapper.querySelector('.sr-rule-block.sr-readable'))issues.push(sp.n+' readable missing');
     const dmg=[...wrapper.querySelectorAll('.sr-damage')];
     if(dmg.length)summary.damage++;
     if(dmg.some(el=>!el.matches('.damage-semantic[data-damage-type]')))summary.noncanonical++;
     if(wrapper.querySelector('.sr-save'))summary.save++;
     if(wrapper.querySelector('.sr-dice'))summary.dice++;
     if(sp.d.length>175&&wrapper.querySelectorAll('.sr-rule-block').length>1)summary.long++;
     if(wrapper.textContent.includes('升環施法：'))summary.higher++;
     if(wrapper.querySelector('.sr-rule-label'))summary.labeled++;
     const html=spellTipHTML(sp.n);
     const rendered=document.createElement('div');rendered.innerHTML=html;
     const tipText=rendered.querySelector('.tip-d')?.textContent;
     if(norm(tipText)!==norm(sp.d))issues.push(sp.n+' tooltip parity');
     if(!spellTip.classList.contains('spell-level1-readable'))issues.push(sp.n+' tooltip class');
     if(rendered.querySelector('.ct-summary')||rendered.querySelector('[data-cantrip-mode]'))issues.push(sp.n+' extra summary');
     summary.tooltip++;
    }
    const cantrip=SPELLS.find(sp=>sp.lv===0),second=SPELLS.find(sp=>sp.lv===2);
    spellTipHTML(cantrip.n);
    const cantripIsolated=spellTip.classList.contains('cantrip-compact')&&!spellTip.classList.contains('spell-level1-readable');
    spellTipHTML(second.n);
    const secondUntouched=SPELLS.filter(sp=>sp.lv===2).every(sp=>!formatSpellRuleHTML(sp.d).includes('sr-readable'))&&!spellTip.classList.contains('spell-level1-readable');
    S.ruleset='2014';syncRulesetUI();
    const old=SPELLS14.find(sp=>sp.lv===1);
    spellTipHTML(old.n);
    const legacyUnchanged=!formatSpellRuleHTML(old.d).includes('sr-readable')&&!spellTip.classList.contains('spell-level1-readable');
    S.ruleset='2024';syncRulesetUI();
    const samples=[first.find(sp=>sp.n==='燃燒之手'),first.find(sp=>sp.n==='尋獲魔寵'),first.find(sp=>sp.n==='命令術')].filter(Boolean);
    const visual=[];
    for(const sp of samples){
     const holder=document.createElement('span');holder.dataset.sref=sp.n;holder.textContent=sp.n;
     document.body.appendChild(holder);
     showSpellTip(holder,true);
     const body=spellTip.querySelector('.tip-d'),r=spellTip.getBoundingClientRect();
     const font=parseFloat(getComputedStyle(body).fontSize);
     const line=parseFloat(getComputedStyle(body).lineHeight);
     const save=body.querySelector('.sr-save'),damage=body.querySelector('.sr-damage');
     const record={name:sp.n,parity:norm(body.textContent)===norm(sp.d),
      font,line,save:!!save,damage:!!damage,
      damageColor:damage?getComputedStyle(damage).color:'',
      z:parseInt(getComputedStyle(spellTip).zIndex,10),
      width:r.width,viewport:innerWidth,bodyOverflow:spellTip.scrollWidth-spellTip.clientWidth,
      scrollable:spellTip.scrollHeight>spellTip.clientHeight};
     visual.push(record);
     closeRulePopover('spell',true);holder.remove();
    }
    return {count:first.length,metaCount:globalThis.spellReadableRules2024?.count,
      issues,summary,cantripIsolated,secondUntouched,legacyUnchanged,visual,
      fullDocumentOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   await page.evaluate(()=>{const sp=SPELLS.find(x=>x.lv===1&&x.n==='燃燒之手');const el=document.createElement('span');el.dataset.sref=sp.n;el.textContent=sp.n;document.body.appendChild(el);showSpellTip(el,true);spellTip.style.top='8px';spellTip.style.left='8px'});
   await page.screenshot({path:dir+'/spell-level1-save-'+label+'.png'});
   await page.evaluate(()=>{const sp=SPELLS.find(x=>x.lv===1&&x.n==='尋獲魔寵');const el=document.createElement('span');el.dataset.sref=sp.n;el.textContent=sp.n;document.body.appendChild(el);showSpellTip(el,true);spellTip.style.top='8px';spellTip.style.left='8px'});
   await page.screenshot({path:dir+'/spell-level1-long-'+label+'.png'});
   await page.evaluate(()=>{closeAllRulePopovers();go(9)});
   await page.locator('#srefQ').fill('燃燒之手');
   await page.locator('.sref-entry[data-sref="燃燒之手"]').waitFor({state:'visible',timeout:10000});
   const gallery=await page.evaluate(()=>{
     const sp=SPELLS.find(x=>x.lv===1&&x.n==='燃燒之手');
     const root=document.querySelector('.sref-entry[data-sref="燃燒之手"]');
     const content=root?.querySelector('.sr-rule-content');
     const norm=x=>String(x||'').replace(/\s+/g,'');
     return {parity:norm(content?.textContent)===norm(sp?.d),hasSave:!!content?.querySelector('.sr-save'),
       hasDamage:!!content?.querySelector('.sr-damage.damage-semantic'),
       blocks:content?.querySelectorAll('.sr-rule-block.sr-readable').length||0,
       overflow:content?(content.scrollWidth-content.clientWidth):999,
       bodyOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   await page.locator('.sref-entry[data-sref="燃燒之手"]').scrollIntoViewIfNeeded();
   await page.waitForTimeout(450);
   await page.screenshot({path:dir+'/spell-level1-gallery-'+label+'.png'});
   const pass=!errors.length&&facts.count===64&&facts.metaCount===64&&facts.issues.length===0&&
    facts.cantripIsolated&&facts.secondUntouched&&facts.legacyUnchanged&&
    facts.summary.damage>=12&&facts.summary.save>=15&&facts.summary.dice>=12&&
    facts.summary.long>=10&&facts.summary.higher>=20&&facts.summary.noncanonical===0&&
    facts.visual.length>=2&&facts.visual.every(x=>x.parity&&x.font>=14&&x.line/x.font>=1.65&&x.z>100&&x.bodyOverflow<=2)&&facts.fullDocumentOverflow<=2&&
    gallery.parity&&gallery.hasSave&&gallery.hasDamage&&gallery.blocks>=2&&gallery.overflow<=2&&gallery.bodyOverflow<=2;
   results.push({label,width,height,pass,errors,facts,gallery});
   await page.close();
  }
 }finally{await browser.close();}
 const result={phase:'one',pass:results.every(x=>x.pass),results};
 fs.writeFileSync(dir+'/spell-level1-readable-qa.json',JSON.stringify(result,null,2),'utf8');
 console.log(JSON.stringify(result));
 process.exitCode=result.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});
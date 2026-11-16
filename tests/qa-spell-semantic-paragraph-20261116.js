'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs');
const base=process.env.QA_URL||'http://127.0.0.1:18770/index.html';
const out='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa';
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'}); const results=[];
try{
 for(const [width,height,label] of [[1440,900,'desktop'],[480,760,'narrow'],[390,844,'mobile'],[320,700,'small-mobile']]){
 const page=await browser.newPage({viewport:{width,height}});
 const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.goto(base,{waitUntil:'networkidle',timeout:35000});
 await page.waitForFunction(()=>window.cantripReadableRules2024?.count===34&&window.spellReadableRules2024?.count===64,{timeout:15000});
 if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
 const facts=await page.evaluate(()=>{
  S.ruleset='2024'; const spell=SPELLS.find(s=>s.eng==='Produce Flame'); const norm=s=>String(s||'').replace(/\s+/gu,'');
  const wrapper=document.createElement('div');wrapper.innerHTML=formatSpellRuleHTML(spell.d);
  const blocks=[...wrapper.querySelectorAll('.sr-rule-block.sr-readable')];
  const texts=blocks.map(x=>x.textContent.trim());
  const body=wrapper.textContent;
  const original=spell.d;
  const twoFirst=SPELLS.filter(s=>s.lv===0||s.lv===1);
  const mismatches=[];
  for(const x of twoFirst){const div=document.createElement('div');div.innerHTML=formatSpellRuleHTML(x.d);if(norm(div.textContent)!==norm(x.d))mismatches.push(x.n)}
  const levels2=SPELLS.filter(s=>s.lv===2).every(s=>!formatSpellRuleHTML(s.d).includes('sr-readable'));
  S.ruleset='2014';syncRulesetUI();
  const legacy=SPELLS14.filter(s=>s.lv===0||s.lv===1).every(s=>!formatSpellRuleHTML(s.d).includes('sr-readable'));
  S.ruleset='2024';syncRulesetUI();
  const action=wrapper.querySelector('.sr-action');
  return {name:spell.n,parity:norm(body)===norm(original),all98:twoFirst.length,mismatches,levels2,legacy,
   blocks:texts,actionCount:wrapper.querySelectorAll('.sr-action').length,actionText:action?.textContent,
   semantic:[texts[0]?.startsWith('一朵搖曳的火焰'),texts[0]?.includes('微光光照'),texts[1]?.startsWith('此法術會在你再次施展'),texts[1]?.includes('直到法術結束為止'),texts[2]?.startsWith('進行一次遠端法術攻擊'),texts[2]?.includes('1d8點火焰傷害'),texts[3]?.includes('戲法強化')],
   pageOverflow:document.documentElement.scrollWidth-innerWidth};
 });
 await page.locator('#stepNav .nav-primary button').filter({hasText:'法術圖鑑'}).first().click();
 await page.locator('#srefQ').fill(facts.name);
 const entry=page.locator('.sref-entry').first();
 await entry.waitFor({state:'visible',timeout:10000});
 await page.evaluate(name=>document.querySelector('.sref-entry[data-sref="'+name+'"]')?.scrollIntoView({block:'center',behavior:'instant'}),facts.name);
 await page.waitForTimeout(550);
 const gallery=await page.evaluate(name=>{
  const entry=document.querySelector('.sref-entry[data-sref="'+name+'"]');
  const root=entry?.querySelector('.sr-rule-content');
  const blocks=[...root?.querySelectorAll('.sr-rule-block.sr-readable')||[]];
  const actions=[...root?.querySelectorAll('.sr-action')||[]];
  const transparent=blocks.every(x=>{const s=getComputedStyle(x);return parseFloat(s.borderLeftWidth)===0&&parseFloat(s.borderTopWidth)===0&&s.backgroundColor==='rgba(0, 0, 0, 0)'});
  return {blocks:blocks.length,transparent,actions:actions.length,actionColor:actions.length?getComputedStyle(actions[0]).color:null,
    original:SPELLS.find(s=>s.n===name)?.d,content:root?.textContent,overflow:root?.scrollWidth-root?.clientWidth||0};
 },facts.name);
 await page.screenshot({path:out+'/spell-paragraph-produce-gallery-'+label+'.png'});
 // Targeted renderer QA: the reference gallery shows full rules in-page, not in a popup.
 // Human-equivalent popup click is checked separately from the creator spell step.
 await page.evaluate(name=>{
   const el=document.createElement('span');el.dataset.sref=name;el.className='sref';el.textContent=name;
   document.body.appendChild(el);showSpellTip(el,true);
 },facts.name);
 const popup=await page.evaluate(()=>{
  const tip=document.querySelector('#spellTip'),root=tip?.querySelector('.tip-d');
  const blocks=[...root?.querySelectorAll('.sr-rule-block.sr-readable')||[]];
  const action=root?.querySelector('.sr-action');
  return {visible:tip?.style.display==='block',count:blocks.length,text:root?.textContent,
  actionColor:action?getComputedStyle(action).color:null,
  flat:blocks.every(x=>{const s=getComputedStyle(x);return parseFloat(s.borderLeftWidth)===0&&parseFloat(s.borderTopWidth)===0&&s.backgroundColor==='rgba(0, 0, 0, 0)'}),
  overflow:tip?.scrollWidth-tip?.clientWidth||0,scrollable:tip?.scrollHeight>tip?.clientHeight};
 });
 await page.screenshot({path:out+'/spell-paragraph-produce-popup-'+label+'.png'});
 const norm=s=>String(s||'').replace(/\s+/gu,'');
 const pass=errs.length===0&&facts.parity&&facts.all98===98&&facts.mismatches.length===0&&facts.levels2&&facts.legacy&&
 facts.blocks.length===4&&facts.semantic.every(Boolean)&&facts.actionCount===1&&facts.actionText==='魔法動作'&&facts.pageOverflow<=2&&
 gallery.blocks===4&&gallery.actions===1&&gallery.transparent&&gallery.actionColor==='rgb(118, 81, 20)'&&norm(gallery.content)===norm(gallery.original)&&gallery.overflow<=2&&
 popup.count===4&&popup.flat&&popup.actionColor==='rgb(255, 214, 133)'&&popup.overflow<=2&&norm(popup.text)===norm(gallery.original);
 results.push({label,width,height,pass,errs,facts,gallery:{...gallery,content:undefined,original:undefined},popup:{...popup,text:undefined}});
 await page.close();
 }
}finally{await browser.close()}
const result={pass:results.every(x=>x.pass),results};
fs.writeFileSync(out+'/spell-semantic-paragraph-qa.json',JSON.stringify(result,null,2),'utf8');
console.log(JSON.stringify(result));process.exitCode=result.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});
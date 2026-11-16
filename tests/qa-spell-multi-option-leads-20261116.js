'use strict';
const {chromium}=require('playwright'),fs=require('fs');
const qa='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa';
const url=process.env.QA_URL||'http://127.0.0.1:18773/index.html';
const expected={
  "Druidcraft":["感知天氣","盛放","感官效應","玩火"],
  "Elementalism":["召氣","召土","召火","召水","塑形元素"],
  "Minor Illusion":["聲響","影像"],
  "Prestidigitation":["感官效應","玩火","清潔或弄髒","次級感覺","魔法印記","次級造物"],
  "Thaumaturgy":["改變眼睛","擴音","玩火","看不見的手","幻音","震動"],
  "Command":["過來","放下","走開","趴下","立定"],
  "Create or Destroy Water":["造水術","枯水術"],
  "Find Familiar":["心靈連線","戰鬥","魔寵的消失","獨一無二"]
};
(async()=>{
const b=await chromium.launch({channel:'chrome',headless:true});
const runs=[];
try{
for(const [width,height,label] of [[1440,900,'desktop'],[390,844,'mobile'],[320,700,'small-mobile']]){
 const p=await b.newPage({viewport:{width,height}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(url,{waitUntil:'networkidle',timeout:40000});
 await p.waitForFunction(()=>window.spellSemanticAudit2024?.total===98,{timeout:15000});
 if(await p.locator('#closeRuleset').isVisible())await p.locator('#closeRuleset').click();
 const info=await p.evaluate(expected=>{
  S.ruleset='2024';
  const norm=s=>String(s||'').replace(/\s+/gu,'');
  const all=SPELLS.filter(s=>s.lv===0||s.lv===1);
  const err=[],rows=[];
  for(const spell of all){
   const element=document.createElement('div');element.innerHTML=formatSpellRuleHTML(spell.d);
   if(norm(element.textContent)!==norm(spell.d))err.push({spell:spell.eng,reason:'source-parity'});
   if(!element.querySelector('.sr-rule-block.sr-readable'))err.push({spell:spell.eng,reason:'no-semantic-layout'});
  }
  for(const [eng,labels] of Object.entries(expected)){
   const spell=all.find(s=>s.eng===eng);
   if(!spell){err.push({spell:eng,reason:'missing-spell'});continue;}
   const holder=document.createElement('div');holder.innerHTML=formatSpellRuleHTML(spell.d);
   const blocks=[...holder.querySelectorAll('.sr-rule-block.sr-readable')];
   const items=blocks.filter(x=>labels.includes(x.querySelector('.sr-rule-label')?.textContent.trim().replace(/：$/u,'')));
   if(items.length!==labels.length)err.push({spell:eng,reason:'option-label-count',expect:labels.length,got:items.map(x=>x.querySelector('.sr-rule-label')?.textContent)});
   for(const name of labels){
    const block=items.find(x=>x.querySelector('.sr-rule-label')?.textContent.trim()===(name+'：'));
    const lead=block?.querySelectorAll('.sr-option-lead')||[];
    if(lead.length!==1||!lead[0].textContent.trim()||lead[0].textContent.length<4)
      err.push({spell:eng,option:name,reason:'emphasis-missing',actual:lead.length});
    if(block?.querySelector('.sr-rule-text')?.textContent.length<lead[0]?.textContent.length)
      err.push({spell:eng,option:name,reason:'lead-longer-than-text'});
   }
   spellTip.innerHTML=spellTipHTML(spell.n);
   spellTip.style.display='block';spellTip.style.top='8px';spellTip.style.left='8px';
   const tip=spellTip.querySelector('.tip-d');
   const text=tip?.textContent||'';
   if(norm(text)!==norm(spell.d))err.push({spell:eng,reason:'tooltip-parity'});
   const leadColors=[...tip.querySelectorAll('.sr-option-lead')].map(x=>({
    foreground:getComputedStyle(x).color,background:getComputedStyle(x).backgroundColor,
    weight:Number(getComputedStyle(x).fontWeight),display:getComputedStyle(x).display
   }));
   if(leadColors.length!==labels.length || leadColors.some(c=>c.foreground!=='rgb(255, 242, 205)'||c.weight<700||c.display!=='inline'))
    err.push({spell:eng,reason:'tooltip-contrast',leadColors});
   const flat=[...tip.querySelectorAll('.sr-rule-block')].every(x=>{
     const css=getComputedStyle(x);return css.backgroundColor==='rgba(0, 0, 0, 0)'&&parseFloat(css.borderTopWidth)===0&&parseFloat(css.borderLeftWidth)===0;
   });
   if(!flat)err.push({spell:eng,reason:'nested-rule-frame'});
   if(spellTip.scrollWidth-spellTip.clientWidth>2)err.push({spell:eng,reason:'tooltip-horizontal-overflow'});
   const gallery=document.createElement('section');gallery.className='sref-entry';gallery.style.display='block';gallery.innerHTML=formatSpellRuleHTML(spell.d);document.body.append(gallery);
   const galleryLeads=[...gallery.querySelectorAll('.sr-option-lead')].map(x=>getComputedStyle(x).color);
   if(galleryLeads.length!==labels.length||galleryLeads.some(c=>c!=='rgb(115, 80, 25)'))err.push({spell:eng,reason:'gallery-contrast',galleryLeads});
   gallery.remove();
   rows.push({eng,name:spell.n,level:spell.lv,labels,leadCount:leadColors.length,leadColors,
     labelCount:items.length,blockCount:blocks.length,flat,parity:norm(holder.textContent)===norm(spell.d),
     tipParity:norm(text)===norm(spell.d)});
   spellTip.style.display='none';
  }
  const command=rows.find(x=>x.eng==='Command');
  const water=rows.find(x=>x.eng==='Create or Destroy Water');
  for(const x of [command,water])if(!x||x.labelCount!==expected[x.eng].length)err.push({spell:x?.eng,reason:'nested-intro-fail'});
  const flame=all.find(s=>s.eng==='Produce Flame'),f=document.createElement('div');f.innerHTML=formatSpellRuleHTML(flame.d);
  if(f.querySelectorAll('.sr-rule-block.sr-readable').length!==4)err.push({spell:'Produce Flame',reason:'golden-regression'});
  const elemental=rows.find(x=>x.eng==='Elementalism');
  if(!elemental||elemental.leadCount!==5)err.push({spell:'Elementalism',reason:'golden-option-regression'});
  const next=SPELLS.filter(s=>s.lv===2).every(s=>!formatSpellRuleHTML(s.d).includes('sr-option-lead'));
  S.ruleset='2014';syncRulesetUI();
  const past=SPELLS14.filter(s=>s.lv===0||s.lv===1).every(s=>!formatSpellRuleHTML(s.d).includes('sr-option-lead'));
  S.ruleset='2024';syncRulesetUI();
  if(!next||!past)err.push({reason:'ruleset-isolation',next,past});
  return {all:all.length,rows,err,next,past,pageOverflow:document.documentElement.scrollWidth-innerWidth};
 },expected);
 // Screenshots: these are real styled popups, without injecting a fake rendering function.
 for(const eng of ['Druidcraft','Prestidigitation','Thaumaturgy','Command','Create or Destroy Water','Find Familiar']){
  await p.evaluate(eng=>{
   const sp=SPELLS.find(x=>x.eng===eng);
   const trigger=document.createElement('span');trigger.dataset.sref=sp.n;trigger.textContent=sp.n;
   document.body.append(trigger);
   showSpellTip(trigger,true);
   spellTip.style.left='8px';spellTip.style.top='8px';
  },eng);
  await p.screenshot({path:qa+'/spell-multi-option-'+eng.replace(/ /g,'-').toLowerCase()+'-'+label+'.png'});
  await p.evaluate(()=>closeAllRulePopovers());
 }
 const pass=!errors.length&&info.all===98&&info.err.length===0&&info.rows.length===8&&info.pageOverflow<=2;
 runs.push({label,width,height,pass,errors,info});
 await p.close();
}
}finally{await b.close();}
const result={pass:runs.every(x=>x.pass),runs};
fs.writeFileSync(qa+'/spell-multi-option-leads-qa.json',JSON.stringify(result,null,2),'utf8');
console.log(JSON.stringify({pass:result.pass,runs:runs.map(x=>({label:x.label,pass:x.pass,rows:x.info.rows.map(r=>({eng:r.eng,leads:r.leadCount,labels:r.labelCount})),errors:x.errors,issues:x.info.err}))},null,2));
process.exitCode=result.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});

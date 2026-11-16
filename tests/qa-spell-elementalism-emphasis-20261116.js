'use strict';
const {chromium}=require('playwright'),fs=require('fs');
const base=process.env.QA_URL||'http://127.0.0.1:18772/index.html';
const output='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});const runs=[];
 try{
  for(const [width,height,label] of [[1440,900,'desktop'],[390,844,'mobile'],[320,700,'smallmobile']]){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base,{waitUntil:'networkidle',timeout:35000});
   await page.waitForFunction(()=>window.spellSemanticAudit2024?.total===98);
   if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
   const result=await page.evaluate(()=>{
     const norm=x=>String(x||'').replace(/\s+/gu,'');
     const source=SPELLS.find(s=>s.eng==='Elementalism');const render=document.createElement('div');
     render.innerHTML=formatSpellRuleHTML(source.d);
     const parts=[...render.querySelectorAll('.sr-rule-block.sr-readable')];
     const names=['召氣','召土','召火','召水','塑形元素'];
     const options=names.map(name=>{
       const p=parts.find(x=>x.querySelector('.sr-rule-label')?.textContent.includes(name));
       const lead=p?.querySelector('.sr-rule-text strong.sr-option-lead');
       const text=p?.querySelector('.sr-rule-text')?.textContent||'';
       return {name,label:p?.querySelector('.sr-rule-label')?.textContent,
         lead:lead?.textContent,leadCount:p?.querySelectorAll('.sr-option-lead').length||0,
         body:text};
     });
     const tip=document.getElementById('spellTip');
     tip.innerHTML=spellTipHTML(source.n);tip.style.display='block';tip.style.left='8px';tip.style.top='8px';
     const tipLabel=tip.querySelector('.sr-rule-label'),tipLead=tip.querySelector('.sr-option-lead');
     const style=x=>x?({color:getComputedStyle(x).color,background:getComputedStyle(x).backgroundColor,
       weight:getComputedStyle(x).fontWeight,size:getComputedStyle(x).fontSize,display:getComputedStyle(x).display}):null;
     const selected=getComputedStyle(tipLabel,'::selection');
     const all98=SPELLS.filter(x=>x.lv===0||x.lv===1);
     const parity=all98.filter(x=>{const d=document.createElement('div');d.innerHTML=formatSpellRuleHTML(x.d);return norm(d.textContent)===norm(x.d)});
     // Further approved multi-option spells now use the same display emphasis.
     // Negative control only rejects unexpected spells outside the eight audited choices.
     const approved=new Set(['Druidcraft','Elementalism','Minor Illusion','Prestidigitation','Thaumaturgy','Command','Create or Destroy Water','Find Familiar']);
     const other=all98.filter(x=>!approved.has(x.eng)).filter(x=>formatSpellRuleHTML(x.d).includes('sr-option-lead'));
     const level2=SPELLS.filter(x=>x.lv===2).every(x=>!formatSpellRuleHTML(x.d).includes('sr-option-lead'));
     S.ruleset='2014';syncRulesetUI();
     const old=SPELLS14.filter(x=>x.lv<=1).every(x=>!formatSpellRuleHTML(x.d).includes('sr-option-lead'));
     S.ruleset='2024';syncRulesetUI();
     return {source:source.n,options,parity:parity.length,others:other.map(x=>x.n),level2,old,
        popup:{flat:[...tip.querySelectorAll('.sr-rule-block')].every(x=>{const s=getComputedStyle(x);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&parseFloat(s.borderLeftWidth)===0}),label:style(tipLabel),lead:style(tipLead),selection:{color:selected.color,background:selected.backgroundColor},
          body:style(tip.querySelector('.sr-rule-text')),overflow:tip.scrollWidth-tip.clientWidth},
        pageOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   await page.screenshot({path:output+'spell-elementalism-lead-'+label+'.png'});
   const list=result.options;
   const pass=errors.length===0&&result.parity===98&&!result.others.length&&result.level2&&result.old&&
     list.every(x=>x.leadCount===1&&x.lead?.length>12)&&list[0].lead.includes('一股和風')&&
     list[1].lead.includes('薄帷')&&list[2].lead.includes('煙')&&
     list[3].lead.includes('霧氣')&&list[4].lead.includes('粗略的形狀')&&
     result.popup.flat&&Number(result.popup.lead.weight)>=700&&result.popup.lead.display==='inline'&&
     result.popup.lead.color!==result.popup.lead.background&&result.popup.selection.color==='rgb(36, 23, 14)'&&result.popup.selection.background==='rgb(226, 185, 121)'&&result.popup.overflow<=2&&result.pageOverflow<=2;
   runs.push({label,width,height,pass,errors,result});
   await page.close();
  }
 }finally{await browser.close()}
 const report={pass:runs.every(x=>x.pass),runs};
 fs.writeFileSync(output+'spell-elementalism-lead-qa.json',JSON.stringify(report,null,2),'utf8');
 console.log(JSON.stringify({pass:report.pass,runs:runs.map(x=>({viewport:x.label,pass:x.pass,errors:x.errors,options:x.result.options.map(o=>({name:o.name,lead:o.lead})),popup:x.result.popup}))},null,2));
 process.exitCode=report.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});
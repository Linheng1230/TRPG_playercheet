'use strict';
const {chromium}=require('playwright');
const fs=require('fs');
const qa='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa';
const url=process.env.QA_URL||'http://127.0.0.1:18771/index.html';
const viewports=[[1440,900,'desktop'],[390,844,'mobile']];
const golden={'Produce Flame':4,'Find Familiar':8,'Mage Hand':4,'Compelled Duel':3,'Chromatic Orb':4,'Silent Image':5,'Command':6,'Sleep':4,'Witch Bolt':4};
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const result={scope:'2024 zero + level1',timestamp:new Date().toISOString(),viewports:[],issues:[],spellRows:[]};
 try{
  for(const [width,height,label] of viewports){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url,{waitUntil:'networkidle',timeout:40000});
   await page.waitForFunction(()=>!!window.spellSemanticAudit2024,{timeout:12000});
   if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
   const audit=await page.evaluate((golden)=>{
    S.ruleset='2024';
    const normalize=x=>String(x||'').replace(/\s+/gu,'');
    const spells=SPELLS.filter(x=>x.lv===0||x.lv===1),plans=window.spellSemanticAudit2024.breaks;
    const problems=[],rows=[];
    const english=spells.map(s=>s.eng);
    const planKeys=Object.keys(plans);
    for(const name of english)if(!Object.prototype.hasOwnProperty.call(plans,name))problems.push({spell:name,type:'missing-plan'});
    for(const name of planKeys)if(!english.includes(name))problems.push({spell:name,type:'extra-plan'});
    for(const s of spells){
      const sentences=String(s.d||'').replace(/\s+/g,' ').trim().match(/[^。！？]+[。！？]?/gu)||[];
      const breaks=plans[s.eng]||[];
      if(breaks.some((n,i)=>!Number.isInteger(n)||n<1||n>=sentences.length||(i&&n<=breaks[i-1])))
        problems.push({spell:s.eng,type:'invalid-break',breaks,sentences:sentences.length});
      const wrap=document.createElement('div');wrap.innerHTML=formatSpellRuleHTML(s.d);
      const paragraphs=[...wrap.querySelectorAll('.sr-rule-block.sr-readable')];
      if(!paragraphs.length)problems.push({spell:s.eng,type:'formatter-fallback'});
      if(normalize(wrap.textContent)!==normalize(s.d))problems.push({spell:s.eng,type:'text-parity'});
      const text=paragraphs.map(p=>p.textContent.trim());
      if(text.some(x=>!x))problems.push({spell:s.eng,type:'empty-paragraph'});
      const actualBreaks=new Set();let consumed='';
      for(const part of paragraphs.slice(0,-1)){consumed+=part.textContent;actualBreaks.add(normalize(consumed).length)}
      for(const n of breaks){const expectedPosition=normalize(sentences.slice(0,n).join('')).length;
        if(!actualBreaks.has(expectedPosition))problems.push({spell:s.eng,type:'semantic-boundary-not-rendered',sentenceIndex:n})}
      const overflow=text.filter(x=>x.length>160).map(x=>x.length);
      if(overflow.length)problems.push({spell:s.eng,type:'long-paragraph',lengths:overflow});
      const tipRoot=document.createElement('div');tipRoot.innerHTML=spellTipHTML(s.n);
      const body=tipRoot.querySelector('.tip-d');
      // Every actual spell card gets a computed-style layout check, not just text equality.
      const visibleCard=document.querySelector('#spellTip');
      visibleCard.innerHTML=tipRoot.innerHTML;
      visibleCard.style.display='block';
      visibleCard.style.top='8px';
      visibleCard.style.left='8px';
      const styledBody=visibleCard.querySelector('.tip-d');
      const computed=getComputedStyle(styledBody);
      const fontSize=parseFloat(computed.fontSize),lineHeight=parseFloat(computed.lineHeight);
      const blockStyles=[...styledBody.querySelectorAll('.sr-rule-block.sr-readable')];
      const nonFlat=blockStyles.some(el=>{const css=getComputedStyle(el);return parseFloat(css.borderLeftWidth)>0||parseFloat(css.borderTopWidth)>0||css.backgroundColor!=='rgba(0, 0, 0, 0)'});
      const horizontal=visibleCard.scrollWidth-visibleCard.clientWidth;
      if(fontSize<13||lineHeight/fontSize<1.55||nonFlat||horizontal>2)
        problems.push({spell:s.eng,type:'computed-style-layout',fontSize,lineHeight,nonFlat,horizontal});
      visibleCard.style.display='none';
      if(normalize(body?.textContent)!==normalize(s.d))problems.push({spell:s.eng,type:'tooltip-parity'});
      if(body?.querySelectorAll('.sr-readable').length!==paragraphs.length)problems.push({spell:s.eng,type:'tooltip-missing-layout'});
      const colored={dice:wrap.querySelectorAll('.sr-dice').length,save:wrap.querySelectorAll('.sr-save').length,
       damage:wrap.querySelectorAll('.sr-damage.damage-semantic').length,adv:wrap.querySelectorAll('.sr-advantage').length,
       disadv:wrap.querySelectorAll('.sr-disadvantage').length,magic:wrap.querySelectorAll('.sr-action').length};
      for(const [field,term] of [['adv','優勢'],['disadv','劣勢'],['magic','魔法動作']]){
        const want=[...s.d.matchAll(new RegExp(term,'gu'))].length;
        if(want!==colored[field])problems.push({spell:s.eng,type:field+'-emphasis-count',want,got:colored[field]});
      }
      const expected=golden[s.eng];
      if(expected&&paragraphs.length<expected)problems.push({spell:s.eng,type:'golden-minimum',expected,got:paragraphs.length});
      rows.push({name:s.n,english:s.eng,level:s.lv,sourceLen:s.d.length,sentences:sentences.length,
       breaks,paragraphCount:paragraphs.length,longestParagraph:Math.max(0,...text.map(x=>x.length)),longParagraphs:overflow,
       paragraphTexts:text,colored,parity:normalize(wrap.textContent)===normalize(s.d),
       tipParity:normalize(body?.textContent)===normalize(s.d)});
    }
    const cantrip=SPELLS.find(x=>x.lv===0),next=SPELLS.filter(x=>x.lv===2);
    const secondUntouched=next.every(x=>!formatSpellRuleHTML(x.d).includes('sr-readable'));
    S.ruleset='2014';syncRulesetUI();
    const old=SPELLS14.filter(x=>x.lv===0||x.lv===1);
    const legacyUntouched=old.every(x=>!formatSpellRuleHTML(x.d).includes('sr-readable'));
    S.ruleset='2024';syncRulesetUI();
    if(!secondUntouched)problems.push({type:'level2-cross-contamination'});
    if(!legacyUntouched)problems.push({type:'2014-cross-contamination'});
    return{total:rows.length,plans:planKeys.length,problems,rows,secondUntouched,legacyUntouched,
     documentOverflow:document.documentElement.scrollWidth-innerWidth};
   },golden);
   result.issues.push(...audit.problems.map(p=>({...p,viewport:label})));
   result.viewports.push({label,width,height,total:audit.total,plans:audit.plans,issues:audit.problems.length,
    secondUntouched:audit.secondUntouched,legacyUntouched:audit.legacyUntouched,pageOverflow:audit.documentOverflow,errors});
   if(label==='desktop')result.spellRows=audit.rows;
   for(const name of ['燃火術','法師之手','強令對決','尋獲魔寵','無聲幻影']){
     await page.evaluate(name=>{
      const trigger=document.createElement('span');
      trigger.dataset.sref=name;trigger.textContent=name;
      document.body.appendChild(trigger);showSpellTip(trigger,true);
      spellTip.style.left='8px';spellTip.style.top='8px';
     },name);
     await page.screenshot({path:qa+'/spell-semantic-audit-'+label+'-'+({'燃火術':'flame','法師之手':'mage','強令對決':'duel','尋獲魔寵':'familiar','無聲幻影':'image'}[name])+'.png'});
     await page.evaluate(()=>closeAllRulePopovers());
   }
   await page.close();
  }
 }finally{await browser.close();}
 result.pass=result.issues.length===0&&result.viewports.every(x=>!x.errors.length&&x.total===98&&x.plans===98&&x.issues===0&&x.pageOverflow<=2);
 fs.writeFileSync(qa+'/spell-semantic-audit-98-report.json',JSON.stringify(result,null,2),'utf8');
 console.log(JSON.stringify({pass:result.pass,viewports:result.viewports,problems:result.issues.slice(0,35),
  overlong:result.spellRows.filter(x=>x.longParagraphs.length).map(x=>({english:x.english,blocks:x.paragraphCount,len:x.longParagraphs})),max:result.spellRows.slice().sort((a,b)=>b.longestParagraph-a.longestParagraph).slice(0,8).map(x=>({english:x.english,longest:x.longestParagraph}))},null,2));
 process.exitCode=result.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});
'use strict';
const fs=require('node:fs');
const {chromium}=require('playwright');
const site=process.env.QA_URL||'http://127.0.0.1:18769/index.html';
const dir='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa';
fs.mkdirSync(dir,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const output=[];
 try{
  for(const [width,height,label] of [[1440,900,'desktop'],[480,760,'narrow'],[390,844,'mobile'],[320,700,'small-mobile']]){
   const page=await browser.newPage({viewport:{width,height}});
   const errors=[];page.on('pageerror',e=>errors.push(String(e.message)));
   await page.goto(site,{waitUntil:'networkidle',timeout:35000});
   await page.waitForFunction(()=>!!window.spellReadableRules2024,{timeout:15000});
   if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
   const facts=await page.evaluate(()=>{
    S.ruleset='2024';
    const norm=s=>String(s||'').replace(/\s+/gu,'');
    const all=SPELLS.filter(s=>s.lv===0||s.lv===1);
    const issues=[];
    const metrics={count0:0,count1:0,adv:0,disadv:0,damage:0,save:0,boxesChecked:0};
    const flat=node=>{const s=getComputedStyle(node);
     return ['Top','Right','Bottom','Left'].every(d=>parseFloat(s['border'+d+'Width'])===0)
       &&s.backgroundColor==='rgba(0, 0, 0, 0)'};
    const samples=[];
    for(const spell of all){
     metrics['count'+spell.lv]++;
     const holder=document.createElement('div');holder.innerHTML=formatSpellRuleHTML(spell.d);
     if(norm(holder.textContent)!==norm(spell.d))issues.push(spell.n+': parity');
     const adv=holder.querySelectorAll('.sr-advantage').length;
     const disadv=holder.querySelectorAll('.sr-disadvantage').length;
     if(adv!==[...spell.d.matchAll(/優勢/gu)].length)issues.push(spell.n+': advantage count');
     if(disadv!==[...spell.d.matchAll(/劣勢/gu)].length)issues.push(spell.n+': disadvantage count');
     if(adv){metrics.adv+=adv;samples.push({name:spell.n,lv:spell.lv,kind:'advantage'})}
     if(disadv){metrics.disadv+=disadv;samples.push({name:spell.n,lv:spell.lv,kind:'disadvantage'})}
     metrics.damage+=holder.querySelectorAll('.sr-damage.damage-semantic').length;
     metrics.save+=holder.querySelectorAll('.sr-save').length;
    }
    const untouched2=SPELLS.filter(x=>x.lv===2).every(x=>!formatSpellRuleHTML(x.d).includes('sr-readable'));
    S.ruleset='2014';syncRulesetUI();
    const untouched14=SPELLS14.filter(x=>x.lv===0||x.lv===1).every(x=>!formatSpellRuleHTML(x.d).includes('sr-readable'));
    S.ruleset='2024';syncRulesetUI();
    const detail=[];
    for(const spell of [SPELLS.find(x=>x.lv===0&&x.n==='酸液飛濺'),SPELLS.find(x=>x.lv===1&&x.n==='燃燒之手'),SPELLS.find(x=>x.lv===1&&x.n==='尋獲魔寵'),SPELLS.find(x=>(x.lv===0||x.lv===1)&&x.d.includes('優勢')),SPELLS.find(x=>(x.lv===0||x.lv===1)&&x.d.includes('劣勢'))].filter(Boolean)){
     const trigger=document.createElement('span');trigger.dataset.sref=spell.n;trigger.textContent=spell.n;
     document.body.appendChild(trigger);showSpellTip(trigger,true);
     const card=document.getElementById('spellTip'),body=card.querySelector('.tip-d');
     const rootBlocks=[...body.querySelectorAll('.sr-rule-block.sr-readable')];
     const ctx=[...card.querySelectorAll('.ct-fact,.ct-row')];
     const borders=rootBlocks.filter(x=>!flat(x)).length+ctx.filter(x=>!flat(x)).length;
     metrics.boxesChecked+=rootBlocks.length+ctx.length;
     const r=card.getBoundingClientRect(),style=getComputedStyle(body);
     detail.push({name:spell.n,lv:spell.lv,parity:norm(body.textContent)===norm(spell.d),
       blocks:rootBlocks.length,innerBoxes:borders,fontsize:parseFloat(style.fontSize),
       lineHeight:parseFloat(style.lineHeight),scrollWidth:card.scrollWidth-card.clientWidth,
       cardWidth:r.width,cardHeight:r.height,
       advantage:[...body.querySelectorAll('.sr-advantage')].map(x=>getComputedStyle(x).color),
       disadvantage:[...body.querySelectorAll('.sr-disadvantage')].map(x=>getComputedStyle(x).color)});
     closeRulePopover('spell',true);trigger.remove();
    }
    return{count:all.length,issues,metrics,untouched2,untouched14,detail,samples:samples.slice(0,18),
      pageOverflow:document.documentElement.scrollWidth-innerWidth};
   });
   const samples=await page.evaluate(()=>{
    const all=SPELLS.filter(x=>x.lv===0||x.lv===1);
    return [
      all.find(x=>x.lv===0&&x.d.includes('劣勢'))||all.find(x=>x.lv===0&&x.d.includes('優勢'))||all.find(x=>x.lv===0&&x.n==='酸液飛濺'),
      all.find(x=>x.lv===1&&x.d.includes('優勢'))||all.find(x=>x.lv===1&&x.n==='燃燒之手'),
      all.find(x=>x.lv===1&&x.d.includes('劣勢'))||all.find(x=>x.lv===1&&x.n==='尋獲魔寵')
    ].map(x=>x?.n).filter(Boolean);
   });
   for(const [i,name] of samples.entries()){
    await page.evaluate(n=>{const el=document.createElement('span');el.dataset.sref=n;el.textContent=n;document.body.appendChild(el);showSpellTip(el,true);spellTip.style.left='8px';spellTip.style.top='8px'},name);
    await page.screenshot({path:dir+'/spell-flat-adv-'+label+'-'+i+'.png'});
    await page.evaluate(()=>closeAllRulePopovers());
   }
   await page.evaluate(()=>go(9));
   await page.locator('#srefQ').fill('燃燒之手');
   await page.locator('.sref-entry[data-sref="燃燒之手"]').scrollIntoViewIfNeeded();
   const gallery=await page.evaluate(()=>{
     const sp=SPELLS.find(x=>x.n==='燃燒之手');
     const entry=document.querySelector('.sref-entry[data-sref="燃燒之手"]');
     const root=entry?.querySelector('.sr-rule-content');
     const blocks=[...root?.querySelectorAll('.sr-rule-block.sr-readable')||[]];
     const flat=blocks.every(x=>{const cs=getComputedStyle(x);return parseFloat(cs.borderLeftWidth)===0&&parseFloat(cs.borderTopWidth)===0&&cs.backgroundColor==='rgba(0, 0, 0, 0)'});
     return{parity:String(root?.textContent||'').replace(/\s+/g,'')===String(sp.d).replace(/\s+/g,''),
       flat,blocks:blocks.length,overflow:document.documentElement.scrollWidth-innerWidth};
   });
   await page.screenshot({path:dir+'/spell-flat-adv-gallery-'+label+'.png'});
   await page.locator('#srefQ').fill('魅惑類人');
   await page.locator('.sref-entry[data-sref="魅惑類人"]').waitFor({state:'visible'});
   const galleryAdv=await page.locator('.sref-entry[data-sref="魅惑類人"] .sr-advantage').first().evaluate(el=>getComputedStyle(el).color);
   await page.locator('#srefQ').fill('強令對決');
   await page.locator('.sref-entry[data-sref="強令對決"]').waitFor({state:'visible'});
   const galleryDisadv=await page.locator('.sref-entry[data-sref="強令對決"] .sr-disadvantage').first().evaluate(el=>getComputedStyle(el).color);
   const pass=!errors.length&&facts.count===98&&facts.metrics.count0===34&&facts.metrics.count1===64&&
     facts.issues.length===0&&facts.metrics.adv>0&&facts.metrics.disadv>0&&
     facts.untouched2&&facts.untouched14&&facts.metrics.boxesChecked>0&&
     facts.detail.every(x=>x.parity&&x.blocks>0&&x.innerBoxes===0&&x.fontsize>=13&&x.lineHeight/x.fontsize>=1.6&&x.scrollWidth<=2)&&
     facts.detail.flatMap(x=>x.advantage).every(color=>color==='rgb(168, 242, 199)')&&
     facts.detail.flatMap(x=>x.disadvantage).every(color=>color==='rgb(255, 179, 171)')&&
     facts.pageOverflow<=2&&gallery.parity&&gallery.flat&&gallery.overflow<=2&&
     galleryAdv==='rgb(28, 113, 80)'&&galleryDisadv==='rgb(161, 45, 42)';
   output.push({label,width,height,pass,errors,facts,gallery,galleryAdv,galleryDisadv});
   await page.close();
  }
 }finally{await browser.close();}
 const result={pass:output.every(x=>x.pass),output};
 fs.writeFileSync(dir+'/spell-flat-advantage-qa.json',JSON.stringify(result,null,2),'utf8');
 console.log(JSON.stringify(result));
 process.exitCode=result.pass?0:1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2});
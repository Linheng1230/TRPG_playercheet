'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const URL=process.env.QA_URL||'http://127.0.0.1:18979/index.html';
const MAP={力量:'str',敏捷:'dex',體質:'con',智力:'int',感知:'wis',魅力:'cha'};
const phrase='力量豁免檢定、敏捷豁免、體質檢定、智力調整值、感知豁免檢定、魅力檢定；力量、敏捷、體質、智力、感知、魅力；造成2d6火焰傷害。';
function required(el,label){
 assert(el, 'missing element: '+label);
 return el;
}
(async()=>{
 const channel=process.env.QA_BROWSER_CHANNEL||(process.env.CI?'':'chrome');
 const browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
   page.on('dialog',d=>d.accept());
   const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(URL,{waitUntil:'networkidle'});
   const close=page.locator('#closeRuleset');
   if(await close.isVisible())await close.click();
   const ready=await page.evaluate((phrase)=>{
    const api=window.ZIZI_DAMAGE_SEMANTICS_5R;
    const main=document.querySelector('main');
    if(!main||!api) return false;
    const host=document.createElement('div');
    host.id='qa-ability-host';
    host.style.cssText='position:relative;padding:10px;max-width:100%;box-sizing:border-box;background:#f8eed9;color:#382c24';
    const p=document.createElement('p');p.id='qa-ability-text';p.textContent=phrase;
    host.append(p);
    const disabled=document.createElement('p');disabled.id='qa-ability-optout';disabled.dataset.noAbilityColor='1';disabled.textContent='感知豁免檢定';
    host.append(disabled);
    const falsePositive=document.createElement('p');falsePositive.id='qa-ability-negative';falsePositive.textContent='魅力學院、立體質感、感知範圍、力量之源';host.append(falsePositive);
    const input=document.createElement('textarea');input.id='qa-ability-input';input.value='敏捷豁免';host.append(input);
    const btn=document.createElement('button');btn.id='qa-ability-trigger';btn.type='button';btn.className='ft';
    btn.dataset.tipTitle='QA 受術者';btn.dataset.tip=phrase;btn.textContent='檢視規則小卡';
    host.append(btn);main.prepend(host);
    const spell=document.getElementById('spellTip');
    if(spell){const txt=document.createElement('div');txt.id='qa-ability-spell';txt.textContent='智力豁免與魅力檢定';spell.append(txt);}
    return true;
   },phrase);
   assert(ready,'main or shared decorator missing');
   await page.waitForFunction(()=>document.querySelectorAll('#qa-ability-text .ability-semantic').length===12);
   const base=await page.evaluate(({phrase,MAP})=>{
    const host=document.querySelector('#qa-ability-host');
    const p=document.querySelector('#qa-ability-text');
    const api=window.ZIZI_DAMAGE_SEMANTICS_5R;
    api.decorate(host);api.decorate(host); // idempotency with existing mutation observer
    const spans=[...p.querySelectorAll('.ability-semantic')];
    return {
      plain:p.textContent,expected:phrase,
      attr:[...spans].map(e=>[e.textContent,e.dataset.ability]),
      damage:p.querySelectorAll('.damage-semantic[data-damage-type="fire"]').length,
      optout:document.querySelectorAll('#qa-ability-optout .ability-semantic').length,
      falsePositive:document.querySelectorAll('#qa-ability-negative .ability-semantic').length,
      textarea:document.querySelector('#qa-ability-input').value,
      spell:[...document.querySelectorAll('#qa-ability-spell .ability-semantic')].map(e=>e.dataset.ability),
      count:spans.length,
      rootOver:document.documentElement.scrollWidth>innerWidth+1,
      abilityMap:api.abilities,
      abilityRange:api.abilityRanges('感知豁免檢定')[0]?.text,
    };
   },{phrase,MAP});
   assert.equal(base.plain,phrase,'original rules text was changed');
   assert.equal(base.count,12,'expected six ability words twice');
   assert.equal(base.damage,1,'existing damage coloring lost');
   assert.equal(base.optout,0,'explicit opt-out broken');
   assert.equal(base.falsePositive,0,'non-ability Chinese words incorrectly highlighted');
   assert.equal(base.textarea,'敏捷豁免');
   assert.deepEqual(base.spell,['int','cha']);
   assert.equal(base.abilityRange,'感知');
   assert(!base.rootOver,'horizontal page overflow');
   for(const [name,abbr] of Object.entries(MAP)){
    const marks=base.attr.filter(x=>x[0]===name);
    assert.equal(marks.length,2,'missing ability '+name);
    assert(marks.every(x=>x[1]===abbr),'wrong semantic attribute '+name);
    assert.equal(base.abilityMap[name],abbr,'API missing '+name);
   }
   await page.locator('#qa-ability-trigger').click();
   const tip=page.locator('#featureTip');
   await tip.waitFor({state:'visible'});
   await page.waitForFunction(()=>document.querySelectorAll('#featureTip .ability-semantic').length>=12);
   const popup=await page.evaluate((MAP)=>{
    const el=document.getElementById('featureTip');
    const rect=el.getBoundingClientRect();
    const spans=[...el.querySelectorAll('.ability-semantic')];
    const colors=Object.fromEntries(Object.entries(MAP).map(([name,abbr])=>{
      const token=spans.find(x=>x.textContent===name);
      if(!token)throw new Error('No popup attribute '+name);
      return [abbr,getComputedStyle(token).color];
    }));
    const names=spans.map(x=>x.textContent);
    const save=el.querySelector('.ft-tip-body')?.textContent||'';
    return {left:rect.left,right:rect.right,width:innerWidth,colors,names,save,
      html:el.innerHTML,scroll:el.scrollHeight,client:el.clientHeight};
   },MAP);
   assert(popup.left>=-1&&popup.right<=width+1,'tooltip outside viewport '+width);
   assert.equal(new Set(Object.values(popup.colors)).size,6,'colors are not distinct');
   const luminosity=color=>{
     const rgb=String(color).startsWith('#')
       ?String(color).slice(1).match(/.{2}/g).map(x=>parseInt(x,16))
       :(String(color).match(/[0-9]+(?:\.[0-9]+)?/g)||[]).slice(0,3).map(Number);
     assert.equal(rgb.length,3,'unreadable computed color '+color);
     return rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4)
       .reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
   };
   const contrast=(a,b)=>{
     const x=luminosity(a),y=luminosity(b);
     return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
   };
   assert(Object.values(popup.colors).every(x=>contrast(x,'#2a2118')>=4.5),'dark popup fails WCAG text contrast');
   const light=await page.evaluate(()=>{
     const host=document.querySelector('#qa-ability-host');
     return [...host.querySelectorAll('.ability-semantic')].map(el=>getComputedStyle(el).color);
   });
   assert(light.length>=12&&light.every(x=>contrast(x,'#f8eed9')>=4.5),'parchment fails WCAG text contrast');
   assert(popup.save.includes('感知豁免檢定'),'source phrase missing in tooltip');
   assert(!popup.html.includes('class="ability-semantic">豁免'),'only the ability name should be inked');
   assert(popup.scroll>=popup.client,'popup overflow state invalid');
   assert.deepEqual(errors,[],'console errors');
   if(width===390){
    const shot=path.resolve('tmp/qa-ability-semantic-v1-390.png');
    fs.mkdirSync(path.dirname(shot),{recursive:true});
    await tip.screenshot({path:shot});
   }
   // Real user path: references -> Bard -> College of Glamour -> level 3.
   // No direct State writes or private renderer calls are used.
   await page.locator('#stepNav .nav-primary button').filter({hasText:'角色百科'}).click();
   await page.locator('#refTabs [data-r=class]').click();
   await page.locator('[data-cr5r-class="吟遊詩人"]').click();
   await page.locator('[data-cr5r-sub="魅音學院"]').click();
   const level3=page.locator('#cr5rLv3');
   if(!(await level3.evaluate(el=>el.open)))await level3.locator('summary').first().click();
   const real=await level3.innerText();
   assert(real.includes('感知豁免檢定'),'real Glamour subclass feature lacks Wisdom saving throw');
   await level3.locator('.ability-semantic[data-ability="wis"]').first().waitFor({state:'attached'});
   assert.equal(await level3.locator('.ability-semantic[data-ability="wis"]').first().innerText(),'感知');
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1,'actual class reference horizontal overflow');
   if(width===390){
     await level3.locator('.ability-semantic[data-ability="wis"]').first().scrollIntoViewIfNeeded();
     await page.screenshot({path:path.resolve('tmp/qa-ability-semantic-glamour-390.png')});
   }
   console.log('PASS six-ability semantic UI '+width+'px, 12/12 tokens, real Glamour Wisdom save, damage retained, contrast AA');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL ability-semantic-v1',e.stack);process.exit(1)});

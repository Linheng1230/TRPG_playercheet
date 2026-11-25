'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const URL=process.env.QA_URL||'http://127.0.0.1:18982/index.html';
const expectNames=['感知','魅力','敏捷','體質','智力','力量'];
const prose=[
 '以感知作為施法屬性。',
 '以魅力施放法術。',
 '使用敏捷進行攻擊。',
 '使用體質計算生命值。',
 '智力為18。',
 '力量增加1點。'
].join('');
(async()=>{
 const channel=process.env.QA_BROWSER_CHANNEL||(process.env.CI?'':'chrome');
 const browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
   page.on('dialog',d=>d.accept());
   const pageErrors=[];page.on('pageerror',e=>pageErrors.push(String(e)));
   await page.goto(URL,{waitUntil:'networkidle'});
   const version=page.locator('#closeRuleset');if(await version.isVisible())await version.click();
   const got=await page.evaluate(({prose})=>{
    const main=document.querySelector('main');
    if(!main||!window.ZIZI_DAMAGE_SEMANTICS_5R)return {error:'NO_RENDERER_OR_MAIN'};
    const root=document.createElement('section');root.id='qa-semantic-v11';
    root.style.cssText='padding:8px;background:#f8eed9;color:#382c24';
    const s=document.createElement('p');s.id='qa-scope';s.textContent=prose;root.append(s);
    const negative=document.createElement('p');negative.id='qa-negative';
    negative.textContent='魅力學院、立體質感、感知範圍、力量之源';
    root.append(negative);
    const nested=document.createElement('div');nested.id='qa-nested';
    nested.innerHTML='<strong>感知豁免檢定</strong>、<em>敏捷（隱匿）檢定</em>、<a href="#qa-link">魅力調整值</a>';
    root.append(nested);
    const formula=document.createElement('p');formula.id='qa-formula';
    formula.textContent='\u529b\u91cf +4 + \u654f\u6377 -2 + \u9ad4\u8cea +0 + \u667a\u529b \u22122 + \u611f\u77e5 + 4 + \u9b45\u529b\uff0b1';
    root.append(formula);
    const prewrapped=document.createElement('p');prewrapped.id='qa-prewrapped';
    prewrapped.innerHTML='\u611f\u77e5 <strong class="rule-em rule-em-number">+4</strong> + \u667a\u529b <strong class="rule-em rule-em-number">-2</strong>';
    root.append(prewrapped);
    const dice=document.createElement('p');dice.id='qa-dice-negative';
    dice.textContent='\u611f\u77e5 +4d6\u3001\u529b\u91cf 18\u3001\u667a\u529b +2.5';
    root.append(dice);
    const pb=document.createElement('p');pb.id='qa-pb';
    pb.innerHTML='\u719f\u7df4 +2 + \u611f\u77e5 +4\uff1b\u719f\u7df4\u52a0\u503c +3\uff1b\u719f\u7df4 <strong class="rule-em rule-em-number">+6</strong>\uff1b<strong class="rule-em rule-em-resource">\u719f\u7df4\u52a0\u503c</strong> <strong class="rule-em rule-em-number">+5</strong>';
    root.append(pb);
    const pbNegative=document.createElement('p');pbNegative.id='qa-pb-negative';
    pbNegative.textContent='\u672a\u719f\u7df4 +2\u3001\u4e0d\u719f\u7df4 +3\u3001\u719f\u7df4 +2d6\u3001\u719f\u7df4 +2.5\u3001\u719f\u7df4\u6280\u80fd\u3001\u719f\u7df4';
    root.append(pbNegative);
    const dynamic=document.createElement('p');dynamic.id='qa-dynamic';dynamic.append(document.createTextNode('尚未有屬性'));
    root.append(dynamic);
    const noColor=document.createElement('p');noColor.dataset.noAbilityColor='1';noColor.id='qa-no-color';noColor.textContent='感知豁免檢定';root.append(noColor);
    const input=document.createElement('textarea');input.value='感知豁免';input.id='qa-typed';root.append(input);
    main.prepend(root);
    return {text:root.textContent};
   },{prose});
   assert(!got.error,got.error);
   await page.waitForTimeout(180);
   const first=await page.evaluate(()=>{
    const root=document.querySelector('#qa-semantic-v11');
    const get=id=>[...document.querySelectorAll('#'+id+' .ability-semantic')].map(x=>[x.textContent,x.dataset.ability]);
    return {
      words:get('qa-scope'),negative:get('qa-negative'),nested:get('qa-nested'),
      formulas:[...root.querySelectorAll('#qa-formula [data-ability-modifier="1"]')].map(x=>[x.textContent,x.dataset.ability,getComputedStyle(x).whiteSpace]),
      prewrapped:get('qa-prewrapped'),prewrapOriginal:root.querySelector('#qa-prewrapped').textContent,
      prewrapNodes:root.querySelectorAll('#qa-prewrapped [data-ability-modifier="1"] strong.rule-em-number').length,
      diceFalsePositive:root.querySelectorAll('#qa-dice-negative [data-ability-modifier="1"]').length,
      pb:[...root.querySelectorAll('#qa-pb [data-proficiency-modifier="1"]')].map(x=>[x.textContent,getComputedStyle(x).whiteSpace,getComputedStyle(x).color,getComputedStyle(x).borderTopStyle]),
      pbOriginal:root.querySelector('#qa-pb').textContent,
      pbNegative:root.querySelectorAll('#qa-pb-negative .proficiency-semantic').length,
      formulaOriginal:root.querySelector('#qa-formula').textContent,
      noColor:get('qa-no-color'),typed:document.querySelector('#qa-typed').value,
      original:document.querySelector('#qa-scope').textContent,
      parentWidth:root.scrollWidth,viewport:innerWidth,pageWidth:document.documentElement.scrollWidth
    };
   });
   const names=first.words.map(([n])=>n);
   assert.deepEqual(names,expectNames,'missing ability in explicit rule formula/usage: '+JSON.stringify(first));
   assert.deepEqual(first.words.map(x=>x[1]),['wis','cha','dex','con','int','str']);
   const expectedLight={str:'#9C3328',dex:'#1E664A',con:'#865413',int:'#235C8C',wis:'#68418D',cha:'#963D69'};
   const expectedDark={str:'#FF9F8E',dex:'#91DFB0',con:'#FFD38C',int:'#92C8F4',wis:'#C9B0FF',cha:'#F3A9D3'};
   const tokens=await page.evaluate(()=>{
     const light=getComputedStyle(document.documentElement),dark=getComputedStyle(document.getElementById('featureTip'));
     return Object.fromEntries(['str','dex','con','int','wis','cha'].map(k=>[k,{
       light:light.getPropertyValue('--ability-'+k).trim().toUpperCase(),
       dark:dark.getPropertyValue('--ability-'+k).trim().toUpperCase()
     }]));
   });
   for(const key of Object.keys(expectedLight)){
     assert.equal(tokens[key].light,expectedLight[key],'v1.1 parchment token drift: '+key);
     assert.equal(tokens[key].dark,expectedDark[key],'v1.1 popover token drift: '+key);
   }
   assert.deepEqual(first.negative,[],'false positive ability text');
   assert.deepEqual(first.formulas,[
     ['\u529b\u91cf +4','str','nowrap'],['\u654f\u6377 -2','dex','nowrap'],['\u9ad4\u8cea +0','con','nowrap'],
     ['\u667a\u529b \u22122','int','nowrap'],['\u611f\u77e5 + 4','wis','nowrap'],['\u9b45\u529b\uff0b1','cha','nowrap']
   ],'signed modifiers must be whole semantic units');
   assert.equal(first.formulaOriginal,'\u529b\u91cf +4 + \u654f\u6377 -2 + \u9ad4\u8cea +0 + \u667a\u529b \u22122 + \u611f\u77e5 + 4 + \u9b45\u529b\uff0b1');
   assert.deepEqual(first.prewrapped,[['\u611f\u77e5 +4','wis'],['\u667a\u529b -2','int']],'existing number emphasis must stay with the ability');
   assert.equal(first.prewrapOriginal,'\u611f\u77e5 +4 + \u667a\u529b -2');
   assert.equal(first.prewrapNodes,2,'preserve original emphasis nodes');
   assert.equal(first.diceFalsePositive,0,'dice/unsigned/decimal must not be treated as a modifier');
   assert.deepEqual(first.pb,['\u719f\u7df4 +2','\u719f\u7df4\u52a0\u503c +3','\u719f\u7df4 +6','\u719f\u7df4\u52a0\u503c +5'].map(s=>[s,'nowrap','rgb(115, 82, 24)','solid']),'proficiency has independent whole-unit color');
   assert.equal(first.pbOriginal,'\u719f\u7df4 +2 + \u611f\u77e5 +4\uff1b\u719f\u7df4\u52a0\u503c +3\uff1b\u719f\u7df4 +6\uff1b\u719f\u7df4\u52a0\u503c +5');
   assert.equal(first.pbNegative,0,'untrained, dice, decimal or bare label must not be marked');
   const darkPB=await page.evaluate(()=>{const tip=document.getElementById('featureTip'),p=document.createElement('p');p.textContent='\u719f\u7df4 +4';tip.append(p);window.ZIZI_DAMAGE_SEMANTICS_5R.decorate(p);const x=p.querySelector('.proficiency-semantic');const result=[x.textContent,getComputedStyle(x).color,getComputedStyle(x).backgroundColor];p.remove();return result;});
   assert.deepEqual(darkPB,['\u719f\u7df4 +4','rgb(255, 224, 138)','rgb(81, 65, 36)']);
   assert.deepEqual(first.nested.map(x=>x[1]),['wis','dex','cha'],'nested emphasis or link lost');
   assert.equal(first.noColor.length,0,'optout broken');
   assert.equal(first.typed,'感知豁免','input mutated');
   assert.equal(first.original,prose,'canonical text mutated');
   assert(first.pageWidth<=width+1,'horizontal overflow');
   // A real renderer may replace a text node in place rather than append new children.
   // MutationObserver must process characterData without a second global observer.
   await page.evaluate(()=>document.querySelector('#qa-dynamic').firstChild.nodeValue='目標進行感知豁免檢定。');
   await page.waitForFunction(()=>document.querySelectorAll('#qa-dynamic .ability-semantic[data-ability="wis"]').length===1,null,{timeout:2000});
   const second=await page.evaluate(()=>{
    const root=document.querySelector('#qa-semantic-v11');
    window.ZIZI_DAMAGE_SEMANTICS_5R.decorate(root);
    window.ZIZI_DAMAGE_SEMANTICS_5R.decorate(root);
    return {counts:root.querySelectorAll('#qa-scope .ability-semantic').length,
      dynamic:root.querySelectorAll('#qa-dynamic .ability-semantic[data-ability="wis"]').length,
      original:root.querySelector('#qa-scope').textContent};
   });
   assert.equal(second.counts,6,'idempotency broken');
   assert.equal(second.dynamic,1,'characterData redraw not recognized');
   assert.equal(second.original,prose);
   assert.deepEqual(pageErrors,[],'client JS errors');
   if(width===390){
     fs.mkdirSync(path.resolve('tmp'),{recursive:true});
     await page.locator('#qa-semantic-v11').screenshot({path:path.resolve('tmp/qa-ability-semantic-v11-390.png')});
   }
   console.log('PASS ability semantic v1.1 '+width+'px formula terms 6/6, DOM redraw, nested wrappers, negatives, idempotency');
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error('FAIL ability semantic v1.1',e.stack);process.exitCode=1});

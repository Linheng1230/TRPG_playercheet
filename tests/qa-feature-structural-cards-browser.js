'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const cases=[
 ['術士||魔源之泉|2','5環法術位'],
 ['德魯伊||荒野變身|2','野獸形態等級對照表'],
 ['德魯伊|大地結社|自然守護|10','火焰傷害抗性'],
 ['德魯伊|星辰結社|星圖|3','骰值6'],
 ['戰士|靈能武士|靈能力量|3','戰士17級'],
 ['遊蕩者|靈魂之刃|靈能力量|3','遊蕩者17級'],
 ['遊俠|精類浪遊者|流派法術|3','精野之賜 d6'],
 ['術士|時鐘靈魂|起源法術|3','秩序顯跡 d6'],
 ['遊俠|獸王|原初夥伴|3','天空野獸'],
 ['術士||超魔法|2','謹慎法術'],
 ['德魯伊|星辰結社|星辰形態|3','射手座']
];
(async()=>{
 const channel=process.env.QA_BROWSER_CHANNEL||(process.env.CI?'':'chrome');
 const b=await chromium.launch({headless:true,...(channel?{channel}:{})});
 try{
  for(const width of [1440,480,390]){
   const page=await b.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.QA_URL||'http://127.0.0.1:18766/index.html',{waitUntil:'networkidle'});
   if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
   for(const [key,expected] of cases){
    const data=await page.evaluate(({key})=>{
     const rule=window.ZIZI_5R_FULL_FEATURE_RULES[key];
     const prev=document.getElementById('qa-structural-card-trigger');if(prev)prev.remove();
     const button=document.createElement('button');button.id='qa-structural-card-trigger';
     button.textContent=key;button.className='ft';button.dataset.tip=rule;button.dataset.tipTitle=key;
     button.style.cssText='position:fixed;top:150px;left:15px;z-index:999';
     document.body.appendChild(button);
     placeFeatureTip(button,true);
     const card=document.getElementById('featureTip'),rect=card.getBoundingClientRect();
     return {text:card.innerText,hidden:card.getAttribute('aria-hidden'),x:rect.x,right:rect.right,scrollWidth:card.scrollWidth,clientWidth:card.clientWidth,scrollHeight:card.scrollHeight,clientHeight:card.clientHeight,docWidth:document.documentElement.scrollWidth};
    },{key});
    assert.equal(data.hidden,'false',key);
    assert(data.text.includes(expected),key+' missing '+expected);
    assert(data.x>=-1&&data.right<=width+1,key+' viewport overflow '+width);
    assert(data.scrollWidth<=data.clientWidth+1,key+' horizontal card overflow '+width);
    assert(data.docWidth<=width+1,key+' page overflow '+width);
    if(width===390 && key==='術士||魔源之泉|2'){
     fs.mkdirSync(path.resolve('tmp'),{recursive:true});
     await page.locator('#featureTip').screenshot({path:path.resolve('tmp/qa-feature-font-magic-mobile.png')});
    }
    if(width===390 && key==='遊俠|獸王|原初夥伴|3'){
     const dest=path.resolve('tmp/qa-feature-primal-beast-mobile.png');
     await page.locator('#featureTip').screenshot({path:dest});
    }
   }
   assert.deepEqual(errors,[],JSON.stringify(errors));
   console.log('PASS structural cards viewport',width,'cases',cases.length);
   await page.close();
  }
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

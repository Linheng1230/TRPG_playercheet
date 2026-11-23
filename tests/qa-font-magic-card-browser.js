const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'});
 try{
  for(const width of [1440,480,390]){
   const page=await b.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.QA_URL||'http://127.0.0.1:18974/index.html',{waitUntil:'networkidle'});
   const got=await page.evaluate(()=>{
    const rule=window.ZIZI_5R_FULL_FEATURE_RULES['術士||魔源之泉|2'];
    const button=document.createElement('button');button.textContent='魔力泉湧 Font of Magic';
    button.className='ft';button.dataset.tip=rule;button.dataset.tipTitle=button.textContent;
    button.style.cssText='position:fixed;top:100px;left:15px;z-index:999';document.body.appendChild(button);
    placeFeatureTip(button,true);
    const el=document.getElementById('featureTip'),box=el.getBoundingClientRect();
    return {text:el.innerText,hidden:el.getAttribute('aria-hidden'),x:box.x,right:box.right,width:box.width,scroll:el.scrollHeight,client:el.clientHeight,docWidth:document.documentElement.scrollWidth,viewWidth:innerWidth};
   });
   assert.equal(errors.length,0,errors.join('; '));
   assert.equal(got.hidden,'false');
   assert(got.text.includes('1環法術位')&&got.text.includes('5環法術位'));
   assert(got.text.includes('消耗7術法點')&&got.text.includes('最低術士9級'));
   assert(got.x>=-1 && got.right<=width+1,JSON.stringify({width,got}));
   assert(got.docWidth<=width+1,JSON.stringify({width,got}));
   console.log('PASS card',width,'ratio 5/5, right',Math.round(got.right),'docWidth',got.docWidth,'scroll',got.scroll,'client',got.client);
   await page.close();
  }
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});

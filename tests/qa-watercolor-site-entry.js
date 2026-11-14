/**
 * B stage homepage & route QA, tests live browser against current owning source.
 * Run: node tests/qa-watercolor-site-entry.js
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.WCS_B_QA_OUT||'D:/Tools/zizi-ai-runtime/visual-qa-20261115';
const routes={creator:0,sheet:7,rules:8,spells:9,shop:10,play:11,characters:12,adventures:13,origin:1,abilities:2};
const sizes=[{id:'mobile',w:390,h:844,cols:2,mini:3},{id:'narrow',w:480,h:800,cols:2,mini:3},{id:'desktop',w:1440,h:900,cols:4,mini:6}];
function serve(){
  return http.createServer((req,res)=>{
    const target=path.resolve(root,decodeURIComponent((req.url||'/').split('?')[0]).replace(/^\/+/,'')||'home.html');
    if(!target.startsWith(root+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){
      res.writeHead(404);res.end('not found');return;
    }
    const ext=path.extname(target).toLowerCase();
    res.writeHead(200,{'Content-Type':({'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.json':'application/json','.woff2':'font/woff2'}[ext]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});
    fs.createReadStream(target).pipe(res);
  });
}
(async()=>{
  let browser;const server=serve();const failures=[];
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  try{
    browser=await chromium.launch({headless:true,channel:'chrome'});
    fs.mkdirSync(out,{recursive:true});
    for(const size of sizes){
      const page=await browser.newPage({viewport:{width:size.w,height:size.h}});
      const errors=[];
      page.on('pageerror',e=>errors.push('page '+e.message));
      page.on('requestfailed',r=>errors.push('req '+r.url()));
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url())});
      await page.goto(url+'/home.html',{waitUntil:'networkidle'});
      const meta=await page.evaluate(()=>{
        const grid=s=>getComputedStyle(document.querySelector(s)).gridTemplateColumns.split(' ').filter(Boolean).length;
        const icons=[...document.querySelectorAll('.wcs-home svg use')];
        return {overflow:document.documentElement.scrollWidth>innerWidth,grid:grid('.wcs-home-grid'),mini:grid('.wcs-home-index'),
          cards:document.querySelectorAll('.wcs-home-card').length,
          anchors:[...document.querySelectorAll('.wcs-home-card')].map(x=>x.getAttribute('href')),
          cats:document.querySelectorAll('.wcs-home-category').length,
          images:icons.length,svgBBox:Math.min(...icons.map(x=>{try{return x.getBBox().width}catch{return 0}})),
          topbar:document.querySelector('.wcs-home-topbar').getBoundingClientRect().height,
          nestedFocusable:[...document.querySelectorAll('.wcs-home-card')].some(x=>x.querySelector('a,button')),
          focusOutline:getComputedStyle(document.querySelector('.wcs-home-toplink'),':focus-visible').outlineStyle
        }
      });
      assert.equal(meta.grid,size.cols,size.id+' large columns');
      assert.equal(meta.mini,size.mini,size.id+' index columns');
      assert.equal(meta.cards,8,size.id+' main entry links');
      assert.equal(meta.cats,9,size.id+' category links');
      assert.ok(meta.anchors.every(x=>x.startsWith('./index.html?view=')),size.id+' route href');
      assert.ok(!meta.overflow,size.id+' horizontal overflow');
      assert.ok(meta.images>=16&&meta.svgBBox>15,size.id+' illustrations actually painted');
      assert.ok(meta.topbar<=65,size.id+' header must be one row '+meta.topbar);
      assert.ok(!meta.nestedFocusable,size.id+' nested links/buttons');
      assert.deepEqual(errors,[],size.id+' HTTP/JS errors');
      await page.screenshot({path:path.join(out,'home-'+size.id+'.png'),fullPage:true});
      console.log('PASS HOME '+size.id+' '+size.w+'x'+size.h+' grid='+meta.grid+'/'+meta.mini+' icons='+meta.images+' topbar='+meta.topbar.toFixed(1));
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto(url+'/home.html',{waitUntil:'networkidle'});
    await page.locator('.wcs-home-card[data-route="spells"]').click();
    await page.waitForURL(/index\.html\?view=spells/);
    await page.waitForTimeout(250);
    assert.equal(await page.locator('.step-panel.active').getAttribute('data-step'),'9','home card click => spell catalog');
    assert.equal(await page.locator('header h1 a.wcs-site-brand').getAttribute('href'),'./home.html','brand => home');
    // Existing first-visit ruleset choice is a real modal; dismiss it as the player would.
    if(await page.locator('#closeRuleset').isVisible())await page.locator('#closeRuleset').click();
    await page.locator('header h1 a.wcs-site-brand').click();
    await page.waitForURL(/home\.html/);
    console.log('PASS NAVIGATION real card click to spell catalog and back via brand');
    await page.close();
    for(const [route,step] of Object.entries(routes)){
      const p=await browser.newPage({viewport:{width:390,height:844}});
      const errs=[];p.on('pageerror',e=>errs.push(e.message));
      await p.goto(url+'/index.html?view='+route,{waitUntil:'networkidle'});
      await p.waitForTimeout(200);
      assert.equal(await p.locator('.step-panel.active').getAttribute('data-step'),String(step),route+' target step');
      assert.deepEqual(errs,[],route+' page errors');
      console.log('PASS ROUTE '+route+' => step '+step);
      await p.close();
    }
    for(const size of [sizes[0],sizes[2]]){
      const p=await browser.newPage({viewport:{width:size.w,height:size.h}});
      await p.goto(url+'/index.html',{waitUntil:'networkidle'});
      await p.waitForTimeout(150);
      const state=await p.evaluate(()=>({nav:document.querySelector('#stepNav').getBoundingClientRect().height,
        header:document.querySelector('header').getBoundingClientRect().height,
        overflow:document.documentElement.scrollWidth>innerWidth,
        brand:!!document.querySelector('header h1 a.wcs-site-brand'),
        original:document.querySelectorAll('.step-panel').length}));
      assert.ok(state.nav<=90,size.id+' nav height unexpectedly increased');
      assert.equal(state.original,14,size.id+' original step panels intact');
      assert.ok(state.brand&&!state.overflow,size.id+' main-site header / overflow');
      console.log('PASS MAIN '+size.id+' originalPanels='+state.original+' navH='+state.nav.toFixed(1)+' headerH='+state.header.toFixed(1));
      await p.close();
    }
    console.log('PASS WATERCOLOR-B TARGETED screenshots='+out);
  }catch(e){console.error('FAIL WATERCOLOR-B',e.stack||e);process.exitCode=1}
  finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exitCode=1});

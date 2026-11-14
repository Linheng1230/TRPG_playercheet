/**
 * D&D 5R watercolor design system QA.
 * Command: node tests/qa-watercolor-visual-system.js
 * Local worktree with packages installed in master: set NODE_PATH to master/node_modules.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.WCS_QA_OUT || 'D:/Tools/zizi-ai-runtime/visual-qa-20261114';
const SIZES = [
  {name:'desktop',width:1440,height:900,large:3,index:6},
  {name:'narrow',width:480,height:800,large:2,index:3},
  {name:'mobile',width:390,height:844,large:2,index:3}
];
function channel(c){const s=c/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);}
function toRgb(color){
  const m=color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  assert.ok(m,'Expected rgb: '+color);
  return [Number(m[1]),Number(m[2]),Number(m[3])];
}
function luminance(color){
  const [r,g,b]=toRgb(color).map(channel);
  return .2126*r+.7152*g+.0722*b;
}
function contrast(a,b){
  const x=luminance(a),y=luminance(b);
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
function createServer(){
  return http.createServer((req,res)=>{
    const url=decodeURIComponent((req.url||'/').split('?')[0]);
    const relative=url==='/'?'visual-styleguide.html':url.replace(/^\/+/,'');
    const file=path.resolve(ROOT,relative);
    if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){
      res.writeHead(404);res.end('Not found');return;
    }
    const type=file.endsWith('.svg')?'image/svg+xml':file.endsWith('.css')?'text/css':
      file.endsWith('.js')?'text/javascript':'text/html';
    res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
}
async function main(){
  const server=createServer();
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const port=server.address().port;
    const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    browser=await chromium.launch({headless:true,...(fs.existsSync(edge)?{executablePath:edge}:{})});
    fs.mkdirSync(OUT,{recursive:true});
    const icons=fs.readFileSync(path.join(ROOT,'assets','watercolor-icons.svg'),'utf8');
    const iconNames=[...icons.matchAll(/<symbol id="([^"]+)"/g)].map(x=>x[1]);
    assert.ok(iconNames.length>=12,'Expected >=12 original illustrated icons');
    for(const d of SIZES){
      const page=await browser.newPage({viewport:{width:d.width,height:d.height},deviceScaleFactor:1});
      const errors=[];
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      page.on('requestfailed',r=>errors.push('FAIL '+r.url()+' '+r.failure()?.errorText));
      await page.goto('http://127.0.0.1:'+port+'/visual-styleguide.html',{waitUntil:'networkidle'});
      const state=await page.evaluate(()=>{
        const style=s=>getComputedStyle(document.querySelector(s));
        const cls=s=>style(s).gridTemplateColumns.split(' ').filter(Boolean).length;
        const all=[...document.querySelectorAll('svg:has(use)')];
        const refs=all.map(el=>el.querySelector('use').getAttribute('href').split('#')[1]);
        const sizes=all.map(el=>el.getBoundingClientRect().width);
        const boxes=all.map(el=>{try{return el.querySelector('use').getBBox().width;}catch{return 0;}});
        return {
          width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
          large:cls('.wcs-card-grid'),index:cls('.wcs-index-grid'),
          cards:document.querySelectorAll('.wcs-entry-card').length,
          icons:all.length,refs,minIcon:Math.min(...sizes),minPaint:Math.min(...boxes),
          cardWidth:document.querySelector('.wcs-entry-card').getBoundingClientRect().width,
          descColor:style('.wcs-entry-description').color,cardBg:style('.wcs-entry-card').backgroundColor,
          headColor:style('.wcs-hero-title').color,bodyBg:style('body').backgroundColor,
          titleSize:parseFloat(style('.wcs-hero-title').fontSize),
          backHeight:document.querySelector('.wcs-back').getBoundingClientRect().height,
          cssLoaded:style('.wcs-entry-card').borderTopStyle!=='none'
        };
      });
      assert.equal(state.large,d.large,d.name+' large cards columns');
      assert.equal(state.index,d.index,d.name+' index columns');
      assert.equal(state.cards,6,d.name+' large cards count');
      assert.ok(state.scrollWidth<=state.width,d.name+' horizontal overflow '+state.scrollWidth);
      assert.ok(state.cssLoaded && state.cardWidth>=140,d.name+' CSS/card width');
      assert.ok(state.icons>=15 && state.minIcon>=50,d.name+' icon count/size');
      assert.ok(state.refs.every(v=>iconNames.includes(v)),d.name+' SVG reference missing');
      assert.ok(state.minPaint>15,d.name+' external-use icons did not paint (bbox='+state.minPaint+')');
      assert.ok(state.backHeight>=44,d.name+' accessibility touch target');
      const ratio=contrast(state.descColor,state.cardBg);
      assert.ok(ratio>=4.5,d.name+' small text ratio '+ratio.toFixed(2));
      const hratio=contrast(state.headColor,state.bodyBg);
      assert.ok(hratio>=3,d.name+' large text ratio '+hratio.toFixed(2));
      assert.deepEqual(errors,[],d.name+' failed requests');
      await page.screenshot({path:path.join(OUT,d.name+'.png'),fullPage:true});
      console.log('PASS '+d.name+' '+d.width+'x'+d.height+' columns='+state.large+'/'+state.index+
        ' icons='+state.icons+' contrast='+ratio.toFixed(2)+' svgBBox='+state.minPaint.toFixed(1));
      await page.close();
    }
    console.log('PASS WATERCOLOR-VISUAL-A TARGETED screenshots='+OUT);
  }finally{
    if(browser)await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
main().catch(e=>{console.error('FAIL WATERCOLOR-VISUAL-A',e.stack||e);process.exitCode=1;});

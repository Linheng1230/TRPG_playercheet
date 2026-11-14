"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const fs=require("node:fs"),http=require("node:http"),path=require("node:path");
(async()=>{
 let server;
 const root=path.resolve(__dirname,"..");
 const url=process.env.QA_URL||await new Promise((resolve,reject)=>{
  server=http.createServer((req,res)=>{
   const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
   const filename=path.resolve(root,"."+pathname);
   if(!(filename===root||filename.startsWith(root+path.sep))){res.writeHead(403);res.end();return}
   fs.readFile(filename,(error,data)=>{
    if(error){res.writeHead(404);res.end();return}
    const extension=path.extname(filename).toLowerCase();
    const mime={".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".json":"application/json",".css":"text/css;charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"}[extension]||"application/octet-stream";
    res.writeHead(200,{"content-type":mime});res.end(data);
   });
  });
  server.once("error",reject);
  server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html"));
 });
 try{await run(url)}finally{if(server)await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error("IA_QA_FAIL",e.stack);process.exitCode=1});
async function run(url){
 const b=await chromium.launch({headless:true,channel:process.env.QA_CHROME_CHANNEL||"chrome"});
 try {
  for(const width of [1440,390]){
   const p=await b.newPage({viewport:{width,height:900}});
   const errors=[];p.on("pageerror",e=>errors.push(e.message));
   await p.goto(url+"?ia=5-"+width,{waitUntil:"networkidle"});
   const modal=p.locator("#closeRuleset");if(await modal.isVisible())await modal.click();
   const pages=[[8,"規則速查","ability"],[9,"法術圖鑑"],[10,"商店購物"],[12,"角色百科","class"],[13,"冒險圖鑑","creature"],[11,"跑團狀態"]];
   for(const [i,title,tab] of pages){
    await p.evaluate(x=>go(x),i);
    assert.equal(await p.locator('.step-panel.active').getAttribute("data-step"),String(i));
    assert.equal(await p.locator('.step-panel.active h2.step-title').innerText(),title);
    if(tab)assert.equal(await p.locator('#refTabs button.active').getAttribute("data-r"),tab);
    assert.equal(await p.locator('.nav-primary button.active').innerText(),title);
   }
   await p.evaluate(()=>go(12));
   assert.ok((await p.locator('#refBody').innerText()).length>90);
   await p.locator('#refTabs [data-r=species]').click();
   assert.ok((await p.locator("#refBody .catalog-reference-grid article").count())>=10);
   await p.locator('#refTabs [data-r=background]').click();
   assert.ok((await p.locator("#refBody .catalog-reference-grid article").count())>=16);
   await p.locator('#refTabs [data-r=gfeat]').click();
   assert.ok((await p.locator("#refBody table tr").count())>8);
   await p.evaluate(()=>go(13));
   assert.ok((await p.locator("#refBody .creature-card").count())>50);
   await p.locator('#refTabs [data-r=item]').click();
   assert.ok((await p.locator("#refBody .item-card").count())>100);
   await p.evaluate(()=>go(8));
   await p.locator('#refTabs [data-r=weapon]').click();
   assert.ok((await p.locator("#refBody table tr").count())>20);
   await p.evaluate(()=>go(9));
   assert.ok((await p.locator("#srefBody").innerText()).length>40);
   await p.evaluate(()=>go(10));
   assert.ok((await p.locator("#shopBody").innerText()).length>50);
   await p.evaluate(()=>go(11));
   assert.ok((await p.locator("#playStatusBody").innerText()).length>50);
   await p.evaluate(()=>{S.ruleset="2014";syncRulesetUI();go(12)});
   await p.locator('#refTabs [data-r=species]').click();
   assert.ok((await p.locator("#refBody .catalog-reference-grid article").count())>=9);
   await p.locator('#refTabs [data-r=background]').click();
   assert.ok((await p.locator("#refBody .catalog-reference-grid article").count())>=10);
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert.ok(overflow<=2,"horizontal overflow "+overflow);
   assert.deepEqual(errors,[]);
   console.log(JSON.stringify({width,nav:pages.map(x=>x[1]),overflow,passed:true}));
   await p.close();
  }
 }finally{await b.close()}
}

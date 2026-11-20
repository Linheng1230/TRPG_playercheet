"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const source=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 try{
  const route=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const target=path.resolve(source,"."+route);
  if(!target.startsWith(source+path.sep)&&target!==source) {res.writeHead(403);return res.end();}
  const f=target;
  fs.readFile(f,(err,b)=>{if(err){res.writeHead(404);return res.end();}res.writeHead(200,{"content-type":mime[path.extname(f)]||"application/octet-stream"});res.end(b)});
 }catch(e){res.writeHead(500);res.end(String(e));}
});
const cues={
 "傳訊術":["120呎","隔物須熟識目標","魔法沉默"],
 "抵抗術":["自願生物","每回合至多一次","1d4","不因首次觸發結束"],
 "神導術":["自願生物","一項技能","每次","1d4"],
 "四象法門":["5呎立方","1呎立方","1小時"],
 "橡棍術":["附贈動作","1d8","丟下或重施法則終止"]
};
async function creator(page){
 await page.locator('[data-class-name="德魯伊"]').click();
 await page.locator('.step-panel.active .class-confirm-controls button').click();
 await page.locator('#next0').click();
 await page.locator('#bgGrid .pick-card').filter({hasText:'罪犯'}).first().click();
 await page.locator('.confirm-bg button').click();
 await page.locator('#spGrid .pick-card').filter({hasText:'矮人'}).first().click();
 await page.locator('.confirm-sp button').click();
 await page.locator('#next1').click();
 const sels=page.locator(".step-panel[data-step='2'] select");
 for(const [i,v] of ['15','14','13','12','10','8','int','con'].entries())await sels.nth(i).selectOption(v);
 await page.locator('#confirmAbilities').click();await page.locator('#next2').click();
 const skills=page.locator(".step-panel[data-step='3'] button.skill-chip:not(.fixed):not(:disabled)");
 const confirm=page.locator('.confirm-skills button');
 if(!await confirm.isEnabled())for(let i=0;i<await skills.count()&&!await confirm.isEnabled();i++)await skills.nth(i).click();
 await confirm.click();await page.locator('#next3').click();
 await page.locator('#fName').fill('QA PR78 五戲法');
 await page.locator('#fPlayer').fill('PR78 source-integrate shadow');
 const lang=page.locator('#languageChoices select');
 for(let i=0;i<await lang.count();i++)await lang.nth(i).selectOption({index:i+1});
 await page.locator('#confirmLanguages').click();await page.locator('#next4').click();
 await page.locator('.step-panel.active [data-order="魔法師"]').click();
 await page.locator('#next5').click();
}
(async()=>{
 const url=await new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html")));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const results=[];
 try{
  for(const width of [390,1440]){
   const touch=width<600;
   const ctx=await browser.newContext({viewport:{width,height:touch?844:900},isMobile:touch,hasTouch:touch});
   const page=await ctx.newPage();
   page.setDefaultTimeout(16000);page.on("dialog",d=>d.accept());
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(url+"?pr78-shadow-qa="+width,{waitUntil:"networkidle",timeout:50000});
   await page.waitForFunction(()=>window.spellSemanticAudit2024?.total===98,{timeout:15000});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await creator(page);
   const found=await page.evaluate(cues=>{
     const cards=[...document.querySelectorAll(".step-panel.active .creator-spell-card")].filter(e=>e.getClientRects().length&&!e.hidden);
     const result={};
     for(const [name,needles] of Object.entries(cues)){
      const c=cards.find(e=>e.querySelector(".sref")?.dataset.sref===name);
      const text=c?.querySelector(".sd")?.textContent||"";
      result[name]={present:!!c,pass:!!c&&needles.every(k=>text.includes(k)),text,hasSemantic:!!c?.querySelector(".sd .sr-readable")};
     }
     return {visibleCards:cards.length,checked:result,overflow:document.documentElement.scrollWidth-innerWidth};
   },cues);
   const all=Object.values(found.checked);
   assert(all.every(x=>x.pass&&x.hasSemantic),JSON.stringify(found.checked));
   assert(found.visibleCards>0 && found.overflow<=2,"creator layout regression");
   assert.deepEqual(errors,[],"runtime JS errors");
   const trigger=page.locator('.step-panel.active .sref[data-sref="傳訊術"]').first();
   await trigger.scrollIntoViewIfNeeded();
   if(touch)await trigger.tap();else await trigger.click();
   const tip=page.locator("#spellTip.rule-popover-pinned .tip-d");
   await tip.waitFor({state:"visible"});
   const rule=await tip.textContent();
   assert(rule.includes("隔著固態物件"),"full canonical rule unavailable");
   const close=page.locator("#spellTip .rule-popover-close");
   if(touch)await close.tap();else await close.click();
   const hidden=await page.locator("#spellTip").getAttribute("aria-hidden");
   assert.equal(hidden,"true");
   results.push({width,count:found.visibleCards,passed:all.length,overflow:found.overflow,errors:errors.length,tip:true,close:true});
   await ctx.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log("PR78_FIVE_REPO_BROWSER_PASS",JSON.stringify({cases:results,total:10,source:"same repository candidate",renderer:"committed renderer and canonical rules"}));
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;server.close()});

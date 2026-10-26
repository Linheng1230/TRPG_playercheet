const {chromium}=require("playwright");const fs=require("fs");
const URL="http://127.0.0.1:18766/index.html";
async function run(width,height,name){
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width,height}});
 page.setDefaultTimeout(7000);
 const errors=[];page.on("pageerror",e=>errors.push("page:"+e.message));page.on("console",m=>{if(m.type()==="error")errors.push("console:"+m.text())});
 await page.goto(URL,{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(()=>go(8));
 await page.waitForTimeout(100);
 const tabs=page.locator("[data-r]");
 const results=[];
 for(const tabName of ["weapon","mastery"]){
   const tab=page.locator(`[data-r="${tabName}"]`);
   if(await tab.count())await tab.click();
   await page.waitForTimeout(50);
   const tips=page.locator(".ft[data-tip]:visible");
   const count=await tips.count();
   for(let i=0;i<count;i++){
     const t=tips.nth(i);
     await t.scrollIntoViewIfNeeded();
     await page.waitForTimeout(20);
     await t.evaluate(el=>placeFeatureTip(el));
     await page.waitForTimeout(20);
     const r=await page.evaluate(()=>{
       const tip=document.querySelector("#featureTip"),tr=tip.getBoundingClientRect();
       const body=tip.querySelector(".ft-tip-body"),rules=[...tip.querySelectorAll(".ft-rule")];
       return {
         title:tip.querySelector(".ft-tip-head")?.innerText||"",
         text:tip.innerText.slice(0,180),
         visible:getComputedStyle(tip).display!=="none",
         rect:{left:tr.left,top:tr.top,right:tr.right,bottom:tr.bottom,width:tr.width,height:tr.height},
         viewport:{w:innerWidth,h:innerHeight},
         outerOverflowX:tip.scrollWidth-tip.clientWidth,
         bodyOverflowX:body?body.scrollWidth-body.clientWidth:0,
         ruleOverflowX:rules.map(x=>x.scrollWidth-x.clientWidth).filter(x=>x>1)
       };
     });
     const ok=r.visible&&r.rect.left>=-0.5&&r.rect.right<=r.viewport.w+0.5&&r.rect.top>=-0.5&&r.rect.bottom<=r.viewport.h+0.5&&r.outerOverflowX<=1&&r.bodyOverflowX<=1&&!r.ruleOverflowX.length;
     results.push({tab:tabName,index:i,ok,...r});
     await page.evaluate(()=>{document.querySelector("#featureTip").style.display="none"});
   }
 }
 await page.screenshot({path:`D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/tooltips-${name}.png`,fullPage:true});
 await browser.close();
 return{name,width,height,errors,results,failed:results.filter(x=>!x.ok)};
}
(async()=>{
 const all=[];for(const c of [[1440,900,"desktop"],[484,360,"screenshot-size"],[390,844,"mobile"]])all.push(await run(...c));
 fs.writeFileSync("D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/qa-tooltips-live.json",JSON.stringify(all,null,2));
 console.log(JSON.stringify(all.map(x=>({name:x.name,errors:x.errors,tested:x.results.length,failed:x.failed.slice(0,12)})),null,2));
 process.exit(all.some(x=>x.errors.length||x.failed.length)?1:0);
})().catch(e=>{console.error(e);process.exit(2)});




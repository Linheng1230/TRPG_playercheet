const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),assert=require("node:assert/strict");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/, "");
 const file=path.resolve(ROOT,name||"index.html");
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return;}
 res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(bytes);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const url="http://127.0.0.1:"+server.address().port+"/index.html";
 const results=[];
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",err=>errors.push(err.message));
   await page.goto(url,{waitUntil:"domcontentloaded"});
   await page.waitForLoadState("networkidle",{timeout:18000}).catch(()=>{});
   const close=page.locator("#closeRuleset");
   if(await close.isVisible())await close.click();
   await page.locator("#btnRuleset").click();
   await page.locator('.ruleset-card[data-ruleset="2024"]').click();
   await page.locator("#stepNav .nav-secondary button").filter({hasText:"種族／背景"}).click();
   await page.locator("#spGrid .pick-card").filter({hasText:"獸人"}).first().click();
   // A pending preview is intentionally not committed; testing it must not alter saved character data.
   const sp=await page.locator("#spDetail .trait-entry").count();
   const color=await page.locator("#spDetail .rule-em").count();
   assert(sp>=2,"species traits not visible");
   assert(color>0,"species rule emphasis missing");
   const info=await page.evaluate(()=>{
    const el=document.querySelector("#spDetail");
    return {overflow:el.scrollWidth-el.clientWidth,darkvision:el.innerText.includes("120 呎")};
   });
   assert(info.darkvision,"orc darkvision changed");
   assert(info.overflow<3,"species preview horizontal overflow");
   const bgCards=page.locator("#bgGrid .pick-card");
   assert((await bgCards.count())>0,"background selection missing");
   let backgroundHasEmphasis=false;
   for(let i=0;i<Math.min(10,await bgCards.count());i++){
    await bgCards.nth(i).click();
    backgroundHasEmphasis=await page.locator("#bgDetail .bg-rule-preview .rule-em").count()>0;
    if(backgroundHasEmphasis)break;
   }
   assert(backgroundHasEmphasis,"background origin feat emphasis absent");
   const metrics=await page.evaluate(()=>{
    const el=document.querySelector("#bgDetail");
    return {overflow:el.scrollWidth-el.clientWidth,hasSave:!!document.querySelector("#bgDetail .bg-rule-preview")};
   });
   assert(metrics.overflow<3,"background preview horizontal overflow");
   assert(metrics.hasSave,"background rule detail not present");
   const catalog=await page.evaluate(()=>{
    const report={};
    for(const [id,selector] of [
     ["class",".cr5r-rule .rule-em"],
     ["ability",".ability-ref-rule .rule-em"],
     ["gfeat",".feat-ref-table .rule-em"],
     ["item",".pr-card.item-card .pr-rule .rule-em"],
     ["creature",".pr-card.creature-card .pr-rule .rule-em"],
     ["tool",".tool-ref-uses .rule-em"],
     ["mastery",".asi-block .rule-em"],
     ["actions",".rc-card .rule-em"]
    ]){
     try{
      refTab=id;renderRef();
      if(id==="item"||id==="creature")document.querySelector("#refBody .pr-card")?.setAttribute("open","");
      const target=document.querySelector("#refBody");
      report[id]={highlight:target.querySelectorAll(selector).length,overflow:target.scrollWidth-target.clientWidth};
     }catch(err){report[id]={error:String(err)}}
    }
    return report;
   });
   for(const [key,result] of Object.entries(catalog)){
    assert(!result.error,"catalog "+key+": "+result.error);
    assert(result.highlight>0,"catalog missing emphasis: "+key+" "+JSON.stringify(result));
    assert(result.overflow<5,"catalog horizontal overflow: "+key+" "+JSON.stringify(result));
   }
   const legacy=await page.evaluate(()=>{
    S.ruleset="2014";S.sp=SPECIES_2014.find(x=>x.n==="半身人");S.spChoices={};
    renderOrigin();
    const target=document.querySelector("#spDetail");
    return {traits:target.querySelectorAll("li").length,highlights:target.querySelectorAll(".rule-em").length,
     overflow:target.scrollWidth-target.clientWidth};
   });
   assert(legacy.traits>0&&legacy.highlights>0,"2014 species semantic preview not colored");
   assert(legacy.overflow<3,"2014 species preview overflow");
   assert(errors.length===0,"page errors: "+errors.join("; "));
   results.push({width,speciesTraits:sp,speciesEmphasis:color,backgroundEmphasis:backgroundHasEmphasis,errors,pass:true});
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
 console.log("PASS real browser semantic previews",JSON.stringify(results));
})().catch(err=>{console.error(err);process.exitCode=1;server.close();});

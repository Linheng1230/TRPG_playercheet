"use strict";
/* Real browser entry from homepage, nav clicks, actual screenshot QA. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,".."),out=path.join(root,"tmp","qa-watercolor-inner-icons");
const mime={".html":"text/html",".css":"text/css",".js":"application/javascript",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".json":"application/json",".woff2":"font/woff2"};
const groups=[
["角色創建","creator","0"],
["角色卡","sheet","7"],
["跑團狀態","play","11"],
["法術圖鑑","spells","9"],
["商店購物","shop","10"],
["角色百科","characters","12"],
["冒險圖鑑","adventures","13"],
["規則速查","rules","8"]
];
const sv=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"home.html");
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end("not found");return}
 res.writeHead(200,{"Content-Type":(mime[path.extname(file)]||"application/octet-stream")+";charset=utf-8","Cache-Control":"no-store"});
 fs.createReadStream(file).pipe(res);
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});let browser;
 await new Promise(r=>sv.listen(0,"127.0.0.1",r));
 const base="http://127.0.0.1:"+sv.address().port;
 try{
  browser=await chromium.launch({headless:true,channel:process.env.QA_CHROME_CHANNEL||"chrome"});
  for(const width of [320,390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width>1000?900:844},hasTouch:width<700,deviceScaleFactor:1});
   const errors=[];
   page.on("pageerror",e=>errors.push(e.message));
   page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url())});
   await page.goto(base+"/home.html",{waitUntil:"networkidle"});
   await page.locator(".wcs-home-card[data-route='sheet']").click();
   await page.waitForURL(/index\.html\?view=sheet/);
   await page.waitForLoadState("networkidle");
   if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
   const primary=page.locator("nav.steps .nav-primary > button:not(.nav-ux-back)");
   assert.equal(await primary.count(),8,"8 canonical view groups remain");
   for(let i=0;i<groups.length;i++){
     const [name,slug,step]=groups[i];
     await primary.nth(i).click();
     await page.waitForTimeout(110);
     const result=await page.evaluate(({slug,index})=>{
       const panel=document.querySelector(".step-panel.active");
       const items=[...document.querySelectorAll("nav.steps .nav-primary > button:not(.nav-ux-back)")];
       const current=items[index];
       const header=panel?.querySelector(":scope > h2.step-title");
       const s=x=>getComputedStyle(x,"::before");
       const navIcon=s(current),titleIcon=header?s(header):null;
       return {activeStep:panel?.dataset.step||"none",currentText:current?.textContent?.trim()||"",
         navBg:navIcon.backgroundImage,navSize:[navIcon.width,navIcon.height],navDisplay:navIcon.display,
         titleBg:titleIcon?.backgroundImage||"none",titleDisplay:header?getComputedStyle(header).display:"missing",
         primaryRows:[...new Set(items.map(b=>Math.round(b.getBoundingClientRect().top)))].length,
         overhang:document.documentElement.scrollWidth-innerWidth,
         backCount:document.querySelectorAll("nav.steps .nav-primary .nav-ux-back").length,
         selected:current.classList.contains("active"),titleText:header?.textContent?.trim()||""};
     },{slug,index:i});
     assert.equal(result.activeStep,step,"actual click navigates to "+name+" "+JSON.stringify(result));
     assert.ok(result.selected,"active group highlight "+name);
     assert.ok(result.navBg.includes("/"+slug+".png"),"correct transparent icon "+name);
     assert.equal(result.primaryRows,1,"one-row site navigation "+name+" "+width);
     assert.ok(result.overhang<=1,"horizontal overflow "+name+" "+width+" "+result.overhang);
     if(step!=="7")assert.ok(result.titleBg.includes("/"+slug+".png"),"matching heading icon "+name);
     if(["sheet","spells","shop","play"].includes(slug))
       await page.screenshot({path:path.join(out,slug+"-"+width+".png")});
     console.log("PASS INNER_ART",width,name,"title",result.titleText.slice(0,20),"navSize",result.navSize.join("x"));
   }
   await page.screenshot({path:path.join(out,"nav-"+width+".png")});
   assert.deepEqual(errors,[],"browser errors at "+width);
   await page.close();
  }
  console.log("PASS INNER WATERCOLOR 8 GROUPS x 4 WIDTHS + 16 SCREENSHOTS");
 } finally {await browser?.close();await new Promise(r=>sv.close(r))}
})().catch(e=>{console.error("FAIL INNER WATERCOLOR",e.stack||e);process.exitCode=1});

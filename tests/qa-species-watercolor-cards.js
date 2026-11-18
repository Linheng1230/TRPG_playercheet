"use strict";
const assert=require("node:assert/strict");
const path=require("node:path"),fs=require("node:fs"),http=require("node:http");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const OUT=path.join(ROOT,"tmp","qa-species-watercolor","browser");
const mime={".html":"text/html",".css":"text/css",".js":"application/javascript",".webp":"image/webp",".png":"image/png",".json":"application/json",".svg":"image/svg+xml",".woff2":"font/woff2"};
const SOURCE_2024=["human","elf","dwarf","halfling","aasimar","dragonborn","gnome","goliath","orc","tiefling"];
const SOURCE_2014=["human","human","elf","dwarf","halfling","dragonborn","gnome","elf","orc","tiefling"];
const server=http.createServer((req,res)=>{
 const file=path.resolve(ROOT,decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"index.html");
 if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}
 res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});
 fs.createReadStream(file).pipe(res);
});
async function validate(page,ruleset,width) {
 await page.locator("#spGrid .pick-card").first().waitFor({timeout:15000});
 await page.evaluate(async()=>Promise.all([...document.querySelectorAll("#spGrid img.species-watercolor-portrait")].map(img=>img.decode())));
 const info=await page.evaluate(()=>{
  const cards=[...document.querySelectorAll("#spGrid .pick-card")];
  return {overflow:document.documentElement.scrollWidth-innerWidth,
   columns:getComputedStyle(document.querySelector("#spGrid")).gridTemplateColumns.split(" ").filter(Boolean).length,
   cards:cards.map(c=>{
    const image=c.querySelector("img.species-watercolor-portrait");
    const b=image?.getBoundingClientRect(),r=c.getBoundingClientRect();
    return {src:image?.getAttribute("src"),complete:!!image&&image.complete,
      naturalWidth:image?.naturalWidth,naturalHeight:image?.naturalHeight,
      fit:image?getComputedStyle(image).objectFit:null,
      centerError:b?Math.abs((b.left+b.right-r.left-r.right)/2):999,
      alphaStyling:image?getComputedStyle(image).backgroundColor:null,
      imageBox:b?{l:b.left,r:b.right,t:b.top,b:b.bottom}:null,
      cardBox:{l:r.left,r:r.right,t:r.top,b:r.bottom},label:c.querySelector(".name")?.textContent}
   })
  };
 });
 const expected=ruleset==="2024"?SOURCE_2024:SOURCE_2014;
 assert.equal(info.cards.length,10,ruleset+" should list ten current species/races");
 if(width<=700)assert.equal(info.columns,2,"mobile species must be two columns");
 if(width===1440)assert.equal(info.columns,4,"desktop species must be four columns");
 assert.ok(info.overflow<=2,ruleset+" "+width+" horizontal overflow "+info.overflow);
 for(let i=0;i<10;i++){
  const c=info.cards[i];
  assert.ok(c.src?.includes("assets/species-watercolor/"+expected[i]+".webp?v=20261118-s1"),"incorrect species image identity "+i+" "+c.src);
  assert.equal(c.complete,true,"failed to load "+c.label);
  assert.equal(c.naturalWidth,440);assert.equal(c.naturalHeight,440);
  assert.equal(c.fit,"contain");
  assert.ok(c.centerError<=2,"off center "+c.label+" "+c.centerError);
  assert.ok(c.imageBox.l>=c.cardBox.l-2&&c.imageBox.r<=c.cardBox.r+2,"image extends horizontally out of card "+c.label);
  assert.ok(c.imageBox.t>=c.cardBox.t-2&&c.imageBox.b<=c.cardBox.b+2,"image extends vertically out of card "+c.label);
 }
 console.log("PASS SPECIES",ruleset,width,"10 illustrated cards and centered visible responsive artwork");
}
(async()=>{
 let browser;
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(done=>server.listen(0,"127.0.0.1",done));
 const base="http://127.0.0.1:"+server.address().port;
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  for(const width of [320,390,480,768,1440]){
   const page=await browser.newPage({viewport:{width,height:width>=1440?900:844},deviceScaleFactor:1});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url())});
   page.on("dialog",dialog=>dialog.accept());
   await page.goto(base+"/index.html?view=creator",{waitUntil:"networkidle"});
   const modal=page.locator("#rulesetModal");
   if(await modal.evaluate(e=>e.classList.contains("open")))await modal.locator('[data-ruleset="2024"]').click();
   const nav=page.locator("#stepNav .nav-secondary button");
   await nav.nth(1).click();
   await validate(page,"2024",width);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(OUT,"2024-"+width+".png"),fullPage:true});
   await page.locator("#spGrid .pick-card").nth(5).click();
   assert.equal(await page.locator("#spGrid .pick-card.selected").count(),1,"selected 2024 dragonborn");
   await validate(page,"2024",width);
   // Re-enter via the existing 2014 rule switch, not by modifying game state in tests.
   await page.locator("#btnRuleset").click();
   await page.locator('#rulesetModal [data-ruleset="2014"]').click();
   await nav.nth(1).click();
   await validate(page,"2014",width);
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:path.join(OUT,"2014-"+width+".png"),fullPage:true});
   await page.locator("#spGrid .pick-card").nth(7).click();
   assert.equal(await page.locator("#spGrid .pick-card.selected").count(),1,"2014 halfelf still selectable");
   await validate(page,"2014",width);
   assert.deepEqual(errors,[],"unhandled browser or HTTP errors "+width);
   await page.close();
  }
  console.log("PASS SPECIES WATERCOLOUR ALL 5 VIEWPORTS / 2024 + 2014 / INTERACTION");
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error("FAIL SPECIES WATERCOLOUR",e.stack||e);process.exitCode=1});

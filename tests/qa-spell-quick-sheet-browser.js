"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css; charset=utf-8"};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const file=path.resolve(root,name);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}
  res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});res.end(data);
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";S.level=5;
    const en=["Poison Spray","Hail of Thorns","Hunter's Mark","Animal Friendship","Alarm","Fireball","Bless"];
    const rows=en.map(n=>{const sp=SPELLS.find(s=>s.eng===n);if(!sp)throw Error("MISSING "+n);return {n:sp.n,lv:sp.lv,d:sp.d}});
    const el=document.createElement("div");el.id="qaSpellQuick";el.className="spell-sheet";
    el.innerHTML=spellSheetBlock("QA",rows);document.body.appendChild(el);
   });
   const row=en=>page.locator('#qaSpellQuick [data-sheet-spell]').filter({has:page.locator('.ss-entry-name .sref')}).filter({hasText:en});
   const en2024=await page.evaluate(()=>Object.fromEntries(SPELLS.map(x=>[x.eng,x.n])));
   const entry=name=>page.locator('#qaSpellQuick [data-sheet-spell="'+en2024[name]+'"]');
   const dmg=name=>entry(name).locator(".ss-quick-damage .ss-v").textContent();
   const save=name=>entry(name).locator(".ss-quick-save .ss-v").textContent();
   assert((await dmg("Poison Spray")).includes("2d12"),"Poison Spray must scale to 2d12 at character level 5");
   assert.equal(await entry("Poison Spray").locator(".ss-quick-save").count(),0,"2024 Poison Spray is attack, not save");
   assert((await entry("Poison Spray").locator(".ss-quick-attack").textContent()).includes("法術攻擊"));
   assert((await dmg("Hail of Thorns")).includes("1d10"));
   assert((await save("Hail of Thorns")).includes("敏捷"));
   assert((await dmg("Hunter's Mark")).includes("1d6"));
   assert((await save("Animal Friendship")).includes("感知"));
   assert.equal(await entry("Alarm").locator(".ss-quick").count(),0);
   assert.equal(await entry("Bless").locator(".ss-quick").count(),0,"Bless 1d4 is not damage");
   assert((await save("Fireball")).includes("敏捷"));
   assert((await dmg("Fireball")).includes("8d6"));
   const tipTrigger=entry("Poison Spray").locator(".sref");
   await tipTrigger.focus();
   await tipTrigger.press("Enter");
   assert(await page.locator("#spellTip").isVisible(),"Full rule popup must open from the accessible spell trigger");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   assert(overflow<=2,"Spell quick sheet caused horizontal overflow "+width+"px: "+overflow);
   const legacy=await page.evaluate(()=>{S.ruleset="2014";const sp=SPELLS14.find(x=>x.n==="魔法飛彈")||SPELLS14[0];const html=spellSheetEntry({n:sp.n,lv:sp.lv});S.ruleset="2024";return html});
   assert(!legacy.includes("ss-quick"),"2014 rules must remain isolated");
   assert.deepEqual(errors,[],"Browser JS errors");
   console.log("SPELL_QUICK_BROWSER_PASS",JSON.stringify({width,dmg:await dmg("Poison Spray"),hail:await save("Hail of Thorns"),overflow,popup:true}));
   await page.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

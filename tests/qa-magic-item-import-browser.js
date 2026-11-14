"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},hasTouch:width<500,isMobile:width<500});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(URL,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="戰士");S.level=3;S.classLevels={戰士:3};S.sub=null;
    go(8);refTab="item";renderRef();
   });
   const buttons=page.locator('[data-magic-add]');
   assert.equal(await buttons.count(),435,"All 435 items need an import button");
   const ids=await page.evaluate(()=>{
    const all=window.ZIZI_5R_MAGIC_ITEMS||[];
    return {weapon:all.find(x=>x.type==="M")?.id,armor:all.find(x=>["HA","LA","MA","S"].includes(x.type))?.id,equipment:all.find(x=>x.type==="P")?.id};
   });
   for(const [group,id] of Object.entries(ids)){
    assert(id,group+" sample missing");
    await page.locator('[data-magic-add="'+id+'"]').click();
    const qty=await page.locator('[data-magic-count="'+id+'"]').textContent();
    assert(qty.includes("×1"),group+" was not imported");
   }
   const saved=await page.evaluate(()=>serialize());
   assert.equal(saved.gear.magicItems.length,3,"Save snapshot missing imported objects");
   await page.evaluate(s=>{deserialize(s);go(7);renderFinal()},saved);
   const state=await page.evaluate(()=>{
    const counts=Object.fromEntries(["weapon","armor","equipment"].map(g=>[g,window.MagicItemImport5R.rows(S).filter(r=>r.group===g).length]));
    const boxes=[...document.querySelectorAll("#finalSheet .pr-magic-box")].map(x=>x.querySelector(".pt")?.innerText||"");
    const width=document.documentElement.scrollWidth-document.documentElement.clientWidth;
    const equip=document.querySelector(".fs-sec .st")?.textContent;
    return {counts,boxes,width,removes:document.querySelectorAll("#finalSheet [data-magic-remove]").length,entries:document.querySelectorAll("#finalSheet .pr-magic-owned").length};
   });
   assert.deepEqual(state.counts,{weapon:1,armor:1,equipment:1});
   assert(state.boxes.some(t=>t.includes("魔法武器"))&&state.boxes.some(t=>t.includes("魔法護甲"))&&state.boxes.some(t=>t.includes("魔法裝備")),"Wrong character-sheet category");
   assert.equal(state.entries,3);
   assert.equal(state.removes,3);
   assert(state.width<=2,"Page overflows viewport "+width+"px: "+state.width);
   await page.locator("#finalSheet .pr-magic-owned summary").first().click();
   await page.locator("#finalSheet [data-magic-remove]").first().click();
   assert.equal(await page.locator("#finalSheet .pr-magic-owned").count(),2,"Remove should update character sheet");
   assert.deepEqual(errors,[],"Browser page errors");
   console.log(JSON.stringify({pass:true,width,counts:state.counts,buttonCount:435,rendered:state.boxes,overflow:state.width,remove:true}));
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

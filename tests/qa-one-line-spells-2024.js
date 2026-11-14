"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
require(path.join(root,"assets/data/spells-phb-2024.js"));
require(path.join(root,"assets/data/spell-rules-2024.js"));
require(path.join(root,"assets/spell-quick-facts-2024.js"));
const quick=globalThis.ZIZI_5R_SPELL_QUICK_FACTS_2024;
const tuples=globalThis.SPELLS_2024_TUPLES;
assert.equal(tuples.length,391);
const missing=tuples.filter(r=>{const v=quick({identifier:r[0]},4);return !v.damage&&!v.heal&&!v.effect;});
assert.deepEqual(missing.map(r=>r[0]),[],"No 2024 spell may lack a one-line damage/heal/effect preview");
assert(quick({identifier:"guidance"},4).effect.includes("所選技能"));
assert(!quick({identifier:"guidance"},4).effect.includes("一次"));
assert(quick({identifier:"spare-the-dying"},4).effect.includes("傷勢穩定"));
assert(quick({identifier:"elementalism"},4).effect.includes("塑形元素"));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css; charset=utf-8"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const file=path.resolve(root,rel);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end();return;}
 res.writeHead(200,{"Content-Type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
 fs.createReadStream(file).pipe(res);});
});
(async()=>{
 const url=await new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html")));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
 const results=[];
 for(const width of [1440,480,390]){
  const page=await browser.newPage({viewport:{width,height:880}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e.message)));
  await page.goto(url,{waitUntil:"networkidle"});
  const data=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;S.classLevels={"德魯伊":4};
   S.sp=SPECIES_2024.find(x=>x.n==="人類");S.bg=BACKGROUNDS_2024[0];
   S.base={str:12,dex:13,con:13,int:13,wis:20,cha:11};
   S.bonusMode="21";S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};
   S.primalOrder="魔法師";
   const names=["shillelagh","guidance","spare-the-dying","elementalism","bless","alarm","moonbeam","cure-wounds"];
   const spells=names.map(id=>SPELLS.find(x=>x.identifier===id));if(spells.some(x=>!x))throw Error("Missing source spell");
   const root=document.createElement("section");root.className="spell-sheet";root.id="qaSpells";
   root.style.cssText="width:calc(100% - 48px);max-width:680px;margin:20px auto";
   document.body.append(root);
   root.innerHTML=spellSheetBlock('固定／特性授予法術<span class="ss-note">（5，不佔一般已知／準備數量）</span>',spells.map(x=>({n:x.n,lv:x.lv,d:x.d})),"ss-always");
   const cards=[...root.querySelectorAll(".ss-entry")];
   const preview=cards.map((card,i)=>{
    const field=card.querySelector(".ss-quick-damage")||card.querySelector(".ss-quick-heal")||card.querySelector(".ss-quick-effect");
    const span=field?.querySelector(".ss-v");
    const rect=span?.getBoundingClientRect(),outer=field?.getBoundingClientRect();
    return {id:names[i],effect:span?.textContent||"",kind:field?.className||"",
     oneLine:!!span&&getComputedStyle(span).whiteSpace==="nowrap",
     fullyVisible:!!rect&&rect.right<=outer.right+1,
     fullPopup:!!card.querySelector(".sref[data-sref]")};
   });
   const head=root.querySelector(".ss-bt"),note=head?.querySelector(".ss-note");
   const heading={text:head?.textContent||"",newline:!!note&&note.getBoundingClientRect().top>head.getBoundingClientRect().top+4};
   const first=spellSheetEntry({n:spells[0].n,lv:0}),prev=S.level;
   S.level=5;const fifth=spellSheetEntry({n:spells[0].n,lv:0});S.level=prev;
   const score=finalScore("wis");const modifier=mod(score);
   S.ruleset="2014";syncRulesetUI();
   const old=SPELLS14[0];const oldHtml=spellSheetEntry({n:old.n,lv:old.lv,d:old.d});
   return {preview,heading,first,fifth,modifier,oldHasQuick:oldHtml.includes("ss-quick"),overflow:document.documentElement.scrollWidth-innerWidth};
  });
  assert(!data.oldHasQuick,"2014 branch must stay unchanged");
  assert(data.heading.newline,"Fixed-spell parenthetical must occupy its own line");
  assert(data.heading.text.includes("5，不佔一般已知／準備數量"));
  const p=Object.fromEntries(data.preview.map(x=>[x.id,x]));
  assert(p.shillelagh.effect.includes("施法屬性調整值"),"Shillelagh modifier source");
  assert(p.shillelagh.effect.includes("1d8"),"Level 4 die");
  assert(data.first.includes("1d8+")&&data.fifth.includes("1d10+"),"Shillelagh dice must scale");
  assert(p.guidance.effect.includes("所選技能")&&p.guidance.effect.includes("1d4"));
  assert(p["spare-the-dying"].effect.includes("傷勢穩定"));
  assert(p.elementalism.effect.includes("塑形元素"));
  assert(p.bless.effect.includes("1d4"));
  assert(p.alarm.effect.length>3);
  assert(data.preview.every(x=>x.oneLine&&x.fullPopup),"Every sample must have single-line summary and full tooltip");
  assert(data.preview.slice(0,5).every(x=>x.fullyVisible),"Named previews must fit mobile width: "+JSON.stringify({width,preview:data.preview}));
  assert(data.overflow<=1,"No document overflow: "+data.overflow);
  assert.deepEqual(errors,[],"No JS runtime errors");
  const folder=path.join(root,"tmp");fs.mkdirSync(folder,{recursive:true});
  await page.screenshot({path:path.join(folder,"qa-one-line-spells-"+width+".png"),fullPage:true});
  results.push({width,visible:data.preview.slice(0,5).every(x=>x.fullyVisible),headingTwoLines:data.heading.newline,
    spells:data.preview.slice(0,5).map(x=>({id:x.id,text:x.effect}))});
  await page.close();
 }
 console.log(JSON.stringify({pass:true,coverage:tuples.length,results},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1});

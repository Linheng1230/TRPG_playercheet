"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
require(path.join(root,"assets/data/spells-phb-2024.js"));
require(path.join(root,"assets/data/spell-rules-2024.js"));
require(path.join(root,"assets/spell-quick-facts-2024.js"));
require(path.join(root,"assets/creator-spell-preview-2024.js"));
const rows=globalThis.SPELLS_2024_TUPLES;
const render=globalThis.ZIZI_CREATOR_SPELL_PREVIEW_2024;
const norm=s=>String(s||"").replace(/\s+/g,"").replace(/＋/g,"+");
assert.equal(rows.length,391);
assert.equal(render.action("附贈動作").key,"bonus");
assert.equal(render.action("附贈動作（符合觸發條件時）").key,"bonus");
assert.equal(render.action("反應（符合觸發條件時）").key,"reaction");
assert.equal(render.action("動作").key,"main");
assert.equal(render.action("1 分鐘").key,"other");
assert.equal(render.action("動作（符合觸發條件時）／8 小時（符合觸發條件時）").key,"other");
const row=id=>{const v=rows.find(r=>r[0]===id);assert(v,"missing "+id);return v};
const preview=(id,level=4)=>{
 const r=row(id);return render.preview({identifier:id,d:globalThis.SPELLS_2024_FULL_RULES[id]},level,{range:r[10],dur:r[12],time:r[9]}).text;
};
const sht=preview("shillelagh",4);
for(const needle of ["短棒","施法屬性","1d8","5級","1d10","11級","1d12","17級","2d6","力場"])assert(sht.includes(needle),"Shillelagh lacks "+needle+": "+sht);
assert(preview("shillelagh",5).includes("目前 1d10"),"Level 5 Shillelagh current die");
assert(preview("shillelagh",11).includes("目前 1d12"),"Level 11 Shillelagh current die");
assert(preview("shillelagh",17).includes("目前 2d6"),"Level 17 Shillelagh current die");
assert(preview("poison-spray",4).includes("1d12"),"Poison Spray 1d12");
assert(preview("guidance").includes("1d4"),"Guidance 1d4");
assert(preview("cure-wounds").includes("2d8")&&preview("cure-wounds").includes("升環施法"),"Cure Wounds base + higher slot 2d8");
assert(preview("guidance").includes("所選技能"),"Guidance effect must not say one check");
assert(preview("fireball").includes("8d6"),"Fireball 8d6");
assert(preview("shield").includes("5"),"Shield +5");
let misses=[];
for(const r of rows){
 const full=globalThis.SPELLS_2024_FULL_RULES?.[r[0]]||"";
 const meta={time:r[9],range:r[10],dur:r[12]};
 const out=render.preview({identifier:r[0],d:full},4,meta);
 assert(out.text?.trim(),r[0]+" has empty preview");
 const hay=norm(out.text+" "+meta.time+" "+meta.range+" "+meta.dur);
 const missing=[...new Set(render.values(full).filter(tok=>!hay.includes(tok)))];
 if(missing.length)misses.push({id:r[0],missing});
}
assert.deepEqual(misses,[],"Canonical mechanical numeric facts missing from preview "+JSON.stringify(misses.slice(0,15)));
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "")||"index.html";
 const file=path.resolve(root,rel);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.stat(file,(err,st)=>{if(err||!st.isFile()){res.writeHead(404);res.end();return}
 res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"});fs.createReadStream(file).pipe(res)});
});
(async()=>{
 const url=await new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html")));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const results=[];
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:860}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e.message)));
   const response=await page.goto(url,{waitUntil:"networkidle"});
   assert(response?.ok(),"Creator HTTP response must be successful: "+response?.status());
   try{
    await page.waitForFunction(()=>typeof S!=="undefined"&&typeof renderSpells==="function",{},{timeout:15000});
   }catch(error){
    const readiness=await page.evaluate(()=>({readyState:document.readyState,hasState:typeof S!=="undefined",hasRender:typeof renderSpells==="function",hasSpellBody:!!document.querySelector("#spellBody")}));
    throw new Error("Creator startup failed: "+JSON.stringify({width,readiness,errors}),{cause:error});
   }
   assert.deepEqual(errors,[],"Browser startup errors");
   const result=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={"德魯伊":4};
    S.sp=SPECIES_2024.find(x=>x.n==="人類");S.bg=BACKGROUNDS_2024[0];
    S.base={str:12,dex:13,con:13,int:13,wis:20,cha:11};
    S.bonusMode="21";S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};S.primalOrder="魔法師";
    renderSpells();
    const root=document.querySelector("#spellBody");
    const cards=[...root.querySelectorAll(".creator-spell-card")];
    const shillelagh=cards.find(x=>x.querySelector(".sref")?.dataset.sref==="橡棍術");
    const full=spellTipHTML("橡棍術");
    const countBefore=S.cantrips.size+"|"+S.prepared.size+"|"+S.spellbook.size;
    const visible=()=>[...root.querySelectorAll(".creator-spell-card:not([hidden])")];
    const all=visible().length;
    const bonus=root.querySelector('[data-cf-group="action"][data-cf-value="bonus"]');
    bonus.click();const onlyBonus=visible().every(x=>x.dataset.creatorAction==="bonus");
    const bonusCount=visible().length;
    const pressed=bonus.getAttribute("aria-pressed");
    root.querySelector('[data-cf-group="tag"][data-cf-value="con"]').click();
    const combo=visible().every(x=>x.dataset.creatorAction==="bonus"&&x.dataset.creatorCon==="1");
    root.querySelector(".creator-filter-clear").click();
    const restored=visible().length===all;
    const stateSame=(S.cantrips.size+"|"+S.prepared.size+"|"+S.spellbook.size)===countBefore;
    const hasTooltip=(full===spellTipHTML("橡棍術")&&full.includes("戲法強化"));
    const style=shillelagh&&getComputedStyle(shillelagh.querySelector(".sd"));
    const overflow=root.scrollWidth-root.clientWidth;
    const isWrapped=!!style&&style.whiteSpace==="normal"&&style.textOverflow!=="ellipsis";
    const action=shillelagh?.querySelector(".creator-spell-action")?.textContent||"";
    const text=shillelagh?.querySelector(".sd")?.textContent||"";
    const choice=root.querySelector('[data-cant="橡棍術"]');
    if(choice&&!choice.disabled&&!S.cantrips.has("橡棍術"))choice.click();
    const selectionPersists=S.cantrips.has("橡棍術")&&!!root.querySelector('[data-cant="橡棍術"].selected');
    root.querySelector('[data-cf-group="action"][data-cf-value="bonus"]').click();
    const filterPersistsAfterSelection=root.querySelector('[data-cf-group="action"][data-cf-value="bonus"]').getAttribute("aria-pressed")==="true";
    root.querySelector(".creator-filter-clear").click();
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=4;S.classLevels={"法師":4};S.sub=null;
    renderSpells();
    const wizardBook=root.querySelectorAll("[data-book]").length;
    const wizardFilter=root.querySelectorAll(".creator-spell-filters [data-cf-group]").length;
    S.cls=null;S.level=5;S.sp=SPECIES_2024.find(x=>x.n==="精靈");
    S.spChoices={eLine:"卓爾",eCast:"cha"};
    renderSpells();
    const noCasterFixed=root.querySelectorAll(".creator-spell-card[data-fixed-spell]").length;
    const noCasterActions=[...root.querySelectorAll(".creator-spell-card[data-fixed-spell]")].every(x=>!!x.dataset.creatorAction);
    S.ruleset="2014";syncRulesetUI();renderSpells();
    const oldFilters=!!document.querySelector("#spellBody .creator-spell-filters");
    return {count:cards.length,all,bonusCount,onlyBonus,combo,pressed,restored,stateSame,hasTooltip,isWrapped,action,text,overflow,oldFilters,wizardBook,wizardFilter,noCasterFixed,noCasterActions,selectionPersists,filterPersistsAfterSelection};
   });
   assert(result.count>10,"Creator spells rendered: "+JSON.stringify(result));
   assert(result.action.includes("附贈動作"),"Shillelagh action badge");
   assert(result.text.includes("1d8")&&!result.text.includes("2d6")&&!result.text.includes("5級"),"Shillelagh glance should show base effect without cantrip scaling");
   assert(result.bonusCount>0&&result.bonusCount<result.all&&result.onlyBonus&&result.combo,"Filter mismatch "+JSON.stringify(result));
   assert.equal(result.pressed,"true","Aria toggle");
   assert(result.restored&&result.stateSame,"Filters mutated selected spell State");
   assert(result.selectionPersists&&result.filterPersistsAfterSelection,"Picking a spell or rerender reset selection/filter");
   assert(result.hasTooltip,"Full canonical tooltip changed");
   assert(result.isWrapped,"Preview CSS must not ellipsize numbers");
   assert(result.wizardBook>10&&result.wizardFilter===6,"Wizard spellbook/filter UI missing");
   assert(result.noCasterFixed>=2&&result.noCasterActions,"No-caster fixed granted spells not enhanced");
   assert(!result.oldFilters,"2014 creator must remain unmodified");
   assert(result.overflow<=1,"Creator width overflow "+result.overflow);
   assert.deepEqual(errors,[],"Browser errors");
   results.push({width,count:result.count,visibleBefore:result.all,bonus:result.bonusCount,overflow:result.overflow});
   await page.close();
  }
  console.log("CREATOR_SPELL_PREVIEW_QA_PASS",JSON.stringify({canonical:rows.length,results}));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error("CREATOR_SPELL_PREVIEW_QA_FAIL",e);process.exitCode=1;server.close()});

"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
require(path.join(root,"assets/data/spells-phb-2024.js"));
require(path.join(root,"assets/data/spell-rules-2024.js"));
require(path.join(root,"assets/spell-quick-facts-2024.js"));
require(path.join(root,"assets/creator-spell-preview-2024.js"));
const rows=globalThis.SPELLS_2024_TUPLES,fulls=globalThis.SPELLS_2024_FULL_RULES;
const engine=globalThis.ZIZI_CREATOR_SPELL_PREVIEW_2024;
const row=id=>{const x=rows.find(r=>r[0]===id);assert(x,id);return x};
function preview(id,l=4){
 const r=row(id),sp={identifier:id,n:r[3],d:fulls[id],con:!!r[6],rit:!!r[7],signature:r[14]};
 return engine.preview(sp,l,{time:r[9],range:r[10],dur:r[12]}).text;
}
assert.equal(rows.length,391);
const required={
 "divination":["25％","7日"],
 "commune":["25％","三個"],
 "heroism":["施法屬性調整值","臨時生命值"],
 "arcane-vigor":["1或2枚","生命骰","施法屬性調整值"],
 "flame-blade":["3d6","施法屬性調整值","火焰"],
 "mordenkainens-sword":["4d12","施法屬性調整值"],
 "tashas-bubbling-cauldron":["施法屬性調整值","最小為1"],
 "animate-objects":["施法屬性調整值","計1個","計2個","計3個"],
 "sorcerous-burst":["1d8","施法屬性調整值","酸蝕","寒冷","火焰","閃電","毒素","心靈","雷鳴"],
 "finger-of-death":["7d8+30","傷害減半"]
};
for(const [id,words] of Object.entries(required)){
 const v=preview(id);
 for(const w of words)assert(v.includes(w),id+" missing "+w+": "+v);
}
const extraCoverage={
 "chromatic-orb":["3d8","酸蝕","雷鳴"],
 "dragons-breath":["3d6","酸蝕","毒素"],
 "elemental-weapon":["1d4","酸蝕","雷鳴"],
 "resistance":["1d4","酸蝕","雷鳴"],
 "protection-from-energy":["酸蝕","雷鳴"],
 "ensnaring-strike":["力量豁免"],
 "modify-memory":["感知豁免"],
 "silence":["雷鳴傷害"],
 "feign-death":["心靈傷害"],
 "gaseous-form":["鈍擊","穿刺","揮砍"],
 "aura-of-purity":["毒素傷害"],
 "haste":["敏捷豁免"],
 "alter-self":["揮砍","穿刺","鈍擊"],
 "conjure-minor-elementals":["酸蝕","寒冷","火焰","閃電"],
 "wall-of-stone":["毒素","心靈"],
 "summon-elemental":["酸蝕","雷鳴","穿刺","揮砍"],
 "summon-undead":["毒素"],
 "delayed-blast-fireball":["火焰"],
 "etherealness":["力場"]
};
for(const [id,words] of Object.entries(extraCoverage)){
 const v=preview(id);
 for(const w of words)assert(v.includes(w),id+" missing "+w+": "+v);
}
const requiredDamagePairs={
 "mordenkainens-faithful-hound":[["4d8","力場"]],
 "befuddlement":[["10d12","心靈"]],
 "blade-barrier":[["6d10","力場"]],
 "wall-of-thorns":[["7d8","穿刺"],["7d8","揮砍"]],
 "flame-strike":[["5d6","火焰"],["5d6","光耀"]],
 "hunger-of-hadar":[["2d6","寒冷"],["2d6","酸蝕"]],
 "ice-storm":[["2d10","鈍擊"],["4d6","寒冷"]],
 "storm-of-vengeance":[["2d6","雷鳴"],["2d6","鈍擊"]],
 "jailarzs-storm-of-radiance":[["2d10","雷鳴"],["2d10","光耀"]]
};
for(const [id,pairs] of Object.entries(requiredDamagePairs)){
 const text=preview(id).replace(/\s+/g,"");
 for(const [die,type] of pairs){
   const re=new RegExp(die+"[^。；]{0,28}"+type+"|"+type+"[^。；]{0,28}"+die);
   assert(re.test(text),id+" lacks canonical damage pair "+die+" "+type+": "+text);
 }
}
for(const [id,wrong] of [["mordenkainens-faithful-hound","4d8穿刺"],["blade-barrier","6d10揮砍"]])
 assert(!preview(id).replace(/\s+/g,"").includes(wrong),id+" retained incorrect old damage type");
assert(!preview("befuddlement").includes("4d6"),"Befuddlement must not retain stale 4d6 from short summary");
assert(!preview("animate-objects").includes("至多十件"),"Incorrect hardcoded object cap from short summary");
assert(!/傷害\s+1d8\s+酸蝕/.test(preview("sorcerous-burst")),"Optional damage type incorrectly displayed as fixed Acid");
assert.deepEqual(engine.action("動作（符合觸發條件時）／8 小時（符合觸發條件時）").keys,["main","other"]);
for(const l of [1,5,11,17])for(const r of rows.filter(x=>x[4]===0)){
 const result=preview(r[0],l);
 assert(result.trim(),r[0]+" empty preview level "+l);
}
for(const l of [1,5,11,17]){
 const v=preview("shillelagh",l);
 assert(v.includes("5級")&&v.includes("11級")&&v.includes("17級"),"Shillelagh progression "+l);
}
/* Independent full-batch mechanical coupling: preserve die+type associations and
   explicit Chinese-numeral hard caps, not just presence of raw numeric tokens. */
const typeRe="酸蝕|鈍擊|寒冷|火焰|力場|閃電|黯蝕|穿刺|毒素|心靈|光耀|揮砍|雷鳴";
const pairPattern=new RegExp("(\\d+d\\d+)(?:\\s*[+＋]\\s*\\d+)?(?:\\s*點)?\\s*("+typeRe+")\\s*傷害","g");
const capPattern=/(?:至多|最多|不超過)[^。，；]{0,28}?(?:\d+|[一二兩三四五六七八九十百千]+)(?:名|個|位|枚|件|支|束|隻|顆|道|種|磅)/g;
const capUnit=/(?:\d+|[一二兩三四五六七八九十百千]+)(?:名|個|位|枚|件|支|束|隻|顆|道|種|磅)/;
let sourcePairsChecked=0,hardCapsChecked=0;
for(const r of rows){
 const full=String(fulls[r[0]]||"").replace(/\s+/g,"");
 const text=preview(r[0]).replace(/\s+/g,"");
 const sourcePairs=[...full.matchAll(pairPattern)].map(m=>({die:m[1],type:m[2]}));
 const previewPairs=[...text.matchAll(pairPattern)].map(m=>({die:m[1],type:m[2]}));
 for(const pair of sourcePairs){
   sourcePairsChecked++;
   const match=new RegExp(pair.die+"[^。；]{0,32}"+pair.type+"|"+pair.type+"[^。；]{0,32}"+pair.die).test(text);
   assert(match,r[0]+" missing canonical damage pair "+pair.die+"/"+pair.type);
 }
 for(const pair of previewPairs){
   const match=new RegExp(pair.die+"[^。；]{0,36}"+pair.type+"|"+pair.type+"[^。；]{0,36}"+pair.die).test(full);
   assert(match,r[0]+" introduced unsupported damage pair "+pair.die+"/"+pair.type);
 }
 for(const cap of full.matchAll(capPattern)){
   const unit=cap[0].match(capUnit)?.[0];
   if(!unit)continue;
   hardCapsChecked++;
   assert(text.includes(unit),r[0]+" missing explicit canonical cap "+unit);
 }
}
assert(sourcePairsChecked>=50,"Expected material damage-pair coverage");
assert(hardCapsChecked>=50,"Expected material numeric-cap coverage");
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".json":"application/json"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const f=path.resolve(root,rel);if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.stat(f,(e,s)=>{if(e||!s.isFile()){res.writeHead(404);return res.end()}
 res.writeHead(200,{"Content-Type":mime[path.extname(f)]||"application/octet-stream"});fs.createReadStream(f).pipe(res)})
});
(async()=>{
 const base=await new Promise(r=>server.listen(19859,"127.0.0.1",()=>r("http://127.0.0.1:"+server.address().port+"/index.html")));
 const browser=await chromium.launch({headless:true,channel:"chrome"}),result=[];
 try{
  for(const width of [1280,390]){
   const page=await browser.newPage({viewport:{width,height:850}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base,{waitUntil:"networkidle"});
   const state=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=5;S.classLevels={"德魯伊":5};
    S.sp=SPECIES_2024.find(x=>x.n==="人類");S.bg=BACKGROUNDS_2024[0];
    S.base={str:12,dex:13,con:13,int:13,wis:20,cha:11};
    S.bonusMode="21";S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};S.primalOrder="魔法師";
    renderSpells();
    const root=document.querySelector("#spellBody");
    const card=[...root.querySelectorAll(".creator-spell-card")].find(c=>c.querySelector(".sref")?.dataset.sref==="植物滋長");
    if(!card)return {found:false,allCards:root.querySelectorAll(".creator-spell-card").length};
    const filter=v=>root.querySelector('[data-cf-group="action"][data-cf-value="'+v+'"]');
    const keys=card.dataset.creatorActionKeys;
    filter("main").click();const main=!card.hidden;filter("main").click();
    filter("other").click();const other=!card.hidden;filter("other").click();
    const restored=!card.hidden;
    const overflow=document.documentElement.scrollWidth-innerWidth;
    S.ruleset="2014";syncRulesetUI();renderSpells();
    return {found:true,main,other,keys,restored,overflow,oldFilters:!!document.querySelector("#spellBody .creator-spell-filters")};
   });
   assert(state.found&&state.main&&state.other&&state.restored,JSON.stringify(state));
   assert(!state.oldFilters,"2014 branch must have no 2024 filters");
   assert(state.overflow<=1,"Horizontal overflow "+JSON.stringify(state));
   assert.deepEqual(errors,[],"Browser page errors");
   result.push({width,...state});
   await page.close();
  }
  console.log("CREATOR_391_QUALITY_TARGETED_PASS",JSON.stringify({sourceCount:rows.length,cantripLevels:[1,5,11,17],confirmedCases:Object.keys(required).length,results:result}));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error("CREATOR_391_QUALITY_TARGETED_FAIL",e.stack);process.exitCode=1;server.close()});

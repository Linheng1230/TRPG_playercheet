const assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/, "")||"index.html");
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{"Content-Type":f.endsWith(".js")?"text/javascript; charset=utf-8":f.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream"});res.end(b);});
});
(async()=>{await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{for(const width of [390,1440]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const coverage=await page.evaluate(()=>{const misses=[],results=[];S.ruleset="2024";
 for(const cls of CLASSES){S.cls=cls;const p=PROG_2024[cls.n];for(const [ix,sub] of p.subs.entries()){const host=document.createElement("div");host.innerHTML=subclassPreview5R(p,ix);const tiers=host.querySelectorAll(".subclass-preview-tier");
 results.push([cls.n,sub.n,tiers.length]);if(tiers.length!==Object.keys(sub.f).length)misses.push(cls.n+"|"+sub.n+"|tiers");
 for(const [lv,raw] of Object.entries(sub.f))for(const key of String(raw).split("\u3001")){
 const full=window.resolveFeatureRule2024?.(cls.n,sub.n,key,+lv)||"";
 const fallback=CLASSDESC_2024?.[cls.n]?.[key]||ALLDESC?.[key]||SUBD?.[key]||"";
 if(!full&&!fallback)misses.push(cls.n+"|"+sub.n+"|"+lv+"|"+key);
 }}}return {results,misses};});
 console.log("ALL_SUBCLASSES",JSON.stringify({width,classes:new Set(coverage.results.map(x=>x[0])).size,subclasses:coverage.results.length,missing:coverage.misses.slice(0,18),missingCount:coverage.misses.length}));
 assert.equal(coverage.results.length>=48,true,"2024 subclass matrix incomplete");
 assert.deepEqual(coverage.misses,[],"Subclass feature descriptions must not be missing");
 const ranger=await page.evaluate(()=>{
 S.ruleset="2024";S.cls=CLASSES.find(x=>x.n==="\u904a\u4fe0");S.level=3;S.sub=null;S.subConfirmed=false;S.base={str:10,dex:14,con:14,int:10,wis:18,cha:8};
 S.classChoices2024={};S.classChoices2024["\u904a\u4fe0"]={primalBeast:"\u5927\u5730\u91ce\u7378"};
 go(5);return {head:S.cls.n,level:S.level};
 });
 assert.equal(ranger.level,3);
 assert.equal(await page.locator("#subGrid .pick-card").count(),4);
 await page.locator("#subGrid .pick-card").filter({hasText:"Beast Master"}).first().click();
 assert.equal(await page.locator("#subclassPreview .subclass-preview-tier").count(),4);
 assert.equal(await page.locator("#subclassPreview .subclass-preview-tier").first().getAttribute("open"),"");
 const before=await page.evaluate(()=>({selected:S.sub,pending:pendingSubclass}));
 assert.equal(before.selected,null,"Preview must not commit");
 assert.equal(before.pending,0);
 await page.locator("#subclassPreview .subclass-preview-tier").nth(1).locator("summary").click();
 assert.equal(await page.locator("#subclassPreview .subclass-preview-tier").nth(1).getAttribute("open"),"");
 page.once("dialog",d=>d.accept());await page.locator("#confirmSubclass").click();
 await page.evaluate(()=>{classChoiceStore2024("\u904a\u4fe0").primalBeast="\u5927\u5730\u91ce\u7378";});
 const stats=await page.evaluate(()=>{const data=window.ZIZI_5R_CREATURES.filter(x=>x.summonedByClass);
 const s=S;return data.map(x=>({id:x.id,model:CreatureImport5R.primalCompanionStats5R(x,s),html:CreatureImport5R.render(s).includes("ci-companion-actual")}));});
 assert.equal(stats.length,3);
 const sea=stats.find(x=>x.id.startsWith("beast-of-the-sea")).model;
 const sky=stats.find(x=>x.id.startsWith("beast-of-the-sky")).model;
 assert.deepEqual({ac:sea.ac,hp:sea.hp,die:sea.damageDie,flat:sea.damageFlat,dc:sea.dc},{ac:17,hp:20,die:"1d6",flat:6,dc:14});
 assert.deepEqual({ac:sky.ac,hp:sky.hp,die:sky.damageDie,flat:sky.damageFlat,dc:sky.dc},{ac:17,hp:16,die:"1d4",flat:7,dc:14});
 const land=stats.find(x=>x.id.startsWith("beast-of-the-land")).model;
 assert.deepEqual({ac:land.ac,hp:land.hp,hit:land.hit,dc:land.dc,damageFlat:land.damageFlat,pb:land.proficiency},{ac:17,hp:20,hit:6,dc:14,damageFlat:6,pb:2});
 assert(stats[0].html,"Actual beast stats should render in character sheet");
 const updated=await page.evaluate(()=>{S.level=5;S.base.wis=20;let x=ZIZI_5R_CREATURES.find(x=>x.id==="beast-of-the-land|xphb");return CreatureImport5R.primalCompanionStats5R(x,S);});
 assert.deepEqual({ac:updated.ac,hp:updated.hp,hit:updated.hit,dc:updated.dc,damageFlat:updated.damageFlat,pb:updated.proficiency},{ac:18,hp:30,hit:8,dc:16,damageFlat:7,pb:3});
 const tier11=await page.evaluate(()=>{S.level=11;const x=ZIZI_5R_CREATURES.find(x=>x.id==="beast-of-the-land|xphb");return {metric:CreatureImport5R.primalCompanionStats5R(x,S),view:CreatureImport5R.render(S)};});
 assert.equal(tier11.metric.hp,60);
 assert(tier11.view.includes("獸性狂怒"),"11級特性必須在原初夥伴卡顯示");
 assert(tier11.view.includes("XPHB"),"保留規則來源");
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert(overflow<=2,"Mobile horizontal overflow "+overflow);
 assert.deepEqual(errors,[],"Page errors");
 console.log("SUBCLASS_COMPANION_BROWSER_PASS",JSON.stringify({width,preconfirm:true,tiers:4,beasts:3,overflow,updated:{hit:updated.hit,hp:updated.hp}}));
 await page.close();
 }}finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
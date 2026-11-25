const assert=require("assert");
const fs=require("fs");
const path=require("path");
const http=require("http");
const {chromium}=require("playwright");

const root=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".woff2":"font/woff2",".png":"image/png",".svg":"image/svg+xml"};
const server=http.createServer((req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
  const file=path.resolve(root,"."+name);
  if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);res.end();return}
  fs.readFile(file,(err,data)=>{
   if(err){res.writeHead(404);res.end("Not found");return}
   res.writeHead(200,{"Content-Type":mime[path.extname(file)]||"application/octet-stream"});
   res.end(data);
  });
 }catch(e){res.writeHead(400);res.end(String(e))}
});
const listen=()=>new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const stop=()=>new Promise(resolve=>server.close(resolve));
(async()=>{
 await listen();
 let browser;
 const report={};
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"domcontentloaded"});
  await page.waitForTimeout(1200);
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();

  const initial=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(c=>c.n==="遊俠");
   S.level=2;S.sub=null;S.styleCantrips2024=[];
   const warrior=Object.values(CLASS_STYLE_EXTRAS_2024).flat().find(x=>x.code==="D");
   if(!warrior)throw Error("Druidic Warrior style not found");
   S.style=warrior.n;go(5);
   return {name:warrior.n,cards:document.querySelectorAll("#lvlBody [data-stylecantrip]").length,preview:document.querySelectorAll("#lvlBody [data-upgrade-spell-card]").length};
  });
  assert(initial.cards>=3&&initial.preview>=initial.cards,"Style cantrip cards not visible");

  const original=await page.evaluate(()=>S.styleCantrips2024.slice());
  await page.locator("#lvlBody [data-upgrade-spell-card] .sref[data-sref]").first().click();
  assert(await page.locator("#spellTip").isVisible(),"Full canonical spell tooltip does not open on click");
  assert.deepStrictEqual(await page.evaluate(()=>S.styleCantrips2024.slice()),original,"Preview changed selection");
  await page.locator("[data-rule-popover-close]").first().click({force:true}).catch(()=>{});
  await page.locator("#lvlBody button[data-stylecantrip][aria-pressed='false']:not([disabled])").first().click();
  await page.locator("#lvlBody button[data-stylecantrip][aria-pressed='false']:not([disabled])").first().click();
  assert.equal((await page.evaluate(()=>S.styleCantrips2024)).length,2,"Style must retain 2 of 2 choices");
  const beforeLimited=await page.evaluate(()=>S.styleCantrips2024.slice());
  const unselected=page.locator("#lvlBody .upgrade-spell-card[data-selected='false'] .sref[data-sref]").first();
  assert(await unselected.count()>0,"No unselected cantrip remaining");
  await unselected.click();
  assert(await page.locator("#spellTip").isVisible(),"At-limit preview unavailable");
  assert.deepStrictEqual(await page.evaluate(()=>S.styleCantrips2024.slice()),beforeLimited,"At-limit preview modified state");
  report.style={...initial,atLimit:true,tooltip:true};

  const cls=await page.evaluate(()=>{
   closeAllRulePopovers();
   S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="吟遊詩人");S.level=6;
   S.sub=PROG_2024["吟遊詩人"].subs.findIndex(x=>x.n==="傳識學院");
   S.classChoices2024={};S.style="";go(5);
   return {sub:S.sub,count:document.querySelectorAll("#lvlBody [data-c24key='magicalDiscoveries']").length};
  });
  assert(cls.sub>=0&&cls.count>=1,"Lore bard spell choice missing");
  const gallery=page.locator("#lvlBody details.upgrade-spell-gallery").filter({has:page.locator("[data-c24key='magicalDiscoveries']")}).first();
  if(await gallery.count())await gallery.evaluate(el=>el.open=true);
  const multi=page.locator("#lvlBody button[data-c24multi][data-c24key='magicalDiscoveries']:not([disabled])").first();
  assert(await multi.count()>0,"Lore bard preview gallery has no actionable spells");
  const beforeMulti=await page.evaluate(()=>JSON.stringify(S.classChoices2024));
  await page.locator("#lvlBody .upgrade-spell-card .sref").first().click();
  assert.equal(await page.evaluate(()=>JSON.stringify(S.classChoices2024)),beforeMulti,"Class preview changed state");
  await multi.click();
  assert.equal((await page.evaluate(()=>classChoiceStore2024("吟遊詩人").magicalDiscoveries||[])).length,1,"Class spell choice not recorded");
  report.classMulti={...cls,selected:true};

  const classSelect=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="法師");S.level=5;
   S.sub=PROG_2024["法師"].subs.findIndex(x=>x.n==="防護師");
   S.classChoices2024={};go(5);
   return {sub:S.sub,selects:document.querySelectorAll("#lvlBody select[data-c24key='savant3']").length,
     previews:document.querySelectorAll("#lvlBody .upgrade-spell-gallery").length};
  });
  assert(classSelect.sub>=0&&classSelect.selects>=1&&classSelect.previews>0,"Wizard free spell preview missing");
  report.classSelect=classSelect;

  const feat=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=2;
   S.sp=SPECIES.find(x=>x.n==="人類");S.spChoices.hFeat="魔法學徒(德魯伊)";
   S.featSpells={};go(5);
   const scope=document.querySelector("#lvlBody [data-fsp='oghu']");
   return {selects:scope?.querySelectorAll("select[data-fsk]").length||0,
     previews:scope?.querySelectorAll(".upgrade-spell-select-preview [data-upgrade-spell-card]").length||0};
  });
  assert(feat.selects===4&&feat.previews>2,"2024 Magic Initiate selectable spell galleries missing");
  await page.locator("#lvlBody [data-fsp='oghu'] select[data-fsk='c1']").selectOption({index:1});
  assert(await page.evaluate(()=>Boolean(S.featSpells?.oghu?.c1)),"Feat cantrip not saved");
  report.feat=feat;

  const fixed=await page.evaluate(()=>{
   S.spChoices.hFeat="妖精之觸";S.featSpells={};go(5);
   const scope=document.querySelector("#lvlBody [data-fsp='oghu']");
   return {cards:scope?.querySelectorAll("[data-upgrade-spell-card]").length||0,
     hasMistyStep:!!scope?.querySelector('[data-upgrade-spell-card="迷蹤步"]')};
  });
  assert(fixed.hasMistyStep&&fixed.cards>=2,"Fixed feat spell card or choices missing");
  report.fixedFeat=fixed;

  const legacyClass=await page.evaluate(()=>{
   S.ruleset="2014";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="邪術師");
   S.level=3;S.classLevels={"邪術師":3};S.classChoices14={"邪術師":{pact:"魔典契約"}};
   S.spChoices.hFeat="";S.sub=null;go(5);
   return {cards:document.querySelectorAll("#lvlBody [data-c14key='tomeCantrips']").length,
     gallery:document.querySelectorAll("#lvlBody .upgrade-spell-gallery").length};
  });
  assert(legacyClass.cards>0&&legacyClass.gallery>0,"2014 Tome pact spell gallery missing");
  report.legacyClass=legacyClass;

  const legacy=await page.evaluate(()=>{
   S.ruleset="2014";syncRulesetUI();
   const n=SPELLS14.find(x=>x.lv===0&&x.cls.includes("D")).n;
   const holder=document.createElement("div");
   holder.innerHTML='<div class="asi-block"><select data-c14="德魯伊" data-c14key="landCantrip"><option value=""></option><option value="'+n+'">'+n+'</option></select></div>';
   document.body.appendChild(holder);enhanceLevelUpSpellChoicesUI(holder);
   const matched=holder.querySelectorAll("[data-upgrade-spell-card]").length;
   const trigger=holder.querySelector(".sref[data-sref]");
   const hasCorrect=trigger&&trigger.dataset.sref===n;
   holder.remove();
   return {matched,hasCorrect};
  });
  assert(legacy.matched>=1&&legacy.hasCorrect,"PHB2014 spell choice preview helper missing");
  report.legacy=legacy;

  for(const width of [1440,480,390]){
   await page.setViewportSize({width,height:900});
   await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=2;
    S.style=Object.values(CLASS_STYLE_EXTRAS_2024).flat().find(x=>x.code==="D").n;
    S.styleCantrips2024=[];go(5);
   });
   const dims=await page.evaluate(()=>({width:innerWidth,body:document.body.scrollWidth,cards:document.querySelectorAll("#lvlBody .upgrade-spell-card").length}));
   assert(dims.cards>=3,"Responsive cards missing");
   assert(dims.body<=dims.width+2,"Horizontal overflow "+JSON.stringify(dims));
   report["viewport"+width]=dims;
   if(process.env.QA_SCREENSHOT_DIR){fs.mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});await page.locator("#lvlBody [data-stylecantrip]").first().scrollIntoViewIfNeeded();await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,"levelup-style-"+width+".png")})}
  }
  assert.deepStrictEqual(errors,[],"Browser page errors");
  console.log("LEVELUP_SPELL_CARDS_QA_PASS",JSON.stringify(report));
  await page.close();
 }finally{if(browser)await browser.close();await stop()}
})().catch(e=>{console.error("LEVELUP_SPELL_CARDS_QA_FAIL",e.stack||e);process.exitCode=1});

"use strict";
const assert=require("node:assert/strict");
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const reports=process.env.QA_EVIDENCE_DIR||path.join(root,"tmp","play-action-deck");
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2"};
async function startServer(){
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,"http://localhost");
  const p=path.resolve(root,"."+decodeURIComponent(url.pathname));
  const relative=path.relative(root,p);
  if(relative.startsWith("..")||path.isAbsolute(relative)){res.writeHead(403);res.end();return}
  fs.readFile(p,(err,data)=>{
   if(err){res.writeHead(404);res.end();return}
   res.setHeader("Content-Type",(mime[path.extname(p)]||"application/octet-stream")+"; charset=utf-8");
   res.writeHead(200);res.end(data);
  });
 });
 await new Promise(r=>server.listen(0,"127.0.0.1",r));
 return {server,url:"http://127.0.0.1:"+server.address().port+"/index.html"};
}
(async()=>{
 const {server,url}=await startServer();
 const localBrave="C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"&&fs.existsSync(localBrave)?{executablePath:localBrave}:{})});
 fs.mkdirSync(reports,{recursive:true});
 const errors=[];
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},locale:"zh-TW"});
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url,{waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>typeof renderPlayStatusTab==="function"&&!!window.PlayActionDeck5R,{timeout:30000});
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  const basics=await page.evaluate(()=>{
   S.ruleset="2024";
   S.cls=CLASSES.find(c=>c.n==="法師");
   S.level=5;S.classLevels={[S.cls.n]:5};S.sub=null;
   ABILITIES.forEach(a=>S.base[a.k]=12);S.base.con=14;S.base.int=18;
   document.getElementById("fName").value="隔離測試法師";
   const get=e=>SPELLS.find(s=>s.eng===e)?.n||null;
   const names=Object.fromEntries(["Shield","Misty Step","Counterspell","Cure Wounds","Healing Word","Alarm","Fireball","Mage Hand"].map(x=>[x,get(x)]));
   S.cantrips=new Set([names["Mage Hand"]].filter(Boolean));
   S.prepared=new Set(Object.entries(names).filter(([k,v])=>v&&k!=="Mage Hand").map(([,v])=>v));
   S.customSpells=[];S.play.hp=null;S.play.hpMax=null;S.play.hd=null;S.slotsUsed={};
   go(11);
   return {names,pre:[...S.prepared],can:[...S.cantrips]};
  });
  console.log("DATA",JSON.stringify(basics));
  const coverage=await page.evaluate(()=>{
   const counts={action:0,bonus:0,reaction:0,other:0},otherTimes=new Set(),missing=[];
   for(const sp of SPELLS){
    const time=SPELL_META[sp.n]?.time||"";
    if(!time)missing.push(sp.eng||sp.n);
    const bucket=window.PlayActionDeck5R.classify(time);
    counts[bucket]++;
    if(bucket==="other")otherTimes.add(time);
   }
   return {total:SPELLS.length,counts,missing:missing.slice(0,15),otherTimes:[...otherTimes].slice(0,40)};
  });
  console.log("ALL_2024_CASTING_TIME_COVERAGE",JSON.stringify(coverage));
  assert.equal(coverage.total,391,"391 PHB2024 canonical spells");
  for(const k of ["Shield","Misty Step","Counterspell","Healing Word","Cure Wounds","Alarm"])assert(basics.names[k],"missing canonical 2024 spell: "+k);
  const layout=await page.evaluate(()=>{
   const a=document.querySelector("#psActions"),s=document.querySelector("#psSlots"),r=document.querySelector("#psResources"),w=document.querySelector(".ps-unified-workspace");
   const e=document.querySelector(".ps-ad-explain"),css=getComputedStyle(e);
   const rect=x=>({x:x.getBoundingClientRect().x,y:x.getBoundingClientRect().y,w:x.getBoundingClientRect().width});
   return {valid:!!w&&a?.parentElement?.classList.contains("ps-unified-main")&&s?.parentElement?.classList.contains("ps-unified-rail"),counts:[document.querySelectorAll("#psActions").length,document.querySelectorAll("#psSlots").length,document.querySelectorAll("#psResources").length],slots:rect(s),action:rect(a),color:css.color,opacity:css.opacity};
  });
  assert(layout.valid,"original resource counters and action deck live in single workspace");
  assert.deepEqual(layout.counts,[1,1,1],"no duplicate resource counters");
  assert(layout.slots.y<layout.action.y,"mobile resources before long action list");
  assert.equal(layout.opacity,"1","action explanation not faded");
  assert.equal(layout.color,"rgb(59, 43, 33)","action explanation readable foreground");
  const magicValues=await page.evaluate(()=>({
   expected:playStatusSpellcasting().flatMap(p=>[fmt(p.attack),String(p.dc)]),
   shown:[...document.querySelectorAll(".ps-run-magic-stat strong")].map(x=>x.textContent.trim()),
   visible:[...document.querySelectorAll(".ps-run-magic-stat")].every(x=>x.getClientRects().length>0)
  }));
  assert.equal(magicValues.visible,true,"spellcasting HUD must always be visible without opening advanced stats");
  assert.deepEqual(magicValues.shown,magicValues.expected,"spell attack and save DC reuse existing character spellcasting calculations");
  assert.equal(await page.locator('.ps-secondary-stats .ps-stat').count(),3,"no second hidden spell attack/DC copy");
  await page.evaluate(()=>go(7));
  const finalLabels=await page.locator("#finalSheet .fs-statrow .stat-box .sl").allInnerTexts();
  assert.equal(finalLabels.length,8,"final sheet projects 8 core facts from existing State");
  assert(finalLabels.includes("法術豁免 DC")&&finalLabels.includes("法術攻擊命中"),"spell attack/DC available in final sheet");
  await page.evaluate(()=>go(11));
  const groups=await page.locator("#psActions [data-ps-action-group]").evaluateAll(es=>Object.fromEntries(es.map(e=>[e.getAttribute("data-ps-action-group"),Array.from(e.querySelectorAll(".ps-ad-card")).map(c=>c.textContent.replace(/\s+/g," ").slice(0,110))])));
  console.log("2024_GROUPS",JSON.stringify(groups));
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  function contains(bucket,name){return groups[bucket].some(s=>s.includes(name))}
  assert(contains("reaction",basics.names.Shield),"Shield reaction");
  assert(contains("reaction",basics.names.Counterspell),"Counterspell reaction");
  assert(contains("bonus",basics.names["Misty Step"]),"Misty Step bonus");
  assert(contains("bonus",basics.names["Healing Word"]),"Healing Word bonus");
  assert(contains("action",basics.names["Cure Wounds"]),"Cure Wounds action");
  assert(contains("other",basics.names.Alarm),"Alarm longer casting time");
  const noImpliedSlot=await page.evaluate(name=>{
   const original=window.grantedSpells2024,oldPrepared=S.prepared;
   try{
    S.prepared=new Set();
    window.grantedSpells2024=()=>[{n:name,mode:"feature",src:"QA：限定授予",note:"每長休免費一次"}];
    const dom=new DOMParser().parseFromString(playStatusActionDeckHTML(),"text/html");
    return {cards:dom.querySelectorAll(".ps-ad-card").length,slotLinks:dom.querySelectorAll('button[data-ps-jump="psSlots"]').length};
   }finally{window.grantedSpells2024=original;S.prepared=oldPrepared}
  },basics.names.Shield);
  assert(noImpliedSlot.cards>=1&&noImpliedSlot.slotLinks===0,"feature-only grant must not imply spell slot eligibility");
  const longer=page.locator('#psActions [data-ps-action-group="other"]');
  assert.equal(await longer.getAttribute("open"),null,"longer casts collapsed by default");
  await longer.locator("summary.ps-ad-group-title").click();
  assert.equal(await longer.getAttribute("open"),"","longer cast list expands by touch");
  await longer.locator("summary.ps-ad-group-title").click();
  assert.equal(await longer.getAttribute("open"),null,"longer cast list re-collapses");
  const card=page.locator("#psActions [data-ps-action-group=reaction] .ps-ad-card").first();
  await card.locator("summary").click();
  assert(await card.locator(".ss-entry").count()>=1,"canonical rule card used");
  assert((await card.innerText()).length>100,"full rules visible");
  assert.equal(await card.locator('button[data-ps-jump="psSlots"]').count(),1,"spell uses original slots counter");
  await card.locator('button[data-ps-jump="psSlots"]').click();
  await page.locator('#psSlots [data-ps-action="slot"][data-ps-key="l1"][data-ps-delta="1"]').click();
  assert.equal(await page.evaluate(()=>S.slotsUsed.l1),1,"existing slot counter is the only state writer");
  await page.locator('#psSlots [data-ps-action="slot"][data-ps-key="l1"][data-ps-delta="-1"]').click();
  assert.equal(await page.evaluate(()=>S.slotsUsed.l1),0,"original slot counter can restore");
  await page.screenshot({path:path.join(reports,"action-deck-390.png"),fullPage:true});
  const saved=await page.evaluate(()=>({ok:saveCurrent(true),id:S.id}));
  assert(saved.ok&&saved.id,"official character save accepted");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>typeof renderPlayStatusTab==="function");
  if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>go(11));
  assert(await page.locator("#psActions [data-ps-action-group=reaction] .ps-ad-card").count()>=2,"reaction spells survive save/reload");
  assert(await page.locator("#psActions [data-ps-action-group=bonus] .ps-ad-card").count()>=2,"bonus spells survive save/reload");
  for(const width of [320,360,480,768,1024,1440]){
   await page.setViewportSize({width,height:900});
   const size=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,inner:innerWidth,board:document.querySelector("#psActions")?.getBoundingClientRect().width}));
   assert(size.scroll<=size.inner+1,"no overflow at "+width+"px: "+JSON.stringify(size));
   if(width===1440){
    const pos=await page.evaluate(()=>({a:document.querySelector("#psActions").getBoundingClientRect().x,r:document.querySelector("#psSlots").getBoundingClientRect().x}));
    assert(pos.a>pos.r+100,"desktop has existing counters in the left rail and actions in the center");
    const board=await page.evaluate(()=>{
     const play=document.querySelector('#playStatusBody');
     const sheet=document.querySelector('main > aside.sheet');
     const cols=play.querySelector('.ps-action-columns');
     return {
      sheetDisplay:getComputedStyle(sheet).display,
      outerWidth:document.querySelector('main').getBoundingClientRect().width,
      playWidth:play.getBoundingClientRect().width,
      columns:getComputedStyle(cols).gridTemplateColumns.split(' ').length,
      actions:play.querySelectorAll('#psActions').length,
      slots:play.querySelectorAll('#psSlots').length,
      resources:play.querySelectorAll('#psResources').length,
      death:play.querySelectorAll('#psActions .ps-action-secondary #psDeath').length,
      ability:play.querySelectorAll('#psActions .ps-action-secondary .ps-abilities').length,
      controls:play.querySelectorAll('.ps-desktop-tools button').length
     };
    });
    assert.equal(board.sheetDisplay,'none',"play page hides duplicate character sheet only at desktop");
    assert(board.playWidth>1050&&board.outerWidth>1100,"play workspace reclaims the full desktop width");
    assert.equal(board.columns,2,"action + bonus/reaction/checks become two columns next to left status rail");
    assert.deepEqual([board.actions,board.slots,board.resources,board.death,board.ability,board.controls],[1,1,1,1,1,3],"single State controls and export routes are preserved");
    const exportRoutes=await page.evaluate(()=>{
     const buttons=[...document.querySelectorAll('#playStatusBody .ps-desktop-tools button')];
     const oldJSON=window.exportJSON,oldPDF=window.exportOfficialCharacterSheet;
     const calls={json:0,pdf:0};
     try{
      window.exportJSON=()=>{calls.json++};
      window.exportOfficialCharacterSheet=()=>{calls.pdf++};
      buttons[1].click();buttons[2].click();
     }finally{window.exportJSON=oldJSON;window.exportOfficialCharacterSheet=oldPDF}
     return calls;
    });
    assert.deepEqual(exportRoutes,{json:1,pdf:1},"desktop export shortcuts call existing JSON/PDF producers");
    await page.locator('#playStatusBody .ps-desktop-tools button').first().click();
    assert.equal(await page.locator('.step-panel[data-step="7"].active').count(),1,"desktop shortcut opens original full character card");
    await page.evaluate(()=>go(0));
    assert.notEqual(await page.locator('main > aside.sheet').evaluate(el=>getComputedStyle(el).display),'none',"creator pages keep the original live character-sheet rail and exports");
    await page.evaluate(()=>go(11));
    await page.screenshot({path:path.join(reports,"action-deck-1440.png"),fullPage:false});
   }
  }
  const granted=await page.evaluate(()=>{
   S.ruleset="2024";S.cls=CLASSES.find(c=>c.n==="戰士");
   S.level=5;S.classLevels={[S.cls.n]:5};
   S.sp=SPECIES_2024.find(sp=>sp.n==="精靈");
   S.spChoices.eLine="高等精靈";S.spChoices.eCast="cha";
   S.cantrips=new Set();S.prepared=new Set();S.customSpells=[];S.styleCantrips2024=[];
   const source=grantedSpells2024().map(x=>x.n);
   go(11);
   return {source,shown:[...document.querySelectorAll("#psActions .ps-ad-card")].map(x=>x.innerText)};
  });
  assert(granted.source.includes(basics.names["Misty Step"]),"high elf grants Misty Step");
  assert(granted.shown.some(x=>x.includes(basics.names["Misty Step"])),"granted bonus spell appears without prepared spell");
  const freeCard=page.locator('#psActions [data-ps-action-group="bonus"] .ps-ad-card').filter({hasText:basics.names["Misty Step"]}).first();
  await freeCard.locator("summary").click();
  assert.equal(await freeCard.locator('button[data-ps-jump="psResources"]').count(),1,"grant links back to species free cast counter");
  assert.equal(await freeCard.locator('button[data-ps-jump="psSlots"]').count(),0,"noncaster grant does not claim nonexistent spell slots");
  await freeCard.locator('button[data-ps-jump="psResources"]').click();
  const freeResource=page.locator("#psResources [data-ps-resource]").filter({hasText:basics.names["Misty Step"]}).first();
  assert.equal(await freeResource.count(),1,"only canonical free-cast counter exists");
  await freeResource.locator('button[data-ps-action="res"][data-ps-delta="1"]').click();
  assert.equal(await page.evaluate(()=>{const r=playStatusSpeciesSpellGrants().find(x=>x.name==="迷蹤步");return r&&S.play.res[r.k]}),1,"free cast consumption remains in existing S.play.res");
  const synced=await page.evaluate(()=>{
   const r=playStatusSpeciesSpellGrants().find(x=>x.name==="迷蹤步");
   const saved=saveCurrent(true);
   const doc=JSON.parse(localStorage.getItem("dnd5r:char:"+S.id));
   go(7);go(11);
   return {saved,rawUsed:doc?.play?.res?.[r.k],liveUsed:S.play.res[r.k]};
  });
  assert(synced.saved&&synced.rawUsed===1&&synced.liveUsed===1,"same creator save and play status state, no duplicate usage ledger");
  const noCaster=await page.evaluate(()=>{
   S.sp=null;S.spChoices={};S.level=2;S.classLevels={[S.cls.n]:2};S.cantrips.clear();S.prepared.clear();go(11);
   return document.querySelectorAll("#psActions .ps-ad-card").length;
  });
  assert.equal(noCaster,0,"noncaster without grants shows no borrowed spells");
  assert.equal(await page.locator(".ps-run-magic").count(),0,"noncaster must not see misleading spell DC/attack");
  await page.evaluate(()=>{
   S.ruleset="2014";S.cls=CLASSES.find(c=>c.n==="法師");S.level=5;S.classLevels={[S.cls.n]:5};
   const reaction=SPELLS14.find(sp=>/盾|護盾/.test(sp.n)&&spellMetaDb()[sp.n]?.time?.includes("反應"));
   const chosen=reaction||SPELLS14.find(sp=>/盾|護盾/.test(sp.n));
   if(!chosen)throw Error("2014 shield not found");
   S.spellByClass={"法師":{cantrips:[],known:[],book:[chosen.n],prepared:[chosen.n]}};
   S.cantrips=new Set();S.prepared=new Set();S.customSpells=[];
   go(11);
  });
  const legacy=await page.locator("#psActions").innerText();
  assert(legacy.includes("2014")||legacy.includes("法術")||legacy.includes("盾"),"2014 action deck renders");
  assert.equal(await page.locator(".ps-run-magic-stat").count(),2,"2014 caster retains visible spell attack and save DC");
  console.log("2014_GROUPS",JSON.stringify(await page.locator("#psActions [data-ps-action-group]").evaluateAll(es=>es.map(e=>[e.dataset.psActionGroup,e.querySelectorAll(".ps-ad-card").length]))));
  assert.deepEqual(errors,[],"no client errors");
  console.log("PASS BROWSER: 2024 class-projected spell action/bonus/reaction/long, canonical full rules, 360/390/480/1440 responsive, 2014 render");
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exitCode=1});

"use strict";
const assert=require("node:assert/strict");
const R=require("../assets/dm-screen-loot.js"),D=require("../assets/dm-screen-v1.js");
const local={edition:"2024",treasure:{"0:hoard":[{min:1,max:25,coins:["0","0","0","2d6*10","0"],counts:["1","0","0","0","0"],valuables:["2","10","1","25"]},{min:26,max:100,coins:["0","0","0","100","0"],counts:["0","1","0","0","0"]}]},party:[[1,1,0,0,0],[2,3,1,0,0],[0,1,2,0,0],[0,0,1,2,1]]};
const pool=[{id:"c",rarity:"common",name:"Common"},{id:"u",rarity:"uncommon",name:"Staff of the Python"}];
const low=()=>0,high=()=>0.999999999;
assert.equal(R.roll("2d6*10+5",low),25);assert.equal(R.roll("2d6*10+5",high),125);assert.equal(R.roll("1d4-1",low),0);assert.equal(R.roll("0",low),0);
for(const f of ["eval(1)","0d6","1d1","101d6","1d1001","1d6*0","1d6/2","1d6**2","1e3","9999999*99999","1d6+-2"])assert.throws(()=>R.formula(f),f);
const compiled=R.compileLocal(local,"2024");
assert.equal(compiled.treasure["0:hoard"].length,100);
for(const mutate of [x=>x.edition="2014",x=>x.treasure["0:hoard"][0].max=24,x=>x.treasure["0:hoard"][0].max=26,x=>x.treasure["0:hoard"][1].coins[3]="alert(1)",x=>x.party[0][0]=-1,x=>x.treasure["0:hoard"][0].min=0]){const t=JSON.parse(JSON.stringify(local));mutate(t);assert.throws(()=>R.compileLocal(t,"2024"))}
const f=R.initial("find-loot");Object.assign(f,{kind:"hoard",mode:"local-table",selection:"catalog"});
assert.throws(()=>R.generate("find-loot",f,"2024",pool,null,low));
const a=R.generate("find-loot",f,"2024",pool,compiled,low),b=R.generate("find-loot",f,"2024",pool,compiled,high);
assert.equal(a.dice[0],1);assert.equal(a.coins[3],20);assert.equal(a.items[0].id,"c");assert.equal(b.dice[0],100);assert.equal(b.coins[3],100);assert.equal(b.items[0].id,"u");assert.equal(a.source,"local-table");assert.deepEqual(a.valuables,[{qty:2,gp:20},{qty:1,gp:25}]);assert.deepEqual(b.valuables,[{qty:0,gp:0},{qty:0,gp:0}]);
f.times=3;assert.equal(R.generate("find-loot",f,"2024",pool,compiled,low).coins[3],60);
assert.throws(()=>R.generate("find-loot",f,"2014",pool,compiled,low));assert.deepEqual(R.catalogFor("2014",pool,{}),[]);
f.mode="custom";f.counts=["0","1","0","0","0"];f.coins=["0","0","0","10","0"];assert.equal(R.generate("find-loot",f,"2024",pool,null,low).source,"custom");
const p=R.initial("party-loot");p.quota=compiled.party; p.level=10;
assert.deepEqual(R.partyCounts(p),[2,3,1,0,0]);p.scope="cumulative";assert.deepEqual(R.partyCounts(p),[3,4,1,0,0]);p.level=7;p.scope="exact-tier";assert.deepEqual(R.partyCounts(p),[1,1,0,0,0]);p.scope="exact-cumulative";assert.deepEqual(R.partyCounts(p),[2,2,0,0,0]);p.size=12;assert.deepEqual(R.partyCounts(p),[2,2,0,0,0]);
let board=D.createDefaultBoard("2024");const tid=board.activeTabId;board=D.addPanel(board,tid,"find-loot");board=D.addPanel(board,tid,"party-loot");const find=board.tabs[0].panels.find(x=>x.type==="find-loot");f.result=R.generate("find-loot",f,"2024",pool,null,low);board=D.updateLoot(board,tid,find.id,f);D.assertValidBoard(board,"2024");assert.equal(board.tabs[0].panels.find(x=>x.id===find.id).loot.result.items.length,3);
const snapshot=JSON.stringify(board);const bad=JSON.parse(JSON.stringify(f));bad.result.counts[0]++;assert.throws(()=>D.updateLoot(board,tid,find.id,bad));assert.equal(JSON.stringify(board),snapshot);
console.log("PASS loot formula/limits, D100 full coverage and endpoints, edition isolation, party counts, state validation");
async function browserQa(){
 const url=process.env.DM_SCREEN_BROWSER_URL;
 if(!url)return;
 const {chromium}=require("playwright");
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});
 try{
 for(const width of [320,390,1440]){
  const context=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
  const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
  await page.goto(url,{waitUntil:"networkidle"});
  const add=async type=>{await page.locator("#panel-type").selectOption(type);await page.locator("#add-panel-button").click();return page.locator('[data-loot-type="'+type+'"]')};
  const find=await add("find-loot"),party=await add("party-loot");
  await find.getByLabel("財寶類型").selectOption("hoard");await find.getByLabel("來源").selectOption("local-table");
  await find.getByRole("button",{name:"產生戰利品"}).click();assert.equal(await find.locator(".loot-result").count(),0);
  await find.locator("input[type=file]").setInputFiles({name:"test-only.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify({edition:"2024",treasure:{"0:hoard":[{min:1,max:100,coins:["0","0","0","25","0"],counts:["0","1","0","0","0"],valuables:["2","10","1","25"]}]}}))});
  await page.waitForFunction(()=>document.querySelector('[data-loot-type="find-loot"]')?.textContent.includes("已有本機 100 面表"));
  await find.getByRole("button",{name:"產生戰利品"}).click();assert.match(await find.locator(".loot-result").innerText(),/25 GP/);assert.match(await find.locator(".loot-result").innerText(),/本機匯入表/);assert.match(await find.locator(".loot-result").innerText(),/寶石 2 件（20 GP）/);assert.match(await find.locator(".loot-result").innerText(),/70 GP 等值/);
  await party.getByLabel("隊伍等級").fill("10");await party.getByLabel("配額範圍").selectOption("cumulative");
  await party.getByLabel("物品結果").selectOption("catalog");
  await party.getByRole("button",{name:"產生戰利品"}).click();assert.match(await party.locator(".loot-result").innerText(),/非普通 5 件/);
  await page.reload({waitUntil:"networkidle"});assert.equal(await find.locator(".loot-result").count(),1);assert.equal(await party.locator(".loot-result").count(),1);assert.match(await find.innerText(),/尚未匯入本機表/);
  assert((await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth))<=2,"horizontal overflow "+width);
  if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:require("node:path").join(process.env.QA_SCREENSHOT_DIR,"dm-loot-"+width+".png"),fullPage:true});
  await page.locator("#edition-select").selectOption("2014");assert.equal(await find.count(),0);const legacy=await add("party-loot");
  assert.equal(await legacy.getByLabel("物品結果").locator("option").count(),1);
  await legacy.getByRole("button",{name:"產生戰利品"}).click();assert.match(await legacy.locator(".loot-result").innerText(),/DM 選定/);
  await page.locator("#edition-select").selectOption("2024");assert.equal(await find.locator(".loot-result").count(),1);
  await find.getByRole("button",{name:"清除結果"}).click();assert.equal(await find.locator(".loot-result").count(),0);
  const [download]=await Promise.all([page.waitForEvent("download"),page.locator("#export-button").click()]);
  const body=JSON.parse(require("node:fs").readFileSync(await download.path(),"utf8"));assert.equal(body.edition,"2024");assert(body.board.tabs.some(t=>t.panels.some(p=>p.type==="party-loot"&&p.loot.result)));
  assert.deepEqual(errors,[]);console.log("PASS browser",width,"real panel/roll/upload/reload/export and edition isolation");
  await context.close();
 }
 }finally{await browser.close()}
}
browserQa().catch(e=>{console.error(e.stack);process.exitCode=1});

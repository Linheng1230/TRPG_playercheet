"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),http=require("node:http");
const {chromium}=require("playwright"),ExcelJS=require("exceljs");
const root=path.resolve(__dirname,".."),types={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".css":"text/css",".json":"application/json",".png":"image/png",".ttf":"font/ttf",".woff2":"font/woff2"};
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/,"")||"index.html",file=path.resolve(root,rel);if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"}).end(b)})});
const sheets=["\u89d2\u8272\u5361","\u7269\u54c1\u8207\u80cc\u666f","\u6cd5\u8853\u8868","\u6cd5\u8853\u66f8","\u5750\u9a0e","\u5718\u52d9\u7d00\u9304\u5361","\u89d2\u8272\u7c21\u5361"];
const name="\u6e2c\u8a66\u5192\u96aa\u8005";
(async()=>{
 if(!process.env.QA_URL)await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  for(const ruleset of ["2024","2014"]){
   for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
    const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(String(e)));
    await p.goto(process.env.QA_URL||("http://127.0.0.1:"+server.address().port+"/index.html"),{waitUntil:"networkidle",timeout:45000});
    if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
    const before=await p.evaluate((mode)=>{
      S.ruleset=mode;syncRulesetUI();
      S.cls=CLASSES.find(x=>x.n==="\u6cd5\u5e2b");
      S.sp=SPECIES.find(x=>x.n==="\u4eba\u985e");
      S.bg=BACKGROUNDS[0];S.level=5;S.classLevels={"\u6cd5\u5e2b":5};S.base={str:10,dex:14,con:12,int:18,wis:13,cha:8};
      S.cantrips=new Set(["\u6bd2\u6c23\u5674\u6e67","\u9178\u6db2\u98db\u6ffa"]);S.prepared=new Set(["\u706b\u7403\u8853"]);S.spellbook=new Set(["\u706b\u7403\u8853"]);
      const f=document.querySelector("#fName");f.value="\u6e2c\u8a66\u5192\u96aa\u8005";document.querySelector("#fPlayer").value="QA Fixture";
      S.gear.gold={pp:0,gp:23,sp:4,cp:1};S.gear.items="\u7761\u888b\u3001\u706b\u628a";S.bio.story="\u6e2c\u8a66\u80cc\u666f\u6545\u4e8b";
      go(7);
      return {rule:S.ruleset,level:S.level,spells:[...S.cantrips],name:f.value};
    },ruleset);
    assert.equal(await p.locator('button[onclick="exportCharacterWorkbook()"]').count()>0,true,"export button missing");
    assert.equal(await p.locator('button[onclick="exportJSON()"]').count()>0,true,"JSON button removed");
    assert.equal(await p.locator('button[onclick="exportOfficialCharacterSheet()"]').count()>0,true,"PDF button removed");
    const [download]=await Promise.all([p.waitForEvent("download",{timeout:45000}),p.locator('button[onclick="exportCharacterWorkbook()"]').first().click()]);
    assert(download.suggestedFilename().endsWith(".xlsx"));
    const downloaded=await download.path();const workbook=new ExcelJS.Workbook();await workbook.xlsx.readFile(downloaded);
    assert.deepEqual(workbook.worksheets.map(x=>x.name),sheets,"seven workbook tabs");
    assert.equal(workbook.getWorksheet(sheets[0]).getCell("A5").value,name,"identity not exported");
    const record=workbook.getWorksheet(sheets[5]);
    assert.equal(record.getCell("A9").value,1,"session table must be editable rows");
    const portrait=workbook.getWorksheet(sheets[6]);assert(String(portrait.getCell("A4").value||"").includes(name),"brief character");
    const spells=workbook.getWorksheet(sheets[2]);let text="";
    spells.eachRow(row=>row.eachCell(c=>{text+=" "+(typeof c.value==="string"?c.value:"")}));
    if(ruleset==="2024"){
      assert(text.includes("\u6bd2\u6c23\u5674\u6e67"),"cantrip missing");
      assert(text.includes("\u706b\u7403\u8853"),"prepared spell missing");
    }else{assert(text.includes("\u6cd5\u8853"),"2014 spell sheet header missing");}
    assert(!text.includes("\u6ce1\u5f71\u6cd5\u5e2b"),"sample persona leaked");
    const after=await p.evaluate(()=>({rule:S.ruleset,level:S.level,spells:[...S.cantrips],name:document.querySelector("#fName").value}));
    assert.deepEqual(after,before,"export mutated game state");
    assert.deepEqual(errors,[],"JavaScript errors");
    const horizontal=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert(horizontal<=2,"mobile page horizontal overflow");
    console.log("XLSX_EXPORT_BROWSER_PASS",JSON.stringify({ruleset,width,bytes:fs.statSync(downloaded).size,tabs:workbook.worksheets.length,horizontal}));
    await ctx.close();
   }
  }
 }finally{await browser.close();if(server.listening)await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

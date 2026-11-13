"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),http=require("node:http"),crypto=require("node:crypto");
const {chromium}=require("playwright"),JSZip=require("jszip"),ExcelJS=require("exceljs");
const root=path.resolve(__dirname,".."),template=root+"/assets/templates/dnd5e-clean-original-v485.xlsx";
const srcZipPromise=JSZip.loadAsync(fs.readFileSync(template));
const allowed=new Set(Array.from({length:7},(_,i)=>"xl/worksheets/sheet"+(i+1)+".xml"));
const headings=["\u89d2\u8272\u5361","\u88dd\u5099\u8207\u7269\u54c1","\u6cd5\u8853\u8868","\u6cd5\u8853\u66f8","\u5750\u9a0e","\u5718\u52d9\u7d00\u9304\u5361","\u89d2\u8272\u7c21\u5361","\u66f4\u65b0\u65e5\u8a8c"];
const types={".html":"text/html; charset=utf-8",".js":"application/javascript; charset=utf-8",".json":"application/json",".css":"text/css", ".xlsx":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"};
const server=http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/,"")||"index.html";const file=path.resolve(root,name);
 if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(file,(err,data)=>{if(err)return res.writeHead(404).end();
  res.writeHead(200,{"Content-Type":types[path.extname(file)]||"application/octet-stream","Cache-Control":"no-store"}).end(data);
 });
});
const dec=str=>String(str).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&amp;/g,"&").replace(/&#(?:x([a-f\d]+)|(\d+));/gi,(m,x,d)=>String.fromCodePoint(x?parseInt(x,16):+d));
function valueAt(xml,ref){
 const empty=xml.match(new RegExp('<(?:\\w+:)?c\\b(?=[^>]*\\br="'+ref+'")[^>]*\\/>'));
 if(empty)return undefined;
 const match=xml.match(new RegExp('<(?:\\w+:)?c\\b(?=[^>]*\\br="'+ref+'")[^>]*>([\\s\\S]*?)</(?:\\w+:)?c>'));
 if(!match)return undefined;
 const body=match[1],type=match[0].match(/\bt="([^"]+)"/)?.[1];
 const text=body.match(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/)?.[1];
 const v=body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1];
 return text===undefined?(v===undefined?undefined:type==="b"?v==="1":Number(v)):dec(text);
}
function refStyles(xml){
 const out=new Map();
 for(const m of xml.matchAll(/<(?:\w+:)?c\b([^>]*)>/g)){
  const ref=m[1].match(/\br="([^"]+)"/)?.[1],style=m[1].match(/\bs="([^"]+)"/)?.[1]||"";
  if(ref)out.set(ref,style);
 }
 return out;
}
function mergeRefs(xml){return [...xml.matchAll(/<(?:\w+:)?mergeCell\b[^>]*\bref="([^"]+)"/g)].map(x=>x[1]).sort();}
async function verifyStructure(original,output){
 assert.deepEqual(Object.keys(original.files).sort(),Object.keys(output.files).sort(),"ZIP parts differ: not an exact copy");
 for(const name of Object.keys(original.files)){
  if(original.files[name].dir||allowed.has(name))continue;
  const [one,two]=await Promise.all([original.file(name).async("nodebuffer"),output.file(name).async("nodebuffer")]);
  assert(one.equals(two),"Template asset changed: "+name);
 }
 for(let i=1;i<=7;i++){
  const name="xl/worksheets/sheet"+i+".xml";
  const a=await original.file(name).async("string"),b=await output.file(name).async("string");
  assert.deepEqual(mergeRefs(a),mergeRefs(b),"Merged cells altered on "+name);
  const styles=refStyles(a),newStyles=refStyles(b);
  for(const [ref,style] of styles){assert.equal(newStyles.get(ref),style,"Original cell style changed "+name+"/"+ref);}
  for(const tag of ["<cols","<sheetFormatPr"]){assert.equal(a.includes(tag),b.includes(tag),"Original sheet metadata lost "+name+" "+tag);}
 }
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  const src=await srcZipPromise;
  for(const rule of ["2024","2014"]){
   for(const width of [1440,390]){
    const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
    const p=await ctx.newPage(),errors=[];p.on("pageerror",e=>errors.push(String(e)));
    const addr=process.env.QA_URL||("http://127.0.0.1:"+server.address().port+"/index.html");
    await p.goto(addr,{waitUntil:"networkidle",timeout:45000});
    if(await p.locator("#closeRuleset").isVisible())await p.locator("#closeRuleset").click();
    const expected=await p.evaluate(mode=>{
     S.ruleset=mode;syncRulesetUI();
     S.cls=CLASSES.find(x=>x.n==="\u6cd5\u5e2b");
     S.sp=SPECIES.find(x=>x.n==="\u4eba\u985e");
     S.bg=BACKGROUNDS[0];S.level=5;
     S.classLevels={"\u6cd5\u5e2b":5};S.base={str:10,dex:14,con:12,int:18,wis:13,cha:8};
     S.cantrips=new Set(["\u6bd2\u6c23\u5674\u6e67","\u9178\u6db2\u98db\u6ffa"]);
     S.prepared=new Set(["\u706b\u7403\u8853"]);S.spellbook=new Set(["\u706b\u7403\u8853"]);
     if(mode==="2014"){const c=SPELLS14.find(x=>x.lv===0&&x.cls.includes("W"));S.spellByClass={"\u6cd5\u5e2b":{cantrips:c?[c.n]:[],known:[],book:[],prepared:[]}};}
     document.querySelector("#fName").value="\u6e2c\u8a66\u5192\u96aa\u8005";
     document.querySelector("#fPlayer").value="QA fixture";
     S.gear.gold={pp:0,gp:23,sp:4,cp:1};S.gear.items="\u7761\u888b\u3001\u706b\u628a";S.bio.story="TEST STORY";
     go(7);
     return {score:finalScore("int"),hp:hpTotal(),dc:S.ruleset==="2024"?castInfo()?.ability:"2014",name:document.querySelector("#fName").value};
    },rule);
    const pdf=await p.locator('button[onclick="exportOfficialCharacterSheet()"]').count(),json=await p.locator('button[onclick="exportJSON()"]').count();
    assert(pdf>0&&json>0,"Existing export options changed");
    const [download]=await Promise.all([p.waitForEvent("download",{timeout:50000}),p.locator('button[onclick="exportCharacterWorkbook()"]').first().click()]);
    const outputPath=await download.path(),bytes=fs.readFileSync(outputPath);
    assert(download.suggestedFilename().includes("-\u539f\u7248\u89d2\u8272\u5361.xlsx"));
    const out=await JSZip.loadAsync(bytes);await verifyStructure(src,out);
    const book=new ExcelJS.Workbook();await book.xlsx.load(bytes);
    assert.deepEqual(book.worksheets.map(x=>x.name),headings,"Template tabs not preserved");
    assert.equal(book.getWorksheet(headings[7]).state,"hidden","Original hidden source sheet lost");
    const main=await out.file("xl/worksheets/sheet1.xml").async("string");
    assert.equal(valueAt(main,"C7"),expected.name,"Character name wrong");
    assert.equal(valueAt(main,"O7"),"QA fixture","Player name wrong");
    assert.equal(valueAt(main,"F18"),expected.score,"INT score wrong");
    assert.equal(valueAt(main,"Y27"),expected.hp,"HP must use website calculator");
    assert.equal(valueAt(main,"AJ15"),5,"Level wrong");
    const gear=await out.file("xl/worksheets/sheet2.xml").async("string");
    assert.equal(valueAt(gear,"AI8"),23,"Gold must use live website money");
    const originalGear=await src.file("xl/worksheets/sheet2.xml").async("string");
    assert.equal(valueAt(gear,"C15"),valueAt(originalGear,"C15"),"Original bag label overwritten");
    const spells=await out.file("xl/worksheets/sheet3.xml").async("string");
    if(rule==="2024"){
     assert.equal(valueAt(spells,"D19"),"\u6bd2\u6c23\u5674\u6e67","Spell order wrong");
     assert.equal(valueAt(spells,"D62"),"\u706b\u7403\u8853","Prepared spell wrong");
    }
    if(rule==="2024"){
      const bookXml=await out.file("xl/worksheets/sheet4.xml").async("string");
      assert.equal(valueAt(bookXml,"AT11"),"\u706b\u7403\u8853","Original level-three spellbook cell not populated");
    }
    const journal=await out.file("xl/worksheets/sheet6.xml").async("string");
    assert.equal(valueAt(journal,"B4"),expected.name,"Journal identity wrong");
    assert.equal(valueAt(journal,"K4"),undefined,"Old example external link must be cleared");
    const brief=await out.file("xl/worksheets/sheet7.xml").async("string");
    assert.equal(valueAt(brief,"B2"),expected.name,"Original mini-sheet identity missing");
    assert.deepEqual(errors,[],"Browser errors");
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert(overflow<=2,"Browser overflow");
    console.log("ORIGINAL_TEMPLATE_CLONE_PASS",JSON.stringify({rule,width,bytes:bytes.length,tabs:book.worksheets.length,mergeRetained:true,mediaRetained:true,stylesRetained:true,overflow}));
    await ctx.close();
   }
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

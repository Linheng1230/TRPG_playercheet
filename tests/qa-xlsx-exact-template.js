"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),http=require("node:http"),crypto=require("node:crypto");
const {chromium}=require("playwright"),JSZip=require("../assets/vendor/jszip.min.js");
const root=path.resolve(__dirname,".."),template=root+"/assets/templates/dnd5e-clean-original-v485.xlsx";
const srcZipPromise=JSZip.loadAsync(fs.readFileSync(template));
const allowed=new Set([...Array.from({length:7},(_,i)=>"xl/worksheets/sheet"+(i+1)+".xml"),...Array.from({length:5},(_,i)=>"xl/drawings/vmlDrawing"+(i+1)+".vml"),"xl/worksheets/_rels/sheet4.xml.rels","xl/workbook.xml","xl/styles.xml","xl/drawings/drawing1.xml","xl/drawings/_rels/drawing1.xml.rels","xl/drawings/drawing7.xml","xl/drawings/_rels/drawing7.xml.rels","[Content_Types].xml"]);
const checkboxCounts=[16,37,456,2484,28,0,6,0],checkboxVml=[1,2,3,"Checkbox4",4,null,5,null];
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
 return text===undefined?(v===undefined?undefined:type==="b"?v==="1":type==="str"?dec(v):Number(v)):dec(text);
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
function formulaRefs(xml){
 const out=new Map();
 for(const m of xml.matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)){
  const ref=m[1].match(/\br="([^"]+)"/)?.[1],f=m[2]?.match(/<(?:\w+:)?f(?:\s[^>]*)?(?:\/>|>[\s\S]*?<\/(?:\w+:)?f>)/);
  if(ref&&f)out.set(ref,f[0]);
 }
 return out;
}
async function verifyCheckboxContract(page,original,output){
 const read=(zip,n)=>zip.file(n)?.async("string")||Promise.resolve("");
 const styles=await Promise.all([read(original,"xl/styles.xml"),read(output,"xl/styles.xml")]);
 const sheets=await Promise.all(checkboxCounts.map(async(n,i)=>{
  const path="xl/worksheets/sheet"+(i+1)+".xml",rel="xl/worksheets/_rels/sheet"+(i+1)+".xml.rels",vml=checkboxVml[i]==null?"":"xl/drawings/vmlDrawing"+checkboxVml[i]+".vml";
  return {sheet:i+1,count:n,original:await read(original,path),output:await read(output,path),rel:await read(output,rel),vml,originalVml:vml?await read(original,vml):"",outputVml:vml?await read(output,vml):""};
 }));
 const result=await page.evaluate(({styles,sheets})=>{
  const S="http://schemas.openxmlformats.org/spreadsheetml/2006/main",X="urn:schemas-microsoft-com:office:excel",V="urn:schemas-microsoft-com:vml",R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const p=new DOMParser(),parse=x=>p.parseFromString(x,"application/xml"),all=(d,ns,tag)=>[...d.getElementsByTagNameNS(ns,tag)],one=(d,ns,tag)=>all(d,ns,tag)[0],ok=(v,m)=>{if(!v)throw Error(m);};
  const canon=e=>[e.namespaceURI,e.localName,[...e.attributes].filter(a=>a.namespaceURI!=="http://www.w3.org/2000/xmlns/").map(a=>[a.namespaceURI,a.localName,a.value]).sort(),[...e.childNodes].flatMap(n=>n.nodeType===1?[canon(n)]:n.nodeType===3&&n.textContent.trim()?[n.textContent.trim()]:[])];
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const [oldStyles,newStyles]=styles.map(parse),oldXfs=one(oldStyles,S,"cellXfs").children,newXfs=one(newStyles,S,"cellXfs").children;
  const hide=all(newStyles,S,"numFmt").find(e=>e.getAttribute("formatCode")===";;;");
  ok(hide,"Native checkbox hidden text format missing");
  const seen=new Set(),counts=[];
  for(const x of sheets){
   const a=parse(x.original),b=parse(x.output),src=all(a,S,"c").filter(c=>c.getAttribute("t")==="b"),dst=new Map(all(b,S,"c").map(c=>[c.getAttribute("r"),c]));
   ok(src.length===x.count,"Source checkbox count drift sheet "+x.sheet);
   const vml=x.outputVml?parse(x.outputVml):null,oldVml=x.originalVml?parse(x.originalVml):null;
   const shapes=vml?all(vml,V,"shape"):[],boxes=shapes.filter(s=>one(s,X,"ClientData")?.getAttribute("ObjectType")==="Checkbox");
   ok(boxes.length===src.length,"Native checkbox count mismatch "+x.sheet);
   if(src.length){
    const legacy=one(b,S,"legacyDrawing"),r=legacy?.getAttributeNS(R,"id");
    const rel=[...parse(x.rel).documentElement.children].find(e=>e.getAttribute("Id")===r);
    ok(rel&&rel.getAttribute("Target")==="../"+x.vml.slice(3)&&rel.getAttribute("Type")===R+"/vmlDrawing","Native checkbox VML relationship lost "+x.sheet);
   }
   if(oldVml){
    const oldNotes=all(oldVml,V,"shape").filter(s=>one(s,X,"ClientData")?.getAttribute("ObjectType")==="Note");
    const newNotes=shapes.filter(s=>one(s,X,"ClientData")?.getAttribute("ObjectType")==="Note");
    ok(eq(oldNotes.map(canon),newNotes.map(canon)),"Original comment geometry/data changed "+x.sheet);
   }
   const byName=new Map(boxes.map(s=>[s.getAttribute("id"),s]));
   for(const c of src){
    const ref=c.getAttribute("r"),d=dst.get(ref),shape=byName.get("Checkbox_"+x.sheet+"_"+ref);
    ok(d&&shape&&d.getAttribute("t")==="b","Lost checkbox or boolean "+x.sheet+"/"+ref);
    const o=oldXfs[+(c.getAttribute("s")||0)],n=newXfs[+(d.getAttribute("s")||0)],clone=n.cloneNode(true);
    ok(n.getAttribute("numFmtId")===hide.getAttribute("numFmtId"),"TRUE/FALSE text not hidden "+ref);
    for(const k of ["numFmtId","applyNumberFormat"])if(o.hasAttribute(k))clone.setAttribute(k,o.getAttribute(k));else clone.removeAttribute(k);
    ok(eq(canon(o),canon(clone)),"Checkbox altered visual cell style "+ref);
    const client=one(shape,X,"ClientData"),link=one(client,X,"FmlaLink")?.textContent,value=one(d,S,"v")?.textContent;
    const expected=x.sheet===7?"'角色卡'!$N$"+(+ref.slice(1)+9):"$"+ref.match(/^[A-Z]+/)[0]+"$"+ref.match(/\d+$/)[0];
    ok(link===expected,"Wrong checkbox formula link "+ref);
    ok(["0","1"].includes(value)&&!!one(client,X,"Checked")===(value==="1"),"Wrong checkbox initial state "+ref);
    if(x.sheet===7)ok(one(d,S,"f")?.textContent===one(c,S,"f")?.textContent,"Mini sheet checkbox flattened formula "+ref);
    const anchor=one(client,X,"Anchor")?.textContent.split(",").map(Number);
    ok(anchor?.length===8&&anchor.every(Number.isFinite)&&(anchor[4]>anchor[0]||anchor[5]>anchor[1])&&(anchor[6]>anchor[2]||anchor[7]>anchor[3]),"Zero/invalid checkbox anchor "+ref);
    const sid=shape.getAttributeNS("urn:schemas-microsoft-com:office:office","spid");
    ok(sid&&!seen.has(sid),"Duplicate shape ID "+sid);seen.add(sid);
   }
   const cbRefs=new Set(src.map(c=>c.getAttribute("r")));
   const colNo=ref=>[...ref.match(/^[A-Z]+/)[0]].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0);
   for(const c of all(a,S,"c"))if(!cbRefs.has(c.getAttribute("r"))){
    const ref=c.getAttribute("r"),d=dst.get(ref);
    if(d?.getAttribute("s")===c.getAttribute("s"))continue;
    const col=colNo(ref),row=+ref.match(/\d+$/)[0],offset=(col-3)%21;
    const populated=!!one(d,S,"is")?.textContent?.trim();
    const allowed=populated&&(x.sheet===3?row>=19&&[4,5,6,8,10,12,18].includes(col):x.sheet===4&&row>=11&&[1,2,3,5,7,9,15].includes(offset));
    ok(allowed,"Unrelated original style changed "+x.sheet+"/"+ref);
    const o=oldXfs[+(c.getAttribute("s")||0)],n=newXfs[+(d.getAttribute("s")||0)],clone=n.cloneNode(true),alignment=one(n,S,"alignment");
    ok(alignment.getAttribute("wrapText")==="1"&&alignment.getAttribute("shrinkToFit")==="0","Text not readable "+ref);
    const font=one(newStyles,S,"fonts").children[+n.getAttribute("fontId")];
    ok(+one(font,S,"sz").getAttribute("val")>=10,"Text font too small "+ref);
    for(const k of ["fontId","applyFont","applyAlignment"])if(o.hasAttribute(k))clone.setAttribute(k,o.getAttribute(k));else clone.removeAttribute(k);
    const oldAlignment=one(o,S,"alignment"),newAlignment=one(clone,S,"alignment");
    if(oldAlignment)clone.replaceChild(oldAlignment.cloneNode(true),newAlignment);else newAlignment.remove();
    ok(eq(canon(o),canon(clone)),"Unrelated style properties changed "+ref);
    const oldRow=all(a,S,"row").find(e=>+e.getAttribute("r")===row),newRow=all(b,S,"row").find(e=>+e.getAttribute("r")===row);
    ok(+newRow.getAttribute("ht")>=Math.max(15,+oldRow.getAttribute("ht")||0)&&newRow.getAttribute("customHeight")==="1","Row not expanded "+ref);
   }
   counts.push(src.length);
  }
  return {counts,total:counts.reduce((a,b)=>a+b,0)};
 },{styles,sheets});
 assert.deepEqual(result.counts,checkboxCounts);
 assert.equal(result.total,3027);
}
async function verifyStructure(original,output,portrait,page){
 const entries=z=>Object.keys(z.files).filter(n=>!z.files[n].dir).sort();
 assert.deepEqual(entries(output),[...entries(original),"xl/drawings/vmlDrawingCheckbox4.vml",...(portrait?["xl/media/character-portrait.png"]:[])].sort(),"Unexpected ZIP parts");
 let formulaCount=0;
 for(const name of Object.keys(original.files)){
  if(original.files[name].dir||allowed.has(name))continue;
  const [one,two]=await Promise.all([original.file(name).async("nodebuffer"),output.file(name).async("nodebuffer")]);
  assert(one.equals(two),"Template asset changed: "+name);
 }
 for(let i=1;i<=7;i++){
  const name="xl/worksheets/sheet"+i+".xml";
  const a=await original.file(name).async("string"),b=await output.file(name).async("string");
  assert.deepEqual(mergeRefs(a),mergeRefs(b),"Merged cells altered on "+name);
  const af=formulaRefs(a),bf=formulaRefs(b);formulaCount+=af.size;
  for(const [ref] of af)assert(bf.has(ref),"Original formula lost "+name+"/"+ref);
  // Native checkbox styles are checked against an exact clone in verifyCheckboxContract.
  for(const tag of ["<cols","<sheetFormatPr"]){assert.equal(a.includes(tag),b.includes(tag),"Original sheet metadata lost "+name+" "+tag);}
 }
 assert.equal(formulaCount,730,"Unexpected source formula baseline");
 await verifyCheckboxContract(page,original,output);
 const wb=await output.file("xl/workbook.xml").async("string");
 const tabs=[...wb.matchAll(/<(?:\w+:)?sheet\b[^>]*\bname="([^"]+)"/g)].map(x=>dec(x[1]));
 assert.deepEqual(tabs,headings);
 assert(/<(?:\w+:)?sheet\b[^>]*\bstate="hidden"/.test(wb));
 assert(/fullCalcOnLoad="1"/.test(wb));
 if(portrait){
  assert((await output.file("xl/media/character-portrait.png").async("nodebuffer")).equals(Buffer.from(portrait.split(",")[1],"base64")));
  for(const i of [1,7]){
   const draw=await output.file("xl/drawings/drawing"+i+".xml").async("string"),rels=await output.file("xl/drawings/_rels/drawing"+i+".xml.rels").async("string");
   assert(draw.includes("rIdCharacterPortrait")&&rels.includes("../media/character-portrait.png"),"Portrait missing in sheet "+i);
  }
 }else{
  for(const name of ["xl/drawings/drawing1.xml","xl/drawings/_rels/drawing1.xml.rels","xl/drawings/drawing7.xml","xl/drawings/_rels/drawing7.xml.rels","[Content_Types].xml"])assert((await original.file(name).async("nodebuffer")).equals(await output.file(name).async("nodebuffer")),name+" changed without portrait");
 }
}
(async()=>{
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const browser=await chromium.launch({...(process.platform==="win32"?{channel:"chrome"}:{}),headless:true});
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
     S.prepared=new Set(["\u706b\u7403\u8853"]);S.spellbook=new Set(["\u706b\u7403\u8853","魔法飛彈"]);
     let legacy=null;
     if(mode==="2014"){
      const ci=castingProfiles2014().find(x=>x.kind==="book"),list=SPELLS14.filter(x=>x.cls.includes(ci.code));
      const c=list.find(x=>x.lv===0),one=list.find(x=>x.lv===1),two=list.filter(x=>x.lv===1&&x.n!==one.n)[0];
      if(!ci||!c||!one||!two)throw Error("2014 spellbook fixture missing");
      S.spellByClass[ci.name]={cantrips:[c.n],known:[],book:[one.n,two.n],prepared:[one.n]};
      legacy={cantrip:c.n,prepared:one.n,unprepared:two.n};
     }
     document.querySelector("#fName").value="\u6e2c\u8a66\u5192\u96aa\u8005";
     document.querySelector("#fPlayer").value="QA fixture";
     S.gear.gold={pp:0,gp:23,sp:4,cp:1};S.gear.items="\u7761\u888b\u3001\u706b\u628a";S.bio.story="TEST STORY";
     if(mode==="2024"){const canvas=document.createElement("canvas");canvas.width=64;canvas.height=96;const c=canvas.getContext("2d");c.fillStyle="#c9a575";c.fillRect(0,0,64,96);S.portrait=canvas.toDataURL("image/png");}
     go(7);
     return {legacy,portrait:S.portrait||"",score:finalScore("int"),hp:hpTotal(),dc:S.ruleset==="2024"?castInfo()?.ability:"2014",name:document.querySelector("#fName").value};
    },rule);
    const pdf=await p.locator('button[onclick="exportOfficialCharacterSheet()"]').count(),json=await p.locator('button[onclick="exportJSON()"]').count();
    assert(pdf>0&&json>0,"Existing export options changed");
    const summary=p.locator("details.fs-export-options > summary:visible");if(await summary.count()&&!await p.locator('button[onclick="exportCharacterWorkbook()"]:visible').count())await summary.click();
    const [download]=await Promise.all([p.waitForEvent("download",{timeout:50000}),p.locator('button[onclick="exportCharacterWorkbook()"]:visible').first().click()]);
    const outputPath=await download.path(),bytes=fs.readFileSync(outputPath);
    assert(download.suggestedFilename().includes("-\u539f\u7248\u89d2\u8272\u5361.xlsx"));
    const out=await JSZip.loadAsync(bytes);await verifyStructure(src,out,expected.portrait,p);
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
    for(const r of [...Array(121)].map((_,i)=>19+i)){
     const name=valueAt(spells,"D"+r),checked=valueAt(spells,"C"+r);
     if(typeof checked==="boolean"&&typeof name==="string"&&name.trim())assert.equal(checked,true,"Active spell not checked "+name);
    }
    if(rule==="2024"){
     assert.equal(valueAt(spells,"D19"),"\u6bd2\u6c23\u5674\u6e67","Spell order wrong");
     assert.equal(valueAt(spells,"D62"),"\u706b\u7403\u8853","Prepared spell wrong");
    }
    if(rule==="2014"){
      assert.equal(valueAt(spells,"D19"),expected.legacy.cantrip);
      assert.equal(valueAt(spells,"C19"),true);
      assert.equal(valueAt(spells,"D34"),expected.legacy.prepared);
      assert.equal(valueAt(spells,"C34"),true);
      const bookXml=await out.file("xl/worksheets/sheet4.xml").async("string");
      assert.equal(valueAt(bookXml,"D11"),expected.legacy.prepared);
      assert.equal(valueAt(bookXml,"C11"),true);
      assert.equal(valueAt(bookXml,"D12"),expected.legacy.unprepared);
      assert.equal(valueAt(bookXml,"C12"),false);
      assert(valueAt(bookXml,"J12")?.length>10,"2014 unprepared spell text missing");
    }
    if(rule==="2024"){
      const bookXml=await out.file("xl/worksheets/sheet4.xml").async("string");
      assert.equal(valueAt(bookXml,"AT11"),"\u706b\u7403\u8853","Original level-three spellbook cell not populated");
      assert.equal(valueAt(bookXml,"D11"),"魔法飛彈");
      assert.equal(valueAt(bookXml,"C11"),false,"Unprepared spellbook entry incorrectly checked");
      assert(valueAt(bookXml,"J11")?.length>10,"Unprepared spellbook text missing");
    }
    const journal=await out.file("xl/worksheets/sheet6.xml").async("string");
    assert.equal(valueAt(journal,"B4"),expected.name,"Journal identity wrong");
    assert.equal(valueAt(journal,"K4"),undefined,"Old example external link must be cleared");
    const brief=await out.file("xl/worksheets/sheet7.xml").async("string");
    assert.equal(valueAt(brief,"B2"),expected.name,"Original mini-sheet identity missing");
    assert.deepEqual(errors,[],"Browser errors");
    const overflow=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert(overflow<=2,"Browser overflow");
    console.log("ORIGINAL_TEMPLATE_CLONE_PASS",JSON.stringify({rule,width,bytes:bytes.length,tabs:headings.length,mergeRetained:true,mediaRetained:true,stylesRetained:true,checkboxes:3027,portraitSheets:expected.portrait?2:0,activeSpellsChecked:true,spellRowsFit:true,overflow}));
    if(rule==="2024"&&width===1440){
     const grants=await p.evaluate(()=>{
      S.cls=CLASSES.find(x=>x.n==="遊俠");S.level=3;S.classLevels={遊俠:3};
      S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獸王");
      S.style=Object.values(CLASS_STYLE_EXTRAS_2024).flat().find(x=>x.code==="D").n;
      S.styleCantrips2024=["神導術","橡棍術"].map(normalizeSpellName2024);
      S.cantrips=new Set();S.prepared=new Set([normalizeSpellName2024("獵人印記")]);S.spellbook=new Set();
      go(7);
      return grantedSpells2024().map(x=>({name:x.n,src:x.src,mode:x.mode}));
     });
     assert(grants.filter(x=>x.src.includes("戰鬥風格")).length===2,"Druidic Warrior grant fixture missing");
     assert(grants.some(x=>x.name==="獵人印記"),"Ranger fixed grant fixture missing");
     const details=p.locator("details.fs-export-options > summary:visible");
     if(await details.count()&&!await p.locator('button[onclick="exportCharacterWorkbook()"]:visible').count())await details.click();
     const [grantFile]=await Promise.all([p.waitForEvent("download",{timeout:50000}),p.locator('button[onclick="exportCharacterWorkbook()"]:visible').first().click()]);
     const z=await JSZip.loadAsync(fs.readFileSync(await grantFile.path())),xml=await z.file("xl/worksheets/sheet3.xml").async("string");
     const actual=new Map();
     for(let r=19;r<=139;r++){
      const n=valueAt(xml,"D"+r),checked=valueAt(xml,"C"+r);
      if(typeof n==="string"&&n&&typeof checked==="boolean"){
       assert(!actual.has(n),"Duplicate active spell "+n);
       assert.equal(checked,true,"Grant incorrectly unchecked "+n);
       actual.set(n,valueAt(xml,"J"+r));
      }
     }
     for(const g of grants){assert(actual.has(g.name),"Granted spell missing "+g.name);assert(actual.get(g.name).includes(g.src),"Grant source missing "+g.name);}
     console.log("GRANTED_SPELL_EXPORT_PASS",JSON.stringify({grants:grants.length,unique:actual.size}));
    }
    await ctx.close();
   }
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

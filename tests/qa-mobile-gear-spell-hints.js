"use strict";
const assert=require("node:assert/strict"), fs=require("node:fs"), path=require("node:path"), http=require("node:http");
const {spawn}=require("node:child_process"),{chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json; charset=utf-8",".css":"text/css; charset=utf-8"};
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/,"")||"index.html";
 const file=path.resolve(root,rel);
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);res.end();return;}
  res.writeHead(200,{"Content-Type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
  fs.createReadStream(file).pipe(res);
 });
});
async function main(){
 const url=await new Promise(resolve=>server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html")));
 const browser=await chromium.launch({channel:"chrome",headless:true});
 try{
  const reports=[];
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
   const errors=[];page.on("pageerror",error=>errors.push(String(error.message)));
   await page.goto(url,{waitUntil:"networkidle"});
   const result=await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={"德魯伊":4};
    S.sp=SPECIES_2024.find(s=>s.n==="人類");S.bg=BACKGROUNDS_2024[0];
    S.base={str:12,dex:13,con:13,int:13,wis:17,cha:11};S.primalOrder="魔法師";
    S.bonusMode="21";S.bonus={b2:"wis",b1:"con",c1:"",c2:"",c3:""};
    S.gear={armor:"",unarmored:"auto",shield:false,weapons:["木杖"],miscAC:0,miscLabel:"",items:"測試裝備",gold:{pp:0,gp:60,sp:2,cp:7},purchases:{}};
    const root=document.createElement("section");
    root.id="qaFinalSheet";root.style.cssText="width:calc(100% - 48px);max-width:680px;margin:20px auto;box-sizing:border-box";
    document.body.append(root);root.innerHTML=gearPanel();
    const header=root.querySelector(".wpn-head"),weapon=[...root.querySelectorAll(".wpn-row")].find(e=>!e.classList.contains("wpn-head"));
    if(!header||!weapon)throw Error("missing equipment rows");
    const at=e=>e.getBoundingClientRect().x;
    const columns={headerAtk:at(header.querySelector(".wpn-attack")),rowAtk:at(weapon.querySelector(".wpn-attack")),headerDmg:at(header.querySelector(".wpn-damage")),rowDmg:at(weapon.querySelector(".wpn-damage"))};
    const coins=[...root.querySelectorAll(".gold-field")].map(e=>({text:e.querySelector("span")?.textContent,hasInput:!!e.querySelector("input"),width:e.getBoundingClientRect().width}));
    const ids=["moonbeam","ice-knife","cure-wounds"];
    const spells=ids.map(id=>SPELLS.find(s=>s.identifier===id));
    if(spells.some(s=>!s))throw Error("missing 2024 canonical spell");
    const panel=document.createElement("section");panel.innerHTML=spellSheetBlock("法術速覽測試",spells.map(sp=>({n:sp.n,lv:sp.lv,d:sp.d})));root.append(panel);
    const cards=[...panel.querySelectorAll(".ss-entry")];
    const hints=cards.map((card,i)=>{
      const node=card.querySelector(".ss-quick-damage .ss-v")||card.querySelector(".ss-quick-heal .ss-v");
      const field=node?.closest(".ss-entry-field");
      const visible=node&&field&&node.getBoundingClientRect().right<=field.getBoundingClientRect().right+1;
      const lines=node?[...node.getClientRects()].length:null;
      return {id:ids[i],damage:card.querySelector(".ss-quick-damage .ss-v")?.textContent||"",heal:card.querySelector(".ss-quick-heal .ss-v")?.textContent||"",saves:card.querySelector(".ss-quick-save .ss-v")?.textContent||"",text:node?.textContent||"",visible:!!visible,lines,source:(globalThis.SPELLS_2024_FULL_RULES?.[ids[i]]||"").length,fullAccess:!!card.querySelector(".sref[data-sref]")};
    });
    S.ruleset="2014";syncRulesetUI();
    const old=SPELLS14.find(x=>x.lv>0);const legacy=spellSheetBlock("2014",[{n:old.n,lv:old.lv,d:old.d}]);
    return {documentWidth:document.documentElement.scrollWidth,width:innerWidth,weapon:weapon.textContent,columns,coins,hints,legacyContainsNewHeal:legacy.includes("ss-quick-heal")};
   });
   assert(Math.abs(result.columns.headerAtk-result.columns.rowAtk)<2,"attack header drift");
   assert(Math.abs(result.columns.headerDmg-result.columns.rowDmg)<2,"damage header drift");
   assert(/1d6/.test(result.weapon)&&/1d8/.test(result.weapon),"staff dice lost");
   assert.equal(result.coins.length,4);
   assert(result.coins.every(x=>x.hasInput&&x.width>0),"currency field detached");
   assert(result.documentWidth<=width+1,"document overflow");
   const hints=Object.fromEntries(result.hints.map(x=>[x.id,x]));
   assert(/2d10/.test(hints.moonbeam.damage)&&/5呎/.test(hints.moonbeam.damage)&&/40呎/.test(hints.moonbeam.damage),"Moonbeam hint incorrect");
   assert(/1d10/.test(hints["ice-knife"].damage)&&/2d6/.test(hints["ice-knife"].damage)&&/5呎/.test(hints["ice-knife"].damage),"Ice Knife hint incorrect");
   assert(/2d8/.test(hints["cure-wounds"].heal)&&/施法屬性調整值/.test(hints["cure-wounds"].heal),"Cure Wounds hint incorrect");
   assert(result.hints.every(x=>x.visible&&x.lines===1),"hint did not fit a single visible line: "+JSON.stringify({width,hints:result.hints}));
   assert(result.hints.every(x=>x.fullAccess&&x.source>40),"canonical popup missing");
   assert(!result.legacyContainsNewHeal,"2014 changed");
   assert.deepEqual(errors,[],"runtime script exception");
   fs.mkdirSync(path.join(root,"tmp"),{recursive:true});
   await page.screenshot({path:path.join(root,"tmp","qa-mobile-sheet-"+width+".png"),fullPage:true});
   reports.push({width,weapon:result.weapon.replace(/\s+/g," ").slice(0,120),hints:result.hints.map(({id,text,visible})=>({id,text,visible})),coins:result.coins.map(x=>x.text),noOverflow:true});
   await page.close();
  }
  const additional={};
  for(const test of ["qa-full-character-matrix.js","qa-5rtools-weapons.js"]){
   additional[test]=await new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[path.join(root,"tests",test)],{cwd:root,env:{...process.env,QA_URL:url},windowsHide:true});
    let out="",err="";child.stdout.on("data",d=>out+=String(d));child.stderr.on("data",d=>err+=String(d));
    child.on("error",reject);child.on("close",code=>code===0?resolve({pass:true,output:out.slice(-450)}):reject(new Error(test+" failed: "+err.slice(-1600)+" "+out.slice(-1200))));
   });
  }
  console.log(JSON.stringify({pass:true,additional,reports},null,2));
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e.stack||e);server.close();process.exitCode=1;});

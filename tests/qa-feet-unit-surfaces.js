"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const legacy="dnd5r-繁體中文角色建立器.html";
const files=["index.html",legacy];
for(const name of files){
 const content=fs.readFileSync(path.join(root,name),"utf8");
 assert.equal((content.match(/spd\?spd\.total\+"呎"/g)||[]).length,2,name+" final + summary must use 呎");
 assert.equal((content.match(/速度 \$\{s\.speed\} 呎/g)||[]).length,1,name+" species buttons must use 呎");
 assert(!/spd\?spd\.total\+"尺"/.test(content),name+" must not use 尺 in velocity widgets");
 assert(!/速度 \$\{s\.speed\} 尺/.test(content),name+" must not use 尺 in species widget");
 assert(!/\d+\s*尺/.test(content),name+" old numeric literal feet");
 assert(content.includes("尺寸"),"dimensional size must remain natural Chinese");
}
(async()=>{
 const b=await chromium.launch({channel:"chrome",headless:true});
 let count=0;
 try{
  const host=process.env.QA_URL||"http://127.0.0.1:19988/index.html";
  const base=host.slice(0,host.lastIndexOf("/")+1);
  for(const filename of files){
   const page=await b.newPage({viewport:{width:390,height:844}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+encodeURIComponent(filename),{waitUntil:"domcontentloaded"});
   for(const ruleset of ["2024","2014"]){
    const result=await page.evaluate(ruleset=>{
      S.ruleset=ruleset;
      syncRulesetUI();
      S.sp=SPECIES.find(x=>x.speed===30)||SPECIES[0];
      S.bg=BACKGROUNDS[0];
      S.cls=CLASSES.find(x=>x.n==="德魯伊")||CLASSES[0];
      S.level=4;S.classLevels={[S.cls.n]:4};S.sub=null;
      S.spChoices={};S.base={str:12,dex:14,con:14,int:12,wis:17,cha:10};
      document.getElementById("fName").value="速度單位 QA";
      renderOrigin();renderFinal();update();
      const previews=[...document.querySelectorAll("#spGrid .pick-card .tag")].map(x=>x.textContent);
      const speed=speedInfo()?.total;
      const final=document.querySelector("#finalSheet .fs-statrow .stat-box:nth-child(4) .sv")?.textContent||"";
      const summary=document.querySelector("#shSpeed")?.textContent||"";
      const breakdown=speedInfo()?.rows||[];
      const data=serialize();
      return {previews,speed,final,summary,breakdown,roundTripSpeed:S.sp.speed,
        saveSpecies:data.sp,allSp:SPECIES.length,
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    },ruleset);
    assert(result.previews.length>=8,filename+" "+ruleset+" preview count");
    assert(result.previews.every(x=>/速度 \d+ 呎/.test(x)&&!/速度 \d+ 尺/.test(x)),filename+" "+ruleset+" preview old feet: "+result.previews.join(","));
    assert.equal(result.final,result.speed+"呎",filename+" "+ruleset+" final");
    assert.equal(result.summary,result.speed+"呎",filename+" "+ruleset+" summary");
    assert.equal(result.roundTripSpeed,result.speed,filename+" "+ruleset+" underlying speed unchanged");
    assert(!result.overflow,filename+" "+ruleset+" mobile horizontal overflow");
    count+=6;
   }
   assert.deepEqual(errors,[],filename+" runtime errors");
   count++;
   await page.close();
  }
  console.log("PASS displayed feet unit",count,"checks; index and legacy page, 2014 and 2024, preview/final/summary/mobile/serialize");
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

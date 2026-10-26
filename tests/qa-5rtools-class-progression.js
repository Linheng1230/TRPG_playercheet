"use strict";
const fs=require("fs");
const path=require("path");
const {chromium}=require("playwright");
const ROOT=process.env.FIVERTOOLS_ROOT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024";
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const defs=[
 ["barbarian","Barbarian","野蠻人"],["bard","Bard","吟遊詩人"],["cleric","Cleric","牧師"],["druid","Druid","德魯伊"],
 ["fighter","Fighter","戰士"],["monk","Monk","武僧"],["paladin","Paladin","聖武士"],["ranger","Ranger","遊俠"],
 ["rogue","Rogue","遊蕩者"],["sorcerer","Sorcerer","術士"],["warlock","Warlock","邪術師"],["wizard","Wizard","法師"]
];
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
const uniq=a=>[...new Set(a)].sort((x,y)=>x-y);
const norm=a=>[...a].sort();
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage();const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(URL,{waitUntil:"networkidle"});
  const site=await page.evaluate(()=>({
    classes:Object.fromEntries(CLASSES.map(c=>[c.n,{hd:c.hd,saves:c.saves,skc:c.skc,sk:c.sk}])),
    prog:PROG_2024
  }));
  assert(!errors.length,"page errors: "+errors.join(" | "));
  const report={};
  for(const [file,eng,siteName] of defs){
    const d=JSON.parse(fs.readFileSync(path.join(ROOT,`data__class__class-${file}.json`),"utf8").replace(/^\uFEFF/,""));
    const c=d.class.find(x=>x.source==="PHB2024"&&x.ENG_name===eng)||d.class[0];
    const sc=site.classes[siteName],p=site.prog[siteName];
    assert(sc&&p,`site class missing: ${siteName}`);
    assert(c.hd?.faces===sc.hd,`${eng} hit die mismatch: source d${c.hd?.faces}, site d${sc.hd}`);
    assert(JSON.stringify(norm(c.proficiency||[]))===JSON.stringify(norm(sc.saves||[])),`${eng} save proficiency mismatch`);
    const skillChoose=(c.startingProficiencies?.skills||[]).find(x=>x.choose)?.choose?.count;
    if(skillChoose!=null)assert(skillChoose===sc.skc,`${eng} skill choice count mismatch: source ${skillChoose}, site ${sc.skc}`);

    const refs=(c.classFeatures||[]).map(x=>typeof x==="string"?x:x.classFeature).filter(Boolean);
    const cf=refs.map(ref=>{
      const parts=String(ref).split("|"),name=parts[0],level=Number(parts[parts.length-1]);
      return (d.classFeature||[]).find(x=>x.source==="PHB2024"&&x.classSource==="PHB2024"&&x.name===name&&x.level===level);
    }).filter(Boolean);
    assert(cf.length===refs.length,`${eng} referenced classFeature resolution failed: refs=${refs.length} resolved=${cf.length}`);
    const asi=uniq(cf.filter(x=>String(x.ENG_name||"").trim()==="Ability Score Improvement").map(x=>x.level));
    assert(JSON.stringify(asi)===JSON.stringify([...(p.asi||[])].sort((a,b)=>a-b)),`${eng} ASI levels mismatch source=${asi} site=${p.asi}`);
    const excluded=new Set([eng,"Ability Score Improvement",eng+" Subclass","Subclass Feature","Epic Boon","Legendary Boon"]);
    const coreLevels=uniq(cf.filter(x=>!excluded.has(String(x.ENG_name||"").trim())).map(x=>x.level));
    const siteLevels=uniq(Object.keys(p.f||{}).map(Number));
    const missingCore=coreLevels.filter(x=>!siteLevels.includes(x));
    assert(!missingCore.length,`${eng} core feature levels missing in site: ${missingCore}; source=${coreLevels}; site=${siteLevels}`);

    const srcSubs=(c.subclasses||[]).filter(x=>x.source==="PHB2024");
    assert(srcSubs.length===p.subs.length,`${eng} subclass count mismatch source=${srcSubs.length} site=${p.subs.length}`);
    const srcSubSigs=srcSubs.map(src=>uniq((src.subclassFeatures||[]).map(ref=>Number(String(ref).split("|").pop())).filter(Number.isFinite)).join(",")).sort();
    const siteSubSigs=p.subs.map(dst=>uniq(Object.keys(dst.f||{}).map(Number)).join(",")).sort();
    assert(JSON.stringify(srcSubSigs)===JSON.stringify(siteSubSigs),`${eng} subclass level-pattern mismatch source=${JSON.stringify(srcSubSigs)} site=${JSON.stringify(siteSubSigs)}`);
    const subChecks={source:srcSubs.map(src=>({name:src.ENG_name,levels:uniq((src.subclassFeatures||[]).map(ref=>Number(String(ref).split("|").pop())).filter(Number.isFinite))})),site:p.subs.map(dst=>({name:dst.n,levels:uniq(Object.keys(dst.f||{}).map(Number))}))};
    report[eng]={site:siteName,hd:sc.hd,saves:sc.saves,skillChoices:sc.skc,asi,coreLevels,siteFeatureLevels:siteLevels,subclasses:subChecks};
  }
  console.log(JSON.stringify({classes:Object.keys(report).length,report},null,2));
 } finally {if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

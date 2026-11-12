const {chromium}=require("playwright");
(async()=>{
 const b=await chromium.launch({headless:true,channel:"chrome"});
 const page=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
 await page.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html"),{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const out=await page.evaluate(()=>{
  const rows=[];
  for(const [cls,p] of Object.entries(PROG_2024)){
   for(const [lv,v] of Object.entries(p.f||{}))for(const raw of String(v).split("、")){
    const key=raw.split("(")[0].trim();
    const full=window.ZIZI_5R_FULL_FEATURE_RULES?.[`${cls}||${key}|${+lv}`];
    const fb=CLASSDESC_2024[cls]?.[key]||ALLDESC[key]||"";
    rows.push({cls,sub:"",lv:+lv,key,has:!!full,fbLen:fb.length});
   }
   for(const sub of p.subs||[])for(const [lv,v] of Object.entries(sub.f||{}))for(const raw of String(v).split("、")){
    const key=raw.split("(")[0].trim();
    const full=window.ZIZI_5R_FULL_FEATURE_RULES?.[`${cls}|${sub.n}|${key}|${+lv}`]||window.ZIZI_5R_FULL_FEATURE_RULES?.[`${cls}||${key}|${+lv}`];
    const fb=SUBD[key]||CLASSDESC_2024[cls]?.[key]||ALLDESC[key]||"";
    rows.push({cls,sub:sub.n,lv:+lv,key,has:!!full,fbLen:fb.length});
   }
  }
  const actualFallback=rows.filter(x=>!x.has&&x.fbLen>0);
  const milestones=rows.filter(x=>!x.has&&x.fbLen===0);
  const species=[];
  for(const sp of SPECIES_2024)for(const t of sp.traits){
    const m=String(t).match(/^([^:：]+)[:：](.*)$/),name=m?m[1].trim():String(t).trim();
    species.push({sp:sp.n,name,has:!!window.ZIZI_5R_SPECIES_RULES?.[`${sp.n}|${name}`]});
  }
  const get=(cls,sub,key,lv)=>window.ZIZI_5R_FULL_FEATURE_RULES?.[`${cls}|${sub}|${key}|${lv}`]||"";
  const stars=PROG_2024["德魯伊"].subs.find(x=>x.n==="星辰結社");
  const hunter=PROG_2024["遊俠"].subs.find(x=>x.n==="獵人");
  const fey=SUB_SPELLS?.["精類浪遊者"]||{};
  const wild=get("術士","狂野魔法","狂野魔法湧動",3);
  const beast=get("遊俠","獸王","原初夥伴",3);
  return {
    total:rows.length,actualFallback,milestones,
    fullCount:Object.keys(window.ZIZI_5R_FULL_FEATURE_RULES||{}).length,
    speciesMissing:species.filter(x=>!x.has),
    starsL3:stars?.f?.[3]||"",hunterL3:hunter?.f?.[3]||"",
    starsSpellMap:Object.prototype.hasOwnProperty.call(SUB_SPELLS||{},"星辰結社"),
    fey9:fey?.[9]||[],
    fey9Eng:(fey?.[9]||[]).map(n=>SPELLS.find(sp=>sp.n===n)?.eng||""),
    fighterExtra:[5,11,20].map(lv=>get("戰士","",lv===5?"額外攻擊":lv===11?"額外攻擊":"額外攻擊",lv)),
    bardExpertise:[2,9].map(lv=>get("吟遊詩人","","專精",lv)),
    wildHasEnd:/97[-–—]?100|97\s*[-~至]\s*100/.test(wild),
    wildLen:wild.length,
    beastLen:beast.length,
    beastHasBoth:/原初|野獸/.test(beast)&&beast.length>700
  };
 });
 await b.close();
 const pass=!errors.length&&
  out.actualFallback.length===0&&out.speciesMissing.length===0&&out.fullCount>=380&&
  !out.starsL3.includes("結社法術")&&!out.hunterL3.includes("流派法術")&&!out.starsSpellMap&&
  out.fey9Eng.includes("Summon Fey")&&!out.fey9Eng.includes("Dispel Magic")&&
  out.fighterExtra.every(Boolean)&&out.bardExpertise.every(Boolean)&&
  out.wildHasEnd&&out.wildLen>1000&&out.beastHasBoth;
 console.log(JSON.stringify({errors,out,pass},null,2));process.exit(pass?0:1);
})().catch(e=>{console.error(e);process.exit(2)});

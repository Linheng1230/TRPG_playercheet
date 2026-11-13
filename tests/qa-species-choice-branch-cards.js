"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const path=require("node:path"),{pathToFileURL}=require("node:url");
const url=process.env.QA_URL||pathToFileURL(path.resolve(__dirname,"../index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(url+"?qa-species-choices=1",{waitUntil:"domcontentloaded"});
  const result=await page.evaluate(()=>{
   const problems=[],cases=[];
   const check=(ok,label,detail="")=>{cases.push(label);if(!ok)problems.push({label,detail:String(detail).slice(0,350)})};
   S.ruleset="2024";syncRulesetUI();
   S.cls=CLASSES.find(x=>x.n==="德魯伊");S.level=4;S.classLevels={"德魯伊":4};
   S.bg=BACKGROUNDS_2024[0];
   S.base={str:12,dex:14,con:13,int:12,wis:17,cha:10};
   document.getElementById("fName").value="血系分支測試角色";
   const variants=[
     ["精靈","精靈血統"],
     ["侏儒","侏儒血統"],
     ["提夫林","異界血統"],
     ["歌利亞","巨人血統"],
     ["龍裔","龍族血統"]
   ];
   for(const [species,feature] of variants){
    S.sp=SPECIES_2024.find(x=>x.n===species);
    const config=S.sp.ch.find(x=>x.t==="opt"),opts=SP_OPTS[config.opts];
    check(!!config&&!!opts,species+" options recognized");
    S.spChoices={};
    const unset=speciesChoiceRule5R(species,feature);
    check(!!unset&&!unset.error&&unset.parts?.length===opts.length,species+" canonical split",unset?.error);
    check(unset?.parent.includes("尚未選擇")&&!unset?.detail,species+" unset does not grant benefits");
    for(const option of opts){
     S.spChoices={[config.k]:option.n};
     const info=speciesChoiceRule5R(species,feature);
     const index=opts.findIndex(x=>x.n===option.n);
     check(!!info&&!info.error&&info.selected===option.n,species+" "+option.n+" selected",info?.error);
     check(!!info?.detail&&info.detail.trim().length>0,species+" "+option.n+" canonical chosen detail");
     check(config.opts==="DRAGON"||info?.parts.every((part,i)=>i===index||part===info.parts[index]||!info.detail.includes(part)),species+" "+option.n+" excludes distinct sibling source");
     if(species==="精靈"){
       check(info.detail.includes("呎")||option.n==="高等精靈",species+" "+option.n+" correct foot unit");
       check(!info.detail.includes("尺"),species+" "+option.n+" no old foot unit");
     }
    }
    S.spChoices={[config.k]:opts[0].n};
    renderOrigin();renderFinal();update();
    const selector='[data-species-choice-feature="'+feature+'"]';
    const finalCard=document.querySelector("#finalSheet "+selector);
    const previewCard=document.querySelector("#spDetail "+selector);
    const chosen=speciesChoiceRule5R(species,feature);
    const finalName=finalCard?.dataset.chosenOption;
    check(!!finalCard&&finalName===opts[0].n,species+" final chosen subcard");
    check(!!previewCard&&previewCard.dataset.chosenOption===opts[0].n,species+" creator preview chosen subcard");
    const parents=[...document.querySelectorAll('#finalSheet .trait-entry>.trait-name[data-tip],#spDetail .trait-entry>.trait-name[data-tip]')].filter(x=>x.dataset.tipTitle===speciesTraitDisplayName5R(feature));
    check(parents.length===2&&parents.every(x=>x.dataset.tip===chosen.parent),species+" parent not flattened");
    check(finalCard?.querySelector(".ft")?.dataset.tip===chosen.detail,species+" child popup exact selected source");
    check(previewCard?.querySelector(".ft")?.dataset.tip===chosen.detail,species+" preview popup exact selected source");
    const save=JSON.parse(JSON.stringify(serialize()));
    const imported=deserialize(save);renderFinal();
    check(imported.ok&&S.spChoices[config.k]===opts[0].n,species+" JSON roundtrip");
    check(document.querySelector('#finalSheet '+selector)?.dataset.chosenOption===opts[0].n,species+" re-render after import");
   }
   S.sp=SPECIES_2024.find(x=>x.n==="精靈");S.spChoices={eLine:"木精靈"};
   renderFinal();
   const wood=speciesChoiceRule5R("精靈","精靈血統");
   check(wood.detail.includes("35呎")&&!wood.detail.includes("120呎"),"wood elf 35ft and no drow 120ft");
   const width=document.documentElement.scrollWidth;
   check(width<=innerWidth+1,"390px responsive width",width);
   S.ruleset="2014";check(speciesChoiceRule5R("精靈","精靈血統")===null,"2014 unaffected");
   return {checks:cases.length,problems,variants:variants.length,choices:variants.reduce((n,[sp])=>n+(SP_OPTS[SPECIES_2024.find(x=>x.n===sp).ch.find(c=>c.t==="opt").opts]?.length||0),0)};
  });
  assert.deepEqual(errors,[],"Browser exceptions");
  assert.deepEqual(result.problems,[],"2024 species parent/selected branch regression");
  console.log("PASS canonical species branch cards",JSON.stringify({checks:result.checks,variants:result.variants,options:result.choices}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});

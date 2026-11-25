"use strict";
/* Regression: PHB 2024 Beast's Strike has a FIXED base damage bonus, not PB. */
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 const results=[];
 try {
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(process.env.QA_URL||pathToFileURL(path.resolve(__dirname,"../index.html")).href,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function"&&!!window.CreatureImport5R?.primalCompanionStats5R&&!!window.PlayStatusCreatures5R);
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const data=await page.evaluate(()=>{
    const variants={"Beast of the Land":{die:"1d8",base:2},"Beast of the Sea":{die:"1d6",base:2},"Beast of the Sky":{die:"1d4",base:3}};
    const result=[];
    S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(c=>c.n==="遊俠");
    S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獸王");
    S.base={str:10,dex:12,con:14,int:10,wis:18,cha:10};S.classLevels={"遊俠":3};
    S.classChoices2024={"遊俠":{}};
    for(const [name,expected] of Object.entries(variants)){
     const x=window.ZIZI_5R_CREATURES.find(x=>x.name===name&&x.source==="XPHB");
     if(!x)throw Error("2024 canonical companion absent: "+name);
     S.classChoices2024["遊俠"].primalBeast=window.ZIZI_5R_CREATURES_ZH[x.id].nameZh;
     for(const [level,pbExpected] of [[3,2],[5,3],[9,4],[17,6]]){
      S.level=level;S.classLevels={"遊俠":level};
      const m=window.CreatureImport5R.primalCompanionStats5R(x,S);
      const sheet=window.CreatureImport5R.stat(x,S);
      const play=window.PlayStatusCreatures5R.render(S);
      result.push({name,level,pbExpected,die:expected.die,base:expected.base,derived:m,
       sheetFixed:/固定傷害加值/.test(sheet),playFixed:/固定傷害加值/.test(play),
       sheetConcise:!/不等於熟練加值/.test(sheet),playConcise:!/不等於熟練加值/.test(play),
       sheetValue:sheet.includes(m.damageDie+" "+(m.damageFlat>=0?"+":"")+m.damageFlat),
       playValue:play.includes(m.damageDie+" "+(m.damageFlat>=0?"+":"")+m.damageFlat)});
     }
    }
    return result;
   });
   for(const x of data){
    assert.equal(x.derived.ready,true,`${x.name} source parsed`);
    assert.equal(x.derived.proficiency,x.pbExpected,`${x.name} lv${x.level} PB`);
    assert.equal(x.derived.damageDie,x.die,`${x.name} damage die`);
    assert.equal(x.derived.damageBase,x.base,`${x.name} fixed base`);
    assert.equal(x.derived.damageFlat,x.base+4,`${x.name} damage must not scale with PB`);
    assert.equal(x.sheetValue,true,`${x.name} full sheet displayed total`);
    assert.equal(x.playValue,true,`${x.name} run-state displayed total`);
    assert.equal(x.sheetFixed,true,`${x.name} full sheet explicitly says fixed base`);
    assert.equal(x.playFixed,true,`${x.name} play-state explicitly says fixed base`);
    assert.equal(x.sheetConcise,true,`${x.name} sheet omits redundant PB warning`);
    assert.equal(x.playConcise,true,`${x.name} play omits redundant PB warning`);
   }
   assert.deepEqual(errors,[],"No frontend runtime errors");
   results.push({width,checks:data.length});
   await page.close();
  }
  console.log(JSON.stringify({pass:true,results}));
 } finally {await browser.close();}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1});

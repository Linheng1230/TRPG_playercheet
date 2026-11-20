"use strict";
/* Targeted 12-class 2024 standard-array suggestions; state setup via test harness is intentional. */
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const url=process.env.QA_BASE?process.env.QA_BASE.replace(/\/?$/,"/")+"index.html":"file:///"+path.join(root,"index.html").replace(/\\/g,"/");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.platform==="win32"?{channel:"chrome"}:{})});
 const rows=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on("dialog",d=>d.accept());
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForTimeout(350);
  if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
  const classes=await page.evaluate(()=>CLASSES.map(c=>c.n));
  assert.equal(classes.length,12);
  for(const name of classes){
   const before=await page.evaluate(name=>{
    resetAll();S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n===name);
    S.classConfirmed=true;
    S.bg=BACKGROUNDS_2024[0];
    S.bgConfirmed=true;
    S.sp=SPECIES_2024[0];
    S.spConfirmed=true;
    S.method="array";
    S.base={str:null,dex:null,con:null,int:null,wis:null,cha:null};
    S.bonus={b2:"",b1:"",c1:"",c2:"",c3:""};
    S.abilitiesConfirmed=false;
    go(1);go(2);
    document.dispatchEvent(new Event("change",{bubbles:true}));
    return {class:name,background:S.bg.n,allowed:S.bg.ab};
   },name);
   await page.locator("#academyApplySuggestedAbilities").click();
   const after=await page.evaluate(()=>({
    base:{...S.base},bonus:{...S.bonus},bonusMode:S.bonusMode,confirmed:S.abilitiesConfirmed
   }));
   assert.deepEqual(Object.values(after.base).sort((a,b)=>a-b),[8,10,12,13,14,15],name+": non-standard array");
   assert(after.bonusMode==="21"&&before.allowed.includes(after.bonus.b2)&&
    before.allowed.includes(after.bonus.b1)&&after.bonus.b1!==after.bonus.b2,name+": invalid background bonus");
   assert(!after.confirmed,name+": suggestion bypassed confirmation");
   rows.push({class:name,base:after.base,bonus:after.bonus});
  }
  await page.close();
  console.log("PASS ACADEMY_INLINE_12_CLASS_STANDARD_ARRAY",JSON.stringify(rows));
 }finally{await browser.close();}
})().catch(e=>{console.error("FAIL ACADEMY_INLINE_12_CLASS_STANDARD_ARRAY",e.stack);process.exitCode=1});

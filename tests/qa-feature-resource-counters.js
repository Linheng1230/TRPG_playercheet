"use strict";
// Real-browser integration: selected feature -> shared resource projection -> controls -> save -> rest.
// This gate must fail if a selected feat is only rendered as a rules card without its counter.
const assert=require("node:assert/strict");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const ROOT_URL=pathToFileURL(path.join(ROOT,"index.html")).href;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const report=[];
 try{
  for(const width of [320,390,480,1024,1440]){
   const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(ROOT_URL,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof classResources==="function" && !!window.PlayStatusRest5R);
   // Source-change tripwire: all 2024 feats mentioning rest/consumable
   // resources must be mapped or explicitly classified as non-counters.
   const coverage=await page.evaluate(()=>{
    const mapped=new Set(Object.keys(PLAY_FEAT_LIMITED_USE_META).filter(k=>k.startsWith("2024|")).map(k=>k.slice(5)));
    const ignored={
     crafter:"製作裝備，非可回復次數",
     healer:"消耗醫療包物品使用次數",
     musician:"休息時鼓舞盟友，非累計點數",
     chef:"須先製作的零嘴屬於物品存貨",
     "inspiring-leader":"休息後演出，非有限次數池",
     "shield-master":"每回合一次，非跨回合資源池",
     "weapon-master":"長休替換武器精通選擇",
     "boon-of-energy-resistance":"長休可更改抗性類型"
    };
    const rules=window.ZIZI_5R_FEAT_RULES||{};
    const candidates=Object.entries(rules).filter(([id,r])=>/長休|短休|幸運點|治療池|無需法術位|不消耗法術位/.test(r.text||""));
    return {all:Object.keys(rules).length,checked:candidates.length,unclassified:candidates.filter(([id])=>!mapped.has(id)&&!ignored[id]).map(([id])=>id)};
   });
   assert.equal(coverage.all,75,"2024 canonical feat inventory changed; review source-bound resource coverage");
   assert.deepEqual(coverage.unclassified,[],"unclassified limited-use feat rules need a counter or explicit adjudication");
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   const setup=await page.evaluate(()=>{
    resetAll();
    S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(c=>c.n==="戰士");S.level=4;S.classLevels={戰士:4};
    S.base={str:14,dex:12,con:14,int:10,wis:12,cha:10};
    S.sp=SPECIES_2024.find(s=>s.n==="半身人");
    S.bg=BACKGROUNDS_2024.find(b=>featId5R(b.feat)==="lucky");
    if(!S.bg)throw Error("Canonical Lucky background not found");
    S.spChoices={};
    S.asi={};S.asiByClass={};S.boon="";
    S.play={hp:12,hpMax:null,thp:0,hd:4,ds:{s:0,f:0},insp:false,res:{},resMax:{},custom:[],notes:"Lucky QA"};
    const r=classResources().filter(x=>x.k.startsWith("feat-use:"));
    go(11);
    return {bg:S.bg.n,lucky:r.filter(x=>x.k.includes("lucky")),all:r};
   });
   if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
   assert.equal(setup.lucky.length,1,"2024 background Lucky not projected exactly once");
   const lucky=setup.lucky[0];
   assert.equal(lucky.max,2,"2024 level 4 Lucky cap must equal PB=2");
   assert.equal(lucky.rest,"long");
   assert(lucky.rule.includes("幸運點"),"canonical Lucky full rule must remain attached");
   assert(!setup.all.some(x=>x.label.includes("半身人") && x.label.includes("幸運")),"at-will halfling Lucky must not be a counter");
   const selector='#psResources [data-ps-resource="'+lucky.k+'"]';
   assert.equal(await page.locator(selector).count(),1,"Lucky counter missing from actual play-status DOM");
   assert((await page.locator(selector).innerText()).includes("剩餘 2"));
   await page.locator(selector+' [data-ps-action="res"][data-ps-delta="1"]').click();
   assert.equal(await page.evaluate(key=>S.play.res[key],lucky.k),1,"Lucky spend via actual UI");
   const persisted=await page.evaluate(()=>serialize());
   assert.equal(persisted.play.res[lucky.k],1,"Lucky spend must persist in JSON");
   const restored=await page.evaluate(saved=>{
    const result=deserialize(saved);go(11);renderPlayStatusTab();
    return {ok:result.ok,resources:classResources(),used:S.play.res};
   },persisted);
   assert(restored.ok,"Lucky JSON deserialize failed");
   assert.equal(restored.used[lucky.k],1,"Lucky usage lost after JSON roundtrip");
   assert.equal(restored.resources.find(x=>x.k===lucky.k)?.max,2);
   await page.locator('#playStatusBody [data-ps-action="rest-short"]').click();
   await page.locator('#psRestDialog [data-rest-submit]').click();
   assert.equal(await page.evaluate(key=>S.play.res[key],lucky.k),1,"short rest must not restore Lucky points");
   await page.locator('#psRestDialog [data-rest-close]').click();
   await page.locator('#playStatusBody [data-ps-action="rest-long"]').click();
   assert.equal(await page.evaluate(key=>S.play.res[key],lucky.k),0,"long rest must restore Lucky points");
   await page.locator('#psRestDialog [data-rest-close]').click();
   const cases=await page.evaluate(()=>{
    const found=()=>classResources().filter(r=>r.k.startsWith("feat-use:"));
    const chooseFeat=id=>GFEATS_2024.find(f=>f.id===id)?.n;
    const output={levels:[],unused:null,half:null,extra:null,duplicate:null,magic:null,fey:null,mage:null,boon:null,old:null};
    for(const [lv,want] of [[1,2],[5,3],[9,4],[13,5],[17,6]]){
     S.level=lv;S.classLevels={戰士:lv};
     output.levels.push({lv,want,got:found().find(r=>r.label.includes("幸運點"))?.max});
    }
    S.level=4;S.classLevels={戰士:4};
    S.bg=BACKGROUNDS_2024.find(b=>featId5R(b.feat)!=="lucky");
    output.half=found().filter(r=>r.label.includes("幸運點")).length;
    S.spChoices={hFeat:"幸運"};
    output.extra=found().filter(r=>r.label.includes("幸運點")).map(r=>r.max);
    S.bg=BACKGROUNDS_2024.find(b=>featId5R(b.feat)==="lucky");
    output.duplicate=found().filter(r=>r.label.includes("幸運點")).length;
    S.spChoices={};
    S.bg=BACKGROUNDS_2024.find(b=>featId5R(b.feat)!=="lucky");
    S.asi={4:{t:"feat",feat:chooseFeat("mage-slayer")}};
    output.mage=found().map(r=>({label:r.label,rest:r.rest}));
    S.asi={4:{t:"feat",feat:chooseFeat("fey-touched")}};
    S.featSpells={"asi戰士4":{s1:"祝福術"}};
    output.fey=found().filter(r=>r.k.includes("fey-touched")).map(r=>r.label);
    S.asi={};S.featSpells={};
    S.bg=BACKGROUNDS_2024.find(b=>featId5R(b.feat)==="magic-initiate");
    S.featSpells={ogbg:{s1:"護盾術"}};
    output.magic=found().filter(r=>r.k.includes("magic-initiate")).map(r=>r.label);
    S.bg=BACKGROUNDS_2024.find(b=>featId5R(b.feat)!=="magic-initiate");
    S.boon=BOONS.find(b=>b.id==="boon-of-recovery")?.n||"";
    S.level=19;S.classLevels={戰士:19};
    output.boon=found().map(r=>({label:r.label,max:r.max}));
    S.ruleset="2014";syncRulesetUI();S.bg=BACKGROUNDS_2014[0];S.boon="";
    S.level=4;S.classLevels={戰士:4};S.asi={};S.asiByClass={};
    S.sp=SPECIES_2014.find(s=>s.n==="半身人");S.spChoices={};
    output.unused=found().filter(r=>r.label.includes("幸運點")).length;
    const martial2014=GFEATS.find(f=>f.n==="戰技專家");
    S.asiByClass={戰士:{4:{t:"feat",feat:martial2014?.n}}};
    output.martial=found().filter(r=>r.k.includes("martial-adept")).map(r=>({max:r.max,rest:r.rest}));
    const initiate2014=GFEATS.find(f=>f.n==="魔法學徒");
    S.asiByClass={戰士:{4:{t:"feat",feat:initiate2014?.n}}};
    output.oldMagic=found().filter(r=>r.k.includes("magic-initiate")).map(r=>({max:r.max,rest:r.rest}));
    const lucky2014=GFEATS.find(f=>f.n==="幸運");
    S.asiByClass={戰士:{4:{t:"feat",feat:lucky2014?.n}}};
    output.old=found().filter(r=>r.label.includes("幸運點")).map(r=>({max:r.max,rest:r.rest}));
    return output;
   });
   assert.deepEqual(cases.levels.map(x=>x.got),cases.levels.map(x=>x.want),"Lucky PB progression 1/5/9/13/17");
   assert.equal(cases.half,0,"halfling at-will trait must not create a Lucky pool");
   assert.deepEqual(cases.extra,[2],"2024 human extra Lucky must create one PB pool");
   assert.equal(cases.duplicate,1,"duplicate Lucky sources must not double the pool");
   assert(cases.mage.some(x=>x.label.includes("審慎護心")&&x.rest==="short"));
   assert.equal(cases.fey.length,2,"Fey Touched must have two separate free spell counters");
   assert(cases.fey.some(x=>x.includes("祝福術")),"chosen spell identity missing");
   assert(cases.magic.some(x=>x.includes("護盾術")),"Magic Initiate free spell counter missing");
   assert(cases.boon.some(x=>x.max===10&&x.label.includes("重獲生機")));
   assert.equal(cases.unused,0,"2014 unselected Lucky must have no counter");
   assert.deepEqual(cases.old,[{max:3,rest:"long"}],"2014 Lucky is 3 points not PB");
   assert.deepEqual(cases.oldMagic,[{max:1,rest:"long"}],"2014 Magic Initiate is one free level-one spell per long rest");
   assert.deepEqual(cases.martial,[{max:1,rest:"short"}],"2014 Martial Adept extra superiority die restores on short/long rest");
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert(overflow<=2,"horizontal overflow "+width+": "+overflow);
   assert.deepEqual(errors,[],"page JS errors");
   report.push({width,lucky:setup.lucky.length,save:true,rest:true,levels:cases.levels.length,negative:true,selectedOther:true,legacy:true,overflow});
   await page.close();
  }
  console.log("PASS feature resource counters "+JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error("FAIL "+(e.stack||e));process.exitCode=1});

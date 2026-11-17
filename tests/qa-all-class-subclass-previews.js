"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/,"")||"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}
 res.writeHead(200,{"Content-Type":file.endsWith(".js")?"text/javascript; charset=utf-8":file.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream"}).end(data);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const coverage=await page.evaluate(()=>{
   const failures=[],debug=[],seen={classes:0,subclasses:0,classFeatures:0,classCanonical:0,classFallback:0,subFeatures:0,variants:0,levelRenders:0};
   const featureNames=s=>String(s||"").split("、").map(x=>x.trim()).filter(Boolean);
   S.ruleset="2024";S.base={str:12,dex:14,con:14,int:12,wis:16,cha:18};
   for(const cls of CLASSES){
    seen.classes++;
    const prog=PROG_2024[cls.n];
    if(!prog||prog.subs.length!==4){failures.push(cls.n+" missing 4 subclasses");continue;}
    for(const [level,names] of Object.entries(prog.f||{})){
     for(const feat of featureNames(names)){
      seen.classFeatures++;
      const key=feat.split("(")[0].trim().replace(/^武器掌握增至\s*\d+\s*種$/,"武器掌握");
      // A tooltip merely existing is not proof that it contains the canonical rules.
      // Resolve progression labels (e.g. Extra Attack at 11/20 and Weapon Mastery counts)
      // to the SAME class/feature/level entry, not to a generic low-level fallback.
      const canonicalKey=cls.n+"||"+key+"|"+Number(level);
      const direct=window.ZIZI_5R_FULL_FEATURE_RULES?.[canonicalKey]||"";
      const full=String(direct||resolveFeatureRule2024(cls.n,"",key,+level)||"").trim();
      if(full)seen.classCanonical++;else{
       seen.classFallback++;
       failures.push(cls.n+" base level "+level+" "+feat+" missing level-aware canonical text");
       if(debug.length<28)debug.push({class:cls.n,level,name:feat,canonicalKey,fallback:true});
      }
      const render=featSpan(feat,{cls:cls.n,sub:"",lv:+level});
      const host=document.createElement("div");host.innerHTML=render;
      const tip=String(host.querySelector("[data-tip]")?.getAttribute("data-tip")||"");
      if(!tip.trim())failures.push(cls.n+" base level "+level+" "+feat+" missing readable tooltip");
      // Compare actual projected user-facing mechanics, not only a data-tip attribute.
      const norm=s=>String(s||"").replace(/<[^>]*>/g,"").replace(/&(?:nbsp|amp|lt|gt);/g,"").replace(/[\s\u00a0\u200b-\u200d]/g,"");
      if(full&&tip&&!norm(tip).includes(norm(full))){
       // Parent tips of mutually exclusive class options intentionally show only the
       // selected branch and must not imply that both alternatives are granted.
       // Verify their individual full rules against the same upstream split instead.
       const parent=exclusiveParentRule5R(cls.n,"",key,+level);
       const split=parent?canonicalChoiceSplit5R(cls.n,"",key,+level):null;
       const spec=parent?exclusiveChoiceSpec5R(cls.n,"",key,+level):null;
       const eligibleEnhancement=(cls.n==="牧師"&&key==="強化受祝打擊"&&+level===14)||
                                 (cls.n==="德魯伊"&&key==="元素神威"&&+level===15);
       const rulesGood=!!split&&split.effects.length>=2&&split.effects.every(Boolean)&&
         (eligibleEnhancement||!!spec&&spec.options.length===split.effects.length&&
          spec.options.every((option,i)=>norm(selectedExclusiveRule5R(spec,option)).includes(norm(split.effects[i]))));
       if(!parent||!norm(tip).includes(norm(parent))||!rulesGood){
        failures.push(cls.n+" base level "+level+" "+feat+" tooltip not canonical full text");
        if(debug.length<28)debug.push({class:cls.n,level,name:feat,sourceLen:norm(full).length,tipLen:norm(tip).length,parent:!!parent,rulesGood,sourceStart:norm(full).slice(0,55),tipStart:norm(tip).slice(0,55)});
       }else seen.branchVerified=(seen.branchVerified||0)+1;
      }
     }
    }
    for(let i=0;i<4;i++){
     seen.subclasses++;
     const sub=prog.subs[i];
     for(const [level,names] of Object.entries(sub.f||{})){
      for(const feat of featureNames(names)){
       seen.subFeatures++;
       if(!String(resolveFeatureRule2024(cls.n,sub.n,feat,+level)||"").trim())failures.push(cls.n+"/"+sub.n+"/"+level+"/"+feat+" missing full canonical");
      }
     }
     for(const lv of [1,3,7,10,14,20]){
      S.cls=cls;S.level=lv;S.sub=lv<3?null:i;S.subConfirmed=lv>=3;
      S.classChoices2024={};S.invocations=new Set();pendingSubclass=null;
      try{renderLevel();seen.levelRenders++;}catch(err){failures.push(cls.n+"/"+sub.n+"/level "+lv+" render "+err.message);continue;}
      if(lv<3){
       if(document.querySelectorAll("#subPreviewGrid [data-sub-preview]").length!==4)failures.push(cls.n+" early previews missing");
      }else{
       const area=document.querySelector("#subclassPreview");
       if(!area||!area.querySelector(".subclass-preview-tier")){failures.push(cls.n+"/"+sub.n+"/"+lv+" preview not visible");if(debug.length<4)debug.push({class:cls.n,sub:sub.n,level:lv,area:area?.outerHTML.slice(0,480),grid:!!document.querySelector("#subGrid"),stateSub:S.sub,confirmed:S.subConfirmed,pending:pendingSubclass,progSubs:window.prog()?.subs?.length,manual:subclassPreview5R(window.prog(),i).slice(0,140),previewCount:document.querySelectorAll("#subclassPreview").length,previewParent:document.querySelector("#subclassPreview")?.parentElement?.id,firstSibling:area?.nextElementSibling?.outerHTML.slice(0,160)});}
       if(document.querySelectorAll("[data-sub-preview]").length!==4)failures.push(cls.n+"/"+sub.n+"/"+lv+" compare controls missing");
      }
      const horizontal=document.documentElement.scrollWidth-document.documentElement.clientWidth;
      if(horizontal>2)failures.push(cls.n+"/"+sub.n+"/"+lv+" horizontal overflow "+horizontal);
     }
    }
   }
   const routes=[
    ["遊俠","獵人",3,"hunterPrey"],
    ["遊俠","獵人",7,"hunterDefense"],
    ["野蠻人","野心之道",6,"wildAspect"],
    ["法師","預言師",10,"thirdEye"]];
   for(const [clsName,subName,lv,key] of routes){
    const cls=CLASSES.find(c=>c.n===clsName),i=PROG_2024[clsName].subs.findIndex(x=>x.n===subName);
    S.cls=cls;S.level=lv;S.sub=i;S.subConfirmed=true;S.classChoices2024={};
    try{renderLevel();}catch(err){failures.push("variant "+key+" render "+err.message);continue;}
    const sel=document.querySelector('select[data-c24key="'+key+'"]');
    const det=sel?.parentElement?.querySelector(".class-choice-variant-preview");
    if(!sel||!det){failures.push("variant "+key+" missing preview");continue;}
    const rules=[...det.querySelectorAll(".choice-menu-option")].map(x=>x.textContent.trim());
    if(rules.length<2||rules.some(x=>x.length<9||x.includes("無法解析")||x.includes("無法對應"))){failures.push("variant "+key+" canonical details not complete");debug.push({variant:key,rules:rules.map(x=>x.slice(0,180))});}
    const before=JSON.stringify({sub:S.sub,st:S.classChoices2024});
    det.open=true;seen.variants+=rules.length;
    if(JSON.stringify({sub:S.sub,st:S.classChoices2024})!==before)failures.push("variant "+key+" preview mutated choices");
   }
   return {seen,failures,debug};
  });
  console.log("CLASS_SUBCLASS_AUDIT",JSON.stringify({width,...coverage.seen,failures:coverage.failures.slice(0,12),failureCount:coverage.failures.length,debug:coverage.debug}));
  if(coverage.failures.length)console.log("CLASS_BASE_UNRESOLVED",JSON.stringify(coverage.failures));
  assert.equal(coverage.seen.classes,12);
  assert.equal(coverage.seen.subclasses,48);
  assert(coverage.seen.classFeatures>=80);
  assert.equal(coverage.seen.classFallback,0,"All class progression features need canonical full rules");
  assert(coverage.seen.subFeatures>=200);
  assert.equal(coverage.seen.levelRenders,288);
  assert(coverage.seen.variants>=8);
  assert.deepEqual(coverage.failures,[]);
  await page.evaluate(()=>go(5));
  const choiceBefore=await page.evaluate(()=>JSON.stringify({sub:S.sub,choices:S.classChoices2024}));
  const details=page.locator(".class-choice-variant-preview").first();
  await details.locator("summary").click();
  assert(await details.evaluate(el=>el.open),"touch/click must expand rule preview");
  assert(await details.locator(".choice-menu-option").first().isVisible(),"expanded option mechanics visible");
  assert.equal(await page.evaluate(()=>JSON.stringify({sub:S.sub,choices:S.classChoices2024})),choiceBefore,"preview must not change state");
  assert.deepEqual(errors,[]);
  if(!process.env.CI)await page.screenshot({path:"D:\\Tools\\zizi-ai-runtime\\trpg-playercheet-qa\\all-class-subclass-audit-"+width+"-20261117.png",fullPage:false});
  await page.close();
 }}finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});

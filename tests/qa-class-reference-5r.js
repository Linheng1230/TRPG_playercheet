"use strict";
const assert=require("assert");
const {chromium}=require("playwright");
const URL=(process.env.QA_BASE||"http://127.0.0.1:18766")+"/index.html";
(async()=>{
 let browser=await chromium.launch({headless:true});
 const reports=[],errors=[];
 try{
  for(const [width,height,label] of [[1440,900,"desktop"],[480,800,"narrow"],[390,844,"mobile"]]){
   const page=await browser.newPage({viewport:{width,height}});
   page.on("pageerror",e=>errors.push(label+": "+e.message));
   await page.goto(URL+"?qa-class-reference="+label,{waitUntil:"domcontentloaded"});
   await page.locator('#refTabs [data-r="class"]').waitFor({state:"attached"});
   // The app schedules the welcome ruleset modal 150 ms after startup; close it via its actual UI.
   await page.waitForTimeout(300);
   if(await page.locator("#rulesetModal").evaluate(el=>el.classList.contains("open")))
    await page.locator("#closeRuleset").click();
   await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();go(12);});
   await page.locator('#refTabs [data-r="class"]').click();
   assert.equal(await page.locator(".cr5r-class").count(),12,label+" class count");
   const matrix=await page.evaluate(()=>({
    classes:CLASSES.map(c=>c.n),
    subclassCount:Object.values(PROG_2024).reduce((a,x)=>a+x.subs.length,0)
   }));
   assert.equal(matrix.subclassCount,48,label+" subclass count");
   const coverage={features:0,options:0,tables:0,spellCount:0,maneuverCount:0};
   for(const cls of matrix.classes){
    await page.locator('[data-cr5r-class="'+cls+'"]').click();
    assert.equal(await page.locator(".cr5r-sub").count(),4,label+" 4 subclasses "+cls);
    await page.locator(".cr5r-skills summary").click();
    const skillDisplay=await page.locator(".cr5r-skills").innerText();
    assert(!skillDisplay.includes("動物馴養"),label+" legacy animal handling visible in "+cls);
    if(["野蠻人","德魯伊","戰士","遊俠"].includes(cls))
     assert(skillDisplay.includes("馴獸"),label+" official 馴獸 term missing in "+cls);
    if(["武僧","戰士","遊蕩者"].includes(cls))
     assert(skillDisplay.includes("特技"),label+" old 雜技 term visible in "+cls);
    assert.equal(await page.locator(".cr5r-level").count(),20,label+" 20 levels "+cls);
    const levels=await page.locator(".cr5r-level-badge").allTextContents();
    assert.deepStrictEqual(levels,Array.from({length:20},(_,i)=>"Lv "+(i+1)),label+" level range "+cls);
    for(let n=0;n<4;n++){
     await page.locator(".cr5r-sub").nth(n).click();
     assert.equal(await page.locator(".cr5r-level").count(),20,label+" 20 levels for subclass "+cls+" "+n);
     assert(await page.locator(".cr5r-level").nth(2).innerText(),label+" level 3 feature text "+cls);
     const parity=await page.evaluate(()=>{
      const failures=[],sub=classRefState5R.subName,cls=classRefState5R.className,prog=PROG_2024[cls],spec=prog.subs.find(x=>x.n===sub);
      let features=0,options=0,tables=0,spellCount=0,maneuverCount=0;
      const cards=[...document.querySelectorAll("[data-cr5r-feature]")];
      const norm=v=>String(v||"").replace(/\s/g,"");
      for(const [lv,raw] of Object.entries(spec.f))for(const key of cr5rSplit(raw)){
       const id=[cls,sub,key,lv].join("|"),card=cards.find(c=>c.dataset.cr5rFeature===id);
       features++;
       if(!card){failures.push(id+" missing card");continue;}
       const body=card.querySelector(".cr5r-rule");
       if(!body||!norm(body.textContent))failures.push(id+" empty body");
       const nested=window.ZIZI_5R_NESTED_CHOICE_RULES?.[id];
       if(nested){
        const actual=[...card.querySelectorAll("[data-cr5r-option]")];
        if(actual.length!==nested.options.length||!norm(body.textContent).includes(norm(nested.intro)))failures.push(id+" parent/options");
        for(const o of nested.options){
         options++;
         const node=actual.find(c=>c.dataset.cr5rOption===o.eng);
         if(!node||!norm(node.textContent).includes(norm(o.text)))failures.push(id+" missing option "+o.eng);
        }
       }
       if(+lv===3&&["領域法術","結社法術","誓言法術","流派法術","起源法術","宗主法術"].includes(key)){
        const source=sub==="大地結社"?window.ZIZI_5R_LAND_SPELLS_ENG:{[sub]:window.ZIZI_5R_SUBCLASS_SPELLS_ENG?.[sub]};
        for(const [title,rows] of Object.entries(source)){
         if(!rows){failures.push(id+" missing spell source");continue;}
         tables++;
         const table=[...card.querySelectorAll("[data-cr5r-spell-table]")].find(c=>c.dataset.cr5rSpellTable===title);
         if(!table){failures.push(id+" missing table "+title);continue;}
         for(const [level,expected] of Object.entries(rows)){
          const row=[...table.querySelectorAll("[data-cr5r-spell-level]")].find(c=>c.dataset.cr5rSpellLevel===level);
          const actual=[...(row?.querySelectorAll("[data-cr5r-spell]")||[])];
          spellCount+=expected.length;
          if(JSON.stringify(actual.map(c=>c.dataset.cr5rSpell))!==JSON.stringify(expected)||actual.some(c=>!c.textContent.trim()))failures.push(id+" level "+level+" mismatch");
         }
        }
       }
       if(sub==="戰鬥大師"&&key==="戰鬥優勢"&&+lv===3){
        const all=Object.entries(window.ZIZI_5R_MANEUVERS||{});
        maneuverCount+=all.length;
        if(all.length!==20)failures.push(id+" canonical maneuver count");
        for(const [name,text] of all){
         const node=[...card.querySelectorAll("[data-cr5r-maneuver]")].find(c=>c.dataset.cr5rManeuver===name);
         if(!node||!norm(node.textContent).includes(norm(text)))failures.push(id+" missing maneuver "+name);
        }
       }
      }
      return {features,options,tables,spellCount,maneuverCount,failures};
     });
     assert.deepStrictEqual(parity.failures,[],label+" subclass detail parity "+cls+" "+n);
     for(const k of ["features","options","tables","spellCount","maneuverCount"])coverage[k]+=parity[k];
    }
   }
   assert.equal(coverage.features,243,label+" all subclass progression entries");
   assert.equal(coverage.options,9,label+" Wild Heart options");
   assert.equal(coverage.tables,23,label+" subclass spell tables including four land terrains");
   assert.equal(coverage.maneuverCount,20,label+" all Battle Master maneuvers");
   console.log(JSON.stringify({label,coverage}));
   await page.locator('[data-cr5r-class="野蠻人"]').click();
   await page.locator("#cr5rLv1 summary").click();
   const rage=await page.locator("#cr5rLv1").innerText();
   assert(rage.includes("狂暴")&&rage.includes("短休")&&rage.includes("長休"),label+" canonical rage recovery");
   const structured=await page.locator("#cr5rLv1 .cr5r-rule").first().evaluate(el=>{
    const css=getComputedStyle(el),raw=window.ZIZI_5R_FULL_FEATURE_RULES["野蠻人||狂暴|1"];
    return {raw,shown:el.textContent,paragraphs:el.querySelectorAll("p").length,
      headings:[...el.querySelectorAll("h4")].map(x=>x.textContent),
      listItems:el.querySelectorAll("li").length,
      font:parseFloat(css.fontSize),line:parseFloat(css.lineHeight),
      overflow:el.scrollWidth-el.clientWidth,width:el.getBoundingClientRect().width};
   });
   assert.equal(structured.shown.replace(/\s/g,""),structured.raw.replace(/\s/g,""),label+" canonical rule text must be preserved");
   assert(structured.paragraphs>=4&&structured.headings.length>=4,label+" long rule sections "+JSON.stringify(structured));
   assert(structured.listItems>=3,label+" rage extension options must be listed "+JSON.stringify(structured));
   assert(structured.headings.some(h=>h.includes("傷害抗性"))&&structured.headings.some(h=>h.includes("持續時間")),label+" key rule headings");
   assert(structured.font>=(width<=430?15:16),label+" full-rule minimum font "+JSON.stringify(structured));
   assert(structured.line/structured.font>=1.75,label+" full-rule line-height "+JSON.stringify(structured));
   assert(structured.overflow<=1&&structured.width<=width,label+" long rule horizontal clipping "+JSON.stringify(structured));
   if(process.env.CI){
    const fs=require("fs"),path=require("path"),dir=path.join(__dirname,"artifacts");
    fs.mkdirSync(dir,{recursive:true});
    await page.screenshot({path:path.join(dir,"class-reference-"+label+".png"),fullPage:true});
   }
   // Reproduce the reported user route by selecting Wild Heart and expanding level 6.
   await page.locator('[data-cr5r-sub="野心之道"]').click();
   await page.locator("#cr5rLv6 summary").click();
   const aspect=page.locator('[data-cr5r-feature="野蠻人|野心之道|荒野形貌|6"]');
   for(const en of ["Owl","Panther","Salmon"])assert(await aspect.locator('[data-cr5r-option="'+en+'"]').isVisible(),label+" visible "+en);
   assert((await aspect.innerText()).includes("長休"),label+" long rest change retained");
   assert((await aspect.evaluate(el=>el.scrollWidth-el.clientWidth))<=1,label+" aspect overflow");
   // User-visible World Tree level 3 card: both benefits, their different expiration conditions and readable headings.
   await page.locator('[data-cr5r-sub="世界樹之道"]').click();
   const vitalityLevel=page.locator("#cr5rLv3");
   if(!await vitalityLevel.evaluate(el=>el.open)) await vitalityLevel.locator("summary").click();
   const vitality=vitalityLevel.locator(".cr5r-rule").filter({hasText:"Life-Giving Force"});
   assert.equal(await vitality.count(),1,label+" World Tree vitality card");
   const vitalityDOM=await vitality.evaluate(el=>({text:el.innerText,headings:[...el.querySelectorAll("h4")].map(h=>h.textContent),overflow:el.scrollWidth-el.clientWidth}));
   assert(vitalityDOM.headings.some(h=>h.includes("Vitality Surge"))&&vitalityDOM.headings.some(h=>h.includes("Life-Giving Force")),label+" separate named benefits");
   assert(vitalityDOM.text.includes("不因狂暴結束消失")&&vitalityDOM.text.includes("狂暴結束時，其他生物藉此效果獲得且剩餘的臨時生命值立即消失"),label+" exact expiration scope");
   assert(vitalityDOM.overflow<=1,label+" World Tree card overflow");
   await page.locator('[data-cr5r-class="德魯伊"]').click();
   await page.locator('[data-cr5r-sub="星辰結社"]').click();
   assert((await page.locator("#cr5rLv3").innerText()).includes("星圖"),label+" stars circle feature");
   await page.locator('[data-cr5r-band="4"]').click();
   assert.equal(await page.locator(".cr5r-level").count(),5,label+" filter 16-20");
   await page.locator('[data-cr5r-band="all"]').click();
   const search=page.locator("#cr5rSearch");
   await search.fill("Monk");
   assert.equal(await page.locator(".cr5r-class:visible").count(),1,label+" English search");
   assert.equal(await search.inputValue(),"Monk",label+" search stable");
   await search.fill("");
   assert.equal(await page.locator(".cr5r-class:visible").count(),12,label+" clear search");
   const metrics=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
    featureFont:parseFloat(getComputedStyle(document.querySelector(".cr5r-rule")).fontSize)
   }));
   assert(metrics.overflow<=1,label+" horizontal overflow "+JSON.stringify(metrics));
   assert(metrics.featureFont>=14,label+" readable font "+JSON.stringify(metrics));
   await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();});
   assert(await page.locator('#refTabs [data-r="class"]').isVisible(),label+" 2014 reference available");
   assert(await page.locator(".cr5r-warning").count()===0,label+" warning requires rerender");
   await page.locator('#refTabs [data-r="class"]').click();
   assert((await page.locator(".cr5r-warning").innerText()).includes("2014"),label+" edition warning");
   reports.push({label,classes:12,subclasses:48,levels:20,coverage,metrics});
   await page.close();
  }
  assert.equal(errors.length,0,"page errors: "+errors.join(" | "));
  console.log(JSON.stringify({PASS:true,reports,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

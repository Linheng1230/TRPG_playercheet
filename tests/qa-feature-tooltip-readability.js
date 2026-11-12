const {chromium}=require("playwright");
(async()=>{
 const results=[];
 for(const [w,h,label] of [[1440,900,"desktop"],[480,760,"narrow"],[390,844,"mobile"]]){
  const b=await chromium.launch({headless:true,channel:"chrome"});
  const page=await b.newPage({viewport:{width:w,height:h}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text())});
  await page.goto((process.env.QA_URL||"http://127.0.0.1:18766/index.html"),{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const out=await page.evaluate(()=>{
    S.ruleset="2024";SPECIES=SPECIES_2024;S.sp=SPECIES_2024.find(x=>x.n==="矮人");S.spChoices={};renderOrigin();
    const speciesNode=[...document.querySelectorAll("#spDetail .trait-name.ft")].find(x=>x.dataset.tipTitle==="石中精妙");
    const samples=[
      ["species","石中精妙",speciesNode?.dataset.tip||""],
      ["class",displayFeatureName5R("野蠻人","","武器掌握",1),ALLDESC["武器掌握"]||""],
      ["subclass","靈能力量",SUBD["魂刃靈能力量"]||SUBD["靈能力量"]||""],
      ["maneuver",displayName5R("maneuvers","指揮打擊"),window.ZIZI_5R_MANEUVERS?.["指揮打擊"]||""],
      ["mastery",displayName5R("masteries","破綻"),MASTERY["破綻"]||""]
    ];
    const rendered=[];
    for(const [kind,title,raw] of samples){
      featureTip.innerHTML=featureTipHTML(raw,title);featureTip.style.display="block";featureTip.style.left="8px";featureTip.style.top="8px";
      const rect=featureTip.getBoundingClientRect(),rows=[...featureTip.querySelectorAll(".ft-rule")],keys=[...featureTip.querySelectorAll(".ft-rule-key")].map(x=>x.textContent.trim());
      const before=featureTip.scrollTop;featureTip.scrollTop=99999;const after=featureTip.scrollTop;
      rendered.push({kind,title,rawLength:raw.length,rows:rows.length,keys,overflowX:featureTip.scrollWidth-featureTip.clientWidth,
        rect:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom},scrollable:featureTip.scrollHeight>featureTip.clientHeight,
        scrollWorked:featureTip.scrollHeight<=featureTip.clientHeight||after>before,pointer:getComputedStyle(featureTip).pointerEvents,
        font:parseFloat(getComputedStyle(featureTip).fontSize),line:parseFloat(getComputedStyle(featureTip).lineHeight)});
      featureTip.scrollTop=0;
    }
    featureTip.style.display="none";
    return {speciesWired:!!speciesNode,speciesTip:speciesNode?.dataset.tip||"",samples:rendered};
  });
  await b.close();
  const pass=!errors.length&&out.speciesWired&&out.samples.every(x=>x.rawLength>0&&x.rows>0&&x.overflowX<=1&&x.rect.left>=0&&x.rect.right<=w+1&&x.pointer==="auto"&&x.scrollWorked&&x.line/x.font>=1.6);
  results.push({label,w,h,errors,out,pass});
 }
 console.log(JSON.stringify(results,null,2));process.exit(results.every(x=>x.pass)?0:1);
})().catch(e=>{console.error(e);process.exit(2)});

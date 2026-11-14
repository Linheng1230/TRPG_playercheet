/* Browser contract for Phase A typography. Screenshots are evidence, not a substitute for visual review. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const OUT=path.resolve("tmp/qa-readability-phase-a");
fs.mkdirSync(OUT,{recursive:true});

async function run(browser,width,height,label){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(URL,{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const basic=await page.evaluate(()=>{
    const root=getComputedStyle(document.documentElement);
    const body=getComputedStyle(document.body);
    const desc=document.querySelector(".pick-card .desc");
    const ds=desc?getComputedStyle(desc):null;
    return {
      loaded:[...document.styleSheets].some(s=>s.href?.includes("readability-typography-5r.css")),
      palette:{ink:root.getPropertyValue("--ink").trim(),panel:root.getPropertyValue("--panel").trim()},
      body:{font:parseFloat(body.fontSize),family:body.fontFamily,line:parseFloat(body.lineHeight)},
      card:ds?{font:parseFloat(ds.fontSize),line:parseFloat(ds.lineHeight),color:ds.color}:null
    };
  });
  assert(basic.loaded,label+": Phase A CSS did not load");
  assert.equal(basic.palette.ink,"#e9dec4",label+": parchment changed");
  assert.equal(basic.palette.panel,"#f5edd9",label+": panel palette changed");
  assert(basic.body.font>=15.5&&/Sans|JhengHei|system-ui/i.test(basic.body.family),label+": body font unreadable");
  assert(basic.card&&basic.card.font>=14&&basic.card.line/basic.card.font>=1.6,label+": creator card summary too small");
  assert.equal(basic.card.color,"rgb(42, 35, 28)",label+": creator rule description uses muted color");

  await page.evaluate(()=>{
    S.ruleset="2024";syncRulesetUI();
    S.sp=SPECIES_2024.find(s=>s.n==="矮人");
    if(!S.sp)throw Error("Missing 2024 dwarf fixture");
    S.spChoices={};
    go(1);renderOrigin();
  });
  const origin=await page.evaluate(()=>{
    const rule=document.querySelector("#spDetail.detail-box .trait-rules");
    const val=document.querySelector("#spDetail.detail-box .trait-val");
    if(!rule||!val)return null;
    const style=getComputedStyle(rule),v=getComputedStyle(val);
    return {font:parseFloat(style.fontSize),line:parseFloat(style.lineHeight),
      family:style.fontFamily,color:v.color,
      overflow:document.documentElement.scrollWidth-innerWidth,
      key:rule.querySelector(".trait-key")?.innerText||"",
      text:rule.innerText.slice(0,250)};
  });
  assert(origin,label+": canonical species rule was not rendered");
  assert(origin.font>=(width<=520?15:15.5),label+": species rule font too small: "+JSON.stringify(origin));
  assert(origin.line/origin.font>=1.75,label+": species rules too tightly spaced");
  assert.equal(origin.color,"rgb(42, 35, 28)",label+": species rules muted");
  assert(origin.overflow<=2,label+": species page horizontal overflow");
  await page.screenshot({path:path.join(OUT,label+"-species.png"),fullPage:false});

  const features=await page.evaluate(()=>{
    const tip=document.querySelector("#featureTip");
    tip.innerHTML=featureTipHTML("以附贈動作使用一次特性；目標進行敏捷豁免，失敗受到3d6火焰傷害。完成長休後恢復使用次數。","閱讀測試");
    tip.style.display="block";tip.style.top="4px";tip.style.left="4px";
    const el=tip.querySelector(".ft-rule-val"),css=getComputedStyle(el);
    const t={font:parseFloat(css.fontSize),line:parseFloat(css.lineHeight),
      overflow:tip.scrollWidth-tip.clientWidth,viewport:tip.getBoundingClientRect().right-innerWidth};
    tip.style.display="none";
    // The final-sheet feature uses the same prose contract as canonical rule display.
    const fixture=document.createElement("section");fixture.id="qaReadabilityFeature";
    fixture.className="fs-sec";
    fixture.innerHTML='<div class="trait-entry"><div class="trait-name">特性測試</div><div class="trait-rules"><div class="trait-rule"><b class="trait-key">恢復</b><span class="trait-val">完成長休後恢復使用次數，並保留所有規則文字。</span></div></div></div>';
    document.querySelector(".workspace").appendChild(fixture);
    const final=getComputedStyle(fixture.querySelector(".trait-rules"));
    t.finalFont=parseFloat(final.fontSize);t.finalLine=parseFloat(final.lineHeight);t.finalColor=final.color;
    t.finalOverflow=fixture.scrollWidth-fixture.clientWidth;
    return t;
  });
  assert(features.font>=14&&features.line/features.font>=1.6,label+": full-rule tooltip too small");
  assert(features.overflow<=1&&features.viewport<=1,label+": full-rule tooltip clips horizontally");
  assert(features.finalFont>=15&&features.finalLine/features.finalFont>=1.75,label+": final-sheet rule too small");
  assert.equal(features.finalColor,"rgb(42, 35, 28)",label+": final-sheet rules muted");
  assert(features.finalOverflow<=2,label+": final-sheet rule overflows");

  await page.evaluate(()=>{document.querySelector("#qaReadabilityFeature")?.remove();go(9)});
  await page.waitForTimeout(200);
  const spells=await page.evaluate(()=>{
    const entry=[...document.querySelectorAll(".sref-entry")].find(e=>e.querySelector(".sr-rule-content"));
    if(!entry)return null;
    const rule=entry.querySelector(".sr-rule-content"),cs=getComputedStyle(rule);
    return {font:parseFloat(cs.fontSize),line:parseFloat(cs.lineHeight),
      overflow:document.documentElement.scrollWidth-innerWidth,
      textLength:rule.innerText.trim().length};
  });
  assert(spells&&spells.textLength>20,label+": full spell rules missing");
  assert(spells.font>=(width<=520?15:15.5)&&spells.line/spells.font>=1.75,label+": spell rules below readability gate");
  assert(spells.overflow<=2,label+": spell page horizontal overflow");
  await page.screenshot({path:path.join(OUT,label+"-spells.png"),fullPage:false});
  assert.deepEqual(errors,[],label+": javascript errors");
  await page.close();
  return {label,width,height,basic,origin,features,spells,pass:true};
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const outputs=[];
    for(const [w,h,name] of [[1440,900,"desktop"],[480,760,"narrow"],[390,844,"mobile"]]){
      outputs.push(await run(browser,w,h,name));
    }
    fs.writeFileSync(path.join(OUT,"results.json"),JSON.stringify(outputs,null,2));
    console.log(JSON.stringify({pass:true,viewports:outputs.map(x=>({label:x.label,width:x.width,bodyPx:x.basic.body.font,cardPx:x.basic.card.font,speciesPx:x.origin.font,finalPx:x.features.finalFont,spellPx:x.spells.font}))},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

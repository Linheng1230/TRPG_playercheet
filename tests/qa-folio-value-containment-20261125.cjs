"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18976").replace(/\/$/,"");
const out=process.env.QA_ART_OUT||path.join(__dirname,"..","tmp","qa-folio-value-containment");
fs.mkdirSync(out,{recursive:true});
const cases=[["2024",320],["2024",390],["2024",480],["2024",768],["2024",1100],["2024",1440],["2024",1648],["2024",2560],["2014",1440]];
const fixture=path.join(__dirname,"..","assets","species-watercolor","halfling.webp");
async function scan(page){
 return page.evaluate(()=>{
  const sheet=document.querySelector("#finalSheet");
  const list=[...sheet.querySelectorAll(".fs-statrow .sv,.fs-abrow .am,.wcs-equipment-ac")];
  const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
  const bad=[], details=[];
  for(const el of list){
    const inner=el.querySelector(":scope > .wcs-badge-content");
    if(!inner){bad.push({kind:"missing-safe-zone",value:el.textContent});continue}
    const zone=rect(inner),outer=rect(el),style=getComputedStyle(el),kind=el.dataset.wcsBadge;
    const glyphs=[...inner.querySelectorAll(".wcs-badge-main,.wcs-badge-max,.wcs-badge-label")].map(n=>{
      const range=document.createRange();range.selectNodeContents(n);
      const r=range.getBoundingClientRect();return {text:n.textContent,left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,font:getComputedStyle(n).fontSize};
    });
    if(!glyphs.length||zone.width<=0||zone.height<=0)bad.push({kind:"empty",value:el.textContent});
    for(const g of glyphs){
      if(g.left<zone.left-1||g.right>zone.right+1||g.top<zone.top-1||g.bottom>zone.bottom+1)bad.push({kind:"outside-painted-safe-zone",badge:kind,zone,g});
      if(g.left<outer.left-1||g.right>outer.right+1||g.top<outer.top-1||g.bottom>outer.bottom+1)bad.push({kind:"outside-frame",badge:kind,outer,g});
    }
    if(!["movement","perception","ability","metric"].includes(kind)&&!el.hasAttribute("data-wcs-long")&&(!style.backgroundImage.includes("folio-")||style.backgroundImage.includes(".svg")))bad.push({kind:"not-painted-frame",badge:kind,background:style.backgroundImage});
    // Independent artwork interior coordinates, not the implementation's CSS safe zone.
    const art=kind==="heart"?[.25,.27,.75,.66]:["shield","equipment"].includes(kind)?[.30,.20,.70,.65]:null;
    if(art&&!el.hasAttribute("data-wcs-long")){
      for(const g of glyphs)if(g.left<outer.left+outer.width*art[0]-1||g.right>outer.left+outer.width*art[2]+1||g.top<outer.top+outer.height*art[1]-1||g.bottom>outer.top+outer.height*art[3]+1)bad.push({kind:"actual-painted-interior",badge:kind,g,outer});
    }
    if(["ability","metric"].includes(kind)&&(!getComputedStyle(el,"::before").backgroundImage.includes("assets/")||style.backgroundImage!=="none"))bad.push({kind:"repeated-value-frame",badge:kind,bg:style.backgroundImage,pseudo:getComputedStyle(el,"::before").backgroundImage,content:getComputedStyle(el,"::before").content});
    details.push({kind,zone,outer,glyphs,background:style.backgroundImage});
  }
  const sectionTitles=[...sheet.querySelectorAll(".fs-sec>.st,.play-box>.pt,.ss-title")];
  for(const el of sectionTitles)if(!el.dataset.wcsSection||getComputedStyle(el).borderImageSource!=="none")bad.push({kind:"repeated-scroll",title:el.textContent});
  const buttons=[...sheet.querySelectorAll(".sgl-actions button")];
  const luminance=c=>{const rgb=c.match(/[\d.]+/g).slice(0,3).map(x=>{const v=Number(x)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2]};
  for(const b of buttons){const st=getComputedStyle(b),a=luminance(st.color),z=luminance(st.backgroundColor),ratio=(Math.max(a,z)+.05)/(Math.min(a,z)+.05);if(ratio<4.5||Number(st.opacity)<.99)bad.push({kind:"unreadable-gear-button",text:b.textContent,ratio,color:st.color,bg:st.backgroundColor,opacity:st.opacity});}
  const titles=[...sheet.querySelectorAll(".fs-sec>.st,.play-box>.pt,.ss-title,.fs-statrow .sl,.fs-abrow .as")];
  for(const title of titles){
    if(!title.getClientRects().length)continue;
    const box=rect(title),style=getComputedStyle(title),p=k=>parseFloat(style[k])||0;
    const safe={left:box.left+p("paddingLeft")-1,right:box.right-p("paddingRight")+1,top:box.top-1,bottom:box.bottom+1};
    for(const node of title.childNodes){
      if(node.nodeType!==3||!node.textContent.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const g of range.getClientRects()){
        if(g.left<safe.left-1||g.right>safe.right+1||g.top<safe.top-1||g.bottom>safe.bottom+1)bad.push({kind:"label-overflow",title:title.textContent,safe,g:{left:g.left,right:g.right,top:g.top,bottom:g.bottom}});
      }
    }
  }
  return {count:list.length,titleCount:titles.length,buttonCount:buttons.length,bad,details,overflow:document.documentElement.scrollWidth-innerWidth,scene:getComputedStyle(sheet,"::before").backgroundImage,portrait:sheet.querySelector(".portrait-col")?.parentElement===sheet};
 });
}
(async()=>{const browser=await chromium.launch({headless:true});const reports=[];try{
 for(const [edition,width] of cases){
  const ctx=await browser.newContext({viewport:{width,height:930}});const page=await ctx.newPage();const errors=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
  await page.goto(base+"/index.html?view=sheet",{waitUntil:"networkidle"});
  await page.waitForFunction(()=>typeof go==="function"&&typeof renderFinal==="function");
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  await page.evaluate(edition=>{
    S.ruleset=edition;syncRulesetUI();S.id=newId();S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=3;S.classLevels={[S.cls.n]:3};S.sp=(edition==="2024"?SPECIES_2024:SPECIES_2014).find(c=>c.n==="半身人")||(edition==="2024"?SPECIES_2024:SPECIES_2014)[0];S.bg=(edition==="2024"?BACKGROUNDS_2024:BACKGROUNDS_2014)[0];S.base={str:12,dex:15,con:12,int:7,wis:19,cha:11};document.getElementById("fName").value="芬恩・野足";go(7);
  },edition);
  await page.locator("#finalJumpNav").waitFor({state:"visible"});
  await page.waitForTimeout(100);
  const baseline=await scan(page);
  if(process.env.QA_NEGATIVE==="1"){
    await page.evaluate(()=>{S.gear.purchases={...S.gear.purchases,"w:長棍":1,"a:盾牌":1};renderFinal()});
    await page.waitForTimeout(120);
    const old=await scan(page);
    assert(old.bad.some(x=>x.kind==="repeated-scroll"),"old repeated scroll must be rejected");
    assert(old.bad.some(x=>x.kind==="unreadable-gear-button"),"old white/low contrast gear buttons must be rejected");
    console.log("NEGATIVE PASS: old production rejected",old.bad.map(x=>x.kind).filter((x,i,a)=>a.indexOf(x)===i).join(", "));break
  }
  assert.equal(baseline.count,15);assert.equal(baseline.bad.length,0,JSON.stringify(baseline.bad));assert(baseline.overflow<=2,JSON.stringify(baseline));
  const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator("#pPick").click()]);
  await chooser.setFiles(fixture);await page.waitForFunction(()=>document.querySelector("#portraitFrame img")?.complete&&S.portrait?.startsWith("data:image/"));await page.waitForTimeout(120);
  const portrait=await scan(page);assert.equal(portrait.bad.length,0,JSON.stringify(portrait.bad));assert(portrait.overflow<=2);if(width>=1100){assert(portrait.portrait);assert(portrait.scene.includes("folio-landscape.webp"))}
  const hierarchy=await page.evaluate(async()=>{
    const nav=document.querySelector("#stepNav .nav-primary"),button=nav.querySelector("button:not(.nav-ux-back)"),jump=document.querySelector("#finalJumpNav");
    const sheet=document.querySelector("#finalSheet"),stat=sheet.querySelector(".fs-statrow .stat-box");
    const art=new Image();art.src="assets/watercolor-ornaments/folio-landscape.webp";await art.decode();
    const motifs=[3,4,5,6,7,8].map(i=>getComputedStyle(sheet.querySelector(".fs-statrow .stat-box:nth-child("+i+") .sv"),"::before").backgroundImage);
    const abilityMotifs=[...sheet.querySelectorAll(".fs-abrow .am")].map(el=>getComputedStyle(el,"::before").backgroundImage);
    const headings=[...sheet.querySelectorAll("[data-wcs-section]:not([data-wcs-section=plain])")];
    const headingMotifs=headings.map(el=>getComputedStyle(el,"::before").backgroundImage);
    for(const src of new Set([...motifs,...abilityMotifs,...headingMotifs])){
      const url=src.match(/url\("([^"]+)"\)/)?.[1];if(!url)throw new Error("Missing artwork "+src);
      const img=new Image();img.src=url;await img.decode();
    }
    const headingStyles=[...new Set(headings.map(el=>getComputedStyle(el).backgroundImage))];
    return {navDir:getComputedStyle(button).flexDirection,navIconHeight:parseFloat(getComputedStyle(button,"::before").height),navHeight:nav.getBoundingClientRect().height,jumpHeight:jump.getBoundingClientRect().height,metricDisplay:getComputedStyle(stat).display,metricHeight:stat.getBoundingClientRect().height,railTop:parseFloat(getComputedStyle(sheet.querySelector(".portrait-col")).top),motifs,abilityMotifs,headingMotifs,headingStyles,sceneSize:[art.naturalWidth,art.naturalHeight]};
  });
  assert.deepEqual(hierarchy.sceneSize,[690,414],"castle artwork decodes");
  assert.equal(new Set(hierarchy.motifs).size,6,"distinct metric artwork");
  assert.equal(new Set(hierarchy.abilityMotifs).size,6,"distinct ability artwork");
  assert(new Set(hierarchy.headingMotifs).size>=6,"section icons must not be generic");
  assert(hierarchy.headingStyles.length>=3,"section style hierarchy");
  assert(hierarchy.motifs.every(x=>/watercolor-icons-alpha|academy-watercolor-art/.test(x)));
  if(width>=1400){
    assert.equal(hierarchy.navDir,"column");assert(hierarchy.navIconHeight>=40);
    assert.equal(hierarchy.metricDisplay,"grid");
    assert(hierarchy.metricHeight<=155,JSON.stringify(hierarchy));
    assert(hierarchy.railTop>=hierarchy.navHeight+hierarchy.jumpHeight-1,JSON.stringify(hierarchy));
  }

  await page.locator('#finalJumpNav [data-sheet-jump="overview"]').click();
  await page.waitForTimeout(1500);
  await page.screenshot({path:path.join(out,edition+"-"+width+"-overview.png")});
  // Stress real DOM nodes without changing canonical gameplay calculation; values
  // deliberately exceed normal D&D HP to prove the layout is not tuned to 25/25.
  const original=await page.evaluate(()=>{
    const hp=document.querySelector("#finalSheet .fs-statrow .sv"),main=hp.querySelector(".wcs-badge-main"),max=hp.querySelector(".wcs-badge-max");
    const original=[main.textContent,max.textContent];
    main.textContent="9999";max.textContent=" / 9999";
    const content=main.parentElement;content.style.setProperty("--wcs-value-em","3.13");content.style.setProperty("--wcs-max-em","4.1");
    return original;
  });
  const stress=await scan(page);assert.equal(stress.bad.length,0,JSON.stringify(stress.bad));
  await page.evaluate(()=>renderFinal());await page.waitForTimeout(120);
  if(edition==="2024"){
    await page.evaluate(()=>{S.gear.purchases={...S.gear.purchases,"w:長棍":1,"a:盾牌":1};renderFinal()});
    await page.waitForTimeout(120);
    assert(await page.locator(".sgl-actions button").count()>=4,"equipped gear fixture");
  }
  await page.locator('#finalJumpNav [data-sheet-jump="equipment"]').click();
  const before=Number(await page.locator(".wcs-equipment-ac strong").textContent());await page.locator("#shieldChk").check();await page.waitForTimeout(120);
  assert.equal(Number(await page.locator(".wcs-equipment-ac strong").textContent()),before+2);
  const gear=await scan(page);assert.equal(gear.bad.length,0,JSON.stringify(gear.bad));assert(gear.overflow<=2);
  if(edition==="2024"){
    assert(gear.buttonCount>=4);
    const off=page.locator('[data-sgl-unequip="a:盾牌"]');await off.click();await page.waitForTimeout(120);
    assert.equal(Number(await page.locator(".wcs-equipment-ac strong").textContent()),before);
    await page.locator('[data-sgl-equip="a:盾牌"]').click();await page.waitForTimeout(120);
    assert.equal(Number(await page.locator(".wcs-equipment-ac strong").textContent()),before+2);
    assert.equal((await scan(page)).bad.length,0);
  }
  await page.screenshot({path:path.join(out,edition+"-"+width+"-equipment.png")});
  if(edition==="2024"){
    await page.locator(".sgl-owned").scrollIntoViewIfNeeded();await page.waitForTimeout(300);
    await page.screenshot({path:path.join(out,edition+"-"+width+"-owned-gear.png")});
  }
  await page.emulateMedia({media:"print"});await page.waitForTimeout(100);assert.equal(await page.locator("#finalSheet .sheet-head .portrait-col").count(),1);assert(!(await page.locator(".wcs-equipment-ac").isVisible()));
  await page.emulateMedia({media:"screen"});await page.waitForTimeout(100);
  assert.deepEqual(errors,[]);
  reports.push({edition,width,baseline,portrait,stress,gear,hierarchy});
  console.log("PASS",edition,width,"15 values, normal/portrait/stress/equipment, print and AC");
  await ctx.close();
 }
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(reports,null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

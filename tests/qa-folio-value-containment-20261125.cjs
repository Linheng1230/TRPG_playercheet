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
    if(!["movement","perception"].includes(kind)&&!el.hasAttribute("data-wcs-long")&&(!style.backgroundImage.includes("folio-")||style.backgroundImage.includes(".svg")))bad.push({kind:"not-painted-frame",badge:kind,background:style.backgroundImage});
    details.push({kind,zone,outer,glyphs,background:style.backgroundImage});
  }
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
  return {count:list.length,titleCount:titles.length,bad,details,overflow:document.documentElement.scrollWidth-innerWidth,scene:getComputedStyle(sheet,"::before").backgroundImage,portrait:sheet.querySelector(".portrait-col")?.parentElement===sheet};
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
  if(process.env.QA_NEGATIVE==="1"){assert(baseline.bad.length>0,"old site unexpectedly passed");console.log("NEGATIVE PASS: rejected",baseline.bad.length,"missing/overflowed safe zones");break}
  assert.equal(baseline.count,15);assert.equal(baseline.bad.length,0,JSON.stringify(baseline.bad));assert(baseline.overflow<=2,JSON.stringify(baseline));
  const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator("#pPick").click()]);
  await chooser.setFiles(fixture);await page.waitForFunction(()=>document.querySelector("#portraitFrame img")?.complete&&S.portrait?.startsWith("data:image/"));await page.waitForTimeout(120);
  const portrait=await scan(page);assert.equal(portrait.bad.length,0,JSON.stringify(portrait.bad));assert(portrait.overflow<=2);if(width>=1100){assert(portrait.portrait);assert(portrait.scene.includes("folio-landscape.webp"))}
  const hierarchy=await page.evaluate(async()=>{
    const nav=document.querySelector("#stepNav .nav-primary"),button=nav.querySelector("button:not(.nav-ux-back)"),jump=document.querySelector("#finalJumpNav");
    const sheet=document.querySelector("#finalSheet"),stat=sheet.querySelector(".fs-statrow .stat-box");
    const art=new Image();art.src="assets/watercolor-ornaments/folio-landscape.webp";await art.decode();
    const motifs=[3,5,7,8].map(i=>getComputedStyle(sheet.querySelector(".fs-statrow .stat-box:nth-child("+i+") .sl"),"::before").backgroundImage);
    return {navDir:getComputedStyle(button).flexDirection,navIconHeight:parseFloat(getComputedStyle(button,"::before").height),navHeight:nav.getBoundingClientRect().height,jumpHeight:jump.getBoundingClientRect().height,metricDisplay:getComputedStyle(stat).display,metricHeight:stat.getBoundingClientRect().height,railTop:parseFloat(getComputedStyle(sheet.querySelector(".portrait-col")).top),motifs,sceneSize:[art.naturalWidth,art.naturalHeight]};
  });
  assert.deepEqual(hierarchy.sceneSize,[690,414],"castle artwork decodes");
  assert.equal(new Set(hierarchy.motifs).size,4,"distinct metric artwork");
  assert(hierarchy.motifs.every(x=>x.includes("watercolor-icons-alpha/")));
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
  await page.locator('#finalJumpNav [data-sheet-jump="equipment"]').click();
  const before=Number(await page.locator(".wcs-equipment-ac strong").textContent());await page.locator("#shieldChk").check();await page.waitForTimeout(120);
  assert.equal(Number(await page.locator(".wcs-equipment-ac strong").textContent()),before+2);
  const gear=await scan(page);assert.equal(gear.bad.length,0,JSON.stringify(gear.bad));assert(gear.overflow<=2);
  await page.screenshot({path:path.join(out,edition+"-"+width+"-equipment.png")});
  await page.emulateMedia({media:"print"});await page.waitForTimeout(100);assert.equal(await page.locator("#finalSheet .sheet-head .portrait-col").count(),1);assert(!(await page.locator(".wcs-equipment-ac").isVisible()));
  await page.emulateMedia({media:"screen"});await page.waitForTimeout(100);
  assert.deepEqual(errors,[]);
  reports.push({edition,width,baseline,portrait,stress,gear,hierarchy});
  console.log("PASS",edition,width,"15 values, normal/portrait/stress/equipment, print and AC");
  await ctx.close();
 }
 fs.writeFileSync(path.join(out,"report.json"),JSON.stringify(reports,null,2));
}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});

const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 for(const viewport of [{width:1440,height:900},{width:480,height:844},{width:390,height:844},{width:360,height:800}]){
  const page=await browser.newPage({viewport});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  await page.evaluate(()=>{S.ruleset="2024";syncRulesetUI();go(8);refTab="gfeat";renderRef()});
  assert.equal(await page.locator('[data-gfeat-quick="1"]').count(),1,"5R general-feat quick module missing");
  assert.equal((await page.locator('[data-gf-source="phb2024"]').innerText()).trim(),"5R 核心（PHB 2024）");
  const total=await page.locator('tr[data-gfeat-id]').count();
  const sourceTotal=await page.evaluate(()=>GFEATS_2024.length);
  assert.equal(total,sourceTotal,"default general-feat filter must show all PHB2024 feats");
  await page.locator('[data-gf-ability="str"]').click();
  const str=await page.evaluate(()=>({
   rows:[...document.querySelectorAll('tr[data-gfeat-id]')].map(x=>x.dataset.gfeatId),
   expected:GFEATS_2024.filter(f=>gfeatAbilities5R(f).includes("str")).map(f=>f.id||f.n),
   active:document.querySelector('[data-gf-ability="str"]')?.classList.contains("active")
  }));
  assert.equal(str.active,true);
  assert.deepEqual(str.rows,str.expected,"Strength quick filter does not match canonical feat ability metadata");
  await page.locator('[data-gf-ability="none"]').click();
  const none=await page.evaluate(()=>({
   rows:[...document.querySelectorAll('tr[data-gfeat-id]')].map(x=>x.dataset.gfeatId),
   expected:GFEATS_2024.filter(f=>gfeatAbilities5R(f).length===0).map(f=>f.id||f.n)
  }));
  assert.deepEqual(none.rows,none.expected,"no-ability quick filter mixed feats with ability increases");
  await page.locator('[data-gf-ability="all"]').click();
  await page.locator("#gfeatRefQ").fill("法術");
  await page.waitForTimeout(180);
  const searched=await page.evaluate(()=>({
   rows:[...document.querySelectorAll('tr[data-gfeat-id]')].map(x=>x.dataset.gfeatId),
   expected:filteredGeneralFeats5R().map(f=>f.id||f.n),
   q:gfeatRefFilter.q
  }));
  assert.equal(searched.q,"法術");
  assert.deepEqual(searched.rows,searched.expected,"general feat search UI diverged from filter state");
  await page.locator("#gfeatRefQ").fill("");
  await page.waitForTimeout(120);
  const css=await page.evaluate(()=>{
   const c=s=>{const e=document.querySelector(s),x=getComputedStyle(e);return {bg:x.backgroundColor,color:x.color,border:x.borderTopColor}};
   const wrap=document.querySelector(".feat-ref-wrap"),table=document.querySelector(".feat-ref-table"),rows=[...document.querySelectorAll("tr[data-gfeat-id]")],heads=[...table.querySelectorAll("th")];
   const first=rows[0],effectStyle=getComputedStyle(first.children[3]),titleStyle=getComputedStyle(first.children[0]);
   const effectBefore=getComputedStyle(first.children[3],"::before");
   const source=new Map((GFEATS_2024||[]).map(f=>[String(f.id||f.n),String(f.d||"").replace(/\s+/g,"")]));
   return {
    input:c("#gfeatRefQ"),active:c('.ref-quick-chips button.active'),body:document.body.scrollWidth,viewport:innerWidth,
    wrapOverflow:wrap.scrollWidth-wrap.clientWidth,tableOverflow:table.scrollWidth-table.clientWidth,
    nestedScroll:!!wrap.closest(".tbl-scroll"),
    effectOverflow:Math.max(...rows.map(r=>{const td=r.children[3];return td.scrollWidth-td.clientWidth})),
    effectWhiteSpace:[...new Set(rows.map(r=>getComputedStyle(r.children[3]).whiteSpace))],
    rowGap:parseFloat(getComputedStyle(table).borderSpacing.split(" ")[1]||getComputedStyle(table).borderSpacing)||0,
    headerAligns:heads.map(h=>getComputedStyle(h).textAlign),
    headerPositions:heads.map(h=>getComputedStyle(h).position),
    cellAligns:[0,1,2,3].map(i=>getComputedStyle(first.children[i]).textAlign),
    effectFont:parseFloat(effectStyle.fontSize),effectLine:parseFloat(effectStyle.lineHeight)/parseFloat(effectStyle.fontSize),
    titleFont:parseFloat(titleStyle.fontSize),titleWeight:+titleStyle.fontWeight||0,
    badgeCount:table.querySelectorAll(".feat-badge").length,
    firstAttrBadges:first.children[1].querySelectorAll(".feat-badge").length,
    firstPrereqBadges:first.children[2].querySelectorAll(".feat-badge").length,
    rowDisplay:getComputedStyle(first).display,
    mobileEffectLabel:effectBefore.content,
    fullTextMismatches:rows.filter(r=>String(r.children[3].innerText||"").replace(/\s+/g,"")!==source.get(r.dataset.gfeatId)).map(r=>r.dataset.gfeatId)
   };
  });
  assert.equal(css.input.bg,"rgb(251, 247, 236)");
  assert.equal(css.input.color,"rgb(74, 64, 53)");
  assert.equal(css.input.border,"rgb(165, 141, 99)");
  assert.equal(css.active.bg,"rgb(154, 67, 59)");
  assert.equal(css.active.color,"rgb(247, 241, 225)");
  assert(css.body<=css.viewport+2,"general-feat quick module horizontal overflow at "+viewport.width);
  assert(css.wrapOverflow<=2,"general-feat table wrapper horizontal overflow at "+viewport.width+": "+css.wrapOverflow);
  assert(css.tableOverflow<=2,"general-feat table horizontal overflow at "+viewport.width+": "+css.tableOverflow);
  assert.equal(css.nestedScroll,false,"general-feat table must not use the generic horizontal-scroll wrapper");
  assert(css.effectOverflow<=2,"general-feat effect cells overflow horizontally at "+viewport.width+": "+css.effectOverflow);
  assert.deepEqual(css.effectWhiteSpace,["normal"],"general-feat effect text must wrap normally");
  assert.deepEqual(css.fullTextMismatches,[],"general-feat effect text must remain complete");
  assert(css.badgeCount>=sourceTotal*2,"general-feat metadata badges missing at "+viewport.width);
  assert(css.firstAttrBadges>=1&&css.firstPrereqBadges===1,"general-feat metadata badge structure invalid");
  assert(css.effectFont>=15.5,"general-feat effect text too small at "+viewport.width+": "+css.effectFont);
  assert(css.effectLine>=1.75,"general-feat effect line-height too tight at "+viewport.width+": "+css.effectLine);
  assert(css.titleFont>=14.5&&css.titleWeight>=700,"general-feat title hierarchy too weak at "+viewport.width);
  if(viewport.width>700){
   assert.deepEqual(css.headerAligns,["center","center","center","center"],"desktop feat headers must all be centered");
   assert.deepEqual(css.headerPositions,["sticky","sticky","sticky","sticky"],"desktop feat headers should remain visible while scrolling");
   assert.deepEqual(css.cellAligns,["center","center","center","left"],"desktop feat cells should center metadata and left-align long effect text");
   assert(css.rowGap>=8,"desktop general-feat rows should retain visible separation");
  }else{
   assert.equal(css.rowDisplay,"grid","mobile feat rows should render as cards");
   assert.deepEqual(css.cellAligns,["center","center","center","left"],"mobile feat cards should center metadata and left-align effect text");
   assert(["\"效果\"","'效果'"].includes(css.mobileEffectLabel),"mobile feat cards should label the effect section");
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log(JSON.stringify({pass:true},null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
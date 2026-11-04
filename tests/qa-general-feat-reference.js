const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
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
  const searched=await page.evaluate(()=>({
   rows:[...document.querySelectorAll('tr[data-gfeat-id]')].map(x=>x.dataset.gfeatId),
   expected:filteredGeneralFeats5R().map(f=>f.id||f.n),
   q:gfeatRefFilter.q
  }));
  assert.equal(searched.q,"法術");
  assert.deepEqual(searched.rows,searched.expected,"general feat search UI diverged from filter state");
  const css=await page.evaluate(()=>{
   const c=s=>{const e=document.querySelector(s),x=getComputedStyle(e);return {bg:x.backgroundColor,color:x.color,border:x.borderTopColor}};
   return {input:c("#gfeatRefQ"),active:c('.ref-quick-chips button.active'),body:document.body.scrollWidth,viewport:innerWidth};
  });
  assert.equal(css.input.bg,"rgb(251, 247, 236)");
  assert.equal(css.input.color,"rgb(74, 64, 53)");
  assert.equal(css.input.border,"rgb(165, 141, 99)");
  assert.equal(css.active.bg,"rgb(154, 67, 59)");
  assert.equal(css.active.color,"rgb(247, 241, 225)");
  assert(css.body<=css.viewport+2,"general-feat quick module horizontal overflow at "+viewport.width);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log(JSON.stringify({pass:true},null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
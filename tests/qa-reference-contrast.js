const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const out=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();go(8);refTab="ability";renderRef();
   const css=sel=>{const e=document.querySelector(sel);if(!e)return null;const s=getComputedStyle(e);return {bg:s.backgroundColor,color:s.color,border:s.borderTopColor}};
   return {
    activeTab:css("#refTabs button.active"),
    input:css("#abilityRefQ"),
    activeMode:css(".ability-ref-modes button.active"),
    inactiveMode:css(".ability-ref-modes button:not(.active)"),
    body:document.body.scrollWidth,viewport:innerWidth
   };
  });
  assert.deepEqual(errors,[]);
  assert(out.activeTab,"active reference tab missing");
  assert.equal(out.activeTab.bg,"rgb(154, 67, 59)");
  assert.equal(out.activeTab.color,"rgb(247, 241, 225)");
  assert(out.input,"ability search input missing");
  assert.equal(out.input.bg,"rgb(251, 247, 236)");
  assert.equal(out.input.color,"rgb(74, 64, 53)");
  assert.equal(out.input.border,"rgb(165, 141, 99)");
  assert(out.activeMode,"active ability mode missing");
  assert.equal(out.activeMode.bg,"rgb(154, 67, 59)");
  assert.equal(out.activeMode.color,"rgb(247, 241, 225)");
  assert(out.inactiveMode,"inactive ability mode missing");
  assert.equal(out.inactiveMode.color,"rgb(94, 82, 67)");
  assert(out.body<=out.viewport+2,"horizontal overflow at "+viewport.width);
  await page.close();
 }
 console.log(JSON.stringify({pass:true},null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
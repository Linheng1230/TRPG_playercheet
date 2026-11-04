const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 for(const viewport of [{width:1440,height:900},{width:480,height:800},{width:390,height:844}]){
  const page=await browser.newPage({viewport});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const out=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();go(8);refTab="weapon";renderRef();
   const tokens=[...new Set(WEAPONS.flatMap(w=>String(w[3]||"").replace(/\([^)]*\)|（[^）]*）/g,"").split("、")).map(x=>x.trim()).filter(x=>x&&x!=="—"))];
   const ids=[...document.querySelectorAll("[data-weapon-prop]")].map(x=>x.dataset.weaponProp);
   const rules=Object.fromEntries([...document.querySelectorAll("[data-weapon-prop]")].map(x=>[x.dataset.weaponProp,x.textContent.trim()]));
   const panel=document.querySelector(".weapon-prop-panel"),firstGroup=document.querySelector("#refBody .group-title");
   const lance=WEAPONS.find(w=>w[1]==="騎槍");
   return {
    tokens,missing:tokens.filter(x=>!WEAPON_PROPERTY_TOKEN_2024[x]),ids,rules,lance:lance?.[3]||"",
    beforeTable:!!(panel&&firstGroup&&(panel.compareDocumentPosition(firstGroup)&Node.DOCUMENT_POSITION_FOLLOWING)),
    body:document.body.scrollWidth,viewport:innerWidth,
    font:panel?parseFloat(getComputedStyle(panel.querySelector(".weapon-prop-rule")).fontSize):0
   };
  });
  assert.deepEqual(errors,[]);
  assert.deepEqual(out.missing,[],"weapon table contains property tokens without explanations: "+out.missing.join(", "));
  assert.equal(out.ids.length,10,"weapon property reference should include 9 properties plus range notation");
  for(const id of ["ammunition","finesse","heavy","light","loading","range","reach","thrown","two-handed","versatile"])assert(out.ids.includes(id),id+" rule missing");
  assert(out.rules["two-handed"].includes("必須用雙手持握"));
  assert(out.rules["heavy"].includes("力量低於 13")&&out.rules["heavy"].includes("敏捷低於 13"));
  assert(out.rules["light"].includes("附贈動作")&&out.rules["light"].includes("另一把不同的輕型武器"));
  assert(out.rules["range"].includes("一般射程")&&out.rules["range"].includes("長射程")&&out.rules["range"].includes("劣勢"));
  assert(out.rules["ammunition"].includes("每次攻擊消耗 1 枚")&&out.rules["ammunition"].includes("回收"));
  assert(out.lance.includes("雙手（騎乘時除外）"),"Lance mounted exception missing from weapon table");
  assert(out.beforeTable,"weapon property rules must appear before weapon tables");
  assert(out.font>=14,"weapon property rule text too small");
  assert(out.body<=out.viewport+2,"weapon reference horizontal overflow at "+viewport.width);
  await page.evaluate(()=>{S.ruleset="2014";syncRulesetUI();refTab="weapon";renderRef()});
  assert.equal(await page.locator(".weapon-prop-panel").count(),0,"2024 weapon-property block leaked into 2014 reference");
  await page.close();
 }
 console.log(JSON.stringify({pass:true},null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
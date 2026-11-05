const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
 const cases=[
  ["abilityRefQ",()=>{S.ruleset="2024";syncRulesetUI();go(8);refTab="ability";renderRef()}],
  ["gfeatRefQ",()=>{S.ruleset="2024";syncRulesetUI();go(8);refTab="gfeat";renderRef()}],
  ["itemRefQ",()=>{S.ruleset="2024";syncRulesetUI();go(8);refTab="item";renderRef()}],
  ["creatureRefQ",()=>{S.ruleset="2024";syncRulesetUI();go(8);refTab="creature";renderRef()}],
  ["shopQ",()=>{S.ruleset="2024";go(10);renderShop()}],
  ["srefQ",()=>{S.ruleset="2024";syncRulesetUI();go(9)}]
 ];
 const results=[];
 for(const [id,setup] of cases){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(URL,{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  await page.evaluate(setup);
  const q=page.locator("#"+id);
  await q.click();
  await q.fill("");
  await q.type("狼");
  await q.type("蛛");
  await page.waitForTimeout(180);
  const v1=await page.locator("#"+id).inputValue();
  const active1=await page.evaluate(()=>document.activeElement?.id);
  await page.locator("#"+id).press("Backspace");
  await page.waitForTimeout(180);
  const v2=await page.locator("#"+id).inputValue();
  const active2=await page.evaluate(()=>document.activeElement?.id);
  assert.equal(v1,"狼蛛",id+" failed two-character typing");
  assert.equal(active1,id,id+" lost focus after typing");
  assert.equal(v2,"狼",id+" failed Backspace");
  assert.equal(active2,id,id+" lost focus after Backspace");
  assert.deepEqual(errors,[],id+" page errors: "+errors.join(" | "));
  results.push({id,v1,v2});
  await page.close();
 }
 // IME composition guard on destructive-render searches.
 for(const id of ["abilityRefQ","gfeatRefQ","itemRefQ","creatureRefQ","shopQ"]){
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(URL,{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const setup=cases.find(x=>x[0]===id)[1];await page.evaluate(setup);
  const during=await page.evaluate(id=>{
    const el=document.getElementById(id);el.focus();el.value="";window.__sameSearch=el;
    el.dispatchEvent(new CompositionEvent("compositionstart",{bubbles:true,data:""}));
    el.value="狼";
    el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertCompositionText",data:"狼",isComposing:true}));
    return {same:document.getElementById(id)===window.__sameSearch,active:document.activeElement?.id,value:el.value};
  },id);
  assert.equal(during.same,true,id+" DOM replaced during IME composition");
  assert.equal(during.active,id,id+" lost focus during IME composition");
  assert.equal(during.value,"狼");
  await page.evaluate(id=>{
    const el=document.getElementById(id);
    el.dispatchEvent(new CompositionEvent("compositionend",{bubbles:true,data:"狼"}));
    el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:"狼",isComposing:false}));
  },id);
  await page.waitForTimeout(180);
  assert.equal(await page.locator("#"+id).inputValue(),"狼",id+" lost committed IME value");
  assert.equal(await page.evaluate(()=>document.activeElement?.id),id,id+" lost focus after IME commit");
  await page.close();
 }
 console.log(JSON.stringify({pass:true,results},null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
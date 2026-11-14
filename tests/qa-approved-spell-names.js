"use strict";
const {chromium}=require("playwright");
const assert=require("assert");
const fs=require("fs");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const approved={
  "True Strike": "克敵機先",
  "Vicious Mockery": "惡毒嘲笑",
  "Armor of Agathys": "艾嘉西斯之鎧",
  "Charm Person": "類人魅惑術",
  "Chromatic Orb": "繁彩球",
  "Create or Destroy Water": "造水／枯水術",
  "Hail of Thorns": "荊雹術",
  "Ice Knife": "冰刃術",
  "Mage Armor": "魔法護甲",
  "Ray of Sickness": "疾病射線",
  "Enlarge/Reduce": "變巨/縮小術",
  "Enthrall": "迷惑術",
  "Hold Person": "類人定身術",
  "Lesser Restoration": "次級復原術",
  "Magic Weapon": "魔法武器",
  "Animate Dead": "操縱死屍",
  "Conjure Barrage": "召喚箭雨",
  "Hunger of Hadar": "哈達之飢渴",
  "Spirit Guardians": "精魂守衛",
  "Conjure Elemental": "召喚元素生物",
  "Dominate Person": "支配類人術",
  "Hold Monster": "怪物定身術",
  "Heroes' Feast": "英雄盛宴",
  "Guiding Bolt": "光導箭"
};
const countUser=23;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [1440,480,390]){
   const page=await browser.newPage({viewport:{width,height:width===1440?900:844},acceptDownloads:true});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(URL+(URL.includes("?")?"&":"?")+"approved-spells-qa="+width,{waitUntil:"networkidle"});
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const out=await page.evaluate((expected)=>{
    S.ruleset="2024";syncRulesetUI();
    const rows=globalThis.SPELLS_2024_TUPLES;
    const issues=[],seen=new Set();
    if(rows.length!==391||SPELLS.length!==391)issues.push("canonical spell count");
    if(Object.keys(SPELL_DISPLAY_OVERRIDES_2024).length!==24)issues.push("unexpected label override count");
    for(const spell of SPELLS){
     const original=rows.find(x=>x[0]===spell.identifier);
     if(!original||original[2]!==spell.eng||original[3]!==spell.n)issues.push("canonical identity changed: "+spell.eng);
     const zh=expected[spell.eng]||spell.n;
     const display=spellNameText(spell);
     if(display!==zh+" "+spell.eng)issues.push("label: "+spell.eng+" "+display);
     if(spellDisplayZh2024(spell.n)!==zh)issues.push("human-readable name: "+spell.eng);
     if(expected[spell.eng]){
      seen.add(spell.eng);
      if(normalizeSpellName2024(zh)!==spell.n)issues.push("alias to canonical: "+spell.eng);
      if(!spellRefMatches(spell,zh))issues.push("search by new name: "+spell.eng);
      if(!spellRefMatches(spell,spell.n))issues.push("search by old name: "+spell.eng);
      if(!spellTipHTML(spell.n).includes(zh+" "+spell.eng))issues.push("tooltip: "+spell.eng);
      if(SPELL_DISPLAY_SOURCE_BY_NAME_2024[zh]!==spell.n)issues.push("display to canonical: "+spell.eng);
     }
    }
    for(const key of Object.keys(expected))if(!seen.has(key))issues.push("not found: "+key);
    const example=canonicalSpellText2024("法師護甲、克敵先擊、光導箭、冰刃術、變巨術/縮小術");
    for(const word of ["魔法護甲","克敵機先","光導箭","冰刃術","變巨/縮小術"])if(!example.includes(word))issues.push("feature text: "+word+" in "+example);
    // Keep the 2014 branch entirely independent of the 2024 display overlay.
    S.ruleset="2014";syncRulesetUI();
    for(const spell of SPELLS14){
      if(spellNameText(spell)!==spell.n)issues.push("2014 changed: "+spell.n);
    }
    S.ruleset="2024";syncRulesetUI();
    return {issues,canonicalCount:SPELLS.length,legacyCount:SPELLS14.length,approvedCount:seen.size-1,featureText:example};
   },approved);
   assert.deepStrictEqual(out.issues,[],"mapping: "+JSON.stringify(out));
   assert.strictEqual(out.approvedCount,countUser,"23 user approvals + 1 Guiding Bolt");
   await page.evaluate(()=>go(9));
   const search=page.locator("#srefQ");
   for(const [q,want] of [["類人魅惑術","類人魅惑術 Charm Person"],["精魂守衛","精魂守衛 Spirit Guardians"],["光導箭","光導箭 Guiding Bolt"]]){
    await search.fill(q);
    await page.waitForTimeout(160);
    const names=await page.locator(".sref-entry .sr-name").allTextContents();
    assert(names.some(n=>n.includes(want)),width+"px search "+q+": "+JSON.stringify(names));
   }
   await search.fill("魔法護甲");
   await page.waitForTimeout(130);
   const searchText=await page.locator("#srefBody").innerText();
   assert(searchText.includes("魔法護甲 Mage Armor"),"name not visible in actual reference DOM");
   const overflow=await page.evaluate(()=>Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth);
   assert(overflow<=3,width+"px page overflow "+overflow);
   if(process.env.QA_SCREENSHOT_DIR){
    fs.mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});
    await page.screenshot({path:process.env.QA_SCREENSHOT_DIR+"/selected-spell-names-"+width+".png",fullPage:false});
   }
   // Snapshot keeps old canonical strings even after the new names are displayed.
   const save=await page.evaluate(()=>{
    resetAll();S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="法師");S.level=3;S.classLevels={"法師":3};
    S.sp=SPECIES_2024.find(x=>x.n==="人類");
    S.bg=BACKGROUNDS_2024.find(x=>x.n==="賢者");
    S.base={str:8,dex:14,con:14,int:16,wis:12,cha:10};
    S.cantrips=new Set(["克敵先擊"]);
    S.spellbook=new Set(["法師護甲","繁綵球"]);
    S.prepared=new Set(["法師護甲","繁綵球"]);
    const before=serialize();
    const imported=deserialize(before);
    const after=serialize();
    return {imported,oldNames:{before:{cantrips:before.cantrips,spellbook:before.spellbook,prepared:before.prepared},after:{cantrips:after.cantrips,spellbook:after.spellbook,prepared:after.prepared}},newVisible:spellNameText("法師護甲")};
   });
   assert(save.imported.ok,"deserialization: "+JSON.stringify(save));
   for(const name of ["克敵先擊","法師護甲","繁綵球"]){
    assert(JSON.stringify(save.oldNames.before).includes(name),"original spell key missing: "+name);
    assert(JSON.stringify(save.oldNames.after).includes(name),"original spell key lost: "+name);
   }
   assert.strictEqual(save.newVisible,"魔法護甲 Mage Armor");
   assert.deepStrictEqual(errors,[],"runtime errors: "+JSON.stringify(errors));
   console.log("PASS "+width+"px: 23 approved + Guiding Bolt, 368 untouched, 2014, aliases, 391 IDs, UI search/tooltip, save roundtrip, no overflow");
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error("FAIL",e.stack||e);process.exit(1)});

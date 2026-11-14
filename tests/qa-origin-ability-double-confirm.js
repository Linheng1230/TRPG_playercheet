"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19759/index.html";
const base=[["str","15"],["dex","14"],["con","13"],["int","12"],["wis","10"],["cha","8"]];
function nav(page,i){return page.locator("#stepNav .nav-secondary button").nth(i)}
async function doubleCheck(page,selector,accept){
 let wording="";
 page.once("dialog",dialog=>{wording=dialog.message();return accept?dialog.accept():dialog.dismiss()});
 await page.locator(selector).click();
 assert(wording.includes("無法修改"),"double check dialog missing: "+wording);
}
async function begin(page,rs){
 await page.goto(URL+"?uat="+Date.now()+"-"+Math.random(),{waitUntil:"networkidle"});
 if(!await page.locator("#rulesetModal").isVisible())await page.locator("#btnRuleset").click();
 await page.locator('[data-ruleset="'+rs+'"]').click();
 await page.locator('#classGrid [data-class-name="德魯伊"]').click();
 await doubleCheck(page,"[data-step='0'] .class-confirm-controls button",true);
 await nav(page,1).click();
 await page.locator("#bgGrid button.pick-card").filter({hasText:"隱士"}).first().click();
}
async function attributes(page){
 await nav(page,2).click();
 for(const [key,value] of base)await page.locator('#abilityGrid select[data-ab="'+key+'"]').selectOption(value);
}
async function reload(page){
 await page.waitForTimeout(1500);
 await page.reload({waitUntil:"networkidle"});
 if(await page.locator("#rulesetModal").isVisible())await page.locator("#closeRuleset").click();
}
async function check2024(browser,width){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await begin(page,"2024");
 assert(await page.locator("#bgDetail").isVisible(),"bg preview before lock");
 await doubleCheck(page,".confirm-bg button",false);
 assert(await page.locator(".confirm-bg button").isEnabled(),"bg cancel unlocked");
 await doubleCheck(page,".confirm-bg button",true);
 assert.strictEqual(await page.locator(".confirm-bg button").count(),0,"no bg unlock");
 assert(await page.locator("#bgGrid button.pick-card").filter({hasText:"侍僧"}).first().isDisabled(),"other background disabled");
 await page.locator("#spGrid button.pick-card").filter({hasText:"精靈"}).first().click();
 assert(await page.locator(".confirm-sp button").isDisabled(),"species detail before final");
 await page.locator('[data-spch="eSkill"]').selectOption("求生");
 await page.locator('[data-spch="eLine"]').selectOption("卓爾");
 await page.locator('[data-spch="eCast"]').selectOption("wis");
 await doubleCheck(page,"[data-confirm-species-choices]",true);
 await doubleCheck(page,".confirm-sp button",false);
 assert(await page.locator(".confirm-sp button").isEnabled(),"sp cancel unlocked");
 await doubleCheck(page,".confirm-sp button",true);
 assert.strictEqual(await page.locator(".confirm-sp button").count(),0,"no sp unlock");
 assert(await page.locator("#spGrid button.pick-card").filter({hasText:"人類"}).first().isDisabled(),"other species disabled");
 await attributes(page);
 assert(await page.locator("#next2").isDisabled(),"cannot proceed without abilities confirm");
 assert(await page.locator("#confirmAbilities").isDisabled({timeout:3000}),"bonus missing disables ability confirm");
 await page.locator('[data-bk="b2"]').selectOption("wis");
 await page.locator('[data-bk="b1"]').selectOption("con");
 assert(await page.locator("#confirmAbilities").isEnabled(),"ability confirm enabled");
 await doubleCheck(page,"#confirmAbilities",false);
 assert(await page.locator('#abilityGrid select[data-ab="str"]').isEnabled(),"ability cancel stays editable");
 await doubleCheck(page,"#confirmAbilities",true);
 assert((await page.locator("#abilityConfirmBar").innerText()).includes("已最終確認"));
 assert.strictEqual(await page.locator("#confirmAbilities").count(),0);
 assert(await page.locator('[data-bk="b2"]').isDisabled(),"bonus locked");
 assert(await page.locator('#abilityGrid select[data-ab="str"]').isDisabled(),"base locked");
 assert(await page.locator('#methodTabs [data-m="roll"]').isDisabled(),"method locked");
 assert(await page.locator("#next2").isEnabled(),"next2 available");
 const saved=await page.evaluate(()=>serialize());
 assert(saved.bgConfirmed&&saved.spConfirmed&&saved.abilitiesConfirmed,"confirmed flags serialized");
 await reload(page);
 await nav(page,1).click();
 assert((await page.locator(".confirm-bg").innerText()).includes("已確認並鎖定"));
 assert((await page.locator(".confirm-sp").innerText()).includes("已確認並鎖定"));
 await nav(page,2).click();
 assert((await page.locator("#abilityConfirmBar").innerText()).includes("已最終確認"));
 assert(await page.locator('[data-bk="b1"]').isDisabled(),"persisted bonus locked");
 const restored=await page.evaluate(()=>serialize());
 assert.deepEqual(restored.base,saved.base);
 assert.deepEqual(restored.bonus,saved.bonus);
 assert(restored.bgConfirmed&&restored.spConfirmed&&restored.abilitiesConfirmed);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(overflow<=3,"2024 width "+width+" overflow "+overflow);
 assert.deepEqual(errors,[]);
 console.log("QA_PASS 2024 "+width+"px bg+species doublechecks, six attributes and bonus, reload persistence");
 await page.close();
}
async function check2014(browser,width){
 const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await begin(page,"2014");
 await page.locator('[data-bg14="lang1"]').selectOption({index:1});
 await doubleCheck(page,".confirm-bg button",true);
 await page.locator("#spGrid button.pick-card").filter({hasText:"半精靈"}).first().click();
 await doubleCheck(page,".confirm-sp button",true);
 await attributes(page);
 assert(await page.locator("#confirmAbilities").isDisabled(),"2014 flexible attributes required");
 await page.locator('[data-raceab="flex1"]').selectOption("str");
 await page.locator('[data-raceab="flex2"]').selectOption("dex");
 assert(await page.locator("#confirmAbilities").isEnabled(),"2014 flex complete");
 await doubleCheck(page,"#confirmAbilities",true);
 assert(await page.locator('[data-raceab="flex1"]').isDisabled(),"2014 racial bonus locked");
 await nav(page,3).click();
 assert(await page.locator('[data-raceskill="hSkill"]').isEnabled(),"deferred racial skill still editable");
 await page.locator('[data-raceskill="hSkill"]').selectOption("求生");
 await page.locator('[data-raceskill="eSkill"]').selectOption("洞悉");
 assert((await page.locator('#skillGrid [data-skill="求生"]').innerText()).includes("已擁有"));
 await reload(page);
 await nav(page,2).click();
 assert((await page.locator("#abilityConfirmBar").innerText()).includes("已最終確認"));
 assert(await page.locator('[data-raceab="flex2"]').isDisabled());
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 assert(overflow<=3,"2014 width "+width+" overflow "+overflow);
 assert.deepEqual(errors,[]);
 console.log("QA_PASS 2014 "+width+"px bg+species locks, deferred species abilities, skill choices, reload");
 await page.close();
}
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{for(const width of [1440,390]){await check2024(browser,width);await check2014(browser,width)}}
 finally{await browser.close()}
})().catch(e=>{console.error("QA_FAIL",e.stack||e);process.exit(1)});

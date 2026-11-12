"use strict";
const assert=require("assert"),path=require("path"),{chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:19497/index.html";
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport});
   const errors=[];page.on("pageerror",e=>errors.push(String(e)));
   await page.goto(URL+"?class-starter-test="+viewport.width,{waitUntil:"networkidle"}); if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const initial=await page.evaluate(()=>{
    resetAll(); S.ruleset="2024";syncRulesetUI();
    S.cls=CLASSES.find(x=>x.n==="遊俠");S.bg=BACKGROUNDS.find(x=>x.n==="隱士");
    S.base={str:10,dex:15,con:14,int:10,wis:15,cha:8};
    S.gear={armor:"",unarmored:"auto",shield:false,weapons:[],miscAC:0,miscLabel:"",items:"",gold:{pp:0,gp:0,sp:0,cp:0},purchases:{}};
    renderFinal();go(7);
    return {classButtons:[...document.querySelectorAll("[data-classgear]")].map(x=>x.dataset.classgear),bgButtons:document.querySelectorAll("[data-bggear]").length};
   });
   assert.deepStrictEqual(initial.classButtons,["A","B"],"ranger buttons");
   assert.strictEqual(initial.bgButtons,2);
   await page.locator('[data-classgear="A"]').click();
   const afterClass=await page.evaluate(()=>({gold:S.gear.gold.gp,cls:S.gear.classPackage24,armor:S.gear.armor,weapons:S.gear.weapons,buttons:document.querySelectorAll("[data-classgear]").length,edit:document.querySelectorAll("[data-classgear-edit]").length}));
   assert.strictEqual(afterClass.gold,7);assert.strictEqual(afterClass.cls,"遊俠");assert.strictEqual(afterClass.armor,"鑲釘皮甲");assert(afterClass.weapons.includes("長弓"));assert.strictEqual(afterClass.buttons,0);assert.strictEqual(afterClass.edit,1);
   await page.locator('[data-bggear="B"]').click();
   const afterBoth=await page.evaluate(()=>({gold:S.gear.gold.gp,bg:S.gear.bgPackage24,bgButtons:document.querySelectorAll("[data-bggear]").length,bgEdit:document.querySelectorAll("[data-bggear-edit]").length,serialized:serialize()}));
   assert.strictEqual(afterBoth.gold,57);assert.strictEqual(afterBoth.bg,"隱士");assert.strictEqual(afterBoth.bgButtons,0);assert.strictEqual(afterBoth.bgEdit,1);
   const round=await page.evaluate(save=>{const ok=deserialize(save).ok;renderFinal();return {ok,cl:S.gear.classPackage24,bg:S.gear.bgPackage24,gp:S.gear.gold.gp,clsEdit:document.querySelectorAll("[data-classgear-edit]").length,bgEdit:document.querySelectorAll("[data-bggear-edit]").length}},afterBoth.serialized);
   assert(round.ok);assert.strictEqual(round.gp,57);assert.strictEqual(round.clsEdit,1);assert.strictEqual(round.bgEdit,1);
   await page.locator("[data-classgear-edit]").click();
   assert.strictEqual(await page.locator('[data-classgear="B"]').count(),1);
   const back=await page.evaluate(()=>({gold:S.gear.gold.gp,classClaimed:!!S.gear.classPackage24,bgClaimed:!!S.gear.bgPackage24}));
   assert.strictEqual(back.gold,50);assert.strictEqual(back.classClaimed,false);assert.strictEqual(back.bgClaimed,true);
   await page.locator('[data-classgear="B"]').click();
   const afterChange=await page.evaluate(()=>({gp:S.gear.gold.gp,mode:S.gear.classPackage24Mode}));
   assert.deepStrictEqual(afterChange,{gp:200,mode:"B"});
   const overflow=await page.evaluate(()=>({body:document.documentElement.scrollWidth,viewport:window.innerWidth}));
   assert(overflow.body<=overflow.viewport+3,"horizontal overflow "+JSON.stringify(overflow));
   const out=path.join("D:/Tools/zizi-ai-runtime","trpg-class-startgear-"+viewport.width+".png");
   await page.locator("#finalSheet").screenshot({path:out,timeout:30000});
   assert.deepStrictEqual(errors,[],"JS page errors");
   console.log("PASS UI "+viewport.width+"px class+background, collapse/edit, roundtrip, no overflow, screenshot "+out);
   await page.close();
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

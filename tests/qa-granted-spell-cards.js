const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(String(e)));
 await page.goto(process.env.QA_URL||"http://127.0.0.1:18766/index.html",{waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const out=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();
   S.level=1;
   S.sp=SPECIES.find(x=>x.n==="精靈");
   S.spChoices={eLine:"卓爾",eCast:"cha"};
   renderOrigin();
   const beforeLevelUp=[...document.querySelectorAll("#spDetail [data-grant-spell]")].map(x=>x.dataset.grantSpell);
   S.level=5;
   go(1);
   const cards=[...document.querySelectorAll("#spDetail [data-grant-spell]")].map(x=>({n:x.dataset.grantSpell,text:x.textContent.trim()}));
   const drowText=document.querySelector("#spDetail")?.textContent||"";
   const faerieText=document.querySelector('#spDetail [data-grant-spell="妖火"]')?.textContent||"";
   const confirmBefore=!!document.querySelector("[data-confirm-species-choices]")&&!document.querySelector("[data-confirm-species-choices]").disabled;
   S.speciesChoicesConfirmed=true;renderOrigin();
   const speciesChoicesLocked=[...document.querySelectorAll("#spDetail [data-spch]")].length>0&&[...document.querySelectorAll("#spDetail [data-spch]")].every(x=>x.disabled);
   const inline=featureInlineHTML("你習得火球術。你可以施放火球術。");
   const wrap=document.createElement("div");wrap.innerHTML=inline;
   const inlineRef=wrap.querySelector('.sref[data-sref="火球術"]')?.textContent||"";
   const traitWrap=document.createElement("div");traitWrap.innerHTML=featureInlineHTML("你獲得60呎黑暗視覺。你的黑暗視覺範圍提升至120呎。");
   const darkvisionTraitLinks=traitWrap.querySelectorAll('.sref[data-sref="黑暗視覺"]').length;
   const spellWrap=document.createElement("div");spellWrap.innerHTML=featureInlineHTML("你習得黑暗視覺法術，並可以施放黑暗視覺。");
   const darkvisionSpellLinks=spellWrap.querySelectorAll('.sref[data-sref="黑暗視覺"]').length;
   const featureProbe=document.createElement("div");
   featureProbe.innerHTML=featSpan("靈能力量",{cls:"戰士",sub:"靈能武士",lv:3})+" "+featSpan("武器掌握",{cls:"戰士",sub:"",lv:1});
   const featureLabels=featureProbe.textContent.trim();
   renderClasses();
   syncRulesetUI();
   const classNames=[...document.querySelectorAll("#classGrid .name")].map(x=>x.textContent.trim());
   const classFilterLabels={paladin:document.querySelector('.spell-filter-chip[data-sf-value="P"]')?.textContent.trim(),warlock:document.querySelector('.spell-filter-chip[data-sf-value="K"]')?.textContent.trim()};
   return {
     beforeLevelUp,cards,drowText,faerieText,confirmBefore,speciesChoicesLocked,inlineRef,darkvisionTraitLinks,darkvisionSpellLinks,featureLabels,classNames,classFilterLabels,
     canon:{paladin:ZIZI_5R_CANONICAL_NAMES.classes.Paladin,warlock:ZIZI_5R_CANONICAL_NAMES.classes.Warlock},
     migrations:ZIZI_5R_NAME_MIGRATIONS.classes,
     helperLoaded:typeof grantedSpellGridHTML2024==="function"
   };
 });
 assert.deepEqual(errors,[]);
 assert.equal(out.helperLoaded,true);
 for(const [zh,en] of [["舞光術","Dancing Lights"],["妖火","Faerie Fire"],["黑暗術","Darkness"]]){
   const card=out.cards.find(x=>x.n===zh);assert(card,zh+" grant card missing");assert(card.text.includes(en),zh+" English name missing");
 }
 assert.deepEqual(out.beforeLevelUp,["舞光術"],"level 1 Drow should begin with only Dancing Lights");
 assert.equal(out.cards.length,3,"returning to Origin after level-up must rerender all current species grants");
 assert(out.faerieText.includes("專注"),"Faerie Fire species grant must show concentration");
 for(const label of ["施法時間／動作","施法距離","持續時間","聲／勢／材"])assert(out.faerieText.includes(label),"Faerie Fire species grant missing "+label);
 assert(out.confirmBefore,"completed species choices must expose an enabled irreversible confirm action");
 assert(out.speciesChoicesLocked,"confirmed species choices must disable all species choice selects");
 assert(!out.cards.some(x=>x.n==="黑暗視覺"),"non-spell trait was misclassified as Darkvision spell card");
 assert.equal(out.darkvisionTraitLinks,0,"non-spell Darkvision trait text was linked as the Darkvision spell");
 assert(out.darkvisionSpellLinks>=1,"actual Darkvision spell context must still resolve as a spell");
 assert(out.inlineRef.includes("Fireball"),"feature inline spell ref not bilingual");
 assert(out.featureLabels.includes("靈能力量")&&out.featureLabels.includes("Psionic Power"),"subclass feature label not bilingual");
 assert(out.featureLabels.includes("武器精通")&&out.featureLabels.includes("Weapon Mastery"),"class feature label not bilingual");
 assert(out.classNames.some(n=>n==="聖騎士"||n.startsWith("聖騎士 ")),"Paladin display label not migrated");
 assert(out.classNames.some(n=>n==="契術師"||n.startsWith("契術師 ")),"Warlock display label not migrated");
 assert(!out.classNames.includes("聖武士")&&!out.classNames.includes("魔契師")&&!out.classNames.includes("邪術師"),"legacy class label visible");
 assert.equal(out.classFilterLabels.paladin,"聖騎士","2024 spell filter must use approved Paladin label");
 assert.equal(out.classFilterLabels.warlock,"契術師","2024 spell filter must use approved Warlock label");
 assert.equal(out.canon.paladin,"聖騎士");assert.equal(out.canon.warlock,"契術師");
 assert.equal(out.migrations["聖武士"],"聖騎士");assert.equal(out.migrations["魔契師"],"契術師");assert.equal(out.migrations["邪術師"],"契術師");
 await page.setViewportSize({width:390,height:844});
 await page.reload({waitUntil:"networkidle"});
 if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
 const mobile=await page.evaluate(()=>{
   S.ruleset="2024";S.level=5;S.sp=SPECIES.find(x=>x.n==="精靈");S.spChoices={eLine:"卓爾",eCast:"cha"};renderOrigin();
   return {body:document.body.scrollWidth,viewport:innerWidth,cards:document.querySelectorAll("#spDetail [data-grant-spell]").length};
 });
 assert(mobile.body<=mobile.viewport+2,"mobile horizontal overflow");
 assert.equal(mobile.cards,3,"mobile grant cards must match current selected grants");
 console.log(JSON.stringify({pass:true,out,mobile},null,2));
 await browser.close();
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
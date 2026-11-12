const {chromium}=require("playwright"),assert=require("assert");
(async()=>{
 const browser=await chromium.launch({headless:true,channel:"chrome"});
 try{
 for(const width of [1440,480,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(process.env.QA_URL||"http://127.0.0.1:19498/index.html",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const report=await page.evaluate(()=>{
   S.ruleset="2024";syncRulesetUI();renderClasses();renderOrigin();
   const first=selector=>document.querySelector(selector)?.textContent.trim()||"";
   const classCard=first("#classGrid .name"),classDesc=first("#classGrid .desc");
   const bgCard=first("#bgGrid .name"),spCard=first("#spGrid .name");
   const proper={
    class:bilingualProperTitle5R("classes","野蠻人"),bg:bilingualProperTitle5R("backgrounds","賢者"),
    species:bilingualProperTitle5R("species","矮人"),sub:bilingualProperTitle5R("subclasses","狂戰士道途","野蠻人"),
    feat:bilingualProperTitle5R("feats","警覺"),spell:spellNameText("火球術"),
    noDup:bilingualProperTitle5R("classes","野蠻人 Barbarian")};
   const noEnglishDescriptions=[...document.querySelectorAll("#classGrid .desc,#bgGrid .desc,#spGrid .desc")]
    .every(x=>!/(Barbarian|Acolyte|Aasimar|Cleric|Fighter)/.test(x.textContent));
   S.cls=CLASSES.find(x=>x.n==="野蠻人");S.level=3;S.classLevels={[S.cls.n]:3};renderLevel();
   const subName=first("#subGrid .name");
   S.bg=BACKGROUNDS.find(x=>x.n==="賢者");S.sp=SPECIES.find(x=>x.n==="矮人");
   renderFinal();
   const finalId=first("#finalSheet .fs-id");
   const finalClassEnglish=(finalId.match(/Barbarian/g)||[]).length;
   const finalBGEnglish=(finalId.match(/Sage/g)||[]).length;
   S.ruleset="2014";syncRulesetUI();renderClasses();
   const oldTitle=first("#classGrid .name");
   return {proper,classCard,classDesc,bgCard,spCard,subName,noEnglishDescriptions,finalId,finalClassEnglish,finalBGEnglish,oldTitle,scrollWidth:document.documentElement.scrollWidth,innerWidth};
  });
  assert.strictEqual(report.proper.class,"野蠻人 Barbarian");
  assert.strictEqual(report.proper.bg,"智者 Sage");
  assert.strictEqual(report.proper.species,"矮人 Dwarf");
  assert.strictEqual(report.proper.sub,"狂戰士道途 Path of the Berserker");
  assert.strictEqual(report.proper.feat,"警覺 Alert");
  assert.strictEqual(report.proper.spell,"火球術 Fireball");
  assert.strictEqual(report.proper.noDup,"野蠻人 Barbarian");
  assert(report.noEnglishDescriptions,"non-name paragraphs gained English");
  assert.strictEqual(report.finalClassEnglish,1,"class English repeated in final identity");
  assert.strictEqual(report.finalBGEnglish,1,"background English repeated in final identity");
  assert(report.subName.includes("Path of the Berserker"));
  assert(!report.oldTitle.includes("Barbarian"),"2014 regression");
  assert(report.scrollWidth<=report.innerWidth+2,"horizontal overflow "+JSON.stringify(report));
  assert.deepStrictEqual(errors,[]);
  console.log("PASS",width,JSON.stringify({class:report.proper.class,sub:report.proper.sub,feat:report.proper.feat,identity:report.finalId.slice(0,210)}));
  await page.close();
 }
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exit(1)});

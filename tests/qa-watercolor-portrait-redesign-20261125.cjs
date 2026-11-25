"use strict";
const assert=require("node:assert/strict"),path=require("node:path"),fs=require("node:fs");
const {chromium}=require("playwright");
const base=(process.env.QA_BASE||"http://127.0.0.1:18976").replace(/\/$/,"");
const out=process.env.QA_ART_OUT||path.join(__dirname,"..","tmp","qa-watercolor-portrait");
fs.mkdirSync(out,{recursive:true});
const root=path.join(__dirname,"..");
const fixture=path.join(root,"assets","species-watercolor","elf.webp");
async function geometry(page){return page.evaluate(()=>{
 const sheet=document.querySelector("#finalSheet"),panel=sheet.closest(".step-panel"),portrait=sheet.querySelector(".portrait-col"),head=sheet.querySelector(".sheet-head"),gear=sheet.querySelector("#final-jump-equipment");
 const r=el=>{const b=el.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
 return {viewport:innerWidth,sheet:r(sheet),panel:r(panel),portrait:r(portrait),head:r(head),gear:r(gear),rail:portrait.parentElement===sheet,portraitCount:sheet.querySelectorAll(".portrait-col").length,sticky:getComputedStyle(portrait).position,overflow:document.documentElement.scrollWidth-innerWidth,ac:getComputedStyle(sheet.querySelector(".fs-statrow .stat-box:nth-child(2) .sv")).backgroundImage,hp:getComputedStyle(sheet.querySelector(".fs-statrow .stat-box:first-child .sv")).backgroundImage,shield:getComputedStyle(sheet.querySelector(".fs-abrow .am")).backgroundImage,image:!!portrait.querySelector("img"),imgFit:portrait.querySelector("img")?getComputedStyle(portrait.querySelector("img")).objectFit:null,acValue:sheet.querySelector(".fs-statrow .stat-box:nth-child(2) .sv").textContent};
});}
async function seed(page,edition){await page.goto(base+"/index.html?view=sheet",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>typeof go==="function"&&typeof S!=="undefined");
 await page.waitForTimeout(350);
 if(await page.locator("#rulesetModal.open").isVisible())await page.locator("#closeRuleset").click();
 await page.evaluate(edition=>{
   S.ruleset=edition;syncRulesetUI();S.id=newId();S.cls=CLASSES.find(c=>c.n==="德魯伊");S.level=4;S.classLevels={[S.cls.n]:4};S.sp=(edition==="2024"?SPECIES_2024:SPECIES_2014)[0];S.bg=(edition==="2024"?BACKGROUNDS_2024:BACKGROUNDS_2014)[0];S.base={str:10,dex:14,con:14,int:10,wis:18,cha:10};document.getElementById("fName").value="Watercolor QA";go(7);
 },edition);
 await page.locator("#finalJumpNav").waitFor({state:"visible"});
}
(async()=>{const browser=await chromium.launch({headless:true});try{
 for(const [edition,width] of [["2024",1648],["2024",1440],["2024",1100],["2024",480],["2024",390],["2024",320],["2014",1440]]){
 const ctx=await browser.newContext({viewport:{width,height:930},acceptDownloads:true});
 const page=await ctx.newPage(),errors=[];
 page.on("pageerror",e=>errors.push(e.message));page.on("dialog",d=>d.accept());
 await seed(page,edition);
 const empty=await geometry(page);
 assert(!empty.rail&&empty.portraitCount===1,"empty portrait must not reserve rail");
 assert(empty.overflow<=2,JSON.stringify(empty));
 assert(empty.ac.includes("shield.svg")&&empty.hp.includes("heart.svg")&&empty.shield.includes("shield.svg"),"semantic artwork missing");
 if(width>=1100){assert(empty.sheet.width>=empty.panel.width*.98,JSON.stringify(empty));assert(empty.gear.width>=empty.sheet.width*.9,JSON.stringify(empty));}
 await page.screenshot({path:path.join(out,edition+"-"+width+"-empty.png")});
 const [chooser]=await Promise.all([page.waitForEvent("filechooser"),page.locator("#pPick").click()]);
 await chooser.setFiles(fixture);
 await page.waitForFunction(()=>document.querySelector("#portraitFrame img")?.complete&&S.portrait?.startsWith("data:image/"));
 await page.waitForTimeout(150);
 const uploaded=await geometry(page);
 assert(uploaded.image&&uploaded.portraitCount===1&&uploaded.imgFit==="contain","uploaded portrait must be visible and uncropped");
 assert(uploaded.overflow<=2,JSON.stringify(uploaded));
 if(width>=1100){assert(uploaded.rail&&uploaded.sticky==="sticky",JSON.stringify(uploaded));assert(uploaded.portrait.x>uploaded.gear.right,JSON.stringify(uploaded));assert(uploaded.sheet.width>=uploaded.panel.width*.98,JSON.stringify(uploaded));}
 else assert(!uploaded.rail,JSON.stringify(uploaded));
 await page.screenshot({path:path.join(out,edition+"-"+width+"-portrait.png")});
 const data=await page.evaluate(()=>S.portrait);
 await page.locator('#finalJumpNav [data-sheet-jump="equipment"]').click();
 const gear=await geometry(page);
 assert(gear.overflow<=2,JSON.stringify(gear));
 if(width>=1100)assert(gear.portrait.y>=0&&gear.portrait.y<400,JSON.stringify(gear));
 await page.screenshot({path:path.join(out,edition+"-"+width+"-equipment.png")});
 assert.equal(await page.locator(".wcs-equipment-ac strong").textContent(),gear.acValue.trim());
 assert((await page.locator("#finalJumpNav [data-sheet-jump=equipment]").evaluate(e=>getComputedStyle(e,"::before").backgroundImage)).includes("painted-icons.webp"));
 assert(await page.evaluate(async()=>{const i=new Image();i.src="assets/watercolor-ornaments/painted-icons.webp";await i.decode();return i.naturalWidth===160&&i.naturalHeight===160;}));
 const before=Number(gear.acValue);
 await page.locator("#shieldChk").check();
 await page.waitForTimeout(80);
 const after=await geometry(page);
 assert.equal(Number(after.acValue),before+2);
 assert.equal(Number(await page.locator(".wcs-equipment-ac strong").textContent()),before+2);
 assert.equal(await page.evaluate(()=>S.portrait),data);
 assert.equal(after.portraitCount,1);
 await page.emulateMedia({media:"print"});
 await page.waitForTimeout(120);
 assert(await page.locator("#finalSheet .sheet-head .portrait-col").count(),"print must restore existing portrait tree");
 assert(!(await page.locator(".wcs-equipment-ac").isVisible()),"print must hide ornamental duplicate");
 await page.emulateMedia({media:"screen"});
 await page.waitForTimeout(120);
 assert.equal((await geometry(page)).rail,width>=1100);
 await page.locator("#pDel").click();
 await page.waitForFunction(()=>!S.portrait&&!document.querySelector("#portraitFrame img"));
 const removed=await geometry(page);
 assert(!removed.rail&&removed.portraitCount===1);
 if(width>=1100)assert(removed.gear.width>=removed.sheet.width*.9,JSON.stringify(removed));
 assert.deepEqual(errors,[]);
 console.log("PASS",JSON.stringify({edition,width,empty,uploaded,gear,removed}));
 await ctx.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
const {chromium}=require("playwright");
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{
  for(const width of [320,390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   const url=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
   await page.goto(url,{waitUntil:"domcontentloaded"});
   await page.waitForFunction(()=>typeof go==="function"&&window.CreatureImport5R&&window.PlayStatusCreatures5R);
   await page.waitForTimeout(260);
   if(await page.locator("#rulesetModal.open #closeRuleset").isVisible())await page.locator("#rulesetModal.open #closeRuleset").click();
   if(process.env.QA_HELPER_ONLY==="1")await page.addScriptTag({path:path.resolve(__dirname,"../assets/creature-portrait-5r.js")});
   await page.waitForFunction(()=>!!window.CreaturePortrait5R);
   if(process.env.QA_HELPER_ONLY!=="1"){
    const scripts=await page.evaluate(()=>[...document.scripts].map(s=>s.src));
    assert(scripts.some(x=>x.includes("creature-portrait-5r.js?v=20261125-primal-portrait-v1")),"Primal portrait script must have a versioned URL");
   }
   const meta=await page.evaluate(()=>{
    const x=window.ZIZI_5R_CREATURES.find(x=>x.name==="Beast of the Land"&&x.source==="XPHB");
    const zh=window.ZIZI_5R_CREATURES_ZH[x.id].nameZh;
    S.ruleset="2024";syncRulesetUI();S.cls=CLASSES.find(x=>x.n==="遊俠");S.level=3;S.classLevels={"遊俠":3};
    S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獸王");
    S.classChoices2024={"遊俠":{primalBeast:zh}};
    S.base={str:10,dex:14,con:14,int:10,wis:18,cha:10};
    document.querySelector("#fName").value="原初野獸外觀 QA";
    go(11);
    return {id:x.id,initial:!!window.CreaturePortrait5R.get(S,x.id)};
   });
   assert.equal(meta.initial,false);
   const helper=await page.evaluate(async id=>{
    const cv=document.createElement("canvas");cv.width=1024;cv.height=768;
    const ctx=cv.getContext("2d");ctx.fillStyle="#456789";ctx.fillRect(0,0,1024,768);
    ctx.fillStyle="#ffcc88";ctx.fillRect(200,100,350,520);
    const blob=await new Promise(ok=>cv.toBlob(ok,"image/png"));
    const result=await window.CreaturePortrait5R.processFile(new File([blob],"beast.png",{type:"image/png"}));
    const picture=new Image();picture.src=result;await picture.decode();
    const ok=window.CreaturePortrait5R.put(S,id,result);
    const invalid=window.CreaturePortrait5R.put(S,id,"data:image/svg+xml,<svg onload=alert(1)>");
    const wrongEdition=window.CreaturePortrait5R.eligible({...S,ruleset:"2014"},id);
    const otherId=window.CreaturePortrait5R.eligible(S,"not-a-companion");
    const stored=JSON.parse(JSON.stringify(serialize()));
    deserialize(stored);
    return {ok,invalid,wrongEdition,otherId,mime:result.slice(0,24),length:result.length,width:picture.width,height:picture.height,hasImg:window.CreaturePortrait5R.render(S,id).includes('<img '),roundtrip:window.CreaturePortrait5R.get(S,id)===result};
   },meta.id);
   assert.equal(helper.ok,true);assert.equal(helper.invalid,false);assert.equal(helper.wrongEdition,false);assert.equal(helper.otherId,false);
   assert(helper.mime.startsWith("data:image/"));assert(helper.length<180001);
   assert.deepEqual([helper.width,helper.height],[384,384]);
   assert.equal(helper.hasImg,true);assert.equal(helper.roundtrip,true);
   const invalidFile=await page.evaluate(async()=>{
    const f=new File(["bad"],"evil.svg",{type:"image/svg+xml"});
    try{await window.CreaturePortrait5R.processFile(f);return "WRONG"}catch(e){return e.message}
   });
   assert.match(invalidFile,/JPG|PNG|WebP/);
   const broken=await page.evaluate(async()=>{
    try{await window.CreaturePortrait5R.processFile(new File([new Uint8Array(20)],"broken.png",{type:"image/png"}));return false;}catch{return true;}
   });
   assert.equal(broken,true,"Unreadable PNG is rejected without mutating state");
   if(process.env.QA_HELPER_ONLY!=="1"){
    await page.evaluate(()=>renderPlayStatusTab());
    await page.waitForFunction(()=>!!document.querySelector('.psc-card[data-psc-kind="companion"] .psc-portrait-image'),null,{timeout:6000});
    const companion=page.locator('.psc-card[data-psc-kind="companion"]');
    await companion.locator('[data-ps-action="creaturePortraitRemove"]').click();
    assert.equal(await companion.locator(".psc-portrait-image").count(),0);
    const [chooser]=await Promise.all([
      page.waitForEvent("filechooser"),
      companion.locator('[data-ps-action="creaturePortraitPick"]').click()
    ]);
    await chooser.setFiles({
      name:"primal-beast.png",mimeType:"image/png",
      buffer:await page.evaluate(async()=>{
       const cv=document.createElement("canvas");cv.width=512;cv.height=512;cv.getContext("2d").fillRect(0,0,512,512);
       return [...new Uint8Array(await (await new Promise(ok=>cv.toBlob(ok,"image/png"))).arrayBuffer())];
      }).then(arr=>Buffer.from(arr))
    });
    await page.waitForFunction(()=>!!document.querySelector('.psc-card[data-psc-kind="companion"] .psc-portrait-image'));
    assert.match(await companion.locator(".psc-portrait-body").innerText(),/512 × 512 px/);
    if(process.env.QA_SCREENSHOT_DIR){
      const fs=require("node:fs");fs.mkdirSync(process.env.QA_SCREENSHOT_DIR,{recursive:true});
      await companion.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,"primal-beast-portrait-"+width+".png")});
    }
    const entry=await page.evaluate(()=>S.play.creaturePortraits);
    assert.equal(Object.keys(entry).length,1);
    const savedId=await page.evaluate(()=>S.id);
    assert(savedId,"Character ID must exist for portrait storage");
    await page.reload({waitUntil:"domcontentloaded"});
    await page.waitForFunction(()=>typeof loadChar==="function"&&!!window.CreaturePortrait5R);
    await page.evaluate(id=>{loadChar(id);go(11);},savedId);
    await page.waitForFunction(()=>!!document.querySelector('.psc-card[data-psc-kind="companion"] .psc-portrait-image'),null,{timeout:6000});
    assert.equal(await page.evaluate(id=>!!window.CreaturePortrait5R.get(S,id),meta.id),true);
   }
   assert.deepEqual(errors,[]);
   console.log("PASS primal beast portrait "+width+"px helper image safety, 512x512 hint, compression and save roundtrip");
   await page.close();
  }
 }finally{await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1});

const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const http=require("node:http");

const ROOT=path.resolve(__dirname,"..");
const source=fs.readFileSync(path.join(ROOT,"index.html"),"utf8");
const speciesCode=source.match(/const SPECIES_2024=\[[\s\S]*?\n\];/);
const optionsCode=source.match(/const SP_OPTS=\{[\s\S]*?\n\};/);
assert(speciesCode && optionsCode,"2024 species / option source not found");
const {species,options}=vm.runInNewContext(
  speciesCode[0]+"\n"+optionsCode[0]+"\n({species:SPECIES_2024,options:SP_OPTS})");
const dataFile=path.join(ROOT,"assets","data","species-lore-2024.js");
delete globalThis.ZIZI_5R_SPECIES_LORE_2024;
require(dataFile);
const lore=globalThis.ZIZI_5R_SPECIES_LORE_2024;
assert(lore && Object.isFrozen(lore),"Lore data must be read-only");
assert.equal(species.length,10,"2024 PHB should have 10 core species");
assert.equal(Object.keys(lore.species).length,10,"exactly 10 lore entries expected");
for(const item of species){
  const text=lore.species[item.n];
  assert(text,"Missing species: "+item.n);
  assert(text.length>=20 && text.length<=105,"Wrong length for "+item.n+": "+text.length);
}
let branchCount=0;
for(const group of ["ELF","GNOME","DRAGON","GIANT","FIEND"]){
  const opts=options[group];
  const txt=lore.branches[group]||{};
  assert.equal(Object.keys(txt).length,opts.length,"Wrong branch count: "+group);
  for(const opt of opts){
    assert(txt[opt.n],"Missing branch "+group+"/"+opt.n);
    assert(txt[opt.n].length>=18&&txt[opt.n].length<=110,"Wrong branch length: "+group+"/"+opt.n);
    branchCount++;
  }
}
assert.equal(branchCount,24,"All 24 PHB branches expected");
assert.deepEqual(Object.keys(lore.aasimarForms).sort(),["墜翼","耀升","輝光"].sort());
assert.equal(options.AASIMAR.length,3);
const allText=Object.values(lore.species).concat(...Object.values(lore.branches).map(Object.values),Object.values(lore.aasimarForms)).join("\n");
assert(!/生來邪惡|天生邪惡|一定受到歧視|必定邪惡|天生好戰/.test(allText),"Fixed-morality stereotype");
assert(lore.branches.ELF["卓爾"].includes("部分地表社會"),"Drow prejudice must be context-limited");
assert(/不會決定|不能以血緣判定/.test(lore.species["提夫林"]),"Tiefling morality not deterministic");
const socialMarkers=/\u90e8\u5206|\u6709\u6642|\u53ef\u80fd|\u6709\u4eba/;
for(const item of species){const line=lore.species[item.n]; assert(line.length<=48,"species lore must be concise: "+item.n); assert(socialMarkers.test(line),"setting-dependent social perception missing: "+item.n);}
for(const group of ["ELF","GNOME","FIEND"]){for(const [name,line] of Object.entries(lore.branches[group]))assert(socialMarkers.test(line),"lineage social note missing: "+group+"/"+name);}
assert(source.includes('<script src="assets/data/species-lore-2024.js"></script>'),"new script not loaded");
assert(source.indexOf("species-lore-2024.js")<source.indexOf("const SPECIES_2024"),"load order wrong");
assert(source.includes('const speciesLoreData=S.ruleset==="2024"?'),"2014 gating missing");
assert(source.includes("escFeatureHTML(speciesIntro)") && source.includes("escFeatureHTML(lineageIntro)"),"HTML escaping missing");
assert(source.includes("天界啟示（啟動時選擇，非固定亞種）"),"Aasimar forms mislabeled");
console.log("STATIC_LORE_PASS",JSON.stringify({species:species.length,branches:branchCount,aasimarForms:3}));

async function browserTest(){
  const {chromium}=require("playwright");
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".woff2":"font/woff2",".ttf":"font/ttf",".pdf":"application/pdf",".png":"image/png",".jpg":"image/jpeg"};
  const server=http.createServer((req,res)=>{
    const name=decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/,"");
    const f=path.resolve(ROOT,name||"index.html");
    if(f!==ROOT&&!f.startsWith(ROOT+path.sep)){res.writeHead(403).end();return;}
    fs.readFile(f,(error,data)=>{
      if(error){res.writeHead(404).end();return;}
      res.writeHead(200,{"Content-Type":mime[path.extname(f).toLowerCase()]||"application/octet-stream","Cache-Control":"no-store"});
      res.end(data);
    });
  });
  try{
    await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
    const URL="http://127.0.0.1:"+server.address().port+"/index.html";
    const failures=[];
    for(const width of [1440,390]){
      const page=await browser.newPage({viewport:{width,height:900}});
      page.on("pageerror",e=>failures.push(String(e)));
      await page.goto(URL,{waitUntil:"domcontentloaded"});
      await page.waitForLoadState("networkidle",{timeout:25000}).catch(()=>{});
      const close=page.locator("#closeRuleset");
      if(await close.isVisible()) await close.click();
      await page.locator("#btnRuleset").click();
      await page.locator('.ruleset-card[data-ruleset="2024"]').click();
      await page.locator("#stepNav .nav-ux-steps-toggle").click();
      await page.locator("#stepNav .nav-secondary button").filter({hasText:"種族／背景"}).click();
      const cards=page.locator("#spGrid .pick-card");
      const count=await cards.count();
      assert.equal(count,10,"Expected 2024 cards on "+width+"px: got "+count);
      const pickSpecies=async name=>{
        await cards.filter({hasText:name}).first().click();
        const preview=await page.locator("#spDetail .species-lore p").first().textContent();
        assert.equal(preview.trim(),lore.species[name],"Unconfirmed species must expose lore preview");
      };
      for(const item of species){
        await pickSpecies(item.n);
        const text=(await page.locator("#spDetail .species-lore p").first().textContent()||"").trim();
        assert.equal(text,lore.species[item.n],"Lore UI mismatch for "+item.n);
      }
      for(const [name,field,branch,group] of [
        ["精靈","eLine","卓爾","ELF"],
        ["侏儒","gLine","森林侏儒","GNOME"],
        ["龍裔","dAnc","金龍","DRAGON"],
        ["歌利亞","giant","雲巨人的躍遷","GIANT"],
        ["提夫林","fLine","九獄","FIEND"]
      ]){
        await pickSpecies(name);
        await page.locator('#spDetail select[data-spch="'+field+'"]').selectOption(branch);
        const text=await page.locator("#spDetail .species-branch-lore").first().textContent();
        assert(text.includes(lore.branches[group][branch]),"Selection did not update "+name+"/"+branch);
      }
      await pickSpecies("阿斯莫");
      const aasimar=await page.locator("#spDetail .species-lore-forms").textContent();
      for(const name of Object.keys(lore.aasimarForms))assert(aasimar.includes(name),"Aasimar form missing: "+name);
      await pickSpecies("矮人");
      const confirmButton=page.locator(".confirm-sp button");
      assert.equal(await confirmButton.isEnabled(),true,"Species with no branches must be confirmable");
      page.once("dialog",d=>d.accept());
      await confirmButton.click();
      assert.equal(await page.locator("#spGrid .pick-card:not([disabled])").count(),0,"Locked species must disable other cards");
      assert((await page.locator("#spDetail .species-lore p").first().textContent()).includes("矮人"),"Lore must survive confirmation");
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
      assert(overflow<=2,"Horizontal overflow at "+width+"px: "+overflow);
      console.log("BROWSER_LORE_PASS",JSON.stringify({width,cardCount:count,branchesTested:5,overflow}));
      await page.close();
    }
    const legacy=await browser.newPage({viewport:{width:390,height:900}});
    legacy.on("pageerror",e=>failures.push(String(e)));
    await legacy.goto(URL,{waitUntil:"networkidle"});
    if(await legacy.locator("#closeRuleset").isVisible())await legacy.locator("#closeRuleset").click();
    await legacy.locator("#btnRuleset").click();
    await legacy.locator('.ruleset-card[data-ruleset="2014"]').click();
    await legacy.locator("#stepNav .nav-ux-steps-toggle").click();
    await legacy.locator("#stepNav .nav-secondary button").filter({hasText:"種族／背景"}).click();
    await legacy.locator("#spGrid .pick-card").filter({hasText:"精靈"}).first().click();
    assert.equal(await legacy.locator(".species-pending-lore").count(),0,"2014 must not show 2024 preview");
    assert.equal(await legacy.locator(".confirm-sp button").isEnabled(),true,"2014 confirm remains available");
    assert.equal(await legacy.locator("#spDetail .species-lore").count(),0,"2014 must not show 2024 lore");
    await legacy.close();
    console.log("LEGACY_2014_ISOLATION_PASS");
    assert.deepEqual(failures,[],"Browser page errors");
  } finally {
    await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
}
if(process.env.SPECIES_LORE_BROWSER==="1"){
  browserTest().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
}

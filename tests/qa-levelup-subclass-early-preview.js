const assert=require("node:assert/strict"),fs=require("node:fs"),http=require("node:http"),path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const server=http.createServer((req,res)=>{
 const f=path.resolve(root,decodeURIComponent(new URL(req.url,"http://127.0.0.1").pathname).replace(/^\/+/,"")||"index.html");
 if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(f,(e,b)=>{if(e){res.writeHead(404).end();return;}
 res.writeHead(200,{"Content-Type":f.endsWith(".js")?"text/javascript; charset=utf-8":f.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream"});res.end(b);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
  const audit=await page.evaluate(()=>{
   S.ruleset="2024";S.level=1;S.sub=null;S.subConfirmed=false;pendingSubclass=null;
   S.base={str:12,dex:14,con:14,int:12,wis:16,cha:14};go(5);
   const missing=[],broken=[],facts=[];let actual=0,features=0;
   for(const cls of CLASSES){
    S.cls=cls;S.sub=null;pendingSubclass=null;S.subConfirmed=false;
    renderLevel();
    const buttons=[...document.querySelectorAll("#subPreviewGrid [data-sub-preview]")];
    if(buttons.length!==4)broken.push(cls.n+"|buttons="+buttons.length);
    for(let i=0;i<4;i++){
     const sub=PROG_2024[cls.n].subs[i];
     if(!sub||!buttons[i]){broken.push(cls.n+"|"+i+"|missing button");continue}
     const before=JSON.stringify({sub:S.sub,pending:pendingSubclass,confirmed:S.subConfirmed,level:S.level,choices:S.classChoices2024});
     buttons[i].click();actual++;
     const after=JSON.stringify({sub:S.sub,pending:pendingSubclass,confirmed:S.subConfirmed,level:S.level,choices:S.classChoices2024});
     if(before!==after)broken.push(cls.n+"|"+sub.n+"|state changed");
     const tiers=[...document.querySelectorAll("#subEarlyPreview .subclass-preview-tier")];
     const levels=Object.entries(sub.f);
     if(tiers.length!==levels.length)broken.push(cls.n+"|"+sub.n+"|tiers="+tiers.length);
     if(!tiers[0]?.open)broken.push(cls.n+"|"+sub.n+"|first tier closed");
     if(document.querySelector("#confirmSubclass"))broken.push(cls.n+"|"+sub.n+"|confirm shown at lv1");
     for(const [level,raw] of levels){
      for(const name of String(raw).split("、").map(s=>s.trim()).filter(Boolean)){
       features++;
       const full=window.resolveFeatureRule2024?.(cls.n,sub.n,name,+level)||"";
       if(!full)missing.push(cls.n+"|"+sub.n+"|"+level+"|"+name);
      }
     }
     const first=tiers[0]?.querySelector(".subclass-feature-body");
     if(!first||!first.innerText.trim()||first.getBoundingClientRect().width<=0)broken.push(cls.n+"|"+sub.n+"|no first rule");
     facts.push([cls.n,sub.n]);
    }
   }
   return {actual,features,classes:new Set(facts.map(x=>x[0])).size,broken,missing};
  });
  console.log("SUBCLASS_PREVIEW_AUDIT",JSON.stringify({width,...audit,missing:audit.missing.slice(0,20)}));
  assert.equal(audit.actual,48,"all 48 subclasses must be clickable at level one");
  assert.equal(audit.classes,12);
  assert.deepEqual(audit.broken,[],"visible previews must render without mutating selection");
  const clsName="德魯伊";
  await page.evaluate(name=>{S.cls=CLASSES.find(c=>c.n===name);S.level=1;S.sub=null;pendingSubclass=null;S.subConfirmed=false;go(5);},clsName);
  const star=page.locator("#subPreviewGrid [data-sub-preview]").filter({hasText:"Circle of the Stars"}).first();
  await star.click();
  assert(await page.locator("#subEarlyPreview .subclass-preview-tier").count()>=3);
  const before=await page.evaluate(()=>({sub:S.sub,pending:pendingSubclass}));
  await page.locator("#subEarlyPreview .subclass-preview-tier").nth(1).locator("summary").click();
  assert.deepEqual(await page.evaluate(()=>({sub:S.sub,pending:pendingSubclass})),before);
  await page.evaluate(()=>{S.level=3;renderLevel();});
  const compare=page.locator("#subComparisonPreview").locator("xpath=preceding-sibling::*[1]").locator("[data-sub-preview]");
  assert.equal(await compare.count(),4,"level 3 must offer four independent read-only previews");
  const beforeComparison=await page.evaluate(()=>({sub:S.sub,pending:pendingSubclass,confirmed:S.subConfirmed}));
  await compare.nth(2).click();
  assert(await page.locator("#subComparisonPreview .subclass-feature-body").first().innerText());
  assert.deepEqual(await page.evaluate(()=>({sub:S.sub,pending:pendingSubclass,confirmed:S.subConfirmed})),beforeComparison);
  await page.locator("#subGrid [data-sub]").first().click();
  assert.deepEqual(await page.evaluate(()=>({sub:S.sub,pending:pendingSubclass})),{sub:null,pending:0});
  page.once("dialog",dialog=>dialog.accept());
  await page.locator("#confirmSubclass").click();
  assert.deepEqual(await page.evaluate(()=>({sub:S.sub,confirmed:S.subConfirmed})),{sub:0,confirmed:true});
  await page.locator("[data-sub-preview]").last().click();
  assert.deepEqual(await page.evaluate(()=>({sub:S.sub,confirmed:S.subConfirmed})),{sub:0,confirmed:true},"preview after confirmation cannot change subclass");
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert(overflow<=2,"viewport overflow "+overflow+" at "+width);
  const shot="D:\\Tools\\zizi-ai-runtime\\trpg-playercheet-qa\\levelup-preview-"+width+"-20261117.png";
  if(!process.env.CI)await page.screenshot({path:shot,fullPage:false});
  assert.deepEqual(errors,[],"browser errors");
  console.log("SUBCLASS_PREVIEW_UI_PASS",JSON.stringify({width,overflow,screenshot:shot}));
  await page.close();
 }}finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});

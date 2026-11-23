"use strict";
/* Browser contract for canonical-preserving subclass typography and semantic ink. */
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),http=require("node:http");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"..");
const out=path.join(root,"tmp","qa-subclass-semantic-20261123");
const fileType=f=>f.endsWith(".js")?"text/javascript; charset=utf-8":f.endsWith(".css")?"text/css; charset=utf-8":f.endsWith(".html")?"text/html; charset=utf-8":"application/octet-stream";
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,decodeURIComponent(new URL(req.url,"http://localhost").pathname).replace(/^\/+/,"")||"index.html");
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404).end();return;}
  res.writeHead(200,{"Content-Type":fileType(file)}).end(data);
 });
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const browser=await chromium.launch({headless:true,...(process.env.CI?{}:{channel:"chrome"})});
 try{
  for(const width of [320,390,480,1440]){
   const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,isMobile:width<500,locale:"zh-TW"});
   const errors=[];page.on("pageerror",e=>errors.push(e.message));
   const result=await page.goto("http://127.0.0.1:"+server.address().port+"/index.html",{waitUntil:"networkidle"});
   assert.equal(result.status(),200);
   if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
   const audit=await page.evaluate(async()=>{
    const normalize=s=>String(s||"").replace(/\s/gu,"");
    const counts={classes:0,subclasses:0,features:0,paragraphs:0,semantic:0,damage:0,resources:0};
    const failures=[];
    const root=document.getElementById("lvlBody");
    S.ruleset="2024";syncRulesetUI();
    S.base={str:12,dex:14,con:14,int:12,wis:18,cha:16};
    const mount=document.createElement("div");mount.id="semanticQaMount";root.appendChild(mount);
    for(const cls of CLASSES){
     counts.classes++;
     const prog=PROG_2024[cls.n];if(!prog){failures.push(cls.n+" missing prog");continue;}
     for(let i=0;i<prog.subs.length;i++){
      counts.subclasses++;S.cls=cls;S.level=3;S.sub=null;S.subConfirmed=false;pendingSubclass=null;
      const before=JSON.stringify({sub:S.sub,confirmed:S.subConfirmed,pending:pendingSubclass,choices:S.classChoices2024});
      mount.innerHTML=subclassPreview5R(prog,i);
      await new Promise(resolve=>setTimeout(resolve,0)); // Flush the shared highlighter MutationObserver.
      const rows=[...mount.querySelectorAll(".subclass-feature-body")];
      const expected=Object.entries(prog.subs[i].f).sort((a,b)=>Number(a[0])-Number(b[0]))
       .flatMap(([level,raw])=>String(raw).split("、").filter(Boolean).map(name=>resolveFeatureRule2024(cls.n,prog.subs[i].n,name,Number(level))||""));
      if(rows.length!==expected.length)failures.push(cls.n+"/"+prog.subs[i].n+" row count "+rows.length+"/"+expected.length);
      for(let j=0;j<Math.min(rows.length,expected.length);j++){
       counts.features++;
       const read=rows[j].querySelector(".subclass-rule-readable");
       if(!read){failures.push(cls.n+"/"+prog.subs[i].n+" missing readable block "+j);continue}
       const raw=expected[j],rendered=read.textContent;
       if(!raw)failures.push(cls.n+"/"+prog.subs[i].n+" canonical empty "+j);
       if(raw&&normalize(raw)!==normalize(rendered))
        failures.push(cls.n+"/"+prog.subs[i].n+" canonical characters changed "+j+" ("+normalize(raw).length+"/"+normalize(rendered).length+")");
       const ps=[...read.querySelectorAll(".subclass-rule-paragraph")];counts.paragraphs+=ps.length;
       if(!ps.length)failures.push("missing paragraphs "+cls.n+"/"+prog.subs[i].n);
       const font=ps.length?getComputedStyle(ps[0]):null;
       if(font&&parseFloat(font.fontSize)<15)failures.push("small text "+cls.n+"/"+prog.subs[i].n+" "+font.fontSize);
       if(font&&parseFloat(font.lineHeight)/parseFloat(font.fontSize)<1.7)failures.push("tight lines "+cls.n+"/"+prog.subs[i].n);
       if(read.scrollWidth>read.clientWidth+2)failures.push("horizontal text overflow "+cls.n+"/"+prog.subs[i].n);
      }
      counts.semantic+=mount.querySelectorAll(".sr-dice,.sr-save,.sr-action,.sr-condition,.sr-advantage,.sr-resource,.sp-preview-attack").length;
      counts.damage+=mount.querySelectorAll(".damage-semantic[data-damage-type]").length;
      counts.resources+=mount.querySelectorAll(".sr-resource").length;
      if(before!==JSON.stringify({sub:S.sub,confirmed:S.subConfirmed,pending:pendingSubclass,choices:S.classChoices2024}))
       failures.push("preview mutated selection "+cls.n+"/"+prog.subs[i].n);
     }
    }
    // A representative branch-choice panel must receive the SAME semantic styles.
    S.cls=CLASSES.find(c=>c.n==="遊俠");S.level=7;S.sub=PROG_2024["遊俠"].subs.findIndex(x=>x.n==="獵人");
    S.subConfirmed=true;S.classChoices2024={};pendingSubclass=null;
    mount.innerHTML=renderClassChoices2024("遊俠",7);
    await new Promise(resolve=>setTimeout(resolve,0));
    const variants=[...mount.querySelectorAll(".class-choice-variant-preview")];
    if(variants.length<2)failures.push("Hunter branch previews absent");
    if(variants.length&&variants.some(v=>!v.querySelector(".choice-menu-option")))
     failures.push("Choice variant missing source details");
    const readability=mount.querySelector(".choice-menu-option");
    if(readability&&parseFloat(getComputedStyle(readability).fontSize)<15)failures.push("choice text too small");
    const scroll=document.documentElement.scrollWidth-document.documentElement.clientWidth;
    if(scroll>2)failures.push("horizontal viewport overflow "+scroll);
    const styles={text:readability?getComputedStyle(readability).fontSize:"",body:mount.querySelector(".subclass-feature-body")?.textContent?.slice(0,25)};
    mount.innerHTML=subclassPreview5R(PROG_2024["遊俠"],S.sub);
    await new Promise(resolve=>setTimeout(resolve,0));
    return {counts,failures,scroll,variants:variants.length,highlighter:ZIZI_SUBCLASS_READABILITY_5R.stats(),styles};
   });
   if(audit.failures.length)console.error("SUBCLASS_SEMANTIC_FAILURES",JSON.stringify({width,failures:audit.failures.slice(0,30),count:audit.failures.length}));
   assert.equal(audit.counts.classes,12);
   assert.equal(audit.counts.subclasses,48);
   assert.equal(audit.counts.features,243);
   assert(audit.counts.paragraphs>=243);
   assert(audit.counts.semantic>30,"Semantic highlights missing from all rules");
   assert(audit.counts.resources>0,"Rest/range resource highlights absent");
   assert.deepEqual(audit.failures,[],"Canonical/visual/selection parity failed");
   assert.deepEqual(errors,[],"Runtime script errors");
   // Screenshot an actually expanded subclass long-form rule in the same browser.
   await page.evaluate(()=>{
    S.cls=CLASSES.find(c=>c.n==="野蠻人");S.level=14;S.sub=PROG_2024["野蠻人"].subs.findIndex(x=>x.n==="狂戰士道途");
    if(S.sub<0)S.sub=0;
    S.subConfirmed=true;go(5);
   });
   await page.locator(".subclass-preview-tier").last().locator("summary").click();
   await page.locator(".subclass-preview-tier").last().scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,"subclass-"+width+".png"),fullPage:false});
   console.log("SUBCLASS_SEMANTIC_QA_PASS",JSON.stringify({width,...audit,failures:0}));
   await page.close();
  }
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(err=>{console.error(err.stack||err);process.exitCode=1;});

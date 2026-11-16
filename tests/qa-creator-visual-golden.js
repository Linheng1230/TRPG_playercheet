"use strict";
/**
 * Isolated D&D 5R creator art and typography Golden Sample.
 * NODE_PATH=<existing node_modules> node tests/qa-creator-visual-golden.js
 * VISUAL_GOLDEN_PHASE=baseline|after; VISUAL_GOLDEN_BASELINE=<baseline directory>
 * Captures actual browser evidence even when a gate fails.
 */
const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),crypto=require("node:crypto");
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const ROOT_OUT="D:/Tools/zizi-ai-runtime/visual-skill-golden-20261116";
const PHASE=process.env.VISUAL_GOLDEN_PHASE||"baseline";
const OUT=path.join(ROOT_OUT,PHASE);
const BASELINE=process.env.VISUAL_GOLDEN_BASELINE||path.join(ROOT_OUT,"baseline");
const sizes=[{name:"desktop",w:1440,h:900},{name:"mobile",w:390,h:844},{name:"small",w:320,h:700}];
const mime={".html":"text/html",".js":"application/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".woff2":"font/woff2",".woff":"font/woff",".png":"image/png",".jpg":"image/jpeg",".pdf":"application/pdf"};
function serve(){
  return http.createServer((req,res)=>{
    const raw=decodeURIComponent((req.url||"/").split("?")[0]).replace(/^\/+/,"")||"index.html";
    const f=path.resolve(ROOT,raw);
    if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end("Not found");return;}
    res.writeHead(200,{"Content-Type":(mime[path.extname(f)]||"application/octet-stream")+";charset=utf-8","Cache-Control":"no-store"});
    fs.createReadStream(f).pipe(res);
  });
}
function eq(v,expected,label,failures){if(v!==expected)failures.push(label+": expected "+expected+" got "+v);}
function limit(ok,label,failures){if(!ok)failures.push(label);}
async function diffScreens(page,current,baseline){
  if(!fs.existsSync(baseline))return {status:"NO_BASELINE"};
  const a=fs.readFileSync(current).toString("base64"),b=fs.readFileSync(baseline).toString("base64");
  return page.evaluate(async ({a,b})=>{
    const decode=async base=>{
      const img=new Image();img.src="data:image/png;base64,"+base;await img.decode();
      const cv=document.createElement("canvas");cv.width=img.width;cv.height=img.height;
      const cx=cv.getContext("2d",{willReadFrequently:true});cx.drawImage(img,0,0);
      return {width:img.width,height:img.height,data:cx.getImageData(0,0,img.width,img.height).data};
    };
    const x=await decode(a),y=await decode(b);
    const w=Math.min(x.width,y.width),h=Math.min(x.height,y.height);
    let n=0,t=0;
    for(let row=0;row<h;row+=2)for(let col=0;col<w;col+=2){
      const i=(row*x.width+col)*4,j=(row*y.width+col)*4;
      const d=Math.abs(x.data[i]-y.data[j])+Math.abs(x.data[i+1]-y.data[j+1])+Math.abs(x.data[i+2]-y.data[j+2]);
      t++;if(d>=32)n++;
    }
    return {status:x.width===y.width&&x.height===y.height?"COMPARED":"COMPARED_RESIZED",
      before:[y.width,y.height],after:[x.width,x.height],overlap:[w,h],
      pixelChangePercent:+(100*n/t).toFixed(2),sampleCount:t,
      note:"Descriptive change only; baseline not human-approved, no visual PASS inferred"};
  },{a,b});
}
(async()=>{
 const s=serve();let browser;fs.mkdirSync(OUT,{recursive:true});
 await new Promise(r=>s.listen(0,"127.0.0.1",r));
 const report={phase:PHASE,branch:"feat/visual-skill-golden-20261116",source:"origin/main 39a483d",cases:[],failures:[],baselineType:"original-main-not-approved-design-golden"};
 try{
   browser=await chromium.launch({headless:true,channel:"chrome"});
   for(const dim of sizes){
     const page=await browser.newPage({viewport:{width:dim.w,height:dim.h},deviceScaleFactor:1,reducedMotion:"reduce"});
     const failures=[],errors=[];
     page.on("pageerror",e=>errors.push("JS: "+e.message));
     page.on("response",r=>{if(r.status()>=400)errors.push("HTTP "+r.status()+" "+r.url().split("/").slice(-1)[0]);});
     const result={size:dim.name,viewport:[dim.w,dim.h],failures};
     try{
       await page.goto("http://127.0.0.1:"+s.address().port+"/index.html?view=creator",{waitUntil:"networkidle",timeout:30000});
       if(await page.locator("#rulesetModal.open").count())await page.locator("#closeRuleset").click();
       await page.waitForSelector("#classGrid .pick-card");
       result.before=await page.evaluate(async ()=>{
         const cards=[...document.querySelectorAll("#classGrid .pick-card")];
         const i=cards[0],pseudo=getComputedStyle(i,"::before");
         const art=pseudo.backgroundImage,match=art.match(/url\(["']?(.*?)["']?\)/),imageUrl=match?match[1]:"";
         const img=new Image();if(imageUrl){img.src=new URL(imageUrl,document.baseURI).href;await img.decode();}
         let atlas={url:imageUrl,dimensions:[img.naturalWidth||0,img.naturalHeight||0],alphaTransparentPercent:null,tiles:[]};
         if(img.naturalWidth){
           const canvas=document.createElement("canvas");canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
           const cx=canvas.getContext("2d",{willReadFrequently:true});cx.drawImage(img,0,0);
           const data=cx.getImageData(0,0,img.naturalWidth,img.naturalHeight).data;
           let transparent=0,total=0;for(let p=3;p<data.length;p+=4){total++;if(data[p]<240)transparent++;}
           atlas.alphaTransparentPercent=+(100*transparent/total).toFixed(3);
           for(let index=0;index<Math.min(12,cards.length);index++){
             const tx=index%4*168,ty=Math.floor(index/4)*90;
             const px=(x,y,c)=>data[( (ty+y)*img.naturalWidth+tx+x)*4+c];
             const corners=[[0,0],[167,0],[0,89],[167,89]];
             const bg=[0,1,2].map(c=>corners.reduce((v,p)=>v+px(p[0],p[1],c),0)/4);
             let weight=0,xsum=0,ysum=0,count=0,minx=168,maxx=0,miny=90,maxy=0,transparentPixels=0,opaquePixels=0;
             for(let y=0;y<90;y++)for(let x=0;x<168;x++){
               const a=px(x,y,3)/255;
               if(a<.02)transparentPixels++;
               if(a>.9)opaquePixels++;
               const diff=Math.max(...[0,1,2].map(c=>Math.abs(px(x,y,c)-bg[c])));
               if(diff<50||a<.15)continue;
               const w=Math.min(1,diff/120)*a;
               count++;weight+=w;xsum+=x*w;ysum+=y*w;
               minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
             }
             atlas.tiles.push({index,foregroundCount:count,opaquePixels,transparentPercent:+(100*transparentPixels/(168*90)).toFixed(2),cornerAlphas:corners.map(p=>px(p[0],p[1],3)),centroidX:weight?+(xsum/weight).toFixed(1):null,centroidY:weight?+(ysum/weight).toFixed(1):null,paintBox:count?[minx,miny,maxx,maxy]:null});
           }
         }
         const rect=r=>({x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)});
         const cardMetrics=cards.map((card,index)=>{
           const box=card.getBoundingClientRect(),name=card.querySelector(".name"),desc=card.querySelector(".desc");
           const st=getComputedStyle(card,"::before"),nr=name.getBoundingClientRect();
           const nst=getComputedStyle(name),dst=getComputedStyle(desc),transform=st.transform;
           const factor=transform.startsWith("matrix(")?parseFloat(transform.slice(7)):1;
           const pseudoBottom=parseFloat(st.top)+parseFloat(st.height)*(1+factor)/2;
           const tile=atlas.tiles[index]||{};
           const opticalOffsetX=tile.centroidX===null||tile.centroidX===undefined?null:+((tile.centroidX-83.5)*factor).toFixed(1);
           return {index,name:name.innerText,card:rect(box),nameRect:rect(nr),nameFont:+parseFloat(nst.fontSize).toFixed(1),
             descriptionFont:+parseFloat(dst.fontSize).toFixed(1),descriptionLineHeight:+parseFloat(dst.lineHeight).toFixed(1),
             fontFamily:nst.fontFamily,nameCenterOffset:+(nr.x+nr.width/2-box.x-box.width/2).toFixed(1),
             artPosition:st.backgroundPosition,artScale:+factor.toFixed(2),artDimensions:[st.width,st.height],
             artTextGap:+(nr.y-box.y-pseudoBottom).toFixed(1),opticalOffsetX,scrollExcess:card.scrollWidth-card.clientWidth};
         });
         const nav=document.querySelector("nav.steps");
         const navTops=nav?[...nav.children].filter(e=>e.getBoundingClientRect().height>0).map(e=>Math.round(e.getBoundingClientRect().top)):null;
         const navGroupSpreads=nav?[...nav.children].map(g=>{
           const ys=[...g.children].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.getBoundingClientRect().top);
           return {name:g.className,childCount:ys.length,spread:ys.length?+(Math.max(...ys)-Math.min(...ys)).toFixed(1):0};
         }):[];
         return {count:cards.length,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
           atlas,navRows:navTops?new Set(navTops).size:null,navTops,navGroupSpreads,navHeight:nav?+nav.getBoundingClientRect().height.toFixed(1):null,
           cards:cardMetrics};
       });
       eq(result.before.count,12,dim.name+" classes",failures);
       limit(result.before.scrollWidth<=dim.w+2,dim.name+" horizontal scroll",failures);
       limit(result.before.atlas.alphaTransparentPercent!==null&&result.before.atlas.alphaTransparentPercent>=70&&result.before.atlas.alphaTransparentPercent<=95,
         dim.name+" ALPHA_INVALID: must have 70–95% transparent area, got "+result.before.atlas.alphaTransparentPercent,failures);
       eq(result.before.atlas.dimensions.join("x"),"672x270",dim.name+" unchanged sprite grid",failures);
       for(const tile of result.before.atlas.tiles){
         limit(tile.foregroundCount>=200&&tile.opaquePixels>=200,dim.name+" painted icon missing class="+tile.index,failures);
         limit(tile.transparentPercent>=65&&tile.transparentPercent<=95&&tile.cornerAlphas.every(a=>a<=2),
           dim.name+" tile-alpha invalid class="+tile.index+" transparency="+tile.transparentPercent+" corner="+tile.cornerAlphas.join("/"),failures);
       }
       const spots=new Set(result.before.cards.map(c=>c.artPosition));
       eq(spots.size,12,dim.name+" unique class sprite slots",failures);
       for(const c of result.before.cards){
         limit(c.nameCenterOffset<=2&&c.nameCenterOffset>=-2,dim.name+" title-center class="+c.index+" offset="+c.nameCenterOffset,failures);
         limit(c.nameFont>=15&&c.descriptionFont>=15,dim.name+" font-small class="+c.index+" fonts="+c.nameFont+"/"+c.descriptionFont,failures);
         limit(c.descriptionLineHeight>=c.descriptionFont*1.65,dim.name+" lineheight class="+c.index,failures);
         limit(c.scrollExcess<=1,dim.name+" overflow class="+c.index,failures);
         limit(c.artTextGap>=3,dim.name+" icon-text-overlap class="+c.index+" gap="+c.artTextGap,failures);
         limit(c.opticalOffsetX!==null&&Math.abs(c.opticalOffsetX)<=8,
           dim.name+" optical-center class="+c.index+" offset="+c.opticalOffsetX,failures);
       }
       limit(result.before.navGroupSpreads.every(g=>g.spread<=2),dim.name+" nav-internal-wrapping="+JSON.stringify(result.before.navGroupSpreads),failures);
       const initialFile=path.join(OUT,"creator-"+dim.name+"-before.png");
       await page.screenshot({path:initialFile,fullPage:true});
       result.imageSha256=crypto.createHash("sha256").update(fs.readFileSync(initialFile)).digest("hex");
       result.snapshotDiff=await diffScreens(page,initialFile,path.join(BASELINE,"creator-"+dim.name+"-before.png"));
       const saved=result.before.cards.map(c=>c.artPosition);
       await page.locator('[data-class-name="德魯伊"]').click();
       const selected=await page.locator("#classGrid .pick-card.selected").count();
       eq(selected,1,dim.name+" selected count",failures);
       const afterPositions=await page.locator("#classGrid .pick-card").evaluateAll(els=>els.map(x=>getComputedStyle(x,"::before").backgroundPosition));
       limit(JSON.stringify(saved)===JSON.stringify(afterPositions),dim.name+" art-position shift on select",failures);
       await page.screenshot({path:path.join(OUT,"creator-"+dim.name+"-selected.png"),fullPage:false});
       page.once("dialog",d=>d.accept());
       await page.locator('[data-step="0"] .class-confirm-controls button').click();
       result.confirmed=await page.evaluate(()=>({class:S.cls?.n,confirmed:S.classConfirmed,step:document.querySelector(".step-panel.active")?.dataset.step}));
       limit(result.confirmed.class==="德魯伊"&&result.confirmed.confirmed===true,dim.name+" class confirmation regression",failures);
       result.errors=errors;
       limit(errors.length===0,dim.name+" browser errors: "+errors.slice(0,5).join("; "),failures);
     }catch(e){failures.push(dim.name+" EXCEPTION "+(e.stack||e.message));}
     report.cases.push(result);
     report.failures.push(...failures);
     console.log((failures.length?"FAIL":"PASS")+" CREATOR VISUAL "+dim.name+" ["+failures.length+" findings]");
     failures.slice(0,10).forEach(f=>console.log("  "+f));
     await page.close();
   }
 }catch(e){report.failures.push("HARNESS "+(e.stack||e));console.error(e);}
 finally{
   fs.writeFileSync(path.join(OUT,"metrics.json"),JSON.stringify(report,null,2),"utf8");
   if(browser)await browser.close();await new Promise(r=>s.close(r));
 }
 console.log("CREATOR VISUAL "+(report.failures.length?"FAIL":"PASS")+" failures="+report.failures.length+" evidence="+OUT);
 if(report.failures.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||e);process.exitCode=2;});
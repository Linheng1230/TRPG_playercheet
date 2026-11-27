(function(){
"use strict";
const A={str:"力量",dex:"敏捷",con:"體質",int:"智力",wis:"感知",cha:"魅力"};
const el=id=>document.getElementById(id), val=id=>(el(id)?.value||"").trim(), signed=n=>n>=0?`+${n}`:`${n}`;
const text=(form,name,value,size=8)=>{try{const f=form.getTextField(name);const v=value==null?"":String(value);if(v.includes("\n"))try{f.enableMultiline()}catch(_){}f.setText(v);try{f.setFontSize(size)}catch(_){f.acroField.setDefaultAppearance(`/Helvetica ${size} Tf`);f.setFontSize(size)}return true}catch(_){return false}};
const fieldInfo=(form,name)=>{try{const field=form.getTextField(name),widget=field.acroField.getWidgets()?.[0],rect=widget?.getRectangle();return field&&rect?{field,rect}:null}catch(_){return null}};
const pdfTextWidth=(font,value,size)=>{try{return font.widthOfTextAtSize(String(value||""),size)}catch(_){return [...String(value||"")].reduce((n,ch)=>n+(/[\\x00-\\xff]/.test(ch)?.55:1)*size,0)}};
const wrapPdfLine=(font,line,size,maxWidth)=>{if(!line)return[""];const units=String(line).match(/[A-Za-z0-9@#%&+.,:/_()\-]+|\s+|./gu)||[],rows=[];let row="";const push=()=>{rows.push(row.trimEnd());row=""};for(const unit of units){const candidate=row+unit;if(!row||pdfTextWidth(font,candidate,size)<=maxWidth){row=candidate;continue}if(row)push();if(pdfTextWidth(font,unit,size)<=maxWidth){row=unit.trimStart();continue}let chunk="";for(const ch of [...unit]){if(chunk&&pdfTextWidth(font,chunk+ch,size)>maxWidth){rows.push(chunk);chunk=ch}else chunk+=ch}row=chunk}if(row||!rows.length)push();return rows};
const wrapPdfText=(font,value,size,maxWidth)=>String(value||"").replace(/\r/g,"").split("\n").flatMap(line=>wrapPdfLine(font,line,size,maxWidth));
const fitTextField=(form,name,value,font,{max=8,min=4,lineHeight=1.18,pad=3}={})=>{lineHeight=Math.max(lineHeight,font.heightAtSize(1)*1.2);const info=fieldInfo(form,name);if(!info)return{text:"",size:max,overflow:false};const {rect}=info,maxWidth=Math.max(10,rect.width-pad*2),maxHeight=Math.max(10,rect.height-pad*2);let last=[];for(let size=max;size>=min;size-=.25){const lines=wrapPdfText(font,value,size,maxWidth);last=lines;if(lines.length*size*lineHeight<=maxHeight){text(form,name,lines.join("\n"),size);return{text:lines.join("\n"),size,overflow:false}}}const maxLines=Math.max(1,Math.floor(maxHeight/(min*lineHeight))),lines=last.slice(0,maxLines);if(last.length>maxLines&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/\s*$/,"")+"…";text(form,name,lines.join("\n"),min);return{text:lines.join("\n"),size:min,overflow:last.length>maxLines}};
const splitTextFields=(form,names,value,font,{max=7,min=4,lineHeight=1.18,pad=3}={})=>{lineHeight=Math.max(lineHeight,font.heightAtSize(1)*1.2);const infos=names.map(n=>fieldInfo(form,n));if(infos.some(x=>!x)){names.forEach((n,i)=>text(form,n,i?"" : value,max));return{size:max,overflow:false}}const widths=infos.map(x=>Math.max(10,x.rect.width-pad*2)),heights=infos.map(x=>Math.max(10,x.rect.height-pad*2));let last=[];for(let size=max;size>=min;size-=.25){const width=Math.min(...widths),lines=wrapPdfText(font,value,size,width),caps=heights.map(h=>Math.max(1,Math.floor(h/(size*lineHeight))));last=lines;if(lines.length<=caps.reduce((a,b)=>a+b,0)){let at=0;names.forEach((n,i)=>{const part=lines.slice(at,at+caps[i]);at+=caps[i];text(form,n,part.join("\n"),size)});return{size,overflow:false}}}const caps=heights.map(h=>Math.max(1,Math.floor(h/(min*lineHeight))));let at=0;names.forEach((n,i)=>{const part=last.slice(at,at+caps[i]);at+=caps[i];if(i===names.length-1&&at<last.length&&part.length)part[part.length-1]=part[part.length-1].replace(/\s*$/,"")+"…";text(form,n,part.join("\n"),min)});return{size:min,overflow:at<last.length}};
const splitFeatureTextFields=(form,names,value,font,{max=7,min=4,lineHeight=1.18,pad=3}={})=>{lineHeight=Math.max(lineHeight,font.heightAtSize(1)*1.2);
 const infos=names.map(n=>fieldInfo(form,n));if(infos.some(x=>!x)||names.length!==2)return splitTextFields(form,names,value,font,{max,min,lineHeight,pad});
 const blocks=String(value||"").replace(/\r/g,"").split(/\n(?=(?:【|\d+級\s))/).map(x=>x.trim()).filter(Boolean);
 if(blocks.length<2)return splitTextFields(form,names,value,font,{max,min,lineHeight,pad});
 const widths=infos.map(x=>Math.max(10,x.rect.width-pad*2)),heights=infos.map(x=>Math.max(10,x.rect.height-pad*2)),width=Math.min(...widths);
 for(let size=max;size>=min;size-=.25){
   const caps=heights.map(h=>Math.max(1,Math.floor(h/(size*lineHeight))));
   const wrapped=blocks.map(b=>wrapPdfText(font,b,size,width));
   let best=null;
   for(let cut=1;cut<blocks.length;cut++){
     const left=wrapped.slice(0,cut).flatMap((x,i)=>i?[ "",...x]:x);
     const right=wrapped.slice(cut).flatMap((x,i)=>i?[ "",...x]:x);
     if(left.length<=caps[0]&&right.length<=caps[1]){
       const score=Math.abs((caps[0]-left.length)-(caps[1]-right.length));
       if(!best||score<best.score)best={cut,left,right,score};
     }
   }
   if(best){
     text(form,names[0],best.left.join("\n"),size);text(form,names[1],best.right.join("\n"),size);
     return{size,overflow:false,blockSplit:true,splitAt:best.cut};
   }
 }
 const fallback=splitTextFields(form,names,value,font,{max,min,lineHeight,pad});return{...fallback,blockSplit:false};
};
const portraitBytes=dataUrl=>{const m=String(dataUrl||"").match(/^data:image\/(jpeg|jpg|png);base64,(.+)$/i);if(!m)return null;const bin=atob(m[2]),bytes=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);return{kind:m[1].toLowerCase(),bytes}};
const drawPortrait2024=async(doc,form)=>{if(!S.portrait)return false;const src=portraitBytes(S.portrait);if(!src)return false;const img=src.kind==="png"?await doc.embedPng(src.bytes):await doc.embedJpg(src.bytes);try{const imageField=form.getButton("影像1_af_image");imageField.setImage(img);return true}catch(_){}const app=fieldInfo(form,"APP");if(!app)return false;const page=doc.getPages()[1],panelLeft=411.848,pad=3,x=panelLeft+pad,y=app.rect.y+pad,w=Math.max(20,app.rect.x-panelLeft-pad*2),h=Math.max(20,app.rect.height-pad*2),scale=Math.min(w/img.width,h/img.height),iw=img.width*scale,ih=img.height*scale;page.drawImage(img,{x:x+(w-iw)/2,y:y+(h-ih)/2,width:iw,height:ih});return true};
const widgetPage=(doc,field)=>{try{const w=field.acroField.getWidgets()?.[0],pref=w?.P();if(!pref)return null;return doc.getPages().find(pg=>String(pg.ref)===String(pref))||null}catch(_){return null}};
const bakeCritical2024=(doc,form,font)=>{
 const drawTextField=(name,value,size=8)=>{try{const field=form.getTextField(name),w=field.acroField.getWidgets()?.[0],r=w?.getRectangle(),page=widgetPage(doc,field);if(!page||!r)return false;const txt=String(value||"");if(txt){const tw=pdfTextWidth(font,txt,size),x=r.x+Math.max(2,(r.width-tw)/2),y=r.y+(r.height-size)/2+1;page.drawText(txt,{x,y,size,font})}form.removeField(field);return true}catch(_){return false}};
 const drawCheck=(name,on)=>{try{const field=form.getCheckBox(name),w=field.acroField.getWidgets()?.[0],r=w?.getRectangle(),page=widgetPage(doc,field);if(!page||!r)return false;if(on){const pad=Math.max(2,Math.min(r.width,r.height)*.22),th=1.2;page.drawLine({start:{x:r.x+pad,y:r.y+pad},end:{x:r.x+r.width-pad,y:r.y+r.height-pad},thickness:th});page.drawLine({start:{x:r.x+pad,y:r.y+r.height-pad},end:{x:r.x+r.width-pad,y:r.y+pad},thickness:th})}form.removeField(field);return true}catch(_){return false}};
 const prof=proficiencySummary14?.()||{},armor=String(prof.armor||"");
 const out={alignment:drawTextField("Ali",normalizeAlignment?normalizeAlignment(val("fAlign")):val("fAlign"),8),light:drawCheck("light",armor.includes("輕甲")),medium:drawCheck("medium",armor.includes("中甲")),heavy:drawCheck("heavy",armor.includes("重甲")),shield:drawCheck("shld_pro",armor.includes("盾牌"))};
 window.__lastPdfCriticalBake=out;return out;
};
const check=(form,name,on=true)=>{if(!on)return;try{form.getCheckBox(name).check()}catch(_){}};
const download=(bytes,name)=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500)};
// Use the same canonical name, total and proficiency state as the website.
const projectPdfSkills=(fields,checks)=>{
 const trainedSet=allSkills();
 if(SKILLS.length!==18||Object.keys(fields).length!==18||Object.keys(checks).length!==18)throw Error("PDF skill mapping coverage");
 const rows=SKILLS.map(sk=>{
  const info=skillCheckDetails(sk),trained=info?.trained??trainedSet.has(sk.n),expert=trained&&(info?.expert??hasExpertise(sk.n));
  const field=fields[sk.n],checkbox=checks[sk.n];
  if(!field||!checkbox)throw Error("Missing PDF skill mapping: "+sk.n);
  return {field,checkbox,labelField:"skill-label-"+field,name:displayName5R("skills",sk.n),value:info==null?"—":fmt(info.total),trained,expert};
 });
 if(new Set(rows.map(r=>r.field)).size!==18||new Set(rows.map(r=>r.checkbox)).size!==18)throw Error("Duplicate PDF skill mapping");
 return rows;
};
const writePdfSkillLabels=(form,rows,font)=>{
 for(const r of rows){
  const f=form.getTextField(r.labelField),w=f.acroField.getWidgets();
  if(w.length!==1)throw Error("Ambiguous PDF skill label: "+r.labelField);
  const {width,height}=w[0].getRectangle();
  let size=10;
  while(size>=7&&(font.widthOfTextAtSize(r.name,size)>width-2||font.heightAtSize(size)>height-1))size-=.25;
  if(size<7)throw Error("PDF skill label overflow: "+r.name);
  f.setText(r.name);f.setFontSize(size);f.enableReadOnly();
 }
};
const pdfSkillAppearance=(expert)=>(_field,widget)=>{
 const {width:w,height:h}=widget.getRectangle(),cx=w/2,cy=h/2,r=Math.min(w,h)*.41;
 const P=PDFLib,black=P.rgb(.12,.12,.12);
 const diamond=(x,y,d,solid)=>[P.moveTo(x,y+d),P.lineTo(x+d,y),P.lineTo(x,y-d),P.lineTo(x-d,y),P.closePath(),solid?P.fill():P.stroke()];
 const base=[P.pushGraphicsState(),P.setStrokingColor(black),P.setFillingColor(black),P.setLineWidth(Math.max(.55,r*.23))];
 const off=[...base,...diamond(cx,cy,r,false),P.popGraphicsState()];
 const on=[...base,...(expert?[[0,1],[1,0],[0,-1],[-1,0]].flatMap(([dx,dy])=>diamond(cx+dx*r*.57,cy+dy*r*.57,r*.40,true)):diamond(cx,cy,r,true)),P.popGraphicsState()];
 return {normal:{on,off},down:{on,off}};
};
const applyPdfSkillMarks=(form,rows)=>{
 for(const r of rows){
  const box=form.getCheckBox(r.checkbox);
  if(r.trained)box.check();else box.uncheck();
  box.updateAppearances(pdfSkillAppearance(r.expert));
 }
};
const saveValue=k=>mod(finalScore(k)||10)+(saveProfSet().has(k)?pb():0)+saveAura();
const classParts=()=>{if(S.ruleset==="2014"){const rows=Object.entries(S.classLevels||{});return {classes:rows.map(([n,l])=>`${displayName5R("classes",n)} ${l}`).join("／"),subs:rows.map(([n])=>subclassNameFor(n)).filter(Boolean).join("／")}}return {classes:S.cls?displayName5R("classes",S.cls.n):"",subs:S.sub!=null?displayName5R("subclasses",prog()?.subs?.[S.sub]?.n||""):""}};
const FEATURE_BRIEF14={神聖感知:"動作；感知 60 呎內非全掩護的天界生物、邪魔、不死生物與聖邪地點，至下回合結束；長休可用 1＋魅力調整值次。",聖療:"治療池＝等級 × 5；動作觸碰治療。花 5 點解除疾病或毒；對不死與構裝無效，長休回滿。"};
const wrapFeatureText=(value,max=27)=>String(value||"").split("\n").map(line=>{const rows=[];let row="",width=0;const units=line.match(/[A-Za-z0-9.+×＝]+|\s+|./gu)||[];for(const unit of units){const w=[...unit].reduce((n,ch)=>n+(/[\x00-\xff]/.test(ch)?.55:1),0),punct=/^[，。；：、！？）】》]/.test(unit);if(row&&!punct&&width+w>max){rows.push(row.trimEnd());row="";width=0}row+=unit;width+=w}if(row)rows.push(row.trimEnd());return rows.join("\n")}).join("\n");
const pdfRuleCompact=value=>{const raw=String(value||"").trim();if(!raw)return "";try{if(typeof featureRuleParts==="function"){const {rows}=featureRuleParts(raw);return rows.map(({key,val})=>key?`${key}:${val}`:val).join("；")}}catch(_){}const sentences=raw.match(/[^。]+。?/g)||[raw];const mech=/\b(?:AC|DC)\b|\d|動作|附贈|反應|攻擊|豁免|檢定|傷害|尺|分鐘|小時|回合|長休|短休|熟練|優勢|劣勢|抗性|免疫|速度|生命|恢復|消耗|持續|目標|法術|武器|狀態|專注|儀式/;if(sentences.length>1&&!mech.test(sentences[0]))sentences.shift();return sentences.join("").replace(/[。；]+$/,"").replace(/。/g,"；")};
const featureDescForPdf=(name,ctx={})=>{
 const key=String(name||"").split("(")[0].trim().replace(/^武器掌握增至\s*\d+\s*種$/,"武器掌握");
 if(S.ruleset!=="2024")return ALLDESC14?.[key];
 const cls=ctx.cls||S.cls?.n||"",sub=ctx.sub||"",lv=Number(ctx.lv||0),db=window.ZIZI_5R_FULL_FEATURE_RULES||{};
 // The PDF uses the same level-aware rule as previews. Do not silently fall back to old 2014/UA summaries.
 return db[[cls,sub,key,lv].join("|")]||db[[cls,"",key,lv].join("|")]||window.resolveFeatureRule2024?.(cls,sub,key,lv)||"";
};
const featureLines=(raw,prefix="",verbose=true,ctx={})=>String(raw||"").split("、").filter(Boolean).map(n=>{const cls=ctx.cls||S.cls?.n||"",sub=ctx.sub||"",lv=ctx.lv||0,base=String(n).split("(")[0].trim();const spec=S.ruleset==="2024"?exclusiveChoiceSpec5R(cls,sub,base,lv):null,selected=chosenExclusiveOption5R(spec),parentRule=S.ruleset==="2024"?exclusiveParentRule5R(cls,sub,base,lv):"";const nested=window.ZIZI_5R_NESTED_CHOICE_RULES?.[[cls,sub,base,Number(lv)].join("|")],canonical=spec?canonicalChoiceSplit5R(cls,sub,base,lv):null;const desc=parentRule?(selected?[(nested?.intro||canonical?.intro||""),"已選："+displayName5R("classOptions",selected.n)+"（其他分支不生效）",selectedExclusiveRule5R(spec,selected)].filter(Boolean).join("；"):parentRule):featureDescForPdf(n,{cls,sub,lv}),shown=verbose==="compact"?"":S.ruleset==="2024"?String(desc||"").trim():verbose==="brief"?wrapFeatureText(FEATURE_BRIEF14[n]||desc):desc,name=S.ruleset==="2024"?displayFeatureName5R(cls,sub,n,lv):n;return `${prefix}${name}${shown?`：\n${shown}`:""}`});
const featureText=(verbose=true)=>{const out=[];if(S.ruleset==="2014"){
 if(S.sp){const detail=x=>{const desc=RACE_TRAIT_DESC14?.[x],shown=["brief","compact"].includes(verbose)?wrapFeatureText(desc):desc;return `${x}：${shown?`\n${shown}`:""}`};out.push(`【種族：${S.sp.n}】`,...S.sp.traits.map(detail));const sr=SUBRACE14[S.spChoices.subrace];if(sr)out.push(...sr.traits.map(detail));(S.sp.ch||[]).filter(c=>S.spChoices[c.k]&&c.k!=="subrace").forEach(c=>out.push(`${c.label.split(" · ")[0]}：\n${["brief","compact"].includes(verbose)?wrapFeatureText(S.spChoices[c.k]):S.spChoices[c.k]}`))}
 if(S.bg)out.push(`【背景：${S.bg.n}】${S.bg.feature?` ${S.bg.feature}`:""}`);
 Object.entries(S.classLevels||{}).forEach(([n,lv])=>{const p=PROG_2014[n],sub=subclassNameFor(n);out.push(`【${n}${sub?`／${sub}`:""}】`);Object.entries(p?.f||{}).filter(([l])=>+l<=lv).forEach(([l,v])=>out.push(...featureLines(v,`${l}級 `,verbose)));const ss=p?.subs?.find(x=>x.n===sub);Object.entries(ss?.f||{}).filter(([l])=>+l<=lv).forEach(([l,v])=>out.push(...featureLines(v,`${l}級 `,verbose)));out.push(...classChoiceSummaryAll14(n).map(x=>`• ${x}`))});
 }else{
  if(S.cls){const p=prog?.();out.push(`【${displayName5R("classes",S.cls.n)}】`);Object.entries(p?.f||{}).filter(([l])=>+l<=S.level).forEach(([l,v])=>out.push(...featureLines(v,`${l}級 `,verbose==="compact"?"compact":"brief",{cls:S.cls.n,sub:"",lv:+l})));const sub=S.sub!=null?p?.subs?.[S.sub]:null;if(sub){out.push(`【子職業：${displayName5R("subclasses",sub.n)}】`);Object.entries(sub.f||{}).filter(([l])=>+l<=S.level).forEach(([l,v])=>out.push(...featureLines(v,`${l}級 `,verbose==="compact"?"compact":"brief",{cls:S.cls.n,sub:sub.n,lv:+l})))}out.push(...classChoiceSummary2024(S.cls.n).map(x=>`• ${x}`));const bgAb=backgroundAbilityChoiceSummary2024();if(bgAb)out.push(`• 背景屬性加值：${bgAb}`)}
 }
 if(S.ruleset==="2014")asiEntries().forEach(({className,lv,v})=>{if(v.t==="feat")out.push(`${displayName5R("classes",className)} ${lv}級：${v.feat}${featChoiceSummary14(v)?`（${featChoiceSummary14(v)}）`:""}`)});return canonicalClassTermText5R(out.join("\n"))};
const speciesTraitText2024=()=>{if(!S.sp)return "";const trait=x=>{const m=String(x).match(/^([^:：]+)[:：](.*)$/),name=m?m[1].trim():String(x).trim(),shown=speciesTraitDisplayName5R(name),split=speciesChoiceRule5R(S.sp.n,name),canonical=split?(split.error||split.parent+(split.selected?"\n該血系效果："+split.detail:"")):(window.ZIZI_5R_SPECIES_RULES?.[`${S.sp.n}|${name}`]||(m?m[2].trim():"")),detail=pdfRuleCompact(canonical);return `${shown}${detail?`：${detail}`:""}`};return [`【物種：${displayName5R("species",S.sp.n)}】`,...S.sp.traits.map(trait),...Object.entries(S.spChoices||{}).map(([k,v])=>{const c=S.sp?.ch?.find(x=>x.k===k);if(!(c&&v&&c.t!=="ofeat"))return "";const shown=c.t==="skill"?displayName5R("skills",v):c.t==="spell"?normalizeSpellName2024(v):c.t==="opt"?speciesOptionDisplayName5R(v):c.t==="castability"?(ABN[v]||v):v;return `${c.label.split(" · ")[0]}：${shown}`}).filter(Boolean)].join("\n")};
const featDescription2024=name=>featDesc(name)||(GFEATS.find(x=>x.n===name)?.d||"");
const featText2024=()=>{const rows=[];if(S.bg?.feat)rows.push(`【背景起源專長】${canonicalFeatName5R(S.bg.feat)}：\n${featDescription2024(S.bg.feat)}`);if(S.spChoices.hFeat)rows.push(`【額外起源專長】${canonicalFeatName5R(S.spChoices.hFeat)}：\n${featDescription2024(S.spChoices.hFeat)}`);asiEntries().forEach(({lv,v})=>{if(v?.t==="feat"&&v.feat)rows.push(`【${lv}級專長】${canonicalFeatName5R(v.feat)}：\n${featDescription2024(v.feat)||featChoiceSummary14(v)}`)});return rows.join("\n")};
const backgroundGear2014=()=>{const raw=BG14_DETAILS?.[S.bg?.n]?.gear||"",re=/[（(]\s*(\d+)\s*gp\s*[）)]|(?:^|、)\s*(\d+)\s*gp(?=、|$)/gi,money=[...raw.matchAll(re)].reduce((n,m)=>n+(+(m[1]||m[2])||0),0);return {text:raw.replace(re,"").replace(/、+/g,"、").replace(/^、|、$/g,""),gp:money}};
const gearText=(compact=false)=>{const magic=window.MagicItemImport5R?.equipmentText(S)||"";const bought=[typeof purchasedText==="function"&&purchasedText("工具"),typeof purchasedText==="function"&&purchasedText("冒險用品"),typeof purchasedText==="function"&&purchasedText("坐騎與交通")].filter(Boolean).join("、");if(S.ruleset!=="2014"){const worn=S.gear?.armor?displayName5R("armors",S.gear.armor):"";const equippedArmor=worn&&!bought.includes(worn)?"護甲："+worn:"";return [S.gear?.items,equippedArmor,bought,magic,...(S.gear?.weapons||[]).map(n=>displayName5R("weapons",n))].filter(Boolean).flat().join("、");}const sg=expandedStartingGear2014?.()||{raw:"",packs:[]},bg=backgroundGear2014().text,armor=[S.gear?.armor,S.gear?.shield?"盾牌":""].filter(Boolean).join("、"),weapons=(S.gear?.weapons||[]).join("、"),rows=[`職業裝備：\n${sg.raw}`,...sg.packs.map(x=>`${x.replace("：","：\n")}`),bg&&`背景裝備：\n${bg}`,armor&&`護甲：\n${armor}`,weapons&&`武器：\n${weapons}`,bought&&`購買物品：\n${bought}`,S.gear?.items&&`其他裝備：\n${S.gear.items}`,magic].filter(Boolean);return compact?wrapFeatureText(rows.join("\n"),18):rows.join("\n")};
const weaponDamageParts=value=>{const raw=String(value||"").trim(),m=raw.match(/^(.*?)(?:\s+)(鈍擊|穿刺|揮砍)$/);return m?{damage:m[1].trim(),type:m[2]}:{damage:raw,type:""}};
const featureFontSize=value=>{const lines=String(value||"").split("\n").length;return lines>52?5:lines>44?5.5:6};
const pageOneFeatureText=()=>{const detailed=featureText("brief");return detailed.split("\n").length>34?featureText("compact"):detailed};
const equipmentFontSize=value=>{const n=String(value||"").length;return n>260?5.5:n>160?6:6.5};
const profText=()=>{const p=proficiencySummary14?.();return p?`護甲：${p.armor||"無"}\n武器：${p.weapons||"無"}\n工具：${p.tools||"無"}\n語言：${p.languages||"無"}`:""};
const spellRows=()=>{const rows=[];if(S.ruleset==="2014"){castingProfiles2014().forEach(ci=>{const st=spellStore2014(ci.name);[...st.cantrips,...(ci.kind==="book"?st.prepared:st.known),...fixedSpells2014(ci.name).map(x=>x.n)].forEach(n=>{const sp=SPELLS14.find(x=>x.n===n);if(sp&&!rows.some(x=>x.n===n))rows.push(sp)})})}else{[...S.cantrips,...S.prepared,...grantedSpells2024().map(x=>x.n)].forEach(n=>{const sp=SPELLS.find(x=>x.n===normalizeSpellName2024(n));if(sp&&!rows.some(x=>x.n===sp.n))rows.push(sp)})}return rows.sort((a,b)=>a.lv-b.lv||a.n.localeCompare(b.n,"zh"))};
function common(){const cp=classParts(),hp=syncPlayHP()||0,sp=speedInfo()?.total||0;return {cp,hp,sp,ac:acInfo().total,initiative:initiativeDetails()?.total??0,name:val("fName"),player:val("fPlayer"),alignment:val("fAlign"),race:S.sp?(S.ruleset==="2024"?displayName5R("species",S.sp.n):S.sp.n):"",bg:S.bg?(S.ruleset==="2024"?displayName5R("backgrounds",S.bg.n):S.bg.n):""}}
function fill2014(form,font){const c=common(),bgGear=backgroundGear2014();const m={ClassLevel:c.cp.classes,Background:c.bg,PlayerName:c.player,CharacterName:c.name,"Race ":c.race,Alignment:c.alignment,XP:"",Inspiration:S.play?.insp?"●":"",ProfBonus:signed(pb()),AC:c.ac,Initiative:signed(c.initiative),Speed:`${c.sp} 呎`,HPMax:c.hp,HPCurrent:S.play?.hp??c.hp,HPTemp:S.play?.thp||"",HDTotal:Object.entries(S.classLevels||{}).map(([n,l])=>`${l}d${CLASSES.find(x=>x.n===n)?.hd||""}`).join("／"),HD:Object.entries(S.classLevels||{}).map(([n])=>`d${CLASSES.find(x=>x.n===n)?.hd||""}`).join("／"),"PersonalityTraits ":S.bio?.traits||"",Ideals:S.bio?.story||"",Bonds:S.bio?.allies||"",Flaws:S.bio?.notes||"",Passive:passivePerceptionTotal()??"",ProficienciesLang:profText(),Equipment:gearText(true),"Features and Traits":pageOneFeatureText(),CP:S.gear?.gold?.cp||"",SP:S.gear?.gold?.sp||"",EP:"",GP:(S.gear?.gold?.gp||0)+bgGear.gp||"",PP:S.gear?.gold?.pp||"","CharacterName 2":c.name,Age:val("fAge"),Height:"",Weight:"",Eyes:"",Skin:"",Hair:"",Allies:S.bio?.allies||"",FactionName:"",Backstory:S.bio?.story||"","Feat+Traits":featureText(true),Treasure:""};
 const am={str:["STR","STRmod","ST Strength"],dex:["DEX","DEXmod ","ST Dexterity"],con:["CON","CONmod","ST Constitution"],int:["INT","INTmod","ST Intelligence"],wis:["WIS","WISmod","ST Wisdom"],cha:["CHA","CHamod","ST Charisma"]};Object.entries(am).forEach(([k,[score,mo,sv]])=>{m[score]=finalScore(k)||"";m[mo]=signed(mod(finalScore(k)||10));m[sv]=signed(saveValue(k))});
 const sf={運動:"Acrobatics",巧手:"Animal",隱匿:"Arcana",雜技:"Athletics",調查:"Deception ",歷史:"History ",奧秘:"Insight",自然:"Intimidation",宗教:"Investigation ",動物馴養:"Medicine",洞悉:"Nature",醫藥:"Perception ",察覺:"Performance",求生:"Persuasion",欺瞞:"Religion",威嚇:"SleightofHand",表演:"Stealth ",說服:"Survival"};const skillRows=projectPdfSkills(sf,{"運動":"Check Box 23","巧手":"Check Box 24","隱匿":"Check Box 25","雜技":"Check Box 26","調查":"Check Box 27","歷史":"Check Box 28","奧秘":"Check Box 29","自然":"Check Box 30","宗教":"Check Box 31","動物馴養":"Check Box 32","洞悉":"Check Box 33","醫藥":"Check Box 34","察覺":"Check Box 35","求生":"Check Box 36","欺瞞":"Check Box 37","威嚇":"Check Box 38","表演":"Check Box 39","說服":"Check Box 40"});skillRows.forEach(r=>m[r.field]=r.value);writePdfSkillLabels(form,skillRows,font);
 const weapons=[...new Set([...(S.gear?.weapons||[]),...(typeof startingWeapons2014==="function"?startingWeapons2014():[])])].slice(0,3);weapons.forEach((n,i)=>{const w=weaponLine(n),parts=weaponDamageParts(w?.dmg),j=i+1;m[i?`Wpn Name ${j}`:"Wpn Name"]=parts.type?`${n}(${parts.type})`:n;m[`Wpn${j} AtkBonus${j===2?" ":j===3?"  ":""}`]=w?signed(w.atk):"";m[`Wpn${j} Damage${j===2||j===3?"  ":""}`]=parts.damage});
 const profiles=castingProfiles2014(),abKey={智力:"int",感知:"wis",魅力:"cha"},spellStat=(fn)=>profiles.map(x=>profiles.length===1?String(fn(x)):`${x.name} ${fn(x)}`).join("／");m["Spellcasting Class 2"]=profiles.map(x=>`${x.name}${x.sub?`（${x.sub}）`:""}`).join("／");m["SpellcastingAbility 2"]=[...new Set(profiles.map(x=>x.ability))].join("／");m["SpellSaveDC  2"]=spellStat(x=>8+pb()+mod(finalScore(abKey[x.ability])||10));m["SpellAtkBonus 2"]=spellStat(x=>signed(pb()+mod(finalScore(abKey[x.ability])||10)));
 const shared=SLOTS_FULL[multiclassCasterLevel()]||[];for(let lv=1;lv<=9;lv++){const total=shared[lv-1]||0;m[`SlotsTotal ${18+lv}`]=total||"";m[`SlotsRemaining ${18+lv}`]=total?Math.max(0,total-(S.slotsUsed?.[`s${lv}`]||0)):""}
 const spellIds={0:[1014,1015,1016,1017,1018,1019,1020,1021,1022],1:[1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033],2:[1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046],3:[1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059],4:[1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071],5:[1072,1073,1074,1075,1076,1077,1078,1079,1080,1081],6:[1082,1083,1084,1085,1086,1087,1088,1089,1090],7:[1091,1092,1093,1094,1095,1096,1097,1098,1099],8:[10100,10101,10102,10103,10104,10105,10106],9:[10107,10108,10109,101010,101011,101012,101013]};const rows=spellRows();Object.entries(spellIds).forEach(([lv,ids])=>rows.filter(x=>x.lv===+lv).slice(0,ids.length).forEach((sp,i)=>m[`Spells ${ids[i]}`]=sp.n));
 m.AttacksSpellcasting=rows.map(x=>`${x.lv?x.lv+"環":"戲法"} ${x.n}`).join("、");Object.entries(m).forEach(([n,v])=>text(form,n,v,n==="Feat+Traits"?8:n==="Features and Traits"?featureFontSize(v):n==="Equipment"?equipmentFontSize(v):8));
 const saveChecks=[11,18,19,20,21,22];["str","dex","con","int","wis","cha"].forEach((k,i)=>check(form,`Check Box ${saveChecks[i]}`,saveProfSet().has(k)));for(let i=0;i<(S.play?.ds?.s||0);i++)check(form,`Check Box ${12+i}`);for(let i=0;i<(S.play?.ds?.f||0);i++)check(form,`Check Box ${15+i}`);
 return skillRows;
}
// Preserve every character of long rule/character text: the fixed sheet is an index when necessary,
// and the same text is written to bounded, readable continuation fields. No second rule store.
const appendPdfText5R=(doc,form,font,title,value,prefix)=>{
 const {width,height}=doc.getPages()[0].getSize(),margin=36,size=10;
 const fieldWidth=width-margin*2,fieldHeight=height-116,lineHeight=font.heightAtSize(1)*1.2;
 const capacity=Math.max(1,Math.floor((fieldHeight-14)/(size*lineHeight)));
 const raw=String(value||""),blocks=prefix==="class-features"?raw.split(/\n(?=(?:【|\d+級\s))/):[raw];
 const chunks=[];let current=[];
 const flush=()=>{if(current.length){chunks.push(current);current=[];}};
 for(const block of blocks){
  const lines=wrapPdfText(font,block,size,fieldWidth-12);
  // Keep a whole feature together whenever it fits on one page; split only genuinely oversized features.
  if(current.length&&current.length+lines.length>capacity)flush();
  while(lines.length>capacity){chunks.push(lines.splice(0,capacity));}
  current.push(...lines);
 }
 flush();const pages=chunks.length;
 for(let i=0;i<pages;i++){
  const page=doc.addPage([width,height]);
  page.drawText(title+" "+(i+1)+"/"+pages,{x:margin,y:height-48,size:15,font,color:PDFLib.rgb(.18,.13,.08)});
  const field=form.createTextField("5r-appendix-"+prefix+"-"+(i+1));
  field.enableMultiline();
  field.addToPage(page,{x:margin,y:36,width:fieldWidth,height:fieldHeight,font,borderWidth:0,textColor:PDFLib.rgb(.14,.12,.10)});
  field.setText(chunks[i].join("\n"));
  field.setFontSize(size);
  field.enableReadOnly();
 }
 return pages;
};
const fitCompleteText5R=(doc,form,font,name,title,value,options)=>{
 const fit=fitTextField(form,name,value,font,options);
 if(!fit.overflow)return fit;
 const pages=appendPdfText5R(doc,form,font,title,value,name);
 const note="完整內容請見 PDF 附頁。";
 const marker=fitTextField(form,name,note,font,{...options,max:8});
 if(marker.overflow)throw Error("PDF continuation marker overflow: "+name);
 return {...marker,continued:true,appendixPages:pages};
};
const fitCompleteFeatures5R=(doc,form,font)=>{
 const names=["class-a-1","class-a-2"],full=featureText();
 const options={max:7,min:5,lineHeight:Math.max(1.45,font.heightAtSize(1)*1.2),pad:5};
 const fit=splitFeatureTextFields(form,names,full,font,options);
 if(!fit.overflow&&fit.blockSplit)return fit;
 const pages=appendPdfText5R(doc,form,font,"職業能力完整規則",full,"class-features");
 const index=splitFeatureTextFields(form,names,"【完整規則請見 PDF 附頁】\n"+featureText("compact"),font,options);
 if(index.overflow){text(form,names[0],"職業與子職業完整規則請見 PDF 附頁。",8);text(form,names[1],"所有能力與已選效果均保留於附頁。",8);}
 return {size:index.overflow?8:index.size,overflow:false,blockSplit:!index.overflow&&index.blockSplit,continued:true,appendixPages:pages};
};
function fill2024(form,font,doc){const c=common(),ab={str:"str",dex:"dex",con:"con",int:"int",wis:"wis",cha:"chr"},prof=proficiencySummary14?.()||{};const m={name:c.name,bg:c.bg,spiece:c.race,class:c.cp.classes,sub:c.cp.subs,LV:S.level,xp:"",AC:c.ac,HP:S.play?.hp??c.hp,"temp-hp":S.play?.thp||"",max:c.hp,"max-hd":Object.entries(S.classLevels||{[S.cls?.n]:S.level}).map(([n,l])=>`${l}d${CLASSES.find(x=>x.n===n)?.hd||""}`).join("／"),initiative:signed(c.initiative),speed:`${c.sp} 呎`,size:S.sp?.size||"中型",pro:signed(pb()),"passiv-dcp":passivePerceptionTotal()??"","class-a-1":featureText(),"class-a-2":"","speice-trat":speciesTraitText2024(),"feat-trat":featText2024(),wp_pro:`護甲：${prof.armor||"無"}\n武器：${prof.weapons||"無"}`,tool_pro:S.ruleset==="2024"?(S.bgChoice2024?.tool?displayName5R("tools",S.bgChoice2024.tool):(S.bg?.tool?displayName5R("tools",S.bg.tool):(prof.tools||"無"))):(S.bg?.tool||prof.tools||"無"),APP:S.bio?.look||"",BG_AND_PER:[S.bio?.story,S.bio?.traits,val("fFaith")?`信仰：${val("fFaith")}`:""].filter(Boolean).join("\n"),Ali:c.alignment||"",Lang:prof.languages||"",Equip:gearText(),CP:S.gear?.gold?.cp||"",SP:S.gear?.gold?.sp||"",EP:"",GP:S.gear?.gold?.gp||"",PP:S.gear?.gold?.pp||""};Object.entries(ab).forEach(([k,p])=>{m[p]=finalScore(k)||"";m[`${p}-m`]=signed(mod(finalScore(k)||10));m[`${p}-st`]=signed(saveValue(k))});
 const skm={運動:"str-ath",雜技:"dex-acr",巧手:"dex-soh",隱匿:"dex-ste",奧秘:"int-arc",歷史:"int-his",調查:"int-inv",自然:"int-nat",宗教:"int-rel",動物馴養:"wis-ah",洞悉:"wis-ins",醫藥:"wis-med",察覺:"wis-per",求生:"wis-sur",欺瞞:"chr-dec",威嚇:"chr-thr",表演:"chr-per",說服:"chr-psu"};const skillRows=projectPdfSkills(skm,Object.fromEntries(Object.entries(skm).map(([n,p])=>[n,`${p}-c`])));skillRows.forEach(r=>m[r.field]=r.value);writePdfSkillLabels(form,skillRows,font);Object.entries(ab).forEach(([k,p])=>check(form,`${p}-st-c`,saveProfSet().has(k)));const armorPro=String(prof.armor||"");check(form,"light",armorPro.includes("輕甲"));check(form,"medium",armorPro.includes("中甲"));check(form,"heavy",armorPro.includes("重甲"));check(form,"shld_pro",armorPro.includes("盾牌"));check(form,"shld",S.gear?.shield);check(form,"hero insp",S.play?.insp);
 (S.gear?.weapons||[]).slice(0,6).forEach((n,i)=>{const w=weaponLine(n),j=i+1;m[`attack-wp-name${j}`]=displayName5R("weapons",n);m[`tohit${j}`]=w?signed(w.atk):"";m[`dmg-type${j}`]=w?.dmg||"";m[`note${j}`]=w?.mastery||w?.monkNote||""});
 const ci=castInfo?.();if(ci){const k={智力:"int",感知:"wis",魅力:"cha"}[ci.ability],score=finalScore(k)||10;m.cast_atri=ci.ability;m.cast_m=signed(mod(score));m.cast_hit=signed(pb()+mod(score));m.cast_dc=8+pb()+mod(score);(ci.slots||[]).forEach((n,i)=>m[`lvl-${i+1}`]=n)}
 const ids=[...Array(9)].map((_,i)=>String(i+1)).concat("abcdefghijklmnopqrstu".split(""));spellRows().slice(0,ids.length).forEach((sp,i)=>{const id=ids[i],meta=spellMetaDb()[sp.n]||{};m[`sp${id}`]=sp.lv||"0";m[`spn-${id}`]=sp.n;m[`spt-${id}`]=meta.time||"";m[`spr-${id}`]=meta.range||"";m[`spnt-${id}`]=meta.dur||"";check(form,`chk-c${id}`,sp.con);check(form,`chk-r${id}`,sp.rit);check(form,`chk-m${id}`,String(meta.comp||"").includes("材"))});Object.entries(m).forEach(([n,v])=>text(form,n,v));const fitReport={classFeatures:fitCompleteFeatures5R(doc,form,font),species:fitCompleteText5R(doc,form,font,"speice-trat","物種特性",speciesTraitText2024(),{max:7,min:4.5,lineHeight:1.42,pad:5}),feats:fitCompleteText5R(doc,form,font,"feat-trat","專長",featText2024(),{max:8,min:4}),background:fitCompleteText5R(doc,form,font,"BG_AND_PER","背景與性格",m.BG_AND_PER,{max:7,min:5.5,lineHeight:1.22,pad:4}),equipment:fitCompleteText5R(doc,form,font,"Equip","裝備",m.Equip,{max:8,min:4.25}),appearance:fitCompleteText5R(doc,form,font,"APP","外觀描述",m.APP,{max:8,min:4.5}),proficiencies:fitCompleteText5R(doc,form,font,"wp_pro","護甲與武器熟練",m.wp_pro,{max:8,min:5}),tools:fitCompleteText5R(doc,form,font,"tool_pro","工具熟練",m.tool_pro,{max:8,min:5}),languages:fitCompleteText5R(doc,form,font,"Lang","語言",m.Lang,{max:8,min:5})};window.__lastPdfFitReport=fitReport;
 return skillRows;
}
window.exportOfficialCharacterSheet=async function(){if(!S.cls||!S.sp||!S.bg){toast("請先完成角色資料");return}const is14=S.ruleset==="2014",base=is14?"assets/character-sheets/DnD5E-中文角色卡-2014.pdf":"assets/character-sheets/dnd-2024-中文角色紙.pdf";try{toast("正在產生正式角色卡…");const [pdfBytes,fontBytes]=await Promise.all([fetch(base+'?v=20261127-pdf-skill-parity-v1').then(r=>{if(!r.ok)throw Error("無法讀取角色卡模板");return r.arrayBuffer()}),fetch("assets/fonts/NotoSansCJKtc-Regular.otf").then(r=>r.arrayBuffer())]);const doc=await PDFLib.PDFDocument.load(pdfBytes);doc.registerFontkit(fontkit);const font=await doc.embedFont(fontBytes,{subset:false});const form=doc.getForm();const skillRows=is14?fill2014(form,font):fill2024(form,font,doc);form.updateFieldAppearances(font);applyPdfSkillMarks(form,skillRows);window.__lastPdfPortraitEmbedded=!is14?await drawPortrait2024(doc,form):false;if(!is14)bakeCritical2024(doc,form,font);if(window.PDF_EXPORT_FLATTEN_FORM===true)form.flatten();const bytes=await doc.save({updateFieldAppearances:false});download(bytes,`${val("fName")||"未命名角色"}-${is14?"DND5e-2014":"DND-2024"}.pdf`);toast("正式角色卡已下載")}catch(e){console.error(e);toast(location.protocol==="file:"?"請透過網站或本機伺服器開啟後再匯出 PDF":"角色卡產生失敗："+e.message)}};
})();

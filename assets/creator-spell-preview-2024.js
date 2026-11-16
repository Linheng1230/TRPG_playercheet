/* 2024 Creator-only presentation. Canonical spell data and full tooltip stay untouched. */
(function(g) {
"use strict";
const rows=new Map((g.SPELLS_2024_TUPLES||[]).map(r=>[r[0],r]));
function normalize(s){return String(s||"").replace(/\s+/g,"").replace(/＋/g,"+");}
function action(time){
 const t=String(time||"").trim();
 if(/^附贈動作/.test(t))return {key:"bonus",label:"附贈動作"};
 if(/^反應/.test(t))return {key:"reaction",label:"反應"};
 if(/^動作/.test(t)&&!t.includes("／"))return {key:"main",label:"主要動作"};
 return {key:"other",label:t?("其他 · "+t):"其他施法時間"};
}
/* Only mechanical numeric clauses need supplementing; never invent or silently drop them. */
const valueRE=/\d+d\d+(?:\s*[+＋]\s*\d+)?|[+＋-]?\d+\s*(?:英吋|英尺|分鐘|小時|回合|呎|尺|寸|哩|里|磅|秒|日|天|週|輪|級|環|點|枚|名|個|次|支|束|隻|顆|種|GP|gp|%|AC|DC)/g;
function values(text){return [...String(text||"").matchAll(valueRE)].map(m=>normalize(m[0])).filter(Boolean);}
function numericSupplements(full,existing){
 const parts=String(full||"").replace(/\s+/g," ").split(/(?<=[。；])\s*/).map(s=>s.trim()).filter(Boolean);
 let visible=normalize(existing);
 const supplements=[];
 for(const part of parts){
   const required=values(part);
   const scaling=/(升環施法|高環施法|戲法強化)/.test(part);
   if(part.includes("戲法強化")){
     const stages=[...part.matchAll(/(\d+)級[（(]\s*(\d+d\d+)\s*[）)]/g)];
     if(stages.length>=2){
       const compact="戲法強化："+stages.map(m=>m[1]+"級"+m[2]).join("、");
       if(!visible.includes(normalize(compact)))supplements.push(compact);
       visible+=normalize(part);
       continue;
     }
   }
   if(!scaling&&(!required.length||required.every(x=>visible.includes(x))))continue;
   if(scaling&&visible.includes(normalize(part)))continue;
   supplements.push(part);
   visible+=normalize(part);
 }
 return supplements;
}
function preview(sp,level=1,meta={}){
 const id=String(sp?.identifier||"");
 const row=rows.get(id);
 const full=String(g.SPELLS_2024_FULL_RULES?.[id]||sp?.d||"").trim();
 if(!row)return {text:full||"",numbers:values(full)};
 const short=String(row[13]||"").replace(/\s+/g," ").trim();
 const fact=g.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,level)||{};
 let text=fact.effect||short||full;
 const extra=[];
 if(id==="shillelagh"){
   const base=g.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,1)?.damage||"1d8＋施法屬性調整值";
   const ranks=[...full.matchAll(/(\d+)級[（(]\s*(\d+d\d+)\s*[）)]/g)].map(m=>m[1]+"級 "+m[2]);
   text="強化短棒或長棍，以施法屬性進行攻擊與傷害擲骰；傷害 "+base;
   if(ranks.length)text+="；"+ranks.join("、");
   if(level>=5&&fact.damage)text+="；目前 "+fact.damage;
   text+="。";
 }else{
   const mechanics=[fact.damage?("傷害 "+fact.damage):"",fact.heal?("治療 "+fact.heal):"",fact.save?("豁免 "+fact.save):""].filter(Boolean);
   for(const m of mechanics)if(!normalize(text).includes(normalize(m.replace(/^(傷害|治療|豁免)\s*/,""))))extra.push(m);
   if(extra.length)text+="；"+extra.join("；");
 }
 const metaText=[meta?.range,meta?.dur,meta?.time].filter(Boolean).join(" ");
 const supplements=id==="shillelagh"?[]:numericSupplements(full,text+" "+metaText);
 if(supplements.length)text+="；"+supplements.join(" ");
 return {text:text.trim(),numbers:values(full)};
}
g.ZIZI_CREATOR_SPELL_PREVIEW_2024=Object.freeze({action,preview,numericSupplements,values});
})(globalThis);

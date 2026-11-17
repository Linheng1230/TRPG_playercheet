/* 2024 Creator-only presentation. Canonical spell data and full tooltip stay untouched. */
(function(g) {
"use strict";
const rows=new Map((g.SPELLS_2024_TUPLES||[]).map(r=>[r[0],r]));
function normalize(s){return String(s||"").replace(/\s+/g,"").replace(/＋/g,"+");}
function action(time){
 const t=String(time||"").trim();
 if(/^附贈動作/.test(t))return {key:"bonus",label:"附贈動作"};
 if(/^反應/.test(t))return {key:"reaction",label:"反應"};
 if(/^動作/.test(t)&&t.includes("／"))return {key:"other",keys:["main","other"],label:t.replace(/^動作/,"主要動作")};
 if(/^動作/.test(t)&&!t.includes("／"))return {key:"main",label:"主要動作"};
 return {key:"other",label:t?("其他 · "+t):"其他施法時間"};
}
/* Only mechanical numeric clauses need supplementing; never invent or silently drop them. */
const valueRE=/\d+d\d+(?:\s*[+＋]\s*\d+)?|[+＋-]?\d+\s*(?:英吋|英尺|分鐘|小時|回合|呎|尺|寸|哩|里|磅|秒|日|天|週|輪|級|環|點|枚|名|個|次|支|束|隻|顆|種|GP|gp|%|％|AC|DC)/g;
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
function modifierSupplement(full,visible){
 // Canonical-only mechanism: when a spell's condensed sentence omits its
 // spellcasting ability modifier, retain the relevant original rule sentence.
 if(/施法(?:關鍵)?屬性調整值/.test(visible))return [];
 const source=String(full||"").replace(/\s+/g," ");
 return source.split(/(?<=。)/).map(x=>x.trim()).filter(x=>
   /施法(?:關鍵)?屬性調整值/.test(x)&&
   /(傷害|生命值|治療|藥水|瓶數|數量|傷害骰)/.test(x)
 ).slice(0,2).filter(x=>!normalize(visible).includes(normalize(x)));
}
function optionTypeSupplement(full,visible){
 const typeRE=/酸蝕|鈍擊|寒冷|火焰|力場|閃電|黯蝕|穿刺|毒素|心靈|光耀|揮砍|雷鳴/g;
 for(const clause of String(full||"").split(/[。；]/)){
   if(!/(選擇|任選)/.test(clause)||!/(傷害(?:的)?型別|傷害類型|抗性|吐息|從[^。]{0,100}(?:中任選|中選擇))/.test(clause))continue;
   const types=[...new Set(clause.match(typeRE)||[])];
   if(types.length<3||types.every(t=>visible.includes(t)))continue;
   return ["可選傷害／抗性類型："+types.join("／")];
 }
 return [];
}
function primarySaveSupplement(full,visible){
 const source=String(full||"");
 const m=source.match(/(?:^|。)[^。]{0,115}(?:使其進行|必須進行|進行一次)[^。]{0,35}(力量|敏捷|體質|智力|感知|魅力)\s*豁免[^。]{0,65}/);
 if(!m)return [];
 const ability=m[1];
 if(new RegExp(ability+"\\s*豁免|豁免\\s*"+ability).test(visible))return [];
 return [m[0].replace(/^。/,"").trim()];
}
function defensiveContextSupplement(full,visible){
 const source=String(full||"");
 const literalPatterns=[
   /任何完全位於該區域內的生物和物件都將免疫雷鳴傷害/,
   /目標對除了心靈傷害外的所有傷害型別具有抗性/,
   /其擁有鈍擊、穿刺和揮砍傷害的抗性[^。]{0,75}/,
   /你和你的盟友獲得毒素傷害的抗性/,
   /其進行敏捷豁免時具有優勢/,
   /你長出爪子（揮砍）、獠牙（穿刺）、犄角（穿刺）或蹄（鈍擊）/,
   /其具有對毒素、心靈傷害的免疫/,
   /免疫：黯蝕，毒素/,
   /抗性：酸蝕（僅水），閃電和雷鳴（僅氣），穿刺和揮砍（僅地）/,
   /免疫：火焰（僅火），毒素/,
   /豁免失敗者將承受全部累積的火焰傷害，豁免成功則只受到一半傷害/,
   /受到兩倍於你因此被移動呎數點的力場傷害/
 ];
 const found=[];
 for(const pattern of literalPatterns){
   const match=source.match(pattern);
   if(match&&!normalize(visible).includes(normalize(match[0])))found.push(match[0]);
 }
 return found;
}
function reconcileKnownSourceDamageTypes(id,text,full){
 // Exact case corrections only when the pinned 2024 full rule corroborates them.
 // The older 5RTools summary can disagree with the actual full rule.
 if(id==="mordenkainens-faithful-hound"&&/4d8點力場傷害/.test(full))
   text=text.replace(/4d8\s*穿刺/g,"4d8 力場");
 if(id==="blade-barrier"&&/6d10力場傷害/.test(full))
   text=text.replace(/6d10\s*揮砍/g,"6d10 力場");
 if(id==="befuddlement"&&/10d12心靈傷害/.test(full))
   text=text.replace(/4d6\s*心靈/g,"10d12 心靈");
 return text;
}
function damagePairSupplement(full,visible){
 const type="酸蝕|鈍擊|寒冷|火焰|力場|閃電|黯蝕|穿刺|毒素|心靈|光耀|揮砍|雷鳴";
 const re=new RegExp("(\\d+d\\d+)(?:\\s*[+＋]\\s*\\d+)?(?:\\s*點)?\\s*("+type+")\\s*傷害","g");
 const result=[],seen=new Set(),source=String(full||"");
 for(const m of source.matchAll(re)){
   const key=m[1]+"|"+m[2];
   if(seen.has(key))continue;
   seen.add(key);
   // The short effect may present a shared type after multiple dice;
   // do not add redundant source sentences in that case.
   const adjacent=new RegExp(m[1]+"[^。；]{0,22}"+m[2]+"|"+m[2]+"[^。；]{0,22}"+m[1]).test(visible);
   if(adjacent)continue;
   const start=Math.max(0,source.lastIndexOf("。",m.index)+1);
   const endIdx=source.indexOf("。",m.index);
   const end=endIdx<0?source.length:endIdx+1;
   const clause=source.slice(start,end).replace(/\s+/g," ").trim();
   if(clause&&!normalize(visible).includes(normalize(clause)))result.push(clause);
 }
 return result;
}
function hardCapSupplement(full,visible){
 // Chinese numerals are mechanically meaningful even when digit-only QA passes.
 const cap=/(?:至多|最多|不超過)[^。，；]{0,28}?(?:\d+|[一二兩三四五六七八九十百千]+)(?:名|個|位|枚|件|支|束|隻|顆|道|種|磅)(?:[^。，；]{0,12})/g;
 const results=[],seen=new Set();
 for(const m of String(full||"").matchAll(cap)){
   const matched=m[0].trim();
   const unit=matched.match(/(?:\d+|[一二兩三四五六七八九十百千]+)(?:名|個|位|枚|件|支|束|隻|顆|道|種|磅)/);
   if(!unit||seen.has(matched))continue;
   seen.add(matched);
   if(normalize(visible+" "+results.join(" ")).includes(normalize(matched)))continue;
   if(normalize(visible).includes(normalize(unit[0]))&&matched.length<23)continue;
   results.push("上限："+matched);
 }
 return results;
}
function preview(sp,level=1,meta={}){
 const id=String(sp?.identifier||"");
 const row=rows.get(id);
 const full=String(g.SPELLS_2024_FULL_RULES?.[id]||sp?.d||"").trim();
 if(!row)return {text:full||"",numbers:values(full)};
 const short=String(row[13]||"").replace(/\s+/g," ").trim();
 const fact=g.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,level)||{};
 let text=fact.effect||short||full;
 // The canonical short text can be intentionally brief but must not override a
 // numeric cap given in the complete 2024 rule. No separate rules catalog.
 if(id==="animate-objects"&&/最大數量等於你的施法屬性調整值/.test(full)){
   text="依施法屬性調整值決定最多活化物件數量（中／小型計1個、大型計2個、巨型計3個），形成構裝作戰";
 }else if(id==="arcane-vigor"&&/一枚或兩枚/.test(full)){
   text="消耗1或2枚未使用生命骰，回復擲骰總和＋施法屬性調整值生命值";
 }
 text=reconcileKnownSourceDamageTypes(id,text,full);
 const extra=[];
 if(id==="shillelagh"){
   const base=g.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,1)?.damage||"1d8＋施法屬性調整值";
   const ranks=[...full.matchAll(/(\d+)級[（(]\s*(\d+d\d+)\s*[）)]/g)].map(m=>m[1]+"級 "+m[2]);
   text="強化短棒或長棍，以施法屬性進行攻擊與傷害擲骰；傷害 "+base;
   if(ranks.length)text+="；"+ranks.join("、");
   if(level>=5&&fact.damage)text+="；目前 "+fact.damage;
   text+="。";
 }else{
   const correctedDamage=reconcileKnownSourceDamageTypes(id,fact.damage||"",full);
   const mechanics=[correctedDamage?("傷害 "+correctedDamage):"",fact.heal?("治療 "+fact.heal):"",fact.save?("豁免 "+fact.save):""].filter(Boolean);
   const hasChoiceTypes=/任選|選擇.*傷害型別/.test(short)&&
     (short.match(/酸蝕|寒冷|火焰|閃電|毒素|心靈|雷鳴|鈍擊|力場|穿刺|揮砍|光耀|黯蝕/g)||[]).length>=2;
   for(const m of mechanics){
     // Quick-facts may select the first damage type, but a choice spell
     // must retain the player's options rather than imply one fixed type.
     if(hasChoiceTypes&&m.startsWith("傷害 ")&&/\d+d\d+/.test(text))continue;
     if(!normalize(text).includes(normalize(m.replace(/^(傷害|治療|豁免)\s*/,""))))extra.push(m);
   }
   if(extra.length)text+="；"+extra.join("；");
 }
 const metaText=[meta?.range,meta?.dur,meta?.time].filter(Boolean).join(" ");
 const supplements=id==="shillelagh"?[]:numericSupplements(full,text+" "+metaText);
 if(id!=="shillelagh")supplements.push(...modifierSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...optionTypeSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...primarySaveSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...defensiveContextSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...damagePairSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...hardCapSupplement(full,text+" "+metaText+" "+supplements.join(" ")));
 if(/豁免成功(?:則|時)?(?:傷害減半|受到的傷害減半)|豁免成功(?:則|時)?.{0,8}傷害減半/.test(full)&&!/豁免成功.{0,8}傷害減半/.test(text)){
   supplements.push("豁免成功時傷害減半");
 }
 if(supplements.length)text+="；"+supplements.join(" ");
 return {text:text.trim(),numbers:values(full)};
}
g.ZIZI_CREATOR_SPELL_PREVIEW_2024=Object.freeze({action,preview,numericSupplements,values});
})(globalThis);

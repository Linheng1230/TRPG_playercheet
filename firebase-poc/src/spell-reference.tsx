import React from "react";
import "../../assets/damage-semantic-5r.css";
// Use the same pinned 5RTools-derived spell datasets as the main creator.
import "../../assets/data/spells-phb-2024.js";
import "../../assets/data/spell-rules-2024.js";
import spells2014 from "../../assets/data/spells-phb-2014.json";

type SpellFacts={name:string;english:string;level:number;time:string;range:string;components:string;duration:string;concentration:boolean;ritual:boolean;short:string;rules:string};
type Spell2024=[string,string,string,string,number,string,number,number,string,string,string,string,string,string];
const globals=globalThis as typeof globalThis & {
 SPELLS_2024_TUPLES?:Spell2024[];
 SPELLS_2024_FULL_RULES?:Record<string,string>;
 SPELLS_2024_LEGACY_NAMES?:Record<string,string>;
};
const normalize=(name:string)=>name.trim().replace(/^\d+\s*環\s*/,"").split("・")[0].trim();
const list2024=()=>globals.SPELLS_2024_TUPLES??[];
const plain2014=(entry:unknown):string=>{
 if(typeof entry==="string")return entry.replace(/\{@(?:dice|damage|hit|dc|spell|condition|creature|item|filter|b|i)\s+([^}|]+)(?:\|[^}]+)?\}/g,"$1");
 if(Array.isArray(entry))return entry.map(plain2014).filter(Boolean).join("\n");
 if(entry&&typeof entry==="object"){
  const o=entry as Record<string,unknown>;
  return [o.name,plain2014(o.entries??o.entry??"")].filter(Boolean).join("：");
 }
 return "";
};
const units:Record<string,string>={action:"動作",bonus:"附贈動作",reaction:"反應",minute:"分鐘",hour:"小時",instant:"即效",feet:"呎",touch:"觸碰",self:"自身",sight:"視線",unlimited:"無限",special:"特殊"};
const unit=(s:unknown)=>units[String(s)]||String(s||"");
export function lookupSpellReference(input:string,ruleset:"2014"|"2024"):SpellFacts|null{
 const name=normalize(input);
 if(ruleset==="2024"){
  const normalized=({指引術:"神導術"} as Record<string,string>)[name]||globals.SPELLS_2024_LEGACY_NAMES?.[name]||name;
  const row=list2024().find(r=>r[3]===normalized||r[2].toLowerCase()===normalized.toLowerCase()||r[0]===normalized);
  if(!row)return null;
  const rule=globals.SPELLS_2024_FULL_RULES?.[row[0]];
  return {name:row[3],english:row[2],level:row[4],time:row[9],range:row[10],components:row[11],duration:row[12],concentration:row[6]===1,ritual:row[7]===1,short:row[13],rules:rule||row[13]};
 }
 const source=(spells2014 as {spell?:Record<string,unknown>[]}).spell||[];
 const row=source.find(r=>r.name===name||String(r.ENG_name||"").toLowerCase()===name.toLowerCase());
 if(!row)return null;
 const times=(row.time as Record<string,unknown>[]|undefined)||[];
 const range=(row.range??{}) as {distance?:{type?:string;amount?:number}};
 const comps=(row.components??{}) as Record<string,unknown>;
 const duration=(row.duration as Record<string,unknown>[]|undefined)||[];
 return {name:String(row.name),english:String(row.ENG_name||""),level:Number(row.level)||0,
  time:times.map(t=>[t.number,unit(t.unit)].filter(Boolean).join(" ")).join("、")||"—",
  range:range.distance?.amount?range.distance.amount+" "+unit(range.distance?.type):unit(range.distance?.type)||"—",
  components:[comps.v?"聲語":"",comps.s?"姿勢":"",comps.m?"材料":""].filter(Boolean).join("、")||"—",
  duration:duration.map(d=>d.type==="timed"?(String((d.duration as Record<string,unknown>)?.amount||"")+" "+unit((d.duration as Record<string,unknown>)?.type)):unit(d.type)).join("、")||"—",
  concentration:duration.some(d=>d.concentration===true),ritual:(row.meta as Record<string,unknown>|undefined)?.ritual===true,
  short:"",rules:plain2014(row.entries)};
}
const damageType:Record<string,string>={
 "酸蝕":"acid","鈍擊":"bludgeoning","寒冷":"cold","火焰":"fire",
 "力場":"force","閃電":"lightning","黯蝕":"necrotic","穿刺":"piercing",
 "毒素":"poison","心靈":"psychic","光耀":"radiant","揮砍":"slashing","雷鳴":"thunder"
};
// Pure presentation-only tokens. Never rewrite the canonical rules or infer effects.
const semanticToken=/(戲法強化|升環施法|高環施法|酸蝕|鈍擊|寒冷|火焰|閃電|黯蝕|穿刺|毒素|心靈|光耀|揮砍|雷鳴|力場|附贈動作|反應動作|法術攻擊|攻擊檢定|豁免檢定|豁免|優勢|劣勢|專注|儀式|失明|目盲|耳聾|隱形|倒地|擒抱|震懾|中毒|魅惑|恐懼|束縛|麻痺|昏迷|力竭|石化|失能|生命值|臨時生命值|恢復|治療|傷害|施法屬性調整值|法術位|力量|敏捷|體質|智力|感知|魅力|聲語|姿勢|材料|射程|觸碰|自身|動作|即效|召氣|召土|召火|召水|塑形元素|\d+\s*(?:呎|尺|分鐘|小時|回合|輪|天|環|級|點|枚|個|次)|\d+d\d+(?:\s*[+＋-]\s*\d+)?)/g;
const categories:Record<string,string>={
 "戲法強化":"section","升環施法":"section","高環施法":"section",
 "附贈動作":"action","反應動作":"action","動作":"action",
 "聲語":"component","姿勢":"component","材料":"component",
 "觸碰":"range","射程":"range","自身":"range",
 "法術攻擊":"check","攻擊檢定":"check","豁免檢定":"check","豁免":"check",
 "優勢":"check","劣勢":"check","專注":"duration","儀式":"duration",
 "失明":"condition","目盲":"condition","耳聾":"condition","隱形":"condition",
 "倒地":"condition","擒抱":"condition","震懾":"condition","中毒":"condition",
 "魅惑":"condition","恐懼":"condition","束縛":"condition","麻痺":"condition",
 "昏迷":"condition","力竭":"condition","石化":"condition","失能":"condition",
 "生命值":"healing","臨時生命值":"healing","恢復":"healing","治療":"healing",
 "傷害":"damage-word","施法屬性調整值":"ability","法術位":"resource",
 "召氣":"option","召土":"option","召火":"option","召水":"option","塑形元素":"option",
 "即效":"duration"
};
function semanticClass(token:string):string{
 if(damageType[token])return "damage";
 if(/^(?:力量|敏捷|體質|智力|感知|魅力)$/.test(token))return "ability";
 if(/^\d+d\d+/.test(token))return "dice";
 if(/^\d+\s*(?:呎|尺)$/.test(token))return "range";
 if(/^\d+\s*(?:分鐘|小時|回合|輪|天)$/.test(token))return "duration";
 if(/^\d+\s*(?:環|級|點|枚|個|次)$/.test(token))return "quantity";
 return categories[token]||"";
}
function semanticText(value:string):React.ReactNode[]{
 const pieces:React.ReactNode[]=[];
 let last=0,index=0;
 for(const found of value.matchAll(semanticToken)){
  const offset=found.index??0;
  if(offset>last)pieces.push(value.slice(last,offset));
  const token=found[0],kind=semanticClass(token);
  if(kind==="damage"){
   pieces.push(<span key={index++} className="damage-semantic" data-damage-type={damageType[token]}>{token}</span>);
  }else if(kind){
   pieces.push(<strong key={index++} className={"fb-semantic fb-semantic-"+kind}>{token}</strong>);
  }else pieces.push(token);
  last=offset+token.length;
 }
 if(last<value.length)pieces.push(value.slice(last));
 return pieces;
}
export function SpellReference({name,ruleset}:{name:string;ruleset:"2014"|"2024"}){
 const spell=lookupSpellReference(name,ruleset);
 if(!spell)return <span title="未找到相同規則版本的正式法術資料">{name} <small>（無速查資料）</small></span>;
 return <details className="fb-spell-reference">
   <summary><strong>{spell.name}</strong> <small>{spell.level?spell.level+" 環":"戲法"} · 點擊速查</small></summary>
   <div className="fb-spell-detail">
     <p><strong>{spell.english}</strong> · {ruleset} · {spell.level?spell.level+" 環":"戲法"} {spell.concentration?<> · {semanticText("專注")}</>:null}{spell.ritual?<> · {semanticText("儀式")}</>:null}</p>
     <dl><div><dt>施法時間</dt><dd>{semanticText(spell.time)}</dd></div><div><dt>射程</dt><dd>{semanticText(spell.range)}</dd></div><div><dt>成分</dt><dd>{semanticText(spell.components)}</dd></div><div><dt>持續時間</dt><dd>{semanticText(spell.duration)}</dd></div></dl>
     {spell.short&&<p className="fb-spell-short">{semanticText(spell.short)}</p>}
     <div className="fb-spell-rules">{semanticText(spell.rules||"此法術無完整說明資料。")}</div>
   </div>
 </details>;
}

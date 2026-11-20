/** DM's in-memory, read-only projection of the canonical v9/v10 character Save.
 * Do not recalculate rules, create localStorage records, or disclose originalJson.
 * The original creator remains the authority for computed AC/saves/features.
 */
export type DmSheet = {
  id: string;
  ruleset: "2014"|"2024";
  name: string; player: string; className: string; subclass: string;
  species: string; background: string; level: number;
  alignment: string; gender: string; age: string; faith: string;
  portrait: string;
  abilities: {key:string; label:string; base:number|null}[];
  hp: number|null; hpMax: number|null; tempHp: number|null;
  hitDice: string; inspiration: boolean; deathSuccess: number; deathFailure: number;
  skills: string[]; expertise: string[];
  cantrips: string[]; prepared: string[]; spellbook: string[]; customSpells: string[];
  style: string; mastery: string[]; featChoices:string[]; originChoices: string[];
  equip: {armor:string;shield:boolean;weapons:string[];items:string;coins:string[]};
  resources: {name:string;current:string;max:string}[];
  bio:{label:string;value:string}[];
};

const abilityNames=[["str","力量"],["dex","敏捷"],["con","體質"],["int","智力"],["wis","感知"],["cha","魅力"]] as const;
const text=(value:unknown,max=160):string=>typeof value==="string"?value.trim().slice(0,max):"";
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const strArray=(v:unknown,max=100):string[]=>Array.isArray(v)?v.slice(0,max).map(x=>text(x,140)).filter(Boolean):[];
const finite=(v:unknown):number|null=>typeof v==="number"&&Number.isFinite(v)?v:null;
const detail=(v:unknown):string=>{
  if(typeof v==="string")return text(v,200);
  if(typeof v==="number"&&Number.isFinite(v))return String(v);
  if(typeof v==="boolean")return v?"是":"否";
  if(Array.isArray(v))return v.slice(0,12).map(detail).filter(Boolean).join("、").slice(0,300);
  if(v&&typeof v==="object")return Object.entries(obj(v)).slice(0,12).map(([k,x])=>[text(k,70),detail(x)].filter(Boolean).join("：")).filter(Boolean).join("；").slice(0,330);
  return "";
};
const selection=(v:unknown):string[]=>Object.entries(obj(v)).slice(0,25).map(([k,x])=>{
  const label=text(k,70),value=detail(x);
  return value?`${label}：${value}`:"";
}).filter(Boolean);
const spellSet=(v:unknown):string[]=>[...new Set(strArray(v,100))];
const isPortrait=(value:unknown):value is string=>
  typeof value==="string"&&value.length<430_000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);

/** Only derive directly persisted values; label base attributes explicitly. */
export function projectDmSheet(raw:string):DmSheet{
  if(new TextEncoder().encode(raw).byteLength>512*1024)throw Error("角色存檔超過上限");
  let save:Record<string,unknown>;
  try{save=obj(JSON.parse(raw));}catch{throw Error("無法讀取角色存檔");}
  if((save.v!==9&&save.v!==10)||!["2014","2024"].includes(String(save.ruleset))
    ||typeof save.id!=="string"||!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(save.id))
    throw Error("不支援的角色存檔格式");
  const meta=obj(save.meta),play=obj(save.play),bio=obj(save.bio),base=obj(save.base),gear=obj(save.gear);
  const gold=obj(gear.gold),abi=obj(save.asi),choice2024=obj(save.classChoices2024);
  const levels=Number(save.level);
  const race=(save.ruleset==="2014"?"種族":"物種");
  const coins=([["pp","鉑幣"],["gp","金幣"],["sp","銀幣"],["cp","銅幣"]] as const)
    .map(([k,label])=>Number.isFinite(Number(gold[k]))&&Number(gold[k])!==0?`${label} ${Number(gold[k])}`:"").filter(Boolean);
  const resources=Object.entries(obj(play.res)).slice(0,30).map(([k,v])=>{
    const labels=obj(obj(save.sessionResourceLimits).classes),limit=obj(labels[k]);
    const fallback=obj(play.resMax)[k];
    return{name:text(limit.label)||text(k),current:detail(v),max:detail(limit.max??fallback)};
  }).filter(r=>r.name);
  const featChoices=Object.entries(abi).filter(([,v])=>obj(v).t==="feat").map(([lv,v])=>`${lv} 級：${text(obj(v).feat)}`).filter(x=>!x.endsWith("："));
  const customSpells=Array.isArray(save.customSpells)?save.customSpells.slice(0,100).map(x=>{
    const spell=obj(x),name=text(spell.n),lv=Number(spell.lv);
    return name?`${Number.isFinite(lv)&&lv>0?lv+" 環":"戲法"} ${name}${text(spell.note)?"・"+text(spell.note):""}`:"";
  }).filter(Boolean):[];
  return {
    id:save.id,ruleset:save.ruleset as "2014"|"2024",
    name:text(meta.name,90)||"未命名冒險者",player:text(meta.player,90),
    className:text(save.cls,90),subclass:text(save.subName,100),
    species:text(save.sp,90),background:text(save.bg,90),
    level:Number.isInteger(levels)&&levels>=1&&levels<=20?levels:1,
    alignment:text(meta.align,70),gender:text(meta.gender,50),age:text(meta.age,25),faith:text(meta.faith,70),
    portrait:isPortrait(save.portrait)?save.portrait:"",
    abilities:abilityNames.map(([key,label])=>({key,label,base:finite(base[key])})),
    hp:finite(play.hp),hpMax:finite(play.hpMax),tempHp:finite(play.thp),
    hitDice:detail(play.hd),inspiration:play.insp===true,
    deathSuccess:Math.max(0,Math.min(3,Number(obj(play.ds).s)||0)),
    deathFailure:Math.max(0,Math.min(3,Number(obj(play.ds).f)||0)),
    skills:spellSet(save.skills),expertise:spellSet(save.expertise),
    cantrips:spellSet(save.cantrips),prepared:spellSet(save.prepared),spellbook:spellSet(save.spellbook),
    customSpells,style:text(save.style),mastery:spellSet(save.mastery),
    featChoices,originChoices:[
      ...selection(save.spChoices),
      ...Object.entries(choice2024).slice(0,15).flatMap(([klass,value])=>selection(value).map(x=>`${text(klass,45)}・${x}`)),
      ...selection(save.classChoices14),
      ...featChoices,
      ...(text(save.boon)?[`史詩恩賜：${text(save.boon)}`]:[]),
    ].slice(0,80),
    equip:{
      armor:text(gear.armor,90),shield:gear.shield===true,
      weapons:spellSet(gear.weapons),items:text(gear.items,2000),coins,
    },
    resources,
    bio:([["外貌",bio.look],["性格與理念",bio.traits],["背景故事",bio.story],["盟友與組織",bio.allies],["備註",bio.notes],["跑團備註",play.notes]] as [string,unknown][])
      .map(([label,v])=>({label,value:text(v,1800)})).filter(x=>x.value),
  };
}

/** Treat a revoked share, vanished membership, or newer revision as an invalid
 * read-only GM view. Server authorization remains mandatory on every fetch. */
export function sharedSheetRevisionStatus(
  roster:readonly Record<string,unknown>[]|undefined,
  openedId:string,
  openedRevision:number|null,
):"valid"|"revoked"|"stale"|"loading"{
  if(!roster)return "loading";
  const row=roster.find(c=>String(c.id)===openedId);
  if(!row)return "revoked";
  if(openedRevision!==null&&(!Number.isSafeInteger(openedRevision)||Number(row.revision)!==openedRevision))
    return "stale";
  return "valid";
}

/* 2024 higher-level creation; reuses canonical magic item IDs. */
(function(root){
"use strict";
const themes=["arcana","armaments","implements","relics"];
const rarities=["common","uncommon","rare","very rare","legendary"];
const tableURL=theme=>"https://roll20.net/compendium/dnd5e/Rules:"+({arcana:"Arcana",armaments:"Armaments",implements:"Implements",relics:"Relics"}[theme])+"%20Tables?expansion=33359";
const validLevel=n=>Number.isInteger(n)&&n>=1&&n<=20;
function budget(level){
 if(!validLevel(level))throw new RangeError("level must be 1..20");
 const [base, multiplier, common, uncommon, rare, veryRare]=level===1?[0,0,0,0,0,0]:level<=4?[0,0,1,0,0,0]:level<=10?[500,25,1,1,0,0]:level<=16?[5000,250,2,3,1,0]:[20000,250,2,4,3,1];
 return {base,multiplier,slots:[...Array(common).fill("common"),...Array(uncommon).fill("uncommon"),...Array(rare).fill("rare"),...Array(veryRare).fill("very rare")]};
}
function dice(n,sides){if(!Number.isInteger(n)||n<1||n>sides)throw new RangeError("invalid dice");return n}
function gold(level,d10){const b=budget(level);return b.base+(b.multiplier?dice(d10,10)*b.multiplier:0)}
function theme(d4){return themes[dice(d4,4)-1]}
function recommended(cls){
 const groups={arcana:["Sorcerer","Warlock","Wizard","術士","邪術師","法師"],armaments:["Barbarian","Fighter","Paladin","Ranger","野蠻人","戰士","聖騎士","聖武士","遊俠"],implements:["Bard","Monk","Rogue","吟遊詩人","武僧","遊蕩者"],relics:["Cleric","Druid","牧師","德魯伊"]};
 return themes.find(t=>groups[t].includes(cls))||null;
}
// Imported tables are local data supplied by an authorized user; never silently renormalize missing rows.
function compileTable(rows,rarity,catalog){
 if(!rarities.includes(rarity)||!Array.isArray(rows))throw new TypeError("invalid table");
 const byId=new Map(catalog.map(x=>[x.id,x])),faces=Array(100).fill(null);
 for(const r of rows){
  const lo=dice(r.min,100),hi=dice(r.max,100);
  const ids=Array.isArray(r.ids)?[...new Set(r.ids)]:[r.id];
  if(lo>hi||!ids.length||ids.some(id=>typeof id!=="string"||byId.get(id)?.rarity!==rarity))throw new Error("unresolved item or rarity");
  const result=ids.length===1?ids[0]:Object.freeze(ids);
  for(let i=lo-1;i<hi;i++){if(faces[i]!==null)throw new Error("overlap");faces[i]=result}
 }
 if(faces.some(x=>x===null))throw new Error("incomplete D100 table");
 return Object.freeze(faces);
}
function lookup(faces,d100){if(!Array.isArray(faces)||faces.length!==100)throw new Error("unverified table");return faces[dice(d100,100)-1]}
function grant(state,plan,catalog,add){
 if(state?.ruleset!=="2024"||!state.gear||!state.cls||state.gear.startingResources2024)return {ok:false,reason:"ineligible or already granted"};
 try{
  const b=budget(state.level),ids=plan.ids,byId=new Map(catalog.map(x=>[x.id,x]));
  if(state.level===1||!Array.isArray(ids)||ids.length!==b.slots.length||ids.some((id,i)=>byId.get(id)?.rarity!==b.slots[i]))throw new Error("invalid slots");
  const gp=gold(state.level,plan.d10);
  const draft={...state,gear:JSON.parse(JSON.stringify(state.gear))};
  const wallet=draft.gear.gold||{pp:0,gp:0,sp:0,cp:0};
  if(!Number.isSafeInteger(wallet.gp)||wallet.gp<0||!Number.isSafeInteger(wallet.gp+gp))throw new Error("invalid wallet");
  for(const id of ids)if(!add(draft,id)?.ok)throw new Error("item import failed");
  draft.gear.gold={...wallet,gp:wallet.gp+gp};
  draft.gear.startingResources2024={version:1,level:state.level,gp,d10:b.multiplier?plan.d10:null,ids:[...ids],records:Array.isArray(plan.records)?JSON.parse(JSON.stringify(plan.records)):[]};
  state.gear=draft.gear;return {ok:true,receipt:state.gear.startingResources2024};
 }catch(e){return {ok:false,reason:e.message}}
}
const api=Object.freeze({budget,gold,theme,recommended,compileTable,lookup,grant,tableURL,themes:Object.freeze(themes),rarities:Object.freeze(rarities)});
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.StartingResources5R=api;
})(typeof window!=="undefined"?window:globalThis);

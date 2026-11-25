/* D&D 5R/5e exact-original character workbook export.
 * Template Source of Truth: the user-provided CLEAN original spreadsheet:
 * https://docs.google.com/spreadsheets/d/1FCBjPChNOgZ4608CTO7Hrf9ijEFVxU4CBSv1jFD7e3Q/edit
 * Preserve original formula cells; write input values, cached results and native portrait.
 * Live statistics come from the existing site; exporting never changes character state.
 */
(function () {
"use strict";
let loadPromise=null, exporting=false;
const C={navy:"07152B",navy2:"15314F",burgundy:"800000",gold:"B58A4C",line:"C7B79B",paper:"FFF9ED",cream:"F5EBD4",light:"FFFFFF",ink:"242B36",muted:"756B5C",manual:"FFF3CE",pale:"E9F0E4",rose:"F9E7DE"};
const FONT="Microsoft JhengHei";
const SIGNED=n=>n==null?"":(n>0?"+"+n:String(n));
const TEXT=v=>v==null?"":String(v);
const MINUS=v=>v==null?"":v;
function safe(fn,fallback=null){try{const v=fn();return v===undefined?fallback:v}catch(e){return fallback}}
function field(id){return TEXT(document.getElementById(id)?.value).trim()}
function label(kind,name){if(!name)return "";return S.ruleset==="2024"?safe(()=>displayName5R(kind,name),name):name}
function subName(){
 if(S.sub==null)return "";
 return safe(()=>prog()?.subs?.[S.sub]?.n,"")||"";
}
function ensureExportData(){
 if(!S.cls||!S.sp||!S.bg)throw Error("請先完成職業、物種與背景，再匯出角色卡");
 const rule=S.ruleset==="2014"?"D&D 5e（2014）":"D&D 5R（2024）",prof=safe(()=>allSkills(),new Set()),saveProfs=safe(()=>saveProfSet(),new Set());
 const abilities=ABILITIES.map(a=>({name:a.n,key:a.k,score:safe(()=>finalScore(a.k)),mod:safe(()=>mod(finalScore(a.k))),save:safe(()=>saveTotal(a.k)),proficient:saveProfs.has(a.k),detail:safe(()=>abilityScoreBreakdown(a.k),"")}));
 const skills=SKILLS.map(sk=>{const d=safe(()=>skillCheckDetails(sk),null);return {name:label("skills",sk.n),rawName:sk.n,ability:ABN[sk.a],bonus:d?.total??null,proficient:!!d?.trained,expert:!!d?.expert,parts:d?.parts||[],key:sk.a,detail:(d?.parts||[]).map(x=>x.label+" "+SIGNED(x.amount)).join("、")};});
 const speed=safe(()=>speedInfo(),null);
 const ac=safe(()=>acInfo(),{total:null,rows:[],notes:[]});
 const gear=S.gear||{},coin=gear.gold||{};
 const catalog=safe(()=>shopCatalog(),[]),catMap=new Map(catalog.map(x=>[x.id,x]));
 const bought=Object.entries(gear.purchases||{}).filter(([,n])=>Number(n)>0).map(([id,n])=>{const e=catMap.get(id);return {name:e?label(e.cat==="武器"?"weapons":e.cat==="護甲"?"armors":e.cat==="工具"?"tools":"items",e.n):id,qty:+n,category:e?.cat||"購買",price:e?.cp==null?null:e.cp*n}});
 const weapons=(gear.weapons||[]).map(n=>{const x=safe(()=>weaponLine(n),null);return {name:label("weapons",n),attack:x?.atk??null,damage:TEXT(x?.die||x?.w?.[2]||""),type:TEXT(x?.type||""),property:TEXT(x?.w?.[3]||""),proficient:!!x?.prof,notes:TEXT(x?.monkNote||"")};}).concat(window.MagicItemImport5R?.weaponRows(S)||[]);
 const featRows=[];
 if(S.sp)featRows.push(...(S.sp.traits||[]).map(x=>["物種特性",TEXT(x)]));
 for(const [key,value] of Object.entries(S.spChoices||{})){if(value!==""&&value!=null&&value!==false)featRows.push(["物種選擇",key+"："+(Array.isArray(value)?value.join("、"):typeof value==="object"?Object.entries(value).map(([k,v])=>k+"="+TEXT(v)).join("、"):TEXT(value))]);}
 if(S.bg?.feat)featRows.push(["起源專長",TEXT(safe(()=>canonicalFeatName5R(S.bg.feat),S.bg.feat))]);
 if(S.boon)featRows.push(["史詩恩賜",TEXT(S.boon)]);
 if(S.style)featRows.push(["戰鬥風格",TEXT(S.style)]);
 for(const entry of safe(()=>asiEntries(),[])){const v=entry.v;if(v?.t==="feat"&&v.feat)featRows.push(["通用專長 "+entry.lv+" 級",TEXT(v.feat)]);}
 const p=safe(()=>prog(),null);
 if(p?.f)for(const [lv,desc] of Object.entries(p.f)){if(+lv<=S.level)featRows.push(["職業 "+lv+" 級",TEXT(safe(()=>featureLineText5R(desc,S.cls.n,"",+lv),desc))]);}
 const sub=subName();
 const subdata=p?.subs?.[S.sub];
 if(subdata?.f)for(const [lv,desc] of Object.entries(subdata.f)){if(+lv<=S.level)featRows.push([sub+" "+lv+" 級",TEXT(safe(()=>featureLineText5R(desc,S.cls.n,sub,+lv),desc))]);}
 const bio=S.bio||{},play=S.play||{},spellStore=spellData();
 return {name:field("fName")||"未命名冒險者",player:field("fPlayer"),alignment:field("fAlign"),faith:field("fFaith"),sex:field("fGender"),age:field("fAge"),ruleset:rule,level:S.level,className:S.ruleset==="2014"?safe(()=>classSummary(),S.cls.n):label("classes",S.cls.n),subclass:label("subclasses",sub),species:label("species",S.sp.n),background:label("backgrounds",S.bg.n),size:TEXT(S.spChoices?.sizeChoice||S.sp.size||""),abilities,skills,proficiency:safe(()=>pb()),hp:safe(()=>hpTotal()),currentHP:play.hp??null,tempHP:play.thp??0,ac,initiative:safe(()=>initiativeDetails()?.total,null),initiativeNotes:safe(()=>initiativeDetails()?.notes?.join("、"),""),speed:speed?.total??null,passive:safe(()=>passivePerceptionTotal()),passiveInvestigation:safe(()=>passiveInvestigationTotal()),weapons,features:featRows,gear,bought,coins:coin,moneyCp:safe(()=>moneyCp()),bio,play,spellStore,familiar:S.familiar?JSON.parse(JSON.stringify(S.familiar)):null,creatureLibrary:JSON.parse(JSON.stringify(S.creatureLibrary||{})),portrait:TEXT(S.portrait||""),languages:safe(()=>languageSummary()?.text,""),tools:safe(()=>proficiencySummary14()?.tools,""),saveNotes:safe(()=>saveNote()?.join("、"),""),sessionRows:[]};
}
function spellData(){
 const rows=[],seen=new Set(),is14=S.ruleset==="2014";
 const find=n=>{const key=!is14?safe(()=>normalizeSpellName2024(n),n):n;return (is14?SPELLS14:SPELLS).find(x=>x.n===key)};
 const meta=safe(()=>spellMetaDb(),{});
 const add=(n,group,source,extra=null)=>{
  if(!n)return;const key=group+"::"+n;if(seen.has(key))return;seen.add(key);
  const sp=find(n)||extra;const m=meta[sp?.n||n]||{},quick=!is14&&sp?safe(()=>window.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,S.level),null):null;
  rows.push({name:sp?.n||n,eng:sp?.eng||"",level:Number(sp?.lv||0),group,school:m.school||sp?.school||"",time:m.time||"",range:m.range||"",duration:m.dur||"",components:m.comp||"",concentration:!!sp?.con,ritual:!!sp?.rit,damage:quick?.damage||"",save:quick?.save||"",attack:quick?.attack||"",effect:sp?.d||extra?.d||"",source:source||""});
 };
 if(is14){
  for(const ci of safe(()=>castingProfiles2014(),[])){
   const st=safe(()=>spellStore2014(ci.name),null);if(!st)continue;
   (st.cantrips||[]).forEach(n=>add(n,"戲法",ci.name));
   (ci.kind==="book"?(st.prepared||[]):ci.kind==="known"?(st.known||[]):(st.known||st.prepared||[])).forEach(n=>add(n,"已知／準備",ci.name));
   safe(()=>fixedSpells2014(ci.name),[]).forEach(x=>add(x.n,"固定授予",x.src,x));
  }
  safe(()=>featGrantedSpells(),[]).forEach(x=>add(x.n,"專長授予",x.src,x));
 }else{
  [...(S.cantrips||[])].forEach(n=>add(n,"戲法","職業"));
  [...(S.prepared||[])].forEach(n=>add(n,"已準備","職業"));
  safe(()=>grantedSpells2024(),[]).forEach(x=>add(x.n,"固定／特性授予",x.src,x));
 }
 (S.customSpells||[]).forEach(x=>add(x.n,"自訂",x.note,x));
 rows.sort((a,b)=>a.level-b.level||a.name.localeCompare(b.name,"zh-TW"));
 let book=[];
 if(is14){
  for(const ci of safe(()=>castingProfiles2014(),[])){if(ci.kind==="book"){const st=safe(()=>spellStore2014(ci.name),null);for(const n of(st?.book||[])){const sp=find(n);book.push({name:n,level:sp?.lv||0,prepared:!!st?.prepared?.includes(n)});}}}
 }else if(safe(()=>castInfo()?.book,false)){
  book=safe(()=>wizardBookNames2024(),[]).map(n=>{const sp=find(n);return {name:n,level:sp?.lv||0,prepared:S.prepared.has(n)};});
 }
 const ci=is14?null:safe(()=>castInfo(),null),profile=is14?safe(()=>castingProfiles2014(),[]):[];
 const primaryAbility=ci?.ability||(profile.length===1?profile[0]?.ability:null);
 const abk=primaryAbility?{智力:"int",感知:"wis",魅力:"cha"}[primaryAbility]:null;
 const abilScore=abk?safe(()=>finalScore(abk),null):null;
 const dc=abilScore==null?null:8+pb()+mod(abilScore),attack=abilScore==null?null:pb()+mod(abilScore);
 let slots=[];
 if(ci){
  if(ci.type==="pact")slots=[{level:ci.pact.sl,total:ci.pact.n,used:S.slotsUsed?.[ci.pact.sl]||0,type:"契約"}];
  else slots=(ci.slots||[]).map((n,i)=>({level:i+1,total:n,used:S.slotsUsed?.[i+1]||0,type:"法術位"}));
 }else if(is14){
  const casterLevel=safe(()=>multiclassCasterLevel(),0);
  slots=(SLOTS_FULL[casterLevel]||[]).map((n,i)=>({level:i+1,total:n,used:S.slotsUsed?.[i+1]||0,type:"法術位"}));
  for(const pc of profile.filter(x=>x.name==="邪術師")){const pact=PACT[pc.lv]||[0,0];if(pact[0])slots.push({level:pact[1],total:pact[0],used:S.slotsUsed?.["pact"]||0,type:"契約"});}
 }
 return {rows,book,slots,casterAbility:ci?.ability||profile.map(x=>x.ability).join("／"),dc,attack};
}

/* Original XLSX geometry, merges, artwork, credits and hidden lookup sheet remain intact.
 * Normalize invalid Google-export format expressions for native Excel compatibility.
 * Original clean v4.8.5 workbook is the presentation Source of Truth.
 */
const TEMPLATE_URL="assets/templates/dnd5e-clean-original-v485.xlsx";
const OOXML="http://schemas.openxmlformats.org/spreadsheetml/2006/main";
let zipPromise=null;
const sheetNames=["角色卡","裝備與物品","法術表","法術書","坐騎","團務紀錄卡","角色簡卡","更新日誌"];
function loadZip(){
 if(window.JSZip?.loadAsync)return Promise.resolve(window.JSZip);
 if(zipPromise)return zipPromise;
 zipPromise=new Promise((resolve,reject)=>{
  const script=document.createElement("script");script.async=true;script.src="assets/vendor/jszip.min.js";
  script.onload=()=>window.JSZip?.loadAsync?resolve(window.JSZip):reject(Error("ZIP 元件無法初始化"));
  script.onerror=()=>reject(Error("ZIP 元件載入失敗"));document.head.append(script);
 }).catch(e=>{zipPromise=null;throw e});
 return zipPromise;
}
function mapForSheet(){
 return Array.from({length:8},()=>new Map());
}
const set=(maps,sheet,cell,value)=>{if(value!==undefined&&value!==null)maps[sheet-1].set(cell,value)};
const put=(m,s,values)=>Object.entries(values).forEach(([k,v])=>set(m,s,k,v));
const colName=n=>{let v=n,x="";while(v>0){x=String.fromCharCode(65+(v-1)%26)+x;v=Math.floor((v-1)/26)}return x};
const signed=n=>n==null?"":n>=0?"+"+n:String(n);
const formula=(value,expression)=>({value,formula:expression});
const modRef={str:"StrMod",dex:"DexMod",con:"ConMod",int:"IntMod",wis:"WisMod",cha:"ChaMod"};
const templateClasses={"野蠻人":"野蠻人-Barbarian","吟遊詩人":"吟遊詩人-Bard","牧師":"牧師-Cleric","德魯伊":"德魯伊-Druid","戰士":"戰士-Fighter","武僧":"武僧-Monk","聖騎士":"聖騎士-Paladin","遊俠":"遊俠-Ranger","遊蕩者":"盜賊-Rogue","盜賊":"盜賊-Rogue","術士":"術士-Sorcerer","邪術師":"契術師-Warlock","契術師":"契術師-Warlock","法師":"法師-Wizard","奇械師":"奇械師-Artificer"};
const plus=(expr,n)=>n?expr+"+("+n+")":expr;
function skillFormula(sk,r){
 const half=sk.parts.find(x=>/萬事通|全能高手|冠軍/.test(x.label));
 const extras=sk.parts.filter(x=>/原初職能|神聖秩序|異界魅力/.test(x.label));
 const delta=sk.bonus-(sk.parts[0]?.amount||0)-(sk.expert?2:sk.proficient?1:0)*pb()-(half?.amount||0)-extras.reduce((n,x)=>n+x.amount,0);
 return plus(modRef[sk.key]+'+IF(N'+r+'="x2",2*Prof,IF(N'+r+'="●",Prof,IF(N'+r+'="½",'+(half?.label.includes("冠軍")?"ROUNDUP(Prof/2,0)":"INT(Prof/2)")+',0)))'+extras.map(()=>"+MAX(1,WisMod)").join(""),delta);
}
function mapCharacter(data){
 const m=mapForSheet();
 const choices=S.spChoices||{};
 const selectedLineage=choices.eLine||choices.gLine||choices.fLine||choices.dAnc||choices.giant||choices.subrace||"";
 put(m,1,{C7:data.name,O7:data.player,W7:data.species,AN7:selectedLineage,AX7:data.alignment,BG7:data.faith,
  C9:data.size,AN9:data.age,AS9:data.sex,AX9:data.background,
  Z15:templateClasses[S.cls.n]||data.className,AJ15:data.level,BW2:"里程碑",BW3:data.level,AL15:S.cls?.hd?"1d"+S.cls.hd:"",AQ15:data.hp==null?null:data.hp-data.level*(data.abilities[2]?.mod||0),
  V27:data.currentHP??data.hp,Y27:formula(data.hp,"MAX(AJ22,AS22)"),Z25:data.tempHP,AE27:data.ac?.total,
  AM32:data.initiative,AW18:data.speed,G54:data.languages?("全部："+data.languages):"",G60:S.cls?.weapon||"",G61:S.cls?.armor||"",G62:data.tools?("全部："+data.tools):"",C46:10+(data.skills[10]?.bonus??0),C47:data.passive,
  C48:data.passiveInvestigation,C49:data.proficiency});
 // Fill the mother template's AC inputs rather than overriding its computed AC.
 const armor=ARMORS.find(x=>x.n===data.gear?.armor),acRows=data.ac?.rows||[];
 if(data.ac?.total!=null&&acRows.length){
  const base=acRows[0].v,shield=acRows.find(x=>x.l==="盾牌")?.v||0,dex=acRows.find(x=>x.l.startsWith("敏捷調整值"))?.v||0;
  const extra=!armor?safe(()=>resolveUnarmored()?.extra,null):null,other=data.ac.total-base-shield-dex;
  put(m,1,{BH27:armor?label("armors",armor.n):"",BT27:armor?.cat||"無",BW27:base,BT28:shield?"握持":"無",AT29:extra?formula(other,plus(modRef[extra],other-(data.abilities.find(a=>a.key===extra)?.mod||0))):other});
  if(armor?.cat==="中甲"&&safe(()=>hasFeatNamed("中甲大師"),false))set(m,1,"BY27",formula(dex,'IF(BT27="中甲",MIN(3,DexMod),IF(BT27="重甲",0,DexMod))'));
 }
 // Use actual class rows for 2014 multiclass, retaining the total from the site.
 if(S.ruleset==="2014"&&Object.keys(S.classLevels||{}).length>1){
  const entries=Object.entries(S.classLevels).filter(([,lv])=>lv>0);
  if(entries.length>5)throw Error("原版角色卡最多支援五種兼職");
  let total=0;
  entries.forEach(([name,lv],i)=>{
   const r=15+i,hd=CLASSES.find(x=>x.n===name)?.hd||8,av=Math.floor(hd/2)+1,cm=data.abilities[2]?.mod||0;
   let raw=name===S.cls.n?hd:0;
   for(let j=name===S.cls.n?2:1;j<=lv;j++){
    const die=S.hpMode==="roll"?Math.min(hd,Math.max(1,+(S.hpRollsByClass?.[name]?.[j])||av)):av;raw+=Math.max(1,die+cm)-cm;
   }
   put(m,1,{["Z"+r]:templateClasses[name]||name,["AJ"+r]:lv,["AL"+r]:"1d"+hd,["AQ"+r]:raw});total+=raw;
  });
  set(m,1,"AQ15",m[0].get("AQ15")+data.hp-data.level*(data.abilities[2]?.mod||0)-total);
 }
 // Main character columns are the original template's input and display cells.
 data.abilities.forEach((a,i)=>{const r=15+i;
  set(m,1,"F"+r,a.score);set(m,1,"I"+r,a.mod);
  set(m,1,"N"+r,!!a.proficient);
  const delta=a.save-a.mod-(a.proficient?data.proficiency:0),base=modRef[a.key]+"+IF(N"+r+"=TRUE,Prof,0)";
  set(m,1,"U"+r,formula(a.save,delta&&safe(()=>saveAura(),0)===delta?base+"+MAX(1,ChaMod)":plus(base,delta)));
 });
 data.skills.forEach((sk,i)=>{const r=27+i;
  const half=sk.parts.find(x=>/萬事通|全能高手|冠軍/.test(x.label));
  if(sk.bonus!=null)set(m,1,"C"+r,formula(sk.bonus,skillFormula(sk,r)));
  set(m,1,"N"+r,sk.expert?"x2":sk.proficient?"●":half?"½":"");
 });
 for(const [cell,row,value] of [["C46",37,10+(data.skills[10]?.bonus||0)],["C47",39,data.passive],["C48",33,data.passiveInvestigation]]){
  if(value!=null)set(m,1,cell,formula(value,plus("10+C"+row+'+IF(P'+row+'="✓",5,IF(P'+row+'="🗴",-5,0))',value-10-(data.skills[row-27]?.bonus||0))));
 }
 data.weapons.forEach((w,i)=>{if(i>=6)return;const r=37+i;
  set(m,1,"V"+r,w.name);set(m,1,"AI"+r,w.attack);set(m,1,"AL"+r,w.damage);
  set(m,1,"BA"+r,w.type);set(m,1,"BJ"+r,[w.property,w.notes].filter(Boolean).join("；"));
 });
 if(data.weapons.length>6)throw Error("原版武器欄最多 6 列，請先精簡武器清單再匯出（不會刪除原資料）");
 // Original feature regions are split: species/background and class.
 const left=data.features.filter(x=>!/職業|子職業/.test(x[0]));
 const right=data.features.filter(x=>/職業|子職業/.test(x[0]));
 if(left.length>21||right.length>21)throw Error("此角色特性數量超過原始角卡的固定欄位，無法在不修改母版排版的情況下完整匯出");
 left.forEach(([type,desc],i)=>set(m,1,"V"+(55+i),type+"： "+desc));
 right.forEach(([type,desc],i)=>set(m,1,"AT"+(55+i),type+"： "+desc));
 put(m,2,{AI8:data.coins.gp||0,AN8:data.coins.sp||0,AS8:data.coins.cp||0,AI10:data.coins.pp||0,
  C72:data.bio?.traits||"",S72:"",AI72:data.bio?.allies||"",AY72:"",C77:data.bio?.story||"",BS80:[data.bio?.look?("外貌："+data.bio.look):"",data.bio?.notes].filter(Boolean).join("\n"),AI77:data.background,AI84:data.bio?.allies||""});
 // Populate only free inventory lines; retain original fixed labels and formulas.
 const inv=[];
 if(data.gear?.items)inv.push(...String(data.gear.items).split(/[、,\n]/).map(x=>x.trim()).filter(Boolean));
 for(const b of data.bought){if(!inv.includes(b.name))inv.push(b.name+(b.qty>1?" ×"+b.qty:""));}
 for(const item of window.MagicItemImport5R?.readable(S)||[]){if(item.分類!=="武器")inv.push(item.名稱+(item.數量>1?" ×"+item.數量:""));}
 const inventoryCells=[...[10,11,12,13,14,17,18,19,20,21,22,23].map(r=>"C"+r),...[8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29].map(r=>"S"+r)];
 if(inv.length>inventoryCells.length)throw Error("原版裝備欄位不足以容納全部冒險用品，為避免遺漏已取消匯出");
 inv.forEach((item,i)=>set(m,2,inventoryCells[i],item));
 const book=data.spellStore||{rows:[],slots:[],book:[]};
 const casterMod={智力:"IntMod",感知:"WisMod",魅力:"ChaMod"}[book.casterAbility];
 if(casterMod&&book.dc!=null&&book.attack!=null)put(m,3,{K6:formula(book.dc,"8+Prof+"+casterMod),R6:formula(book.attack,"Prof+"+casterMod)});
 else put(m,3,{K6:book.dc,R6:book.attack});
 for(const sl of book.slots||[]){
  if(sl.type==="契約"){set(m,3,"F14",sl.total);continue;}
  const slotCells=["E7","F7","G7","E9","F9","G9","E11","F11","G11"];
  if(sl.level>=1&&sl.level<=9)set(m,3,slotCells[sl.level-1],sl.total);
 }
 const starts=[19,34,49,62,75,88,101,114,125,136],ends=[29,44,57,70,83,96,109,120,131,139];
 const groups=Array.from({length:10},()=>[]);
 for(const spell of book.rows||[]){
  const lv=Number(spell.level)||0;if(lv>=0&&lv<=9)groups[lv].push(spell);
 }
 const done=new Set();
 for(let lv=0;lv<=9;lv++){
  if(groups[lv].length>ends[lv]-starts[lv]+1)
    throw Error(lv+" 環法術超過原始試算表可容納的 "+(ends[lv]-starts[lv]+1)+" 列，為避免資料遺漏已取消匯出");
  groups[lv].forEach((sp,i)=>{
   const r=starts[lv]+i,attack=sp.attack?"；"+sp.attack:"",damage=sp.damage?"傷害 "+sp.damage:"";
   set(m,3,"C"+r,/準備|戲法/.test(sp.group));
   set(m,3,"D"+r,sp.name);set(m,3,"E"+r,sp.school);
   set(m,3,"F"+r,sp.time);set(m,3,"H"+r,sp.range);
   set(m,3,"J"+r,[damage,sp.save?sp.save+"豁免":"",attack,sp.effect].filter(Boolean).join("；"));
   set(m,3,"L"+r,sp.duration);
   set(m,3,"M"+r,!!sp.concentration);set(m,3,"N"+r,!!sp.ritual);
   const parts=sp.components||"";
   set(m,3,"O"+r,/聲|（V）|\bV\b/.test(parts));
   set(m,3,"P"+r,/勢|（S）|\bS\b/.test(parts));
   set(m,3,"Q"+r,/材|（M）|\bM\b/.test(parts));
   set(m,3,"R"+r,parts);
   done.add(sp.name+"@"+lv);
  });
 }
 // Horizontal spellbook blocks 1..9, preserving every original column and merge.
 const spellByName=new Map((book.rows||[]).map(x=>[x.name,x]));
 const books=Array.from({length:9},()=>[]);
 for(const item of book.book||[]){if(item.level>=1&&item.level<=9)books[item.level-1].push(item);}
 for(let lv=1;lv<=9;lv++){
  if(books[lv-1].length>44)throw Error(lv+" 環法術書超過原版 44 個欄位，為避免遺漏而取消匯出");
  const col=3+(lv-1)*21;
  books[lv-1].forEach((item,i)=>{
   const row=11+i,sp=spellByName.get(item.name)||{};
   const v=(offset,value)=>set(m,4,colName(col+offset)+row,value);
   v(0,!!item.prepared);v(1,item.name);v(2,sp.school||"");v(3,sp.time||"");
   v(5,sp.range||"");v(7,sp.effect||"");v(9,sp.duration||"");
   v(10,!!sp.concentration);v(11,!!sp.ritual);v(12,/(?:聲|\bV\b)/.test(sp.components||""));
   v(13,/(?:勢|\bS\b)/.test(sp.components||""));v(14,/(?:材|\bM\b)/.test(sp.components||""));v(15,sp.components||"");
  });
 }
 if(data.familiar){
  const obj=data.familiar;
  put(m,5,{C6:obj.name||obj.n||"",M6:obj.type||obj.kind||"",C11:obj.hp||obj.hpMax||null,S11:obj.ac??null,C38:obj.speed||null});
 }
 const purchasedMounts=window.ShopGearLink5R?.exportMounts(S)||[];
 const mounts=purchasedMounts.length?purchasedMounts:(data.creatureLibrary?.mounts||[]).map(id=>{const x=(window.ZIZI_5R_CREATURES||[]).find(v=>v.id===id);return x?{name:window.ZIZI_5R_CREATURES_ZH?.[x.id]?.nameZh||x.name,ac:x.ac,hp:x.hp,speed:Object.entries(x.speed||{}).map(([k,v])=>k+" "+v+" 呎").join("、"),source:x.source}:null}).filter(Boolean);
 if(mounts.length){
  const mount=mounts[0];
  put(m,5,{C6:mount.nickname||mount.name||"",M6:"坐騎｜"+(mount.source||"XMM"),C11:mount.hp||null,S11:mount.ac??null,C38:mount.speed||null});
 }
 // Journal stays EMPTY, except present character identity and own currency. Remove third-party sample link.
 put(m,6,{B4:data.name,C4:data.player,E4:data.species,G4:m[0].get("Z15"),H4:data.level,I4:0,J4:(data.moneyCp||0)/100,K4:""});
 // Short sheet remains a linked view of the original workbook.
 put(m,7,{B2:data.name,J2:data.player,N2:data.species,V2:data.alignment,AA2:data.size,
  AD4:data.speed,L7:data.hp,P7:data.ac?.total,T7:book.dc==null?null:formula(book.dc,"'法術表'!K6"),Z7:book.attack==null?null:formula(book.attack,"'法術表'!R6"),
  AG7:data.level,B13:10+(data.skills[10]?.bonus||0),B14:data.passive,B15:data.passiveInvestigation,
  B16:data.proficiency,B19:m[0].get("Z15"),L20:data.coins.gp||0,P20:data.coins.sp||0,T20:data.coins.cp||0});
 data.abilities.forEach((a,i)=>{const r=6+i;set(m,7,"D"+r,a.score);set(m,7,"F"+r,a.mod);
  set(m,7,"H"+r,!!a.proficient);set(m,7,"I"+r,a.save);});
 data.skills.forEach((sk,i)=>{const addr=i<9?"P"+(9+i):"V"+(9+i-9);set(m,7,addr,sk.bonus)});
 return m;
}
const colNumber=ref=>[...ref.match(/^[A-Z]+/)[0]].reduce((a,c)=>a*26+c.charCodeAt(0)-64,0);
function setCellValue(doc,sheetData,refs){
 const rows=new Map([...sheetData.children].filter(x=>x.localName==="row").map(x=>[+x.getAttribute("r"),x]));
 function rowAt(r){
  if(rows.has(r))return rows.get(r);
  const row=doc.createElementNS(OOXML,"row");row.setAttribute("r",String(r));
  const next=[...rows.entries()].filter(([n])=>n>r).sort((a,b)=>a[0]-b[0])[0]?.[1];
  sheetData.insertBefore(row,next||null);rows.set(r,row);return row;
 }
 for(const [ref,mapped] of refs){
  const isFormula=mapped&&typeof mapped==="object"&&Object.prototype.hasOwnProperty.call(mapped,"formula"),value=isFormula?mapped.value:mapped;
  const r=+ref.match(/\d+$/)[0],row=rowAt(r);
  let c=[...row.children].find(x=>x.localName==="c"&&x.getAttribute("r")===ref);
  if(!c){
   c=doc.createElementNS(OOXML,"c");c.setAttribute("r",ref);
   const col=colNumber(ref),next=[...row.children].find(x=>x.localName==="c"&&colNumber(x.getAttribute("r"))>col);
   row.insertBefore(c,next||null);
  }
  // Never flatten original formulas; update only their cache, or an explicit compatible formula.
  let f=[...c.children].find(x=>x.localName==="f");
  for(const child of [...c.children])if(["v","is"].includes(child.localName))c.removeChild(child);
  if(isFormula){
   if(!f){f=doc.createElementNS(OOXML,"f");c.insertBefore(f,c.firstChild);}
   else if(f.getAttribute("t")==="shared"||f.getAttribute("t")==="array")throw Error("不可覆寫共享／陣列公式："+ref);
   f.textContent=mapped.formula;
  }
  if(f){
   const v=doc.createElementNS(OOXML,"v");
   if(typeof value==="number"&&Number.isFinite(value)){c.removeAttribute("t");v.textContent=String(value);}
   else if(typeof value==="boolean"){c.setAttribute("t","b");v.textContent=value?"1":"0";}
   else {c.setAttribute("t","str");v.textContent=TEXT(value);}
   c.appendChild(v);continue;
  }
  if(typeof value==="number"&&Number.isFinite(value)){
   c.removeAttribute("t");const v=doc.createElementNS(OOXML,"v");v.textContent=String(value);c.appendChild(v);
  }else if(typeof value==="boolean"){
   c.setAttribute("t","b");const v=doc.createElementNS(OOXML,"v");v.textContent=value?"1":"0";c.appendChild(v);
  }else if(value===""||value===null){
   c.removeAttribute("t"); // Blank existing styled cell, retaining original border/fill/merge.
  }else{
   const text=String(value); // XML serializer escapes text; no formula injection.
   c.setAttribute("t","inlineStr");
   const ins=doc.createElementNS(OOXML,"is"),node=doc.createElementNS(OOXML,"t");
   if(/^\s|\s$|\n/.test(text))node.setAttribute("xml:space","preserve");
   node.textContent=text;ins.appendChild(node);c.appendChild(ins);
  }
 }
}
// Embed the stored image as a native DrawingML picture in BR7:CE21, preserving template artwork.
async function embedPortrait(zip,portrait,parser,ser,mainDoc){
 if(!portrait)return;
 const match=portrait.match(/^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/i);
 if(!match)throw Error("角色畫像格式不支援，請使用 PNG 或 JPEG");
 const extension=match[1].toLowerCase()==="png"?"png":"jpeg",media="character-portrait."+extension;
 const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error("角色畫像無法解碼"));img.src=portrait;});
 const XDR="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",A="http://schemas.openxmlformats.org/drawingml/2006/main",R="http://schemas.openxmlformats.org/officeDocument/2006/relationships",PR="http://schemas.openxmlformats.org/package/2006/relationships",CT="http://schemas.openxmlformats.org/package/2006/content-types";
 const drawingPath="xl/drawings/drawing1.xml",relsPath="xl/drawings/_rels/drawing1.xml.rels";
 const drawing=parser.parseFromString(await zip.file(drawingPath).async("string"),"application/xml"),rels=parser.parseFromString(await zip.file(relsPath).async("string"),"application/xml"),relId="rIdCharacterPortrait";
 const rel=rels.createElementNS(PR,"Relationship");rel.setAttribute("Id",relId);rel.setAttribute("Type",R+"/image");rel.setAttribute("Target","../media/"+media);rels.documentElement.appendChild(rel);
 const cols=[...mainDoc.getElementsByTagNameNS(OOXML,"col")],rows=[...mainDoc.getElementsByTagNameNS(OOXML,"row")],fmt=mainDoc.getElementsByTagNameNS(OOXML,"sheetFormatPr")[0];
 const colPx=n=>{const c=cols.find(x=>+x.getAttribute("min")<=n+1&&+x.getAttribute("max")>=n+1);return Math.floor(7*Number(c?.getAttribute("width")||fmt.getAttribute("defaultColWidth")||8.43)+5);};
 const rowPx=n=>Number(rows.find(x=>+x.getAttribute("r")===n+1)?.getAttribute("ht")||fmt.getAttribute("defaultRowHeight")||15)*96/72;
 const colStart=69,rowStart=6,width=Math.floor(0.85*Array.from({length:14},(_,i)=>colPx(colStart+i)).reduce((a,b)=>a+b,0)),height=Array.from({length:15},(_,i)=>rowPx(rowStart+i)).reduce((a,b)=>a+b,0);
 const scale=Math.min((width-20)/image.naturalWidth,(height-30)/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale,emu=v=>Math.round(v*9525);
 const anchor=drawing.createElementNS(XDR,"xdr:oneCellAnchor"),add=(parent,ns,name,attrs={},text=null)=>{const node=drawing.createElementNS(ns,name);Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,String(v)));if(text!=null)node.textContent=String(text);parent.appendChild(node);return node;};
 const marker=(start,offset,size)=>{let cell=start;while(offset>=size(cell)){offset-=size(cell);cell++;}return [cell,emu(offset)];};
 const [col,dx]=marker(colStart,(width-w)/2,colPx),[row,dy]=marker(rowStart,(height-h)/2,rowPx);
 const from=add(anchor,XDR,"xdr:from");add(from,XDR,"xdr:col",{},col);add(from,XDR,"xdr:colOff",{},dx);add(from,XDR,"xdr:row",{},row);add(from,XDR,"xdr:rowOff",{},dy);add(anchor,XDR,"xdr:ext",{cx:emu(w),cy:emu(h)});
 const pic=add(anchor,XDR,"xdr:pic"),nv=add(pic,XDR,"xdr:nvPicPr"),id=1+Math.max(0,...[...drawing.getElementsByTagNameNS(XDR,"cNvPr")].map(x=>Number(x.getAttribute("id"))||0));
 add(nv,XDR,"xdr:cNvPr",{id,name:"Character portrait",descr:"角色畫像"});add(add(nv,XDR,"xdr:cNvPicPr"),A,"a:picLocks",{noChangeAspect:1});
 const fill=add(pic,XDR,"xdr:blipFill"),blip=add(fill,A,"a:blip",{cstate:"print"});blip.setAttributeNS(R,"r:embed",relId);add(add(fill,A,"a:stretch"),A,"a:fillRect");
 const sp=add(pic,XDR,"xdr:spPr"),xf=add(sp,A,"a:xfrm");add(xf,A,"a:off",{x:0,y:0});add(xf,A,"a:ext",{cx:emu(w),cy:emu(h)});add(add(sp,A,"a:prstGeom",{prst:"rect"}),A,"a:avLst");add(anchor,XDR,"xdr:clientData");drawing.documentElement.appendChild(anchor);
 zip.file(drawingPath,ser.serializeToString(drawing),{createFolders:false});zip.file(relsPath,ser.serializeToString(rels),{createFolders:false});zip.file("xl/media/"+media,match[2].replace(/\s/g,""),{base64:true,createFolders:false});
 const ctPath="[Content_Types].xml",ct=parser.parseFromString(await zip.file(ctPath).async("string"),"application/xml");
 if(![...ct.documentElement.children].some(x=>x.getAttribute("Extension")===extension)){
  const e=ct.createElementNS(CT,"Default");e.setAttribute("Extension",extension);e.setAttribute("ContentType",extension==="png"?"image/png":"image/jpeg");ct.documentElement.insertBefore(e,ct.documentElement.firstChild);zip.file(ctPath,ser.serializeToString(ct),{createFolders:false});
 }
}
// The source Google XLSX contains an invalid pseudo-number-format CF expression
// and bare unit literals which cause Excel to discard conditional formatting/styles on open.
// Preserve all rule positions/styles; an invalid, non-boolean expression is inert.
function normalizeTemplateConditionalFormatting(doc){
 let changed=false;
 for(const cf of doc.getElementsByTagNameNS(OOXML,"conditionalFormatting")){
  for(const f of cf.getElementsByTagNameNS(OOXML,"formula")){
   if(f.textContent==='"[<0]"0";0"'){f.textContent="FALSE";changed=true;}
  }
 }
 return changed;
}
// Excel serializes newer functions with _xlfn.; Google exports omit that
// namespace. Image-based decorations may be unavailable offline or in older Excel.
function normalizeTemplateFunctions(doc,sheet){
 let changed=false;
 for(const c of doc.getElementsByTagNameNS(OOXML,"c")){
  const f=[...c.children].find(x=>x.localName==="f");if(!f?.textContent)continue;
  const before=f.textContent,ref=c.getAttribute("r");
  let text=before.replace(/(?<![\w.])(?:IFS|SWITCH|IMAGE)(?=\s*\()/gi,name=>"_xlfn."+name.toUpperCase());
  // Offline-safe formula projections for the source's remote IMAGE decorations.
  // Native Excel may return an asynchronous #BLOCKED! after IFERROR has evaluated.
  if(/_xlfn\.IMAGE\s*\(/i.test(text)){
   if(sheet===1&&ref==="BE13")text='IF(Z15="","",LEFT(Z15,FIND("-",Z15&"-")-1))';
   else if(sheet===1&&ref==="B27")text='IF(P27="✓","✓",IF(P27="🗴","🗴",""))';
   else if(sheet===1&&["T27","AC27"].includes(ref))text='IF(S22,"★","")';
   else if(sheet===7&&ref==="O6")text="IF('角色卡'!S22,\"★\",\"\")";
  }
  if(sheet===5&&["Z3","Y6","AD20","J27","BI28"].includes(ref)){
   text="IFERROR("+text+","+(ref==="BI28"?"0":'""')+")";
  }
  if(text!==before){f.textContent=text;changed=true;}
 }
 return changed;
}
async function normalizeTemplateStyles(zip,parser,ser){
 const path="xl/styles.xml",doc=parser.parseFromString(await zip.file(path).async("string"),"application/xml");
 const formats=new Map([["#lb",'#"lb"'],["0.0 lb",'0.0" lb"'],["0 lb",'0" lb"'],["0 ft",'0" ft"'],["+#0_);-[Red]#0","+#0_);[Red]-#0"],["+#0_);-[red]#0","+#0_);[Red]-#0"]]);
 let changed=false;
 for(const f of doc.getElementsByTagNameNS(OOXML,"numFmt")){
  const value=formats.get(f.getAttribute("formatCode"));
  if(value!==undefined){f.setAttribute("formatCode",value);changed=true;}
 }
 if(changed)zip.file(path,ser.serializeToString(doc),{createFolders:false});
}
async function cloneTemplate(JSZip,data){
 const res=await fetch(TEMPLATE_URL,{cache:"force-cache"});
 if(!res.ok)throw Error("無法取得原始角色卡母版（HTTP "+res.status+"）");
 const original=await res.arrayBuffer(),zip=await JSZip.loadAsync(original);
 if(!zip.file("xl/worksheets/sheet8.xml")||!zip.file("xl/drawings/drawing7.xml"))throw Error("原始角色卡結構不完整，停止匯出");
 const updates=mapCharacter(data),parser=new DOMParser(),ser=new XMLSerializer();let mainDoc=null;
 for(let i=0;i<7;i++){
  const path="xl/worksheets/sheet"+(i+1)+".xml",entry=zip.file(path);
  if(!entry)throw Error("母版缺少第 "+(i+1)+" 張工作表");
  const xml=await entry.async("string"),doc=parser.parseFromString(xml,"application/xml");
  if(doc.getElementsByTagName("parsererror").length)throw Error("母版 XML 無法解析："+path);
  const sheetData=doc.getElementsByTagNameNS(OOXML,"sheetData")[0];
  if(!sheetData)throw Error("母版表格沒有 sheetData："+path);
  const normalizedCF=normalizeTemplateConditionalFormatting(doc),normalizedFn=normalizeTemplateFunctions(doc,i+1),normalized=normalizedCF||normalizedFn;
  if(updates[i].size)setCellValue(doc,sheetData,updates[i]);if(i===0)mainDoc=doc;
  if(updates[i].size||normalized)zip.file(path,ser.serializeToString(doc),{createFolders:false});
 }
 // Preserve the source template; normalize only the proven Excel compatibility defects.
 await normalizeTemplateStyles(zip,parser,ser);
 await embedPortrait(zip,data.portrait,parser,ser,mainDoc);
 const wp="xl/workbook.xml",wd=parser.parseFromString(await zip.file(wp).async("string"),"application/xml"),calc=wd.getElementsByTagNameNS(OOXML,"calcPr")[0];
 if(calc){calc.setAttribute("calcMode","auto");calc.setAttribute("fullCalcOnLoad","1");zip.file(wp,ser.serializeToString(wd),{createFolders:false});}
 return zip.generateAsync({type:"blob",compression:"DEFLATE",compressionOptions:{level:6},
  mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function sanitizeFilename(s){return TEXT(s).replace(/[\\\/:*?"<>|\x00-\x1f]/g,"_").replace(/\s+/g," ").trim().slice(0,60)||"角色";}
window.exportCharacterWorkbook=async function(){
 if(exporting)return;exporting=true;
 try{
  const data=ensureExportData(),JSZip=await loadZip(),blob=await cloneTemplate(JSZip,data);
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;
  a.download=sanitizeFilename(data.name)+"-原版角色卡.xlsx";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  if(typeof toast==="function")toast("已依原始 Google 角卡版型逐格匯出（可用 Excel 或 Google 試算表開啟）");
 }catch(e){console.error("Exact template export failed",e);
  if(typeof toast==="function")toast("原版試算表匯出失敗："+(e?.message||e));
 }finally{exporting=false;}
};
window.__exactWorkbookMapQA=mapCharacter;
})();
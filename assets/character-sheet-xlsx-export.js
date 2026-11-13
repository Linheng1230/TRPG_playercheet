/* D&D 5R/5e editable workbook export.
 * Workbook appearance is inspired by a multi-tab reference, not a copy.
 * All game values are projected from the site's existing canonical calculators.
 * Excel remains an editable, one-way snapshot; editing cells does not update the site.
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
 const skills=SKILLS.map(sk=>{const d=safe(()=>skillCheckDetails(sk),null);return {name:label("skills",sk.n),rawName:sk.n,ability:ABN[sk.a],bonus:d?.total??null,proficient:!!d?.trained,expert:!!d?.expert,detail:(d?.parts||[]).map(x=>x.label+" "+SIGNED(x.amount)).join("、")};});
 const speed=safe(()=>speedInfo(),null);
 const ac=safe(()=>acInfo(),{total:null,rows:[],notes:[]});
 const gear=S.gear||{},coin=gear.gold||{};
 const catalog=safe(()=>shopCatalog(),[]),catMap=new Map(catalog.map(x=>[x.id,x]));
 const bought=Object.entries(gear.purchases||{}).filter(([,n])=>Number(n)>0).map(([id,n])=>{const e=catMap.get(id);return {name:e?label(e.cat==="武器"?"weapons":e.cat==="護甲"?"armors":e.cat==="工具"?"tools":"items",e.n):id,qty:+n,category:e?.cat||"購買",price:e?.cp==null?null:e.cp*n}});
 const weapons=(gear.weapons||[]).map(n=>{const x=safe(()=>weaponLine(n),null);return {name:label("weapons",n),attack:x?.atk??null,damage:TEXT(x?.die||x?.w?.[2]||""),type:TEXT(x?.type||""),property:TEXT(x?.w?.[3]||""),proficient:!!x?.prof,notes:TEXT(x?.monkNote||"")};});
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
function formatCell(cell,{fill=C.paper,bold=false,color=C.ink,size=10,align="left",wrap=true,border=true,manual=false}={}){
 cell.font={name:FONT,size,bold,color:{argb:"FF"+color}};
 cell.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF"+(manual?C.manual:fill)}};
 cell.alignment={vertical:"middle",horizontal:align,wrapText:wrap};
 if(border)cell.border={bottom:{style:"hair",color:{argb:"FF"+C.line}},right:{style:"hair",color:{argb:"FF"+C.line}}};
}
function value(ws,row,col,v,opts){const c=ws.getCell(row,col);c.value=v==null?"":v;formatCell(c,opts);return c;}
function mergeValue(ws,row,c1,c2,v,opts){
 if(c2>c1)ws.mergeCells(row,c1,row,c2);
 return value(ws,row,c1,v,opts);
}
function title(ws,title,desc,width){
 mergeValue(ws,1,1,width,title,{fill:C.navy,color:"FFFFFF",bold:true,size:19});
 ws.getRow(1).height=42;
 mergeValue(ws,2,1,width,desc,{fill:C.cream,color:C.muted,size:10});
 ws.getRow(2).height=26;
}
function band(ws,row,text,width){
 mergeValue(ws,row,1,width,text,{fill:C.burgundy,color:"FFFFFF",bold:true,size:12});ws.getRow(row).height=27;
}
function columns(ws,widths){ws.columns=widths.map(w=>({width:w}));ws.properties.defaultRowHeight=22;ws.views=[{state:"frozen",ySplit:2}];ws.pageSetup={paperSize:9,orientation:"landscape",fitToPage:true,fitToWidth:1,fitToHeight:0};ws.headerFooter.oddFooter="&C第 &P 頁 / 共 &N 頁"; }
function table(ws,row,headers,data,opts={}){
 headers.forEach((x,i)=>value(ws,row,i+1,x,{fill:C.navy2,color:"FFFFFF",bold:true,size:10,align:opts.align||"center"}));
 ws.getRow(row).height=26;
 data.forEach((cells,idx)=>{const r=row+idx+1;
  cells.forEach((x,i)=>value(ws,r,i+1,x,{fill:idx%2?C.light:C.paper,size:opts.size||10,align:typeof x==="number"?"center":"left",manual:!!opts.manual}));
  ws.getRow(r).height=opts.height||23;
 });
 return row+data.length+1;
}
function card(ws,r,c1,c2,heading,val){
 mergeValue(ws,r,c1,c2,heading,{fill:C.navy2,color:"FFFFFF",size:10,bold:true,align:"center"});
 mergeValue(ws,r+1,c1,c2,val,{fill:C.cream,color:C.burgundy,size:20,bold:true,align:"center"});
 ws.getRow(r).height=22;ws.getRow(r+1).height=40;
}
function note(ws,row,text,width,manual=false){
 mergeValue(ws,row,1,width,text,{fill:manual?C.manual:C.cream,color:C.muted,size:10});
 ws.getRow(row).height=26;
}
function basic(ws,d){
 columns(ws,Array(16).fill(10.5));title(ws,"角色卡 · "+d.name,"D&D 角色資料｜"+d.ruleset+"｜可編輯快照（修改不會同步網站）",16);
 const fields=[["角色名稱",d.name,1,4],["玩家",d.player,5,8],["物種",d.species,9,12],["職業",d.className,13,16],
  ["子職業",d.subclass,1,4],["背景",d.background,5,8],["陣營",d.alignment,9,12],["等級",d.level,13,16]];
 fields.forEach(([k,v,a,b],i)=>{const rr=i<4?4:6;mergeValue(ws,rr,a,b,k,{fill:C.navy2,color:"FFFFFF",bold:true,align:"center"});mergeValue(ws,rr+1,a,b,v,{fill:C.paper,align:"center",size:12});});
 card(ws,9,1,4,"生命值",d.hp);card(ws,9,5,8,"護甲等級",d.ac?.total);card(ws,9,9,12,"先攻",SIGNED(d.initiative));card(ws,9,13,16,"速度（呎）",d.speed);
 card(ws,12,1,4,"熟練加值",SIGNED(d.proficiency));card(ws,12,5,8,"被動察覺",d.passive);card(ws,12,9,12,"當前生命值",d.currentHP);card(ws,12,13,16,"臨時生命值",d.tempHP);
 mergeValue(ws,15,1,8,"屬性與豁免",{fill:C.burgundy,color:"FFFFFF",bold:true,size:12});
 mergeValue(ws,15,9,16,"技能",{fill:C.burgundy,color:"FFFFFF",bold:true,size:12});ws.getRow(15).height=28;
 ["屬性","數值","調整值","豁免熟練","豁免","來源","",""].forEach((x,i)=>value(ws,16,i+1,x,{fill:C.navy2,color:"FFFFFF",bold:true,size:10}));
 ["技能","屬性","熟練","專精","加值","計算來源","",""].forEach((x,i)=>value(ws,16,i+9,x,{fill:C.navy2,color:"FFFFFF",bold:true,size:10}));
 d.abilities.forEach((a,i)=>{let r=17+i;[a.name,a.score,SIGNED(a.mod),a.proficient?"✓":"",SIGNED(a.save),a.detail,"",""].forEach((x,j)=>value(ws,r,j+1,x));});
 d.skills.forEach((s,i)=>{const r=17+i;[s.name,s.ability,s.proficient?"✓":"",s.expert?"★":"",SIGNED(s.bonus),s.detail,"",""].forEach((x,j)=>value(ws,r,j+9,x,{size:j===5?9:10}));});
 band(ws,37,"武器與戰鬥",16);
 const wHeaders=["武器","攻擊","傷害骰","類型","熟練","武器屬性","備註"];
 let rr=38;wHeaders.forEach((x,i)=>mergeValue(ws,rr,i===0?1:([4,6,8,10,11,13][i-1]),[3,5,7,9,10,12,16][i],x,{fill:C.navy2,color:"FFFFFF",bold:true,align:"center"}));
 d.weapons.slice(0,16).forEach((w,i)=>{const r=rr+i+1;mergeValue(ws,r,1,3,w.name);mergeValue(ws,r,4,5,SIGNED(w.attack));mergeValue(ws,r,6,7,w.damage);mergeValue(ws,r,8,9,w.type);value(ws,r,10,w.proficient?"✓":"");mergeValue(ws,r,11,12,w.property);mergeValue(ws,r,13,16,w.notes);ws.getRow(r).height=28;});
 const start=rr+Math.max(d.weapons.length,3)+3;band(ws,start,"物種、職業與專長特性（完整條件請以網站規則小卡為準）",16);
 mergeValue(ws,start+1,1,4,"類別",{fill:C.navy2,color:"FFFFFF",bold:true});mergeValue(ws,start+1,5,16,"內容",{fill:C.navy2,color:"FFFFFF",bold:true});
 d.features.slice(0,90).forEach((entry,i)=>{const r=start+2+i;mergeValue(ws,r,1,4,entry[0]);mergeValue(ws,r,5,16,entry[1]);ws.getRow(r).height=Math.min(92,Math.max(29,Math.ceil(TEXT(entry[1]).length/110)*22));});
}
function gearSheet(ws,d){
 columns(ws,[20,26,14,14,14,14,14,18,18,18,18,18]);title(ws,"物品與背景","裝備、幣值與角色設定｜黃色儲存格可自行記錄",12);
 band(ws,4,"現有裝備",12);
 const inventory=[];
 if(d.gear.armor)inventory.push(["護甲",label("armors",d.gear.armor),"1","",""]);
 if(d.gear.shield)inventory.push(["護甲","盾牌","1","",""]);
 for(const w of d.weapons)inventory.push(["武器",w.name,1,"",""]);
 if(d.gear.items)for(const raw of TEXT(d.gear.items).split(/[、,]/).map(x=>x.trim()).filter(Boolean))inventory.push(["冒險用品",raw,"","",""]);
 for(const b of d.bought)inventory.push([b.category,b.name,b.qty,b.price==null?"":b.price/100+" gp","購買紀錄（可能已列在裝備欄）"]);
 let last=table(ws,5,["類別","物品名稱","數量","總價／gp","來源註記"],inventory,{height:25});last=Math.max(last,20);
 band(ws,last,"貨幣",12);
 table(ws,last+1,["鉑幣 pp","金幣 gp","銀幣 sp","銅幣 cp","折合 gp"],[[d.coins.pp||0,d.coins.gp||0,d.coins.sp||0,d.coins.cp||0,d.moneyCp/100]],{height:30});
 band(ws,last+5,"背景與角色設定",12);
 const bio=[["背景",d.background],["性別",d.sex],["年齡",d.age],["信仰",d.faith],["工具熟練",d.tools],["語言",d.languages],["外貌",d.bio.look],["性格",d.bio.traits],["背景故事",d.bio.story],["盟友與組織",d.bio.allies],["其他備註",d.bio.notes]];
 bio.forEach(([name,content],i)=>{let r=last+6+i;mergeValue(ws,r,1,3,name,{fill:C.navy2,color:"FFFFFF",bold:true});mergeValue(ws,r,4,12,content,{fill:C.paper});ws.getRow(r).height=Math.min(130,Math.max(28,Math.ceil(TEXT(content).length/75)*20));});
}
function spellSheet(ws,d){
 columns(ws,[23,10,14,14,17,14,17,11,11,19,19,14,14,68,22]);title(ws,"法術表","法術規則速查｜傷害、豁免與法術攻擊以網站現有規則資料為準",15);
 band(ws,4,"施法資訊",15);table(ws,5,["施法屬性","豁免 DC","攻擊加值"],[[d.spellStore.casterAbility,MINUS(d.spellStore.dc),SIGNED(d.spellStore.attack)]]);
 band(ws,9,"法術位",15);table(ws,10,["環階","總數","已使用","剩餘"],d.spellStore.slots.map(x=>[x.type+" "+x.level+" 環",x.total,x.used,Math.max(0,x.total-x.used)]));
 const r=Math.max(14,12+d.spellStore.slots.length);band(ws,r,"戲法、準備法術與固定授予法術",15);
 const entries=d.spellStore.rows.map(s=>[s.name+(s.eng?" "+s.eng:""),s.level||"戲法",s.group,s.school,s.time,s.range,s.duration,s.concentration?"✓":"",s.ritual?"✓":"",s.components,s.damage,s.save,s.attack,s.effect,s.source]);
 const head=["法術","環階","類別","學派","施法時間","距離","持續時間","專注","儀式","聲／勢／材","傷害骰","目標豁免","法術攻擊","完整規則","來源"];
 table(ws,r+1,head,entries,{height:60,size:10});
 ws.autoFilter={from:{row:r+1,column:1},to:{row:r+1,column:15}};
 note(ws,r+entries.length+4,"提醒：法術傷害依角色目前等級顯示；使用更高環階法術位、特殊條件與完整機制請查看右欄或網站小卡。",15);
}
function spellbookSheet(ws,d){
 columns(ws,[26,10,10,16,18,18,65,16,16]);title(ws,"法術書","法師用法術書；其他職業保留可自行編輯的空白紀錄",9);
 if(!d.spellStore.book.length)note(ws,4,"目前角色沒有已記錄的法術書。此處提供空白欄位供玩家補記，不會自動新增法術。",9,true);
 band(ws,6,"已收錄法術",9);
 const book=d.spellStore.book.map(x=>[x.name,x.level+" 環",x.prepared?"✓":"", "", "", "", "", ""]);
 table(ws,7,["法術名稱","環階","準備","學派","施法時間","範圍","備註／效果","材料","習得來源"],book,{height:32});
 const offset=8+book.length;
 band(ws,offset+2,"額外手動記錄",9);
 table(ws,offset+3,["法術名稱","環階","準備","學派","施法時間","範圍","備註／效果","材料","習得來源"],Array.from({length:20},()=>Array(9).fill("")),{height:30,manual:true});
}
function creatureSheet(ws,d){
 columns(ws,[21,27,21,24,22,18,19,19,19,19]);title(ws,"坐騎","坐騎、魔寵與夥伴生物｜未填資料保持空白，黃色欄位可自行記錄",10);
 const list=[];
 if(d.familiar)list.push(["魔寵",d.familiar]);
 for(const m of(d.creatureLibrary?.mounts||[]))list.push(["坐騎",m]);
 for(const m of(d.creatureLibrary?.summons||[]))list.push(["召喚夥伴",m]);
 let at=4;
 if(list.length){for(const [type,obj] of list){band(ws,at++,type,10);
  const entries=Object.entries(obj||{}).filter(([,v])=>v!==null&&v!==""&&!Array.isArray(v)&&typeof v!=="object").slice(0,28);
  for(const [k,v] of entries){mergeValue(ws,at,1,3,k,{fill:C.navy2,color:"FFFFFF",bold:true});mergeValue(ws,at,4,10,TEXT(v));at++;}at++;
 }}else{note(ws,at++,"目前沒有已選定的魔寵或坐騎；下方可用來紀錄本次冒險的夥伴生物。",10);}
 band(ws,at+1,"手動紀錄欄",10);
 table(ws,at+2,["名稱","種類／型態","生命值","AC","速度","力量","敏捷","體質","能力／攻擊","備註"],Array.from({length:18},()=>Array(10).fill("")),{height:28,manual:true});
}
function sessionSheet(ws,d){
 columns(ws,[8,17,24,17,17,14,14,17,31,46,29]);title(ws,"團務紀錄卡","每次跑團的任務、經驗值與物品記錄｜黃色欄位供手動填寫",11);
 mergeValue(ws,4,1,4,"角色："+d.name,{fill:C.cream,bold:true,size:12});
 mergeValue(ws,4,5,8,"玩家："+d.player,{fill:C.cream,bold:true,size:12});
 mergeValue(ws,4,9,11,"等級："+d.level,{fill:C.cream,bold:true,size:12});
 note(ws,6,"本站目前不提供可靠的歷史場次資料，因此不自動虛構戰役、經驗值或金錢流水。",11);
 table(ws,8,["編號","日期","戰役名稱","DM","地點／時間","XP變動","GP變動","休整天數","物品與獎勵","特殊事件／備註","同場隊友"],Array.from({length:30},(_,i)=>[i+1,...Array(10).fill("")]),{height:32,manual:true});
}
function briefSheet(ws,d){
 columns(ws,[16,16,15,16,17,17,17,20,20,20]);title(ws,"角色簡卡","DM／玩家跑團速查｜列印一頁",10);
 mergeValue(ws,4,1,6,d.name,{fill:C.cream,color:C.burgundy,bold:true,size:18});
 mergeValue(ws,4,7,10,d.className+" "+d.level+" 級",{fill:C.cream,bold:true,size:13});
 mergeValue(ws,5,1,5,d.species+" · "+d.background,{fill:C.paper});
 mergeValue(ws,5,6,10,"玩家 "+d.player,{fill:C.paper});
 card(ws,7,1,2,"生命值",d.hp);card(ws,7,3,4,"AC",d.ac?.total);card(ws,7,5,6,"先攻",SIGNED(d.initiative));card(ws,7,7,8,"速度",d.speed);card(ws,7,9,10,"PB",SIGNED(d.proficiency));
 band(ws,11,"屬性與豁免",10);
 table(ws,12,["屬性","數值","調整值","豁免","熟練"],d.abilities.map(a=>[a.name,a.score,SIGNED(a.mod),SIGNED(a.save),a.proficient?"✓":""]),{height:25});
 band(ws,21,"技能",10);
 for(let i=0;i<9;i++){const r=22+i,left=d.skills[i],right=d.skills[i+9];
  if(left){mergeValue(ws,r,1,3,left.name);value(ws,r,4,left.proficient?(left.expert?"★":"✓"):"");value(ws,r,5,SIGNED(left.bonus));}
  if(right){mergeValue(ws,r,6,8,right.name);value(ws,r,9,right.proficient?(right.expert?"★":"✓"):"");value(ws,r,10,SIGNED(right.bonus));}
  ws.getRow(r).height=24;
 }
 band(ws,43,"常用法術",10);
 const chosen=d.spellStore.rows.slice(0,17).map(s=>[s.name,(s.level||"戲法")+"",s.damage,s.save,s.attack]);
 table(ws,44,["法術","環階","傷害","豁免","法術攻擊"],chosen,{height:24});
 note(ws,64,"熟練技能依網站當前職業特性／專長加值計算；完整機制請查看主角色卡與法術表。",10);
 ws.pageSetup.fitToHeight=1;ws.pageSetup.orientation="landscape";
}
function sanitizeFilename(s){return TEXT(s).replace(/[\\\/:*?"<>|\x00-\x1f]/g,"_").replace(/\s+/g," ").trim().slice(0,62)||"角色";}
function loadExcel(){
 if(window.ExcelJS?.Workbook)return Promise.resolve(window.ExcelJS);
 if(loadPromise)return loadPromise;
 loadPromise=new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="assets/vendor/exceljs.min.js";script.async=true;script.onload=()=>window.ExcelJS?.Workbook?resolve(window.ExcelJS):reject(Error("試算表元件無法初始化"));script.onerror=()=>reject(Error("試算表元件載入失敗"));document.head.appendChild(script)});
 loadPromise=loadPromise.catch(e=>{loadPromise=null;throw e});return loadPromise;
}
function addPortrait(book,ws,portrait){
 const m=String(portrait||"").match(/^data:image\/(png|jpeg);base64,/i);if(!m)return;
 try{const imageId=book.addImage({base64:portrait,extension:m[1].toLowerCase()==="jpeg"?"jpeg":"png"});
  ws.addImage(imageId,{tl:{col:5.15,row:11.5},br:{col:9.75,row:20.1}});
 }catch(e){console.warn("Optional portrait could not be embedded",e);}
}
function createWorkbook(ExcelJS,data){
 const book=new ExcelJS.Workbook();book.creator="D&D 5R 角色建立器";book.subject="角色卡可編輯快照";book.created=new Date();
 const sheets=["角色卡","物品與背景","法術表","法術書","坐騎","團務紀錄卡","角色簡卡"].map(name=>book.addWorksheet(name));
 basic(sheets[0],data);gearSheet(sheets[1],data);spellSheet(sheets[2],data);spellbookSheet(sheets[3],data);creatureSheet(sheets[4],data);sessionSheet(sheets[5],data);briefSheet(sheets[6],data);
 addPortrait(book,sheets[6],data.portrait);
 return book;
}
window.exportCharacterWorkbook=async function(){
 if(exporting)return;exporting=true;
 try{
  const data=ensureExportData();const ExcelJS=await loadExcel(),book=createWorkbook(ExcelJS,data),bytes=await book.xlsx.writeBuffer();
  const blob=new Blob([bytes],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  anchor.href=url;anchor.download=sanitizeFilename(data.name)+"-角色卡.xlsx";document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),15000);
  if(typeof toast==="function")toast("已匯出可編輯的 Excel 角色卡（可匯入 Google 試算表）");
 }catch(e){console.error("XLSX export failed",e);if(typeof toast==="function")toast("試算表匯出失敗："+(e?.message||e));}
 finally{exporting=false;}
};
window.__createCharacterWorkbookForQA=(ExcelJS,data)=>createWorkbook(ExcelJS,data);
})();

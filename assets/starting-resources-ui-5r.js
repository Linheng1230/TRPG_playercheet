/* Higher-level resources UI. Official tables are linked; authorized local data is never bundled or uploaded. */
(function(){
"use strict";
const R=window.StartingResources5R;
if(!R)return;
const names={arcana:"奧術 Arcana",armaments:"武裝 Armaments",implements:"器具 Implements",relics:"聖物 Relics",common:"普通 Common",uncommon:"非普通 Uncommon",rare:"稀有 Rare","very rare":"極稀有 Very Rare",legendary:"傳說 Legendary"};
const modes={official:"官方主題表（D100）",choose:"自由選擇／DM 指定",custom:"網站自訂等稀有度隨機池（非官方表）"};
const localTables=new Map();
const catalog=()=>window.ZIZI_5R_MAGIC_ITEMS||[];
const name=x=>{const z=window.ZIZI_5R_MAGIC_ITEMS_ZH?.[x.id]?.nameZh;return z?z+" "+x.name:x.name};
const roll=n=>1+Math.floor(Math.random()*n);
const valid=(n,max)=>Number.isInteger(n)&&n>=1&&n<=max;
function node(tag,text,parent){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(parent)parent.append(n);return n}
function btn(parent,text,fn){const b=node("button",text,parent);b.type="button";b.addEventListener("click",fn);return b}
function select(parent,label,options,value,change){
 const l=node("label",undefined,parent);l.className="sr5-field";node("span",label,l);
 const s=node("select",undefined,l);for(const [id,text] of options){const o=node("option",text,s);o.value=id}
 s.value=String(value??"");s.addEventListener("change",()=>change(s.value));return s;
}
function numeric(parent,label,max,value,change){
 const l=node("label",undefined,parent);l.className="sr5-field";node("span",label,l);
 const n=node("input",undefined,l);n.type="number";n.min=1;n.max=max;n.step=1;n.value=valid(value,max)?value:"";n.inputMode="numeric";n.addEventListener("change",()=>change(n.value===""?null:Number(n.value)));return n;
}
function draft(s,b){
 const old=s.gear.startingResourcesDraft2024;
 if(old?.level===s.level&&old?.className===s.cls.n&&Array.isArray(old.slots)&&old.slots.length===b.slots.length&&old.slots.every(x=>x&&Object.hasOwn(modes,x.mode)&&R.themes.includes(x.theme)&&typeof x.id==="string"))return old;
 const d={level:s.level,className:s.cls.n,d10:null,slots:b.slots.map(()=>({mode:"official",theme:R.recommended(s.cls.n)||"armaments",themeRoll:null,d100:null,id:""}))};
 s.gear.startingResourcesDraft2024=d;return d;
}
function candidates(slot,rarity,items){
 const pool=items.filter(x=>x.rarity===rarity);
 if(slot.mode!=="official")return pool;
 if(!valid(slot.d100,100))return [];
 const faces=localTables.get(slot.theme+":"+rarity);
 if(!faces)return pool;
 const row=R.lookup(faces,slot.d100);const ids=Array.isArray(row)?row:[row];
 return pool.filter(x=>ids.includes(x.id));
}
function receiptText(el,s,r,items){
 if(r.skipped){node("p","本角色已結束創角額外資源選擇；不會因一般升級或重開裝備頁而重新發放。",el);return}
 node("p","已領取（創角 Lv"+r.level+"）：額外 "+r.gp+" GP。",el);
 if(r.level!==s.level)node("p","目前等級與領取時不同；不會自動補發、回收或重擲。請由 DM 裁定。",el);
 const ul=node("ul",undefined,el);
 for(const id of r.ids||[]){const x=items.find(v=>v.id===id);node("li",x?name(x):id,ul)}
}
function render(parent,s,refresh,save,notify){
 if(!parent||s.ruleset!=="2024"||!s.gear||!s.cls)return;
 const items=catalog(),receipt=s.gear.startingResources2024;
 if(!receipt&&s.level===1)return;
 const box=node("section",undefined,parent);box.className="play-box sr5";box.setAttribute("data-starting-resources-2024","");
 node("div","高等級創角 · 額外金幣與魔法物品",box).className="pt";
 if(receipt){receiptText(box,s,receipt,items);return}
 const b=R.budget(s.level),d=draft(s,b);
 node("p","此為 2024 建議起始資源，需 DM 同意；另外領取正常職業與背景裝備。不是一般升級獎勵。",box);
 const change=()=>{save();refresh()};
 const g=node("div",undefined,box);g.className="sr5-line";
 if(b.multiplier){
  numeric(g,"1d10 結果",10,d.d10,v=>{d.d10=v;change()});
  btn(g,"擲 D10",()=>{d.d10=roll(10);change()});
  node("strong",b.base+"＋1d10×"+b.multiplier+" GP"+(valid(d.d10,10)?" = "+R.gold(s.level,d.d10)+" GP":""),g);
 }else node("strong","額外金幣：無",g);
 const importBox=node("details",undefined,box);node("summary","匯入已獲授權的本機 D100 表（選用）",importBox);
 node("p","官方表的原始機率不會以自訂池取代。未匯入時，請使用官方連結查表並選擇結果；本機 JSON 僅於本頁記憶體載入，不上傳、不寫入角色檔。",importBox);
 node("p",'格式：{"tables":{"arcana:uncommon":[{"min":1,"max":100,"id":"合法物品 ID"}]}}。可用 ids 陣列表示須由 DM 選擇的變體；每張表必須完整覆蓋 1–100。',importBox);
 const f=node("input",undefined,importBox);f.type="file";f.accept=".json,application/json";f.setAttribute("aria-label","匯入本機擲骰表");
 f.addEventListener("change",async()=>{try{
  const file=f.files?.[0];if(!file)return;if(file.size>2*1024*1024)throw new Error("檔案過大");
  const data=JSON.parse(await file.text()),next=new Map();
  if(!data.tables||typeof data.tables!=="object"||Array.isArray(data.tables))throw new Error("缺少 tables");
  for(const [key,rows] of Object.entries(data.tables)){
   const [theme,rarity,...rest]=key.split(":");
   if(rest.length||!R.themes.includes(theme)||!R.rarities.includes(rarity))throw new Error("不支援的主題或稀有度");
   next.set(key,R.compileTable(rows,rarity,items));
  }
  if(!next.size)throw new Error("沒有表格");
  for(const [k,v] of next)localTables.set(k,v);
  d.slots.forEach((slot,i)=>{if(slot.mode==="official"&&localTables.has(slot.theme+":"+b.slots[i])&&valid(slot.d100,100)){const allowed=candidates(slot,b.slots[i],items);slot.id=allowed.length===1?allowed[0].id:allowed.some(x=>x.id===slot.id)?slot.id:""}});
  notify("已載入 "+next.size+" 張本機表；未修改官方資料");change();
 }catch(e){notify("匯入失敗："+e.message)}});
 node("p","目前載入 "+localTables.size+" 張本機表。",importBox);
 const slots=node("div",undefined,box);slots.className="sr5-slots";
 b.slots.forEach((rarity,i)=>{
  const slot=d.slots[i],card=node("div",undefined,slots);card.className="sr5-slot";
  node("strong","魔法物品 "+(i+1)+" · "+names[rarity],card);
  select(card,"取得方式",Object.entries(modes),slot.mode,v=>{slot.mode=v;slot.id="";slot.d100=null;change()});
  if(slot.mode==="official"){
   select(card,"主題（職業推薦："+names[R.recommended(s.cls.n) || "armaments"]+"）",R.themes.map(t=>[t,names[t]]),slot.theme,v=>{slot.theme=v;slot.themeRoll=null;slot.id="";slot.d100=null;change()});
   const line=node("div",undefined,card);line.className="sr5-line";
   btn(line,"隨機主題 D4",()=>{slot.themeRoll=roll(4);slot.theme=R.theme(slot.themeRoll);slot.id="";slot.d100=null;change()});
   if(slot.themeRoll)node("span","D4："+slot.themeRoll,line);
   const a=node("a","開啟官方表查詢（"+names[slot.theme]+"）",card);a.href=R.tableURL(slot.theme);a.target="_blank";a.rel="noopener noreferrer";
   const diceLine=node("div",undefined,card);diceLine.className="sr5-line";
   const setRoll=v=>{slot.d100=v;slot.id="";const allowed=candidates(slot,rarity,items);if(localTables.has(slot.theme+":"+rarity)&&allowed.length===1)slot.id=allowed[0].id;change()};
   numeric(diceLine,"D100 結果（100 = 00）",100,slot.d100,setRoll);btn(diceLine,"擲 D100",()=>setRoll(roll(100)));
   node("p",localTables.has(slot.theme+":"+rarity)?"已使用本機表查詢：如有多個變體，請選擇其中一項。":"尚未載入此表：請依上方官方表與骰值手動選取對應物品（未自動核對）。",card);
  }
  if(slot.mode==="custom")btn(card,"隨機抽選此稀有度",()=>{const pool=items.filter(x=>x.rarity===rarity);if(pool.length){slot.id=pool[roll(pool.length)-1].id;change()}});
  const allowed=candidates(slot,rarity,items);
  const sorted=[...allowed].sort((a,b)=>name(a).localeCompare(name(b),"zh-Hant"));
  const itemSelect=select(card,"取得物品",[["","— 請選擇 —"],...sorted.map(x=>[x.id,name(x)+(x.attunement?"（需同調）":"")])],allowed.some(x=>x.id===slot.id)?slot.id:"",v=>{slot.id=v;change()});if(slot.mode==="custom")itemSelect.disabled=true;
  const x=allowed.find(x=>x.id===slot.id);if(x)node("p",x.attunement?"需同調；領取不等於已同調或已裝備。":"無同調要求；領取不等於已裝備。",card);
 });
 const validPlan=()=> (!b.multiplier||valid(d.d10,10))&&d.slots.every((slot,i)=>["official","choose","custom"].includes(slot.mode)&&candidates(slot,b.slots[i],items).some(x=>x.id===slot.id));
 const apply=btn(box,"DM 已同意，確認領取額外資源",()=>{
  if(!validPlan()||!confirm("確認本次創角額外資源？金幣與物品將加入既有背包；不得於一般升級重複領取。"))return;
  const result=R.grant(s,{d10:d.d10,ids:d.slots.map(x=>x.id),records:d.slots.map((x,i)=>({mode:x.mode,theme:x.mode==="official"?x.theme:null,themeRoll:x.mode==="official"?x.themeRoll:null,d100:x.mode==="official"?x.d100:null,verification:x.mode==="official"?(localTables.has(x.theme+":"+b.slots[i])?"local-table":"manual-lookup"):"not-official-table"}))},items,(state,id)=>window.MagicItemImport5R.add(state,id));
  if(!result.ok){notify("無法領取："+result.reason);return}
  delete s.gear.startingResourcesDraft2024;save(true);notify("已加入角色背包；不會自動同調");refresh();
 });
 apply.className="sr5-confirm";apply.disabled=!validPlan();node("p","若 DM 不提供額外資源，直接使用下方原有「最終確認裝備」即可略過。",box);
}
window.StartingResourcesUI5R=Object.freeze({render});
})();

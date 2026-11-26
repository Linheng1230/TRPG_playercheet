/* DOM adapter for DM Screen board. Only explicit user actions roll or persist. */
(function(root){
"use strict";
const R=root.DMScreenLoot,localByEdition=new Map();
if(!R)return;
const sourceLinks={"2024":"https://www.dndbeyond.com/sources/dnd/br-2024/magic-items#AwardingMagicItems","2014":"https://www.dndbeyond.com/sources/dnd/xgte"};
const scopeLabels={tier:"本等級區間",cumulative:"累積至此區間","exact-tier":"本區間按等級進度","exact-cumulative":"累積至指定等級"};
function el(tag,text,p){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(p)p.append(n);return n}
function btn(p,text,fn){const b=el("button",text,p);b.type="button";b.addEventListener("click",fn);return b}
function select(p,label,opts,value){const l=el("label",undefined,p);l.className="loot-field";el("span",label,l);const s=el("select",undefined,l);for(const [v,t] of opts){const o=el("option",t,s);o.value=v} s.value=String(value);return s}
function input(p,label,value,type="text",min,max){const l=el("label",undefined,p);l.className="loot-field";el("span",label,l);const n=el("input",undefined,l);n.type=type;n.value=value;if(type==="number"){n.min=min;n.max=max;n.step=1;n.inputMode="numeric"}else n.maxLength=40;return n}
function row(p){const x=el("div",undefined,p);x.className="loot-grid";return x}
function anchor(p,text,url){const a=el("a",text,p);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function render(parent,type,saved,edition,save,notify){
const c=JSON.parse(JSON.stringify(saved)),section=el("section",undefined,parent);section.className="loot-tool";section.dataset.lootType=type;
el("p","只有按下產生才擲骰；不會扣資源、發放到角色或改動戰鬥。",section).className="panel-help";
anchor(section,"5eTools 戰利品工具（原版參考）","https://5r.dndtools.top/lootgen.html");
anchor(section,edition==="2024"?"2024 官方魔法物品配額參考":"2014 XGE 配額參考",sourceLinks[edition]);
if(type==="find-loot")anchor(section,edition==="2024"?"2024 DMG 財寶規則參考":"2014 DMG 財寶規則參考",edition==="2024"?"https://www.dndbeyond.com/sources/dnd/dmg-2024":"https://www.dndbeyond.com/sources/dnd/dmg");
const status=el("p","自訂預設與等稀有度抽選不是官方機率；本機匯入只驗證格式及骰值覆蓋，不代表官方授權或真實性。",section);status.className="panel-help";
const fileLabel=el("label",undefined,section);fileLabel.className="loot-field";el("span","匯入有權使用的 "+edition+" JSON 表（選用；D100 原表留在本頁記憶體）",fileLabel);
const file=el("input",undefined,fileLabel);file.type="file";file.accept="application/json,.json";
const help=el("details",undefined,section);el("summary","本機表格式",help);el("p",'{"edition":"'+edition+'","treasure":{"0:individual":[{"min":1,"max":100,"coins":["0","0","0","2d6","0"],"counts":["0","0","0","0","0"]}]},"party":[[2,1,0,0,0],[3,4,1,0,0],[2,3,3,1,0],[0,1,2,3,1]]}。以上為自訂範例；coins 順序 CP/SP/EP/GP/PP；counts/party 順序普通至傳說；財寶列可選填 valuables 四個骰式（寶石件數、每件 GP、藝術品件數、每件 GP）。',help);
let read;
file.addEventListener("change",async()=>{try{const f=file.files?.[0];if(!f)return;if(f.size>262144)throw Error("檔案過大");const data=R.compileLocal(JSON.parse(await f.text()),edition);const old=localByEdition.get(edition)||{treasure:{},party:null};localByEdition.set(edition,{treasure:{...old.treasure,...data.treasure},party:data.party||old.party});notify("已載入本機表，尚未核對官方來源。");if(type==="party-loot"&&data.party){read();c.quota=data.party;c.result=null;save(c)}else{read();save(c)}}catch(e){notify(e.message,true)}});
if(type==="find-loot"){
 const fields=row(section);
 const tier=select(fields,"挑戰等級 CR",R.tiers.map((t,i)=>[i,t]),c.tier),kind=select(fields,"財寶類型",[["individual","個別財寶"],["hoard","寶庫"]],c.kind),times=input(fields,"抽選次數",c.times,"number",1,20),mode=select(fields,"來源",[["custom","自訂骰式（非官方表）"],["local-table","已匯入的本機 D100 表"]],c.mode);
 const detail=el("div",undefined,section);el("strong","錢幣骰式",detail);const coinRow=row(detail),coins=R.currencies.map((k,i)=>input(coinRow,k.toUpperCase(),c.coins[i]));el("strong","魔法物品名額骰式",detail);const itemRow=row(detail),counts=R.labels.map((k,i)=>input(itemRow,k,c.counts[i]));el("strong","寶石／藝術品（自訂估價）",detail);const valueRow=row(detail),valuables=["寶石件數","寶石單價 GP","藝術品件數","藝術品單價 GP"].map((k,i)=>input(valueRow,k,c.valuables[i]));
 const loaded=el("p","",section);function visibility(){detail.hidden=mode.value==="local-table";const key=tier.value+":"+kind.value;loaded.textContent=localByEdition.get(edition)?.treasure?.[key]?"此 CR／類型已有本機 100 面表。":"此 CR／類型尚未匯入本機表。";}mode.addEventListener("change",visibility);tier.addEventListener("change",visibility);kind.addEventListener("change",visibility);visibility();
 btn(section,"套用此 CR 自訂預設（非官方）",()=>{const d=R.preset(+tier.value,kind.value);d.coins.forEach((v,i)=>coins[i].value=v);d.counts.forEach((v,i)=>counts[i].value=v);d.valuables.forEach((v,i)=>valuables[i].value=v);mode.value="custom";visibility()});
 read=()=>{Object.assign(c,{tier:+tier.value,kind:kind.value,times:times.value===""?NaN:+times.value,mode:mode.value,coins:coins.map(x=>x.value),counts:counts.map(x=>x.value),valuables:valuables.map(x=>x.value),selection:selection.value});return c};
}else{
 const fields=row(section),level=input(fields,"隊伍等級",c.level,"number",1,20),size=input(fields,"隊伍人數（紀錄用，不自動倍增配額）",c.size,"number",1,12),scope=select(fields,"配額範圍",Object.entries(scopeLabels),c.scope);
 el("p","配額為整隊總數，不是每名玩家。初始值為本站自訂；請按官方參考或 DM 決策調整。精確模式依區間進度向下取整，非官方逐級規則。套用的隊伍配額與產生結果會儲存至本機看板及備份。",section);
 const quota=[];
 R.levels.forEach(([a,b],i)=>{el("strong","Lv"+a+"–"+b,section);const rr=row(section);quota.push(R.labels.map((x,j)=>input(rr,x,c.quota[i][j],"number",0,40)))});
 read=()=>{Object.assign(c,{level:level.value===""?NaN:+level.value,size:size.value===""?NaN:+size.value,scope:scope.value,quota:quota.map(r=>r.map(x=>x.value===""?NaN:+x.value)),selection:selection.value});return c};
 btn(section,"套用已匯入的隊伍配額",()=>{try{read();const data=localByEdition.get(edition)?.party;if(!data)throw Error("尚未匯入本機配額");c.quota=data.map(x=>x.slice());c.result=null;save(c)}catch(e){notify(e.message,true)}});
}
const selection=select(section,"物品結果",[["slots","只列稀有度名額（DM 選定）"],...(edition==="2024"?[["catalog","既有 2024 物品池等機率抽選（非官方表）"]]:[])],edition==="2024"?c.selection:"slots");
if(edition==="2014")el("p","2014 尚無已驗證的物品池；可產生名額，不借用 2024 物品。",section);
const buttons=row(section);
btn(buttons,"儲存設定",()=>{try{read();R.validate(type,c);save(c)}catch(e){notify(e.message,true)}});
const go=btn(buttons,"產生戰利品",()=>{try{read();const catalog=R.catalogFor(edition,root.ZIZI_5R_MAGIC_ITEMS,root.ZIZI_5R_MAGIC_ITEMS_ZH);c.result=R.generate(type,c,edition,catalog,localByEdition.get(edition));save(c)}catch(e){notify(e.message,true)}});go.className="primary-action";
btn(buttons,"清除結果",()=>{try{read();c.result=null;R.validate(type,c);save(c)}catch(e){notify(e.message,true)}});
if(c.result){const r=c.result,output=el("div",undefined,section);output.className="loot-result";el("strong","最近一次結果 · "+r.summary,output);el("p",r.source==="local-table"?"本機匯入表（未驗證官方來源）":r.source==="manual-quota"?"DM 配額（物品池非官方）":"自訂骰式（非官方表）",output);if(r.dice.length)el("p","D100："+r.dice.join("、"),output);el("p",r.coins.map((v,i)=>v+" "+R.currencies[i].toUpperCase()).join(" · ")+"｜合計 "+R.totalGp(r.coins)+" GP 等值",output);if(r.valuables.some(x=>x.qty)){el("p","寶石 "+r.valuables[0].qty+" 件（"+r.valuables[0].gp+" GP） · 藝術品 "+r.valuables[1].qty+" 件（"+r.valuables[1].gp+" GP）",output);el("p","錢幣與珍寶合計 "+(R.totalGp(r.coins)+r.valuables.reduce((sum,x)=>sum+x.gp,0))+" GP 等值（不含魔法物品）",output)}el("p",r.counts.map((n,i)=>R.labels[i]+" "+n+" 件").join(" · "),output);const list=el("ul",undefined,output);const groups=new Map();for(const item of r.items){const k=item.rarity+":"+item.id+":"+item.name;const prev=groups.get(k);groups.set(k,{...item,count:(prev?.count||0)+1})}for(const item of groups.values())el("li",item.name+" × "+item.count+"（"+R.labels[R.rarities.indexOf(item.rarity)]+"）",list);btn(output,"複製戰利品清單",async()=>{try{await navigator.clipboard.writeText([r.summary,r.coins.map((v,i)=>v+" "+R.currencies[i].toUpperCase()).join(" / "),"寶石 "+r.valuables[0].qty+" 件 / "+r.valuables[0].gp+" GP","藝術品 "+r.valuables[1].qty+" 件 / "+r.valuables[1].gp+" GP",...Array.from(groups.values(),x=>x.name+" × "+x.count)].join("\n"));notify("已複製清單。")}catch(e){notify("無法使用剪貼簿，請手動選取結果。",true)}})}
}
root.DMScreenLootUI=Object.freeze({render});
})(window);

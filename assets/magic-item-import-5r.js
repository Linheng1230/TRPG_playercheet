(function(){
"use strict";
const armorTypes=new Set(["HA","LA","MA","S"]),kind=x=>x.type==="M"?"weapon":armorTypes.has(x.type)?"armor":"equipment",titles={weapon:"武器",armor:"護甲",equipment:"裝備"};
const esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const catalog=()=>window.ZIZI_5R_MAGIC_ITEMS||[],zh=x=>window.ZIZI_5R_MAGIC_ITEMS_ZH?.[x.id]||{},name=x=>(zh(x).nameZh||x.name)+"｜"+x.name;
function normalize(list){
 const map=new Map();if(!Array.isArray(list))return [];
 list.slice(0,1000).forEach(v=>{if(typeof v?.id!=="string"||!v.id.trim())return;const n=Number(v.qty);if(!Number.isFinite(n))return;const qty=Math.max(0,Math.min(99,Math.trunc(n)));if(qty)map.set(v.id,Math.min(99,(map.get(v.id)||0)+qty))});
 return [...map].map(([id,qty])=>({id,qty}));
}
const owned=s=>normalize(s?.gear?.magicItems);
function rows(s){const items=new Map(catalog().map(x=>[x.id,x]));return owned(s).map(e=>{const x=items.get(e.id);return x?{id:e.id,qty:e.qty,x,group:kind(x)}:null}).filter(Boolean)}
function add(s,id){
 if(!s?.cls||!s?.gear)return {ok:false,message:"請先選擇角色職業，再導入魔法物品"};
 const x=catalog().find(v=>v.id===id);if(!x)return {ok:false,message:"查無此魔法物品"};
 const list=owned(s),entry=list.find(v=>v.id===id);
 if(entry){if(entry.qty>=99)return {ok:false,message:"同種物品最多紀錄 99 件"};entry.qty++}else list.push({id,qty:1});
 s.gear.magicItems=list;return {ok:true,message:"已導入"+titles[kind(x)]+"欄："+(zh(x).nameZh||x.name)};
}
function remove(s,id){if(!s?.gear)return false;const list=owned(s),row=list.find(x=>x.id===id);if(!row)return false;row.qty--;s.gear.magicItems=list.filter(x=>x.qty>0);return true}
function actionHTML(s,x){const q=owned(s).find(e=>e.id===x.id)?.qty||0;return '<button type="button" class="pr-magic-add" data-magic-add="'+esc(x.id)+'">＋ 導入'+titles[kind(x)]+'欄</button><span class="pr-magic-count" data-magic-count="'+esc(x.id)+'">'+(q?"已持有 ×"+q:"尚未持有")+'</span>'}
function fullRule(x){const a=zh(x).sectionsZh||[];return a.length?a.map(v=>'<div class="pr-rule">'+(v.h?'<b>'+esc(v.h)+'</b> ':'')+'<span>'+esc(v.t||"")+'</span></div>').join(""):'<p>此項暫無繁中規則說明；請核對 2024 地下城主指南。</p>'}
function render(s,group){
 const a=rows(s).filter(r=>r.group===group);if(!a.length)return "";
 const t={weapon:"魔法武器",armor:"魔法護甲與盾牌",equipment:"魔法裝備／消耗品"}[group];
 return '<div class="play-box pr-magic-box"><div class="pt">'+t+'（'+a.reduce((n,r)=>n+r.qty,0)+' 件）</div>'+a.map(r=>{
  const x=r.x,n=[x.bonusWeapon?"武器加值："+x.bonusWeapon:"",x.bonusAc!=null?"護甲加值："+x.bonusAc:"",x.charges!=null?"充能數："+x.charges:""].filter(Boolean).join(" · ");
  return '<details class="pr-magic-owned"><summary><b>'+esc(name(x))+'</b><span>×'+r.qty+' · '+esc(x.rarity)+(x.attunement?" · 需要同調":"")+'</span></summary><div class="pr-magic-detail"><p>來源：2024 地下城主指南'+(x.page?" 第 "+x.page+" 頁":"")+' · ID：'+esc(x.id)+'</p>'+(n?'<p>'+esc(n)+'</p>':"")+fullRule(x)+'<button type="button" class="pr-magic-remove" data-magic-remove="'+esc(x.id)+'">移除 1 件</button></div></details>';
 }).join("")+'<p class="pr-magic-warning">魔法加值、同調及充能依原規則判定；不自動覆寫普通武器或護甲數值。</p></div>';
}
function readable(s){return rows(s).map(({x,qty,group})=>({id:x.id,名稱:name(x),數量:qty,分類:titles[group],稀有度:x.rarity,需要同調:!!x.attunement,來源:x.source,頁碼:x.page||null,基礎物品:x.baseItem||null,規則:(zh(x).sectionsZh||[]).map(v=>(v.h?v.h+"：":"")+(v.t||"")).join("\n")}))}
function equipmentText(s){return ["weapon","armor","equipment"].map(g=>{const a=rows(s).filter(r=>r.group===g);return a.length?({weapon:"魔法武器",armor:"魔法護甲",equipment:"魔法物品"}[g]+"："+a.map(r=>(zh(r.x).nameZh||r.x.name)+(r.qty>1?" ×"+r.qty:"")).join("、")):""}).filter(Boolean).join("\n")}
function weaponRows(s){return rows(s).filter(r=>r.group==="weapon").map(r=>({name:name(r.x)+(r.qty>1?" ×"+r.qty:""),attack:null,damage:"",type:"",property:"魔法武器",notes:"2024 地下城主指南"+(r.x.page?" P."+r.x.page:"")+"；依原規則"}))}
window.MagicItemImport5R=Object.freeze({normalize,rows,add,remove,actionHTML,render,readable,equipmentText,weaponRows});
document.addEventListener("click",e=>{
 const b=e.target.closest?.("button[data-magic-add],button[data-magic-remove]");if(!b)return;
 const isAdd=b.hasAttribute("data-magic-add");
 if(isAdd&&!document.getElementById("refBody")?.contains(b))return;
 if(!isAdd&&!document.getElementById("finalSheet")?.contains(b))return;
 e.preventDefault();e.stopPropagation();
 const id=isAdd?b.dataset.magicAdd:b.dataset.magicRemove;
 const r=isAdd?add(S,id):{ok:remove(S,id),message:"已移除 1 件魔法物品"};
 if(!r.ok){if(typeof toast==="function")toast(r.message);return}
 if(isAdd)document.querySelectorAll("[data-magic-count]").forEach(el=>{if(el.dataset.magicCount===id){const q=owned(S).find(x=>x.id===id)?.qty||0;el.textContent=q?"已持有 ×"+q:"尚未持有"}});
 else if(S.step===7&&typeof renderFinal==="function")renderFinal();
 if(typeof update==="function")update();
 if(typeof autoSave==="function")autoSave();
 if(typeof toast==="function")toast(r.message);
});
const css=".pr-magic-card-row{display:flex;gap:8px;align-items:stretch;min-width:0}.pr-magic-card-row>.pr-card{flex:1;min-width:0}.pr-magic-card-row>.pr-magic-action{flex:0 0 138px;display:flex;flex-direction:column;justify-content:center;gap:5px}.pr-magic-add,.pr-magic-remove{border:1px solid #8c3b35;border-radius:4px;background:#914039;color:#fff5e9;padding:8px 10px;min-height:38px;cursor:pointer;font-size:13px;font-weight:700}.pr-magic-count{font-size:12px;color:#6b4c36;text-align:center}.pr-magic-box{min-width:0}.pr-magic-owned{border:1px solid var(--line-soft);margin:8px 0;padding:8px 10px}.pr-magic-owned summary{display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;cursor:pointer;overflow-wrap:anywhere}.pr-magic-owned summary span,.pr-magic-warning{font:12px/1.6 var(--sans);color:var(--muted)}.pr-magic-detail{font:15px/1.75 var(--sans);overflow-wrap:anywhere}.pr-magic-detail .pr-rule{margin:8px 0}.pr-magic-warning{margin-top:8px}.pr-magic-remove{background:#fbefde;color:#82302a}@media(max-width:520px){.pr-magic-card-row{flex-direction:column;gap:0}.pr-magic-card-row>.pr-magic-action{flex:0 0 auto;flex-direction:row;justify-content:space-between;align-items:center;padding:6px 0 10px}.pr-magic-add{min-height:44px}.pr-magic-count{text-align:left}}";
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
})();
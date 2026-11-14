/* 2024 purchase-to-character adapter. Canonical mount stats remain in XMM. */
(function(){
"use strict";
const mountNames={"mkt:駱駝":"Camel","mkt:大象":"Elephant","mkt:役馬":"Draft Horse","mkt:乘用馬":"Riding Horse","mkt:獒犬":"Mastiff","mkt:騾":"Mule","mkt:矮種馬":"Pony","mkt:戰馬":"Warhorse"};
const saddles=["mkt:騎乘鞍座","mkt:軍用鞍座","mkt:異種鞍座"];
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const qty=(s,id)=>Math.max(0,Math.min(500,Math.trunc(Number(s?.gear?.purchases?.[id])||0)));
const getCreature=id=>(window.ZIZI_5R_CREATURES||[]).find(x=>x.source==="XMM"&&x.name===mountNames[id])||null;
const getName=x=>((window.ZIZI_5R_CREATURES_ZH||{})[x.id]?.nameZh||x.name)+"｜"+x.name;
function sync(s){
 if(!s?.gear)return [];
 const g=s.gear;
 g.purchases=g.purchases&&typeof g.purchases==="object"?g.purchases:{};
 if(!g.shopEquipped||typeof g.shopEquipped!=="object"||Array.isArray(g.shopEquipped)){
  g.shopEquipped={};
  // Legacy saves auto-added purchased weapons to the weapon panel.
  for(const [id,n] of Object.entries(g.purchases)){
   if(!id.startsWith("w:"))continue;
   g.shopEquipped[id]=Math.min(qty(s,id),(g.weapons||[]).filter(x=>x===id.slice(2)).length);
  }
 }
 const raw=Array.isArray(g.shopMounts)?g.shopMounts:[],newRows=[],used=new Set();
 for(const itemId of Object.keys(mountNames)){
  const c=getCreature(itemId),n=qty(s,itemId);if(!c)continue;
  const rows=raw.filter(x=>x&&x.itemId===itemId&&x.creatureId===c.id&&typeof x.id==="string"&&x.id.length<100).sort((a,b)=>Number(!!b.riding)-Number(!!a.riding));
  for(const x of rows){
   if(newRows.filter(r=>r.itemId===itemId).length>=n||used.has(x.id))continue;
   used.add(x.id);
   newRows.push({id:x.id,itemId,creatureId:c.id,nickname:String(x.nickname||"").slice(0,60),riding:!!x.riding,saddle:saddles.includes(x.saddle)?x.saddle:""});
  }
  for(let counter=1;newRows.filter(r=>r.itemId===itemId).length<n;counter++){
   const id="pm:"+c.id+":"+counter;if(used.has(id))continue;used.add(id);
   newRows.push({id,itemId,creatureId:c.id,nickname:"",riding:false,saddle:""});
  }
 }
 let riding=false;
 for(const r of newRows)if(r.riding){if(riding)r.riding=false;else riding=true}
 for(const saddle of saddles){let assigned=0;for(const r of newRows)if(r.saddle===saddle&&assigned++>=qty(s,saddle))r.saddle=""}
 g.shopMounts=newRows;
 for(const [id,n] of Object.entries(g.shopEquipped)){
  const actual=Math.min(qty(s,id),Math.max(0,Math.trunc(Number(n)||0)),(g.weapons||[]).filter(x=>x===id.slice(2)).length);
  if(!id.startsWith("w:")||!actual)delete g.shopEquipped[id];else g.shopEquipped[id]=actual;
 }
 if(g.shopWorn&&!qty(s,g.shopWorn))g.shopWorn="";
 return newRows;
}
function onPurchase(s){if(s?.ruleset==="2024")sync(s)}
function onRefund(s,item){
 if(s?.ruleset!=="2024")return;
 const g=s.gear,id=item?.id||"",owned=qty(s,id);
 if(item?.cat==="武器"){
  const prev=Number(g.shopEquipped?.[id]||0);
  for(let i=owned;i<prev;i++){const at=(g.weapons||[]).lastIndexOf(item.n);if(at>=0)g.weapons.splice(at,1)}
  if(g.shopEquipped)g.shopEquipped[id]=Math.min(owned,prev);
 }
 if(g.shopWorn===id&&owned===0){
  if(id==="a:盾牌")g.shield=false;
  else if(g.armor===item.n)g.armor="";
  g.shopWorn="";
 }
 sync(s);
}
function ride(s,id){
 const rows=sync(s),r=rows.find(x=>x.id===id);if(!r)return false;
 const turnOn=!r.riding;if(turnOn)rows.forEach(x=>x.riding=false);r.riding=turnOn;return true;
}
function rename(s,id,name){const r=sync(s).find(x=>x.id===id);if(!r)return false;r.nickname=String(name||"").trim().slice(0,60);return true}
function saddle(s,id,value){
 const row=sync(s).find(x=>x.id===id);
 if(!row||!(value===""||saddles.includes(value)))return false;
 if(value&&sync(s).filter(x=>x.id!==id&&x.saddle===value).length>=qty(s,value))return false;
 row.saddle=value;return true;
}
function equip(s,id){
 if(!s?.gear||qty(s,id)<1)return false;
 const g=s.gear;sync(s);
 if(id.startsWith("w:")){
  const count=Number(g.shopEquipped[id]||0);if(count>=qty(s,id))return false;
  g.weapons.push(id.slice(2));g.shopEquipped[id]=count+1;return true;
 }
 if(id==="a:盾牌"){g.shield=true;g.shopWorn=id;return true}
 if(id.startsWith("a:")){g.armor=id.slice(2);g.unarmored="auto";g.shopWorn=id;return true}
 return false;
}
function unequip(s,id){
 if(!s?.gear)return false;
 const g=s.gear;sync(s);
 if(id.startsWith("w:")){
  if(!g.shopEquipped[id])return false;
  const pos=g.weapons.lastIndexOf(id.slice(2));if(pos<0)return false;
  g.weapons.splice(pos,1);g.shopEquipped[id]--;return true;
 }
 if(id==="a:盾牌"&&g.shield){g.shield=false;g.shopWorn="";return true}
 if(id.startsWith("a:")&&g.armor===id.slice(2)){g.armor="";g.shopWorn="";return true}
 return false;
}
function renderGear(s){
 if(s?.ruleset!=="2024")return "";
 sync(s);
 const goods=Object.entries(s.gear.purchases).filter(([id,n])=>qty(s,id)&&/^(w:|a:)/.test(id));
 if(!goods.length)return "";
 const known=new Map((typeof shopCatalog==="function"?shopCatalog():[]).map(x=>[x.id,x]));
 return '<div class="play-box sgl-owned"><div class="pt">已購武器與護甲</div><p class="sgl-info">商品進入持有清單後，可自行加入武器欄或穿戴護甲；不會因購買而立即改變 AC。</p>'+goods.map(([id,n])=>{
  const item=known.get(id),isWeapon=id.startsWith("w:"),gear=s.gear,number=qty(s,id),equipped=isWeapon?Number(gear.shopEquipped?.[id]||0):id==="a:盾牌"?!!gear.shield:gear.armor===id.slice(2);
  let detail=item?.note||"2024 裝備表";const rawArmor=typeof ARMORS!=="undefined"&&ARMORS.find(a=>a.n===id.slice(2));
  if(rawArmor)detail="護甲 "+rawArmor.cat+" · AC "+rawArmor.ac+(rawArmor.str?" · 力量 "+rawArmor.str:"")+(rawArmor.stealth?" · 隱匿劣勢":"");
  const rawWeapon=typeof WEAPONS!=="undefined"&&WEAPONS.find(w=>w[1]===id.slice(2));
  if(rawWeapon)detail=rawWeapon[0]+" · "+rawWeapon[2]+" · "+rawWeapon[3]+" · "+(rawWeapon[4]||"");
  const name=typeof displayName5R==="function"?displayName5R(isWeapon?"weapons":"armors",item?.n||id.slice(2)):id.slice(2);
  return '<div class="sgl-row"><div><b>'+esc(name)+'</b><small>持有 '+number+' · '+esc(detail)+'</small></div><div class="sgl-actions"><span>'+(isWeapon?"武器欄 "+equipped+" / "+number:equipped?"目前已裝備":"目前未裝備")+'</span><button data-sgl-equip="'+esc(id)+'"'+(isWeapon&&equipped>=number?" disabled":"")+'>'+(isWeapon?"加入武器欄":id==="a:盾牌"?"持盾":"穿戴")+'</button><button data-sgl-unequip="'+esc(id)+'"'+(!equipped?" disabled":"")+'>'+(isWeapon?"移出武器欄":"卸下")+'</button></div></div>';
 }).join("")+'</div>';
}
function renderMounts(s,compact=false){
 if(s?.ruleset!=="2024")return "";
 const rows=sync(s);if(!rows.length)return "";
 return '<section class="'+(compact?"sgl-play":"play-box sgl-mounts")+'"><h4>已購坐騎（'+rows.length+' 匹）</h4><p class="sgl-info">每匹獨立記錄，資料來自 XMM。購買不等於已騎乘；是否可騎乘及坐騎行動依 2024 規則與 DM 判定。</p>'+rows.map(r=>{
  const x=getCreature(r.itemId);if(!x)return "";
  const z=window.ZIZI_5R_CREATURES_ZH?.[x.id]||{},size=(x.sizeCodes||[]).join("/"),speed=Object.entries(x.speed||{}).map(([k,v])=>({walk:"步行",fly:"飛行",swim:"游泳"}[k]||k)+" "+v+" 呎").join("、");
  const choices='<option value="">不配置鞍座</option>'+saddles.filter(id=>qty(s,id)||r.saddle===id).map(id=>'<option value="'+esc(id)+'"'+(r.saddle===id?" selected":"")+'>'+esc(id.slice(4))+'</option>').join("");
  return '<details class="sgl-card" data-sgl-mount="'+esc(r.id)+'"><summary><b>'+esc((r.nickname?r.nickname+" · ":"")+getName(x))+'</b><small>'+(r.riding?"騎乘中":"未騎乘")+(r.saddle?" · "+esc(r.saddle.slice(4)):"")+'</small></summary><div class="sgl-body"><p>來源：XMM｜'+esc(x.id)+'｜體型：'+esc(size)+'｜'+esc((size==="M"?"中型坐騎一般適合小型以下騎乘者。":"須符合騎乘者體型、坐騎意願與受訓條件。"))+'</p><div class="sgl-stats"><span>AC <b>'+esc(x.ac)+'</b></span><span>HP <b>'+esc(x.hp)+'</b></span><span>'+esc(speed)+'</span></div><p>上／下坐騎消耗一半速度；受控坐騎依規則僅能衝刺、撤離、防禦。本卡不直接修改角色速度或戰鬥數值。</p>'+(compact?"":(window.CreatureImport5R?.stat?.(x,s)||""))+'<div class="sgl-controls"><label>暱稱<input maxlength="60" data-sgl-name="'+esc(r.id)+'" value="'+esc(r.nickname)+'" placeholder="未命名"></label><label>鞍座<select data-sgl-saddle="'+esc(r.id)+'">'+choices+'</select></label><button type="button" data-sgl-ride="'+esc(r.id)+'">'+(r.riding?"結束騎乘標記":"標記騎乘中")+'</button></div></div></details>';
 }).join("")+'</section>';
}
function exportMounts(s){
 return sync(s).map(r=>{const x=getCreature(r.itemId);return x?{id:r.id,itemId:r.itemId,creatureId:x.id,name:getName(x),nickname:r.nickname,riding:r.riding,saddle:r.saddle,ac:x.ac,hp:x.hp,speed:Object.entries(x.speed||{}).map(([k,v])=>k+" "+v+" ft").join("、"),source:"XMM",traits:window.ZIZI_5R_CREATURES_ZH?.[x.id]?.traitsZh||[],actions:window.ZIZI_5R_CREATURES_ZH?.[x.id]?.actionsZh||[]}:null}).filter(Boolean);
}
function refresh(){
 if(typeof S==="undefined")return;
 if(S.step===7&&typeof renderFinal==="function")renderFinal();
 if(typeof renderPlayStatusTab==="function"&&document.getElementById("playStatusBody")?.offsetParent)renderPlayStatusTab();
 if(typeof update==="function")update();
 if(typeof autoSave==="function")autoSave();
}
document.addEventListener("click",e=>{
 const b=e.target.closest?.("[data-sgl-equip],[data-sgl-unequip],[data-sgl-ride]");if(!b||typeof S==="undefined")return;
 e.preventDefault();
 const ok=b.hasAttribute("data-sgl-equip")?equip(S,b.dataset.sglEquip):b.hasAttribute("data-sgl-unequip")?unequip(S,b.dataset.sglUnequip):ride(S,b.dataset.sglRide);
 if(ok)refresh();else if(typeof toast==="function")toast("無法執行，請確認持有量與裝備狀態");
});
document.addEventListener("change",e=>{
 const b=e.target;if(typeof S==="undefined")return;
 const ok=b.matches?.("[data-sgl-name]")?rename(S,b.dataset.sglName,b.value):b.matches?.("[data-sgl-saddle]")?saddle(S,b.dataset.sglSaddle,b.value):null;
 if(ok===null)return;if(ok)refresh();else{if(typeof toast==="function")toast("鞍座持有數量不足");refresh()}
});
const st=document.createElement("style");
st.textContent=".sgl-owned,.sgl-mounts,.sgl-play{min-width:0}.sgl-info,.sgl-row small{font:14px/1.7 'PingFang TC','Noto Sans CJK TC','Microsoft JhengHei',sans-serif;color:#413329}.sgl-row{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--line-soft);padding:11px 0}.sgl-row>div:first-child{flex:1;min-width:0}.sgl-row small{display:block}.sgl-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.sgl-owned button,.sgl-controls button{padding:8px 12px;min-height:40px;border-radius:4px;border:1px solid var(--line);background:var(--red);color:#fff;cursor:pointer}.sgl-owned button:disabled{opacity:.45;cursor:default}.sgl-card{border:1px solid var(--line-soft);padding:10px 12px;margin:10px 0;min-width:0}.sgl-card summary{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;cursor:pointer}.sgl-card summary small{font-size:13px}.sgl-body{font:15.5px/1.8 'PingFang TC','Noto Sans CJK TC','Microsoft JhengHei',sans-serif;max-width:74ch;overflow-wrap:anywhere}.sgl-stats{display:flex;gap:8px;flex-wrap:wrap}.sgl-stats span{border:1px solid var(--line-soft);padding:4px 8px}.sgl-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:end}.sgl-controls label{flex:1 1 160px;font-size:14px}.sgl-controls input,.sgl-controls select{display:block;width:100%;max-width:100%;min-height:42px;box-sizing:border-box;padding:7px;font:15px/1.5 'PingFang TC','Microsoft JhengHei',sans-serif}.sgl-play{margin-top:15px}.sgl-play h4,.sgl-mounts h4{font-size:16px}@media(max-width:520px){.sgl-row{display:block}.sgl-actions{margin-top:8px}.sgl-owned button,.sgl-controls button{min-height:44px}.sgl-card summary{display:block}.sgl-card summary small{display:block}}";
document.head.appendChild(st);
window.ShopGearLink5R=Object.freeze({mountNames,getCreature,sync,onPurchase,onRefund,ride,rename,saddle,equip,unequip,renderGear,renderMounts,exportMounts});
})();
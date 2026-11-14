/* DM-run local shop profiles. Does not replace canonical merchandise or character saves. */
(function(){
"use strict";
const KEY="dnd5r:merchant-shops:v1",tiers=["village","town","city","metropolis","special"];
const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let editor=false;
function empty(){return {v:1,selected:"",shops:[]}}
function clean(raw){
 const result=empty(),ids=new Set();
 if(!raw||raw.v!==1||!Array.isArray(raw.shops))return result;
 for(const s of raw.shops.slice(0,80)){
  if(!s||typeof s.id!=="string"||!s.id||ids.has(s.id))continue;
  ids.add(s.id);
  const town=String(s.town||"").trim().slice(0,80),name=String(s.name||"").trim().slice(0,80);
  if(!town||!name)continue;
  const items={};
  if(s.items&&typeof s.items==="object"&&!Array.isArray(s.items)){
   for(const [id,r] of Object.entries(s.items).slice(0,600)){
    if(id.length>240||!r||typeof r!=="object")continue;
    const qty=Number(r.stock),cp=r.cp===null?null:Number(r.cp);
    if(!Number.isSafeInteger(qty)||qty<0||qty>9999)continue;
    if(cp!==null&&(!Number.isSafeInteger(cp)||cp<0||cp>999999999))continue;
    items[id]={stock:qty,cp};
   }
  }
  result.shops.push({id:s.id.slice(0,90),town,name,tier:tiers.includes(s.tier)?s.tier:"town",note:String(s.note||"").slice(0,250),items});
 }
 if(result.shops.some(x=>x.id===raw.selected))result.selected=raw.selected;
 return result;
}
function read(){try{return clean(JSON.parse(localStorage.getItem(KEY)||"null"))}catch(_){return empty()}}
function write(state){const next=clean(state);try{localStorage.setItem(KEY,JSON.stringify(next));return true}catch(_){return false}}
function selected(){const s=read();return s.shops.find(x=>x.id===s.selected)||null}
function all(){return read().shops}
function create({town,name,tier,note=""}){
 const s=read();town=String(town||"").trim();name=String(name||"").trim();
 if(!town||!name)return {ok:false,msg:"請填寫城鎮與店鋪名稱"};
 if(town.length>80||name.length>80||s.shops.length>=80)return {ok:false,msg:"名稱太長或店鋪已達上限"};
 const id="shop-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
 s.shops.push({id,town,name,tier:tiers.includes(tier)?tier:"town",note:String(note||"").slice(0,250),items:{}});
 s.selected=id;
 return write(s)?{ok:true,id}:{ok:false,msg:"瀏覽器無法儲存店鋪資料"};
}
function choose(id){
 const s=read();
 if(id&& !s.shops.some(x=>x.id===id))return false;
 s.selected=id;
 return write(s);
}
function editMeta(id,{town,name,tier,note}){
 const s=read(),shop=s.shops.find(x=>x.id===id);
 if(!shop)return false;
 town=String(town||"").trim();name=String(name||"").trim();
 if(!town||!name||town.length>80||name.length>80)return false;
 Object.assign(shop,{town,name,tier:tiers.includes(tier)?tier:shop.tier,note:String(note||"").slice(0,250)});
 return write(s);
}
function erase(id){
 const s=read(),original=s.shops.length;
 s.shops=s.shops.filter(x=>x.id!==id);
 if(s.shops.length===original)return false;
 if(s.selected===id)s.selected="";
 return write(s);
}
function setItem(shopId,itemId,stock,priceGp,catalog){
 const s=read(),shop=s.shops.find(x=>x.id===shopId);
 if(!shop||!catalog.some(x=>x.id===itemId))return {ok:false,msg:"找不到商品或店鋪"};
 const q=Number(stock);
 if(!Number.isSafeInteger(q)||q<0||q>9999)return {ok:false,msg:"庫存必須是 0 到 9999 的整數"};
 let cp=null;
 if(String(priceGp).trim()!==""){
  const value=Number(priceGp);
  cp=Math.round(value*100);
  if(!Number.isFinite(value)||value<0||value>9999999||!Number.isSafeInteger(cp))return {ok:false,msg:"售價須為有效 GP 數字"};
 }
 shop.items[itemId]={stock:q,cp};
 return write(s)?{ok:true}:{ok:false,msg:"儲存失敗"};
}
function removeItem(shopId,itemId){
 const s=read(),shop=s.shops.find(x=>x.id===shopId);
 if(!shop||!Object.prototype.hasOwnProperty.call(shop.items,itemId))return false;
 delete shop.items[itemId];return write(s);
}
function offer(item,shopOverride){
 const shop=shopOverride===undefined?selected():shopOverride;
 if(!shop)return null;
 const record=shop.items[item.id];
 if(!record)return {listed:false,stock:0,cp:null,available:false,shopId:shop.id,reason:"此店未販售"};
 const cp=record.cp===null?item.cp:record.cp;
 return {listed:true,stock:record.stock,cp,available:record.stock>0&&Number.isFinite(cp),shopId:shop.id,reason:record.stock===0?"已售完":!Number.isFinite(cp)?"需要 DM 先核定售價":"有現貨"};
}
function stockChange(shopId,itemId,delta){
 const state=read(),shop=state.shops.find(x=>x.id===shopId),entry=shop?.items[itemId];
 if(!entry||!Number.isSafeInteger(delta)||entry.stock+delta<0||entry.stock+delta>9999)return false;
 entry.stock+=delta;return write(state);
}
function exportData(){
 const data=read(),blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download="DND5R_自訂城鎮商店.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function importData(raw,catalog){
 const parsed=clean(raw),known=new Set(catalog.map(x=>x.id));
 for(const shop of parsed.shops)for(const id of Object.keys(shop.items))if(!known.has(id))delete shop.items[id];
 if(!raw||raw.v!==1||!Array.isArray(raw.shops))return {ok:false,msg:"檔案不是支援的商店格式"};
 return write(parsed)?{ok:true,count:parsed.shops.length}:{ok:false,msg:"無法儲存匯入資料"};
}
function panel(catalog){
 const state=read(),shop=selected(),market=window.ShopMarket5R;
 const opts='<option value="">通用聚落供貨（原本模式）</option>'+state.shops.map(s=>'<option value="'+e(s.id)+'"'+(state.selected===s.id?" selected":"")+'>'+e(s.town+"｜"+s.name+"（"+(market?.names[s.tier]||s.tier)+"）")+'</option>').join("");
 let result='<section class="ss-panel"><div class="ss-heading"><h3>自訂城鎮商店</h3><button type="button" data-ss-toggle aria-expanded="'+editor+'">'+(editor?"收起店鋪編輯":"編輯店鋪（DM）")+'</button></div><label class="ss-label">目前商店<select id="ssSelect">'+opts+'</select></label>';
 if(shop)result+='<p class="ss-info">'+e(shop.town+"｜"+shop.name)+'　'+e(market?.names[shop.tier]||shop.tier)+' · '+Object.keys(shop.items).length+' 種商品'+(shop.note?" · "+e(shop.note):"")+'</p><p class="ss-info">本店只顯示 DM 已加入的商品；0 件代表售完。價格以店鋪設定為準。</p>';
 else result+='<p class="ss-info">可依聚落規模瀏覽通用商店，或由 DM 建立每座城鎮的店鋪、庫存與售價。</p>';
 if(editor){
  result+='<div class="ss-editor"><p class="ss-info">編輯權限只在此瀏覽器操作，未設帳號或 DM 密碼。店鋪資料儲存在本機瀏覽器，不會自動同步到其他裝置。</p>'+
  '<div class="ss-box"><h4>新增店鋪</h4><div class="ss-grid"><label>城鎮名稱<input id="ssNewTown" maxlength="80" placeholder="例如：帕拉迪姆城"></label><label>店鋪名稱<input id="ssNewName" maxlength="80" placeholder="例如：銀月魔法商會"></label><label>聚落類型<select id="ssNewTier">'+tiers.map(t=>'<option value="'+t+'">'+e(market?.names[t]||t)+'</option>').join("")+'</select></label></div><button type="button" data-ss-create>建立並進入店鋪</button></div>';
  if(shop){
   result+='<div class="ss-box"><h4>修改店鋪</h4><div class="ss-grid"><label>城鎮名稱<input id="ssTown" value="'+e(shop.town)+'" maxlength="80"></label><label>店鋪名稱<input id="ssName" value="'+e(shop.name)+'" maxlength="80"></label><label>聚落類型<select id="ssTier">'+tiers.map(t=>'<option value="'+t+'"'+(shop.tier===t?" selected":"")+'>'+e(market?.names[t]||t)+'</option>').join("")+'</select></label></div><label>店鋪備註<input id="ssNote" maxlength="250" value="'+e(shop.note)+'" placeholder="例如：只接受公會會員購物"></label><div class="ss-actions"><button data-ss-meta>儲存店鋪設定</button><button data-ss-delete class="ss-danger">刪除店鋪</button></div></div>';
   result+='<div class="ss-box"><h4>加入或修改商品</h4><label class="ss-label">搜尋商品<input id="ssSearch" type="search" placeholder="可搜尋中英文名稱、武器、工具、藥水等"></label><label class="ss-label">選擇商品<select id="ssProducts"></select></label><div class="ss-grid"><label>庫存數量<input id="ssStock" inputmode="numeric" type="number" min="0" max="9999" step="1" value="1"></label><label>售價 GP（留空使用參考價）<input id="ssPrice" inputmode="decimal" type="number" min="0" max="9999999" step="0.01" placeholder="使用規則參考價"></label></div><button type="button" data-ss-item>加入／更新商品</button>';
   const items=Object.entries(shop.items);
   result+='<div class="ss-inventory"><h4>此店的商品（'+items.length+'）</h4>';
   for(const [id,entry] of items.slice(0,500)){
    const good=catalog.find(x=>x.id===id),label=good?.n||id;
    result+='<div class="ss-stock-row"><div class="ss-stock-name"><b>'+e(label)+'</b><small>庫存 '+entry.stock+' · '+(entry.cp===null?"依參考價":(entry.cp/100).toLocaleString("en-US")+" GP")+'</small></div><button type="button" data-ss-pick="'+e(id)+'">調整</button><button type="button" class="ss-danger" data-ss-remove="'+e(id)+'">移除</button></div>';
   }
   result+='</div></div>';
  }
  result+='<div class="ss-actions"><button type="button" data-ss-export>匯出商店 JSON</button><button type="button" data-ss-import>匯入商店 JSON</button><input type="file" id="ssImportFile" accept=".json,application/json" hidden></div></div>';
 }
 result+='</section>';
 return result;
}
function bind(root,catalog,refresh){
 const q=id=>root.querySelector("#"+id),toastIt=msg=>{if(typeof toast==="function")toast(msg)};
 const chooseShop=q("ssSelect");
 if(chooseShop)chooseShop.onchange=()=>{if(choose(chooseShop.value))refresh();else toastIt("無法儲存目前商店")};
 const toggle=root.querySelector("[data-ss-toggle]");
 if(toggle)toggle.onclick=()=>{editor=!editor;refresh()};
 const createButton=root.querySelector("[data-ss-create]");
 if(createButton)createButton.onclick=()=>{const r=create({town:q("ssNewTown").value,name:q("ssNewName").value,tier:q("ssNewTier").value});if(!r.ok)toastIt(r.msg);else refresh()};
 const meta=root.querySelector("[data-ss-meta]");
 if(meta)meta.onclick=()=>{const id=selected()?.id;if(!id)return;if(editMeta(id,{town:q("ssTown").value,name:q("ssName").value,tier:q("ssTier").value,note:q("ssNote").value}))refresh();else toastIt("請填寫有效店鋪名稱")};
 const del=root.querySelector("[data-ss-delete]");
 if(del)del.onclick=()=>{const s=selected();if(s&&confirm("確定刪除商店「"+s.town+"｜"+s.name+"」？\n已售出的角色物品不會刪除。")){if(erase(s.id))refresh();else toastIt("刪除失敗")}};
 const search=q("ssSearch"),products=q("ssProducts"),stock=q("ssStock"),price=q("ssPrice");
 if(search&&products){
  const fill=(preferred)=>{
   const term=search.value.trim().toLowerCase();
   const filtered=catalog.filter(x=>(x.n+" "+(x.en||"")+" "+x.cat).toLowerCase().includes(term)).slice(0,60);
   products.innerHTML=filtered.map(x=>'<option value="'+e(x.id)+'">'+e(x.n+" · "+x.cat+(Number.isFinite(x.cp)?" · "+(x.cp/100)+" GP":" · DM 核價"))+'</option>').join("");
   if(preferred&&filtered.some(x=>x.id===preferred))products.value=preferred;
  };
  fill();search.oninput=()=>fill();
  const itemButton=root.querySelector("[data-ss-item]");
  if(itemButton)itemButton.onclick=()=>{const shop=selected();if(!shop||!products.value)return toastIt("請選擇商品");const r=setItem(shop.id,products.value,stock.value,price.value,catalog);if(r.ok)refresh();else toastIt(r.msg)};
  root.querySelectorAll("[data-ss-pick]").forEach(b=>b.onclick=()=>{
   const shop=selected(),id=b.dataset.ssPick,rec=shop?.items[id],item=catalog.find(x=>x.id===id);
   if(!item||!rec)return;
   search.value=item.n;fill(id);products.value=id;stock.value=rec.stock;price.value=rec.cp===null?"":String(rec.cp/100);
   search.scrollIntoView({behavior:"auto",block:"center"});search.focus();
  });
  root.querySelectorAll("[data-ss-remove]").forEach(b=>b.onclick=()=>{
   const shop=selected();if(shop&&confirm("確定從「"+shop.name+"」移除此商品？")&&removeItem(shop.id,b.dataset.ssRemove))refresh();
  });
 }
 const exp=root.querySelector("[data-ss-export]");if(exp)exp.onclick=exportData;
 const imp=root.querySelector("[data-ss-import]"),file=q("ssImportFile");if(imp&&file)imp.onclick=()=>file.click();
 if(file)file.onchange=async()=>{
  const f=file.files?.[0];file.value="";if(!f)return;
  if(f.size>1024*1024)return toastIt("商店檔超過 1MB");
  try{const raw=JSON.parse(await f.text());if(!confirm("確定使用匯入檔取代本機所有自訂店鋪？\n建議先匯出備份。"))return;const r=importData(raw,catalog);if(r.ok)refresh();else toastIt(r.msg)}catch(_){toastIt("JSON 格式無法讀取")}
 };
}
window.ShopStores5R=Object.freeze({read,clean,all,selected,create,choose,editMeta,erase,setItem,removeItem,offer,stockChange,panel,bind,importData,exportData});
const css=".ss-panel{margin:12px 0;padding:12px;border:1px solid var(--line-soft);background:rgba(250,245,232,.55);min-width:0}.ss-panel h3,.ss-panel h4{margin:0;font-size:16px}.ss-heading,.ss-actions{display:flex;justify-content:space-between;align-items:center;gap:9px;flex-wrap:wrap}.ss-panel button{cursor:pointer;min-height:40px;padding:8px 12px;border-radius:4px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:14px}.ss-panel button:focus-visible,.ss-panel input:focus-visible,.ss-panel select:focus-visible{outline:2px solid #9d4538;outline-offset:2px}.ss-label{display:block;margin:9px 0;font-weight:600}.ss-panel input:not([type=file]),.ss-panel select{display:block;box-sizing:border-box;width:100%;max-width:100%;min-height:42px;margin-top:5px;padding:8px 10px;border:1px solid var(--line);border-radius:3px;background:#fff9ed;color:#30251e;font:15px/1.4 'PingFang TC','Microsoft JhengHei',sans-serif}.ss-panel select{white-space:normal}.ss-info{font:14px/1.65 'PingFang TC','Microsoft JhengHei',sans-serif;color:#49382c;margin:8px 0}.ss-editor{display:grid;gap:12px;margin-top:14px}.ss-box{padding:12px;border:1px solid var(--line-soft);min-width:0}.ss-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:8px 0}.ss-grid label{min-width:0;font:14px/1.55 'PingFang TC','Microsoft JhengHei',sans-serif}.ss-panel .ss-danger{color:#842b25;background:#fff1e7}.ss-inventory{margin-top:12px}.ss-stock-row{display:flex;gap:7px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line-soft)}.ss-stock-name{min-width:0;flex:1;overflow-wrap:anywhere}.ss-stock-name small{display:block;color:#594a3d;font-size:12px}.ss-panel button{white-space:normal}.ss-shop-stock{font-size:12px;color:#624a36;line-height:1.5}@media(max-width:520px){.ss-grid{grid-template-columns:1fr}.ss-heading{align-items:stretch}.ss-panel button{min-height:44px}.ss-stock-row{flex-wrap:wrap}.ss-stock-name{flex-basis:100%}}";
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
})();
/* Optional character-local trading log and special orders; no duplicate catalog or checkout. */
(function(){
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const array=(x,max)=>Array.isArray(x)?x.slice(-max):[];
const orders=s=>array(s?.gear?.shopOrders,200).filter(x=>x&&typeof x.itemId==="string"&&["pending","fulfilled","cancelled"].includes(x.status));
const history=s=>array(s?.gear?.shopHistory,500).filter(x=>x&&typeof x.itemId==="string"&&["buy","refund"].includes(x.type)&&Number.isSafeInteger(x.cp)&&x.cp>=0);
const coin=cp=>Number.isSafeInteger(cp)?(cp/100).toLocaleString("zh-TW",{maximumFractionDigits:2})+" gp":"DM 核價";
function request(s,item,shopId){
 if(!s?.gear||!item?.id)return {ok:false,message:"找不到角色或商品"};
 const pending=orders(s).find(x=>x.itemId===item.id&&(x.shopId||null)===(shopId||null)&&x.status==="pending");
 if(pending)return {ok:false,message:"此商品已有待處理的特殊訂貨"};
 if(orders(s).filter(x=>x.status==="pending").length>=80)return {ok:false,message:"待處理訂貨已達上限"};
 const order={orderId:"ord-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8),itemId:item.id,shopId:shopId||null,quantity:1,status:"pending",quoteCp:Number.isSafeInteger(item.cp)&&item.cp>=0?item.cp:null,createdAt:new Date().toISOString()};
 s.gear.shopOrders=[...orders(s),order].slice(-200);
 return {ok:true,message:"已提出特殊訂貨；尚未扣款、占用庫存或取得物品"};
}
function cancel(s,orderId){
 const list=orders(s),row=list.find(x=>x.orderId===orderId&&x.status==="pending");
 if(!row||!s?.gear)return false;
 row.status="cancelled";s.gear.shopOrders=list;return true;
}
function fulfil(s,itemId,shopId){
 const list=orders(s),row=list.find(x=>x.itemId===itemId&&(x.shopId||null)===(shopId||null)&&x.status==="pending");
 if(!row||!s?.gear)return false;
 row.status="fulfilled";row.fulfilledAt=new Date().toISOString();s.gear.shopOrders=list;return true;
}
function record(s,type,{itemId,cp,shopId=null,label=""}){
 if(!s?.gear||!["buy","refund"].includes(type)||typeof itemId!=="string"||!Number.isSafeInteger(cp)||cp<0)return false;
 s.gear.shopHistory=[...history(s),{type,itemId,cp,shopId:shopId||null,label:String(label).slice(0,150),at:new Date().toISOString()}].slice(-500);
 return true;
}
function orderHTML(s,catalog,shop){
 const entries=orders(s),look=new Map(catalog.map(x=>[x.id,x])),active=entries.filter(x=>x.status==="pending");
 return '<section class="shop-trading"><h3>特殊訂貨（'+active.length+' 筆待處理）</h3><p>可請 DM 協助找貨或補貨。提出訂貨不會扣款、不保留庫存，也不會把物品放進角色背包；DM 確認有貨後，仍須使用原本的「購買」。紀錄只存於此角色的本機存檔。</p>'+
 (entries.length?'<div class="shop-trading-list">'+entries.slice(-25).reverse().map(x=>'<div class="shop-trading-row"><span><b>'+esc(look.get(x.itemId)?.n||x.itemId)+'</b> · '+esc(x.status==="pending"?"待 DM 處理":x.status==="fulfilled"?"已購得":"已取消")+' · '+esc(x.shopId||"通用市場")+(x.status==="pending"?' · 參考 '+esc(coin(x.quoteCp)):"")+'</span>'+(x.status==="pending"?'<button type="button" data-shop-cancel="'+esc(x.orderId)+'">取消訂貨</button>':"")+'</div>').join("")+'</div>':'<p>沒有特殊訂貨紀錄。</p>')+'</section>';
}
function historyHTML(s,catalog){
 const entries=history(s),look=new Map(catalog.map(x=>[x.id,x]));
 return '<details class="shop-trading"><summary>成交與退款歷程（'+entries.length+' 筆）</summary><p>此歷程是角色存檔中的購物紀錄；以前版本的交易未必有完整時間資料，原成交價退款仍由既有收據資料處理。</p>'+
 (entries.length?'<div class="shop-trading-list">'+entries.slice(-30).reverse().map(x=>'<div class="shop-trading-row"><span>'+esc(x.type==="buy"?"購買":"退款")+' · '+esc(x.label||look.get(x.itemId)?.n||x.itemId)+' · '+esc(coin(x.cp))+' · '+esc(x.shopId||"通用市場")+' · '+esc((x.at||"").slice(0,16).replace("T"," "))+'</span></div>').join("")+'</div>':'<p>目前沒有新格式的交易紀錄。</p>')+'</details>';
}
window.ShopTrading5R=Object.freeze({orders,history,request,cancel,fulfil,record,orderHTML,historyHTML});
const css=".shop-trading{margin:12px 0;padding:12px;border:1px solid var(--line-soft);background:rgba(255,248,232,.45);font-family:var(--sans);min-width:0}.shop-trading h3{font-size:16px;margin:0 0 8px}.shop-trading>p{font-size:14px;line-height:1.7;color:var(--text)}.shop-trading summary{cursor:pointer;font-weight:700}.shop-trading-row{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:9px 0;border-top:1px solid var(--line-soft);font-size:14px;line-height:1.6;overflow-wrap:anywhere}.shop-trading-row span{flex:1;min-width:160px}.shop-trading-row button,.shop-order-btn{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--text);border-radius:4px;padding:8px 12px;min-height:42px}.shop-trading-list{max-height:380px;overflow:auto}";
const style=document.createElement("style");style.textContent=css;document.head.appendChild(style);
})();

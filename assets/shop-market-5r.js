/* Market suggestions for D&D 2024. Inventory and prices ultimately belong to the DM. */
(function(){
"use strict";
const tiers={village:1,town:2,city:3,metropolis:4,special:5};
const names={village:"村莊",town:"城鎮",city:"城市",metropolis:"大城市",special:"特殊市場（DM）"};
const rarity={common:"普通",uncommon:"非普通",rare:"稀有","very rare":"極珍稀",legendary:"傳說",artifact:"神器"};
const gp={common:100,uncommon:400,rare:4000,"very rare":40000,legendary:200000};
const minMagic={common:2,uncommon:3,rare:3,"very rare":5,legendary:5,artifact:99};
const extra=[
 ["酸液（瓶）",2500,"冒險用品",2],["鍊金火",5000,"冒險用品",3],["解毒劑",5000,"冒險用品",3],
 ["玻璃瓶",200,"冒險用品",1],["籃子",40,"冒險用品",1],["鈴鐺",100,"冒險用品",1],
 ["登山套組",2500,"冒險用品",2],["外交官套組",3900,"冒險用品",3],
 ["地城探索者套組",1200,"冒險用品",2],["藝人套組",4000,"冒險用品",3],
 ["探索套組",1000,"冒險用品",2],["學者套組",4000,"冒險用品",3],
 ["牧師套組",3300,"冒險用品",3],["攀鉤",200,"冒險用品",1],["狩獵陷阱",500,"冒險用品",2],
 ["墨水",1000,"冒險用品",2],["羽毛筆",2,"冒險用品",1],["梯子",10,"冒險用品",1],
 ["鎖",1000,"冒險用品",2],["地圖",100,"冒險用品",2],["鏡子",500,"冒險用品",2],
 ["網",100,"冒險用品",2],["紙張",20,"冒險用品",2],["羊皮紙",10,"冒險用品",2],
 ["香水",500,"冒險用品",3],["普通毒藥",10000,"冒險用品",3],["哨子",5,"冒險用品",1],
 ["鐵鍋",200,"冒險用品",1],["便攜式攻城槌",400,"冒險用品",3],
 ["鐵鏟",200,"冒險用品",1],["望遠鏡",100000,"冒險用品",4],
 ["駱駝",5000,"坐騎與交通",3],["大象",20000,"坐騎與交通",4],
 ["役馬",5000,"坐騎與交通",2],["乘用馬",7500,"坐騎與交通",2],
 ["獒犬",2500,"坐騎與交通",2],["騾",800,"坐騎與交通",2],
 ["矮種馬",3000,"坐騎與交通",2],["戰馬",40000,"坐騎與交通",4],
 ["馬車",10000,"坐騎與交通",3],["手推車",1500,"坐騎與交通",2],
 ["戰車",25000,"坐騎與交通",4],["每日飼料",5,"坐騎與交通",1],
 ["異種鞍座",6000,"坐騎與交通",4],["軍用鞍座",2000,"坐騎與交通",3],
 ["騎乘鞍座",1000,"坐騎與交通",2],["雪橇",3000,"坐騎與交通",2],
 ["每日馬廄寄養",50,"坐騎與交通",2],["貨車",3500,"坐騎與交通",3]
];
const extraGear=()=>extra.map(([n,cp,cat,minTier])=>({id:"mkt:"+n,n,cp,cat,minTier,marketKind:"regular",note:"2024 裝備參考價"}));
function quote(x){
 if(x.rarity==="artifact")return {cp:null,label:"無價神器",reason:"神器不進入一般交易"};
 const base=gp[x.rarity];
 if(!base)return {cp:null,label:"DM 核價",reason:"無固定稀有度價"};
 if(x.type==="SC")return {cp:null,label:"依法術卷軸等級核價",reason:"卷軸不適用消耗品稀有度半價"};
 const price=base*(x.type==="P"?0.5:1);
 if(x.baseItem)return {cp:null,label:price.toLocaleString("en-US")+" gp＋基底裝備價",reason:"需由 DM 確認基底物品價格"};
 return {cp:price*100,label:price.toLocaleString("en-US")+" gp",reason:"稀有度參考價"+(x.type==="P"?" · 消耗品半價":"")};
}
function magic(){
 return (window.ZIZI_5R_MAGIC_ITEMS||[]).map(x=>{
  const z=window.ZIZI_5R_MAGIC_ITEMS_ZH?.[x.id]||{},p=quote(x);
  return {id:"magic:"+x.id,magicId:x.id,en:x.name,n:(z.nameZh||x.name)+"｜"+x.name,
   cp:p.cp,priceLabel:p.label,cat:"魔法物品",marketKind:"magic",minimum:minMagic[x.rarity]??99,
   note:(rarity[x.rarity]||x.rarity)+" · "+(x.attunement?"需要同調":"不需同調")+" · "+p.reason};
 });
}
function availability(x,tier){
 const rank=tiers[tier]||tiers.town;
 if(x.marketKind==="magic")return {available:rank>=x.minimum,priced:Number.isFinite(x.cp),reason:x.minimum>=99?"神器無法購買":rank<x.minimum?"此聚落通常無法購得":"須經 DM 核准"};
 const min=x.minTier||(x.cat==="武器"?(["火槍","手槍"].includes(x.n)?4:1):x.cat==="護甲"?(x.cp>=20000?3:1):x.cat==="工具"?(x.cp>=3000?2:1):x.cp>=5000?2:1);
 return {available:rank>=min,priced:Number.isFinite(x.cp),reason:rank<min?"建議無現貨":"可詢問 DM"};
}
window.ShopMarket5R=Object.freeze({tiers,names,rarity,extraGear,magic,quote,availability});
const style=document.createElement("style");
style.textContent=".shop-settlement{padding:10px 12px;border:1px solid var(--line-soft);margin:10px 0;background:rgba(255,255,255,.13)}.shop-settlement h3{font-size:14px;margin:0 0 8px}.shop-settlement .settlement-buttons{display:flex;flex-wrap:wrap;gap:6px}.shop-settlement button{border:1px solid var(--line);background:var(--panel);color:var(--text);padding:7px 12px;min-height:40px;border-radius:4px}.shop-settlement button.active{background:var(--red);color:#fff}.shop-settlement label,.shop-settlement p,.shop-result-count{font:12px/1.65 var(--sans);color:var(--muted)}.shop-market-price{font-weight:700;margin:5px 0}.shop-market-detail{min-height:38px;margin-top:6px}@media(max-width:520px){.shop-settlement .settlement-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.shop-settlement button{min-height:44px}}";
document.head.appendChild(style);
})();
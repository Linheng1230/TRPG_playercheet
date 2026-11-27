/* DM Screen loot tools: independent implementation informed by 5etools MIT source.
   Commercial rule tables are not bundled. No network, actor mutation or automatic rolls. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.DMScreenLoot=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const tiers=["0–4","5–10","11–16","17+"],levels=[[1,4],[5,10],[11,16],[17,20]];
const rarities=["common","uncommon","rare","very rare","legendary"],labels=["普通","非普通","稀有","極稀有","傳說"];
const currencies=["cp","sp","ep","gp","pp"],rates=[1,10,50,100,1000];
const modes=["tier","cumulative","exact-tier","exact-cumulative"];
const customQuota=[[2,1,0,0,0],[3,4,1,0,0],[2,3,3,1,0],[0,1,2,3,1]];
const customGold={individual:["2d6","3d6*5","4d6*20","6d6*50"],hoard:["2d6*10","4d6*25","5d6*100","6d6*500"]};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const check=(yes,msg)=>{if(!yes)throw Error(msg)};
const obj=x=>x&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const keys=(x,list)=>obj(x)&&Object.keys(x).length===list.length&&list.every(k=>own(x,k));
const formula=s=>{check(typeof s==="string"&&s.length<=40,"骰式無效");const m=s.replace(/\s/g,"").match(/^(?:(\d{1,3})d(\d{1,4})|(\d{1,7}))(?:\*(\d{1,5}))?(?:([+-])(\d{1,7}))?$/i);check(m,"骰式僅支援 N、NdS、乘數及加減常數");const n=m[1]?+m[1]:0,side=m[2]?+m[2]:0,base=m[3]?+m[3]:0,mul=m[4]?+m[4]:1,offset=(m[5]==="-"?-1:1)*(m[6]?+m[6]:0);check(n<=100&&side<=1000&&(!m[1]||(n>=1&&side>=2))&&mul>=1&&Math.max(0,(n*side+base)*mul+offset)<=1e7,"骰式超出上限");return {n,side,base,mul,offset}};
const die=(s,rng)=>{const x=rng();check(Number.isFinite(x)&&x>=0&&x<1,"隨機來源無效");return 1+Math.floor(x*s)};
function roll(s,rng=Math.random){const f=formula(s);let v=f.base;for(let i=0;i<f.n;i++)v+=die(f.side,rng);return Math.max(0,v*f.mul+f.offset)}
function initial(type){return type==="find-loot"?{tier:0,kind:"individual",times:1,coins:["0","0","0","2d6","0"],counts:["0","0","0","0","0"],valuables:["0","0","0","0"],mode:"custom",selection:"slots",result:null}:{level:5,size:4,scope:"tier",quota:customQuota.map(x=>x.slice()),selection:"slots",result:null}}
const validateVector=(v,len,fn)=>Array.isArray(v)&&v.length===len&&v.every(fn);
const validFormula=x=>{try{formula(x);return true}catch{return false}};
function validateResult(r){if(r===null)return;check(keys(r,["source","summary","coins","items","dice","counts","valuables"]),"戰利品結果格式錯誤");check(["custom","local-table","manual-quota"].includes(r.source)&&typeof r.summary==="string"&&r.summary.length<=180,"戰利品來源無效");check(validateVector(r.coins,5,x=>integer(x,0,1000000000))&&validateVector(r.counts,5,x=>integer(x,0,200)),"戰利品數值無效");check(validateVector(r.valuables,2,x=>keys(x,["qty","gp"])&&integer(x.qty,0,1000000)&&integer(x.gp,0,1000000000)),"寶石藝術品數值錯誤");check(Array.isArray(r.dice)&&r.dice.length<=20&&r.dice.every(x=>integer(x,1,100)),"戰利品骰值無效");check(Array.isArray(r.items)&&r.items.length<=200&&r.items.every(x=>keys(x,["rarity","id","name"])&&rarities.includes(x.rarity)&&typeof x.id==="string"&&x.id.length<=200&&typeof x.name==="string"&&x.name.length<=160),"戰利品物品格式錯誤");const counts=rarities.map(k=>r.items.filter(x=>x.rarity===k).length);check(counts.every((n,i)=>n===r.counts[i]),"戰利品數量不一致")}
function validate(type,c){check(type==="find-loot"||type==="party-loot","未知戰利品類型");if(type==="find-loot"){
 check(keys(c,["tier","kind","times","coins","counts","valuables","mode","selection","result"]),"尋找戰利品設定錯誤");
 check(integer(c.tier,0,3)&&["individual","hoard"].includes(c.kind)&&integer(c.times,1,20)&&["custom","local-table"].includes(c.mode),"尋找戰利品選項錯誤");
 check(validateVector(c.coins,5,validFormula)&&validateVector(c.counts,5,validFormula)&&validateVector(c.valuables,4,validFormula),"戰利品骰式錯誤");
}else{
 check(keys(c,["level","size","scope","quota","selection","result"]),"隊伍戰利品設定錯誤");
 check(integer(c.level,1,20)&&integer(c.size,1,12)&&modes.includes(c.scope)&&validateVector(c.quota,4,row=>validateVector(row,5,x=>integer(x,0,40))),"隊伍配額錯誤");
}
check(["slots","catalog"].includes(c.selection),"物品選擇方式錯誤");validateResult(c.result);return c}
function preset(tier,kind){check(integer(tier,0,3)&&["individual","hoard"].includes(kind),"CR 選項無效");const counts=["0","0","0","0","0"];if(kind==="hoard"){counts[Math.min(tier,3)]="1d2";if(tier>0)counts[tier-1]="1d2"}return {coins:["0","0","0",customGold[kind][tier],"0"],counts,valuables:kind==="hoard"?["1d4",String(10*(tier+1)),"1d2",String(25*(tier+1))]:["0","0","0","0"]}}
function partyCounts(c){validate("party-loot",c);const ix=levels.findIndex(([a,b])=>c.level>=a&&c.level<=b);const exact=c.scope.startsWith("exact"),cumulative=c.scope.endsWith("cumulative");const [a,b]=levels[ix],fraction=exact?(c.level-a+1)/(b-a+1):1;return rarities.map((_,i)=>(cumulative?c.quota.slice(0,ix).reduce((s,row)=>s+row[i],0):0)+Math.floor(c.quota[ix][i]*fraction))}
function compileLocal(input,edition){check(obj(input)&&input.edition===edition&&["2014","2024"].includes(edition),"本機表規則版本不符");check(Object.keys(input).every(k=>["edition","treasure","party"].includes(k)),"本機表含未知欄位");const out={treasure:{},party:null};if(own(input,"treasure")){check(obj(input.treasure),"本機財寶表格式錯誤");for(const [key,rows] of Object.entries(input.treasure)){check(/^[0-3]:(individual|hoard)$/.test(key)&&Array.isArray(rows)&&rows.length<=100,"本機財寶表名稱或列數無效");const faces=Array(100).fill(null);for(const row of rows){check((keys(row,["min","max","coins","counts"])||keys(row,["min","max","coins","counts","valuables"]))&&integer(row.min,1,100)&&integer(row.max,row.min,100)&&validateVector(row.coins,5,validFormula)&&validateVector(row.counts,5,validFormula)&&(!own(row,"valuables")||validateVector(row.valuables,4,validFormula)),"財寶表列無效");for(let i=row.min-1;i<row.max;i++){check(!faces[i],"財寶表骰值重疊");faces[i]={coins:row.coins.slice(),counts:row.counts.slice(),valuables:(row.valuables||["0","0","0","0"]).slice()}}}check(faces.every(Boolean),"財寶表未完整覆蓋 1–100");out.treasure[key]=faces}}
if(own(input,"party")){check(validateVector(input.party,4,row=>validateVector(row,5,x=>integer(x,0,40))),"本機隊伍配額無效");out.party=input.party.map(row=>row.slice())}check(Object.keys(out.treasure).length||out.party,"沒有可用的本機表");return out}
function catalogFor(edition,items,translations){if(edition!=="2024")return [];return (Array.isArray(items)?items:[]).filter(x=>x&&rarities.includes(x.rarity)&&typeof x.id==="string"&&typeof x.name==="string").map(x=>({id:x.id,rarity:x.rarity,name:(translations?.[x.id]?.nameZh||x.name).slice(0,160)}))}
function generate(type,c,edition,catalog,local,rng=Math.random){validate(type,c);check(["2014","2024"].includes(edition),"規則版本無效");const coins=Array(5).fill(0),counts=Array(5).fill(0),dice=[],valuables=[{qty:0,gp:0},{qty:0,gp:0}];let source,summary;
if(type==="find-loot"){source=c.mode==="local-table"?"local-table":"custom";summary="CR "+tiers[c.tier]+" "+(c.kind==="hoard"?"寶庫":"個別財寶")+" × "+c.times;const faces=local?.treasure?.[c.tier+":"+c.kind];if(c.mode==="local-table")check(faces?.length===100,"請先載入此 CR／類型的本機表");for(let i=0;i<c.times;i++){let row=c;if(c.mode==="local-table"){const d=die(100,rng);dice.push(d);row=faces[d-1]}row.coins.forEach((f,j)=>coins[j]+=roll(f,rng));row.counts.forEach((f,j)=>counts[j]+=roll(f,rng));for(let j=0;j<2;j++){const qty=roll(row.valuables[j*2],rng);const unit=roll(row.valuables[j*2+1],rng);valuables[j].qty+=qty;valuables[j].gp+=qty*unit}}}else{source="manual-quota";summary="Lv"+c.level+" / "+c.size+" 人 / "+({"tier":"本等級區間","cumulative":"累積至此區間","exact-tier":"本區間按等級進度","exact-cumulative":"累積至指定等級"}[c.scope]);partyCounts(c).forEach((n,i)=>counts[i]=n)}
check(counts.every(n=>integer(n,0,200))&&counts.reduce((a,b)=>a+b,0)<=200,"單次最多 200 件物品，請縮小配額");const items=[];
for(let i=0;i<5;i++){const pool=c.selection==="catalog"?catalog.filter(x=>x.rarity===rarities[i]):[];if(c.selection==="catalog"&&counts[i])check(edition==="2024"&&pool.length>0,"此規則版本或稀有度沒有可用物品資料，請改用名額");for(let j=0;j<counts[i];j++)items.push(pool.length?{...pool[die(pool.length,rng)-1]}:{rarity:rarities[i],id:"",name:labels[i]+"魔法物品（DM 選定）"})}
const r={source,summary,coins,items,dice,counts,valuables};validateResult(r);return r}
function totalGp(coins){return coins.reduce((n,v,i)=>n+v*rates[i],0)/100}
return Object.freeze({tiers,levels,rarities,labels,currencies,modes,initial,validate,formula,roll,preset,partyCounts,compileLocal,catalogFor,generate,totalGp});
});

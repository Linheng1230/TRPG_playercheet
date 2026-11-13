/* Mobile session ledger UI: standalone, no character rules duplicated. */
(function(){
"use strict";
const L=globalThis.DND5RSessionLedger;
const $=id=>document.getElementById(id);
const KEY="dnd5r-session-ledger-v1:";
const LAST="dnd5r:session-last:";
let current=null,linkedId=null;
const C=globalThis.DND5RCharacterSync;
function linked(){return linkedId?C.read(localStorage,linkedId):null}
function linkedRender(){if(!linkedId)return;const d=linked();$("quickMax").value=d.play.hpMax||20;$("quickHp").textContent=d.play.hp??d.play.hpMax??20;$("quickTemp").textContent=d.play.thp||0;$("canonicalInfo").textContent=(d.meta?.name||linkedId)+"｜"+(d.cls||"")+" Lv."+(d.level||1)+"｜已連接本機角色存檔";
const active=Boolean(current&&current.characterId===linkedId),locked=Boolean(current?.settlement&&current.settlement.status!=="draft");$("canonicalCounters").hidden=!active;
const slots=$("canonicalSlots"),res=$("canonicalClassResources");slots.replaceChildren();res.replaceChildren();if(!active)return;
function counter(parent,label,kind,key,used){const line=document.createElement('div');line.className='actions';const title=document.createElement('span');title.textContent=label+'｜已使用 '+used;title.style.flex='2 1 130px';line.appendChild(title);
for(const delta of [1,-1]){const b=document.createElement('button');b.textContent=delta>0?'消耗 ＋1':'恢復 −1';b.className='secondary';b.disabled=locked||(delta<0&&used===0);b.onclick=()=>run(()=>{if(!current||current.characterId!==linkedId||current.settlement&&current.settlement.status!=="draft")throw Error('場次未開啟或已鎖定');const value=Math.max(0,used+delta);const change=kind==='slot'?{kind,key,used:value}:{kind,key,used:value};C.update(localStorage,linkedId,change);quickEvent({kind,key,delta},label+(delta>0?'消耗':'恢復')+'一次','resource_change');});line.appendChild(b)}parent.appendChild(line)}
Object.entries(d.sessionResourceLimits?.slots||{}).filter(([k,v])=>/^(l[1-9]|pact)$/.test(k)&&Number.isInteger(v)&&v>0).forEach(([k,max])=>counter(slots,(k==='pact'?'契約魔法':k.slice(1)+' 環法術位')+'（上限 '+max+'）','slot',k,d.slotsUsed?.[k]||0));
Object.entries(d.sessionResourceLimits?.classes||{}).filter(([k,v])=>/^[a-zA-Z0-9_-]{1,50}$/.test(k)&&Number.isInteger(v?.max)&&v.max>0).forEach(([k,v])=>counter(res,(v.label||k)+'（上限 '+v.max+'）','resource',k,d.play.res?.[k]||0));
}
$("loadCanonical").addEventListener("click",()=>run(()=>{const id=$("canonicalId").value.trim();const d=C.read(localStorage,id);linkedId=id;$("characterId").value=id;linkedRender();notify("已連接："+(d.meta?.name||id));}));
addEventListener("storage",e=>{if(linkedId&&e.key===C.PREFIX+linkedId)run(()=>linkedRender())});
const queryId=new URLSearchParams(location.search).get('character')||localStorage.getItem('dnd5r:current');
if(queryId&&C.validId(queryId)){try{const d=C.read(localStorage,queryId);linkedId=queryId;$("canonicalId").value=queryId;$("characterId").value=queryId;linkedRender();notify('已自動連接：'+(d.meta?.name||queryId));
const last=JSON.parse(localStorage.getItem(LAST+queryId)||'null');
if(last&&typeof last.sessionId==='string'&&['free','al'].includes(last.mode)){$('sessionId').value=last.sessionId;$('mode').value=last.mode;const test=L.create({characterId:queryId,sessionId:last.sessionId,mode:last.mode});const raw=localStorage.getItem(key(test));if(raw){current=L.importJSON(raw);render();}}
}catch(err){notify('尚未找到可用的角色／場次存檔：'+err.message,true)}}
function notify(message,error=false){$("status").textContent=message;$("status").setAttribute("role",error?"alert":"status")}
function key(doc){return KEY+doc.mode+":"+doc.characterId+":"+doc.sessionId}
function save(doc){L.validate(doc);localStorage.setItem(key(doc),L.exportJSON(doc));current=doc;render()}
function render(){
$("workspace").hidden=!current;if(!current)return;
$("sessionInfo").textContent=current.characterId+"｜"+current.sessionId+"｜"+(current.mode==="al"?"AL（未驗證）":"自由跨團");
const ol=$("events");ol.replaceChildren();
for(const event of current.events){const li=document.createElement("li");li.textContent=event.createdAt.slice(0,16).replace("T"," ")+"｜"+event.type+"｜"+String(event.payload.description||"");ol.appendChild(li)}
$("review").value=current.settlement?.status||"draft";
const locked=Boolean(current.settlement&&current.settlement.status!=="draft");
$("add").disabled=locked;$("settle").disabled=Boolean(current.settlement);
const maxEvent=current.events.filter(e=>e.payload.quick?.kind==="max").at(-1);
const max=maxEvent?maxEvent.payload.quick.value:20;
$("quickMax").value=max;
let hp=max,temp=0;const resources=new Map();
for(const e of current.events){const q=e.payload.quick;if(!q)continue;
if(q.kind==="max")hp=Math.min(hp,q.value);
if(q.kind==="hp")hp=Math.max(0,Math.min(max,hp+q.delta));
if(q.kind==="temp")temp=Math.max(0,temp+q.delta);
if(q.kind==="resource"&&q.name)resources.set(q.name,(resources.get(q.name)||0)+q.delta);
}
$("quickHp").textContent=hp;$("quickTemp").textContent=temp;
$("quickResources").textContent=[...resources].map(([name,n])=>name+"："+n+" 次變動淨額").join("｜")||"尚無資源變動";
document.querySelectorAll("[data-quick]").forEach(b=>b.disabled=locked);$("quickMax").disabled=locked;
if(linkedId&&current.characterId===linkedId){linkedRender();$("quickMax").disabled=true;}
}
function run(fn){try{fn()}catch(e){notify("操作失敗："+e.message,true)}}
$("open").addEventListener("click",()=>run(()=>{
const characterId=$("characterId").value.trim(),sessionId=$("sessionId").value.trim(),mode=$("mode").value;
const blank=L.create({characterId,sessionId,mode});
const raw=localStorage.getItem(key(blank));current=raw?L.importJSON(raw):blank;
if(linkedId&&linkedId!==characterId)linkedId=null;
localStorage.setItem(LAST+characterId,JSON.stringify({sessionId,mode}));
render();notify(raw?"已開啟本機紀錄":"已建立場次；新增事件後會自動儲存");
}));
$("newSession").addEventListener("click",()=>{if(linkedId)localStorage.removeItem(LAST+linkedId);current=null;render();$("sessionId").value="";notify("已清空畫面；既有紀錄仍保留在本機")});
function quickEvent(quick,description,type){
if(!current)throw Error("請先開啟場次");
const event={eventId:crypto.randomUUID().replaceAll("-",""),characterId:current.characterId,sessionId:current.sessionId,createdAt:new Date().toISOString(),type,payload:{description,quick}};
save(L.add(current,event));notify(linkedId?"已寫入正式角色存檔並記錄事件":"已記錄本機變動；尚未連接正式角色卡");
}
$("quickMax").addEventListener("change",()=>run(()=>{
const value=Number($("quickMax").value);if(!Number.isInteger(value)||value<1||value>999)throw Error("生命值上限須為 1～999");
if(linkedId)throw Error("生命值上限由正式角色卡計算，請在角色卡修改");
quickEvent({kind:"max",value},"設定生命值上限："+value,"hp_change");
}));
document.querySelectorAll("[data-quick]").forEach(button=>button.addEventListener("click",()=>run(()=>{
const [kind,raw]=button.dataset.quick.split(":");const delta=Number(raw);
if(kind==="resource"){
const name=$("quickResource").value.trim();if(!name||name.length>80)throw Error("請輸入資源名稱（最多 80 字）");
quickEvent({kind,name,delta},name+(delta<0?"消耗":"恢復")+" 1 次","resource_change");
}else {
if(linkedId){if(!current||current.characterId!==linkedId)throw Error("請先開啟已連接角色 ID 的場次");
if(current.settlement&&current.settlement.status!=="draft")throw Error("本場已結算鎖定");
const d=linked();const field=kind==="hp"?"hp":"thp";const before=Number(d.play[field]??(kind==="hp"?d.play.hpMax:0));
const value=kind==="hp"?Math.max(0,Math.min(Number(d.play.hpMax),before+delta)):Math.max(0,before+delta);
C.update(localStorage,linkedId,{kind:kind==="hp"?"hp":"temp",value});
}
quickEvent({kind,delta},(kind==="hp"?"生命值":"暫時生命值")+(delta>0?" +1":" -1"),"hp_change");
}
})));
$("add").addEventListener("click",()=>run(()=>{
if(!current)throw Error("請先開啟場次");
const description=$("description").value.trim();if(!description)throw Error("請輸入紀錄內容");
const event={eventId:crypto.randomUUID().replaceAll("-",""),characterId:current.characterId,sessionId:current.sessionId,createdAt:new Date().toISOString(),type:$("type").value,payload:{description}};
const next=L.add(current,event);save(next);$("description").value="";notify("已儲存到這台裝置");
}));
$("settle").addEventListener("click",()=>run(()=>{
if(!current)throw Error("請先開啟場次");
const status=$("review").value;
if(status==="approved"&&current.mode==="al")throw Error("AL 不可自行標記為官方核准");
if(!confirm("結算後將鎖定本場事件，確定嗎？請先下載備份。"))return;
save(L.setSettlement(current,{status,trust:"local-unverified"}));notify("已儲存本機結算狀態；不代表 DM 身分已驗證");
}));
$("download").addEventListener("click",()=>run(()=>{
if(!current)throw Error("請先開啟場次");
const blob=new Blob([L.exportJSON(current)],{type:"application/json"});
const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="dnd5r-session-"+current.sessionId+".json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify("已產生 JSON 下載");
}));
$("import").addEventListener("click",async()=>{
try{
const file=$("importFile").files[0];if(!file)throw Error("請先選擇 JSON 檔案");if(file.size>1000000)throw Error("檔案過大");
const incoming=L.importJSON(await file.text());const raw=localStorage.getItem(key(incoming));
const merged=raw?L.merge(L.importJSON(raw),incoming):incoming;
if(!confirm("匯入 "+merged.characterId+"／"+merged.sessionId+"？此操作會更新本機該場次紀錄。"))return;
save(merged);$("characterId").value=merged.characterId;$("sessionId").value=merged.sessionId;$("mode").value=merged.mode;
notify("已驗證並匯入 "+merged.events.length+" 筆事件");
}catch(e){notify("匯入失敗："+e.message,true)}
});
})();
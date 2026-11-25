/* Optional, character-local artwork for the 2024 Beast Master primal companion. */
(function(){
"use strict";
const MAX_FILE_BYTES=8*1024*1024, MAX_DATA_URL=180000;
const ACCEPTED=new Set(["image/jpeg","image/png","image/webp"]);
const KEY_PREFIX="companion|";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const validURL=v=>typeof v==="string"&&v.length<=MAX_DATA_URL&&/^data:image\/(?:jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v);
function eligible(s,id){
 return s?.ruleset==="2024"&&!!s.cls&&typeof id==="string"&&
 window.CreatureImport5R?.selectedCompanion(s)?.id===id;
}
function key(id){return KEY_PREFIX+id;}
function get(s,id){
 if(!eligible(s,id))return "";
 const value=s?.play?.creaturePortraits?.[key(id)];
 return validURL(value)?value:"";
}
function put(s,id,url){
 if(!eligible(s,id)||!validURL(url))return false;
 s.play=s.play&&typeof s.play==="object"?s.play:{};
 if(!s.play.creaturePortraits||typeof s.play.creaturePortraits!=="object"||Array.isArray(s.play.creaturePortraits))s.play.creaturePortraits={};
 s.play.creaturePortraits[key(id)]=url;
 return true;
}
function remove(s,id){
 if(!eligible(s,id))return false;
 const portraits=s.play?.creaturePortraits;
 if(!portraits||typeof portraits!=="object"||!(key(id) in portraits))return false;
 delete portraits[key(id)];
 if(!Object.keys(portraits).length)delete s.play.creaturePortraits;
 return true;
}
function render(s,id){
 if(!eligible(s,id))return "";
 const picture=get(s,id),label="原初野獸自訂外觀";
 return '<div class="psc-portrait" data-psc-portrait>'+
  (picture?'<img class="psc-portrait-image" src="'+picture+'" alt="'+label+'">':'<div class="psc-portrait-empty" aria-hidden="true">🐾</div>')+
  '<div class="psc-portrait-body"><strong>自訂原初野獸外觀</strong>'+
  '<p>建議圖片尺寸 <b>512 × 512 px</b>（1:1 正方形）。支援 JPG、PNG、WebP，原檔上限 8 MB；上傳後自動縮小儲存於角色資料，不會改變野獸數值。</p>'+
  '<div class="psc-portrait-actions"><button type="button" data-ps-action="creaturePortraitPick">'+(picture?'更換圖片':'上傳圖片')+'</button>'+
  (picture?'<button type="button" data-ps-action="creaturePortraitRemove">移除圖片</button>':"")+'</div>'+
  '<input type="file" data-psc-portrait-file accept="image/jpeg,image/png,image/webp" hidden aria-label="上傳原初野獸外觀圖片">'+
  '</div></div>';
}
async function processFile(file){
 if(!file)throw Error("請先選擇圖片檔案。");
 if(!ACCEPTED.has(file.type))throw Error("請選擇 JPG、PNG 或 WebP 圖片。");
 if(file.size<1||file.size>MAX_FILE_BYTES)throw Error("圖片原檔不可超過 8 MB。");
 const objectURL=URL.createObjectURL(file);
 let image;
 try{
  image=await new Promise((resolve,reject)=>{
   const picture=new Image();
   picture.onload=()=>resolve(picture);
   picture.onerror=()=>reject(Error("圖片無法讀取，請換另一張。"));
   picture.src=objectURL;
  });
 }finally{URL.revokeObjectURL(objectURL);}
 if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>64000000)throw Error("圖片像素過大或格式異常。");
 for(const size of [384,320,256]){
  const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");
  if(!ctx)throw Error("瀏覽器不支援圖片縮圖。");
  ctx.fillStyle="#f5eddf";ctx.fillRect(0,0,size,size);
  const scale=Math.min(size/image.naturalWidth,size/image.naturalHeight);
  const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
  ctx.drawImage(image,(size-w)/2,(size-h)/2,w,h);
  for(const quality of [.8,.65,.5]){
   let url=canvas.toDataURL("image/webp",quality);
   if(!url.startsWith("data:image/webp;"))url=canvas.toDataURL("image/jpeg",quality);
   if(validURL(url))return url;
  }
 }
 throw Error("圖片壓縮後仍過大，請改用內容較簡單的圖片。");
}
function connectPlayCards(){
 const root=document.getElementById("playStatusBody");
 if(!root||root.dataset.primalPortraitBound==="1")return;
 root.dataset.primalPortraitBound="1";
 function project(){
  const card=root.querySelector('.psc-card[data-psc-kind="companion"]');
  if(!card||card.querySelector("[data-psc-portrait]")||typeof S==="undefined")return;
  const id=card.dataset.pscId;
  if(!eligible(S,id))return;
  const header=card.querySelector(".psc-head");
  if(header)header.insertAdjacentHTML("afterend",render(S,id));
 }
 const observer=new MutationObserver(project);
 observer.observe(root,{childList:true});
 root.addEventListener("click",event=>{
  const button=event.target.closest?.('button[data-ps-action="creaturePortraitPick"],button[data-ps-action="creaturePortraitRemove"]');
  if(!button||!root.contains(button))return;
  const card=button.closest('.psc-card[data-psc-kind="companion"]');
  if(!card||!eligible(S,card.dataset.pscId))return;
  event.preventDefault();event.stopImmediatePropagation();
  if(button.dataset.psAction==="creaturePortraitPick"){
   card.querySelector("[data-psc-portrait-file]")?.click();return;
  }
  const id=card.dataset.pscId,old=get(S,id);
  if(!remove(S,id))return;
  if(typeof saveCurrent==="function"&&typeof storageAvailable==="function"&&storageAvailable()&&!saveCurrent(true)){
   put(S,id,old);renderPlayStatusTab();return;
  }
  renderPlayStatusTab();
  if(typeof toast==="function")toast("已移除原初野獸圖片");
 },true);
 root.addEventListener("change",async event=>{
  const input=event.target;
  if(!input?.matches?.("[data-psc-portrait-file]"))return;
  const card=input.closest('.psc-card[data-psc-kind="companion"]');
  if(!card||!eligible(S,card.dataset.pscId))return;
  const id=card.dataset.pscId,characterId=S.id,file=input.files?.[0];
  input.value="";
  if(!file)return;
  try{
   const next=await processFile(file);
   if(S.id!==characterId||!eligible(S,id))return;
   const previous=get(S,id);
   if(!put(S,id,next))throw Error("目前無法儲存此原初野獸圖片。");
   if(typeof saveCurrent==="function"&&typeof storageAvailable==="function"&&storageAvailable()&&!saveCurrent(true)){
    if(previous)put(S,id,previous);else remove(S,id);
    renderPlayStatusTab();return;
   }
   renderPlayStatusTab();
   if(typeof toast==="function")toast("原初野獸圖片已儲存到角色（約 "+Math.round(next.length*.75/1024)+" KB）");
  }catch(error){
   if(typeof toast==="function")toast(error?.message||"圖片處理失敗，請換一張圖片。");
  }
 },true);
 project();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",connectPlayCards,{once:true});
else connectPlayCards();
const style=document.createElement("style");
style.textContent=[
 '.psc-portrait{display:flex;align-items:center;gap:14px;padding:11px;margin:10px 0;border:1px solid #c5ac8a;background:#f6eddf;border-radius:8px;min-width:0}',
 '.psc-portrait-image,.psc-portrait-empty{width:120px;aspect-ratio:1/1;flex:0 0 120px;border:1px solid #bda687;border-radius:8px;object-fit:contain;background:#f4ead8;display:grid;place-items:center}',
 '.psc-portrait-empty{font-size:45px}',
 '.psc-portrait-body{flex:1;min-width:0;font:14px/1.6 "PingFang TC","Microsoft JhengHei",sans-serif;color:#4b382b}',
 '.psc-portrait-body strong{display:block;font-size:16px;color:#6d3328}',
 '.psc-portrait-body p{margin:4px 0 9px;overflow-wrap:anywhere}',
 '.psc-portrait-actions{display:flex;flex-wrap:wrap;gap:8px}',
 '.psc-portrait-actions button{min-height:42px;padding:7px 12px}',
 '@media(max-width:430px){.psc-portrait{align-items:flex-start;gap:9px}.psc-portrait-image,.psc-portrait-empty{width:86px;flex-basis:86px}.psc-portrait-body strong{font-size:14px}.psc-portrait-body{font-size:12px}}',
 '@media print{.psc-portrait-actions,.psc-portrait input{display:none!important}}'
].join("");
document.head.appendChild(style);
window.CreaturePortrait5R={eligible,get,put,remove,render,processFile,MAX_FILE_BYTES,MAX_DATA_URL};
})();

/* Shared browser-storage adapter. Canonical character save remains dnd5r:char:<id>. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DND5RCharacterSync=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PREFIX='dnd5r:char:';
function validId(id){return typeof id==='string'&&/^[a-zA-Z0-9_-]{3,100}$/.test(id)}
function read(storage,id){if(!validId(id))throw Error('角色 ID 格式不正確');const raw=storage.getItem(PREFIX+id);if(!raw)throw Error('找不到正式角色存檔');const doc=JSON.parse(raw);if(!doc||doc.id!==id||!doc.play||typeof doc.play!=='object')throw Error('角色存檔格式不正確');return doc}
function integer(n,min,max){return Number.isInteger(n)&&n>=min&&n<=max}
function update(storage,id,change){const doc=read(storage,id);if(!change||typeof change!=='object')throw Error('變更格式錯誤');const play={...doc.play},slots={...(doc.slotsUsed||{})};
if(change.kind==='hp'){if(!integer(change.value,0,9999))throw Error('生命值無效');const max=Number(play.hpMax);if(!integer(max,1,9999)||change.value>max)throw Error('生命值超出上限');play.hp=change.value;}
else if(change.kind==='temp'){if(!integer(change.value,0,9999))throw Error('暫時生命值無效');play.thp=change.value;}
else if(change.kind==='slot'){const key=String(change.key||'');const max=doc.sessionResourceLimits?.slots?.[key];if(!/^(l[1-9]|pact)$/.test(key)||!integer(max,1,99)||!integer(change.used,0,max))throw Error('法術位資料無效或超過上限，請先在角色卡重新儲存');slots[key]=change.used;}
else if(change.kind==='resource'){const key=String(change.key||'');const max=doc.sessionResourceLimits?.classes?.[key]?.max;if(!/^[a-zA-Z0-9_-]{1,50}$/.test(key)||!integer(max,1,999)||!integer(change.used,0,max))throw Error('職業資源資料無效或超過上限，請先在角色卡重新儲存');play.res={...(play.res||{}),[key]:change.used};}
else throw Error('不支援的角色狀態變更');
const next={...doc,play,slotsUsed:slots,ts:Date.now()};storage.setItem(PREFIX+id,JSON.stringify(next));return next;
}
return Object.freeze({read,update,validId,PREFIX});
});

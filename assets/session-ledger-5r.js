/* D&D 5R portable session ledger. No rules engine; no external dependencies. */
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;root.DND5RSessionLedger=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const SCHEMA=1, MODES=["free","al"], TYPES=["note","hp_change","resource_change","currency_gain","currency_spend","item_gain","item_remove","level_change","rest","settlement_note"];
const idok=x=>typeof x==="string"&&x===x.trim()&&/^[\p{L}\p{N}_\- ]{1,100}$/u.test(x);
const plain=x=>x!==null&&typeof x==="object"&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
function assert(x,msg){if(!x)throw Error(msg)}
function safeCopy(x){const s=JSON.stringify(x);assert(s&&s.length<=500000,"Payload too large");const o=JSON.parse(s);assert(plain(o),"Invalid payload");return o}
function validateEvent(e){assert(plain(e),"Invalid event");assert(idok(e.eventId)&&idok(e.sessionId)&&idok(e.characterId),"Invalid event identity");assert(TYPES.includes(e.type),"Unknown event type");assert(typeof e.createdAt==="string"&&!Number.isNaN(Date.parse(e.createdAt)),"Invalid timestamp");assert(plain(e.payload),"Invalid event payload");assert(JSON.stringify(e.payload).length<=16000,"Event payload too large");const q=e.payload.quick;
if(q!==undefined){
 assert(plain(q)&&["max","hp","temp","resource","slot"].includes(q.kind),"Invalid quick event");
 if(q.kind==="max")assert(Number.isInteger(q.value)&&q.value>=1&&q.value<=9999,"Invalid HP maximum");
 if(q.kind==="hp"||q.kind==="temp")assert(Number.isInteger(q.delta)&&Math.abs(q.delta)===1,"Invalid HP delta");
 if(q.kind==="slot")assert(/^(l[1-9]|pact)$/.test(q.key)&&Math.abs(q.delta)===1,"Invalid spell slot event");
 if(q.kind==="resource")assert((typeof q.name==="string"&&q.name.trim().length>0&&q.name.length<=80||typeof q.key==="string"&&/^[a-zA-Z0-9_-]{1,50}$/.test(q.key))&&Math.abs(q.delta)===1,"Invalid resource event");
}
return e}
function validate(doc){assert(plain(doc)&&doc.schemaVersion===SCHEMA,"Unsupported ledger schema");assert(idok(doc.characterId)&&idok(doc.sessionId),"角色或場次名稱格式不正確：請使用中文、英數字、空格、- 或 _（最多 100 字）");assert(MODES.includes(doc.mode),"Invalid mode");assert(Array.isArray(doc.events)&&doc.events.length<=5000,"Invalid events");const ids=new Set();doc.events.forEach(e=>{validateEvent(e);assert(e.sessionId===doc.sessionId&&e.characterId===doc.characterId,"Event ownership mismatch");assert(!ids.has(e.eventId),"Duplicate event");ids.add(e.eventId)});assert(doc.settlement===null||plain(doc.settlement)&&["draft","pending","approved","rejected"].includes(doc.settlement.status),"Invalid settlement");return doc}
function create({characterId,sessionId,mode="free"}){return validate({schemaVersion:SCHEMA,characterId,sessionId,mode,events:[],settlement:null})}
function add(doc,event){validate(doc);const e=safeCopy(event);validateEvent(e);assert(e.characterId===doc.characterId&&e.sessionId===doc.sessionId,"Event ownership mismatch");assert(!doc.settlement||doc.settlement.status==="draft","Session is locked for review");const existing=doc.events.find(x=>x.eventId===e.eventId);if(existing){assert(JSON.stringify(existing)===JSON.stringify(e),"Conflicting event ID");return doc}return validate({...doc,events:[...doc.events,e]})}
function merge(local,incoming){validate(local);validate(incoming);assert(local.characterId===incoming.characterId&&local.sessionId===incoming.sessionId&&local.mode===incoming.mode,"Different character, session or mode");assert(JSON.stringify(local.settlement)===JSON.stringify(incoming.settlement),"Settlement conflict requires review");let out=local;for(const e of incoming.events){const found=out.events.find(x=>x.eventId===e.eventId);if(found){assert(JSON.stringify(found)===JSON.stringify(e),"Conflicting event ID");continue}assert(!out.settlement||out.settlement.status==="draft","Locked settlement cannot gain events");out=add(out,e)}return out}
function importJSON(raw){assert(typeof raw==="string"&&raw.length<=1000000,"Invalid import size");const doc=JSON.parse(raw);validate(doc);return JSON.parse(JSON.stringify(doc))}
function exportJSON(doc){validate(doc);return JSON.stringify(doc,null,2)}
function setSettlement(doc,settlement){validate(doc);assert(plain(settlement)&&["draft","pending","approved","rejected"].includes(settlement.status),"Invalid review status");assert(doc.settlement===null||JSON.stringify(doc.settlement)===JSON.stringify(settlement),"Settlement already exists; revision required");if(settlement.status==="approved")assert(doc.mode==="free"&&settlement.trust==="local-unverified","Official AL or trusted DM approval requires server verification");return validate({...doc,settlement:safeCopy(settlement)})}
return Object.freeze({SCHEMA,MODES,TYPES,create,validate,add,merge,importJSON,exportJSON,setSettlement});
});

/* Phase B: accessible semantic damage types in visible DOM text only.
 * No canonical data, save, search input, item ID or export string mutation.
 * One incremental observer, scoped to actual UI (main and two rule popovers).
 */
(function(){
 "use strict";
 const TYPES=Object.freeze({
  "酸蝕":"acid","鈍擊":"bludgeoning","寒冷":"cold","火焰":"fire",
  "力場":"force","閃電":"lightning","黯蝕":"necrotic","穿刺":"piercing",
  "毒素":"poison","心靈":"psychic","光耀":"radiant","揮砍":"slashing","雷鳴":"thunder"
 });
 const terms=Object.keys(TYPES);
 const typeSource="(?:"+terms.join("|")+")";
 const tokenRE=new RegExp(typeSource,"g");
 const separator="\\s*(?:、|，|或|與|和|及|/|／)\\s*";
 // Only decorate terms in an explicit damage context; spell names remain unchanged.
 const diceDamageRE=new RegExp("\\b\\d+d\\d+(?:\\s*[+＋-]\\s*\\d+)?\\s*(?:點|的)?\\s*"+typeSource+"(?=\\s*(?:傷害|點傷害|[，。；、,;)]|$))","g");
 const contexts=[
   new RegExp(typeSource+"(?:"+separator+typeSource+")*\\s*傷害","g"),
   new RegExp("(?:傷害類型|傷害型態|傷害免疫|傷害抗性|傷害易傷|抗性|易傷)\\s*[:：]\\s*"+typeSource+"(?:"+separator+typeSource+")*","g"),
   new RegExp("(?:對|於)\\s*"+typeSource+"(?:"+separator+typeSource+")*\\s*(?:具有|獲得|有)?\\s*(?:抗性|免疫|易傷)","g")
 ];
 const candidates=new RegExp(typeSource);
 const excluded="script,style,textarea,select,option,template,code,pre,[contenteditable],.damage-semantic,[data-no-damage-color]";
 let processed=0,decorated=0,scheduled=false;
 const pending=new Set();
 function ranges(text){
  const byPosition=new Map();
  for(const re of [...contexts,diceDamageRE]){
   re.lastIndex=0;
   let m;
   while((m=re.exec(text))){
    tokenRE.lastIndex=0;
    let t;
    while((t=tokenRE.exec(m[0]))){
     const start=m.index+t.index;
     byPosition.set(start,{start,end:start+t[0].length,type:TYPES[t[0]],text:t[0]});
    }
   }
  }
  return [...byPosition.values()].sort((a,b)=>a.start-b.start);
 }
 function decorateText(node){
  if(!node||node.nodeType!==3||!node.parentElement||!candidates.test(node.nodeValue||""))return;
  if(node.parentElement.closest(excluded))return;
  const source=node.nodeValue||"";
  const spans=ranges(source);
  if(!spans.length)return;
  const frag=document.createDocumentFragment();
  let offset=0;
  for(const item of spans){
   if(item.start<offset)continue;
   if(item.start>offset)frag.appendChild(document.createTextNode(source.slice(offset,item.start)));
   const span=document.createElement("span");
   span.className="damage-semantic";
   span.dataset.damageType=item.type;
   span.textContent=item.text;
   frag.appendChild(span);
   offset=item.end;
  }
  if(offset<source.length)frag.appendChild(document.createTextNode(source.slice(offset)));
  if(!offset)return;
  node.replaceWith(frag);
  decorated+=spans.length;
 }
 function decorate(root){
  if(!root||!root.isConnected)return;
  if(root.nodeType===3){processed++;decorateText(root);return;}
  if(root.nodeType!==1||root.matches(excluded)||root.closest(".damage-semantic"))return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const hits=[];
  let next;
  while((next=walker.nextNode())){
   if(candidates.test(next.nodeValue||""))hits.push(next);
  }
  processed+=hits.length;
  for(const t of hits)decorateText(t);
 }
 function flush(){
  scheduled=false;
  const nodes=[...pending];pending.clear();
  const pendingBatch=new Set(nodes);
  // Newly added ancestors supersede their descendants; never rescan the whole document.
  for(const node of nodes){
   if(!node.isConnected)continue;
   if(node.nodeType===1&&node.closest(".damage-semantic"))continue;
   if(node.nodeType===3&&node.parentElement?.closest(".damage-semantic"))continue;
   let covered=false;
   // O(depth * addedNodes), not O(N²) on large creature/spell lists.
   for(let ancestor=node.parentNode;ancestor;ancestor=ancestor.parentNode){
    if(pendingBatch.has(ancestor)){covered=true;break;}
   }
   if(!covered)decorate(node);
  }
 }
 function schedule(node){
  if(!node||node.nodeType!==1&&node.nodeType!==3)return;
  if(node.nodeType===1&&node.matches(".damage-semantic"))return;
  if(node.nodeType===3&&node.parentElement?.closest(".damage-semantic"))return;
  pending.add(node);
  if(!scheduled){scheduled=true;queueMicrotask(flush);}
 }
 const observer=new MutationObserver(records=>{
  for(const record of records){
   for(const node of record.addedNodes)schedule(node);
  }
 });
 function init(){
  for(const sel of ["main","#featureTip","#spellTip"]){
   const root=document.querySelector(sel);
   if(!root)continue;
   observer.observe(root,{childList:true,subtree:true});
   decorate(root);
  }
 }
 window.ZIZI_DAMAGE_SEMANTICS_5R=Object.freeze({
  types:TYPES,decorate,ranges,
  stats:()=>({processed,decorated})
 });
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();

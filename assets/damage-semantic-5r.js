/* Shared accessible semantic damage (13 types) and D&D ability words (6) in visible DOM text.
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
 const ABILITIES=Object.freeze({
  "力量":"str","敏捷":"dex","體質":"con","智力":"int","感知":"wis","魅力":"cha"
 });
 const abilitySource="(?:"+Object.keys(ABILITIES).join("|")+")";
 const abilityTokenRE=new RegExp(abilitySource,"gu");
 // A signed scalar belongs to its ability label, not to the preceding operation.
 // No newline, dice, decimal, or unsigned score may be captured.
 const modifierRE=/^[ \t\u00a0]*(?:\u8abf\u6574\u503c[ \t\u00a0]*)?[+\uFF0B\u2212\uFF0D-][ \t\u00a0]*\d+(?![\dA-Za-z.])/u;
 const proficiencyLabelRE=/(?<![\u4e0d\u672a\u975e])\u719f\u7df4(?:\u52a0\u503c)?/gu;
 const proficiencyModifierRE=/^[ \t\u00a0]*[+\uFF0B\u2212\uFF0D-][ \t\u00a0]*\d+(?![\dA-Za-z.])/u;
 const signedScalarRE=/^[+\uFF0B\u2212\uFF0D-][ \t\u00a0]*\d+$/u;
 // Explicit rule verbs following an ability name (do not color e.g. 魅力學院).
 const abilityRuleVerbRE=/^(?:作為|用作|用於|用以|施法|施放|施展|進行|計算|決定|增加|提高|提升|減少|降低|為(?=\s*[+＋-]?\d)|是(?=\s*[+＋-]?\d))/u;
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
 const candidates=new RegExp(typeSource+"|"+abilitySource+"|\\u719f\\u7df4");
 const excluded="script,style,textarea,select,option,template,code,pre,[contenteditable],.damage-semantic,.ability-semantic,.proficiency-semantic,[data-no-damage-color]";
 let processed=0,decorated=0,abilityDecorated=0,scheduled=false;
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
 function abilityRanges(text){
  const result=[];abilityTokenRE.lastIndex=0;
  let m;
  while((m=abilityTokenRE.exec(text))){
   const after=text.slice(m.index+m[0].length);
   // Distinguish an ability name from a prefix inside another Chinese word:
   // 魅力學院 (College of Glamour), 立體質感 and 感知範圍 are not ability scores.
   if(/^\p{Script=Han}/u.test(after)&&
      !/^(?:豁免(?:檢定)?|檢定|調整值|屬性(?:值|調整值)?|數值|得分|值|熟練|能力|與|及|和|或)/u.test(after)&&
      !abilityRuleVerbRE.test(after))continue;
   const modifier=after.match(modifierRE)?.[0]||"";
   const end=m.index+m[0].length+modifier.length;
   result.push({start:m.index,end,type:ABILITIES[m[0]],text:text.slice(m.index,end),kind:"ability",modifier:!!modifier});
   if(modifier)abilityTokenRE.lastIndex=end;
  }
  abilityTokenRE.lastIndex=0;
  return result;
 }
 function proficiencyRanges(text){
  const result=[];
  proficiencyLabelRE.lastIndex=0;
  let m;
  while((m=proficiencyLabelRE.exec(text))){
   const labelEnd=m.index+m[0].length;
   const modifier=text.slice(labelEnd).match(proficiencyModifierRE)?.[0];
   if(!modifier&&!/^[ \t\u00a0]*$/.test(text.slice(labelEnd)))continue;
   const end=labelEnd+(modifier?.length||0);
   result.push({start:m.index,end,text:text.slice(m.index,end),kind:"proficiency",modifier:!!modifier});
  }
  proficiencyLabelRE.lastIndex=0;
  return result;
 }
 function decorateText(node){
  if(!node||node.nodeType!==3||!node.parentElement||!candidates.test(node.nodeValue||""))return;
  if(node.parentElement.closest(excluded))return;
  const source=node.nodeValue||"";
  const blockAbilities=!!node.parentElement.closest("[data-no-ability-color]");
  // featureSemanticHTML5R can emit the label itself as a resource emphasis,
  // followed by whitespace and an independent signed number emphasis.
  const parent=node.parentElement;
  if(!blockAbilities&&parent.matches("strong.rule-em-resource")&&parent.childNodes.length===1&&
    /^\u719f\u7df4(?:\u52a0\u503c)?$/.test(source)&&
    !/[\u4e0d\u672a\u975e]$/.test(parent.previousSibling?.textContent||"")){
   const sibling=parent.nextSibling;
   const space=sibling?.nodeType===3&&/^[ \t\u00a0]*$/.test(sibling.nodeValue||"")?sibling:null;
   const number=space?space.nextSibling:sibling;
   if(number?.nodeType===1&&number.matches("strong.rule-em-number")&&number.childNodes.length===1&&
     number.firstChild.nodeType===3&&signedScalarRE.test(number.textContent)){
    parent.classList.add("proficiency-semantic");
    parent.dataset.proficiencyModifier="1";
    if(space)parent.appendChild(space);
    parent.appendChild(number);
    return;
   }
  }
  const spans=[
   ...ranges(source).map(x=>({...x,kind:"damage"})),
   ...(blockAbilities?[]:abilityRanges(source)),
   ...(blockAbilities?[]:proficiencyRanges(source))
  ].sort((a,b)=>a.start-b.start);
  if(!spans.length)return;
  const last=spans[spans.length-1], next=node.nextSibling;
  const joined=(last.kind==="ability"||last.kind==="proficiency")&&!last.modifier&&/^[ \t\u00a0]*$/.test(source.slice(last.end))&&
   next?.nodeType===1&&next.matches("strong.rule-em-number")&&next.childNodes.length===1&&
   next.firstChild.nodeType===3&&signedScalarRE.test(next.textContent);
  if(last.kind==="proficiency"&&!last.modifier&&!joined)spans.pop();
  if(!spans.length)return;
  const frag=document.createDocumentFragment();
  let offset=0;
  for(const item of spans){
   if(item.start<offset)continue;
   if(item.start>offset)frag.appendChild(document.createTextNode(source.slice(offset,item.start)));
   const span=document.createElement("span");
   if(item.kind==="ability"){
    span.className="ability-semantic";
    span.dataset.ability=item.type;
    if(item.modifier||(joined&&item===last))span.dataset.abilityModifier="1";
    abilityDecorated++;
   }else if(item.kind==="proficiency"){
    span.className="proficiency-semantic";
    span.dataset.proficiencyModifier="1";
   }else{
    span.className="damage-semantic";
    span.dataset.damageType=item.type;
   }
   span.textContent=item.text;
   if(joined&&item===last){
    span.appendChild(document.createTextNode(source.slice(item.end)));
    span.appendChild(next); // existing semantic number node retains identity
   }
   frag.appendChild(span);
   offset=joined&&item===last?source.length:item.end;
  }
  if(offset<source.length)frag.appendChild(document.createTextNode(source.slice(offset)));
  if(!offset)return;
  node.replaceWith(frag);
  decorated+=spans.filter(x=>x.kind==="damage").length;
 }
 function decorate(root){
  if(!root||!root.isConnected)return;
  if(root.nodeType===3){processed++;decorateText(root);return;}
  if(root.nodeType!==1||root.matches(excluded)||root.closest(".damage-semantic,.ability-semantic,.proficiency-semantic"))return;
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
   if(node.nodeType===1&&node.closest(".damage-semantic,.ability-semantic,.proficiency-semantic"))continue;
   if(node.nodeType===3&&node.parentElement?.closest(".damage-semantic,.ability-semantic,.proficiency-semantic"))continue;
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
  if(node.nodeType===1&&node.matches(".damage-semantic,.ability-semantic,.proficiency-semantic"))return;
  if(node.nodeType===3&&node.parentElement?.closest(".damage-semantic,.ability-semantic,.proficiency-semantic"))return;
  pending.add(node);
  if(!scheduled){scheduled=true;queueMicrotask(flush);}
 }
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==="characterData"){schedule(record.target);continue;}
   for(const node of record.addedNodes)schedule(node);
  }
 });
 function init(){
  for(const sel of ["main","#featureTip","#spellTip"]){
   const root=document.querySelector(sel);
   if(!root)continue;
   observer.observe(root,{childList:true,subtree:true,characterData:true});
   decorate(root);
  }
 }
 window.ZIZI_DAMAGE_SEMANTICS_5R=Object.freeze({
  types:TYPES,abilities:ABILITIES,decorate,ranges,abilityRanges,proficiencyRanges,
  stats:()=>({processed,decorated,abilityDecorated})
 });
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();

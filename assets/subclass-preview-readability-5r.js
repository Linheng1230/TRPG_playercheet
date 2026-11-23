/* Visual-only subclass readability adapter.
 * Reuses the spell glance's PHB2024 semantic highlighter and the existing damage palette.
 * Never edits canonical rules, character state, export strings, or stored choices.
 */
(function(g){
 "use strict";
 const ESC={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};
 const escape=s=>String(s??"").replace(/[&<>"']/g,c=>ESC[c]);
 const targets=".subclass-rule-readable,.class-choice-variant-preview .choice-menu-card";
 const skip="script,style,textarea,select,option,template,code,pre,a,button,summary,strong,.damage-semantic,.subclass-rule-key,[contenteditable]";
 const cue=/(?:\d+\s*[dD]\s*\d+|DC|豁免|傷害|長休|短休|反應|附贈動作|法術攻擊|每回合|優勢|劣勢|呎|尺|回合|分鐘|小時|中毒|倒地|失能|目盲|震懾)/u;
 const emphasis=/^(?:長休|短休|每回合(?:一次|開始|結束)?|每輪(?:一次|開始|結束)?|\d+\s*(?:呎|尺|分鐘|小時|回合))$/u;
 const extra=/((?:長休|短休)|(?:每回合|每輪)(?:一次|開始|結束)?|\d+\s*(?:呎|尺|分鐘|小時|回合))/gu;
 let changed=0, scheduled=false, observer=null;
 const seen=new WeakSet(),pending=new Set();
 function clauses(raw){
  const text=String(raw||"").trim();
  const matches=text.match(/[^。；\n]+[。；\n]?|[。；\n]/gu)||[text];
  const output=[];
  for(const part of matches){
   if(/^[。；\n]+$/u.test(part)&&output.length)output[output.length-1]+=part;
   else output.push(part);
  }
  return output.filter(x=>x.trim());
 }
 function render(raw){
  const text=String(raw||"").trim();
  if(!text)return "";
  // Only use the shared feature parser to identify visual flavor; retain all original punctuation.
  const info=typeof g.featureRuleParts==="function"?g.featureRuleParts(text):null;
  const flavor=String(info?.flavor||"");
  const blocks=clauses(text).map((part,i)=>{
   const isFlavor=i===0&&flavor&&part.trim().startsWith(flavor);
   const match=part.match(/^(\s*[^：:\n。；]{1,14}[：:])([\s\S]*)$/u);
   const html=match?'<span class="subclass-rule-key">'+escape(match[1])+'</span>'+escape(match[2]):escape(part);
   return '<p class="subclass-rule-paragraph'+(isFlavor?' subclass-rule-flavor':'')+'">'+html+'</p>';
  }).join("");
  return '<div class="subclass-rule-readable" data-source="canonical">'+blocks+'</div>';
 }
 function highlighted(text){
  const spell=g.ZIZI_CREATOR_SPELL_GLANCE_2024?.highlight;
  const parts=String(text).split(extra);
  return parts.map(part=>
   emphasis.test(part)?'<strong class="sr-resource">'+escape(part)+'</strong>':
   spell?spell(part):escape(part)).join("");
 }
 function decorateText(node){
  if(node.nodeType!==3||seen.has(node))return;
  seen.add(node);
  if(!node.parentElement||!cue.test(node.nodeValue||""))return;
  if(node.parentElement.closest(skip))return;
  const source=node.nodeValue||"",html=highlighted(source);
  if(html===escape(source))return;
  const tpl=document.createElement("template");
  tpl.innerHTML=html;
  node.replaceWith(tpl.content);
  changed++;
 }
 function decorate(root){
  if(!root)return;
  const scopes=[];
  if(root.nodeType===1&&root.matches?.(targets))scopes.push(root);
  root.querySelectorAll?.(targets).forEach(x=>scopes.push(x));
  for(const scope of scopes){
   const walker=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT),nodes=[];
   while(walker.nextNode())nodes.push(walker.currentNode);
   nodes.forEach(decorateText);
  }
 }
 function init(){
  const host=document.getElementById("lvlBody");
  if(!host||observer)return;
  decorate(host);
  observer=new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes){
    if(node.nodeType===1){
     const scope=node.closest?.(targets);
     if(scope)pending.add(scope);
     else if(node.matches?.(targets)||node.querySelector?.(targets))pending.add(node);
    }else if(node.nodeType===3){
     const scope=node.parentElement?.closest?.(targets);
     if(scope)pending.add(scope);
    }
   }
   if(scheduled||!pending.size)return;
   scheduled=true;
   queueMicrotask(()=>{
    scheduled=false;
    const nodes=[...pending];pending.clear();
    nodes.forEach(node=>{if(node.isConnected)decorate(node);});
   });
  });
  observer.observe(host,{childList:true,subtree:true});
 }
 g.ZIZI_SUBCLASS_READABILITY_5R=Object.freeze({
  render,decorate,stats:()=>({changed,active:!!observer})
 });
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})(globalThis);

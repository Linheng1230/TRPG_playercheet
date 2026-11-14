/* Player quick-reference categories: one canonical navigation row, always reachable while scrolling.
   Mirrors #refTabs buttons as-is: new categories join automatically, no parallel option registry. */
(function(){
"use strict";
const tabs=document.getElementById("refTabs");
const navigation=document.getElementById("stepNav");
const body=document.getElementById("refBody");
if(!tabs||!navigation||!body)return;
const css=document.createElement("style");
css.textContent=[
  '#refTabs.method-tabs{position:sticky;top:var(--ref-nav-offset,0px);z-index:91;display:flex;flex-wrap:nowrap;gap:6px;box-sizing:border-box;width:100%;max-width:100%;min-width:0;margin:0 0 14px;padding:7px;border:1px solid #bda382;border-radius:9px;background:#f0e4ce;box-shadow:0 3px 12px rgba(44,29,17,.16);overflow-x:auto;overscroll-behavior-x:contain;touch-action:auto;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scroll-padding-inline:8px}',
  '#refTabs.method-tabs button{flex:0 0 auto;min-width:0;min-height:44px;max-width:none;width:auto;white-space:nowrap;word-break:normal;overflow-wrap:normal;padding:9px 13px;border:1px solid #a58966;border-radius:7px;background:#fffaf0;color:#503020;font:700 14px/1.45 "PingFang TC","Microsoft JhengHei",sans-serif;letter-spacing:0}',
  '#refTabs.method-tabs button.active{background:#71352c;color:#fff8e9;border-color:#71352c}',
  '#refTabs.method-tabs button:not(.active):hover{background:#e8d7b9}',
  '#refTabs.method-tabs button:focus-visible{outline:3px solid #a45324;outline-offset:1px}',
  '#refTabs.method-tabs button[hidden]{display:none!important}',
  '@media(max-width:480px){#refTabs.method-tabs{padding:6px;gap:5px;margin-bottom:10px}#refTabs.method-tabs button{padding:8px 11px;font-size:14px}}',
  '@media print{#refTabs.method-tabs{position:static;overflow:visible;flex-wrap:wrap;box-shadow:none}}'
].join("");
document.head.appendChild(css);
tabs.setAttribute("aria-label","速查分類快速切換");
const offset=()=>Math.ceil(navigation.getBoundingClientRect().height);
const updateOffset=()=>tabs.style.setProperty("--ref-nav-offset",offset()+"px");
updateOffset();
if(typeof ResizeObserver==="function")new ResizeObserver(updateOffset).observe(navigation);
new MutationObserver(updateOffset).observe(navigation,{childList:true});
window.addEventListener("resize",updateOffset,{passive:true});
function keepSelectedVisible(button){
 if(!button||button.hidden)return;
 const l=button.offsetLeft-tabs.scrollLeft;
 const right=l+button.offsetWidth;
 if(l<8)tabs.scrollLeft+=l-8;
 else if(right>tabs.clientWidth-8)tabs.scrollLeft+=right-tabs.clientWidth+8;
}
tabs.addEventListener("click",event=>{
 const button=event.target.closest("button[data-r]");
 if(!button||button.hidden||!tabs.contains(button))return;
 const wasPinned=tabs.getBoundingClientRect().top<=offset()+3;
 requestAnimationFrame(()=>{
  if(!tabs.isConnected||!button.isConnected)return;
  updateOffset();
  keepSelectedVisible(button);
  if(!wasPinned)return;
  const y=window.scrollY+body.getBoundingClientRect().top-offset()-tabs.getBoundingClientRect().height-12;
  window.scrollTo({top:Math.max(0,y),behavior:"auto"});
 });
});
window.ReferenceStickyNav={updateOffset};
})();
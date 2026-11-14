/* Stage B: one physical detail panel per choice, reflowed in place on narrow screens.
   No duplicate rules, data copy, save format, or new confirmation state. */
(function(){
"use strict";
const MOBILE="(max-width:700px)";
const media=window.matchMedia(MOBILE);
const specs={
 class:{grid:"classGrid",preview:"classDetail",bar:'.step-panel[data-step="0"] .class-confirm-controls'},
 bg:{grid:"bgGrid",preview:"bgDetail",bar:".confirm-bg"},
 sp:{grid:"spGrid",preview:"spDetail",bar:".confirm-sp"},
 subclass:{grid:"subGrid",preview:"subclassPreview",bar:"#subclassConfirm,#subclassConfirmed"}
};
function resolve(kind){
 const spec=specs[kind];if(!spec)return null;
 const grid=document.getElementById(spec.grid),preview=document.getElementById(spec.preview);
 if(!grid||!preview)return null;
 const bar=document.querySelector(spec.bar);
 return {grid,preview,bar};
}
function normalOrder(o){
 if(!o)return;
 const {grid,preview,bar}=o;
 if(bar)grid.after(preview,bar);
 else grid.after(preview);
 grid.classList.remove("creator-preview-inline");
 preview.classList.remove("creator-preview-inline-panel");
 if(bar)bar.classList.remove("creator-preview-inline-confirm");
}
function beforeRender(kind){
 const o=resolve(kind);
 if(o&&o.grid.contains(o.preview))normalOrder(o);
 else if(o&&o.bar&&o.grid.contains(o.bar))normalOrder(o);
}
function place(kind){
 const o=resolve(kind);if(!o)return;
 const {grid,preview,bar}=o;
 const chosen=grid.querySelector(".pick-card.selected");
 const inline=media.matches&&chosen&&!preview.hidden;
 if(inline){
  if(bar)chosen.after(preview,bar);
  else chosen.after(preview);
  grid.classList.add("creator-preview-inline");
  preview.classList.add("creator-preview-inline-panel");
  if(bar)bar.classList.add("creator-preview-inline-confirm");
 }else normalOrder(o);
 preview.setAttribute("aria-live","polite");
 grid.querySelectorAll(".pick-card").forEach(button=>{
  const on=button.classList.contains("selected");
  button.setAttribute("aria-pressed",String(on));
  button.setAttribute("aria-controls",preview.id);
  if(on)button.setAttribute("aria-expanded",String(!preview.hidden));
  else button.removeAttribute("aria-expanded");
 });
}
function layout(){["class","bg","sp","subclass"].forEach(place)}
function afterRender(kind){if(kind==="origin"){place("bg");place("sp")}else place(kind)}
if(media.addEventListener)media.addEventListener("change",layout);
else window.addEventListener("resize",layout,{passive:true});
const style=document.createElement("style");
style.textContent=`
/* Selectable content is primary text, not tiny muted metadata. */
.step-panel[data-step="0"] .pick-card .desc,
.step-panel[data-step="1"] .pick-card .desc,
#subGrid .pick-card .desc {
 font:400 15px/1.7 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;
 color:var(--text);
 overflow-wrap:anywhere;
}
.step-panel[data-step="0"] .pick-card,
.step-panel[data-step="1"] .pick-card,
#subGrid .pick-card {min-height:92px;}
.step-panel[data-step="0"] .pick-card:focus-visible,
.step-panel[data-step="1"] .pick-card:focus-visible,
#subGrid .pick-card:focus-visible {outline:3px solid #a3342a;outline-offset:-3px;z-index:1;}
.step-panel[data-step="0"] .detail-box,
.step-panel[data-step="1"] .detail-box {
 font:400 15.5px/1.8 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;
 color:var(--text);
 max-width:100%;
}
.step-panel[data-step="0"] .detail-box .trait-rules,
.step-panel[data-step="1"] .detail-box .trait-rules {font-size:15px;line-height:1.8;}
.step-panel[data-step="0"] .detail-box .trait-val,
.step-panel[data-step="1"] .detail-box .trait-val {font-size:15px;line-height:1.8;}
.step-panel[data-step="0"] .class-confirm-controls,
.step-panel[data-step="1"] .confirm-bg,
.step-panel[data-step="1"] .confirm-sp,
#subclassConfirm {max-width:100%;min-width:0;}
.creator-preview-inline-panel,
.creator-preview-inline-confirm {
 grid-column:1/-1;
 width:100%;
 min-width:0;
 margin:0!important;
}
.card-grid.creator-preview-inline .creator-preview-inline-panel {
 border:2px solid var(--gold);
 border-left-width:4px;
 box-shadow:inset 0 0 0 1px rgba(163,52,42,.07);
 background:#fff9ed;
 padding:14px;
}
.card-grid.creator-preview-inline .creator-preview-inline-confirm {
 border:1px solid var(--line);
 background:#f3e4cd;
 padding:12px;
}
@media(max-width:700px){
 .step-panel[data-step="0"] .pick-card .desc,
 .step-panel[data-step="1"] .pick-card .desc,
 #subGrid .pick-card .desc {font-size:15px;line-height:1.7;}
 .card-grid.creator-preview-inline{grid-template-columns:1fr;}
 .card-grid.creator-preview-inline .creator-preview-inline-confirm button {
  width:100%;min-height:44px;
 }
 .step-panel[data-step="0"] .detail-box,
 .step-panel[data-step="1"] .detail-box {font-size:15px;line-height:1.8;}
 .step-panel[data-step="0"] .detail-box .row,
 .step-panel[data-step="1"] .detail-box .row {margin:9px 0;}
 .step-panel[data-step="0"] .class-confirm-controls,
 .step-panel[data-step="1"] .class-confirm-controls {gap:10px;}
}
@media print {
 .creator-preview-inline-panel,.creator-preview-inline-confirm {break-inside:avoid;}
}
`;
document.head.appendChild(style);
window.CreatorUX5R={beforeRender,afterRender,layout};
})();
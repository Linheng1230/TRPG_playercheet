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
/* Keep editing context when the existing level renderer replaces its DOM.
   This is a transient UI snapshot, never added to S or serialized JSON. */
let levelSnapshot=null;
function elementSelector(el,host){
 if(!el||!host.contains(el))return "";
 if(el.id)return "#"+CSS.escape(el.id);
 if(el.tagName==="SUMMARY"){
  const summaries=[...host.querySelectorAll("#subclassPreview .subclass-preview-tier summary")];
  const index=summaries.indexOf(el);
  return index>=0?"#subclassPreview .subclass-preview-tier:nth-of-type("+(index+1)+") > summary":"";
 }
 const attrs=[...el.attributes].filter(attr=>attr.name.startsWith("data-"));
 return attrs.length?el.tagName.toLowerCase()+attrs.map(attr=>"["+attr.name+"="+JSON.stringify(attr.value)+"]").join(""):"";
}
function beforeLevelRender(){
 const host=document.getElementById("lvlBody");
 if(!host){levelSnapshot=null;return}
 const focused=host.contains(document.activeElement)?document.activeElement:null;
 const tiers=[...host.querySelectorAll("#subclassPreview .subclass-preview-tier")];
 const selected=host.querySelector("#subGrid .pick-card.selected");
 levelSnapshot={
  selector:elementSelector(focused,host),
  selection:focused&&typeof focused.selectionStart==="number"?[focused.selectionStart,focused.selectionEnd]:null,
  subclass:selected?.getAttribute("data-sub")??null,
  open:tiers.map((node,i)=>node.open?i:-1).filter(i=>i>=0),
  hadPreview:tiers.length>0
 };
}
function afterLevelRender(){
 const snapshot=levelSnapshot;levelSnapshot=null;
 const host=document.getElementById("lvlBody");
 if(!snapshot||!host)return;
 const selected=host.querySelector("#subGrid .pick-card.selected");
 const subclass=selected?.getAttribute("data-sub")??null;
 if(snapshot.hadPreview&&subclass!==null&&subclass===snapshot.subclass){
  host.querySelectorAll("#subclassPreview .subclass-preview-tier").forEach((tier,i)=>{
   tier.open=snapshot.open.includes(i);
  });
 }
 if(!snapshot.selector)return;
 let target;
 try{target=host.querySelector(snapshot.selector)}catch(e){return}
 if(!target||target.disabled||typeof target.focus!=="function")return;
 target.focus({preventScroll:true});
 if(snapshot.selection&&typeof target.setSelectionRange==="function"){
  try{target.setSelectionRange(...snapshot.selection)}catch(e){}
 }
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
/* Readable, accessible controls across creator steps 2–6 and level-up. */
.step-panel[data-step="2"] .method-tabs button,
.step-panel[data-step="2"] .bonus-mode button,
.step-panel[data-step="5"] .bonus-mode button {min-height:44px;font-size:15px;line-height:1.45;}
.step-panel[data-step="3"] .skill-chip {
 min-height:48px;
 font:600 15px/1.55 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;
 overflow-wrap:anywhere;
}
.step-panel[data-step="3"] .skill-chip .ab {
 font:400 13px/1.5 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;
}
.step-panel[data-step="3"] .skill-chip:focus-visible {outline:3px solid #a3342a;outline-offset:-3px;z-index:1;}
.step-panel[data-step="4"] .form-grid input,
.step-panel[data-step="4"] .form-grid select,
.step-panel[data-step="4"] .form-grid textarea {min-height:44px;font-size:16px;line-height:1.5;}
.step-panel[data-step="2"] .step-hint,
.step-panel[data-step="5"] .step-hint {
 font:400 15.5px/1.8 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;
 color:var(--text);
 max-width:75ch;
}
#lvlBody .lvl-ctl button {width:44px;height:44px;min-width:44px;min-height:44px;}
#lvlBody .lvl-ctl .lvcap {font-size:14px;line-height:1.65;}
#lvlBody .asi-block select,
#lvlBody .asi-block input[type="text"] {min-height:44px;font-size:15px;}
#lvlBody .asi-block {font-size:15.5px;line-height:1.75;overflow-wrap:anywhere;}
@media(max-width:620px){
 #methodTabs {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:1px;}
 #methodTabs button {width:100%;min-height:48px;padding:9px 8px;white-space:normal;}
 #bonusMode {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;}
 #bonusMode button {min-height:48px;padding:10px 5px;}
 #lvlBody .bonus-mode {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;}
 #lvlBody .bonus-mode button {min-width:0;min-height:48px;white-space:normal;padding:9px 5px;}
 #lvlBody .lvl-ctl {flex-wrap:wrap;gap:9px;}
 #lvlBody .lvl-ctl .lvcap {flex:1 0 100%;margin-top:2px;}
}
@media print {
 .creator-preview-inline-panel,.creator-preview-inline-confirm {break-inside:avoid;}
}
`;
document.head.appendChild(style);
window.CreatorUX5R={beforeRender,afterRender,layout,beforeLevelRender,afterLevelRender};
})();
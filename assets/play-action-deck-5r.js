/* Character-owned combat spell projection: no new rules DB, no state mutation. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  if(root)root.PlayActionDeck5R=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const ORDER=["action","bonus","reaction","other"];
  const LABELS={action:"主要動作／魔法動作",bonus:"附贈動作",reaction:"反應",other:"較長／特殊施法時間"};
  function classify(time){
    const t=String(time||"").trim().replace(/\s+/g," ");
    if(!t||t==="—"||t==="-")return "other";
    if(/(?:^|\b)reaction\b|反應/i.test(t))return "reaction";
    if(/bonus\s*action|附贈動作/i.test(t))return "bonus";
    if(/^(?:1\s*|一個?\s*)?(?:魔法)?動作(?:$|[\s（(；,])|^(?:1\s*)?action(?:$|[\s(])/i.test(t))return "action";
    return "other";
  }
  function group(rows){
    const out={action:[],bonus:[],reaction:[],other:[]};
    const seen=new Set();
    for(const row of rows||[]){
      if(!row||!row.n)continue;
      const key=String(row.id||row.n).trim().toLowerCase();
      if(seen.has(key))continue;
      seen.add(key);
      const slot=classify(row.time);
      out[slot].push(row);
    }
    for(const k of ORDER)out[k].sort((a,b)=>(Number(a.lv)||0)-(Number(b.lv)||0)||String(a.n).localeCompare(String(b.n),"zh-Hant"));
    return out;
  }
  function render(rows,{escape=String}={}){
    const groups=group(rows);
    const shell=(r)=>{
      const label=(Number(r.lv)||0)===0?"戲法":String(r.lv)+" 環";
      const flags=[r.con?"專注":"",r.rit?"儀式":""].filter(Boolean).join(" · ");
      const badge=[label,r.time||"時間待核對",r.range||"",flags,r.src||""].filter(Boolean).map(escape).join(" · ");
      // Full description remains the existing spellSheetEntry projection, never a second summary.
      return '<details class="ps-ad-card" data-ps-action-spell="'+escape(r.id||r.n)+'"><summary><strong>'+escape(r.name||r.n)+'</strong><small>'+badge+'</small></summary><div class="ps-ad-full">'+(r.fullHtml||"")+'</div></details>';
    };
    return '<section id="psActions" class="ps-section ps-action-deck ps-jump-target" aria-label="行動與反應法術速查">'+
       '<h3>行動／附贈動作／反應</h3>'+
       '<p class="ps-ad-explain">依目前角色已準備、習得或特性授予的法術與正式施法時間整理；點開查看完整規則。僅供速查，不會自動消耗資源。</p>'+
       ORDER.map(key=>'<div class="ps-ad-group" data-ps-action-group="'+key+'"><h4>'+LABELS[key]+' <span>('+groups[key].length+')</span></h4>'+
          (groups[key].length?'<div class="ps-ad-list">'+groups[key].map(shell).join("")+'</div>':'<p class="ps-ad-empty">目前沒有此類法術</p>')+'</div>').join("")+
       '</section>';
  }
  return Object.freeze({ORDER,LABELS,classify,group,render});
});

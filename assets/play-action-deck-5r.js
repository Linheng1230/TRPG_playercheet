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
      const badge=[label,r.time||"時間待核對",r.range||"",r.src||""].filter(Boolean).map(escape).join(" · ");
      // The existing .ss-entry already contains the canonical quick facts, including
      // school, effect, time, range, duration, components, flags and bilingual title.
      // Remove just its popup trigger: the whole card summary now owns the click.
      const preview=String(r.fullHtml||"").replace(/class="sref" data-sref="[^"]*"/g,'class="ps-ad-static-name"')
        ||'<div class="ps-ad-fallback"><strong>'+escape(r.name||r.n)+'</strong><small>'+badge+'</small></div>';
      // Use original play-status counters; never create a second spell-use state.
      const shortcuts=[];
      if(r.freeResource)shortcuts.push('<button type="button" data-ps-jump="psResources">前往免費施法次數</button>');
      if(r.slotAvailable)shortcuts.push('<button type="button" data-ps-jump="psSlots">前往法術位計數器</button>');
      const usage=shortcuts.length?'<div class="ps-ad-usage"><p>施放後在原有計數器記錄消耗，這裡不另存使用次數。</p>'+shortcuts.join("")+'</div>':"";
      // Metadata appears once in the closed summary; opening reveals only the
      // existing canonical full rule and links back to the original resource counters.
      const rule=r.ruleHtml||'<p class="ps-ad-empty-rule">本法術尚無完整正文，請至法術圖鑑查看。</p>';
      return '<details class="ps-ad-card" data-ps-action-spell="'+escape(r.id||r.n)+'"><summary><div class="ps-ad-preview">'+preview+'</div><span class="ps-ad-cue"><span class="ps-ad-open-text">展開規則全文</span><span class="ps-ad-close-text">收起規則全文</span></span></summary><div class="ps-ad-full"><div class="ps-ad-rule">'+rule+'</div>'+usage+'</div></details>';
    };
    return '<section id="psActions" class="ps-section ps-action-deck ps-jump-target" aria-label="行動與反應法術速查">'+
       '<h3>行動／附贈動作／反應</h3>'+
       '<p class="ps-ad-explain">依目前角色已準備、習得或特性授予的法術與正式施法時間整理；點開查看完整規則。僅供速查，不會自動消耗資源。</p>'+
       ORDER.map(key=>'<details class="ps-ad-group" data-ps-action-group="'+key+'"'+(key==="other"?"":" open")+'><summary class="ps-ad-group-title"><strong>'+LABELS[key]+'</strong><span>（'+groups[key].length+'）</span></summary>'+
          (groups[key].length?'<div class="ps-ad-list">'+groups[key].map(shell).join("")+'</div>':'<p class="ps-ad-empty">目前沒有此類法術</p>')+'</details>').join("")+
       '</section>';
  }
  return Object.freeze({ORDER,LABELS,classify,group,render});
});

/* Compact 2024 cantrip tooltip. Existing spell data / rules remain canonical. */
(function(){
  "use strict";
  if(typeof spellTipHTML!=="function" || typeof spellDb!=="function")return;
  const original=spellTipHTML;
  const escape=s=>String(s??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const saveNames={strength:"力量",dexterity:"敏捷",constitution:"體質",intelligence:"智力",wisdom:"感知",charisma:"魅力"};
  const source=globalThis.CANTRIP_TOOLTIP_META_2024||{};
  const css=document.createElement("style");
  css.id="cantrip-tooltip-style";
  css.textContent=[
    "#spellTip.cantrip-compact{width:min(360px,calc(100vw - 16px));max-height:min(490px,calc(100dvh - 16px));padding:10px 12px;border-radius:9px;line-height:1.45;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}",
    "#spellTip.cantrip-compact .ct-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;border-bottom:1px solid #645039;padding:0 30px 7px 0}",
    "#spellTip.cantrip-compact .ct-name{font-size:16px;font-weight:750;color:#f0c76a;line-height:1.3}",
    "#spellTip.cantrip-compact .ct-sub{color:#d0bda0;font-size:11.5px;margin-top:2px}",
    "#spellTip.cantrip-compact .ct-switch{display:flex;gap:5px;flex-shrink:0}",
    "#spellTip.cantrip-compact .ct-switch button{min-height:30px;padding:5px 8px;background:#413125;color:#f7e5c8;border:1px solid #987c4d;border-radius:6px;font-size:12px;cursor:pointer}",
    "#spellTip.cantrip-compact .ct-switch button[aria-pressed=true]{background:#e0bb76;color:#251a11;font-weight:750}",
    "#spellTip.cantrip-compact .ct-facts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px;margin-top:8px}",
    "#spellTip.cantrip-compact .ct-fact{min-width:0;background:#342920;border:1px solid #544436;border-radius:5px;padding:5px 7px}",
    "#spellTip.cantrip-compact .ct-label{font-size:10px;color:#bda987;display:block;margin-bottom:2px}",
    "#spellTip.cantrip-compact .ct-value{font-size:12px;color:#fff0d5;overflow-wrap:anywhere}",
    "#spellTip.cantrip-compact .ct-row{margin-top:7px;padding:6px 8px;border-radius:5px;background:#342920;border:1px solid #544436;font-size:12px;color:#f9ebd5;overflow-wrap:anywhere}",
    "#spellTip.cantrip-compact .ct-row strong{color:#e6be78;display:block;font-size:11px;margin-bottom:3px}",
    "#spellTip.cantrip-compact .ct-note{color:#c6b596;font-size:11px;line-height:1.5;margin-top:6px}",
    "#spellTip.cantrip-compact .ct-full .tip-d{border-top:0;padding-top:2px;font-size:12.5px;line-height:1.6}",
    "#spellTip.cantrip-compact .ct-full .tip-d .sr-rule-block{margin-bottom:7px}",
    "#spellTip.cantrip-compact [hidden]{display:none!important}",
    "@media(max-width:390px){#spellTip.cantrip-compact{padding:9px 10px}#spellTip.cantrip-compact .ct-head{gap:5px}#spellTip.cantrip-compact .ct-name{font-size:15px}#spellTip.cantrip-compact .ct-switch button{padding:5px 7px}}"
  ].join("\n");
  document.head.appendChild(css);
  const fact=(name,value)=>'<div class="ct-fact"><span class="ct-label">'+escape(name)+'</span><div class="ct-value">'+escape(value)+'</div></div>';
  const row=(title,value)=>'<div class="ct-row"><strong>'+escape(title)+'</strong>'+escape(value)+'</div>';
  function materialText(raw,hasMaterial){
    if(!hasMaterial)return "無";
    if(typeof raw==="string"&&raw.trim())return raw.trim();
    if(raw && typeof raw==="object"){
      if(typeof raw.text==="string")return raw.text;
      if(typeof raw.m==="string")return raw.m;
    }
    return "有材料成分，請查閱完整法術資料";
  }
  function compactHTML(name){
    const lookup=normalizeSpellName2024(name);
    const sp=SPELLS.find(x=>x.n===lookup);
    if(!sp || sp.lv!==0)return null;
    const m=spellMetaDb()[sp.n]||{};
    const info=source[String(sp.eng||"").toLowerCase()];
    const material=materialText(info?.material,!!sp.signature?.c?.[2]);
    const saves=(info?.save||[]).map(x=>saveNames[x]||x);
    const atk=/近戰法術攻擊|遠端法術攻擊|法術攻擊檢定|攻擊檢定/.test(sp.d);
    const check=saves.length?saves.join("、")+"豁免":atk?"法術攻擊檢定":"依效果，無指定豁免";
    // The site's existing short synopsis is display-only; full mechanics remain in the Full tab.
    const tuple=globalThis.SPELLS_2024_TUPLES?.find(x=>x[2]===sp.eng && x[4]===0);
    const synopsis=tuple?.[13]||sp.d;
    const rangeText=sp.d.match(/(?:半徑\s*\d+\s*呎|\d+\s*呎(?:半徑)?(?:球狀|錐狀|立方|直線|範圍|光環))/u)?.[0];
    const full=original.call(this,sp.n);
    const fullBody=full.match(/<div class="tip-d">([\s\S]*)<\/div>\s*$/)?.[1]||formatSpellRuleHTML(sp.d);
    const title='<div class="ct-head"><div><div class="ct-name">'+escape(sp.n)+' <span style="font-size:11px;color:#d0bda0;font-weight:400">'+escape(sp.eng)+'</span></div><div class="ct-sub">戲法 · '+escape(m.school)+' · '+(sp.con?"專注":"非專注")+' · '+(sp.rit?"儀式":"非儀式")+'</div></div><div class="ct-switch"><button type="button" data-cantrip-mode="compact" aria-pressed="true">精簡</button><button type="button" data-cantrip-mode="full" aria-pressed="false">完整</button></div></div>';
    const facts='<div class="ct-facts">'+fact("施法時間",m.time||"—")+fact("施法距離",m.range||"—")+fact("影響範圍",rangeText||"見法術效果")+fact("持續時間",m.dur||"—")+fact("施法成分",displaySpellComponents2024(m.comp)||"—")+fact("攻擊／豁免",check)+'</div>';
    const compact='<div class="ct-summary">'+row("材料需求",material)+row("效果概覽",synopsis)+'<p class="ct-note">此欄為速覽；判定目標、限制、附帶效果及戲法強化時請切換「完整」。</p></div>';
    const details='<div class="ct-full" hidden><div class="ct-row"><strong>完整規則</strong><div class="tip-d">'+fullBody+'</div></div></div>';
    return title+facts+compact+details;
  }
  spellTipHTML=function(name){
    const supported=S.ruleset==="2024"&&SPELLS.some(sp=>sp.lv===0&&sp.n===normalizeSpellName2024(name));
    spellTip.classList.toggle("cantrip-compact",supported);
    return supported?compactHTML(name):original.call(this,name);
  };
  spellTip.addEventListener("click",e=>{
    const button=e.target.closest?.("button[data-cantrip-mode]");
    if(!button)return;
    e.preventDefault();e.stopPropagation();
    const full=button.dataset.cantripMode==="full";
    const root=spellTip;
    const compact=root.querySelector(".ct-summary"),detail=root.querySelector(".ct-full");
    if(!compact||!detail)return;
    compact.hidden=full;detail.hidden=!full;
    root.querySelectorAll("button[data-cantrip-mode]").forEach(el=>el.setAttribute("aria-pressed",String(el===button)));
    if(full)root.scrollTop=0;
  });
  globalThis.cantripTooltip2024Ready=true;
})();

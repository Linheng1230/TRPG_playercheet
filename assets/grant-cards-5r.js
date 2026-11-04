/* Shared 2024 grant-card adapter. Reuses the canonical SPELLS registry and existing spell tooltip contract. */
var ZIZI_SPELL_REF_MATCHER_2024=null;
var ZIZI_SPELL_REF_ALIAS_MAP_2024=null;
function spellRefIndex2024(){
  if(ZIZI_SPELL_REF_MATCHER_2024&&ZIZI_SPELL_REF_ALIAS_MAP_2024)return {re:ZIZI_SPELL_REF_MATCHER_2024,map:ZIZI_SPELL_REF_ALIAS_MAP_2024};
  var map=new Map();
  var add=function(alias,sp){alias=String(alias||"").trim();if(alias&&!map.has(alias))map.set(alias,sp)};
  SPELLS.forEach(function(sp){add(sp.n,sp);add(sp.eng,sp)});
  Object.entries(globalThis.SPELLS_2024_LEGACY_NAMES||{}).forEach(function(pair){var sp=SPELLS.find(function(x){return x.n===normalizeSpellName2024(pair[1])});if(sp)add(pair[0],sp)});
  Object.entries(SPELL_NAME_MIGRATIONS_2024||{}).forEach(function(pair){var sp=SPELLS.find(function(x){return x.n===normalizeSpellName2024(pair[1])});if(sp)add(pair[0],sp)});
  var aliases=Array.from(map.keys()).sort(function(a,b){return b.length-a.length}).map(function(x){return x.replace(/[.*+?^$()|[\]\\{}]/g,"\\$&")});
  ZIZI_SPELL_REF_ALIAS_MAP_2024=map;
  ZIZI_SPELL_REF_MATCHER_2024=aliases.length?new RegExp(aliases.join("|"),"gu"):null;
  return {re:ZIZI_SPELL_REF_MATCHER_2024,map:map};
}
function spellFromGrant2024(raw){
  if(S.ruleset!=="2024")return null;
  if(raw&&typeof raw==="object"&&raw.n){var n=normalizeSpellName2024(raw.n);return SPELLS.find(function(x){return x.n===n})||null}
  var key=String(raw||"").trim(),canon=normalizeSpellName2024(key);
  return SPELLS.find(function(x){return x.n===canon||String(x.eng||"").toLowerCase()===key.toLowerCase()})||null;
}
function spellReferenceContext2024(text,start,end){
  var left=Math.max(0,Math.max(text.lastIndexOf("。",start-1),text.lastIndexOf("；",start-1),text.lastIndexOf(";",start-1),text.lastIndexOf("\n",start-1))+1);
  var stops=["。","；",";","\n"].map(function(x){var i=text.indexOf(x,end);return i<0?text.length:i});
  var right=Math.min.apply(Math,stops);
  var clause=text.slice(left,right);
  return /(?:習得|知曉|準備|施放|法術|戲法|咒語|法表)/u.test(clause);
}
function spellRefsFromText2024(raw){
  if(S.ruleset!=="2024")return [];
  var text=String(raw||""),idx=spellRefIndex2024(),re=idx.re,map=idx.map;
  if(!re)return [];
  var out=[],seen=new Set(),m;re.lastIndex=0;
  while((m=re.exec(text))){var sp=map.get(m[0]);if(sp&&spellReferenceContext2024(text,m.index,m.index+m[0].length)&&!seen.has(sp.n)){seen.add(sp.n);out.push(sp)}}
  re.lastIndex=0;return out;
}
function spellLinkedTextHTML2024(raw){
  var text=String(raw||"");if(S.ruleset!=="2024")return escFeatureHTML(text);
  var idx=spellRefIndex2024(),re=idx.re,map=idx.map;if(!re)return escFeatureHTML(text);
  var h="",at=0,m;re.lastIndex=0;
  while((m=re.exec(text))){
    h+=escFeatureHTML(text.slice(at,m.index));
    var sp=map.get(m[0]),link=sp&&spellReferenceContext2024(text,m.index,m.index+m[0].length);
    h+=link?'<span class="sref" tabindex="0" data-sref="'+escFeatureHTML(sp.n)+'">'+spellNameHTML(sp)+'</span>':escFeatureHTML(m[0]);
    at=m.index+m[0].length;
  }
  re.lastIndex=0;return h+escFeatureHTML(text.slice(at));
}
function grantedSpellCardHTML2024(spOrName,meta){
  meta=meta||{};var sp=spellFromGrant2024(spOrName);if(!sp)return "";
  var details=[sp.lv?sp.lv+" 環":"戲法",meta.src||"",meta.note||""].filter(Boolean).join(" · ");
  return '<div class="grant-spell-card" data-grant-spell="'+escFeatureHTML(sp.n)+'"><div class="grant-name"><span class="sref" tabindex="0" data-sref="'+escFeatureHTML(sp.n)+'">'+spellNameHTML(sp)+'</span></div><div class="grant-meta">'+escFeatureHTML(details)+'</div><div class="grant-desc">'+escFeatureHTML(sp.d||"")+'</div></div>';
}
function grantedSpellGridHTML2024(grants,title){
  if(S.ruleset!=="2024")return "";
  var seen=new Set(),cards=[];title=title||"授予法術";
  (grants||[]).forEach(function(g){var sp=spellFromGrant2024(g);if(!sp||seen.has(sp.n))return;seen.add(sp.n);cards.push(grantedSpellCardHTML2024(sp,g&&typeof g==="object"?g:{}))});
  return cards.length?'<div class="grant-spell-section"><div class="grant-spell-title">'+escFeatureHTML(title)+'</div><div class="grant-spell-grid">'+cards.join("")+'</div></div>':"";
}
function grantSpellsFromRuleText2024(raw){
  var text=String(raw||"");
  if(!/(?:習得|獲得|恆定準備|總是準備|視為已準備|免費施放|可以施放|可施放|能夠施放|施放一次)/u.test(text))return [];
  return spellRefsFromText2024(text);
}
(function(){
  var style=document.createElement("style");
  style.textContent="#refTabs.method-tabs{border-color:#b9a57e}#refTabs.method-tabs button{background:#f6efdd;color:#5e5243;border-right-color:#b9a57e}#refTabs.method-tabs button.active{background:#9a433b;color:#f7f1e1}.ability-ref-tools input{border-color:#a58d63!important;background:#fbf7ec!important;color:#4a4035!important}.ability-ref-tools input::placeholder{color:#7a6f60;opacity:1}.ability-ref-modes button,.ability-ref-actions button{border-color:#a58d63!important;background:#f6efdd!important;color:#5e5243!important}.ability-ref-modes button.active,.ability-ref-actions button.active{background:#9a433b!important;color:#f7f1e1!important;border-color:#7f342e!important}.ability-ref-note{color:#6a5f52!important}.grant-spell-section{margin-top:10px}.grant-spell-title{font-size:12px;font-weight:800;color:#7f241f;margin:0 0 6px}.grant-spell-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:7px}.grant-spell-card{border:1px solid #b7a27b;background:#fff8e8;padding:8px 10px;border-radius:6px;min-width:0}.grant-spell-card .grant-name{font-weight:700;line-height:1.4}.grant-spell-card .grant-meta{font-size:11.5px;color:#6a5f52;margin-top:3px}.grant-spell-card .grant-desc{font-size:12px;color:#5e5243;line-height:1.55;margin-top:4px}.grant-spell-card .sref{display:inline;border-bottom:1px dotted #8f2722;color:#4a4035}@media(max-width:520px){.grant-spell-grid{grid-template-columns:1fr}}";
  document.head.appendChild(style);
})();
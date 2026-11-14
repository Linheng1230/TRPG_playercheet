/* D&D 5R (2024) 傷害抗性速查。只提供查詢與教學，不修改角色傷害或存檔。 */
const RESISTANCE_DAMAGE_TYPES_5R = Object.freeze([
  ["bludgeoning","鈍擊","Bludgeoning","物理","錘子、棍棒、墜落或擠壓造成的鈍力傷害。"],
  ["piercing","穿刺","Piercing","物理","箭矢、長矛、尖牙等刺入身體的傷害。"],
  ["slashing","揮砍","Slashing","物理","刀劍、斧頭、利爪等切割的傷害；有時也稱斬擊或劈砍。"],
  ["acid","酸蝕","Acid","元素","強酸、腐蝕性液體或消化液造成的傷害。"],
  ["cold","寒冷","Cold","元素","冰息、極寒水域、刺骨寒氣造成的傷害。"],
  ["fire","火焰","Fire","元素","火焰、炙熱與灼燒造成的傷害。"],
  ["lightning","閃電","Lightning","元素","雷電或電流造成的傷害。"],
  ["poison","毒素","Poison","元素","毒液、有毒氣體等造成的毒素傷害；和「中毒」狀態不是同一回事。"],
  ["thunder","雷鳴","Thunder","元素","強烈聲波、衝擊波與震盪造成的傷害；不是閃電傷害。"],
  ["force","力場","Force","特殊","純粹的魔法能量造成的傷害，並非一般碰撞的鈍擊。"],
  ["necrotic","黯蝕","Necrotic","特殊","吸取生命活力、枯萎生命的魔法傷害。"],
  ["psychic","心靈","Psychic","特殊","精神、意識或心智受到衝擊的傷害。"],
  ["radiant","光耀","Radiant","特殊","神聖光能或炙烈輻射造成的傷害。"]
]);
let resistanceFilter5R = "全部";
function renderResistanceRef5R(){
  const esc = typeof escFeatureHTML==="function" ? escFeatureHTML : function(value){return String(value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]})};
  const filters=["全部","物理","元素","特殊"];
  const visible=RESISTANCE_DAMAGE_TYPES_5R.filter(function(x){return resistanceFilter5R==="全部"||x[3]===resistanceFilter5R});
  const cards=visible.map(function(x){
    return '<details class="res5r-card"><summary><span class="res5r-title">'+esc(x[1])+'<small>'+esc(x[2])+'</small></span><span class="res5r-rule">此類傷害減半</span></summary><div class="res5r-detail"><p>'+esc(x[4])+'</p><p>若你具有<strong>'+esc(x[1])+'傷害抗性</strong>，受到這一種類型的傷害時，傷害減半並無條件捨去小數。其他類型的傷害不會因此減少。</p></div></details>';
  }).join("");
  return '<section class="res5r-reference" aria-label="傷害抗性速查">'+
    '<div class="res5r-lead"><h3>抗性（Resistance）是什麼？</h3><p>具有某種<strong>傷害抗性</strong>，代表受到<strong>該類型</strong>傷害時，傷害<strong>減半，無條件捨去小數</strong>。抗性不等於完全不受傷害，也不會自動給予豁免優勢或免疫對應狀態。</p>'+
    '<div class="res5r-example"><span>範例：15 點寒冷傷害</span><strong>有寒冷抗性 → 實際受到 7 點</strong></div></div>'+
    '<div class="res5r-basics" aria-label="抗性免疫易傷比較"><div><b>抗性 Resistance</b><span>指定傷害 ÷ 2（捨去小數）</span></div><div><b>免疫 Immunity</b><span>指定傷害 = 0</span></div><div><b>易傷 Vulnerability</b><span>指定傷害 × 2</span></div></div>'+
    '<h3>13 種傷害類型</h3><p class="res5r-help">傷害類型本身不會額外施加狀態。點擊任一類型，可展開範例與抗性說明。</p>'+
    '<div class="res5r-filters" role="group" aria-label="篩選傷害類型">'+filters.map(function(f){return '<button type="button" data-res5r-filter="'+esc(f)+'" aria-pressed="'+(f===resistanceFilter5R)+'" class="'+(f===resistanceFilter5R?'active':'')+'">'+esc(f)+(f==="全部"?'（13）':'')+'</button>'}).join("")+'</div>'+
    '<div class="res5r-grid">'+cards+'</div>'+
    '<div class="res5r-extra"><h3>常見判定問題</h3><p><strong>多個相同抗性不疊加：</strong>同時有兩個火焰抗性，也只減半一次，不會變成四分之一。</p>'+
    '<p><strong>混合傷害分開計算：</strong>一次攻擊造成 20 點鈍擊＋8 點火焰，只有鈍擊抗性時，實際受到 10＋8＝18 點。</p>'+
    '<p><strong>計算順序：</strong>先處理加減值及其他傷害調整，再套用抗性，最後套用易傷。例如 28 點火焰傷害先減 5 點，再因抗性減半為 11，最後因易傷加倍為 22 點。</p>'+
    '<p><strong>抗性只適用條文明定的範圍：</strong>例如「鈍擊、穿刺、揮砍抗性」只對這三種傷害生效；只有文字寫出「非魔法攻擊」等限制時，才額外依該限制判定。</p>'+
    '<p><strong>狀態與傷害分開：</strong>毒素傷害抗性不代表免疫中毒狀態；寒冷傷害抗性也不代表不受其他特殊效果影響。</p></div>'+
    '<p class="res5r-source">規則依據：<a href="https://www.dndbeyond.com/sources/dnd/br-2024/playing-the-game" target="_blank" rel="noopener noreferrer">2024 Free Rules：傷害與抗性</a>、<a href="https://www.dndbeyond.com/sources/dnd/br-2024/rules-glossary" target="_blank" rel="noopener noreferrer">13 種傷害類型</a>。此區為 2024／5R 教學，不會改變 2014 角色資料。</p>'+
    '</section>';
}
document.addEventListener("click",function(e){
  const button=e.target.closest&&e.target.closest("[data-res5r-filter]");
  if(!button||!document.getElementById("refBody")?.contains(button))return;
  const next=button.getAttribute("data-res5r-filter");
  if(!["全部","物理","元素","特殊"].includes(next))return;
  resistanceFilter5R=next;
  if(typeof renderRef==="function")renderRef();
});
(function(){
  const style=document.createElement("style");
  style.textContent='.res5r-reference{display:grid;gap:14px;min-width:0;color:#403126;font-family:"PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;font-size:16px;line-height:1.8}.res5r-reference h3{margin:0;font-size:18px;line-height:1.4;color:#512e28}.res5r-reference p{margin:0;max-width:72ch}.res5r-lead,.res5r-extra{display:grid;gap:10px;padding:16px;border:1px solid #a58d63;background:#faf2e3}.res5r-example{display:flex;gap:6px 20px;justify-content:space-between;flex-wrap:wrap;padding:10px 12px;border-left:4px solid #803f33;background:#f0e1cc}.res5r-example strong{color:#78332c}.res5r-basics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.res5r-basics>div{min-width:0;display:grid;align-content:start;gap:5px;border:1px solid #ad9675;padding:12px;background:#fbf6eb}.res5r-basics b{font-size:15px;color:#61362c}.res5r-basics span{font-size:14px;line-height:1.6}.res5r-help{color:#49382e;font-size:15px}.res5r-filters{display:flex;flex-wrap:wrap;gap:8px}.res5r-filters button{font:inherit;font-size:15px;line-height:1.4;min-height:42px;padding:9px 15px;border:1px solid #967451;border-radius:3px;background:#fcf7eb;color:#4a342a;cursor:pointer}.res5r-filters button.active,.res5r-filters button[aria-pressed=true]{background:#803f33;border-color:#803f33;color:#fff}.res5r-filters button:focus-visible,.res5r-card summary:focus-visible{outline:3px solid #936d37;outline-offset:2px}.res5r-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;align-items:start}.res5r-card{min-width:0;border:1px solid #ad9675;background:#fdf8ee}.res5r-card summary{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer;padding:12px 14px;min-height:62px;list-style-position:inside}.res5r-title{font-size:17px;font-weight:700;color:#472d24}.res5r-title small{display:block;font-size:13px;font-weight:400;line-height:1.4;color:#685142}.res5r-rule{font-size:14px;line-height:1.4;white-space:nowrap;color:#803f33;font-weight:700}.res5r-detail{border-top:1px solid #d8c5a7;padding:12px 14px;display:grid;gap:8px;font-size:15.5px;line-height:1.8}.res5r-source{font-size:13px;color:#49382e;overflow-wrap:anywhere}.res5r-source a{color:#6f332a;text-decoration:underline}@media(max-width:700px){.res5r-basics{grid-template-columns:1fr}.res5r-grid{grid-template-columns:1fr}.res5r-reference{font-size:15.5px}.res5r-lead,.res5r-extra{padding:12px}.res5r-card summary{min-height:52px}}@media(max-width:390px){.res5r-card summary{flex-wrap:wrap}.res5r-rule{white-space:normal}}';
  document.head.appendChild(style);
})();

/* Play Status projection of the creature IDs already stored on the character sheet. */
(function(){
"use strict";
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const data=()=>window.ZIZI_5R_CREATURES||[];
const find=id=>data().find(x=>x.id===id);
const zh=x=>(window.ZIZI_5R_CREATURES_ZH||{})[x.id]||{};
const signed=n=>(n>=0?"+":"")+n;
const speedNames={walk:"步行",fly:"飛行",swim:"游泳",climb:"攀爬",burrow:"挖掘"};
const speed=x=>Object.entries(x.speed||{}).map(([k,v])=>(speedNames[k]||k)+" "+v+" 呎").join("／")||"—";
function field(name,value){return '<div class="psc-stat"><small>'+esc(name)+'</small><b>'+esc(value)+'</b></div>'}
function rules(x){
 const z=zh(x);
 const blocks=[["特性",z.traitsZh],["動作",z.actionsZh],["附贈動作",z.bonusZh],["反應",z.reactionsZh]]
 .map(([name,items])=>Array.isArray(items)&&items.length?'<h5>'+esc(name)+'</h5>'+items.map(y=>'<div class="psc-rule"><b>'+esc(y.h||"")+'</b><p>'+esc(y.t||"")+'</p></div>').join(""):"").join("");
 return '<details class="psc-rules"><summary>展開原始規則與動作</summary><div class="psc-rule-content">'+blocks+'</div></details>';
}
function card(kind,x,s,extra={}){
 const z=zh(x),m=kind==="companion"?window.CreatureImport5R?.primalCompanionStats5R(x,s):null;
 const ready=!!m?.ready;
 const stats=ready?[
   field("AC",m.ac),field("生命值",m.hp),field("速度",speed(x)),
   field("野獸打擊命中",signed(m.hit)),field("命中傷害",m.damageDie+" "+signed(m.damageFlat)),field("法術豁免 DC",m.dc)
 ]:[
   field("AC",z.acZh||x.ac||"—"),
   field(kind==="wildShape"?"野獸原始 HP":"生命值",z.hpZh||x.hpSpecial||x.hp||"—"),
   field("速度",speed(x)),field("被動察覺",x.passive??"—")
 ];
 let note="";
 if(kind==="wildShape")note=window.CreatureImport5R?.wildEligible(s,x)?"已記錄的荒野變形形態；原始野獸 HP 不取代玩家 HP。":"此形態目前不符合荒野變形資格，僅保留速查。";
 else if(kind==="companion")note=ready?"依遊俠 "+m.level+" 級、熟練 "+signed(m.proficiency)+"、感知 "+signed(m.wisdom)+" 即時計算。":"請先完成遊俠等級與感知數值，以便計算原初夥伴。";
 else if(kind==="familiar")note=(extra.status||"在場")+(extra.valid===false?"；目前不符合此魔寵形態資格。":"；普通魔寵不能攻擊，仍須遵守《尋獲魔寵》限制。");
 else if(kind==="mount")note="坐騎是否可騎乘、是否受訓與指揮方式由 DM 裁定。";
 else if(kind==="summon")note="召喚法術："+(extra.spell||"")+"；是否可召喚及指揮依正式法術規則。";
 const provenance=ready?'<div class="psc-derived">來源：AC '+m.acBase+' + 感知 '+signed(m.wisdom)+'；HP '+m.hpBase+' + '+m.hpPer+' × 遊俠等級；命中 熟練 '+signed(m.proficiency)+' + 感知 '+signed(m.wisdom)+'；傷害 '+m.damageDie+' + '+m.damageBase+' + 感知 '+signed(m.wisdom)+'。</div>':"";
 return '<article class="psc-card" data-psc-kind="'+esc(kind)+'" data-psc-id="'+esc(x.id)+'">'+
  '<div class="psc-head"><div><h4>'+esc(z.nameZh||x.name)+'</h4><small>'+esc(x.name)+' · '+esc(x.source||"")+(x.page?" · p."+esc(x.page):"")+'</small></div>'+
  '<button type="button" data-ps-action="creature" data-ps-kind="'+esc(kind)+'" data-ps-id="'+esc(x.id)+'">角色卡詳情</button></div>'+
  '<div class="psc-grid">'+stats.join("")+'</div><p class="psc-note">'+esc(note)+'</p>'+provenance+rules(x)+'</article>';
}
function group(title,items){return items.length?'<div class="psc-group"><h4>'+esc(title)+' <small>（'+items.length+'）</small></h4>'+items.join("")+'</div>':""}
function render(s){
 if(!s?.cls)return "";
 const v=s.creatureLibrary||{},fam=s.familiar&&find(s.familiar.creatureId);
 const wild=(Array.isArray(v.wildShape)?v.wildShape:[]).map(find).filter(Boolean);
 const mounts=(Array.isArray(v.mounts)?v.mounts:[]).map(find).filter(Boolean);
 const summons=(Array.isArray(v.summons)?v.summons:[]).map(r=>({x:find(r?.creatureId),spell:r?.spell})).filter(t=>t.x);
 const companion=window.CreatureImport5R?.selectedCompanion(s);
 const isDruid=s.ruleset==="2024"&&s.cls.n==="德魯伊";
 const isRanger=s.ruleset==="2024"&&s.cls.n==="遊俠"&&s.level>=3;
 const fk=fam&&typeof prFamiliarKind==="function"?prFamiliarKind(fam):"";
 const valid=!!fam&&s.ruleset==="2024"&&(fk==="normal"||(fk==="chain"&&!!window.WarlockFamiliar?.permission(s)));
 const status={present:"在場",dismissed:"暫時遣返",gone:"已消失"};
 const content=[];
 if(s.ruleset==="2024"){
  content.push(group("荒野變形",wild.map(x=>card("wildShape",x,s))));
  if(isDruid&&!wild.length)content.push('<p class="psc-note">荒野變形：尚未導入已知形態。</p>');
  content.push(group("獸王原初夥伴",companion?[card("companion",companion,s)]:[]));
  if(isRanger&&!companion)content.push('<p class="psc-note">獸王夥伴：尚未選定形態。</p>');
  content.push(group("魔寵／使魔",fam?[card("familiar",fam,s,{status:status[s.familiar.status]||"在場",valid})]:[]));
  content.push(group("坐騎",mounts.map(x=>card("mount",x,s))));
  content.push(group("召喚生物參考",summons.map(({x,spell})=>card("summon",x,s,{spell}))));
 }else content.push('<p class="psc-note">目前的生物導入紀錄採用 2024 資料來源；不會自動把 2024 野獸能力套用到 2014 角色。</p>');
 const count=wild.length+mounts.length+summons.length+(fam?1:0)+(companion?1:0);
 return '<section class="ps-section psc-section" id="psCreatures"><h3>生物／夥伴／坐騎 <small>已記錄 '+count+' 筆</small></h3>'+
 '<p class="psc-intro">同步角色卡已選擇的生物來源，數值不另存副本；展開可查看原始規則。</p>'+
 content.join("")+'<button type="button" data-ps-action="creatureImport">前往工具速查新增生物</button></section>';
}
const css=document.createElement("style");
css.textContent=[
'.psc-section h3 small{font-size:12px;font-weight:400}',
'.psc-intro,.psc-note{font:14px/1.7 "PingFang TC","Microsoft JhengHei",sans-serif;color:#46372c;margin:7px 0 10px}',
'.psc-group{margin:12px 0 18px}.psc-group>h4{font-size:16px;color:#6d3328;margin:7px 0 10px}.psc-group>h4 small{font-size:12px}',
'.psc-card{border:1px solid #cbb48f;background:#fffdf6;border-radius:9px;padding:11px;margin:9px 0;min-width:0}',
'.psc-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}',
'.psc-head h4{font-size:16px;margin:0;color:#332720}.psc-head small{font-size:12px;color:#695643;line-height:1.5}',
'.psc-head button{min-height:40px;font-size:13px}',
'.psc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:9px 0}',
'.psc-stat{border:1px solid #e0d0b9;padding:6px 8px;border-radius:5px;min-width:0;overflow-wrap:anywhere}',
'.psc-stat small{display:block;color:#715740;font-size:12px}.psc-stat b{font-size:18px;color:#6d2d23}',
'.psc-derived{font:13px/1.7 "PingFang TC","Microsoft JhengHei",sans-serif;color:#46382d;border-left:2px solid #997a59;padding:7px 10px;background:#fbf2e1}',
'.psc-rules{margin-top:9px;border-top:1px solid #dbc9a7;padding-top:8px}.psc-rules summary{cursor:pointer;min-height:38px;font-weight:700;padding-top:6px}',
'.psc-rule-content{max-width:70ch}.psc-rule-content h5{font-size:15px;margin:9px 0 3px}',
'.psc-rule{font:15px/1.8 "PingFang TC","Microsoft JhengHei",sans-serif;margin:5px 0}.psc-rule p{margin:2px 0 7px;overflow-wrap:anywhere}',
'@media(min-width:720px){.psc-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}',
'@media(max-width:400px){.psc-head button{width:100%}}'
].join('');
document.head.appendChild(css);
/* 跑團狀態：以現有畫面標題產生捷徑，不保存任何第二份遊戲狀態。 */
const jumpStyle=document.createElement("style");
jumpStyle.textContent=[
 '.ps-root .ps-jump-nav{position:sticky;top:var(--ps-jump-top,0px);z-index:90;box-sizing:border-box;width:100%;margin:0 0 12px;padding:7px;background:#f0e4ce;border:1px solid #bda382;border-radius:9px;box-shadow:0 3px 12px rgba(44,29,17,.16)}',
 '.ps-root .ps-jump-scroll{display:flex;gap:7px;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:thin;-webkit-overflow-scrolling:touch;touch-action:pan-x;scroll-padding-inline:5px}',
 '.ps-root .ps-jump-nav button{flex:0 0 auto;white-space:nowrap;min-height:44px;padding:9px 12px;border:1px solid #a58966;border-radius:7px;background:#fffaf0;color:#503020;font-size:14px;font-weight:700;scroll-snap-align:start}',
 '.ps-root .ps-jump-nav button[aria-current="location"]{background:#71352c;color:#fff8e9;border-color:#71352c}',
 '.ps-root .ps-jump-nav button:focus-visible{outline:3px solid #b46729;outline-offset:1px}',
 '@media(max-width:480px){.ps-root .ps-jump-nav{margin-bottom:10px;padding:6px}.ps-root .ps-jump-nav button{padding:8px 11px}}'
].join("");
document.head.appendChild(jumpStyle);
function initPlayStatusJumpNav(){
 const root=document.getElementById("playStatusBody");
 if(!root)return;
 const fixedHeight=()=>document.querySelector("nav.steps")?.getBoundingClientRect().height||0;
 const align=()=>{
  const nav=root.querySelector(":scope > .ps-jump-nav");
  if(nav)nav.style.setProperty("--ps-jump-top",Math.ceil(fixedHeight())+"px");
 };
 const mount=()=>{
  if(root.querySelector(":scope > .ps-jump-nav")){align();return}
  const stats=root.querySelector(":scope > .ps-stats");
  if(!stats)return; // 尚未創角，沒有可定位的數值。
  const items=[["總覽",stats]];
  const add=(label,target)=>{if(target)items.push([label,target])};
  for(const section of root.querySelectorAll(":scope > .ps-section")){
   const heading=section.querySelector(":scope > h3");
   if(!heading)continue;
   const name=(heading.firstChild?.textContent||heading.textContent||"").trim();
   if(/屬性調整值/.test(name)){add("屬性調整值",section);continue}
   if(/生命值.*生命骰/.test(name)){
    add("生命值",section);
    const dice=Array.from(section.querySelectorAll(".ps-line")).find(el=>/^生命骰/.test(el.querySelector("b")?.textContent?.trim()||""));
    add("生命骰",dice||section);
    continue;
   }
   if(/死亡豁免/.test(name)){
    add("死亡豁免",section);
    const inspiration=Array.from(section.querySelectorAll(".ps-line")).find(el=>/英雄(?:靈感|激勵)/.test(el.textContent||""));
    add("英雄激勵",inspiration||section);
    continue;
   }
   add(name.replace(/英雄靈感/g,"英雄激勵"),section);
  }
  if(items.length<2)return;
  const nav=document.createElement("nav"),scroll=document.createElement("div");
  nav.className="ps-jump-nav";
  nav.setAttribute("aria-label","跑團狀態區塊快捷導覽");
  scroll.className="ps-jump-scroll";
  for(const [label,target] of items){
   const btn=document.createElement("button");
   btn.type="button";btn.textContent=label;
   btn.setAttribute("aria-label","前往"+label);
   btn.addEventListener("click",()=>{
    align();
    for(const old of scroll.querySelectorAll('button[aria-current]'))old.removeAttribute("aria-current");
    btn.setAttribute("aria-current","location");
    const top=window.scrollY+target.getBoundingClientRect().top-fixedHeight()-nav.getBoundingClientRect().height-12;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top:Math.max(0,top),behavior:reduced?"auto":"smooth"});
   });
   scroll.appendChild(btn);
  }
  nav.appendChild(scroll);
  root.insertBefore(nav,stats);
  align();
 };
 new MutationObserver(mount).observe(root,{childList:true});
 window.addEventListener("resize",align,{passive:true});
 mount();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initPlayStatusJumpNav,{once:true});
else initPlayStatusJumpNav();

window.PlayStatusCreatures5R={render};
})();
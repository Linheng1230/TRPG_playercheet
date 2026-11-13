/* Creature reference -> character sheet. Stats stay in pinned ZIZI_5R_CREATURES and zh projection. */
(function(){
"use strict";
const TYPES={str:"力量",dex:"敏捷",con:"體質",int:"智力",wis:"感知",cha:"魅力"};
const SPEED={walk:"步行",fly:"飛行",swim:"游泳",climb:"攀爬",burrow:"挖掘"};
const ESC=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const creatures=()=>window.ZIZI_5R_CREATURES||[];
const byId=id=>creatures().find(x=>x.id===id);
const zh=x=>(window.ZIZI_5R_CREATURES_ZH||{})[x.id]||{};
const label=x=>((zh(x).nameZh||x.name)+"｜"+x.name);
const lib=s=>s.creatureLibrary||(s.creatureLibrary={wildShape:[],summons:[],mounts:[]});
const druidLevel=s=>s.ruleset==="2024"&&s.cls?.n==="德魯伊"?(+s.level||0):0;
const rangerLevel=s=>s.ruleset==="2024"&&s.cls?.n==="遊俠"?(+s.level||0):0;
function subclass(s){const p=typeof PROG_2024!=="undefined"?PROG_2024[s.cls?.n]:null;return s.sub!=null?(p?.subs?.[s.sub]?.n||""):"";}
const moon=s=>druidLevel(s)>=3&&subclass(s)==="月亮結社";
function wildLimit(s){const l=druidLevel(s);return l<2?0:l>=8?8:l>=4?6:4;}
function wildEligible(s,x){const l=druidLevel(s);return !!x&&l>=2&&(moon(s)?x.wildMoonMin!=null&&x.wildMoonMin<=l:x.wildBaseMin!=null&&x.wildBaseMin<=l);}
function companionEligible(s,x){return rangerLevel(s)>=3&&subclass(s)==="獸王"&&!!x&&x.source==="XPHB"&&!!x.summonedByClass&&String(x.summonedByClass).startsWith("Ranger");}
function familiarEligible(s,x){
 if(s.ruleset!=="2024"||!s.cls||!x)return false;
 return typeof prFamiliarKind==="function"&&(prFamiliarKind(x)==="normal"||(prFamiliarKind(x)==="chain"&&!!window.WarlockFamiliar?.permission(s)));
}
function summonSpellNames(x){
 const a=[x.summonedBySpell].concat(x.spellRefs||[]).map(s=>String(s||"").split("|")[0].trim()).filter(s=>s&&s!=="Find Familiar");
 return [...new Set(a)];
}
function normalize(raw){
 const v=raw&&typeof raw==="object"?raw:{},uniq=(items,max,pred)=>{
  const seen=new Set();
  return (Array.isArray(items)?items:[]).slice(0,70).map(String).filter(id=>{
   const x=byId(id);if(!x||seen.has(id)||!pred(x)||seen.size>=max)return false;seen.add(id);return true;
  });
 };
 const wildShape=uniq(v.wildShape,12,x=>x.isBeast&&!x.isSwarm);
 const mounts=uniq(v.mounts,12,x=>!!x.mountCandidate||String(x.summonedBySpell||"").startsWith("Find Steed"));
 const seen=new Set(),summons=[];
 for(const r of (Array.isArray(v.summons)?v.summons:[]).slice(0,60)){
  if(!r||typeof r!=="object")continue;
  const x=byId(String(r.creatureId||"")),spell=String(r.spell||"").slice(0,90);
  const key=x?.id+"|"+spell;
  if(!x||!summonSpellNames(x).includes(spell)||seen.has(key)||summons.length>=16)continue;
  summons.push({creatureId:x.id,spell});seen.add(key);
 }
 return {wildShape,summons,mounts};
}
function selectedCompanion(s){
 const text=s.classChoices2024?.["遊俠"]?.primalBeast||"";
 return creatures().find(x=>x.source==="XPHB"&&x.summonedByClass&&(zh(x).nameZh===text));
}
function wildShapeBlockReason(s,x){
 const level=druidLevel(s),isMoon=moon(s);
 if(!x.isBeast||x.isSwarm)return "荒野變形僅限非群集野獸";
 const required=isMoon?x.wildMoonMin:x.wildBaseMin;
 if(wildEligible(s,x))return "";
 if(level<2)return "需德魯伊 2 級";
 if(x.hasFly&&level<8&&required!=null&&required<=8)return "有飛行速度，需德魯伊 8 級";
 if(required!=null&&level<required){
  if(x.hasFly&&level<8)return "飛行需 8 級；CR "+x.cr+" 需"+(isMoon?"月亮結社 ":"德魯伊 ")+required+" 級";
  if(isMoon)return "CR "+x.cr+"，月亮結社需 "+required+" 級";
  return "CR "+x.cr+"：一般需 "+required+" 級"+(x.wildMoonMin!=null&&x.wildMoonMin<required?"／月亮結社 "+x.wildMoonMin+" 級":"");
 }
 if(!isMoon&&x.wildBaseMin==null&&x.wildMoonMin!=null)return (x.hasFly?"具飛行速度；":"")+"CR "+x.cr+"，僅月亮結社 "+x.wildMoonMin+" 級以上";
 if(level<2)return "需德魯伊 2 級";
 return "此形態超出目前變形資格";
}
function info(kind,x,s,spell){
 if(!s.cls)return "請先在角色建立區選擇職業";
 if(s.ruleset!=="2024")return "此導入流程目前僅適用 2024 規則";
 if(kind==="familiar"&&!familiarEligible(s,x))return "特殊魔寵需要契術師的鎖鏈魔契";
 if(kind==="wildShape"&&!wildEligible(s,x))return wildShapeBlockReason(s,x);
 if(kind==="companion"&&!companionEligible(s,x))return "需要 2024 獸王遊俠 3 級及對應原初夥伴";
 if(kind==="summon"&&!summonSpellNames(x).includes(spell))return "此生物沒有對應的召喚法術參照";
 if(kind==="mount"&&!x.mountCandidate)return "此生物並非大型野獸坐騎候選";
 return "";
}
function imported(kind,x,s,spell){
 const v=lib(s);
 if(kind==="familiar")return s.familiar?.creatureId===x.id;
 if(kind==="wildShape")return v.wildShape.includes(x.id);
 if(kind==="companion")return selectedCompanion(s)?.id===x.id;
 if(kind==="summon")return v.summons.some(t=>t.creatureId===x.id&&t.spell===spell);
 if(kind==="mount")return v.mounts.includes(x.id);
 return false;
}
function add(kind,id,spell){
 if(typeof S==="undefined"||!S.cls){alert("請先建立角色並選擇職業。");return false;}
 const x=byId(id),s=S;if(!x)return false;
 const reason=info(kind,x,s,spell);if(reason){alert(reason);return false;}
 const v=lib(s);
 if(imported(kind,x,s,spell)){go(7);return true;}
 if(kind==="familiar"){
  if(s.familiar?.creatureId&&s.familiar.creatureId!==x.id&&!confirm("確定以新魔寵形態替換角色卡上的舊魔寵紀錄？"))return false;
  s.familiar={creatureId:x.id,nickname:"",spirit:s.familiar?.spirit||"fey",notes:s.familiar?.notes||"",status:"present"};
 }else if(kind==="wildShape"){
  if(v.wildShape.length>=wildLimit(s)){alert("已達這個德魯伊等級可記錄的荒野變形已知形態數量，請先移除一項。");return false;}
  v.wildShape.push(x.id);
 }else if(kind==="companion"){
  const previous=selectedCompanion(s);
  if(previous&&previous.id!==x.id&&!confirm("確定更換目前的原初夥伴資料卡？"))return false;
  if(typeof classChoiceStore2024!=="function")return false;
  classChoiceStore2024("遊俠").primalBeast=zh(x).nameZh;
 }else if(kind==="summon"){
  if(v.summons.length>=16){alert("召喚生物速查最多保留 16 筆，請先移除一筆。");return false;}
  v.summons.push({creatureId:x.id,spell});
 }else if(kind==="mount"){
  if(v.mounts.length>=12){alert("坐騎參考最多保留 12 筆，請先移除一筆。");return false;}
  v.mounts.push(x.id);
 }else return false;
 if(typeof autoSave==="function")autoSave();
 if(typeof go==="function")go(7);
 if(typeof toast==="function")toast("已導入："+(zh(x).nameZh||x.name));
 return true;
}
function remove(kind,id,spell){
 if(typeof S==="undefined")return;
 const v=lib(S);
 if(kind==="wildShape")v.wildShape=v.wildShape.filter(x=>x!==id);
 else if(kind==="summon")v.summons=v.summons.filter(x=>!(x.creatureId===id&&x.spell===spell));
 else if(kind==="mount")v.mounts=v.mounts.filter(x=>x!==id);
 else if(kind==="companion"){if(selectedCompanion(S)?.id===id&&S.classChoices2024?.["遊俠"])S.classChoices2024["遊俠"].primalBeast="";}
 else return;
 if(typeof autoSave==="function")autoSave();
 if(typeof renderFinal==="function")renderFinal();
}
function button(kind,x,s,spell,title){
 const used=imported(kind,x,s,spell);
 const reason=info(kind,x,s,spell);
 return '<button type="button" class="ci-btn" data-ci-import="'+ESC(kind)+'" data-ci-id="'+ESC(x.id)+'"'+(spell?' data-ci-spell="'+ESC(spell)+'"':'')+(reason?' disabled title="'+ESC(reason)+'"':'')+'>'+ESC(used?"已導入："+title:"導入："+title)+'</button>';
}
function buttons(s,x){
 if(!s||!s.cls||s.ruleset!=="2024")return "";
 const a=[],f=typeof prFamiliarKind==="function"?prFamiliarKind(x):"";
 if(f==="normal"||f==="chain")a.push(button("familiar",x,s,"","魔寵"));
 if(x.wildBaseMin!=null||x.wildMoonMin!=null)a.push(button("wildShape",x,s,"","荒野變形"));
 if(x.summonedByClass)a.push(button("companion",x,s,"","原初夥伴"));
 for(const spell of summonSpellNames(x))a.push(button("summon",x,s,spell,"召喚參考 "+(typeof prSpellZh==="function"?prSpellZh(spell):spell)));
 if(x.mountCandidate)a.push(button("mount",x,s,"","坐騎參考"));
 return a.length?'<div class="ci-ref-actions"><div class="ci-ref-title">快速導入目前角色卡</div><div class="ci-buttons">'+a.join("")+'</div><small>導入僅建立速查紀錄，不會授予新法術、職業特性或控制怪物；坐騎仍須 DM 裁定。</small></div>':"";
}
function quickAction(s,x){
 if(x.wildBaseMin==null&&x.wildMoonMin==null)return "";
 const ids=s?.creatureLibrary?.wildShape||[],used=ids.includes(x.id);
 let reason="";
 if(!s?.cls)reason="請先建立或讀取德魯伊角色";
 else if(s.ruleset!=="2024")reason="目前僅支援 2024 德魯伊";
 else if(s.cls.n!=="德魯伊")reason="目前角色不是德魯伊";
 else if(!wildEligible(s,x))reason=wildShapeBlockReason(s,x);
 else if(!used&&ids.length>=wildLimit(s))reason="已達目前等級的已知形態上限";
 const shown=used?"已導入 · 查看角色卡":"導入荒野變形";
 return '<div class="ci-quick-action"><button type="button" class="ci-btn ci-quick-btn" data-ci-import="wildShape" data-ci-id="'+ESC(x.id)+'"'+(reason?' disabled title="'+ESC(reason)+'"':'')+'>'+shown+'</button>'+(reason?'<span class="ci-quick-reason">'+ESC(reason)+'</span>':'')+'</div>';
}
function blockRows(name,rows){
 return Array.isArray(rows)&&rows.length?'<details class="ci-rules"><summary>'+ESC(name)+'（'+rows.length+'）</summary>'+rows.map(r=>'<div class="ci-rule"><b>'+ESC(r.h||"")+'</b><p>'+ESC(r.t||"")+'</p></div>').join("")+'</details>':"";
}
function primalCompanionStats5R(x,s){
 if(!companionEligible(s,x))return null;
 const lv=rangerLevel(s);
 const wisScore=typeof S!=="undefined"&&s===S&&typeof finalScore==="function"?finalScore("wis"):null;
 if(wisScore==null||!Number.isFinite(wisScore))return {ready:false,level:lv};
 const wisdom=Math.floor((wisScore-10)/2);
 const proficiency=typeof S!=="undefined"&&s===S&&typeof pb==="function"?pb():2+Math.floor((lv-1)/4);
 const ac=String(x.ac||"").match(/^(\d+) plus your Wisdom modifier$/i);
 const hp=String(x.hpSpecial||"").match(/^(\d+) plus (four|five) times your Ranger level/i);
 const attack=String(x.actions?.find(a=>a.h==="Beast's Strike")?.t||"").match(/Hit:\s*(\d+d\d+)\s*\+\s*(\d+) plus your Wisdom modifier/i);
 if(!ac||!hp||!attack)return {ready:false,level:lv,sourceUnparsed:true};
 const hpPer=hp[2]==="four"?4:5;
 return {ready:true,level:lv,wisScore,wisdom,proficiency,ac:+ac[1]+wisdom,acBase:+ac[1],hp:+hp[1]+hpPer*lv,hpBase:+hp[1],hpPer,hit:proficiency+wisdom,dc:8+proficiency+wisdom,damageDie:attack[1],damageBase:+attack[2],damageFlat:+attack[2]+wisdom};
}
function primalCompanionCard5R(x,s){
 const m=primalCompanionStats5R(x,s);if(!m)return "";
 const z=zh(x),signed=n=>(n>=0?"+":"")+n;
 if(!m.ready)return `<div class="ci-warning">${m.sourceUnparsed?"原始夥伴規則公式無法辨識，請核對來源；未套入推測數字。":"請先完成角色的感知屬性值，夥伴的護甲與攻擊才可正確計算。"}</div>`;
 const speeds=Object.entries(x.speed||{}).map(([k,v])=>(SPEED[k]||k)+" "+v+" 呎").join("、");
 const attrs=Object.entries(TYPES).map(([k,title])=>{const value=Number(x[k]),base=Math.floor((value-10)/2),total=base+m.proficiency;
  return `<span>${title} <b>${value} (${signed(base)})</b><small>檢定／豁免 ${signed(total)}<br>${signed(base)} + 熟練 ${signed(m.proficiency)}</small></span>`;
 }).join("");
 const hitSource=`熟練 ${signed(m.proficiency)} + 感知 ${signed(m.wisdom)}`;
 const acSource=`${m.acBase} + 感知 ${signed(m.wisdom)}`;
 const hpSource=`${m.hpBase} + ${m.hpPer} × 遊俠 ${m.level} 級`;
 const dmgSource=`${m.damageDie} + ${m.damageBase} + 感知 ${signed(m.wisdom)}`;
 const type=x.name==="Beast of the Land"?"鈍擊／穿刺／揮砍":x.name==="Beast of the Sea"?"鈍擊／穿刺":"揮砍";
 const unlocked=Object.entries((typeof PROG_2024!=="undefined"?PROG_2024["遊俠"]?.subs?.find(sub=>sub.n==="獸王")?.f:null)||{}).filter(([level])=>+level>3&&+level<=m.level).map(([level,raw])=>{const detail=window.resolveFeatureRule2024?.("遊俠","獸王",raw,+level)||"";return `<details class="ci-rules"><summary>獸王 ${level} 級：${ESC(raw)}</summary><p>${ESC(detail||"請查閱子職業特性說明")}</p></details>`}).join("");
 const rider=x.name==="Beast of the Land"?"直線移動至少 20 呎後命中：另造成 1d6 同類傷害；大型或更小目標倒地。":x.name==="Beast of the Sea"?`命中後擒抱；逃脫 DC ${m.dc}（8 + 熟練 ${m.proficiency} + 感知 ${signed(m.wisdom)}）。`:"飛行離開敵人觸及時不引發藉機攻擊。";
 return `<div class="ci-companion-actual" data-primal-derived="1"><div class="ci-stat-grid"><span>護甲等級 <b>${m.ac}</b><small>${ESC(acSource)}</small></span><span>生命值 <b>${m.hp}</b><small>${ESC(hpSource)}</small></span><span>速度 <b>${ESC(speeds)}</b></span><span>熟練加值 <b>${signed(m.proficiency)}</b><small>繼承遊俠角色</small></span></div>
 <div class="ci-stat-grid"><span>野獸打擊命中 <b>${signed(m.hit)}</b><small>${ESC(hitSource)}</small></span><span>命中傷害 <b>${m.damageDie} ${signed(m.damageFlat)}</b><small>${ESC(dmgSource)} ${ESC(type)}</small></span><span>法術豁免 DC <b>${m.dc}</b><small>8 + 熟練 ${m.proficiency} + 感知 ${signed(m.wisdom)}</small></span><span>被動察覺 <b>${Number(x.passive||0)+m.proficiency}</b><small>原始 ${x.passive} + 原初聯結 ${m.proficiency}</small></span></div>
 <div class="ci-abilities">${attrs}</div><div class="ci-note">${ESC(rider)}</div>
 <p class="ci-note">原初聯結：六項屬性檢定與豁免均加入遊俠熟練加值；數字隨角色等級、感知及熟練加值自動更新。</p>
 ${blockRows("原始特性",z.traitsZh)}${unlocked}
 <details class="ci-rules"><summary>原始資料來源：2024 玩家手冊｜${ESC(x.name)}（XPHB ${ESC(x.page)} 頁）</summary><div class="ci-rule"><b>護甲</b><p>${ESC(x.ac)}</p><b>生命值</b><p>${ESC(x.hpSpecial)}</p><b>野獸打擊</b><p>${ESC(x.actions?.[0]?.t||"")}</p></div></details></div>`;
}
function stat(x,s){
 if(companionEligible(s,x))return primalCompanionCard5R(x,s);
 const z=zh(x),speeds=Object.entries(x.speed||{}).map(([k,val])=>(SPEED[k]||k)+" "+val+" 呎").join("、");
 let ac=z.acZh||x.ac||"—",hp=z.hpZh||x.hpSpecial||x.hp||"—";
 if(x.summonedByClass&&s.ruleset==="2024"&&s.cls?.n==="遊俠"&&typeof finalScore==="function"){
  const wis=finalScore("wis");
  if(wis!=null&&/13 plus your Wisdom modifier/.test(x.ac))ac+="（目前 "+(13+Math.floor((wis-10)/2))+"）";
  const m=String(x.hpSpecial||"").match(/^(\d+) plus (four|five) times your Ranger level/);
  if(m)hp+="（目前 "+(+m[1]+(m[2]==="four"?4:5)*rangerLevel(s))+"）";
 }
 const main='<div class="ci-stat-grid"><span>護甲等級 <b>'+ESC(ac)+'</b></span><span>生命值 <b>'+ESC(hp)+'</b></span><span>速度 <b>'+ESC(speeds||"—")+'</b></span><span>CR <b>'+ESC(x.cr)+'</b></span></div>';
 const abilities='<div class="ci-abilities">'+Object.entries(TYPES).map(([k,title])=>'<span>'+title+' <b>'+ESC(x[k]??"—")+'</b></span>').join("")+'</div>';
 return main+abilities+blockRows("特性",z.traitsZh)+blockRows("施法",z.spellcastingZh)+blockRows("動作",z.actionsZh)+blockRows("附贈動作",z.bonusZh)+blockRows("反應",z.reactionsZh)+blockRows("傳奇動作",z.legendaryZh);
}
function card(kind,x,s,spell){
 const title=label(x),ok=kind==="wildShape"?wildEligible(s,x):kind==="companion"?companionEligible(s,x):true;
 const warning=!ok?'<div class="ci-warning">目前角色不符合此形態使用條件，保留舊紀錄供查閱。</div>':"";
 const dis=kind==="companion"?"":'<button type="button" class="ci-remove" data-ci-remove="'+kind+'" data-ci-id="'+ESC(x.id)+'"'+(spell?' data-ci-spell="'+ESC(spell)+'"':'')+'>移除速查</button>';
 return '<details class="ci-card"><summary>'+ESC(title)+(spell?' <small>· '+ESC(typeof prSpellZh==="function"?prSpellZh(spell):spell)+'</small>':"")+'</summary>'+warning+stat(x,s)+dis+'</details>';
}
function render(s){
 if(!s?.cls||s.ruleset!=="2024")return "";
 const v=lib(s),isDruid=!!druidLevel(s),isRanger=!!rangerLevel(s)&&subclass(s)==="獸王",comp=selectedCompanion(s);
 let h='<section class="fs-sec ci-panel" id="ciSheet"><div class="st">生物與變形速查 · 已導入角色卡</div>';
 h+='<p class="ci-note">這裡只儲存生物來源 ID；規則數值從 2024/2025 原始生物資料讀取，重新讀檔後保留。導入不會增加施法能力、資源或自動判定合法性。</p>';
 h+='<div class="ci-buttons"><button type="button" class="ci-btn" data-ci-open="1">前往「工具速查 → 生物」選擇並導入</button></div>';
 if(isDruid||v.wildShape.length){
  h+='<h4>荒野變形 · '+v.wildShape.length+' / '+(isDruid?wildLimit(s):"—")+' 種已知形態</h4>';
  h+='<p class="ci-note">變形時依德魯伊特性決定可用 CR、飛行速度與臨時生命值；生物原始生命值不直接取代角色生命值。</p>';
  h+=v.wildShape.length?v.wildShape.map(id=>byId(id)).filter(Boolean).map(x=>card("wildShape",x,s)).join(""):'<p class="ci-note">尚未導入形態。可從速查按「導入：荒野變形」。</p>';
 }
 if(isRanger||comp){
  h+='<h4>獸王原初夥伴</h4><p class="ci-note">沿用升級畫面既有的「原初夥伴」選項，長休更換依職業規則。護甲及生命值隨角色屬性、遊俠等級變動。</p>';
  h+=comp?card("companion",comp,s):'<p class="ci-note">尚未選擇，請到生物分類「獸王夥伴」導入。</p>';
 }
 if(v.summons.length){
  h+='<h4>法術召喚參考（'+v.summons.length+'）</h4><p class="ci-note">這些只是已收藏的生物資料卡；是否能召喚及如何指揮仍由已準備法術、法術位及法術原文決定。</p>';
  h+=v.summons.map(r=>{const x=byId(r.creatureId);return x?card("summon",x,s,r.spell):""}).join("");
 }
 if(v.mounts.length){
  h+='<h4>坐騎參考（'+v.mounts.length+'）</h4><p class="ci-note">候選生物不代表必然可騎乘，請由 DM 判定。</p>';
  h+=v.mounts.map(id=>byId(id)).filter(Boolean).map(x=>card("mount",x,s)).join("");
 }
 h+='</section>';return h;
}
document.addEventListener("click",function(e){
 const a=e.target.closest?.("button[data-ci-import],button[data-ci-remove],button[data-ci-open]");
 if(!a)return;
 if(a.dataset.ciImport){add(a.dataset.ciImport,a.dataset.ciId,a.dataset.ciSpell||"");return;}
 if(a.dataset.ciRemove){remove(a.dataset.ciRemove,a.dataset.ciId,a.dataset.ciSpell||"");return;}
 if(a.dataset.ciOpen){
  if(typeof go==="function"){
   go(8);
   if(typeof refTab!=="undefined"){
    refTab="creature";
    if(typeof creatureRefState!=="undefined"){
     creatureRefState.source.clear();
     if(druidLevel(S)){creatureRefState.mode=new Set(["wildshape"]);creatureRefState.druidLevel=druidLevel(S);creatureRefState.moon=moon(S);}
     else if(rangerLevel(S)&&subclass(S)==="獸王")creatureRefState.mode=new Set(["companion"]);
     else if(S.cls?.n==="邪術師")creatureRefState.mode=new Set(["familiar"]);
     else creatureRefState.mode=new Set(["player"]);
    }
    document.querySelectorAll("#refTabs button").forEach(x=>x.classList.toggle("active",x.dataset.r==="creature"));
    renderRef();
   }
  }
 }
});
const st=document.createElement("style");
st.textContent='.ci-quick-action{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:9px 12px;border-top:1px solid #c8af86;background:#fffaf0}.ci-quick-btn{font-weight:700!important;min-height:42px!important;border-width:2px!important}.ci-quick-reason{font:13px/1.6 sans-serif;color:#6b4637}.ci-panel{line-height:1.7}.ci-note{font:14px/1.75 "PingFang TC","Microsoft JhengHei",sans-serif;color:#43352d;margin:8px 0}.ci-panel h4{margin:13px 0 5px;font-size:16px}.ci-buttons{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}.ci-btn{border:1px solid #9f8159;background:#fffaf0;color:#4c392b;border-radius:5px;padding:8px 11px;font:inherit;font-size:13.5px;min-height:38px;cursor:pointer}.ci-btn:hover{border-color:#963c35}.ci-btn:disabled{opacity:.55;cursor:not-allowed}.ci-ref-actions{border-top:1px solid #d7c7aa;margin-top:14px;padding-top:10px}.ci-ref-title{font-size:14px;font-weight:700}.ci-ref-actions small{display:block;font-size:12px;line-height:1.7}.ci-card{border:1px solid #c8af86;background:#fffdf7;padding:9px 12px;margin:9px 0;min-width:0}.ci-card summary{font-size:15px;cursor:pointer;font-weight:700;overflow-wrap:anywhere}.ci-card summary small{font-weight:400}.ci-stat-grid,.ci-abilities{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.ci-stat-grid span,.ci-abilities span{padding:6px 8px;border:1px solid #d1c4ae;min-width:0;overflow-wrap:anywhere;font-size:13.5px}.ci-stat-grid b,.ci-abilities b{display:block;font-size:14px}.ci-rules{border-top:1px solid #d3c1a4;margin-top:8px;padding:7px 0}.ci-rules summary{font-size:14px}.ci-rule{margin:8px 0;line-height:1.75;font-size:15px;font-family:"PingFang TC","Microsoft JhengHei",sans-serif}.ci-rule p{margin:3px 0 8px}.ci-warning{color:#a22c21;font-size:13px}.ci-remove{border:1px solid #a45f58;background:#fff;color:#943b32;padding:8px;min-height:36px;margin:9px 0;font:inherit;cursor:pointer}@media(max-width:480px){.ci-stat-grid,.ci-abilities{grid-template-columns:repeat(2,minmax(0,1fr))}.ci-panel{min-width:0}.ci-buttons>*{flex:1 1 180px}}';
st.textContent+=".ci-companion-actual{margin:7px 0 12px;overflow-wrap:anywhere}.ci-companion-actual .ci-stat-grid span{min-width:0;overflow-wrap:anywhere}.ci-companion-actual .ci-stat-grid small{display:block;font:12px/1.6 \"PingFang TC\",\"Microsoft JhengHei\",sans-serif;color:#594b3b}.ci-companion-actual .ci-abilities span small{display:block;font:11.5px/1.6 \"PingFang TC\",\"Microsoft JhengHei\",sans-serif;color:#594b3b}.ci-companion-actual .ci-abilities{grid-template-columns:repeat(3,minmax(0,1fr))}@media(max-width:430px){.ci-companion-actual .ci-abilities{grid-template-columns:repeat(2,minmax(0,1fr))}}";
document.head.appendChild(st);
window.CreatureImport5R={primalCompanionStats5R,normalize,buttons,quickAction,render,add,remove,wildLimit,wildEligible,companionEligible,summonSpellNames,selectedCompanion};
})();
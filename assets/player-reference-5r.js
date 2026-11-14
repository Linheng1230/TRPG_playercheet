/* 5R player-facing magic item/creature reference. English data stays canonical; UI uses Traditional Chinese projection. */
const itemRefState={q:"",rarity:"all",attune:"all"};
const creatureRefState={q:"",mode:new Set(["player"]),source:new Set(),cr:"all",size:new Set(),type:new Set(),druidLevel:2,moon:false};
const PR_RARITY={common:"普通",uncommon:"非普通",rare:"稀有","very rare":"極珍稀",legendary:"傳說",artifact:"神器"};
const PR_ITEM_TYPE={HA:"重甲",LA:"輕甲",MA:"中甲",M:"武器",INS:"樂器",P:"藥水",RD:"權杖",RG:"戒指",S:"盾牌",SC:"卷軸",SCF:"施法法器",WD:"魔杖",wondrous:"奇物"};
const PR_SIZE={T:"微型",S:"小型",M:"中型",L:"大型",H:"巨型",G:"超巨型"};
const PR_TYPE={aberration:"異怪",beast:"野獸",celestial:"天族",construct:"構裝體",dragon:"龍類",elemental:"元素",fey:"妖精",fiend:"邪魔",giant:"巨人",humanoid:"類人生物",monstrosity:"怪獸",ooze:"泥怪",plant:"植物",undead:"不死生物"};
const PR_SOURCE={XMM:"2025 怪物圖鑑",XPHB:"2024 玩家手冊",XDMG:"2024 地下城主指南"};
const PR_SPEED={walk:"步行",fly:"飛行",swim:"游泳",climb:"攀爬",burrow:"挖掘"};
const PR_ABILITY={str:"力量",dex:"敏捷",con:"體質",int:"智力",wis:"感知",cha:"魅力"};
function prEsc(s){return escFeatureHTML(String(s==null?"":s))}
function prItemZh(x){return (window.ZIZI_5R_MAGIC_ITEMS_ZH||{})[x.id]||{}}
function prCreatureZh(x){return (window.ZIZI_5R_CREATURES_ZH||{})[x.id]||{}}
function prName(zh,en){return prEsc((zh||en)+"｜"+en)}
function prSectionsZh(rows){return (rows||[]).map(function(z){return '<div class="pr-rule">'+(z.h?'<b>'+prEsc(z.h)+'</b> ':'')+'<span>'+prEsc(z.t||"")+'</span></div>'}).join("")}
function prTypeZh(x){var base=String(x.type||"").split(/[ (]/)[0].toLowerCase();return PR_TYPE[base]||"生物"}
function prSizeZh(x){return (x.sizeCodes||[]).map(function(s){return PR_SIZE[s]||s}).join("／")||"—"}
function prSpellZh(raw){var en=String(raw||"").split("|")[0];var sp=(window.SPELLS||[]).find(function(s){return s.eng===en||s.n===en});return sp?sp.n:en}
function prRx(s){return String(s).replace(/[.*+?^$()|[\]{}\\]/g,"\\$&")}
function prZhBody(s,en){
 s=String(s||"");if(en)s=s.replace(new RegExp(prRx(en),"ig"),"");
 var dice=[];s=s.replace(/\b\d+d\d+(?:\s*[+-]\s*\d+)?\b/gi,function(m){dice.push(m);return "§骰"+(dice.length-1)+"§"});
 s=s.replace(/\bAC\b/g,"護甲等級").replace(/\bHP\b/g,"生命值").replace(/\bCR\b/g,"挑戰等級").replace(/\bPB\b/g,"熟練加值").replace(/\bDC\b/g,"難度");
 s=s.replace(/Bonus Actions?/gi,"附贈動作").replace(/Legendary Actions?/gi,"傳奇動作").replace(/Reactions?/gi,"反應").replace(/Actions?/gi,"動作").replace(/Spellcasting/gi,"施法").replace(/\bD&D\b/gi,"龍與地下城");
 s=s.replace(/[A-Za-z][A-Za-z'’.-]*/g,"");s=s.replace(/§骰(\d+)§/g,function(_,i){return dice[+i]||""});
 return s.replace(/\s+/g," ").replace(/\s+([，。；：！？、])/g,"$1").trim();
}
const PR_CHAIN_FAMILIAR_NAMES=new Set(["Imp","Pseudodragon","Quasit","Skeleton","Slaad Tadpole","Sphinx of Wonder","Sprite","Venomous Snake"]);
function prFamiliarKind(x){
 if(x.isBeast&&!x.isSwarm&&x.crValue!=null&&Number(x.crValue)===0)return "normal";
 if(x.source==="XMM"&&PR_CHAIN_FAMILIAR_NAMES.has(x.name))return "chain";
 if(x.familiar||(x.spellRefs||[]).includes("Find Familiar"))return "reference";
 return "";
}
// 2024 PHB Equipment, Mounts and Other Animals: exact canonical XMM identities.
const PR_STANDARD_MOUNT_NAMES=new Set(["Camel","Elephant","Draft Horse","Riding Horse","Mastiff","Mule","Pony","Warhorse"]);
function prMountKind(x){
 if(x.source==="XMM"&&PR_STANDARD_MOUNT_NAMES.has(x.name))return "standard";
 if(String(x.summonedBySpell||"").startsWith("Find Steed"))return "spell";
 return x.mountCandidate?"special":"";
}
function prTags(x){
 var z=prCreatureZh(x),a=[],kind=prFamiliarKind(x);
 if(x.summonedBySpell)a.push("召喚："+(z.summonedBySpellZh||prSpellZh(x.summonedBySpell)));
 (z.spellRefsZh||x.spellRefs||[]).forEach(function(s,i){
  if((x.spellRefs||[])[i]==="Find Familiar"&&kind==="normal")return;
  a.push("法術："+s);
 });
 if(x.summonedByClass)a.push("職業夥伴："+(z.summonedByClassZh||"遊俠"));
 if(kind==="normal")a.push("一般魔寵：尋獲魔寵");
 else if(kind==="chain")a.push("契術師專屬：鎖鏈魔契");
 else if(kind==="reference")a.push("魔寵相關記載（非一般法術資格）");
 var mk=prMountKind(x);
 if(mk==="standard"){
  a.push("標準坐騎（2024 裝備表）");
  if((x.sizeCodes||[]).includes("M"))a.push("中型坐騎：限小型以下騎乘者");
 }else if(mk==="spell")a.push("法術坐騎：《尋獲坐騎》");
 else if(mk==="special")a.push("特殊坐騎候選（須 DM 判定）");
 if(x.wildBaseMin!=null)a.push("荒野變形 "+x.wildBaseMin+"級以上");
 return [...new Set(a)];
}
function prWildEligible(x){var l=Number(creatureRefState.druidLevel)||2;return creatureRefState.moon?(x.wildMoonMin!=null&&x.wildMoonMin<=l):(x.wildBaseMin!=null&&x.wildBaseMin<=l)}
function prFilterButtons(group,label,choices,current){
 return '<div class="pr-filter" role="group" aria-label="'+prEsc(label)+'"><span class="pr-filter-label">'+prEsc(label)+'</span><div class="pr-segments">'+choices.map(function(entry){var value=String(entry[0]),name=String(entry[1]),active=current instanceof Set?(value==="all"?current.size===0:current.has(value)):value===String(current);return '<button type="button" class="pr-segment'+(active?' active':'')+'" data-pr-filter="'+prEsc(group)+'" data-pr-value="'+prEsc(value)+'" aria-pressed="'+active+'">'+prEsc(name)+'</button>'}).join("")+'</div></div>';
}
function renderMagicItemRef(){
 var a=window.ZIZI_5R_MAGIC_ITEMS||[],q=itemRefState.q.trim().toLowerCase();
 var rows=a.filter(function(x){var z=prItemZh(x),blob=(x.name+" "+(z.nameZh||"")+" "+(z.bodyZh||"")+" "+x.type).toLowerCase();return (!q||blob.includes(q))&&(itemRefState.rarity==="all"||x.rarity===itemRefState.rarity)&&(itemRefState.attune==="all"||(itemRefState.attune==="yes")===!!x.attunement)});
 var rarityOrder=["common","uncommon","rare","very rare","legendary","artifact"];var present=new Set(a.map(function(x){return x.rarity}).filter(Boolean));var rar=rarityOrder.filter(function(v){return present.has(v)});
 var tools='<div class="pr-tools"><input id="itemRefQ" placeholder="搜尋魔法物品中文或英文名稱…" value="'+prEsc(itemRefState.q)+'">'+prFilterButtons("rarity","稀有度",[["all","全部"]].concat(rar.map(function(v){return [v,PR_RARITY[v]||v]})),itemRefState.rarity)+prFilterButtons("attune","同調",[["all","全部"],["yes","需要同調"],["no","不需同調"]],itemRefState.attune)+'</div>';
 var cards=rows.map(function(x){var z=prItemZh(x);return '<div class="pr-magic-card-row"><details class="pr-card item-card"><summary><span class="pr-name">'+prName(z.nameZh,x.name)+'</span><span class="pr-meta">'+prEsc(PR_RARITY[x.rarity]||"魔法物品")+' · '+prEsc(PR_ITEM_TYPE[x.type]||"魔法物品")+(x.attunement?' · 需要同調':'')+'</span></summary><div class="pr-body"><div class="pr-kv">來源：2024 地下城主指南'+(x.page?'，第 '+x.page+' 頁':'')+'</div>'+prSectionsZh(z.sectionsZh)+'</div></details><div class="pr-magic-action">'+(window.MagicItemImport5R?.actionHTML(S,x)||"")+'</div></div>'}).join("");
 return '<div class="pr-panel">'+tools+'<div class="pr-note">2024 地下城主指南魔法物品：'+rows.length+' / '+a.length+'。名稱保留繁中＋English；其餘顯示採繁體中文。</div><div class="pr-list">'+cards+'</div></div>';
}
function renderCreatureRef(){
 var a=window.ZIZI_5R_CREATURES||[],q=creatureRefState.q.trim().toLowerCase(),m=creatureRefState.mode;
 var rows=a.filter(function(x){var z=prCreatureZh(x),blob=(x.name+" "+(z.nameZh||"")+" "+(z.bodyZh||"")+" "+prTags(x).join(" ")).toLowerCase();if(q&&!blob.includes(q))return false;if(creatureRefState.source.size&&!creatureRefState.source.has(x.source))return false;
 if(creatureRefState.cr!=="all"&&String(x.cr)!==creatureRefState.cr)return false;
 if(creatureRefState.size.size&&!(x.sizeCodes||[]).some(c=>creatureRefState.size.has(c)))return false;
 var coreType=String(x.type||"").split(/[ (]/)[0].toLowerCase();
 if(creatureRefState.type.size&&!creatureRefState.type.has(coreType)&&!(creatureRefState.type.has("other")&&!PR_TYPE[coreType]))return false;
var matches={
 summon:!!x.summonedBySpell||(x.spellRefs||[]).some(function(t){return t!=="Find Familiar"}),
 familiar:!!prFamiliarKind(x),
 familiarNormal:prFamiliarKind(x)==="normal",
 familiarChain:prFamiliarKind(x)==="chain",
 mount:!!prMountKind(x),
  mountStandard:prMountKind(x)==="standard",
  mountSpell:prMountKind(x)==="spell",
  mountSpecial:prMountKind(x)==="special",
 wildshape:prWildEligible(x),
 companion:!!x.summonedByClass,
 player:!!x.summonedBySpell||!!x.summonedByClass||!!prFamiliarKind(x)||!!x.mountCandidate||x.wildBaseMin!=null||!!(x.spellRefs||[]).length
};
if(m.size&&![...m].some(function(k){return matches[k]}))return false;
return true});
 if(["mount","mountStandard","mountSpell","mountSpecial"].some(function(k){return m.has(k)})){
  var mr={standard:0,spell:1,special:2};
  rows.sort(function(x,y){return (mr[prMountKind(x)]??9)-(mr[prMountKind(y)]??9)||x.name.localeCompare(y.name)});
 }
  var wild=m.has("wildshape")?prFilterButtons("druidLevel","德魯伊等級",Array.from({length:19},function(_,i){var n=i+2;return [n,String(n)]}),creatureRefState.druidLevel)+'<div class="pr-moon-picker">'+prFilterButtons("moon","變形規則",[["base","一般德魯伊"],["moon","月亮結社"]],creatureRefState.moon?"moon":"base")+"</div>":"";
 var modes=[["player","玩家常用"],["summon","召喚／法術生物"],["familiar","魔寵（全部）"],["familiarNormal","一般魔寵（尋獲魔寵）"],["familiarChain","鎖鏈魔契專屬"],["mount","全部坐騎"],["mountStandard","標準坐騎"],["mountSpell","法術坐騎"],["mountSpecial","特殊坐騎候選"],["wildshape","荒野變形"],["companion","獸王夥伴"],["all","全部怪物"]];
 var crChoices=[["all","全部"]].concat([...new Set(a.map(x=>String(x.cr)))].sort(function(v,w){var n=t=>{if(t==="—")return 999;var z=t.split("/");return z.length===2?Number(z[0])/Number(z[1]):Number(t)};return n(v)-n(w)}).map(v=>[v,v==="—"?"無挑戰等級":v]));
 var sizeChoices=[["all","全部"]].concat(Object.entries(PR_SIZE).map(([k,v])=>[k,v]));
 var typeChoices=[["all","全部"]].concat([...new Set(a.map(x=>String(x.type||"").split(/[ (]/)[0].toLowerCase()))].filter(v=>!!PR_TYPE[v]).sort((v,w)=>PR_TYPE[v].localeCompare(PR_TYPE[w],"zh-Hant")).map(v=>[v,PR_TYPE[v]]),[["other","其他／特殊"]]);
 var tools='<div class="pr-tools"><input id="creatureRefQ" placeholder="搜尋生物中文或英文名稱…" value="'+prEsc(creatureRefState.q)+'">'+prFilterButtons("mode","生物分類",modes,m)+prFilterButtons("source","資料來源",[["all","全部"]].concat(["XMM","XPHB","XDMG"].map(function(v){return [v,PR_SOURCE[v]]})),creatureRefState.source)+prFilterButtons("cr","挑戰等級",crChoices,creatureRefState.cr)+prFilterButtons("size","體型",sizeChoices,creatureRefState.size)+prFilterButtons("type","生物類型",typeChoices,creatureRefState.type)+wild+'</div>';
 var cards=rows.map(function(x){var z=prCreatureZh(x),sp=Object.entries(x.speed||{}).map(function(kv){return (PR_SPEED[kv[0]]||kv[0])+" "+kv[1]+" 呎"}).join("、")||"—";var stat='<div class="pr-stats"><span>護甲等級 <b>'+prEsc(z.acZh||x.ac||"—")+'</b></span><span>生命值 <b>'+prEsc(z.hpZh||x.hpSpecial||x.hp||"—")+'</b></span><span>速度 <b>'+prEsc(sp)+'</b></span></div>';var abs='<div class="pr-abilities">'+["str","dex","con","int","wis","cha"].map(function(k){return '<span>'+PR_ABILITY[k]+' <b>'+prEsc(x[k]==null?"—":x[k])+'</b></span>'}).join("")+'</div>';var info=(z.sensesZh?'<div class="pr-kv">感官：'+prEsc(z.sensesZh)+(x.passive?' · 被動察覺 '+x.passive:'')+'</div>':'')+(z.languagesZh?'<div class="pr-kv">語言：'+prEsc(z.languagesZh)+'</div>':'')+(z.vulnerableZh?'<div class="pr-kv">易傷：'+prEsc(z.vulnerableZh)+'</div>':'')+(z.resistZh?'<div class="pr-kv">抗性：'+prEsc(z.resistZh)+'</div>':'')+(z.immuneZh?'<div class="pr-kv">傷害免疫：'+prEsc(z.immuneZh)+'</div>':'')+(z.conditionImmuneZh?'<div class="pr-kv">狀態免疫：'+prEsc(z.conditionImmuneZh)+'</div>':'');var sect=(z.traitsZh&&z.traitsZh.length?'<h4>特性</h4>'+prSectionsZh(z.traitsZh):'')+(z.spellcastingZh&&z.spellcastingZh.length?'<h4>施法</h4>'+prSectionsZh(z.spellcastingZh):'')+(z.actionsZh&&z.actionsZh.length?'<h4>動作</h4>'+prSectionsZh(z.actionsZh):'')+(z.bonusZh&&z.bonusZh.length?'<h4>附贈動作</h4>'+prSectionsZh(z.bonusZh):'')+(z.reactionsZh&&z.reactionsZh.length?'<h4>反應</h4>'+prSectionsZh(z.reactionsZh):'')+(z.legendaryZh&&z.legendaryZh.length?'<h4>傳奇動作</h4>'+prSectionsZh(z.legendaryZh):'');var card='<details class="pr-card creature-card"><summary><span class="pr-name">'+prName(z.nameZh,x.name)+'</span><span class="pr-meta">挑戰等級 '+prEsc(x.cr)+' · '+prEsc(prSizeZh(x))+' '+prEsc(prTypeZh(x))+' · '+prEsc(PR_SOURCE[x.source]||"")+'</span><span class="pr-tags">'+prTags(x).map(function(t){return '<i'+(t.startsWith("標準坐騎")?' class="pr-standard-mount"':'')+'>'+prEsc(t)+'</i>'}).join("")+'</span></summary><div class="pr-body">'+stat+abs+info+sect+(m.has("wildshape")?"":(window.CreatureImport5R?.buttons(S,x)||""))+'</div></details>';return m.has("wildshape")?'<div class="pr-quick-wrap">'+card+(window.CreatureImport5R?.quickAction(S,x)||"")+'</div>':card}).join("");
 var mountNote=["mount","mountStandard","mountSpell","mountSpecial"].some(function(k){return m.has(k)})?'<div class="pr-note"><b>坐騎分類：</b>標準坐騎＝2024 裝備表 8 種（中型的獒犬、騾、矮種馬僅供小型以下騎乘者）；法術坐騎＝《尋獲坐騎》；特殊候選＝大型以上野獸，需 DM 判定。所有坐騎仍須自願、體型至少大一級且構造適合；控制坐騎還須受訓。</div>':"";
 return '<div class="pr-panel">'+tools+mountNote+'<div class="pr-note">魔寵資格：一般《尋獲魔寵》可選非群集的 CR 0 野獸；鎖鏈魔契八種特殊形態僅限具該魔能祈喚的契術師。怪物資料的「魔寵」註記不等於一般法術可選。其他標籤（如荒野變形）為獨立用途。</div>'+'<div class="pr-note">2024/2025 生物資料：'+rows.length+' / '+a.length+'。名稱保留繁中＋English；其餘欄位與正文使用繁體中文。</div><div class="pr-list">'+cards+'</div></div>';
}
document.addEventListener("input",function(e){var b=document.getElementById("refBody");if(!b||!b.contains(e.target))return;var id=e.target.id;if(id==="itemRefQ"){itemRefState.q=e.target.value;if(typeof liveSearchIsComposing==="function"&&liveSearchIsComposing(id,e))return;typeof scheduleSearchRender==="function"?scheduleSearchRender(id,renderRef):renderRef()}else if(id==="creatureRefQ"){creatureRefState.q=e.target.value;if(typeof liveSearchIsComposing==="function"&&liveSearchIsComposing(id,e))return;typeof scheduleSearchRender==="function"?scheduleSearchRender(id,renderRef):renderRef()}});
document.addEventListener("click",function(e){
 var button=e.target.closest&&e.target.closest("button[data-pr-filter]");
 var body=document.getElementById("refBody");
 if(!button||!body||!body.contains(button))return;
 var value=button.dataset.prValue,group=button.dataset.prFilter;
 if(group==="cr")creatureRefState.cr=value;
 else if(group==="size"){if(value==="all")creatureRefState.size.clear();else if(creatureRefState.size.has(value))creatureRefState.size.delete(value);else creatureRefState.size.add(value)}
 else if(group==="type"){if(value==="all")creatureRefState.type.clear();else if(creatureRefState.type.has(value))creatureRefState.type.delete(value);else creatureRefState.type.add(value)}
 else if(group==="rarity")itemRefState.rarity=value;
 else if(group==="attune")itemRefState.attune=value;
 else if(group==="mode"){
  if(value==="all")creatureRefState.mode.clear();
  else if(value==="player")creatureRefState.mode=new Set(["player"]);
  else{
   // "player" is a landing-page preset, not an intentionally combined category.
   if(creatureRefState.mode.has("player"))creatureRefState.mode.clear();
   if(value==="mount")["mountStandard","mountSpell","mountSpecial"].forEach(function(k){creatureRefState.mode.delete(k)});
   else if(["mountStandard","mountSpell","mountSpecial"].includes(value))creatureRefState.mode.delete("mount");
   if(creatureRefState.mode.has(value))creatureRefState.mode.delete(value);
   else creatureRefState.mode.add(value);
   if(!creatureRefState.mode.size)creatureRefState.mode.add("player");
  }
 }
 else if(group==="source"){if(value==="all")creatureRefState.source.clear();else if(creatureRefState.source.has(value))creatureRefState.source.delete(value);else creatureRefState.source.add(value)}
 else if(group==="druidLevel")creatureRefState.druidLevel=Number(value);
 else if(group==="moon")creatureRefState.moon=value==="moon";
 else return;
 renderRef();
});
document.addEventListener("change",function(e){var b=document.getElementById("refBody");if(!b||!b.contains(e.target))return;var i=e.target.id;if(i==="itemRefRarity")itemRefState.rarity=e.target.value;else if(i==="itemRefAttune")itemRefState.attune=e.target.value;else if(i==="creatureMode")creatureRefState.mode=new Set([e.target.value]);else if(i==="creatureSource")creatureRefState.source=new Set([e.target.value]);else if(i==="creatureDruidLevel")creatureRefState.druidLevel=Number(e.target.value);else if(i==="creatureMoon")creatureRefState.moon=e.target.checked;else return;renderRef()});
(function(){var s=document.createElement("style");s.textContent='.pr-panel{display:grid;gap:10px}.pr-tools{display:flex;gap:7px;flex-wrap:wrap;align-items:center}.pr-tools input{flex:1 1 280px;min-width:220px}.pr-tools input,.pr-tools select{padding:8px;border:1px solid #a58d63;background:#fbf7ec;color:#4a4035;font:inherit}.pr-filter{flex:1 1 100%;display:flex;gap:8px;align-items:flex-start;min-width:0;flex-wrap:wrap}.pr-filter-label{flex:0 0 70px;font-size:13px;font-weight:700;padding-top:9px;color:#6a5144}.pr-segments{display:flex;flex:1 1 380px;flex-wrap:wrap;gap:5px;min-width:0}.pr-segment{appearance:none;border:1px solid #a58d63;background:#fbf7ec;color:#4a4035;padding:7px 11px;font:inherit;font-size:13px;line-height:1.4;cursor:pointer;min-height:36px;border-radius:2px;white-space:normal;overflow-wrap:anywhere}.pr-segment:hover{border-color:#983d37;background:#f3e5d8}.pr-segment.active,.pr-segment[aria-pressed="true"]{background:#983d37;color:#fff;border-color:#983d37}.pr-segment:focus-visible{outline:2px solid #983d37;outline-offset:2px}.pr-tools input::placeholder{color:#7a6f60;opacity:1}.pr-tools select:focus,.pr-tools input:focus{border-color:#7f342e;outline:2px solid rgba(154,67,59,.16);outline-offset:1px}.pr-note{font-size:13px;color:#49382e;line-height:1.7}.pr-list{display:grid;gap:8px}.pr-card{border:1px solid var(--gold-dim);background:rgba(255,255,255,.28);padding:0 12px}.pr-card summary{cursor:pointer;padding:11px 0;display:grid;grid-template-columns:minmax(180px,1fr) auto;gap:4px 10px}.pr-name{font-weight:800}.pr-meta{font-size:12.5px;color:var(--muted);text-align:right}.pr-tags{grid-column:1/-1;display:flex;gap:5px;flex-wrap:wrap}.pr-tags i{font-style:normal;font-size:11px;border:1px solid rgba(121,78,35,.35);border-radius:999px;padding:2px 7px;color:var(--red)}.pr-tags i.pr-standard-mount{background:#e4eedb;color:#35542b;border-color:#789462;font-weight:700}.pr-body{border-top:1px solid rgba(121,78,35,.2);padding:12px 0 15px;max-width:78ch;font-family:"PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;font-size:15.5px;line-height:1.78}.pr-kv,.pr-rule{margin:7px 0}.pr-stats,.pr-abilities{display:flex;gap:9px;flex-wrap:wrap;margin:6px 0}.pr-stats span,.pr-abilities span{border:1px solid rgba(121,78,35,.25);padding:4px 7px}.pr-moon-picker{flex:1 1 100%;border:1px solid #9f7957;background:#f5ead5;border-radius:5px;padding:8px 10px}.pr-moon-picker .pr-filter-label{font-size:14px;color:#4c3026}.pr-moon-picker .pr-segment{border-width:2px;min-height:44px;font-weight:700}.pr-moon-picker .pr-segment[aria-pressed=true]{background:#963d34;color:#fff;border-color:#963d34}.pr-quick-wrap{border:1px solid var(--gold-dim);background:rgba(255,255,255,.28)}.pr-quick-wrap>.pr-card{border:0;background:transparent}.pr-check{display:inline-flex;align-items:center;gap:6px;font-size:13px}@media(max-width:520px){.pr-card summary{grid-template-columns:1fr}.pr-meta{text-align:left}.pr-tools input{min-width:100%}.pr-body{font-size:15px}.pr-filter-label{flex-basis:100%;padding-top:0}.pr-segments{flex-basis:100%}.pr-segment{min-height:40px}}';document.head.appendChild(s)})();
window.addEventListener("load",function(){var open=new URLSearchParams(location.search).get("open");if(open!=="item"&&open!=="creature")return;setTimeout(function(){if(typeof go==="function")go(8);if(typeof refTab!=="undefined"){refTab=open;if(typeof renderRef==="function")renderRef()}var btn=document.querySelector('#refTabs [data-r="'+open+'"]');if(btn){document.querySelectorAll("#refTabs button").forEach(function(b){b.classList.toggle("active",b===btn)});btn.scrollIntoView({block:"nearest",inline:"center"})}},80)});

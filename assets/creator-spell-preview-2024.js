/* 2024 Creator-only presentation. Canonical spell data and full tooltip stay untouched. */
(function(g) {
"use strict";
const rows=new Map((g.SPELLS_2024_TUPLES||[]).map(r=>[r[0],r]));
function normalize(s){return String(s||"").replace(/\s+/g,"").replace(/＋/g,"+");}
function action(time){
 const t=String(time||"").trim();
 if(/^附贈動作/.test(t))return {key:"bonus",label:"附贈動作"};
 if(/^反應/.test(t))return {key:"reaction",label:"反應"};
 if(/^動作/.test(t)&&t.includes("／"))return {key:"other",keys:["main","other"],label:t.replace(/^動作/,"主要動作")};
 if(/^動作/.test(t)&&!t.includes("／"))return {key:"main",label:"主要動作"};
 return {key:"other",label:t?("其他 · "+t):"其他施法時間"};
}
/* Only mechanical numeric clauses need supplementing; never invent or silently drop them. */
const valueRE=/\d+d\d+(?:\s*[+＋]\s*\d+)?|[+＋-]?\d+\s*(?:英吋|英尺|分鐘|小時|回合|呎|尺|寸|哩|里|磅|秒|日|天|週|輪|級|環|點|枚|名|個|次|支|束|隻|顆|種|GP|gp|%|％|AC|DC)/g;
function values(text){return [...String(text||"").matchAll(valueRE)].map(m=>normalize(m[0])).filter(Boolean);}
function numericSupplements(full,existing){
 const parts=String(full||"").replace(/\s+/g," ").split(/(?<=[。；])\s*/).map(s=>s.trim()).filter(Boolean);
 let visible=normalize(existing);
 const supplements=[];
 for(const part of parts){
   const required=values(part);
   const scaling=/(升環施法|高環施法|戲法強化)/.test(part);
   if(part.includes("戲法強化")){
     const stages=[...part.matchAll(/(\d+)級[（(]\s*(\d+d\d+)\s*[）)]/g)];
     if(stages.length>=2){
       const compact="戲法強化："+stages.map(m=>m[1]+"級"+m[2]).join("、");
       if(!visible.includes(normalize(compact)))supplements.push(compact);
       visible+=normalize(part);
       continue;
     }
   }
   if(!scaling&&(!required.length||required.every(x=>visible.includes(x))))continue;
   if(scaling&&visible.includes(normalize(part)))continue;
   supplements.push(part);
   visible+=normalize(part);
 }
 return supplements;
}
function modifierSupplement(full,visible){
 // Canonical-only mechanism: when a spell's condensed sentence omits its
 // spellcasting ability modifier, retain the relevant original rule sentence.
 if(/施法(?:關鍵)?屬性調整值/.test(visible))return [];
 const source=String(full||"").replace(/\s+/g," ");
 return source.split(/(?<=。)/).map(x=>x.trim()).filter(x=>
   /施法(?:關鍵)?屬性調整值/.test(x)&&
   /(傷害|生命值|治療|藥水|瓶數|數量|傷害骰)/.test(x)
 ).slice(0,2).filter(x=>!normalize(visible).includes(normalize(x)));
}
function optionTypeSupplement(full,visible){
 const typeRE=/酸蝕|鈍擊|寒冷|火焰|力場|閃電|黯蝕|穿刺|毒素|心靈|光耀|揮砍|雷鳴/g;
 for(const clause of String(full||"").split(/[。；]/)){
   if(!/(選擇|任選)/.test(clause)||!/(傷害(?:的)?型別|傷害類型|抗性|吐息|從[^。]{0,100}(?:中任選|中選擇))/.test(clause))continue;
   const types=[...new Set(clause.match(typeRE)||[])];
   if(types.length<3||types.every(t=>visible.includes(t)))continue;
   return ["可選傷害／抗性類型："+types.join("／")];
 }
 return [];
}
function primarySaveSupplement(full,visible){
 const source=String(full||"");
 const m=source.match(/(?:^|。)[^。]{0,115}(?:使其進行|必須進行|進行一次)[^。]{0,35}(力量|敏捷|體質|智力|感知|魅力)\s*豁免[^。]{0,65}/);
 if(!m)return [];
 const ability=m[1];
 if(new RegExp(ability+"\\s*豁免|豁免\\s*"+ability).test(visible))return [];
 return [m[0].replace(/^。/,"").trim()];
}
function defensiveContextSupplement(full,visible){
 const source=String(full||"");
 const literalPatterns=[
   /任何完全位於該區域內的生物和物件都將免疫雷鳴傷害/,
   /目標對除了心靈傷害外的所有傷害型別具有抗性/,
   /其擁有鈍擊、穿刺和揮砍傷害的抗性[^。]{0,75}/,
   /你和你的盟友獲得毒素傷害的抗性/,
   /其進行敏捷豁免時具有優勢/,
   /你長出爪子（揮砍）、獠牙（穿刺）、犄角（穿刺）或蹄（鈍擊）/,
   /其具有對毒素、心靈傷害的免疫/,
   /免疫：黯蝕，毒素/,
   /抗性：酸蝕（僅水），閃電和雷鳴（僅氣），穿刺和揮砍（僅地）/,
   /免疫：火焰（僅火），毒素/,
   /豁免失敗者將承受全部累積的火焰傷害，豁免成功則只受到一半傷害/,
   /受到兩倍於你因此被移動呎數點的力場傷害/
 ];
 const found=[];
 for(const pattern of literalPatterns){
   const match=source.match(pattern);
   if(match&&!normalize(visible).includes(normalize(match[0])))found.push(match[0]);
 }
 return found;
}
function reconcileKnownSourceDamageTypes(id,text,full){
 // Exact case corrections only when the pinned 2024 full rule corroborates them.
 // The older 5RTools summary can disagree with the actual full rule.
 if(id==="mordenkainens-faithful-hound"&&/4d8點力場傷害/.test(full))
   text=text.replace(/4d8\s*穿刺/g,"4d8 力場");
 if(id==="blade-barrier"&&/6d10力場傷害/.test(full))
   text=text.replace(/6d10\s*揮砍/g,"6d10 力場");
 if(id==="befuddlement"&&/10d12心靈傷害/.test(full))
   text=text.replace(/4d6\s*心靈/g,"10d12 心靈");
 return text;
}
function damagePairSupplement(full,visible){
 const type="酸蝕|鈍擊|寒冷|火焰|力場|閃電|黯蝕|穿刺|毒素|心靈|光耀|揮砍|雷鳴";
 const re=new RegExp("(\\d+d\\d+)(?:\\s*[+＋]\\s*\\d+)?(?:\\s*點)?\\s*("+type+")\\s*傷害","g");
 const result=[],seen=new Set(),source=String(full||"");
 for(const m of source.matchAll(re)){
   const key=m[1]+"|"+m[2];
   if(seen.has(key))continue;
   seen.add(key);
   // The short effect may present a shared type after multiple dice;
   // do not add redundant source sentences in that case.
   const adjacent=new RegExp(m[1]+"[^。；]{0,22}"+m[2]+"|"+m[2]+"[^。；]{0,22}"+m[1]).test(visible);
   if(adjacent)continue;
   const start=Math.max(0,source.lastIndexOf("。",m.index)+1);
   const endIdx=source.indexOf("。",m.index);
   const end=endIdx<0?source.length:endIdx+1;
   const clause=source.slice(start,end).replace(/\s+/g," ").trim();
   if(clause&&!normalize(visible).includes(normalize(clause)))result.push(clause);
 }
 return result;
}
function hardCapSupplement(full,visible){
 // Chinese numerals are mechanically meaningful even when digit-only QA passes.
 const cap=/(?:至多|最多|不超過)[^。，；]{0,28}?(?:\d+|[一二兩三四五六七八九十百千]+)(?:名|個|位|枚|件|支|束|隻|顆|道|種|磅)(?:[^。，；]{0,12})/g;
 const results=[],seen=new Set();
 for(const m of String(full||"").matchAll(cap)){
   const matched=m[0].trim();
   const unit=matched.match(/(?:\d+|[一二兩三四五六七八九十百千]+)(?:名|個|位|枚|件|支|束|隻|顆|道|種|磅)/);
   if(!unit||seen.has(matched))continue;
   seen.add(matched);
   if(normalize(visible+" "+results.join(" ")).includes(normalize(matched)))continue;
   if(normalize(visible).includes(normalize(unit[0]))&&matched.length<23)continue;
   results.push("上限："+matched);
 }
 return results;
}
/* Source-backed semantic addenda: these are lookup anchors, NEVER a second rules text catalog. */
const semanticAnchors2024=Object.freeze({
  "guidance": ["你觸碰一名自願生物"],
  "enhance-ability": ["你觸碰一名生物並在力量、敏捷、智力、感知、魅力中選擇一項屬性","你可以分別為每個目標選擇一項屬性"],
  "contagion": ["此外，當你施展法術時選擇一項屬性","目標在其每回合結束時必須重新豁免","每當中毒目標受到","若目標累計三次成功","若目標累計三次失敗"],
  "beacon-of-hope": ["在施法距離內指定任意數量的生物"],
  "slow": ["被影響的生物的速度減半","該生物在其回合內可以執行一個動作或一個附贈動作","受術生物在其每個回合結束時可以再進行一次該感知豁免"],
  "enlarge-reduce": ["變巨：","縮小：","目標在力量檢定和力量豁免時具有優勢","目標在力量檢定和力量豁免時具有劣勢","額外減少1d4點傷害"],
  "find-steed": ["墮落凝視（僅限邪魔","妖精跨步（僅限妖精","失敗：目標直到你下個回合結束"],
  "giant-insect": ["劇毒噴湧Venomous Spew","多重攻擊Multiattack","體質豁免：DC等同於你的法術豁免DC","失敗：目標陷入中毒狀態"],
  "summon-construct": ["石迷昏眠Stony Lethargy","狂怒亂擊Berserk Lashing","感知豁免：DC等於你的法術豁免DC","失敗：目標不能進行藉機攻擊"],
  "summon-dragon": ["分享抗性","吐息武器。敏捷豁免","多重攻擊。","敏捷豁免：DC等於你的法術豁免DC","成功：半傷"],
  "summon-undead": ["腐滅靈光（僅腐屍）","多重攻擊：","失敗：該生物陷入中毒"],
  "summon-celestial": ["光耀之弓（僅復仇聖靈）","光耀之錘（僅守護聖靈）","治癒之觸（1/日）"],
  "summon-fiend": ["焚身爆（僅惡魔）","爪擊（僅尤格羅斯魔）","多重攻擊：","成功：半傷"],
  "summon-fey": ["妖精步伐（附贈動作）","·憤怒：","·詭詐："],
  "summon-aberration": ["再生Regeneration（僅史拉蟾）","低語靈光Whispering Aura（僅奪心魔）"],
  "summon-beast": ["攀爬30呎（僅大地）","游泳30呎（僅海洋）"],
  "summon-elemental": ["掘穴40呎（僅土）","飛行40呎（懸浮；僅氣）","游泳40呎（僅水）"],
  "bigbys-hand": ["飛擊掌：","擒拿掌：","目標必須進行一次力量豁免","目標必須進行一次敏捷豁免"],
  "wall-of-ice": ["如果冰牆形成時穿過了某生物","生物在一個回合內第一次透過這片寒氣","豁免成功，則只受一半傷害"],
  "ottos-irresistible-dance": ["豁免成功則目標直到其下個回合結束","若豁免失敗","在目標的每個自己的回合","進行的敏捷豁免與攻擊檢定具有劣勢"],
  "prismatic-wall": ["法牆由七層組成"],
  "chromatic-orb": ["能量球能夠跳躍的最大次數"],
  "grease": ["該區域變為困難地形","進入該區域或在區域內結束其回合"],
  "blur": ["不過若攻擊者能透過盲視"],
  "mirror-image": ["為每個剩餘分身投擲一個d6","如果一名生物處於目盲狀態"],
  "witch-bolt": ["無論首次攻擊是否命中","此外，如果目標與你之間的距離"],
  "crown-of-madness": ["在施法後，你在每個自己回合裡必須用一個魔法動作","目標在其每回合結束時都可以重新豁免"],
  "heat-metal": ["直到法術終止前，只要這個物件依然在施法距離內","若握持或著裝該物件的生物因此受到傷害"],
  "dispel-magic": ["所有影響該目標的三環或更低環階法術即告終止","每個影響目標的四環或更高環階法術都需要"],
  "hypnotic-pattern": ["豁免失敗者將在法術持續時間內陷入魅惑"],
  "phantasmal-killer": ["豁免成功，則目標只受一半傷害","法術持續時間內，目標在其每回合結束","所有屬性檢定與攻擊檢定都具有劣勢"],
  "leomunds-tiny-hut": ["如果光環的大小不足以完全覆蓋","在施展此法術時即處於光環內的生物"],
  "vampiric-touch": ["該法術終止前，你可以在你的每個回合內用魔法動作"],
  "compulsion": ["法術持續期間，你能夠以一個附贈動作指向","目標可以重新豁免"],
  "wall-of-fire": ["或是直徑不過20呎","火牆出現時","豁免成功，則只受一半傷害"],
  "dominate-monster": ["若你或你的盟友正在與其戰鬥","目標受到傷害時","你可以用自己的反應去要求目標"],
  "modify-memory": ["如果你正與該生物戰鬥","被魅惑的目標陷入失能","如果它受到任何傷害"],
  "sunbeam": ["豁免失敗者將受到6d8點光耀傷害","你可以在法術終止前的任一回合內以一個魔法動作"],
  "wall-of-stone": ["若豁免成功，則該生物可以執行一個反應","如果你在整個法術持續時間內一直保持住"],
  "detect-thoughts": ["你啟用下述效應之一","你可以嘗試深入目標的心靈","豁免成功，法術終止","目標均可以在其回合內使用動作"],
  "mass-heal": ["選擇施法距離內任意數量的可見生物","受該法術所治療的生物的目盲"],
  "protection-from-evil-and-good": ["上述生物型別的生物對目標的攻擊檢定具有劣勢","目標不能被其附身","目標後續進行的相關效應的豁免檢定"],
  "animal-shapes": ["選擇施法距離內任意數量的自願生物","在法術持續時間內之後的回合中","目標獲得等於野獸形態生命值的臨時生命值","挑戰等級不超過4"],
  "flesh-to-stone": ["若豁免失敗，則目標在法術持續時間內陷入束縛","在累計三次豁免成功後","在累計三次豁免失敗後"],
  "holy-aura": ["在光環內時，他們進行的所有豁免均具有優勢","當一個邪魔或亡靈生物以近戰攻擊命中"],
  "ray-of-enfeeblement": ["目標在每個其回合結束時可以重複豁免"],
  "tashas-hideous-laughter": ["其每回合結束或受到傷害時","如果豁免是因受到傷害所致"],
  "call-lightning": ["豁免失敗者受到3d10閃電傷害","直至法術結束前，你都可以執行一個魔法動作"],
  "destructive-wave": ["豁免失敗者受到5d6點雷鳴傷害","豁免成功只受一半傷害"],
  "ice-storm": ["冰雹使柱狀區域內的地面變為困難地形"],
  "insect-plague": ["蟲群使整個區域成為困難地形","生物在一個回合內第一次進入該區域內"],
  "jailarzs-storm-of-radiance": ["生物會陷入目盲和耳聾狀態","生物在一個回合內首次進入該區域內","一名生物每回合僅需進行一次該豁免"],
  "otilukes-freezing-sphere": ["任何在其表面上游泳的生物將被冰面所困","豁免成功則只受一半傷害"],
  "shatter": ["構裝生物進行該豁免時具有劣勢"],
  "symbol": ["爭鬥：","痛苦：","睡眠：","震懾："],
  "wish": ["即刻治療："],
  "charm-person": ["如果你或者你的同伴正在與它戰鬥","如果它豁免失敗"],
  "compelled-duel": ["該生物對除你之外任何生物進行攻擊檢定時","當你攻擊另一名生物時"],
  "dissonant-whispers": ["並立即執行其反應（若可用）","豁免成功則只受一半傷害"],
  "tashas-bubbling-cauldron": ["用一個附贈動作"],
  "antipathy-sympathy": ["嫌惡術：","關懷術："],
  "blade-barrier": ["牆提供四分之三掩護","生物在進入牆所佔據的空間"],
  "earthquake": ["處於此範圍內的地面被視為困難地形","你施展此法術時","裂縫撕開時"],
  "hunger-of-hadar": ["任何光照，無論是魔法光照還是其他光照都無法照亮這個區域"],
  "meld-into-stone": ["任何感知（察覺）檢定都具有劣勢","並陷入倒地}狀態"],
  "alter-self": ["你還能夠以一個魔法動作將效應切換","你無法變為一個體型不同的生物"],
  "dream": ["信使陷入失能狀態且速度降為0"],
  "entangle": ["這片被植物覆蓋的區域變為困難地形","可以用其動作進行一次力量（運動）檢定"],
  "fear": ["如果該生物結束其回合時位於一處使其視覺線中沒有你的空間"],
  "gaseous-form": ["雲霧形態的目標不能講話或操作物件","其用一個魔法動作終止其身上的法術效應"],
  "mislead": ["以一個魔法動作，你可以令分身","但如果你發動攻擊、造成傷害或施展法術"],
  "true-polymorph": ["如果你為此法術維持了最長時間的專注","新形態可以是你選擇的挑戰等級","該生物只可做出其新形態的生理結構"],
  "web": ["蛛網範圍內視為困難地形","在一個回合中首次進入蛛網","一名因蛛網陷入束縛狀態的生物可以用一個動作"],
  "yolandes-regal-presence": ["豁免成功的生物只受一半傷害","一名生物一回合只進行一次此豁免"],
  "animate-objects": ["免疫：毒素、心靈；魅惑","魅惑、力竭、恐慌、麻痺、中毒"],
  "evards-black-tentacles": ["這些觸手會將此區域地面變為困難地形","一名被束縛的生物可以用一個動作"],
  "flame-strike": ["豁免成功則只受到一半傷害"],
  "incendiary-cloud": ["豁免成功則受到一半傷害","一名生物每回合僅需進行一次該豁免"],
  "lightning-bolt": ["豁免成功則受到一半傷害"],
  "meteor-swarm": ["豁免成功則受到一半傷害","即使生物同時處於多個球狀火焰內"],
  "shapechange": ["你還可以使用魔法動作來變形為另一個符合條件的形態","你必須在之前見過該類生物至少一次"],
  "spirit-guardians": ["當靈光進入一個生物的空間","豁免成功則只受到一半傷害"],
  "wall-of-thorns": ["豁免成功，則只受一半傷害"],
  "friends": ["若目標受到傷害，或你進行一次攻擊檢定"],
  "mage-hand": ["如果幽靈手與你之間的距離超過30呎","在後續的回合中，你可以用魔法動作"],
  "hex": ["如果目標在法術終止前HP降至0"],
  "sanctuary": ["不過此法術無法令受術者免受區域效應的影響","若受保護生物發動一次攻擊"],
  "sleep": ["如果目標受到傷害，或其5呎內有人用一個動作將它搖醒","不需要睡眠的生物"],
  "haste": ["其每個回合都可作出一個額外的動作","法術終止時，目標將泛起一陣倦意"],
  "polymorph": ["目標獲得等於其野獸形態生命值的臨時生命值","此法術會在目標不具有剩餘的臨時生命值時提前結束","它不能說話也不能施法"],
  "revivify": ["該法術不能復活老死的生物"],
  "pass-without-trace": ["你和每名你選擇的生物"],
  "counterspell": ["如果那道法術是使用法術位施展的，則法術位並不會被消耗"],
  "color-spray": ["以你為源點的15呎錐狀區域內的每個生物"],
  "thunderwave": ["豁免成功則只受一半傷害"],
  "ray-of-sickness": ["若命中，則目標受到2d8點毒素傷害且陷入中毒狀態"],
  "confusion": ["受影響的目標在其每個回合結束時"],
  "conjure-animals": ["每當獸群在移動中進入了"],
  "conjure-celestial": ["一名生物一回合只能被該法術影響一次"],
  "fount-of-moonlight": ["直到法術結束，你具有光耀傷害的抗性"],
  "protection-from-poison": ["你觸及一名生物並結束其陷入的中毒狀態"],
  "fire-shield": ["溫暖護盾將賦予你對寒冷傷害的抗性"],
  "reverse-gravity": ["一名生物可以進行一次敏捷豁免以抓住","法術終止時，所有受術物件"],
  "power-word-stun": ["否則，目標的速度直至你下個回合開始前變為0","被震懾目標在每個其回合結束時"],
  "cone-of-cold": ["豁免成功則受到一半傷害","被該法術殺死的生物將成為一尊冰凍塑像"],
  "wind-walk": ["該形態下的生物除疾行和使用魔法動作變回原形以外不能執行其他動作","變回原形需要花1分鐘的時間"],
  "tree-stride": ["兩棵樹必須都是活的","在你的每個回合內，你僅能使用這樣的輸送能力一次"],
  "animal-friendship": ["如果你或你的盟友對目標造成傷害"],
  "bane": ["豁免失敗於此次魅力豁免的目標"],
  "command": ["放下： 目標放下持握的任何東西","走開： 目標消耗其整個回合","趴下： 目標陷入倒地狀態","立定： 在其回合內"],
  "faerie-fire": ["豁免失敗時也會被彩色光芒勾勒出輪廓","受術生物或物件無法受益於隱形狀態"],
  "hellish-rebuke": ["豁免成功則受到一半傷害"],
  "searing-smite": ["目標會在其每個回合開始時受到1d6點火焰傷害","豁免失敗則法術繼續生效，成功則法術終止"],
  "wrathful-smite": ["在自己的每回合結束時，被恐慌的目標可以重複此豁免"],
  "animal-messenger": ["如果該生物的挑戰等級不是0","會飛的信使24小時內可移動50裡"],
  "enthrall": ["如果你或你的同伴正在和目標生物戰鬥","被動察覺值具有-10減值"],
  "flaming-sphere": ["任何生物在火球周圍5呎內結束其回合時","如果你將火球移入某名生物所佔據的空間"],
  "hold-person": ["目標在其每回合結束時可以重新進行這次豁免"],
  "levitate": ["一個非自願的生物可以對法術進行一次體質豁免","如果你不是該法術的目標，則你可以使用魔法動作"],
  "mind-spike": ["成功則只受一半傷害","在目標豁免失敗時","目標將不能對你躲藏"],
  "moonbeam": ["其變回真實形態","一名生物每回合僅需進行一次該豁免檢定"],
  "phantasmal-force": ["目標可以用研究動作進行一次對抗你法術豁免DC的智力（調查）檢定"],
  "suggestion": ["由你指定的受術目標必須能聽到並理解你的話語","若你或你的盟友對其造成傷害此法術將提前結束"],
  "bestow-curse": ["選擇一項屬性。目標使用該屬性所進行的屬性檢定和豁免檢定具有劣勢","目標對你發動的攻擊檢定具有劣勢","在戰鬥中，目標在其每回合開始時必須進行一次感知豁免","若你的攻擊檢定或法術對目標造成了傷害"],
  "blinding-smite": ["陷入目盲的目標在其每回合結束時可以進行一次體質豁免"],
  "magic-circle": ["指定以下生物型別中的一種或多種","該類生物對柱狀區域內的生物進行攻擊檢定時具有劣勢","柱狀區域內的目標不受該類生物所魅惑、恐慌、或附身","施展該法術時，你可以選擇讓魔法作用於相反的方向"],
  "sleet-storm": ["該區域將造成重度遮蔽","該區域的地面變成困難地形","否則將陷入倒地}狀態並失去專注"],
  "stinking-cloud": ["雲團內形成重度遮蔽","因此而陷入中毒狀態期間，該生物無法執行動作或附贈動作"],
  "wind-wall": ["豁免成功，則只受一半傷害","體型為小型或更小的飛行生物或物件無法穿過風牆"],
  "banishment": ["身處半位面期間，目標會陷入失能狀態","若該目標的生物型別為異怪、天族、元素、妖精或邪魔"],
  "charm-monster": ["如果你或者你的盟友正在與它戰鬥","在你或你的盟友對它造成傷害時提前結束"],
  "control-water": ["在後續的你的回合中，你能夠以一個魔法動作","分水： 你使區域內的水體分開","轉向： 你使區域內的流水","豁免成功則只受一半傷害","一名生物若想以游泳方式離開漩渦"],
  "dominate-beast": ["目標受到傷害時，可以重複進行豁免","你可以用自己的反應去要求目標執行一項反應"],
  "staggering-smite": ["豁免失敗則目標陷入震懾狀態直到你的下個回合結束"],
  "cloudkill": ["豁免成功則受到一半傷害","一名生物一回合只需要進行一次該豁免","霧氣存在區域視為重度遮蔽"],
  "dispel-evil-and-good": ["天族、元素、妖精、邪魔和亡靈對你的攻擊檢定具有劣勢","破咒： 以一個魔法動作","目標必須成功於一次魅力豁免"],
  "dominate-person": ["目標受到傷害時，可以重複進行該豁免","你可以用自己的反應去要求目標執行一項反應"],
  "hold-monster": ["目標在其每回合結束時可以重新進行這次豁免"],
  "seeming": ["你選擇施法距離內你能看見的任意數量生物","不願意受該法術影響的目標可以進行一次魅力豁免","此法術產生的變化無法應對物理檢查"],
  "chain-lightning": ["每束閃電必須指定不同的目標","豁免成功受到半數傷害"],
  "harm": ["豁免成功則僅受到一半傷害","此法術不能將目標的生命值上限降至1以下"],
  "magic-jar": ["豁免失敗，則你的靈魂進入目標的身體","附身於一具軀體時，如果容器處在你身邊 100 呎內","如果容器被毀或者法術終止"],
  "mass-suggestion": ["你指定的受術目標必須能聽到並理解你的話語","每個目標必須進行一次感知豁免","如果你或你同伴中的任何人傷害了一個被該法術影響的生物"],
  "forcecage": ["牢籠內的生物不能以非魔法的手段離開","該法術不能被解除魔法解除"],
  "eldritch-blast": ["你可以使這些射線攻擊同一個目標或分別攻擊不同的目標","你需要為每條射線分別進行攻擊檢定"],
  "elementalism": ["召土： 你創造灰塵或沙子組成的薄帷","召火： 你在一處5呎立方區域內創造一片無害餘燼","召水： 你在一處5呎立方範圍內創造一片涼爽的"],
  "fire-bolt": ["未被著裝或攜帶的可燃物件被該法術命中時將開始燃燒"],
  "sacred-flame": ["目標無法享受來自半身掩護和四分之三掩護的增益"],
  "thorn-whip": ["如果目標生物的體型不超過大型"],
  "comprehend-languages": ["這個法術並不能解讀符號和暗語"],
  "create-or-destroy-water": ["作為另一種選項，你使施法距離內一處30呎的立方區域降下雨水","作為另一種選項，你使施法距離內一片30呎立方區域的濃霧消失不見"],
  "disguise-self": ["此法術產生的變化無法應對物理檢查","研究動作研究你的外貌"],
  "goodberry": ["一名生物可以用一個附贈動作吃下一顆漿果"],
  "ice-knife": ["無論擊中與否，裂片都會在那之後立刻爆裂"],
  "illusory-script": ["擁有真實視覺的生物可以讀出其內被隱藏的資訊"],
  "magic-missile": ["你還可以指定它們擊中同一個目標或是分別擊中幾個目標"],
  "tensers-floating-disk": ["如果放在浮碟上的物件重量超過500磅"],
  "blindness-deafness": ["目標可以在其每個回合結束時重複此豁免"],
  "cloud-of-daggers": ["每當立方區域移動到一名生物區域內時","一名生物一回閤中只會受到一次該傷害"],
  "dragons-breath": ["豁免成功只受一半傷害"],
  "gust-of-wind": ["線上狀區域內結束其回合的生物也必須進行同樣的豁免","你可以在自己隨後的回合內用一個附贈動作改變線狀風道的方向"],
  "nystuls-magic-aura": ["偽裝： 選擇一種目標實際生物型別以外的生物類別","虛假靈光： 你改變物件在能夠偵測魔法靈光的偵測法術"],
  "zone-of-truth": ["生物在一回閤中首次進入該區域","你可以知曉每個受術生物的豁免是成功與否"],
  "animate-dead": ["若你想將對這些生物的控制時間再延長24小時","你無法用同一具骸骨或遺體喚起多個亡靈生物"],
  "clairvoyance": ["施展該法術時，你可以選擇進行觀察或是聆聽","你能夠以一個附贈動作在觀察和聆聽之間切換"],
  "conjure-barrage": ["每名由你選擇且你可見的位於60呎錐形區域內的生物"],
  "elemental-weapon": ["你觸碰的一把非魔法武器變成魔法武器"],
  "fireball": ["區域內所有未被著裝或攜帶的可燃物件會開始燃燒"],
  "glyph-of-warding": ["如果受術的物件或表面從被施法位置被移開超過10呎","法術刻紋： 作為創造符文的一部分"],
  "phantom-steed": ["坐騎受到傷害時，法術將提前終止"],
  "protection-from-energy": ["你觸及的一名自願生物"],
  "remove-curse": ["如果該物件是一件詛咒魔法物品","不過該法術可以打破詛咒物品與其所有者之間的同調"],
  "tongues": ["且知道至少一門語言的生物都能理解它"],
  "conjure-woodland-beings": ["成功則只受一半傷害","一名生物一回合只需要進行一次該豁免"],
  "death-ward": ["目標受到直接致死而不造成傷害的效應影響時"],
  "dimension-door": ["你還可以帶上一名自願生物一同傳送"],
  "mordenkainens-faithful-hound": ["當一個體型不小於小型的生物進入守護犬30呎內時","守護犬擁有30呎真實視覺","在你施展法術的後續回合裡，你能夠以一個魔法動作"],
  "mordenkainens-private-sanctum": ["從下列詞條中選擇一種或多種生效","任何事物無法透過傳送進出被保護區域"],
  "otilukes-resilient-sphere": ["任何事物，包括實體物件、能量或其它法術效應，都不能穿透障壁","被封住的生物可以使用一個動作推動球壁","以球體為目標施展一道解離術"],
  "antilife-shell": ["除亡靈生物和構裝生物之外所有型別的生物","若你移動迫使受影響生物進入護罩內"],
  "contact-other-plane": ["當你施展該法術時，進行一次DC15的智力豁免","對你施展法術高等復原術將結束該效應"],
  "geas": ["該傷害一日至多生效一次","如果你釋出自殺指令則法術即時終止"],
  "planar-binding": ["生物型別為天族、元素、妖精或邪魔","生物必須在施法過程中一直位於施法距離內"],
  "reincarnate": ["若種族描述中提供了可選選項","其種族特質將以新種族的相應特質做更替"],
  "synaptic-static": ["為維持專注而進行體質豁免檢定時都獲得一枚d6的減值","在目標的每個回合結束時它都可以重新進行智力豁免檢定"],
  "wall-of-force": ["不能被解除魔法所解除，但解離術可以使其立即摧毀","力場牆能夠延伸進以太位面"],
  "create-undead": ["你只能在夜晚施展這道法術","使用八環法術位施展該法術時","當你使用九環法術位施展該法術時"],
  "forbiddance": ["從下列選項中選擇一項或多項","說出密語的生物即使進入區域也不會受到該法術的傷害"],
  "guards-and-wards": ["你可以指明特定個體以讓其不受法術效應的影響","解除魔法對銅牆鐵壁本身沒有效果","門： 所有受保護區域內的門都被魔法性地鎖住"],
  "move-earth": ["上述任何改造的地形範圍不得超過整個區域最大邊長的一半","每為法術維持10分鐘專注，你都可以選擇一片新的地形區域"],
  "delayed-blast-fireball": ["豁免失敗則法術立即終止並觸發爆炸效應"],
  "divine-word": ["豁免失敗者，若其生命值低於50"],
  "etherealness": ["只有同樣處在以太位面的其他生物、物件和效應才能被你影響或影響你","如果你在施展法術時正處於以太位面"],
  "mirage-arcane": ["該法術不可以偽裝、隱藏或增添生物","其可以把空曠的地面變成困難地形"],
  "mordenkainens-magnificent-mansion": ["你和你施展該法術時指定的任意生物都可以進入","該法術終止時，任何仍處於該異次元空間內的生物或物件"],
  "mordenkainens-sword": ["隨後你可以對相同或不同目標再次發動該攻擊"],
  "teleport": ["目的地必須與你位於同一個存在位面","至多八名施法距離內你可見的自願生物"],
  "clone": ["前提是該靈魂必須保持自由且願意歸來"],
  "sunburst": ["豁免成功則僅受到一半傷害","因該法術陷入目盲的生物在其每回合結束時都可以再進行一次體質豁免","該法術將驅散法術區域內所有由法術所創造的黑暗"],
  "tsunami": ["水牆出現後你的每回合開始時","一名生物一輪只能受到一次此傷害","必須成功於一次對抗你法術豁免DC的力量（運動）檢定"],
  "storm-of-vengeance": ["該區域內無法使用武器發動遠端攻擊"],
  "time-stop": ["若你的一個動作或任何你創造出來的效應影響到除你之外的任何生物"],
  "true-resurrection": ["並非死於年老的生物","使其以生命值全滿的狀態回生","此法術還能為遺體已不存在的生物使用"],
  "weird": ["豁免成功時，目標僅受到一半傷害","在受恐慌的生物自己的每個回合結束時"]
});
function semanticSourceAddenda(id,full,visible){
 const anchors=semanticAnchors2024[id];if(!anchors)return [];
 const src=String(full||'').replace(/\s+/g,' ').trim();
 const parts=[],seen=new Set();
 for(const anchor of anchors){
  const position=src.indexOf(anchor);
  if(position<0)continue; // pinned canonical must be checked by regression; never invent
  const start=src.lastIndexOf('。',position)+1;
  const endIndex=src.indexOf('。',position+anchor.length-1);
  const end=endIndex<0?src.length:endIndex+1;
  const clause=src.slice(start,end).trim();
  // 召喚生物的完整數值塊常沒有句號：只保留此回合已核對的
  // canonical 錨點，避免把同一份 AC／HP／屬性表重複附加。
  const addendum=clause.length>185?anchor.trim():clause;
  if(!addendum||seen.has(addendum)||normalize(visible).includes(normalize(addendum)))continue;
  seen.add(addendum);parts.push(addendum);
 }
 return parts;
}
function preview(sp,level=1,meta={}){
 const id=String(sp?.identifier||"");
 const row=rows.get(id);
 const full=String(g.SPELLS_2024_FULL_RULES?.[id]||sp?.d||"").trim();
 if(!row)return {text:full||"",numbers:values(full)};
 const short=String(row[13]||"").replace(/\s+/g," ").trim();
 const fact=g.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,level)||{};
 let text=fact.effect||short||full;
 // The canonical short text can be intentionally brief but must not override a
 // numeric cap given in the complete 2024 rule. No separate rules catalog.
 if(id==="animate-objects"&&/最大數量等於你的施法屬性調整值/.test(full)){
   text="依施法屬性調整值決定最多活化物件數量（中／小型計1個、大型計2個、巨型計3個），形成構裝作戰";
 }else if(id==="arcane-vigor"&&/一枚或兩枚/.test(full)){
   text="消耗1或2枚未使用生命骰，回復擲骰總和＋施法屬性調整值生命值";
 }
 // Correct known misleading quick-fact wording only when pinned full rules corroborate it.
 if(id==="slow"&&/其AC和敏捷豁免都獲得-2減值/.test(full))
   text=text.replace(/AC\s*與豁免降低/,"AC 與敏捷豁免 -2");
 if(id==="prismatic-wall"&&/法牆由七層組成/.test(full))
   text=text.replace(/八層/,"七層");
 if(id==="counterspell"&&/法術位並不會被消耗/.test(full))
   text=text.replace(/法術位被浪費/g,"法術位不會被消耗");
 // These older concise summaries conflict with the pinned 2024 canonical effects.
 // Scope them to creator-preview text; never mutate source, tooltip or 2014.
 if(id==="message"&&/施法距離內的一名生物/.test(full)&&/可以用只有你能聽見的低語回覆你/.test(full))
   text="向施法距離內的一名生物低聲傳訊，該生物能低語回覆；隔著障礙施法時須熟悉目標並知道其位置";
 if(id==="resistance"&&/一名生物一回合只能受到一次該法術的增益/.test(full))
   text="觸碰一名自願生物並選擇傷害型別；所選傷害每回合至多一次減少1d4，效果持續至法術結束";
 if(id==="aura-of-vitality"&&/當你創造靈光時和它持續時你的每個回合開始/.test(full))
   text="創造30呎半徑靈光時，以及你之後每回合開始時，選擇區域內一名生物恢復2d6生命值";
 if(id==="disintegrate"&&/豁免失敗則受10d6\+40點力場傷害/.test(full))
   text=text.replace(/對目標造成\s*10d6\+40\s*力場傷害/,"目標敏捷豁免失敗受到10d6+40 力場傷害");
 text=reconcileKnownSourceDamageTypes(id,text,full);
 const extra=[];
 if(id==="shillelagh"){
   const base=g.ZIZI_5R_SPELL_QUICK_FACTS_2024?.(sp,1)?.damage||"1d8＋施法屬性調整值";
   const ranks=[...full.matchAll(/(\d+)級[（(]\s*(\d+d\d+)\s*[）)]/g)].map(m=>m[1]+"級 "+m[2]);
   text="強化短棒或長棍，以施法屬性進行攻擊與傷害擲骰；傷害 "+base;
   if(ranks.length)text+="；"+ranks.join("、");
   if(level>=5&&fact.damage)text+="；目前 "+fact.damage;
   text+="。";
 }else{
   const correctedDamage=reconcileKnownSourceDamageTypes(id,fact.damage||"",full);
   const mechanics=[correctedDamage?("傷害 "+correctedDamage):"",fact.heal?("治療 "+fact.heal):"",fact.save?("豁免 "+fact.save):""].filter(Boolean);
   const hasChoiceTypes=/任選|選擇.*傷害型別/.test(short)&&
     (short.match(/酸蝕|寒冷|火焰|閃電|毒素|心靈|雷鳴|鈍擊|力場|穿刺|揮砍|光耀|黯蝕/g)||[]).length>=2;
   for(const m of mechanics){
     // Quick-facts may select the first damage type, but a choice spell
     // must retain the player's options rather than imply one fixed type.
     if(hasChoiceTypes&&m.startsWith("傷害 ")&&/\d+d\d+/.test(text))continue;
     if(!normalize(text).includes(normalize(m.replace(/^(傷害|治療|豁免)\s*/,""))))extra.push(m);
   }
   if(extra.length)text+="；"+extra.join("；");
 }
 const metaText=[meta?.range,meta?.dur,meta?.time].filter(Boolean).join(" ");
 const supplements=id==="shillelagh"?[]:numericSupplements(full,text+" "+metaText);
 if(id!=="shillelagh")supplements.push(...modifierSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...optionTypeSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...primarySaveSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...defensiveContextSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...damagePairSupplement(full,text+" "+supplements.join(" ")));
 supplements.push(...hardCapSupplement(full,text+" "+metaText+" "+supplements.join(" ")));
 if(/豁免成功(?:則|時)?(?:傷害減半|受到的傷害減半)|豁免成功(?:則|時)?.{0,8}傷害減半/.test(full)&&!/豁免成功.{0,8}傷害減半/.test(text)){
   supplements.push("豁免成功時傷害減半");
 }
 const semantic=semanticSourceAddenda(id,full,text+" "+supplements.join(" "));
 supplements.push(...semantic);
 if(supplements.length)text+="；"+supplements.join(" ");
 // Avoid repeated canonical sentence and a known upstream malformed flavour fragment
 // in the condensed preview only; retain every mechanical result and the full tooltip.
 if(id==="vitriolic-sphere"){
   const repeat="豁免失敗的生物不僅將受到10d4點酸蝕傷害，其下個回合結束時還將再受到5d4點酸蝕傷害。";
   if(full.includes(repeat)&&text.split(repeat).length>2)text=text.replace(repeat,"");
 }
 if(id==="toll-the-dead"&&/一陣哀慟的鐘鳴在距/.test(full))
   text=text.replace(/你對著施法距離內一名你可見的生物一指，隨後目標10呎內響起一陣哀慟的鐘鳴在距。/g,"目標10呎內響起鐘聲。");
 text=text.replace(/([\u4e00-\u9fa5])}狀態/g,"$1狀態");
 return {text:text.trim(),numbers:values(full)};
}
g.ZIZI_CREATOR_SPELL_PREVIEW_2024=Object.freeze({action,preview,numericSupplements,values});
})(globalThis);

"use strict";
/* Creator-only semantic review regression. Checks 2024 pinned full-rule cross-references. */
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
for(const f of ["assets/data/spells-phb-2024.js","assets/data/spell-rules-2024.js","assets/spell-quick-facts-2024.js","assets/creator-spell-preview-2024.js"])require(path.join(root,f));
const rows=globalThis.SPELLS_2024_TUPLES,fulls=globalThis.SPELLS_2024_FULL_RULES,engine=globalThis.ZIZI_CREATOR_SPELL_PREVIEW_2024;
const norm=s=>String(s||"").replace(/\s+/g,"").replace(/＋/g,"+").replace(/([\u4e00-\u9fa5])\}狀態/g,"$1狀態");
const data=new Map(rows.map(r=>[r[0],r]));
function view(id,level=4){const r=data.get(id);if(!r)throw Error("unknown spell "+id);return engine.preview({identifier:id,n:r[3],d:fulls[id],con:!!r[6],rit:!!r[7],signature:r[14]},level,{time:r[9],range:r[10],dur:r[12]}).text;}
const expected={
 "guidance":["一名自願生物","選擇一項技能"],
 "enhance-ability":["力量、敏捷、智力、感知、魅力","一項屬性"],
 "contagion":["選擇一項屬性","豁免檢定時具有劣勢","三次成功","三次失敗","中毒狀態不會結束"],
 "beacon-of-hope":["任意數量"],
 "slow":["敏捷豁免","-2","不能執行反應","一個動作或一個附贈動作","感知豁免"],
 "enlarge-reduce":["力量檢定和力量豁免時具有優勢","具有劣勢","減少1d4"],
 "find-steed":["墮落凝視","感知豁免","陷入恐慌","妖精跨步","60呎"],
 "giant-insect":["劇毒噴湧","體質豁免","中毒狀態","多重攻擊"],
 "summon-construct":["石迷昏眠","感知豁免","不能進行藉機攻擊","狂怒亂擊"],
 "summon-dragon":["分享抗性","敏捷豁免","30呎","成功：半傷"],
 "summon-undead":["腐滅靈光","體質豁免","陷入中毒","多重攻擊"],
 "summon-celestial":["光耀之弓（僅復仇聖靈）","光耀之錘（僅守護聖靈）","治癒之觸（1/日）"],
 "summon-fiend":["焚身爆","爪擊（僅尤格羅斯魔）","成功：半傷","多重攻擊"],
 "summon-fey":["妖精步伐（附贈動作）","憤怒","詭詐"],
 "summon-aberration":["再生Regeneration（僅史拉蟾）","低語靈光Whispering Aura（僅奪心魔）"],
 "summon-beast":["攀爬30呎（僅大地）","游泳30呎（僅海洋）"],
 "summon-elemental":["掘穴40呎（僅土）","飛行40呎（懸浮；僅氣）","游泳40呎（僅水）"],
 "bigbys-hand":["飛擊掌","擒拿掌","力量豁免","敏捷豁免"],
 "wall-of-ice":["10d6","5d6","敏捷豁免","體質豁免","一半傷害"],
 "ottos-irresistible-dance":["豁免成功則目標直到其下個回合結束","若豁免失敗","敏捷豁免與攻擊檢定具有劣勢"],
 "prismatic-wall":["七層"],
 "chromatic-orb":["跳躍的最大次數","法術位環階","每名生物只能被指定"],
 "grease":["困難地形","結束其回合","敏捷豁免"],
 "blur":["盲視","真實視覺"],
 "mirror-image":["一個d6","3或以上","盲視","真實視覺"],
 "witch-bolt":["無論首次攻擊是否命中","附贈動作","施法距離"],
 "crown-of-madness":["魔法動作維持","每回合結束時"],
 "heat-metal":["附贈動作","2d8","體質豁免"],
 "dispel-magic":["三環或更低","四環或更高","DC10+"],
 "hypnotic-pattern":["魅惑"],
 "phantasmal-killer":["豁免成功","一半傷害","檢定都具有劣勢"],
 "leomunds-tiny-hut":["光環的大小不足","施展此法術時即處於光環內"],
 "vampiric-touch":["每個回合內用魔法動作"],
 "compulsion":["附贈動作","重新豁免"],
 "wall-of-fire":["直徑不過20呎","豁免成功","一半傷害"]
};
const additionalExpected={
 "dominate-monster":["豁免成功","優勢","反應"],
 "modify-memory":["失能","魅惑","優勢"],
 "sunbeam":["目盲","魔法動作"],
 "wall-of-stone":["反應","永久存在"],
 "detect-thoughts":["魔法動作","智力（奧秘）"],
 "mass-heal":["任意數量","目盲","耳聾","中毒"],
 "protection-from-evil-and-good":["劣勢","附身","豁免檢定"],
 "animal-shapes":["任意數量","挑戰等級不超過4","魔法動作"],
 "flesh-to-stone":["束縛","三次豁免成功","三次豁免失敗"],
 "holy-aura":["劣勢","目盲"],
 "ray-of-enfeeblement":["重複豁免"],
 "tashas-hideous-laughter":["受到傷害時","優勢"],
 "call-lightning":["魔法動作","半數傷害"],
 "destructive-wave":["倒地","一半傷害"],
 "ice-storm":["困難地形"],
 "insect-plague":["困難地形","結束其回合"],
 "jailarzs-storm-of-radiance":["目盲","耳聾","僅需進行一次"],
 "otilukes-freezing-sphere":["束縛","豁免成功"],
 "shatter":["構裝生物","劣勢"],
 "symbol":["爭鬥：","痛苦：","睡眠：","震懾："],
 "wish":["即刻治療"],
 "charm-person":["優勢","魅惑狀態"],
 "compelled-duel":["劣勢","30呎"],
 "dissonant-whispers":["反應","一半傷害"],
 "tashas-bubbling-cauldron":["附贈動作"],
 "antipathy-sympathy":["嫌惡術","關懷術"],
 "blade-barrier":["四分之三掩護","困難地形"],
 "earthquake":["困難地形","裂縫"],
 "hunger-of-hadar":["目盲"]
};
const thirdExpected={
 "meld-into-stone":["感知（察覺）檢定","劣勢","倒地"],
 "alter-self":["魔法動作","體型不同"],
 "dream":["失能","速度降為0"],
 "entangle":["困難地形","力量（運動）檢定"],
 "fear":["視覺線中沒有你","感知豁免"],
 "gaseous-form":["不能講話","魔法動作"],
 "mislead":["魔法動作","隱形隨之結束"],
 "true-polymorph":["最長時間的專注","挑戰等級"],
 "web":["困難地形","力量（運動）檢定"],
 "yolandes-regal-presence":["豁免成功的生物只受一半傷害","一回合只進行一次"],
 "animate-objects":["魅惑","中毒"],
 "evards-black-tentacles":["困難地形","力量（運動）檢定"],
 "flame-strike":["一半傷害"],
 "incendiary-cloud":["一半傷害","每回合僅需進行一次"],
 "lightning-bolt":["一半傷害"],
 "meteor-swarm":["一半傷害","即使生物同時處於多個"],
 "shapechange":["魔法動作","之前見過"],
 "spirit-guardians":["當靈光進入","一半傷害"],
 "wall-of-thorns":["一半傷害"]
};
const fifthExpected={
 "friends":["若目標受到傷害","法術會提早結束"],
 "mage-hand":["魔法動作","30呎"],
 "hex":["附贈動作詛咒另一個生物"],
 "sanctuary":["無法令受術者免受區域效應","受保護生物發動一次攻擊"],
 "sleep":["搖醒","不需要睡眠的生物"],
 "haste":["僅一次攻擊","失能"],
 "polymorph":["臨時生命值","不能說話也不能施法"],
 "revivify":["老死","身體部位"],
 "pass-without-trace":["每名你選擇的生物"],
 "counterspell":["法術位並不會被消耗"],
 "color-spray":["每個生物","下個你的回合結束"],
 "thunderwave":["只受一半傷害"],
 "ray-of-sickness":["陷入中毒狀態"],
 "confusion":["每個回合結束時","重新進行"],
 "conjure-animals":["每當獸群在移動中進入"],
 "conjure-celestial":["一回合只能被該法術影響一次"],
 "fount-of-moonlight":["光耀傷害的抗性"],
 "protection-from-poison":["結束其陷入的中毒狀態"],
 "fire-shield":["對寒冷傷害的抗性","對火焰傷害的抗性"],
 "reverse-gravity":["固定物件","所有受術物件"],
 "power-word-stun":["速度","每個其回合結束"],
 "cone-of-cold":["一半傷害","冰凍塑像"],
 "wind-walk":["魔法動作","花1分鐘"],
 "tree-stride":["活的","每個回合內"]
};
const reviewedEquivalentProof={
 "produce-flame": [
  "1d8",
  "60呎",
  "20呎"
 ],
 "ray-of-frost": [
  "1d8",
  "10呎",
  "5級"
 ],
 "shocking-grasp": [
  "1d8",
  "藉機攻擊",
  "5級"
 ],
 "sorcerous-burst": [
  "1d8",
  "施法屬性調整值",
  "心靈"
 ],
 "starry-wisp": [
  "1d8",
  "10呎",
  "隱形"
 ],
 "vicious-mockery": [
  "1d6",
  "劣勢",
  "5級"
 ],
 "word-of-radiance": [
  "5呎",
  "1d6",
  "體質豁免"
 ],
 "cure-wounds": [
  "2d8",
  "施法屬性調整值"
 ],
 "guiding-bolt": [
  "4d6",
  "優勢"
 ],
 "hail-of-thorns": [
  "1d10",
  "5呎",
  "敏捷豁免"
 ],
 "inflict-wounds": [
  "2d10",
  "體質豁免",
  "減半"
 ],
 "thunderous-smite": [
  "2d6",
  "10呎",
  "倒地"
 ],
 "spiritual-weapon": [
  "1d8",
  "附贈動作",
  "20呎"
 ],
 "lightning-arrow": [
  "4d8",
  "2d8",
  "10呎"
 ],
 "divination": [
  "7日",
  "25％"
 ],
 "greater-invisibility": [
  "隱形"
 ],
 "guardian-of-faith": [
  "20",
  "60",
  "10呎"
 ],
 "commune": [
  "三個",
  "25％"
 ],
 "conjure-elemental": [
  "8d8",
  "4d8",
  "束縛"
 ],
 "conjure-volley": [
  "8d8",
  "40呎",
  "敏捷"
 ],
 "circle-of-death": [
  "8d8",
  "60呎",
  "減半"
 ],
 "conjure-fey": [
  "3d12",
  "30呎",
  "恐慌"
 ],
 "heroes-feast": [
  "十二",
  "2d10",
  "24小時"
 ],
 "foresight": [
  "優勢",
  "劣勢",
  "八小時"
 ],
 "power-word-kill": [
  "100",
  "12d12"
 ],
 "scrying": [
  "24小時",
  "豁免成功",
  "豁免失敗",
  "10呎"
 ],
 "finger-of-death": [
  "7d8+30",
  "傷害減半"
 ],
 "fire-storm": [
  "7d10",
  "至多十個",
  "減半"
 ],
 "prismatic-spray": [
  "1d8",
  "八色",
  "敏捷"
 ]
};
const errors=[];
if(rows.length!==391)errors.push("Source count expected 391 got "+rows.length);
for(const [id,words] of Object.entries({...expected,...additionalExpected,...thirdExpected,...fifthExpected})){
 const preview=norm(view(id)),source=norm(fulls[id]);
 for(const word of words){
  if(!source.includes(norm(word)))errors.push(id+": canonical expected marker absent "+word);
  else if(!preview.includes(norm(word)))errors.push(id+": preview missing "+word);
 }
}
for(const [id,words] of Object.entries(reviewedEquivalentProof)){
 const visible=norm(view(id));
 for(const token of words)if(!visible.includes(norm(token)))errors.push("Reviewed equivalent mechanic missing "+id+":"+token);
}
const wall=view("prismatic-wall");
if(wall.includes("八層"))errors.push("Prismatic Wall must not assert eight layers");
if(view("counterspell").includes("法術位被浪費"))errors.push("Counterspell incorrectly consumes spell slot");
if(/任意距離|25\\s*字/.test(view("message")))errors.push("Message must be bounded to canonical spell range with no invented 25-word cap");
if(/隨後法術終止/.test(view("resistance")) || !/每回合至多一次/.test(view("resistance")))errors.push("Resistance must persist, once per round");
if(/以附贈動作治療|每回合以附贈動作/.test(view("aura-of-vitality")) || !/每回合開始時/.test(view("aura-of-vitality")))errors.push("Aura of Vitality healing is triggered at start of caster turn, NOT a bonus action");
if(!/豁免失敗/.test(view("disintegrate")))errors.push("Disintegrate damage must explicitly be conditional on failed save");
if(/鐘鳴在距/.test(view("toll-the-dead")))errors.push("Malformed canonical flavour fragment must not enter the condensed preview");
const vitriolicClause="豁免失敗的生物不僅將受到10d4點酸蝕傷害，其下個回合結束時還將再受到5d4點酸蝕傷害。";
if(view("vitriolic-sphere").split(vitriolicClause).length>2)errors.push("Vitriolic sphere repeats exact source sentence");

const slow=view("slow");
if(slow.includes("AC 與豁免降低"))errors.push("Slow must not generalize to all saves");
for(const level of [1,5,11,17])for(const r of rows.filter(r=>r[4]===0))if(!view(r[0],level).trim())errors.push("Empty cantrip "+r[0]+" at "+level);
const helper=fs.readFileSync(path.join(root,"assets/creator-spell-preview-2024.js"),"utf8");
const cacheToken=fs.readFileSync(path.join(root,"index.html"),"utf8").match(/creator-spell-preview-2024\.js\?v=sem391-([a-f0-9]{12})/);
const previewHash=require("node:crypto").createHash("sha256").update(helper.replace(/\r\n/g,"\n"),"utf8").digest("hex").slice(0,12);
if(!cacheToken||cacheToken[1]!==previewHash)errors.push("Creator preview script cache version must equal actual source hash");
const rawMap=helper.match(/const semanticAnchors2024=Object\.freeze\((\{[\s\S]*?\})\);/);
if(!rawMap)errors.push("Source anchor map missing");
else{
 const selectors=JSON.parse(rawMap[1]);
 const missingSource=Object.entries(selectors).flatMap(([id,tokens])=>tokens.filter(t=>!fulls[id]?.includes(t)).map(t=>id+":"+t));
 if(missingSource.length)errors.push("Canonical source selector missing "+missingSource.join(","));

 // Preserve every canonical-sourced semantic condition added during target/option review.
 const editorialIds=["eldritch-blast", "elementalism", "fire-bolt", "sacred-flame", "thorn-whip", "comprehend-languages", "create-or-destroy-water", "disguise-self", "goodberry", "ice-knife", "illusory-script", "magic-missile", "tensers-floating-disk", "blindness-deafness", "cloud-of-daggers", "dragons-breath", "gust-of-wind", "nystuls-magic-aura", "zone-of-truth", "animate-dead", "clairvoyance", "conjure-barrage", "elemental-weapon", "fireball", "glyph-of-warding", "phantom-steed", "protection-from-energy", "remove-curse", "tongues", "conjure-woodland-beings", "death-ward", "dimension-door", "mordenkainens-faithful-hound", "mordenkainens-private-sanctum", "otilukes-resilient-sphere", "antilife-shell", "contact-other-plane", "geas", "planar-binding", "reincarnate", "synaptic-static", "wall-of-force", "create-undead", "forbiddance", "guards-and-wards", "move-earth", "delayed-blast-fireball", "divine-word", "etherealness", "mirage-arcane", "mordenkainens-magnificent-mansion", "mordenkainens-sword", "teleport", "clone", "sunburst", "tsunami", "storm-of-vengeance", "time-stop", "true-resurrection", "weird"];
 for(const id of editorialIds){
  const visible=norm(view(id));
  for(const marker of selectors[id]||[]){
   if(!norm(fulls[id]).includes(norm(marker)))errors.push("Canonical target anchor absent "+id+":"+marker);
   else if(!visible.includes(norm(marker)))errors.push("Preview target mechanic absent "+id+":"+marker);
  }
 }

 // Verify each newly adjudicated saving throw is actually visible in the CREATOR preview.
 const adjudicatedSaveIds=JSON.parse("[\"animal-friendship\", \"bane\", \"command\", \"faerie-fire\", \"hellish-rebuke\", \"searing-smite\", \"wrathful-smite\", \"animal-messenger\", \"enthrall\", \"flaming-sphere\", \"hold-person\", \"levitate\", \"mind-spike\", \"moonbeam\", \"phantasmal-force\", \"suggestion\", \"bestow-curse\", \"blinding-smite\", \"magic-circle\", \"sleet-storm\", \"stinking-cloud\", \"wind-wall\", \"banishment\", \"charm-monster\", \"control-water\", \"dominate-beast\", \"staggering-smite\", \"cloudkill\", \"dispel-evil-and-good\", \"dominate-person\", \"hold-monster\", \"seeming\", \"chain-lightning\", \"harm\", \"magic-jar\", \"mass-suggestion\", \"forcecage\"]");
 for(const id of adjudicatedSaveIds){
  const text=norm(view(id));
  for(const marker of selectors[id]||[]){
   if(!norm(fulls[id]).includes(norm(marker)))errors.push("Canonical save anchor absent "+id+":"+marker);
   else if(!text.includes(norm(marker)))errors.push("Preview save mechanic absent "+id+":"+marker);
  }
 }

}
console.log("SEMANTIC_QA",JSON.stringify({source:rows.length,caseCount:Object.keys({...expected,...additionalExpected,...thirdExpected,...fifthExpected}).length,cantripLevels:[1,5,11,17],failures:errors.length,details:errors.slice(0,80)}));
if(errors.length)process.exitCode=1;

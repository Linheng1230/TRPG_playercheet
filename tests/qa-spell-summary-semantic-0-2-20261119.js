"use strict";
/* Source-anchored review of 161 zero-to-second-level PHB2024 teasers.
 * This test verifies data provenance and selected player-visible rules,
 * NOT full semantic equivalence of 113-character glances.
 * Draft stays blocked until every critical mechanic and browser path is certified. */
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
for (const file of [
  "assets/data/spells-phb-2024.js",
  "assets/data/spell-rules-2024.js",
  "assets/spell-quick-facts-2024.js",
  "assets/creator-spell-preview-2024.js",
  "assets/creator-spell-glance-2024.js",
]) require(path.join(root, file));
const audit = require("../docs/SPELL_PREVIEW_SEMANTIC_0_2_AUDIT_20261119.json");
const rows = globalThis.SPELLS_2024_TUPLES;
const fullRules = globalThis.SPELLS_2024_FULL_RULES;
const glance = globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024;
assert.equal(audit.base_main_sha, "2b82031ccc3d65b1f94db34a566b658e48891ecb");
assert.equal(rows.length, 391);
assert.equal(Object.keys(fullRules).length, 391);
assert.equal(audit.entries.length, 161);
const all = rows.filter(r => r[4] <= 2);
assert.equal(all.length, 161);
for (const [level, count] of [[0,34],[1,64],[2,63]]) {
  assert.equal(all.filter(r=>r[4]===level).length,count);
  assert.equal(audit.entries.filter(e=>e.level===level).length,count);
}
const byId = new Map(all.map(r=>[r[0],r]));
const required = {
 "true-strike":"達到5級", "friends":"24小時", "ray-of-frost":"10呎",
 "dancing-lights":"附贈動作", "sorcerous-burst":"至多等於施法屬性調整值",
 "mage-hand":"10磅", "thorn-whip":"大型", "animal-friendship":"感知豁免",
 "armor-of-agathys":"不再具有臨時生命值", "arms-of-hadar":"所有生物",
 "charm-person":"交戰時豁免有優勢", "chromatic-orb":"至少兩枚",
 "command":"感知豁免", "compelled-duel":"以外生物具有劣勢",
 "detect-magic":"另用魔法動作", "detect-poison-and-disease":"魔法疫病",
 "divine-smite":"邪魔或亡靈", "heroism":"每回合開始",
 "hunters-mark":"察覺／求生", "ray-of-sickness":"直接陷入中毒",
 "sanctuary":"不阻擋範圍效應", "wrathful-smite":"黯蝕",
 "goodberry":"附贈動作", "enhance-ability":"不包含體質",
 "flame-blade":"施法屬性調整值", "find-traps":"不能得知位置",
 "invisibility":"造成傷害", "lesser-restoration":"不能治療一般疾病",
 "misty-step":"未被佔據", "prayer-of-healing":"長休前僅能受益一次",
 "shining-smite":"攻擊具有優勢", "zone-of-truth":"豁免失敗時"
};
const normalize = s=>String(s||"").replace(/\s+/gu, "");
let changed=0, reviewedUnchanged=0;
for (const e of audit.entries) {
 const row = byId.get(e.id), rule = fullRules[e.id] || "";
 assert(row, "unknown identifier " + e.id);
 assert.equal(row[4],e.level,e.id+" level mismatch");
 assert.equal(row[3],e.name,e.id+" name mismatch");
 assert.equal(typeof e.canonical_anchor,"string");
 assert(rule.includes(e.canonical_anchor),e.id+" canonical anchor missing");
 assert.equal(typeof e.existing_summary,"string");
 assert.notEqual(e.full_equivalence_proven,true,e.id+" cannot claim complete rule proof");
 const rendered = glance.compact({identifier:e.id,n:e.name,d:rule},e.level,{
   time:row[9],range:row[10],dur:row[12]
 }).text;
 assert(rendered.length>0 && rendered.length<=113,e.id+" invalid glance length "+rendered.length);
 if(e.candidate_summary) {
  changed++;
  assert.equal(row[13],e.candidate_summary,e.id+" source-backed teaser overwritten");
  assert.equal(e.state,"CORRECTION_CANDIDATE_PENDING_QA");
  assert.notEqual(e.candidate_summary,e.existing_summary,e.id+" no actual semantic correction");
  const needed=required[e.id];
  if(needed) assert(normalize(rendered).includes(normalize(needed)),e.id+" critical cue missing: "+needed+" / "+rendered);
 } else {
  reviewedUnchanged++;
  assert.equal(e.state,"REVIEWED_NO_CHANGE_CORE_MATCH",e.id+" unreviewed spell remains");
  assert.equal(row[13],e.existing_summary,e.id+" unapproved alteration");
 }
}
assert.equal(changed,143);
assert.equal(reviewedUnchanged,18);
assert.equal(Object.keys(required).length,32);
assert.equal(audit.entries.filter(e=>e.state==="PENDING_SEMANTIC_REVIEW").length,0);
const highRisk = {
 "message":"120呎",
 "resistance":"每回合至多一次",
 "guidance":"所選技能",
 "produce-flame":"魔法動作",
 "find-familiar":"無法攻擊",
 "faerie-fire":"敏捷豁免",
 "crown-of-madness":"魔法動作",
 "spiritual-weapon":"立即",
 "invisibility":"造成傷害",
 "lesser-restoration":"目盲",
 "animal-messenger":"魅力豁免",
 "calm-emotions":"魅力豁免",
 "sleep":"生物須進行感知豁免",
 "ray-of-enfeeblement":"1d8",
 "moonbeam":"體質豁免",
 "magic-weapon":"+1",
 "enhance-ability":"不包含體質"
};
for(const [id,cue] of Object.entries(highRisk)){
 const r=byId.get(id), rule=fullRules[id];
 const text=glance.compact({identifier:id,n:r[3],d:rule},r[4],{time:r[9],range:r[10],dur:r[12]}).text;
 assert(normalize(text).includes(normalize(cue)),id+" high-risk player-visible cue omitted: "+cue+" / "+text);
}
assert(!glance.compact({identifier:"compelled-duel",d:fullRules["compelled-duel"]},1,{time:byId.get("compelled-duel")[9]}).text.includes("只能攻擊你"));
assert(!glance.compact({identifier:"wrathful-smite",d:fullRules["wrathful-smite"]},1,{time:byId.get("wrathful-smite")[9]}).text.includes("心靈傷害"));
console.log("SEMANTIC_0_2_SOURCE_REVIEW_PASS", JSON.stringify({
 reviewedSourceAnchors:audit.entries.length,
 proposedCorrections:changed,
 reviewedNoChange:reviewedUnchanged,
 sourceReviewPending:0,
 completeSemanticParity:"NOT_PROVEN",
 releaseStatus:"DRAFT_BLOCKED"
}));

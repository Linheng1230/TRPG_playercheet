"use strict";
/* Candidate-level semantic parity proof, not a certificate that all 161 effects
   are completely represented in a <=113-character creator glance.
   The 129 pending cases MUST stay release-blocking until independent review. */
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
let changed=0, pending=0;
for (const e of audit.entries) {
 const row = byId.get(e.id), rule = fullRules[e.id] || "";
 assert(row, "unknown identifier "+e.id);
 assert.equal(row[4],e.level,e.id+" level mismatch");
 assert.equal(row[3],e.name,e.id+" name mismatch");
 assert.equal(typeof e.canonical_anchor,"string");
 assert(rule.includes(e.canonical_anchor), e.id+" canonical anchor missing");
 assert.equal(typeof e.existing_summary, "string");
 const rendered = glance.compact({identifier:e.id,n:e.name,d:rule}, e.level,{
   time:row[9], range:row[10], dur:row[12]
 }).text;
 assert(rendered.length>0 && rendered.length<=113,e.id+" preview length");
 if(e.candidate_summary) {
   changed++;
   assert.equal(row[13],e.candidate_summary,e.id+" corrected data was overwritten");
   assert.equal(e.state,"CORRECTION_CANDIDATE_PENDING_QA");
   const needed=required[e.id];
   assert(needed && normalize(rendered).includes(normalize(needed)),e.id+" critical rule not visible: "+needed+" / "+rendered);
 } else {
   pending++;
   assert.equal(e.state,"PENDING_SEMANTIC_REVIEW");
   assert.equal(row[13],e.existing_summary,e.id+" pending summary changed without editorial approval");
 }
}
assert.equal(changed,32);
assert.equal(pending,129);
assert.equal(Object.keys(required).length,changed);
assert(!glance.compact({identifier:"compelled-duel",d:fullRules["compelled-duel"]},1,{time:byId.get("compelled-duel")[9]}).text.includes("只能攻擊你"));
assert(!glance.compact({identifier:"wrathful-smite",d:fullRules["wrathful-smite"]},1,{time:byId.get("wrathful-smite")[9]}).text.includes("心靈傷害"));
console.log("SEMANTIC_0_2_CANDIDATES_PASS", JSON.stringify({
 reviewedSourceAnchors:audit.entries.length,
 sourceBackedCorrectionCandidates:changed,
 editoriallyPending:pending,
 releaseStatus:"DRAFT_BLOCKED_UNTIL_ALL_161_SEMANTIC_AND_BROWSER_GATES"
}));

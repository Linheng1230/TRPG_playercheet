"use strict";
/* Release blocker: numeric assertions in creator teasers must be backed by
   the pinned full 5RTools 2024 text, not by historical generated row[13].
   This intentionally runs over all 391 spells, including future levels. */
const assert = require("node:assert/strict");
const path = require("node:path");
const base = path.resolve(__dirname, "..");
for (const filename of [
  "assets/data/spells-phb-2024.js",
  "assets/data/spell-rules-2024.js",
  "assets/spell-quick-facts-2024.js",
  "assets/creator-spell-preview-2024.js",
  "assets/creator-spell-glance-2024.js",
]) require(path.join(base, filename));

const rows = globalThis.SPELLS_2024_TUPLES;
const rules = globalThis.SPELLS_2024_FULL_RULES;
const glance = globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024;
assert.equal(rows.length, 391, "2024 PHB 391-spell data");
assert.equal(Object.keys(rules).length, 391, "391 pinned full canonical rules");
assert(glance?.compact, "Glance display layer available");
const normalize = v => String(v || "").replace(/\s+/gu, "").replace(/＋/gu, "+");
const dice = v => [...new Set([...normalize(v).matchAll(/\d+d\d+(?:\+\d+)?/gu)].map(m=>m[0]))];
const distances = v => [...new Set([...normalize(v).matchAll(/\d+呎/gu)].map(m=>m[0]))];
const times = v => [...new Set([...normalize(v).matchAll(/\d+(?:分鐘|小時|日|輪)/gu)].map(m=>m[0]))];
const abilityNames = ["力量", "敏捷", "體質", "智力", "感知", "魅力"];
const violations = [], auditable = [];
const ruleHashBefore = JSON.stringify(rules);
for (const row of rows) {
  const [id, , , name, level, , , , , castingTime, range, , duration, summary] = row;
  const full = rules[id] || "";
  const canonical = normalize(full), metadata = normalize(range + " " + duration + " " + castingTime);
  const preview = glance.compact({ identifier:id, n:name, d:full }, level, {
    time:castingTime, range, dur:duration,
  }).text;
  const sourceAllowedDice = new Set(dice(full));
  const missingDice = dice(summary).filter(token => {
    if(sourceAllowedDice.has(token))return false;
    if(id === "shillelagh" && token === "1d8" && /傷害骰變為d8/.test(full))return false;
    if(id === "synaptic-static" && token === "1d6" && /一枚d6的減值/.test(full))return false;
    return true;
  });
  if(missingDice.length)violations.push(id+": unsupported summary damage dice "+missingDice.join(","));
  const unsupportedDist=distances(summary).filter(token=>!canonical.includes(token)&&!metadata.includes(token));
  if(unsupportedDist.length)violations.push(id+": unsupported summary distance "+unsupportedDist.join(","));
  const unsupportedTime=times(summary).filter(token=>!canonical.includes(token)&&!metadata.includes(token));
  if(unsupportedTime.length)violations.push(id+": unsupported summary duration "+unsupportedTime.join(","));
  for(const ability of abilityNames){
    if(summary.includes(ability+"豁免")&&!full.includes(ability+"豁免")){
      violations.push(id+": summary claims unsupported "+ability+" saving throw");
    }
  }
  if(summary.includes("施法屬性調整值") && !full.includes("施法屬性調整值") &&
     !full.includes("法術攻擊調整值"))
    violations.push(id+": summary adds ability modifier not in canonical");
  if(/每回合.*附贈動作|附贈動作.*每回合/u.test(summary)&&!full.includes("附贈動作"))
    violations.push(id+": summary invents repeatable bonus action");
  if (dice(preview).some(t=>!sourceAllowedDice.has(t) &&
       !(id==="shillelagh"&&t==="1d8"&&/傷害骰變為d8/.test(full)) &&
       !(id==="synaptic-static"&&t==="1d6"&&/一枚d6的減值/.test(full))))
    violations.push(id+": rendered preview has unsupported dice "+dice(preview).join(","));
  if(!preview.trim()||preview.length>113)violations.push(id+": invalid preview length");
  auditable.push({id,level,summary,preview});
}
assert.deepEqual(violations, [], "NO short-summary numerical/mechanical parity violations");
assert.equal(JSON.stringify(rules), ruleHashBefore, "canonical rule text unchanged");

const byId = new Map(auditable.map(x=>[x.id,x]));
const canonicalDarkvision = /擁有(\d+)呎黑暗視覺/.exec(rules.darkvision);
assert(canonicalDarkvision,"Darkvision official numeric anchor");
assert(byId.get("darkvision").preview.includes(canonicalDarkvision[1]+" 呎黑暗視覺"),"Darkvision preview correct");
assert(!byId.get("darkvision").preview.includes("60 呎"),"Do not leak 2014 Darkvision 60ft");
const befudDice=/豁免失敗，目標受到(\d+d\d+)心靈傷害/.exec(rules.befuddlement);
assert(befudDice,"Befuddlement canonical damage anchor");
assert(byId.get("befuddlement").preview.includes(befudDice[1]),"Befuddlement 2024 damage");
assert(!/4d6|無法理解語言|智力與魅力檢定/.test(byId.get("befuddlement").preview),"No stale Befuddlement claims");
const prayerDice=/恢復(\d+d\d+)點生命值/.exec(rules["prayer-of-healing"]);
assert(prayerDice && byId.get("prayer-of-healing").preview.includes(prayerDice[1]),"Prayer base healing");
assert(!byId.get("prayer-of-healing").preview.includes("施法屬性調整值"),"No invented healing modifier");
assert(byId.get("prayer-of-healing").preview.includes("短休"),"Prayer short-rest feature retained");
assert(!/附贈動作/.test(byId.get("aura-of-vitality").preview),"Aura does not demand bonus action");
assert(/每回合開始/.test(byId.get("aura-of-vitality").preview),"Aura start-of-turn trigger preserved");
assert(/力量屬性的\s*D20\s*檢定/.test(byId.get("ray-of-enfeeblement").preview),"Enfeeblement applies to all Strength D20 tests");
console.log("CANONICAL_SPELL_SUMMARIES_391_PASS", JSON.stringify({
  count:auditable.length,violationCount:violations.length,
  examples:["darkvision","befuddlement","prayer-of-healing","aura-of-vitality","ray-of-enfeeblement"]
    .map(id=>({id,preview:byId.get(id).preview})),
}));

require("./qa-spell-summary-semantic-0-2-20261119.js");

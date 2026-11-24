import assert from "node:assert/strict";
import { WOW_BASE_CLASS_IDS, WOW_HERO_CLASSES, validateWowClassAtLevel } from "../assets/wow-dlc-policy.mjs";

assert.equal(Object.keys(WOW_BASE_CLASS_IDS).length, 13);
assert.deepEqual(WOW_HERO_CLASSES, ["death-knight", "demon-hunter", "evoker"]);
const base = (wowClassId, level = 2) =>
  ({ wowClassId, coreClassId: WOW_BASE_CLASS_IDS[wowClassId], level });
for (const name of Object.keys(WOW_BASE_CLASS_IDS)) {
  const result = validateWowClassAtLevel(base(name));
  if (!WOW_HERO_CLASSES.includes(name)) assert.equal(result.ok, true, name);
  else assert.equal(result.ok, false, name);
}
assert.equal(validateWowClassAtLevel(base("death-knight")).reason, "GM_HERO_WAIVER_REQUIRED");
assert.equal(validateWowClassAtLevel(base("demon-hunter")).reason, "GM_HERO_WAIVER_REQUIRED");
assert.equal(validateWowClassAtLevel(base("evoker")).reason, "EVOKER_MIN_LEVEL_3");
assert.equal(validateWowClassAtLevel(base("evoker", 3)).ok, true);
assert.equal(validateWowClassAtLevel({ ...base("warrior"), coreClassId: "barbarian" }).reason, "CORE_CLASS_MISMATCH");
assert.equal(validateWowClassAtLevel({ ...base("warrior"), level: 0 }).reason, "INVALID_CLASS_LEVEL");
assert.equal(validateWowClassAtLevel({ wowClassId: "__proto__", coreClassId: "fighter", level: 2 }).reason, "UNKNOWN_WOW_CLASS");
const scope = { campaignId: "deadmines-20261219", characterId: "character-1" };
const key = JSON.stringify([scope.campaignId, scope.characterId, "death-knight"]);
const approved = { ...scope, gmHeroWaivers: new Map([[key, true]]), heroSubclassLocks: new Set([key]) };
assert.equal(validateWowClassAtLevel(base("death-knight"), approved).ok, true);
assert.equal(validateWowClassAtLevel(base("death-knight"), { ...approved, characterId: "character-2" }).reason, "GM_HERO_WAIVER_REQUIRED");
assert.equal(validateWowClassAtLevel(base("death-knight"), { ...approved, campaignId: "different-campaign" }).reason, "GM_HERO_WAIVER_REQUIRED");
assert.equal(validateWowClassAtLevel(base("death-knight"), { ...approved, heroSubclassLocks: new Set() }).reason, "HERO_SUBCLASS_LOCK_REQUIRED");
assert.equal(validateWowClassAtLevel({ ...base("death-knight"), gmWaived: true, subclassLockedAtCreation: true }).reason, "GM_HERO_WAIVER_REQUIRED");
assert.equal(validateWowClassAtLevel(base("demon-hunter"), approved).reason, "GM_HERO_WAIVER_REQUIRED");
console.log("PASS wow-dlc-hero-classes: 13 adapters, strict Lv2 hero exceptions, scoped GM authority");

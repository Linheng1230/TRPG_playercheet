import assert from "node:assert/strict";
import { validateWowStartingEquipment } from "../assets/wow-dlc-policy.mjs";

const sha = "a".repeat(64), translated = "b".repeat(64);
const item = "Compendium.dnd-world-warcraft.items.Item.wowTestStarter01";
const campaignId = "deadmines-20261219", characterId = "player-1";
const approved = { sourceSha: sha, translationSha: translated, locale: "zh-TW",
  semantic: "PASS", mechanics: "PASS", nativeMapping: "PASS", liveUAT: "PASS",
  level1to2AutoGrant: false, blockedSourceCorrection: false };
const selection = { level: 2, campaignId, characterId, itemIds: [item] };
const context = { campaignId, characterId, itemCatalogue: new Map([[item, approved]]),
  gmItemGrants: new Set() };
const assess = (choice = selection, ctx = context) =>
  validateWowStartingEquipment(choice, ctx);
const gmKey = JSON.stringify([campaignId, characterId, item]);
const scoped = { ...context, gmItemGrants: new Set([gmKey]) };
assert.equal(assess().reason, "GM_ITEM_GRANT_REQUIRED");
assert.deepEqual(assess(selection, scoped), {
  ok: true, reason: "OK", scope: "EQUIPMENT_ONLY", playable: false });
assert.equal(assess({ ...selection, level: 3 }).reason, "INVALID_STARTING_EQUIPMENT");
assert.equal(assess({ ...selection, itemIds: [item, item] }).reason, "INVALID_STARTING_EQUIPMENT");
assert.equal(assess({ ...selection, itemIds: ["raw-english-name"] }).reason, "INVALID_STARTING_EQUIPMENT");
assert.equal(assess(selection, { ...context, itemCatalogue: null }).reason, "PRIVATE_ITEM_CATALOGUE_REQUIRED");
assert.equal(assess(selection, { ...context, characterId: "player-2" }).reason, "ITEM_GRANT_SCOPE_MISMATCH");
assert.equal(assess(selection, { ...context, campaignId: "another-campaign" }).reason, "ITEM_GRANT_SCOPE_MISMATCH");
assert.equal(assess(selection, { ...context, itemCatalogue: new Map() }).reason, "UNKNOWN_ITEM_SOURCE");
const bad = field => ({ ...context, gmItemGrants: new Set([gmKey]),
  itemCatalogue: new Map([[item, { ...approved, ...field }]]) });
for (const badField of [
  { sourceSha: "invalid" }, { translationSha: "invalid" },
  { locale: "zh-CN" }, { semantic: "UNCERTAIN" }, { mechanics: "FAIL" },
  { nativeMapping: "UNCERTAIN" }, { liveUAT: "NOT_VERIFIED" },
  { blockedSourceCorrection: true },
]) assert.equal(assess(selection, bad(badField)).reason, "ITEM_RELEASE_NOT_CERTIFIED");
const clientBadge = { ...selection, gmApproval: "approved", rarity: "Common" };
assert.equal(assess(clientBadge).reason, "GM_ITEM_GRANT_REQUIRED");
const unscope = { ...context, gmItemGrants: new Set([
  JSON.stringify([campaignId, "player-2", item]),
]) };
assert.equal(assess(selection, unscope).reason, "GM_ITEM_GRANT_REQUIRED");
const sourceCertifiedAuto = { ...context, itemCatalogue: new Map([
  [item, { ...approved, level1to2AutoGrant: true }],
]) };
assert.equal(assess(selection, sourceCertifiedAuto).ok, true);
assert.equal(assess(selection, sourceCertifiedAuto).playable, false);
console.log("PASS wow-dlc-equipment: level-2 stable Item source, semantic/native/live, scoped GM grant and no rarity auto-unlock");

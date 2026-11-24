import assert from "node:assert/strict";
import { attachDlcSaveMetadata, readDlcSaveMetadata } from "../assets/wow-dlc-policy.mjs";

const legacy = { v: 10, id: "character-1", ruleset: "2024", cls: "DUMMY",
  level: 2, base: { str: 10 } };
const choice = { origin: "wow", id: "wow:orc", gmApproval: "approved" };
const catalogue = new Map([
  ["wow:orc", { origin: "wow", requiresGmApproval: false }],
  ["5r:tiefling", { origin: "dnd5r", requiresGmApproval: true }],
]);
const context = { catalogue, campaignId: "deadmines-20261219",
  characterId: "character-1", gmApprovals: new Map() };
const created = attachDlcSaveMetadata(legacy, choice, context);
assert.equal(created.ok, true);
assert.equal(created.save.ruleset, "2024");
assert.equal(created.save.dlcId, "wow-2026");
assert.equal(created.save.dlcSpeciesSource.id, "wow:orc");
assert.equal(legacy.dlcId, undefined);
assert.equal(Object.hasOwn(created.save, "gmApproval"), false);
assert.equal(Object.hasOwn(created.save.dlcSpeciesSource, "gmApproval"), false);
const jsonRoundtrip = JSON.parse(JSON.stringify(created.save));
assert.equal(readDlcSaveMetadata(jsonRoundtrip, context).ok, true);
assert.equal(readDlcSaveMetadata(jsonRoundtrip, { ...context, characterId: "character-2" }).reason, "CHARACTER_SCOPE_MISMATCH");
assert.equal(readDlcSaveMetadata({ ...jsonRoundtrip, ruleset: "2014" }, context).reason, "INCOMPATIBLE_CORE_SAVE");
assert.equal(readDlcSaveMetadata(legacy, context).reason, "NOT_WOW_DLC_SAVE");
assert.equal(attachDlcSaveMetadata({ ...legacy, ruleset: "2014" }, choice, context).reason, "INCOMPATIBLE_CORE_SAVE");
assert.equal(attachDlcSaveMetadata({ ...legacy, id: "" }, choice, context).reason, "INCOMPATIBLE_CORE_SAVE");
const special = { origin: "dnd5r", id: "5r:tiefling", gmApproval: "approved" };
assert.equal(attachDlcSaveMetadata(legacy, special, context).reason, "GM_APPROVAL_REQUIRED");
const approved = { ...context, gmApprovals: new Map([
  [JSON.stringify([context.campaignId, context.characterId, special.id]), true],
]) };
const allowed = attachDlcSaveMetadata(legacy, special, approved);
assert.equal(allowed.ok, true);
assert.equal(readDlcSaveMetadata(JSON.parse(JSON.stringify(allowed.save)), context).reason, "GM_APPROVAL_REQUIRED");
assert.equal(readDlcSaveMetadata(JSON.parse(JSON.stringify(allowed.save)), approved).ok, true);
assert.equal(readDlcSaveMetadata(JSON.parse(JSON.stringify(allowed.save)), { ...approved, campaignId: "other-campaign" }).reason, "GM_APPROVAL_REQUIRED");
console.log("PASS wow-dlc-save-meta: non-destructive v10 metadata bridge and scoped GM revalidation");

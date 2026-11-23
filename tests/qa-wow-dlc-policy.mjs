import assert from "node:assert/strict";
import { WOW_DLC_RELEASE, validateSourceChoice, validateSpeciesSelection,
  validateCharacterDlc, canReleaseLicensedContent } from "../assets/wow-dlc-policy.mjs";

const catalogue = new Map([
  ["5r:elf", { origin: "dnd5r", requiresGmApproval: false }],
  ["5r:tiefling", { origin: "dnd5r", requiresGmApproval: true }],
]);
const ctx = { catalogue, gmApprovedIds: new Set() };
assert.equal(WOW_DLC_RELEASE.publicRulebookEnabled, false);
assert.equal(validateSourceChoice({ origin: "wow", id: "wow:orc" }).ok, true);
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:elf" }).reason, "CATALOGUE_REQUIRED");
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:elf" }, ctx).ok, true);
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:tiefling", gmApproval: "approved" }, ctx).reason, "GM_APPROVAL_REQUIRED");
const approved = { catalogue, gmApprovedIds: new Set(["5r:tiefling"]) };
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:tiefling" }, approved).ok, true);
assert.equal(validateSourceChoice({ origin: "wow", id: "中文空格" }).reason, "INVALID_STABLE_ID");
assert.equal(validateSpeciesSelection([{ origin: "wow", id: "wow:orc" }, { origin: "dnd5r", id: "5r:orc" }]).reason, "ONE_SPECIES_ONLY");
assert.equal(validateSpeciesSelection([]).reason, "ONE_SPECIES_ONLY");
const base = { ruleset: "wow-2026", level: 2,
  species: [{ origin: "wow", id: "wow:orc" }],
  traits: [{ sourceOrigin: "wow", sourceSpeciesId: "wow:orc" }] };
assert.equal(validateCharacterDlc(base).ok, true);
assert.equal(validateCharacterDlc({ ...base, traits: [{ sourceOrigin: "dnd5r", sourceSpeciesId: "5r:orc" }] }).reason, "SPECIES_TRAIT_SOURCE_MISMATCH");
assert.equal(validateCharacterDlc({ ...base, level: 3 }).reason, "LEVEL_2_REQUIRED");
assert.equal(validateCharacterDlc({ ...base, species: [{origin:"dnd5r",id:"5r:tiefling",gmApproval:"approved"}] },ctx).reason,"GM_APPROVAL_REQUIRED");
assert.equal(canReleaseLicensedContent({}).ok, false);
assert.equal(canReleaseLicensedContent({ entitlement: true }).missing.length, 7);
const all = Object.fromEntries(["entitlement", "privateDelivery", "translationSemanticQA", "mechanicsParity", "ownerLease", "integrationQA", "liveUAT", "readback"].map(x => [x, true]));
assert.equal(canReleaseLicensedContent(all).ok, true);
assert.equal(canReleaseLicensedContent({ ...all, liveUAT: false }).ok, false);
console.log("PASS wow-dlc-policy: authenticated GM approval interface, source, exclusive species, release gates");

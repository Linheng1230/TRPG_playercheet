import assert from "node:assert/strict";
import { WOW_DLC_RELEASE, validateSourceChoice, validateSpeciesSelection,
  validateCharacterDlc, canReleaseLicensedContent } from "../assets/wow-dlc-policy.mjs";

const catalogue = new Map([
  ["wow:orc", { origin: "wow", requiresGmApproval: false,
    allowedTraitIds: ["wow:orc:fury"], requiredTraitIds: ["wow:orc:fury"] }],
  ["5r:elf", { origin: "dnd5r", requiresGmApproval: false,
    allowedTraitIds: ["5r:elf:keen"], requiredTraitIds: ["5r:elf:keen"] }],
  ["5r:tiefling", { origin: "dnd5r", requiresGmApproval: true,
    allowedTraitIds: ["5r:tiefling:legacy"], requiredTraitIds: ["5r:tiefling:legacy"] }],
]);
const ctx = { catalogue, gmApprovedIds: new Set() };
const orc = { origin: "wow", id: "wow:orc" };
const fury = { id: "wow:orc:fury", sourceOrigin: "wow", sourceSpeciesId: "wow:orc" };
const base = { ruleset: "2024", dlcId: "wow-2026", level: 2, species: [orc], traits: [fury] };

assert.equal(WOW_DLC_RELEASE.publicRulebookEnabled, false);
assert.equal(validateSourceChoice(orc).reason, "CATALOGUE_REQUIRED");
assert.equal(validateSourceChoice(orc, ctx).ok, true);
assert.equal(validateSourceChoice({ origin: "wow", id: "wow:unknown" }, ctx).reason, "CATALOGUE_REQUIRED");
assert.equal(validateSourceChoice({ origin: "wow", id: "5r:elf" }, ctx).reason, "CATALOGUE_SOURCE_MISMATCH");
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:elf" }, ctx).ok, true);
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:tiefling", gmApproval: "approved" }, ctx).reason, "GM_APPROVAL_REQUIRED");
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:tiefling", special: false, gmApproval: "approved" }, ctx).reason, "GM_APPROVAL_REQUIRED");
const approved = { catalogue, gmApprovedIds: new Set(["5r:tiefling"]) };
assert.equal(validateSourceChoice({ origin: "dnd5r", id: "5r:tiefling" }, approved).ok, true);
assert.equal(validateSourceChoice({ origin: "wow", id: "中文空格" }, ctx).reason, "INVALID_STABLE_ID");
assert.equal(validateSpeciesSelection([orc, { origin: "dnd5r", id: "5r:elf" }], ctx).reason, "ONE_SPECIES_ONLY");
assert.equal(validateSpeciesSelection([], ctx).reason, "ONE_SPECIES_ONLY");
assert.equal(validateCharacterDlc(base, ctx).ok, true);
assert.equal(validateCharacterDlc({ ...base, ruleset: "wow-2026" }, ctx).reason, "CORE_RULESET_MISMATCH");
assert.equal(validateCharacterDlc({ ...base, dlcId: "" }, ctx).reason, "DLC_MISMATCH");
assert.equal(validateCharacterDlc({ ...base, traits: [] }, ctx).reason, "MISSING_REQUIRED_SPECIES_TRAIT");
assert.equal(validateCharacterDlc({ ...base, traits: [{ ...fury, sourceOrigin: "dnd5r" }] }, ctx).reason, "SPECIES_TRAIT_SOURCE_MISMATCH");
assert.equal(validateCharacterDlc({ ...base, traits: [{ ...fury, id: "wow:orc:fake" }] }, ctx).reason, "UNKNOWN_SPECIES_TRAIT");
assert.equal(validateCharacterDlc({ ...base, traits: [fury, fury] }, ctx).reason, "DUPLICATE_SPECIES_TRAIT");
assert.equal(validateCharacterDlc({ ...base, level: 3 }, ctx).reason, "LEVEL_2_REQUIRED");
assert.equal(validateCharacterDlc({ ...base, species: [{ origin: "dnd5r", id: "5r:tiefling", gmApproval: "approved" }] }, ctx).reason, "GM_APPROVAL_REQUIRED");
const badTraits = new Map(catalogue);
badTraits.set("wow:orc", { origin: "wow", requiresGmApproval: false });
assert.equal(validateCharacterDlc(base, { catalogue: badTraits }).reason, "TRAIT_CATALOGUE_REQUIRED");
assert.equal(canReleaseLicensedContent({}).ok, false);
assert.equal(canReleaseLicensedContent({ entitlement: true }).missing.length, 7);
const all = Object.fromEntries(["entitlement", "privateDelivery", "translationSemanticQA", "mechanicsParity", "ownerLease", "integrationQA", "liveUAT", "readback"].map(x => [x, true]));
assert.equal(canReleaseLicensedContent(all).ok, true);
assert.equal(canReleaseLicensedContent({ ...all, liveUAT: false }).ok, false);
console.log("PASS wow-dlc-policy: source catalogue, GM approval, trait provenance, release gates");

/**
 * WoW DLC P0: public metadata / compatibility policy only.
 * This module MUST NOT embed, cache, or fetch licensed rulebook prose.
 * Full WoW mechanics require a verified privately authorized data provider.
 */
export const WOW_DLC_ID = "wow-2026";
export const WOW_DLC_RELEASE = Object.freeze({
  eventDate: "2026-12-19",
  playerCount: 4,
  level: 2,
  publicRulebookEnabled: false,
  licensedProviderStatus: "BLOCKED",
});
export const ORIGINS = Object.freeze(["wow", "dnd5r"]);
export const GM_APPROVAL = Object.freeze({
  APPROVED: "approved",
  PENDING: "pending",
  REJECTED: "rejected",
});
const NORMALIZED_ID = /^[a-z0-9][a-z0-9._:-]{1,127}$/;
export function validateSourceChoice(choice, context = {}) {
  if (!choice || typeof choice !== "object") return { ok: false, reason: "INVALID_CHOICE" };
  if (!ORIGINS.includes(choice.origin)) return { ok: false, reason: "UNKNOWN_ORIGIN" };
  if (typeof choice.id !== "string" || !NORMALIZED_ID.test(choice.id))
    return { ok: false, reason: "INVALID_STABLE_ID" };
  // Treat client-supplied flags as untrusted. Classification and GM decisions
  // must be supplied by an authoritative catalogue and authenticated GM service.
  if (choice.origin === "dnd5r") {
    if (!(context.catalogue instanceof Map) || !context.catalogue.has(choice.id))
      return { ok: false, reason: "CATALOGUE_REQUIRED" };
    const record = context.catalogue.get(choice.id);
    if (record.origin !== choice.origin) return { ok: false, reason: "CATALOGUE_SOURCE_MISMATCH" };
    if (record.requiresGmApproval === true &&
        !(context.gmApprovedIds instanceof Set && context.gmApprovedIds.has(choice.id)))
      return { ok: false, reason: "GM_APPROVAL_REQUIRED" };
  }
  return { ok: true, reason: "OK" };
}
/**
 * Never combine two species mechanical source records.
 * A WoW narrative equivalent of a 5R species does not grant both traits.
 */
export function validateSpeciesSelection(species, context = {}) {
  if (!Array.isArray(species) || species.length !== 1)
    return { ok: false, reason: "ONE_SPECIES_ONLY" };
  return validateSourceChoice(species[0], context);
}
export function validateCharacterDlc(character, context = {}) {
  if (!character || typeof character !== "object") return { ok: false, reason: "INVALID_CHARACTER" };
  if (character.ruleset !== WOW_DLC_ID) return { ok: false, reason: "RULESET_MISMATCH" };
  if (character.level !== 2) return { ok: false, reason: "LEVEL_2_REQUIRED" };
  const speciesResult = validateSpeciesSelection(character.species, context);
  if (!speciesResult.ok) return speciesResult;
  if (!Array.isArray(character.traits) ||
      character.traits.some(t => !t || t.sourceOrigin !== character.species[0].origin ||
        t.sourceSpeciesId !== character.species[0].id))
    return { ok: false, reason: "SPECIES_TRAIT_SOURCE_MISMATCH" };
  return { ok: true, reason: "OK" };
}
/**
 * Public Pages may ship metadata only. P0 licensed player text release requires
 * private authorization/entitlement + full QA + owner lease + end-to-end UAT.
 */
export function canReleaseLicensedContent(gates = {}) {
  const required = ["entitlement", "privateDelivery", "translationSemanticQA",
    "mechanicsParity", "ownerLease", "integrationQA", "liveUAT", "readback"];
  return { ok: required.every(k => gates[k] === true),
    missing: required.filter(k => gates[k] !== true) };
}

/**
 * Fail-closed release preflight for privately maintained Lv1–2 WoW translations.
 * Only stable IDs, SHA-256, and independent QA verdicts belong in these inputs.
 * The authoritative source inventory and QA results are produced off public Pages;
 * client-provided reports are never trusted as proof of entitlement or approval.
 */
export const WOW_P0_SLOTS = Object.freeze([
  "creator", "species", "class1", "class2", "background",
  "feat", "spell", "equipment",
]);
const REQUIRED_NONEMPTY_SLOTS = new Set(["creator", "species", "class1", "class2", "background", "equipment"]);
const SHA_256 = /^[a-f0-9]{64}$/;
export function auditP0Translations({ inventory, approvals } = {}) {
  const blockers = [];
  if (!inventory || !SHA_256.test(inventory.sourceSha || "") ||
      !Array.isArray(inventory.entries) || !Array.isArray(approvals)) {
    return { ok: false, checked: 0, blockers: ["INVALID_TRUSTED_INPUT"] };
  }
  const expected = new Map();
  const approved = new Map();
  for (const entry of inventory.entries) {
    if (!entry || !WOW_P0_SLOTS.includes(entry.slot) ||
        typeof entry.id !== "string" || !NORMALIZED_ID.test(entry.id) ||
        !SHA_256.test(entry.sourceSha || "")) {
      blockers.push("INVALID_SOURCE_ENTRY");
      continue;
    }
    const key = entry.slot + ":" + entry.id;
    if (expected.has(key)) blockers.push("DUPLICATE_SOURCE:" + key);
    else expected.set(key, entry);
  }
  for (const slot of REQUIRED_NONEMPTY_SLOTS) {
    if (![...expected.values()].some(entry => entry.slot === slot))
      blockers.push("MISSING_REQUIRED_SLOT:" + slot);
  }
  for (const row of approvals) {
    if (!row || !WOW_P0_SLOTS.includes(row.slot) ||
        typeof row.id !== "string" || !NORMALIZED_ID.test(row.id)) {
      blockers.push("INVALID_QA_ENTRY");
      continue;
    }
    const key = row.slot + ":" + row.id;
    if (approved.has(key)) blockers.push("DUPLICATE_QA:" + key);
    else approved.set(key, row);
    if (!expected.has(key)) blockers.push("UNEXPECTED_QA:" + key);
  }
  for (const [key, source] of expected) {
    const row = approved.get(key);
    if (!row) {
      blockers.push("MISSING_QA:" + key);
      continue;
    }
    if (row.sourceSha !== source.sourceSha ||
        row.locale !== "zh-TW" || row.semantic !== "PASS" ||
        row.mechanics !== "PASS" || row.visibleText !== "PASS" ||
        !SHA_256.test(row.translationSha || "")) {
      blockers.push("QA_NOT_APPROVED:" + key);
    }
  }
  return { ok: blockers.length === 0, checked: expected.size, blockers };
}

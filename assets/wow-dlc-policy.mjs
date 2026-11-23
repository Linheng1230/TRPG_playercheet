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

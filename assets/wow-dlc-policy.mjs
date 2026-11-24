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
  // Both WoW and 5R choices must exist in the trusted rules catalogue.
  // Client-supplied "special" and "gmApproval" flags are never authoritative.
  if (!(context.catalogue instanceof Map) || !context.catalogue.has(choice.id))
    return { ok: false, reason: "CATALOGUE_REQUIRED" };
  const record = context.catalogue.get(choice.id);
  if (!record || record.origin !== choice.origin)
    return { ok: false, reason: "CATALOGUE_SOURCE_MISMATCH" };
  if (record.requiresGmApproval === true) {
    // Authenticated backend must supply this scope; UI/JSON cannot approve itself.
    const validScope = [context.campaignId, context.characterId]
      .every(id => typeof id === "string" && NORMALIZED_ID.test(id));
    const approvalKey = validScope
      ? JSON.stringify([context.campaignId, context.characterId, choice.id]) : "";
    if (!validScope || !(context.gmApprovals instanceof Map) ||
        context.gmApprovals.get(approvalKey) !== true)
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
  // D&D 5R 2024 remains the core calculation engine. WoW is a distinct
  // add-on identity, never a third value in the legacy ruleset field.
  if (character.ruleset !== "2024") return { ok: false, reason: "CORE_RULESET_MISMATCH" };
  if (character.dlcId !== WOW_DLC_ID) return { ok: false, reason: "DLC_MISMATCH" };
  if (character.level !== 2) return { ok: false, reason: "LEVEL_2_REQUIRED" };
  const speciesResult = validateSpeciesSelection(character.species, context);
  if (!speciesResult.ok) return speciesResult;
  if (!Array.isArray(character.traits))
    return { ok: false, reason: "SPECIES_TRAIT_SOURCE_MISMATCH" };
  const selected = character.species[0];
  const record = context.catalogue.get(selected.id);
  if (!Array.isArray(record.allowedTraitIds) || !Array.isArray(record.requiredTraitIds))
    return { ok: false, reason: "TRAIT_CATALOGUE_REQUIRED" };
  const allowed = new Set(record.allowedTraitIds);
  const selectedIds = new Set();
  for (const trait of character.traits) {
    if (!trait || typeof trait.id !== "string" || !NORMALIZED_ID.test(trait.id) ||
        trait.sourceOrigin !== selected.origin || trait.sourceSpeciesId !== selected.id)
      return { ok: false, reason: "SPECIES_TRAIT_SOURCE_MISMATCH" };
    if (!allowed.has(trait.id)) return { ok: false, reason: "UNKNOWN_SPECIES_TRAIT" };
    if (selectedIds.has(trait.id)) return { ok: false, reason: "DUPLICATE_SPECIES_TRAIT" };
    selectedIds.add(trait.id);
  }
  if (record.requiredTraitIds.some(id => !selectedIds.has(id)))
    return { ok: false, reason: "MISSING_REQUIRED_SPECIES_TRAIT" };
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
const REQUIRED_NONEMPTY_SLOTS = new Set(WOW_P0_SLOTS);
const ITEM_SOURCE_ID = /^Compendium\.dnd-world-warcraft\.(?:origins|classes|feats|spells|items)\.Item\.[A-Za-z0-9_-]{8,32}$/;
const SHA_256 = /^[a-f0-9]{64}$/;
export function auditP0Translations({ inventory, approvals, itemApprovals } = {}) {
  const blockers = [];
  if (!inventory || !SHA_256.test(inventory.sourceSha || "") ||
      !Array.isArray(inventory.entries) || !Array.isArray(approvals) ||
      !Array.isArray(inventory.itemDependencies) || !Array.isArray(itemApprovals)) {
    return { ok: false, checked: 0, checkedItems: 0, blockers: ["INVALID_TRUSTED_INPUT"] };
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
  // Native Item rules are surfaced by Journal @UUID and @Embed references.
  // A complete page list cannot certify that those Item mechanics were translated.
  const nativeExpected = new Map();
  const nativeApproved = new Map();
  if (inventory.itemDependencies.length === 0)
    blockers.push("MISSING_REQUIRED_ITEMS");
  for (const item of inventory.itemDependencies) {
    if (!item || typeof item.id !== "string" || !ITEM_SOURCE_ID.test(item.id) ||
        !SHA_256.test(item.sourceSha || "") ||
        !Array.isArray(item.referencedBy) || item.referencedBy.length === 0 ||
        item.referencedBy.some(key => typeof key !== "string" || !expected.has(key))) {
      blockers.push("INVALID_SOURCE_ITEM");
      continue;
    }
    if (nativeExpected.has(item.id)) blockers.push("DUPLICATE_SOURCE_ITEM:" + item.id);
    else nativeExpected.set(item.id, item);
  }
  for (const row of itemApprovals) {
    if (!row || typeof row.id !== "string" || !ITEM_SOURCE_ID.test(row.id)) {
      blockers.push("INVALID_ITEM_QA");
      continue;
    }
    if (nativeApproved.has(row.id)) blockers.push("DUPLICATE_ITEM_QA:" + row.id);
    else nativeApproved.set(row.id, row);
    if (!nativeExpected.has(row.id)) blockers.push("UNEXPECTED_ITEM_QA:" + row.id);
  }
  for (const [id, item] of nativeExpected) {
    const qa = nativeApproved.get(id);
    if (!qa) {
      blockers.push("MISSING_ITEM_QA:" + id);
      continue;
    }
    if (qa.sourceSha !== item.sourceSha || qa.locale !== "zh-TW" ||
        qa.semantic !== "PASS" || qa.mechanics !== "PASS" ||
        qa.visibleText !== "PASS" || !SHA_256.test(qa.translationSha || "")) {
      blockers.push("ITEM_QA_NOT_APPROVED:" + id);
    }
  }
  return { ok: blockers.length === 0, checked: expected.size,
    checkedItems: nativeExpected.size, blockers };
}

/**
 * Optional metadata bridge for the existing v10 2024 creator Save shape.
 * Does not imply licensed mechanics are installed, and must not be interpreted
 * as an authenticated GM approval or entitlement token.
 */
export function attachDlcSaveMetadata(save, choice, context = {}) {
  if (!save || save.ruleset !== "2024" ||
      typeof save.id !== "string" || !NORMALIZED_ID.test(save.id))
    return { ok: false, reason: "INCOMPATIBLE_CORE_SAVE" };
  if (context.characterId !== save.id)
    return { ok: false, reason: "CHARACTER_SCOPE_MISMATCH" };
  const selection = validateSourceChoice(choice, context);
  if (!selection.ok) return selection;
  const next = { ...save, dlcId: WOW_DLC_ID,
    dlcSpeciesSource: { origin: choice.origin, id: choice.id } };
  return { ok: true, save: next };
}
/**
 * Called again after JSON import/cloud load using a NEW trusted GM context.
 * Never read a client-serialized GM approval as proof of authorization.
 */
export function readDlcSaveMetadata(save, context = {}) {
  if (!save || save.dlcId !== WOW_DLC_ID) return { ok: false, reason: "NOT_WOW_DLC_SAVE" };
  if (save.ruleset !== "2024") return { ok: false, reason: "INCOMPATIBLE_CORE_SAVE" };
  if (context.characterId !== save.id)
    return { ok: false, reason: "CHARACTER_SCOPE_MISMATCH" };
  const choice = save.dlcSpeciesSource;
  const verdict = validateSourceChoice(choice, context);
  if (!verdict.ok) return verdict;
  return { ok: true, dlcId: WOW_DLC_ID, species: { origin: choice.origin, id: choice.id } };
}

/**
 * Source-bound WoW class presentation adapters (metadata, not class features).
 * Class mechanics remain those of canonical 2024 PHB counterparts until the
 * authorized WoW feature provider and proper subclass overlays pass P0 QA.
 */
export const WOW_BASE_CLASS_IDS = Object.freeze({
  "death-knight": "paladin", "demon-hunter": "ranger", druid: "druid",
  evoker: "sorcerer", hunter: "ranger", mage: "wizard", monk: "monk",
  paladin: "paladin", priest: "cleric", rogue: "rogue",
  shaman: "barbarian", warlock: "warlock", warrior: "fighter",
});
export const WOW_HERO_CLASSES = Object.freeze(["death-knight", "demon-hunter", "evoker"]);
/**
 * Public proper-name metadata projected from the currently installed private
 * WoW overlay v0.1.22.  Names and stable Journal IDs only: NO licensed rules,
 * playable options, traits, subclass data, entitlement, or player approval.
 * This list shows source chapters, not every selectable origin variant.
 */
export const WOW_PUBLIC_SPECIES = Object.freeze([
  { id: "dracthyr", zh: "龍希爾", en: "Dracthyr", journalId: "wowDracthyr00000" },
  { id: "draenei", zh: "德萊尼", en: "Draenei", journalId: "wowDraenei000000" },
  { id: "dwarf", zh: "矮人", en: "Dwarf", journalId: "wowDwarf00000000" },
  { id: "earthen", zh: "土靈", en: "Earthen", journalId: "wowEarthen000000" },
  { id: "elf", zh: "精靈", en: "Elf", journalId: "wowElf0000000000" },
  { id: "forsaken", zh: "被遺忘者", en: "Forsaken", journalId: "wowForsaken00000" },
  { id: "gnome", zh: "地精", en: "Gnome", journalId: "wowGnome00000000" },
  { id: "goblin", zh: "哥布林", en: "Goblin", journalId: "wowGoblin0000000" },
  { id: "haranir", zh: "哈拉尼爾", en: "Haranir", journalId: "wowHaranir000000" },
  { id: "human", zh: "人類", en: "Human", journalId: "wowHuman00000000" },
  { id: "orc", zh: "獸人", en: "Orc", journalId: "wowOrc0000000000" },
  { id: "pandaren", zh: "熊貓人", en: "Pandaren", journalId: "wowPandaren00000" },
  { id: "tauren", zh: "牛頭人", en: "Tauren", journalId: "wowTauren0000000" },
  { id: "troll", zh: "食人妖", en: "Troll", journalId: "wowTroll00000000" },
  { id: "vulpera", zh: "狐狸人", en: "Vulpera", journalId: "wowVulpera000000" },
  { id: "worgen", zh: "狼人", en: "Worgen", journalId: "wowWorgen0000000" },
].map(x=>Object.freeze(x)));
export const WOW_PUBLIC_CLASSES = Object.freeze([
  { id: "death-knight", zh: "死亡騎士", en: "Death Knight", journalId: "wowDeathKnight00", coreClassId: WOW_BASE_CLASS_IDS["death-knight"] },
  { id: "demon-hunter", zh: "惡魔獵人", en: "Demon Hunter", journalId: "wowDemonHunter00", coreClassId: WOW_BASE_CLASS_IDS["demon-hunter"] },
  { id: "druid", zh: "德魯伊", en: "Druid", journalId: "wowDruid00000000", coreClassId: WOW_BASE_CLASS_IDS["druid"] },
  { id: "evoker", zh: "喚能師", en: "Evoker", journalId: "wowEvoker0000000", coreClassId: WOW_BASE_CLASS_IDS["evoker"] },
  { id: "hunter", zh: "獵人", en: "Hunter", journalId: "wowHunter0000000", coreClassId: WOW_BASE_CLASS_IDS["hunter"] },
  { id: "mage", zh: "法師", en: "Mage", journalId: "wowMage000000000", coreClassId: WOW_BASE_CLASS_IDS["mage"] },
  { id: "monk", zh: "武僧", en: "Monk", journalId: "wowMonk000000000", coreClassId: WOW_BASE_CLASS_IDS["monk"] },
  { id: "paladin", zh: "聖騎士", en: "Paladin", journalId: "wowPaladin000000", coreClassId: WOW_BASE_CLASS_IDS["paladin"] },
  { id: "priest", zh: "牧師", en: "Priest", journalId: "wowPriest0000000", coreClassId: WOW_BASE_CLASS_IDS["priest"] },
  { id: "rogue", zh: "盜賊", en: "Rogue", journalId: "wowRogue00000000", coreClassId: WOW_BASE_CLASS_IDS["rogue"] },
  { id: "shaman", zh: "薩滿", en: "Shaman", journalId: "wowShaman0000000", coreClassId: WOW_BASE_CLASS_IDS["shaman"] },
  { id: "warlock", zh: "術士", en: "Warlock", journalId: "wowWarlock000000", coreClassId: WOW_BASE_CLASS_IDS["warlock"] },
  { id: "warrior", zh: "戰士", en: "Warrior", journalId: "wowWarrior000000", coreClassId: WOW_BASE_CLASS_IDS["warrior"] },
].map(x=>Object.freeze(x)));

export function validateWowClassAtLevel(choice, context = {}) {
  if (!choice || typeof choice !== "object") return { ok: false, reason: "INVALID_CLASS_CHOICE" };
  const expected = WOW_BASE_CLASS_IDS[choice.wowClassId];
  if (!expected || !Object.hasOwn(WOW_BASE_CLASS_IDS, choice.wowClassId))
    return { ok: false, reason: "UNKNOWN_WOW_CLASS" };
  if (choice.coreClassId !== expected) return { ok: false, reason: "CORE_CLASS_MISMATCH" };
  if (!Number.isInteger(choice.level) || choice.level < 1 || choice.level > 20)
    return { ok: false, reason: "INVALID_CLASS_LEVEL" };
  if (choice.level >= 3 || !WOW_HERO_CLASSES.includes(choice.wowClassId))
    return { ok: true, reason: "OK" };
  // The official hero-class guidance permits GM early-start exceptions for
  // Death Knight and Demon Hunter. Evoker is not part of that same exception.
  if (choice.wowClassId === "evoker")
    return { ok: false, reason: "EVOKER_MIN_LEVEL_3" };
  const scope = [context.campaignId, context.characterId, choice.wowClassId];
  if (!scope.every(x => typeof x === "string" && NORMALIZED_ID.test(x)))
    return { ok: false, reason: "GM_HERO_WAIVER_REQUIRED" };
  const key = JSON.stringify(scope);
  if (!(context.gmHeroWaivers instanceof Map) || context.gmHeroWaivers.get(key) !== true)
    return { ok: false, reason: "GM_HERO_WAIVER_REQUIRED" };
  if (!(context.heroSubclassLocks instanceof Set) || !context.heroSubclassLocks.has(key))
    return { ok: false, reason: "HERO_SUBCLASS_LOCK_REQUIRED" };
  return { ok: true, reason: "OK_GM_EARLY_START" };
}

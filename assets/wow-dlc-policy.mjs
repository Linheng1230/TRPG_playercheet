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
  // This validates ONLY species source and traits. It does not certify a
  // playable Lv2 WoW character, class progression, equipment, spells or
  // authenticated entitlement. Prevent a partial PASS being mistaken for DONE.
  return { ok: true, reason: "OK", scope: "SPECIES_TRAITS_ONLY", playable: false };
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
// Ordinary 2024 classes choose subclasses at level 3: full subclass
// translations are P1 for this level-2 one-shot. Early-start hero-class
// exceptions are independently gated by validateWowClassAtLevel.
const REQUIRED_NONEMPTY_SLOTS = new Set(WOW_P0_SLOTS.filter(x => x !== "class2"));
const ITEM_SOURCE_ID = /^Compendium\.dnd-world-warcraft\.(?:origins|classes|feats|spells|items)\.Item\.[A-Za-z0-9_-]{8,32}$/;
const SHA_256 = /^[a-f0-9]{64}$/;
// Journal text does not carry the SpellList/Subclass native payload. A source
// manifest must independently enumerate these typed pages and their Item IDs.
const NATIVE_PAGE_ID = /^wow[A-Za-z0-9]{8,24}\/[A-Za-z0-9]{16}$/;
const NATIVE_PAGE_TYPES = new Set(["spells", "subclass"]);
export function auditP0Translations({ inventory, approvals, itemApprovals, nativePageApprovals } = {}) {
  const blockers = [];
  if (!inventory || !SHA_256.test(inventory.sourceSha || "") ||
      !Array.isArray(inventory.entries) || !Array.isArray(approvals) ||
      !Array.isArray(inventory.itemDependencies) || !Array.isArray(itemApprovals) ||
      !Array.isArray(inventory.nativePageDependencies) ||
      !Array.isArray(nativePageApprovals)) {
    return { ok: false, checked: 0, checkedItems: 0, checkedNativePages: 0,
      blockers: ["INVALID_TRUSTED_INPUT"] };
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
  // Typed JournalEntryPages must be certified as native documents, not
  // inferred from translated Journal text. SpellList UUIDs must resolve to
  // native Item entries that also have separate approved source semantics.
  const nativePages = new Map();
  const approvedPages = new Map();
  // A level-2 martial build can legitimately have zero native SpellList or
  // subclass pages. Require a source-bound *coverage receipt*, not an
  // artificial nonempty list. Omitted required pages fail closed.
  const coverage = inventory.nativePageCoverage;
  if (!coverage || coverage.sourceSha !== inventory.sourceSha ||
      coverage.level !== 2 || coverage.reviewed !== "PASS" ||
      !Array.isArray(coverage.requiredPageIds) ||
      new Set(coverage.requiredPageIds).size !== coverage.requiredPageIds.length ||
      coverage.requiredPageIds.some(id => !NATIVE_PAGE_ID.test(id)))
    blockers.push("NATIVE_PAGE_SCOPE_UNCERTIFIED");
  for (const page of inventory.nativePageDependencies) {
    if (!page || typeof page.id !== "string" || !NATIVE_PAGE_ID.test(page.id) ||
        !NATIVE_PAGE_TYPES.has(page.type) || !SHA_256.test(page.sourceSha || "") ||
        !Array.isArray(page.referencedItemIds) ||
        (page.type === "spells" && page.referencedItemIds.length === 0) ||
        new Set(page.referencedItemIds).size !== page.referencedItemIds.length ||
        page.referencedItemIds.some(id => !ITEM_SOURCE_ID.test(id))) {
      blockers.push("INVALID_SOURCE_NATIVE_PAGE");
      continue;
    }
    if (nativePages.has(page.id)) blockers.push("DUPLICATE_SOURCE_NATIVE_PAGE:" + page.id);
    else nativePages.set(page.id, page);
    for (const id of page.referencedItemIds) {
      if (!nativeExpected.has(id))
        blockers.push("NATIVE_PAGE_ITEM_NOT_IN_INVENTORY:" + page.id + ":" + id);
    }
  }
  if (coverage && Array.isArray(coverage.requiredPageIds)) {
    const declared = new Set(coverage.requiredPageIds);
    for (const id of declared) {
      if (!nativePages.has(id)) blockers.push("MISSING_REQUIRED_NATIVE_PAGE:" + id);
    }
    for (const id of nativePages.keys()) {
      if (!declared.has(id)) blockers.push("UNEXPECTED_P0_NATIVE_PAGE:" + id);
    }
  }
  // Native mapping and GM rendering/UUID clicks need separate real runtime
  // receipts; synthetic CI-only PASS fixtures cannot authorize release.
  for (const row of nativePageApprovals) {
    if (!row || typeof row.id !== "string" || !NATIVE_PAGE_ID.test(row.id)) {
      blockers.push("INVALID_NATIVE_PAGE_QA");
      continue;
    }
    if (approvedPages.has(row.id)) blockers.push("DUPLICATE_NATIVE_PAGE_QA:" + row.id);
    else approvedPages.set(row.id, row);
    if (!nativePages.has(row.id)) blockers.push("UNEXPECTED_NATIVE_PAGE_QA:" + row.id);
  }
  for (const [id, page] of nativePages) {
    const qa = approvedPages.get(id);
    if (!qa) {
      blockers.push("MISSING_NATIVE_PAGE_QA:" + id);
      continue;
    }
    if (qa.type !== page.type || qa.sourceSha !== page.sourceSha ||
        qa.locale !== "zh-TW" || !SHA_256.test(qa.translationSha || "") ||
        ["semantic", "mechanics", "visibleText", "nativeMapping",
          "liveRendering", "linkNavigation"].some(x => qa[x] !== "PASS"))
      blockers.push("NATIVE_PAGE_QA_NOT_APPROVED:" + id);
  }
  return { ok: blockers.length === 0, checked: expected.size,
    checkedItems: nativeExpected.size, checkedNativePages: nativePages.size, blockers };
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

/**
 * Private-source equipment readiness only. The 35 official magic item
 * candidates in Owner v178 have ZERO approved Level 1-2 auto-grants.
 * Never infer grants from rarity, JSON labels, or untrusted GM flags.
 * Does not authorize paid content delivery or a playable character.
 */
export function validateWowStartingEquipment(selection, context = {}) {
  if (!selection || selection.level !== 2 ||
      !Array.isArray(selection.itemIds) || selection.itemIds.length === 0 ||
      selection.itemIds.some(id => typeof id !== "string" || !ITEM_SOURCE_ID.test(id)) ||
      new Set(selection.itemIds).size !== selection.itemIds.length)
    return { ok: false, reason: "INVALID_STARTING_EQUIPMENT", playable: false };
  if (!(context.itemCatalogue instanceof Map))
    return { ok: false, reason: "PRIVATE_ITEM_CATALOGUE_REQUIRED", playable: false };
  if (!NORMALIZED_ID.test(context.characterId || "") ||
      !NORMALIZED_ID.test(context.campaignId || "") ||
      selection.characterId !== context.characterId ||
      selection.campaignId !== context.campaignId)
    return { ok: false, reason: "ITEM_GRANT_SCOPE_MISMATCH", playable: false };
  for (const id of selection.itemIds) {
    const record = context.itemCatalogue.get(id);
    if (!record)
      return { ok: false, reason: "UNKNOWN_ITEM_SOURCE", itemId: id, playable: false };
    if (!SHA_256.test(record.sourceSha || "") ||
        !SHA_256.test(record.translationSha || "") ||
        record.locale !== "zh-TW" || record.blockedSourceCorrection === true ||
        ["semantic", "mechanics", "nativeMapping", "liveUAT"].some(k => record[k] !== "PASS"))
      return { ok: false, reason: "ITEM_RELEASE_NOT_CERTIFIED", itemId: id, playable: false };
    if (record.level1to2AutoGrant !== true) {
      const key = JSON.stringify([context.campaignId, context.characterId, id]);
      if (!(context.gmItemGrants instanceof Set) || !context.gmItemGrants.has(key))
        return { ok: false, reason: "GM_ITEM_GRANT_REQUIRED", itemId: id, playable: false };
    }
  }
  return { ok: true, reason: "OK", scope: "EQUIPMENT_ONLY", playable: false };
}

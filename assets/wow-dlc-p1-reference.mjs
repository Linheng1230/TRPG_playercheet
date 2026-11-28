/**
 * WoW P1 public-safe metadata presentation boundary.
 *
 * The input is a PRIVATE, source-bound V2 metadata contract supplied by a
 * trusted caller. This pure module DOES NOT verify entitlement, authenticate a
 * GM, publish WoW rules, grant items, price a shop, craft equipment, or perform
 * character / cloud / Foundry writes. It never returns descriptions or effects.
 *
 * Passing this validator is metadata-shape QA ONLY, not source authenticity,
 * independent semantics, native Foundry QA or deployment approval.
 */

export const WOW_P1_REFERENCE_TYPES = Object.freeze({
  professionMaterial: "loot",
  archaeologyFragment: "loot",
  craftingResidue: "loot",
  factionRenownRule: "renown",
  featureBlessingCharm: "feat",
});

export const WOW_P1_REFERENCE_COUNTS = Object.freeze({
  professionMaterial: 40,
  archaeologyFragment: 34,
  craftingResidue: 4,
  factionRenownRule: 12,
  featureBlessingCharm: 28,
});

const ITEM_UUID_PREFIX = "Compendium.dnd-world-warcraft.items.Item.";
const EFFECT_UUID_PREFIX = "Compendium.dnd-world-warcraft.effects.ActiveEffect.";
const SOURCE_ID = /^[a-zA-Z0-9]{16}$/;
const SHA_256 = /^[a-f0-9]{64}$/i;
const REJECTED_KEYS = new Set([
  "description", "translatedHTML", "rulesText", "prose", "rawSource",
  "licenseBody", "effectChanges", "activity", "activities", "system",
  "secret", "html", "privateTranslation",
]);

const deny = reason => ({ ok: false, reason, referenceOnly: true, playable: false });
const isPlain = x => Boolean(x) && typeof x === "object" &&
  !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
const exactId = (id, uuid, prefix) => typeof id === "string" &&
  SOURCE_ID.test(id) && uuid === prefix + id;
const finiteNonnegative = n => typeof n === "number" &&
  Number.isFinite(n) && n >= 0;
const money = m => isPlain(m) && finiteNonnegative(m.value) &&
  m.denomination === "gp";
const hasRuleBody = obj => Object.keys(obj).some(k => REJECTED_KEYS.has(k));

function validatePrice(row, isLoot) {
  const x = row.priceIntegrity;
  if (!isPlain(x) || x.allowFreePurchase !== false ||
      x.allowPurchase !== false || x.allowAutoCraft !== false ||
      !["SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY", "SOURCE_CONFLICT",
        "NATIVE_ZERO_WITHOUT_VALUE_AUTHORIZATION", "NOT_APPLICABLE"].includes(x.status))
    return false;

  if (!isLoot) return x.status === "NOT_APPLICABLE" &&
    row.price === null && row.quantity === null &&
    x.sourceItemPrice === null && x.rulebookTableReferenceGp === null &&
    x.displayReferenceValue === null;

  if (!money(row.price) || !Number.isSafeInteger(row.quantity) ||
      row.quantity < 0 || !money(x.sourceItemPrice) ||
      row.price.value !== x.sourceItemPrice.value ||
      row.price.denomination !== x.sourceItemPrice.denomination)
    return false;

  if (row.type === "archaeologyFragment")
    return x.status === "NATIVE_ZERO_WITHOUT_VALUE_AUTHORIZATION" &&
      row.price.value === 0 && x.rulebookTableReferenceGp === null &&
      x.displayReferenceValue === null;

  if (!finiteNonnegative(x.rulebookTableReferenceGp)) return false;
  if (row.price.value !== x.rulebookTableReferenceGp)
    return x.status === "SOURCE_CONFLICT" &&
      x.sourceConflictRequiresOwnerReview === true &&
      x.displayReferenceValue === null;
  return x.status === "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY" &&
    money(x.displayReferenceValue) &&
    x.displayReferenceValue.value === row.price.value &&
    x.displayReferenceValue.denomination === row.price.denomination;
}

/**
 * Validate the fixed 118-item / 7-effect snapshot without trusting it for
 * purchases, entitlement, gameplay, private source provenance, or release.
 * Returns ONLY whitelisted presentation metadata, not the input objects.
 */
export function inspectWowP1ReferenceContract(contract) {
  if (!isPlain(contract) ||
      contract.schema !== "wow.website-crafting-source-contract.v2" ||
      contract.referenceOnly !== true || contract.namesDraftUnapproved !== true ||
      !isPlain(contract.release) || contract.release.publicReleaseAllowed !== false ||
      !SHA_256.test(contract.sourceBridgeSHA256 || "") ||
      !SHA_256.test(contract.sourceNative78SHA256 || "") ||
      !Array.isArray(contract.entries) || contract.entries.length !== 118 ||
      !Array.isArray(contract.effects) || contract.effects.length !== 7)
    return deny("P1_REFERENCE_CONTRACT_NOT_QUALIFIED");

  const counts = Object.fromEntries(Object.keys(WOW_P1_REFERENCE_COUNTS).map(k => [k, 0]));
  const ids = new Set();
  const rows = [];

  for (const row of contract.entries) {
    if (!isPlain(row) || hasRuleBody(row) ||
        !Object.hasOwn(WOW_P1_REFERENCE_TYPES, row.type) ||
        row.sourceType !== WOW_P1_REFERENCE_TYPES[row.type] ||
        row.source !== "wow-official" || row.sourceIdQA !== "PASS_NATIVE_INDEX" ||
        row.labelQA !== "DRAFT_NEEDS_REVIEW" ||
        !exactId(row.id, row.uuid, ITEM_UUID_PREFIX) || ids.has(row.id) ||
        typeof row.sourceEnglishName !== "string" ||
        row.sourceEnglishName.length === 0 || row.sourceEnglishName.length > 180 ||
        /[<>]/.test(row.sourceEnglishName) ||
        row.marketPurchasable !== false || row.craftingExecutable !== false ||
        row.autoGrant !== false || row.published !== false ||
        row.websiteAccess !== "REFERENCE_ONLY" ||
        row.mechanicsQA !== "NOT_VERIFIED")
      return deny("P1_ITEM_SOURCE_OR_RELEASE_GUARD_FAILED");

    if (!validatePrice(row, row.sourceType === "loot"))
      return deny("P1_ITEM_PRICE_SOURCE_INTEGRITY_FAILED");

    ids.add(row.id);
    counts[row.type]++;
    const status = row.priceIntegrity.status;
    rows.push(Object.freeze({
      id: row.id,
      uuid: row.uuid,
      type: row.type,
      label: row.sourceEnglishName, // Draft Chinese names are not approved.
      labelStatus: "ZH_TW_DRAFT_NOT_APPROVED",
      priceStatus: status,
      referenceGp: status === "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY"
        ? row.priceIntegrity.displayReferenceValue.value : null,
      referenceOnly: true,
      purchasable: false,
      craftable: false,
      grantable: false,
    }));
  }

  for (const [key, expected] of Object.entries(WOW_P1_REFERENCE_COUNTS))
    if (counts[key] !== expected) return deny("P1_REFERENCE_CATEGORY_COUNT_MISMATCH");

  const effectIds = new Set();
  for (const effect of contract.effects) {
    if (!isPlain(effect) || hasRuleBody(effect) ||
        !exactId(effect.id, effect.uuid, EFFECT_UUID_PREFIX) ||
        effectIds.has(effect.id) || effect.autoAttach !== false ||
        effect.published !== false || effect.nativeMechanicsQA !== "NOT_VERIFIED")
      return deny("P1_EFFECT_SOURCE_OR_RELEASE_GUARD_FAILED");
    effectIds.add(effect.id);
  }

  return {
    ok: true,
    reason: "PUBLIC_SAFE_REFERENCE_METADATA_ONLY",
    scope: "P1_METADATA_SHAPE_ONLY",
    referenceOnly: true,
    playable: false,
    sourceAuthenticityVerified: false,
    licensedContentReleaseAllowed: false,
    counts: Object.freeze(counts),
    rows: Object.freeze(rows),
  };
}

/**
 * Strict browser boundary: only a fully reduced PUBLIC-SAFE display snapshot
 * may be passed into the UI. The private V2 source contract (which contains
 * draft translations and source-side fields) MUST be projected before crossing
 * the browser/network boundary by an authorized backend or private runtime.
 *
 * This is presentation-shape validation only, NOT cryptographic provenance or
 * entitlement verification. Never use this result to authorize gameplay.
 */
const DISPLAY_SNAPSHOT_KEYS = new Set([
  "ok", "reason", "scope", "referenceOnly", "playable",
  "sourceAuthenticityVerified", "licensedContentReleaseAllowed",
  "counts", "rows",
]);
const DISPLAY_ROW_KEYS = new Set([
  "id", "uuid", "type", "label", "labelStatus", "priceStatus",
  "referenceGp", "referenceOnly", "purchasable", "craftable", "grantable",
]);
const DISPLAY_PRICE_STATUSES = new Set([
  "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY", "SOURCE_CONFLICT",
  "NATIVE_ZERO_WITHOUT_VALUE_AUTHORIZATION", "NOT_APPLICABLE",
]);
const onlyKeys = (obj, keys) => isPlain(obj) &&
  Reflect.ownKeys(obj).every(key => typeof key === "string" && keys.has(key));

/**
 * Check the *already reduced* browser payload. Raw V2 objects, private draft
 * names and unknown properties are rejected even when a caller passes them
 * under the wrong parameter name.
 */
export function inspectWowP1DisplaySnapshot(snapshot) {
  if (!onlyKeys(snapshot, DISPLAY_SNAPSHOT_KEYS) ||
      snapshot.ok !== true ||
      snapshot.reason !== "PUBLIC_SAFE_REFERENCE_METADATA_ONLY" ||
      snapshot.scope !== "P1_METADATA_SHAPE_ONLY" ||
      snapshot.referenceOnly !== true ||
      snapshot.playable !== false ||
      snapshot.sourceAuthenticityVerified !== false ||
      snapshot.licensedContentReleaseAllowed !== false ||
      !isPlain(snapshot.counts) ||
      !Array.isArray(snapshot.rows) || snapshot.rows.length !== 118)
    return deny("P1_DISPLAY_SNAPSHOT_NOT_QUALIFIED");

  const categories = Object.keys(WOW_P1_REFERENCE_COUNTS);
  if (Object.keys(snapshot.counts).length !== categories.length)
    return deny("P1_DISPLAY_CATEGORY_COUNT_MISMATCH");

  const tally = Object.fromEntries(categories.map(key => [key, 0]));
  const ids = new Set();
  for (const row of snapshot.rows) {
    if (!onlyKeys(row, DISPLAY_ROW_KEYS) ||
        !Object.hasOwn(WOW_P1_REFERENCE_TYPES, row.type) ||
        !exactId(row.id, row.uuid, ITEM_UUID_PREFIX) || ids.has(row.id) ||
        typeof row.label !== "string" || row.label.length === 0 ||
        row.label.length > 180 || /[<>]/.test(row.label) ||
        row.labelStatus !== "ZH_TW_DRAFT_NOT_APPROVED" ||
        !DISPLAY_PRICE_STATUSES.has(row.priceStatus) ||
        row.referenceOnly !== true || row.purchasable !== false ||
        row.craftable !== false || row.grantable !== false)
      return deny("P1_DISPLAY_ITEM_OR_RELEASE_GUARD_FAILED");
    if (row.priceStatus === "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY") {
      if (!finiteNonnegative(row.referenceGp))
        return deny("P1_DISPLAY_REFERENCE_PRICE_NOT_QUALIFIED");
    } else if (row.referenceGp !== null) {
      return deny("P1_DISPLAY_PRICE_MUST_BE_HIDDEN");
    }
    ids.add(row.id);
    tally[row.type]++;
  }
  for (const type of categories) {
    if (tally[type] !== WOW_P1_REFERENCE_COUNTS[type] ||
        snapshot.counts[type] !== tally[type])
      return deny("P1_DISPLAY_CATEGORY_COUNT_MISMATCH");
  }
  // Return a fresh, deep-whitelisted projection. Never pass through the source.
  const rows = Object.freeze(snapshot.rows.map(row => Object.freeze({
    id: row.id, uuid: row.uuid, type: row.type, label: row.label,
    labelStatus: row.labelStatus, priceStatus: row.priceStatus,
    referenceGp: row.referenceGp, referenceOnly: true, purchasable: false,
    craftable: false, grantable: false,
  })));
  return {
    ok: true, reason: "P1_PUBLIC_SAFE_DISPLAY_SNAPSHOT_ONLY",
    scope: "P1_METADATA_SHAPE_ONLY", referenceOnly: true, playable: false,
    sourceAuthenticityVerified: false, licensedContentReleaseAllowed: false,
    counts: Object.freeze({ ...tally }), rows,
  };
}

/** A presentation-only filter; never mutates the private input catalogue. */
export function viewWowP1References(contract, { category = "all", query = "" } = {}) {
  const inspection = inspectWowP1ReferenceContract(contract);
  if (!inspection.ok) return inspection;
  if (category !== "all" && !Object.hasOwn(WOW_P1_REFERENCE_TYPES, category))
    return deny("P1_UNKNOWN_REFERENCE_CATEGORY");
  if (typeof query !== "string" || query.length > 100)
    return deny("P1_INVALID_SEARCH");
  const needle = query.trim().toLocaleLowerCase("en-US");
  const rows = inspection.rows.filter(row =>
    (category === "all" || row.type === category) &&
    (needle === "" || row.label.toLocaleLowerCase("en-US").includes(needle)));
  return {
    ok: true, reason: "PUBLIC_SAFE_REFERENCE_VIEW_ONLY", referenceOnly: true,
    playable: false, licensedContentReleaseAllowed: false, rows,
    count: rows.length,
  };
}

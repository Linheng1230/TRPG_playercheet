/**
 * Public-safe schema/validator for the privately delivered WoW Lv1-3 mapping.
 * Never put licensed descriptions, rule prose, HTML, or source bodies here.
 */
import { WOW_DLC_ID, WOW_BASE_CLASS_IDS } from "./wow-dlc-policy.mjs";

export const WOW_PRIVATE_PROGRESSION_SCHEMA_VERSION = 1;
export const WOW_PRIVATE_LV1_3_MANIFEST_SHA256 = "80f495f509a46f0e9f350fa60a37e5351b071c958cdf8c8dcb2cf1df072c0910";
export const WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 = "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360";
export const WOW_PRIVATE_LV1_3_LEVELS = Object.freeze([1, 2, 3]);
const SHA_256 = /^[a-f0-9]{64}$/;
const STABLE_ID = /^[A-Za-z0-9_-]{8,32}$/;
const SPEC_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)$/;
const ELIGIBILITY = new Set(["BASE_LEVEL_OK", "GM_EARLY_START_ONLY", "LOCKED"]);
const QA = new Set(["PASS", "PENDING", "NOT_VERIFIED", "FAIL"]);
const PACK = new Set(["classes", "spells"]);
const PROSE_KEYS = new Set([
  "description", "text", "html", "content", "body", "sourceBody",
  "translationBody", "ruleText", "prose",
]);

function hasForbiddenProse(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasForbiddenProse);
  for (const [key, child] of Object.entries(value)) {
    if (PROSE_KEYS.has(key)) return true;
    if (hasForbiddenProse(child)) return true;
  }
  return false;
}
function exactLevels(levels) {
  return Array.isArray(levels) &&
    levels.length === WOW_PRIVATE_LV1_3_LEVELS.length &&
    levels.every((v, i) => v === WOW_PRIVATE_LV1_3_LEVELS[i]);
}
function uniqueStableIds(value) {
  return Array.isArray(value) &&
    new Set(value).size === value.length &&
    value.every(id => typeof id === "string" && STABLE_ID.test(id));
}
function recordRefs(row) {
  return [
    ...row.grantItemIds, ...row.overrideItemIds, ...row.spellTableItemIds,
    ...row.spellIds, ...row.resourceItemIds, ...row.choiceItemIds,
  ];
}
function validRecord(row) {
  return row && typeof row === "object" &&
    PACK.has(row.pack) && SHA_256.test(row.sourceSha || "") &&
    SHA_256.test(row.translationSha || "") &&
    QA.has(row.semantic) && QA.has(row.mechanics) &&
    QA.has(row.nativeMapping) && QA.has(row.liveUAT);
}

export function validateWowPrivateProgressionManifest(manifest, context = {}) {
  const blockers = [];
  if (!manifest || typeof manifest !== "object" || hasForbiddenProse(manifest))
    return { ok: false, playable: false, blockers: ["INVALID_OR_PROSE_BEARING_MANIFEST"] };
  if (manifest.schemaVersion !== WOW_PRIVATE_PROGRESSION_SCHEMA_VERSION)
    blockers.push("SCHEMA_VERSION_MISMATCH");
  if (manifest.dlcId !== WOW_DLC_ID) blockers.push("DLC_ID_MISMATCH");
  if (!SHA_256.test(manifest.sourceSnapshotSha || "")) blockers.push("SOURCE_SNAPSHOT_SHA_REQUIRED");
  if (!exactLevels(manifest.levels)) blockers.push("LEVEL_SCOPE_MUST_BE_1_2_3");
  if (context.entitlement !== true) blockers.push("ENTITLEMENT_REQUIRED");
  if (context.privateDelivery !== true) blockers.push("PRIVATE_DELIVERY_REQUIRED");
  if (context.sourceSnapshotSha !== manifest.sourceSnapshotSha)
    blockers.push("SOURCE_SNAPSHOT_CONTEXT_MISMATCH");

  const classes = Array.isArray(manifest.classes) ? manifest.classes : [];
  const specs = Array.isArray(manifest.specializations) ? manifest.specializations : [];
  const rows = Array.isArray(manifest.progressionRows) ? manifest.progressionRows : [];
  const records = manifest.records && typeof manifest.records === "object" &&
    !Array.isArray(manifest.records) ? manifest.records : {};

  if (classes.length !== 13) blockers.push("CLASS_COUNT_13_REQUIRED");
  if (specs.length !== 40) blockers.push("SPECIALIZATION_COUNT_40_REQUIRED");
  if (rows.length !== 120) blockers.push("PROGRESSION_ROW_COUNT_120_REQUIRED");

  const classIds = new Set();
  for (const row of classes) {
    if (!row || typeof row.id !== "string" || !Object.hasOwn(WOW_BASE_CLASS_IDS, row.id) ||
        row.coreClassId !== WOW_BASE_CLASS_IDS[row.id] ||
        !Number.isInteger(row.minLevel) || row.minLevel < 1 || row.minLevel > 3 ||
        classIds.has(row.id)) {
      blockers.push("INVALID_CLASS_ROW");
      continue;
    }
    classIds.add(row.id);
  }

  const specIds = new Set();
  const specClass = new Map();
  for (const row of specs) {
    if (!row || typeof row.id !== "string" || !SPEC_ID.test(row.id) ||
        !classIds.has(row.classId) || specIds.has(row.id) ||
        (row.sourceKind !== "core" && row.sourceKind !== "wow") ||
        typeof row.sourceId !== "string" || row.sourceId.length < 1 ||
        row.sourceId.length > 80) {
      blockers.push("INVALID_SPECIALIZATION_ROW");
      continue;
    }
    specIds.add(row.id);
    specClass.set(row.id, row.classId);
  }
  for (const classId of classIds) {
    const count = specs.filter(x => x?.classId === classId).length;
    if (count < 3 || count > 4) blockers.push("INVALID_SPECIALIZATION_DISTRIBUTION:" + classId);
  }

  const rowKeys = new Set();
  const referenced = new Set();
  for (const row of rows) {
    if (!row || !specIds.has(row.specializationId) ||
        row.classId !== specClass.get(row.specializationId) ||
        !WOW_PRIVATE_LV1_3_LEVELS.includes(row.level) ||
        !ELIGIBILITY.has(row.eligibility) ||
        typeof row.subclassAvailable !== "boolean" ||
        !uniqueStableIds(row.grantItemIds) || !uniqueStableIds(row.overrideItemIds) ||
        !uniqueStableIds(row.spellTableItemIds) || !uniqueStableIds(row.spellIds) || !uniqueStableIds(row.resourceItemIds) ||
        !uniqueStableIds(row.choiceItemIds)) {
      blockers.push("INVALID_PROGRESSION_ROW");
      continue;
    }
    const key = row.specializationId + ":" + row.level;
    if (rowKeys.has(key)) blockers.push("DUPLICATE_PROGRESSION_ROW:" + key);
    rowKeys.add(key);
    for (const id of recordRefs(row)) referenced.add(id);
  }
  for (const specId of specIds)
    for (const level of WOW_PRIVATE_LV1_3_LEVELS)
      if (!rowKeys.has(specId + ":" + level))
        blockers.push("MISSING_PROGRESSION_ROW:" + specId + ":" + level);

  for (const id of referenced) {
    if (!validRecord(records[id])) blockers.push("MISSING_OR_INVALID_SOURCE_RECORD:" + id);
  }
  for (const [id, record] of Object.entries(records)) {
    if (!STABLE_ID.test(id) || !validRecord(record)) blockers.push("INVALID_RECORD:" + id);
  }

  return {
    ok: blockers.length === 0,
    playable: false,
    scope: "PRIVATE_LV1_3_MAPPING_ONLY",
    counts: { classes: classIds.size, specializations: specIds.size,
      progressionRows: rowKeys.size, referencedRecords: referenced.size },
    blockers,
  };
}

export function auditWowPrivateProgressionRelease(manifest, context = {}) {
  const structural = validateWowPrivateProgressionManifest(manifest, context);
  if (!structural.ok) return structural;
  const referenced = new Set(manifest.progressionRows.flatMap(recordRefs));
  const blockers = [];
  for (const id of referenced) {
    const row = manifest.records[id];
    for (const field of ["semantic", "mechanics", "nativeMapping", "liveUAT"])
      if (row[field] !== "PASS") blockers.push("QA_NOT_PASS:" + id + ":" + field);
  }
  for (const gate of ["integrationQA", "saveRoundtrip", "jsonRoundtrip",
    "pdfUAT", "cloudUAT", "fvttUAT", "liveUAT", "readback"])
    if (context[gate] !== true) blockers.push("RELEASE_GATE_MISSING:" + gate);
  return { ...structural, ok: blockers.length === 0, playable: blockers.length === 0,
    scope: blockers.length ? structural.scope : "PRIVATE_LV1_3_RELEASE_READY", blockers };
}

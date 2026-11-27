export const MAX_WOW_PRIVATE_MANIFEST_BYTES = 256 * 1024;
const SHA_256 = /^[a-f0-9]{64}$/;
const FORBIDDEN_PROSE_KEYS = new Set([
  "description", "text", "html", "content", "body", "sourceBody",
  "translationBody", "ruleText", "prose",
]);

function scanNoProse(value: unknown, depth = 0, budget = { nodes: 0 }): void {
  if (depth > 14) throw new Error("MANIFEST_TOO_DEEP");
  if (++budget.nodes > 12000) throw new Error("MANIFEST_TOO_COMPLEX");
  if (typeof value === "string") {
    if (value.length > 512) throw new Error("MANIFEST_STRING_TOO_LONG");
    if (/<(?:p|table|div|span|h[1-6]|br)\b/i.test(value)) throw new Error("PAID_PROSE_NOT_ALLOWED");
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const row of value) scanNoProse(row, depth + 1, budget);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_PROSE_KEYS.has(key)) throw new Error("PAID_PROSE_NOT_ALLOWED");
    scanNoProse(child, depth + 1, budget);
  }
}

export function validateWowPrivateManifestJson(raw: string) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("INVALID_MANIFEST");
  if (new TextEncoder().encode(raw).byteLength > MAX_WOW_PRIVATE_MANIFEST_BYTES)
    throw new Error("MANIFEST_TOO_LARGE");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("INVALID_MANIFEST_JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID_MANIFEST");
  scanNoProse(value);
  const row = value as Record<string, unknown>;
  if (row.schemaVersion !== 1 || row.dlcId !== "wow-2026")
    throw new Error("MANIFEST_IDENTITY_MISMATCH");
  if (typeof row.sourceSnapshotSha !== "string" || !SHA_256.test(row.sourceSnapshotSha))
    throw new Error("SOURCE_SNAPSHOT_SHA_REQUIRED");
  if (!Array.isArray(row.levels) || row.levels.length !== 3 ||
      row.levels.some((x, i) => x !== i + 1))
    throw new Error("LEVEL_SCOPE_MUST_BE_1_2_3");
  if (!Array.isArray(row.classes) || row.classes.length !== 13)
    throw new Error("CLASS_COUNT_13_REQUIRED");
  if (!Array.isArray(row.specializations) || row.specializations.length !== 40)
    throw new Error("SPECIALIZATION_COUNT_40_REQUIRED");
  if (!Array.isArray(row.progressionRows) || row.progressionRows.length !== 120)
    throw new Error("PROGRESSION_ROW_COUNT_120_REQUIRED");
  if (!row.records || typeof row.records !== "object" || Array.isArray(row.records))
    throw new Error("SOURCE_RECORDS_REQUIRED");
  return { sourceSnapshotSha: row.sourceSnapshotSha };
}

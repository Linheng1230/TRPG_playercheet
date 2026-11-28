export const MAX_WOW_PRIVATE_MANIFEST_BYTES = 256 * 1024;
export const MAX_WOW_PRIVATE_CONTENT_BUNDLE_BYTES = 1024 * 1024;
export const WOW_PRIVATE_LV1_3_MANIFEST_SHA256 =
  "6850fd0075308e0c9363854f590198935f70c4df0d6150f34d82b4e9288259f1";
export const WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256 =
  "68b829d2d636626083328d60ce40c354da31bb32d8f19fe4b95665fa1cb262e8";
export const WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 =
  "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360";
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
export async function sha256Text(raw:string) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,"0")).join("");
}
export async function assertWowPrivateCanonicalHashes(manifestJson:string,contentBundleJson:string) {
  const [manifestSha,contentBundleSha]=await Promise.all([
    sha256Text(manifestJson),sha256Text(contentBundleJson),
  ]);
  if(manifestSha!==WOW_PRIVATE_LV1_3_MANIFEST_SHA256)
    throw new Error("MANIFEST_SHA_MISMATCH");
  if(contentBundleSha!==WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256)
    throw new Error("CONTENT_BUNDLE_SHA_MISMATCH");
  return {manifestSha,contentBundleSha};
}

function parseObject(raw:string, invalidCode:string) {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error(invalidCode); }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(invalidCode);
  return value as Record<string, any>;
}

export function validateWowPrivateManifestJson(raw: string) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("INVALID_MANIFEST");
  if (new TextEncoder().encode(raw).byteLength > MAX_WOW_PRIVATE_MANIFEST_BYTES)
    throw new Error("MANIFEST_TOO_LARGE");
  const row = parseObject(raw, "INVALID_MANIFEST_JSON");
  scanNoProse(row);
  if (row.schemaVersion !== 1 || row.dlcId !== "wow-2026")
    throw new Error("MANIFEST_IDENTITY_MISMATCH");
  if (row.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256)
    throw new Error("SOURCE_SNAPSHOT_SHA_REQUIRED");
  if (!Array.isArray(row.levels) || row.levels.length !== 3 ||
      row.levels.some((x:any, i:number) => x !== i + 1))
    throw new Error("LEVEL_SCOPE_MUST_BE_1_2_3");
  if (!Array.isArray(row.classes) || row.classes.length !== 13)
    throw new Error("CLASS_COUNT_13_REQUIRED");
  if (!Array.isArray(row.specializations) || row.specializations.length !== 40)
    throw new Error("SPECIALIZATION_COUNT_40_REQUIRED");
  if (!Array.isArray(row.progressionRows) || row.progressionRows.length !== 120)
    throw new Error("PROGRESSION_ROW_COUNT_120_REQUIRED");
  if (!row.records || typeof row.records !== "object" || Array.isArray(row.records) ||
      Object.keys(row.records).length !== 47)
    throw new Error("SOURCE_RECORDS_47_REQUIRED");
  return { sourceSnapshotSha: row.sourceSnapshotSha, manifest: row };
}

export function validateWowPrivateContentBundleJson(raw:string, manifest:any) {
  if (typeof raw !== "string" || !raw.trim()) throw new Error("INVALID_CONTENT_BUNDLE");
  if (new TextEncoder().encode(raw).byteLength > MAX_WOW_PRIVATE_CONTENT_BUNDLE_BYTES)
    throw new Error("CONTENT_BUNDLE_TOO_LARGE");
  const bundle=parseObject(raw,"INVALID_CONTENT_BUNDLE_JSON");
  if (bundle.schemaVersion!==1 || bundle.dlcId!=="wow-2026" ||
      bundle.scope!=="P0_PRIVATE_LV1_3_CONTENT" ||
      bundle.manifestSha!==WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
      bundle.sourceSnapshotSha!==WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      bundle.recordCount!==47 || !bundle.records || typeof bundle.records!=="object" ||
      Array.isArray(bundle.records) || Object.keys(bundle.records).length!==47)
    throw new Error("CONTENT_BUNDLE_CONTRACT_MISMATCH");
  for(const [id,proof] of Object.entries(manifest.records as Record<string,any>)){
    const row=bundle.records[id];
    if(!row || row.id!==id || row.pack!==proof.pack ||
       row.sourceSha!==proof.sourceSha || row.translationSha!==proof.translationSha ||
       typeof row.name!=="string" || !row.name.trim() ||
       typeof row.description!=="string" || !row.description.trim())
      throw new Error("CONTENT_BUNDLE_RECORD_MISMATCH");
  }
  if(Object.keys(bundle.records).some(id=>!Object.hasOwn(manifest.records,id)))
    throw new Error("CONTENT_BUNDLE_UNEXPECTED_RECORD");
  return { contentBundle: bundle };
}

export const WOW_PRIVATE_RULE_STAGE_KEY = "zizi.wow.private-rules.v1";
export const WOW_PRIVATE_LV1_3_MANIFEST_SHA256 =
  "6850fd0075308e0c9363854f590198935f70c4df0d6150f34d82b4e9288259f1";
export const WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256 =
  "68b829d2d636626083328d60ce40c354da31bb32d8f19fe4b95665fa1cb262e8";
export const WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 =
  "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360";

export type WowPrivateRuleProviderRow = {
  manifestJson: string;
  contentBundleJson: string;
  manifestSha: string;
  contentBundleSha: string;
  sourceSnapshotSha: string;
  revision: number;
  updatedAt: number;
};

async function sha256(raw: string) {
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0")).join("");
}
function parse(raw:string, code:string) {
  try { return JSON.parse(raw); } catch { throw new Error(code); }
}
function verifyPair(manifest:any,bundle:any) {
  if (manifest?.schemaVersion !== 1 || manifest?.dlcId !== "wow-2026" ||
      manifest?.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      !Array.isArray(manifest?.classes) || manifest.classes.length !== 13 ||
      !Array.isArray(manifest?.specializations) || manifest.specializations.length !== 40 ||
      !Array.isArray(manifest?.progressionRows) || manifest.progressionRows.length !== 120 ||
      !manifest?.records || Object.keys(manifest.records).length !== 47)
    throw new Error("WOW_PRIVATE_RULE_CONTRACT_MISMATCH");
  if (bundle?.schemaVersion !== 1 || bundle?.dlcId !== "wow-2026" ||
      bundle?.scope !== "P0_PRIVATE_LV1_3_CONTENT" ||
      bundle?.manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
      bundle?.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      bundle?.recordCount !== 47 || !bundle?.records ||
      Object.keys(bundle.records).length !== 47)
    throw new Error("WOW_PRIVATE_CONTENT_CONTRACT_MISMATCH");
  for(const [id,proof] of Object.entries(manifest.records as Record<string,any>)){
    const row=bundle.records[id];
    if(!row || row.id!==id || row.pack!==proof.pack ||
       row.sourceSha!==proof.sourceSha || row.translationSha!==proof.translationSha ||
       typeof row.name!=="string" || !row.name.trim() ||
       typeof row.description!=="string" || !row.description.trim())
      throw new Error("WOW_PRIVATE_CONTENT_RECORD_MISMATCH");
  }
}

export async function verifyWowPrivateRuleProvider(row: WowPrivateRuleProviderRow) {
  if (!row || typeof row.manifestJson !== "string" ||
      typeof row.contentBundleJson !== "string" ||
      row.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      row.manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
      row.contentBundleSha !== WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256 ||
      !Number.isInteger(row.revision) || row.revision < 1)
    throw new Error("WOW_PRIVATE_RULE_SOURCE_MISMATCH");
  const [manifestSha,contentBundleSha]=await Promise.all([
    sha256(row.manifestJson),sha256(row.contentBundleJson),
  ]);
  if (manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256)
    throw new Error("WOW_PRIVATE_RULE_MANIFEST_MISMATCH");
  if (contentBundleSha !== WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256)
    throw new Error("WOW_PRIVATE_RULE_CONTENT_MISMATCH");
  const manifest=parse(row.manifestJson,"WOW_PRIVATE_RULE_INVALID_JSON");
  const contentBundle=parse(row.contentBundleJson,"WOW_PRIVATE_CONTENT_INVALID_JSON");
  verifyPair(manifest,contentBundle);
  return { manifest, contentBundle, manifestSha, contentBundleSha };
}

export async function stageWowPrivateRulesForCreator(
  storage: Storage,
  campaignId: string,
  row: WowPrivateRuleProviderRow,
) {
  if (!storage || !campaignId) throw new Error("WOW_PRIVATE_RULE_STAGE_INVALID");
  const { manifestSha,contentBundleSha } = await verifyWowPrivateRuleProvider(row);
  storage.setItem(WOW_PRIVATE_RULE_STAGE_KEY, JSON.stringify({
    v: 1,
    campaignId,
    manifestJson: row.manifestJson,
    contentBundleJson: row.contentBundleJson,
    manifestSha,
    contentBundleSha,
    sourceSnapshotSha: row.sourceSnapshotSha,
    revision: row.revision,
    stagedAt: Date.now(),
  }));
  return { manifestSha, contentBundleSha, revision: row.revision };
}

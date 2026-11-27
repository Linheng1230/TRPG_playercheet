export const WOW_PRIVATE_RULE_STAGE_KEY = "zizi.wow.private-rules.v1";
export const WOW_PRIVATE_LV1_3_MANIFEST_SHA256 =
  "80f495f509a46f0e9f350fa60a37e5351b071c958cdf8c8dcb2cf1df072c0910";
export const WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 =
  "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360";

export type WowPrivateRuleProviderRow = {
  manifestJson: string;
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

export async function verifyWowPrivateRuleProvider(row: WowPrivateRuleProviderRow) {
  if (!row || typeof row.manifestJson !== "string" ||
      row.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      !Number.isInteger(row.revision) || row.revision < 1)
    throw new Error("WOW_PRIVATE_RULE_SOURCE_MISMATCH");
  const manifestSha = await sha256(row.manifestJson);
  if (manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256)
    throw new Error("WOW_PRIVATE_RULE_MANIFEST_MISMATCH");
  let manifest: any;
  try { manifest = JSON.parse(row.manifestJson); }
  catch { throw new Error("WOW_PRIVATE_RULE_INVALID_JSON"); }
  if (manifest?.schemaVersion !== 1 || manifest?.dlcId !== "wow-2026" ||
      manifest?.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      !Array.isArray(manifest?.classes) || manifest.classes.length !== 13 ||
      !Array.isArray(manifest?.specializations) || manifest.specializations.length !== 40 ||
      !Array.isArray(manifest?.progressionRows) || manifest.progressionRows.length !== 120)
    throw new Error("WOW_PRIVATE_RULE_CONTRACT_MISMATCH");
  return { manifest, manifestSha };
}

export async function stageWowPrivateRulesForCreator(
  storage: Storage,
  campaignId: string,
  row: WowPrivateRuleProviderRow,
) {
  if (!storage || !campaignId) throw new Error("WOW_PRIVATE_RULE_STAGE_INVALID");
  const { manifestSha } = await verifyWowPrivateRuleProvider(row);
  storage.setItem(WOW_PRIVATE_RULE_STAGE_KEY, JSON.stringify({
    v: 1,
    campaignId,
    manifestJson: row.manifestJson,
    manifestSha,
    sourceSnapshotSha: row.sourceSnapshotSha,
    revision: row.revision,
    stagedAt: Date.now(),
  }));
  return { manifestSha, revision: row.revision };
}

import {
  WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  validateWowPrivateProgressionManifest,
} from "./wow-dlc-private-provider-contract.mjs";

export const WOW_PRIVATE_RULE_STAGE_KEY = "zizi.wow.private-rules.v1";
export const WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS = 15 * 60 * 1000;

async function sha256(raw) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)]
    .map(value => value.toString(16).padStart(2, "0")).join("");
}
function fail(storage, reason, audit) {
  storage?.removeItem?.(WOW_PRIVATE_RULE_STAGE_KEY);
  return { ok:false, reason, ...(audit ? { audit } : {}) };
}
function validateContentBundle(bundle, manifest) {
  if (!bundle || bundle.schemaVersion !== 1 || bundle.dlcId !== "wow-2026" ||
      bundle.scope !== "P0_PRIVATE_LV1_3_CONTENT" ||
      bundle.manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
      bundle.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      bundle.recordCount !== 47 ||
      !bundle.records || typeof bundle.records !== "object" || Array.isArray(bundle.records))
    return { ok:false, reason:"PRIVATE_RULE_CONTENT_CONTRACT_FAILED" };
  const expected = Object.entries(manifest.records || {});
  const actualIds = Object.keys(bundle.records);
  if (expected.length !== 47 || actualIds.length !== 47)
    return { ok:false, reason:"PRIVATE_RULE_CONTENT_RECORD_COUNT_MISMATCH" };
  for (const [id, proof] of expected) {
    const row = bundle.records[id];
    if (!row || row.id !== id || row.pack !== proof.pack ||
        row.sourceSha !== proof.sourceSha || row.translationSha !== proof.translationSha ||
        typeof row.name !== "string" || !row.name.trim() ||
        typeof row.description !== "string" || !row.description.trim())
      return { ok:false, reason:"PRIVATE_RULE_CONTENT_RECORD_MISMATCH", id };
  }
  if (actualIds.some(id => !Object.hasOwn(manifest.records, id)))
    return { ok:false, reason:"PRIVATE_RULE_CONTENT_UNEXPECTED_RECORD" };
  return { ok:true };
}

export async function consumeStagedWowPrivateRules({
  storage = globalThis.sessionStorage,
  now = Date.now(),
} = {}) {
  const raw = storage?.getItem?.(WOW_PRIVATE_RULE_STAGE_KEY);
  if (!raw) return { ok:false, reason:"PRIVATE_RULE_STAGE_MISSING" };
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch { return fail(storage, "PRIVATE_RULE_STAGE_INVALID"); }
  const age = now - Number(envelope?.stagedAt);
  if (envelope?.v !== 1 || typeof envelope?.campaignId !== "string" ||
      !Number.isInteger(envelope?.revision) || envelope.revision < 1 ||
      !Number.isFinite(age) || age < 0 || age > WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS ||
      envelope?.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      envelope?.manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
      envelope?.contentBundleSha !== WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256 ||
      typeof envelope?.manifestJson !== "string" ||
      typeof envelope?.contentBundleJson !== "string")
    return fail(storage, "PRIVATE_RULE_STAGE_EXPIRED_OR_MISMATCH");

  const [manifestSha, contentBundleSha] = await Promise.all([
    sha256(envelope.manifestJson), sha256(envelope.contentBundleJson),
  ]);
  if (manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256)
    return fail(storage, "PRIVATE_RULE_MANIFEST_TAMPERED");
  if (contentBundleSha !== WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256)
    return fail(storage, "PRIVATE_RULE_CONTENT_TAMPERED");

  let manifest, contentBundle;
  try {
    manifest = JSON.parse(envelope.manifestJson);
    contentBundle = JSON.parse(envelope.contentBundleJson);
  } catch {
    return fail(storage, "PRIVATE_RULE_PROVIDER_INVALID_JSON");
  }
  const audit = validateWowPrivateProgressionManifest(manifest, {
    entitlement:true,
    privateDelivery:true,
    sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  });
  if (!audit.ok) return fail(storage, "PRIVATE_RULE_CONTRACT_FAILED", audit);
  const contentAudit = validateContentBundle(contentBundle, manifest);
  if (!contentAudit.ok) return fail(storage, contentAudit.reason, contentAudit);

  storage.removeItem(WOW_PRIVATE_RULE_STAGE_KEY);
  return {
    ok:true,
    campaignId:envelope.campaignId,
    revision:envelope.revision,
    manifestSha,
    contentBundleSha,
    sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
    manifest,
    contentBundle,
    audit,
  };
}

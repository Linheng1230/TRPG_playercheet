import {
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

export async function consumeStagedWowPrivateRules({
  storage = globalThis.sessionStorage,
  now = Date.now(),
} = {}) {
  const raw = storage?.getItem?.(WOW_PRIVATE_RULE_STAGE_KEY);
  if (!raw) return { ok:false, reason:"PRIVATE_RULE_STAGE_MISSING" };
  let envelope;
  try { envelope = JSON.parse(raw); }
  catch {
    storage.removeItem(WOW_PRIVATE_RULE_STAGE_KEY);
    return { ok:false, reason:"PRIVATE_RULE_STAGE_INVALID" };
  }
  const age = now - Number(envelope?.stagedAt);
  if (envelope?.v !== 1 || typeof envelope?.campaignId !== "string" ||
      !Number.isInteger(envelope?.revision) || envelope.revision < 1 ||
      !Number.isFinite(age) || age < 0 || age > WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS ||
      envelope?.sourceSnapshotSha !== WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256 ||
      envelope?.manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
      typeof envelope?.manifestJson !== "string") {
    storage.removeItem(WOW_PRIVATE_RULE_STAGE_KEY);
    return { ok:false, reason:"PRIVATE_RULE_STAGE_EXPIRED_OR_MISMATCH" };
  }
  const actualSha = await sha256(envelope.manifestJson);
  if (actualSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256) {
    storage.removeItem(WOW_PRIVATE_RULE_STAGE_KEY);
    return { ok:false, reason:"PRIVATE_RULE_MANIFEST_TAMPERED" };
  }
  let manifest;
  try { manifest = JSON.parse(envelope.manifestJson); }
  catch {
    storage.removeItem(WOW_PRIVATE_RULE_STAGE_KEY);
    return { ok:false, reason:"PRIVATE_RULE_MANIFEST_INVALID" };
  }
  const audit = validateWowPrivateProgressionManifest(manifest, {
    entitlement:true,
    privateDelivery:true,
    sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  });
  storage.removeItem(WOW_PRIVATE_RULE_STAGE_KEY);
  if (!audit.ok) return { ok:false, reason:"PRIVATE_RULE_CONTRACT_FAILED", audit };
  return {
    ok:true,
    campaignId:envelope.campaignId,
    revision:envelope.revision,
    manifestSha:actualSha,
    sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
    manifest,
    audit,
  };
}

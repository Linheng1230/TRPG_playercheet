import assert from "node:assert/strict";
import {
  WOW_PRIVATE_RULE_STAGE_KEY,
  WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS,
  consumeStagedWowPrivateRules,
} from "../assets/wow-dlc-private-provider-session.mjs";
import {
  WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
} from "../assets/wow-dlc-private-provider-contract.mjs";

function storageWith(value) {
  const map=new Map();
  if(value!==undefined)map.set(WOW_PRIVATE_RULE_STAGE_KEY,value);
  return {
    getItem:k=>map.get(k)??null,
    setItem:(k,v)=>map.set(k,v),
    removeItem:k=>map.delete(k),
    has:k=>map.has(k),
  };
}
assert.equal((await consumeStagedWowPrivateRules({storage:storageWith()})).reason,
  "PRIVATE_RULE_STAGE_MISSING");

const stale=storageWith(JSON.stringify({
  v:1,campaignId:"campaign_a",revision:1,stagedAt:1,
  sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  contentBundleSha:WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  manifestJson:"{}",contentBundleJson:"{}",
}));
const expired=await consumeStagedWowPrivateRules({
  storage:stale,now:1+WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS+1,
});
assert.equal(expired.reason,"PRIVATE_RULE_STAGE_EXPIRED_OR_MISMATCH");
assert.equal(stale.has(WOW_PRIVATE_RULE_STAGE_KEY),false);

const tamperedManifest=storageWith(JSON.stringify({
  v:1,campaignId:"campaign_a",revision:1,stagedAt:100,
  sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  contentBundleSha:WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  manifestJson:"{}",contentBundleJson:"{}",
}));
const badManifest=await consumeStagedWowPrivateRules({storage:tamperedManifest,now:101});
assert.equal(badManifest.reason,"PRIVATE_RULE_MANIFEST_TAMPERED");
assert.equal(tamperedManifest.has(WOW_PRIVATE_RULE_STAGE_KEY),false);

const wrongBundlePin=storageWith(JSON.stringify({
  v:1,campaignId:"campaign_a",revision:1,stagedAt:100,
  sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  contentBundleSha:"0".repeat(64),
  manifestJson:"{}",contentBundleJson:"{}",
}));
const badBundlePin=await consumeStagedWowPrivateRules({storage:wrongBundlePin,now:101});
assert.equal(badBundlePin.reason,"PRIVATE_RULE_STAGE_EXPIRED_OR_MISMATCH");
assert.equal(wrongBundlePin.has(WOW_PRIVATE_RULE_STAGE_KEY),false);
console.log("PASS staged WoW private provider fails closed on missing/stale/tampered manifest+content pair");

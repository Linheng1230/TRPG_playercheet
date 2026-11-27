import assert from "node:assert/strict";
import {
  WOW_PRIVATE_RULE_STAGE_KEY,
  WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS,
  consumeStagedWowPrivateRules,
} from "../assets/wow-dlc-private-provider-session.mjs";

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
  sourceSnapshotSha:"bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360",
  manifestSha:"80f495f509a46f0e9f350fa60a37e5351b071c958cdf8c8dcb2cf1df072c0910",
  manifestJson:"{}",
}));
const expired=await consumeStagedWowPrivateRules({
  storage:stale,now:1+WOW_PRIVATE_RULE_STAGE_MAX_AGE_MS+1,
});
assert.equal(expired.reason,"PRIVATE_RULE_STAGE_EXPIRED_OR_MISMATCH");
assert.equal(stale.has(WOW_PRIVATE_RULE_STAGE_KEY),false);
const tampered=storageWith(JSON.stringify({
  v:1,campaignId:"campaign_a",revision:1,stagedAt:100,
  sourceSnapshotSha:"bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360",
  manifestSha:"80f495f509a46f0e9f350fa60a37e5351b071c958cdf8c8dcb2cf1df072c0910",
  manifestJson:"{}",
}));
const bad=await consumeStagedWowPrivateRules({storage:tampered,now:101});
assert.equal(bad.reason,"PRIVATE_RULE_MANIFEST_TAMPERED");
assert.equal(tampered.has(WOW_PRIVATE_RULE_STAGE_KEY),false);
console.log("PASS staged WoW private provider fails closed on missing/stale/tampered data");

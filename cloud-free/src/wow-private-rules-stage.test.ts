import { describe, expect, it } from "vitest";
import {
  WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  WOW_PRIVATE_RULE_STAGE_KEY,
  stageWowPrivateRulesForCreator,
  verifyWowPrivateRuleProvider,
} from "./wow-private-rules";

describe("WoW private rule staging",()=>{
  it("pins production staging to formal 0.1.26 manifest/content and source snapshot",()=>{
    expect(WOW_PRIVATE_LV1_3_MANIFEST_SHA256).toBe(
      "6850fd0075308e0c9363854f590198935f70c4df0d6150f34d82b4e9288259f1");
    expect(WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256).toBe(
      "68b829d2d636626083328d60ce40c354da31bb32d8f19fe4b95665fa1cb262e8");
    expect(WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256).toBe(
      "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360");
    expect(WOW_PRIVATE_RULE_STAGE_KEY).toBe("zizi.wow.private-rules.v1");
  });
  it("rejects tampered manifest/content before session staging",async()=>{
    const storage=new Map<string,string>();
    const fakeStorage={
      get length(){return storage.size;},clear:()=>storage.clear(),
      getItem:(k:string)=>storage.get(k)??null,key:(i:number)=>[...storage.keys()][i]??null,
      removeItem:(k:string)=>{storage.delete(k);},setItem:(k:string,v:string)=>{storage.set(k,v);},
    } satisfies Storage;
    const row={
      manifestJson:"{}",contentBundleJson:"{}",
      manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
      contentBundleSha:WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
      sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
      revision:1,updatedAt:1,
    };
    await expect(verifyWowPrivateRuleProvider(row)).rejects.toThrow("WOW_PRIVATE_RULE_MANIFEST_MISMATCH");
    await expect(stageWowPrivateRulesForCreator(fakeStorage,"campaign_a",row))
      .rejects.toThrow("WOW_PRIVATE_RULE_MANIFEST_MISMATCH");
    expect(storage.has(WOW_PRIVATE_RULE_STAGE_KEY)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
  WOW_PRIVATE_RULE_STAGE_KEY,
  stageWowPrivateRulesForCreator,
  verifyWowPrivateRuleProvider,
} from "./wow-private-rules";

const canonicalManifest = "";

describe("WoW private rule staging",()=>{
  it("pins production staging to the canonical manifest and source snapshot",()=>{
    expect(WOW_PRIVATE_LV1_3_MANIFEST_SHA256).toBe(
      "80f495f509a46f0e9f350fa60a37e5351b071c958cdf8c8dcb2cf1df072c0910");
    expect(WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256).toBe(
      "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360");
    expect(WOW_PRIVATE_RULE_STAGE_KEY).toBe("zizi.wow.private-rules.v1");
  });
  it("rejects an unauthorized/tampered provider row before session staging",async()=>{
    const storage=new Map<string,string>();
    const fakeStorage={setItem:(k:string,v:string)=>storage.set(k,v)} as Storage;
    const row={manifestJson:JSON.stringify({
      schemaVersion:1,dlcId:"wow-2026",
      sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,
      classes:Array(13),specializations:Array(40),progressionRows:Array(120),
    }),sourceSnapshotSha:WOW_PRIVATE_LV1_3_SOURCE_SNAPSHOT_SHA256,revision:1,updatedAt:1};
    await expect(verifyWowPrivateRuleProvider(row)).rejects.toThrow("WOW_PRIVATE_RULE_MANIFEST_MISMATCH");
    await expect(stageWowPrivateRulesForCreator(fakeStorage,"campaign_a",row))
      .rejects.toThrow("WOW_PRIVATE_RULE_MANIFEST_MISMATCH");
    expect(storage.has(WOW_PRIVATE_RULE_STAGE_KEY)).toBe(false);
  });
});

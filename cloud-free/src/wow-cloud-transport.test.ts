import {describe, expect, it, vi} from "vitest";
import {upload, getMineForDownload, listMine} from "../convex/characters";
import {share, unshare, dmReadShared, dmRoster} from "../convex/campaigns";
import {readNativeCloudSave, syncNativeSave, type CloudApi} from "./creator-cloud-sync";
import {characterStorageKey, importCloudSaveToLocal, readLocalRaw, type RosterStorage} from "./local-roster";
import {validateCharacterJson} from "../convex/lib/characterPayload";

vi.mock("@convex-dev/auth/server", () => ({getAuthUserId: vi.fn(async (ctx: any) => ctx.qaUser)}));

// Synthetic storage-transport fixtures ONLY. The two confirmed DLC identity
// keys are from PR117 exchange. qaUncontracted is deliberately opaque;
// it is NOT a proposed official specialization/faction/renown schema.
// No entitlement, real rules, playable character or hosted UAT is asserted.
const id = "cQaWowLv3";
function fixture(level: number, renown: number) {
  return JSON.stringify({
    v: 10, ruleset: "2024", id, level, meta: {name: "QA synthetic Lv3"},
    dlcId: "wow-2026", dlcSpeciesSource: {origin: "wow", id: "wow:orc"},
    dlcClassId: "warrior", dlcClassCoreId: "fighter", classLevels: {fighter: level},
    qaUncontracted: {
      specialization: "qa:spec", faction: "qa:faction",
      renown: {"qa:faction": renown}, reputation: {"qa:subfaction": renown + 1},
      speciesChoices: ["qa:choice"], extraFutureField: {keep: ["中文", 1, true]},
    },
    ts: level,
  }, null, 2);
}

function memoryStorage(): RosterStorage {
  const m = new Map<string, string>();
  return {getItem: k => m.get(k) ?? null, setItem: (k,v) => {m.set(k,v)}, removeItem: k => {m.delete(k)}};
}

// Actual Convex handlers with isolated in-memory transaction stubs.
// No real accounts, deployment, database writes, or private content.
function harness() {
  const tables = new Map<string, any[]>([
    ["users", [{_id:"ownerA",role:"user"}, {_id:"ownerB",role:"user"}, {_id:"gmA",role:"admin"}, {_id:"gmB",role:"admin"}]],
    ["campaigns", [{_id:"campaignA",ownerId:"gmA"}, {_id:"campaignB",ownerId:"gmB"}]],
    ["memberships", [{_id:"memberA",campaignId:"campaignA",userId:"ownerA"}]],
    ["characters", []], ["characterShares", []],
  ]);
  let sequence = 0;
  function get(rowId: string) {
    return [...tables.values()].flat().find(row => row._id === rowId) ?? null;
  }
  const db = {
    get: async (rowId: string) => get(rowId),
    query: (table: string) => ({
      withIndex: (_index: string, apply: (q: any) => any) => {
        const checks: [string, unknown][] = [];
        const builder = {eq: (key: string, value: unknown) => {checks.push([key,value]); return builder;}};
        apply(builder);
        const rows = (tables.get(table) ?? []).filter(row => checks.every(([k,v]) => row[k] === v));
        return {collect: async () => rows, unique: async () => {
          if (rows.length > 1) throw Error("DUPLICATE_FIXTURE");
          return rows[0] ?? null;
        }};
      },
    }),
    insert: async (table: string, value: any) => {
      const rowId = table + (++sequence);
      tables.get(table)!.push({...value,_id:rowId});
      return rowId;
    },
    patch: async (rowId: string, value: any) => {
      const row = get(rowId); if (!row) throw Error("MISSING_FIXTURE");
      Object.assign(row,value);
    },
    delete: async (rowId: string) => {
      for (const [name, rows] of tables) tables.set(name,rows.filter(r=>r._id!==rowId));
    },
  };
  const invoke = (fn: any, qaUser: string, args: any) => fn._handler({qaUser,db},args);
  const api: CloudApi = {
    list: () => invoke(listMine,"ownerA",{}),
    read: recordId => invoke(getMineForDownload,"ownerA",{id:recordId}),
    upload: args => invoke(upload,"ownerA",args),
  };
  return {api,invoke};
}
const current = () => true;

describe("WoW opaque transport — synthetic, no rules/provider authorization", () => {
  it("preserves Lv3 bytes, subsequent level change and unknown nested data across actual handler and adapter", async () => {
    const {api} = harness(), a = memoryStorage(), b = memoryStorage();
    const lv3 = fixture(3,0), lv4 = fixture(4,1);
    expect(validateCharacterJson(lv3)).toEqual({characterId:id,saveVersion:10,ruleset:"2024"});
    importCloudSaveToLocal(a,lv3);
    const first = await syncNativeSave(a,api,"ownerA",id,current);
    expect(first.originalJson).toBe(lv3);
    expect(first.revision).toBe(1);
    await readNativeCloudSave(b,api,"ownerA",first._id,current);
    expect(readLocalRaw(b,id)).toBe(lv3);
    // Simulate an upstream producer's next payload, NOT actual level-up mechanics.
    b.setItem(characterStorageKey(id),lv4);
    expect((await syncNativeSave(b,api,"ownerA",id,current)).revision).toBe(2);
    await readNativeCloudSave(a,api,"ownerA",first._id,current);
    expect(readLocalRaw(a,id)).toBe(lv4);
  });
  it("shares only owner-scoped current bytes; outsider GM, foreign player, stale revision and revoked share are denied", async () => {
    const {api,invoke} = harness();
    const first = await api.upload({originalJson:fixture(3,0),expectedRevision:null,expectedOwnerId:"ownerA"});
    const args = {campaignId:"campaignA",characterId:first.id};
    await expect(invoke(getMineForDownload,"ownerB",{id:first.id})).rejects.toThrow("FORBIDDEN");
    await expect(invoke(share,"ownerB",args)).rejects.toThrow("NOT_MEMBER");
    await invoke(share,"ownerA",args);
    expect((await invoke(dmReadShared,"gmA",args)).originalJson).toBe(fixture(3,0));
    await expect(invoke(dmReadShared,"gmB",args)).rejects.toThrow("FORBIDDEN");
    await api.upload({originalJson:fixture(4,1),expectedRevision:1,expectedOwnerId:"ownerA"});
    await expect(api.upload({originalJson:fixture(3,0),expectedRevision:1,expectedOwnerId:"ownerA"})).rejects.toThrow("REVISION_CONFLICT");
    const shared = await invoke(dmReadShared,"gmA",args);
    expect(shared.originalJson).toBe(fixture(4,1));
    expect(shared.revision).toBe(2);
    expect(await invoke(dmRoster,"gmA",{campaignId:"campaignA"})).toEqual([
      expect.objectContaining({characterId:id,revision:2,displayName:"QA synthetic Lv3"}),
    ]);
    await invoke(unshare,"ownerA",args);
    await expect(invoke(dmReadShared,"gmA",args)).rejects.toThrow("SHARE_REVOKED");
    expect((await api.read(first.id)).originalJson).toBe(fixture(4,1));
  });
  it("rejects a legacy overwrite that would erase confirmed WoW identity fields", async () => {
    const {api,invoke} = harness();
    const raw = fixture(3,0);
    const first = await api.upload({originalJson:raw,expectedRevision:null,expectedOwnerId:"ownerA"});
    const shareArgs = {campaignId:"campaignA",characterId:first.id};
    await invoke(share,"ownerA",shareArgs);
    const cases = [
      { ...JSON.parse(raw), dlcId:undefined },
      { ...JSON.parse(raw), dlcId:"other-dlc" },
      { ...JSON.parse(raw), ruleset:"2014" },
      ...["dlcSpeciesSource","dlcClassId","dlcClassCoreId","classLevels"].map(key =>
        ({ ...JSON.parse(raw), [key]:undefined })),
      { ...JSON.parse(raw), dlcSpeciesSource:null },
    ];
    for (const candidate of cases) {
      // Legacy manual upload has no expectedOwnerId. CAS alone cannot detect field loss.
      await expect(invoke(upload,"ownerA",{originalJson:JSON.stringify(candidate),expectedRevision:1}))
        .rejects.toThrow("WOW_SAVE_IDENTITY_LOSS");
      const current = await api.read(first.id);
      expect(current.originalJson).toBe(raw);
      expect(current.revision).toBe(1);
      expect((await invoke(dmReadShared,"gmA",shareArgs)).originalJson).toBe(raw);
    }
    // A same-DLC update may change gameplay fields and keep the same identity envelope.
    expect((await api.upload({originalJson:fixture(4,1),expectedRevision:1,expectedOwnerId:"ownerA"})).revision).toBe(2);
  });
  it("keeps legacy v9/2014 and v10/2024 saves alongside a DLC payload without mutation", async () => {
    const {api,invoke} = harness();
    for (const [v,ruleset] of [[9,"2014"],[10,"2024"]] as const) {
      const raw = JSON.stringify({v,ruleset,id:"cLegacy"+v,meta:{name:"QA legacy"},unknown:{keep:true}});
      // Legacy manual client has no expectedOwnerId argument.
      const saved = await invoke(upload,"ownerA",{originalJson:raw,expectedRevision:null});
      expect((await api.read(saved.id)).originalJson).toBe(raw);
    }
    await api.upload({originalJson:fixture(3,0),expectedRevision:null,expectedOwnerId:"ownerA"});
    expect((await api.list()).map(x=>x.characterId).sort()).toEqual(["cLegacy10","cLegacy9",id].sort());
  });
});

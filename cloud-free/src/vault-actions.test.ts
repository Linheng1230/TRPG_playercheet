import {describe,expect,it} from "vitest";
import {stageCloudCharacterForOpen,LEGACY_CURRENT_CHARACTER_KEY} from "./vault-actions";
import {ROSTER_KEY,characterStorageKey,type RosterStorage} from "./local-roster";
import {characterDisplayName} from "../convex/lib/characterPayload";
import {makeInviteCode,normalizeInviteCode,advanceInviteBudget,
  INVITE_WINDOW_MS, INVITE_ATTEMPTS_PER_WINDOW} from "../convex/lib/invite-codes";
class FakeStorage implements RosterStorage {
  data=new Map<string,string>();
  getItem(key:string){return this.data.get(key)??null}
  setItem(key:string,value:string){this.data.set(key,value)}
  removeItem(key:string){this.data.delete(key)}
}
const save=(id:string,name="奈瑟琳")=>JSON.stringify({
  v:10,id,ruleset:"2024",level:4,cls:"德魯伊",meta:{name},custom:{persist:true},
});
const start=(raw:string)=>{
 const store=new FakeStorage();
 const o=JSON.parse(raw);
 store.setItem(characterStorageKey(o.id),raw);
 store.setItem(ROSTER_KEY,JSON.stringify([{id:o.id,name:o.meta.name,cls:o.cls,ts:100}]));
 return store;
};
describe("cloud one-click opener",()=>{
 it("places a cloud-only save into legacy creator without another import click",()=>{
  const storage=new FakeStorage(),raw=save("cCloud");
  expect(stageCloudCharacterForOpen(storage,raw,()=>false,()=>"cNotUsed"))
    .toEqual({id:"cCloud",status:"created"});
  expect(storage.getItem(characterStorageKey("cCloud"))).toBe(raw);
  expect(storage.getItem(LEGACY_CURRENT_CHARACTER_KEY)).toBe("cCloud");
 });
 it("reopening identical cloud save is idempotent",()=>{
  const raw=save("cSame"),storage=start(raw);
  const before=storage.getItem(ROSTER_KEY);
  expect(stageCloudCharacterForOpen(storage,raw,()=>false,()=>"cNo")).toMatchObject({status:"identical",id:"cSame"});
  expect(storage.getItem(ROSTER_KEY)).toBe(before);
 });
 it("canceling conflicting cloud version preserves local current and both sources",()=>{
  const old=save("cSame","本機"),incoming=save("cSame","雲端");
  const storage=start(old);storage.setItem(LEGACY_CURRENT_CHARACTER_KEY,"cExisting");
  const before=[...storage.data.entries()];
  expect(()=>stageCloudCharacterForOpen(storage,incoming,()=>false,()=>"cCopy")).toThrow("已取消");
  expect([...storage.data.entries()]).toEqual(before);
 });
 it("conflicting cloud version is copied without replacing local and opens the copy",()=>{
  const old=save("cSame","本機"),remote=save("cSame","雲端"),storage=start(old);
  const result=stageCloudCharacterForOpen(storage,remote,()=>true,()=>"cCloudCopy");
  expect(result).toEqual({status:"copied",id:"cCloudCopy"});
  expect(storage.getItem(characterStorageKey("cSame"))).toBe(old);
  expect(JSON.parse(storage.getItem(characterStorageKey("cCloudCopy"))||"{}").meta.name).toBe("雲端");
  expect(storage.getItem(LEGACY_CURRENT_CHARACTER_KEY)).toBe("cCloudCopy");
 });
});
describe("server-side character display names, no DB backfill",()=>{
 it("uses existing meta.name from JSON for previously uploaded characters",()=>{
  expect(characterDisplayName(save("cCloud","奈瑟琳・維爾"))).toBe("奈瑟琳・維爾");
 });
 it("falls back to class then unnamed character, safely strips HTML tags",()=>{
  expect(characterDisplayName('{"meta":{},"cls":"德魯伊"}')).toBe("德魯伊");
  expect(characterDisplayName('{"meta":{}}')).toBe("未命名冒險者");
  expect(characterDisplayName('{"meta":{"name":"<b>奈瑟琳</b>"}}')).toBe("奈瑟琳");
  expect(characterDisplayName("INVALID_JSON")).toBe("未命名冒險者");
 });
});
describe("5-character invite codes and online throttling",()=>{
 it("cryptographically generated samples have exactly 5 uppercase letters/digits",()=>{
  for(let i=0;i<50;i++)expect(makeInviteCode()).toMatch(/^[A-Z0-9]{5}$/);
 });
 it("unbiased byte rejection skips values >=252 and uses safe symbols",()=>{
  let calls=0;
  const got=makeInviteCode(arr=>{
   calls++;
   arr.fill(255);
   if(calls===2)arr.set([0,35,1,34,2]);
   return arr;
  });
  expect(got).toBe("A9B8C");
 });
 it("normalizes 5 chars and keeps unexpired legacy 64hex compatible",()=>{
  expect(normalizeInviteCode(" ab9c2 ")).toBe("AB9C2");
  expect(normalizeInviteCode("a".repeat(64))).toBe("a".repeat(64));
  expect(normalizeInviteCode("3")).toBeNull();
  expect(normalizeInviteCode("AA*93")).toBeNull();
 });
 it("limits authenticated users to 5 attempts per 10 minutes",()=>{
  const t=1000;
  let state:ReturnType<typeof advanceInviteBudget>["next"]|null=null;
  for(let i=0;i<INVITE_ATTEMPTS_PER_WINDOW;i++){
   const x=advanceInviteBudget(state,t+i);
   expect(x.allowed).toBe(true);state=x.next;
  }
  const limited=advanceInviteBudget(state,t+INVITE_WINDOW_MS-1);
  expect(limited.allowed).toBe(false);
  expect(advanceInviteBudget(state,t+INVITE_WINDOW_MS).allowed).toBe(true);
 });
});

import {vi} from "vitest";
// Intercept only the auth identity provider; no real network/DB access.
vi.mock("@convex-dev/auth/server",()=>({getAuthUserId:vi.fn(async()=>"user_test")}));
import {requireGameMaster} from "../convex/lib/authz";
describe("GM authorization is enforced at the server helper",()=>{
  const ctx=(role:"admin"|"user")=>({db:{get:async()=>({role})}});
  it("denies a regular player even when they can invoke a mutation directly",async()=>{
    await expect(requireGameMaster(ctx("user") as never)).rejects.toThrow("GM_ONLY");
  });
  it("admits only a pre-provisioned admin role",async()=>{
    await expect(requireGameMaster(ctx("admin") as never)).resolves.toBe("user_test");
  });
  it("never promotes a missing user",async()=>{
    const missing={db:{get:async()=>null}};
    await expect(requireGameMaster(missing as never)).rejects.toThrow("USER_NOT_FOUND");
  });
});

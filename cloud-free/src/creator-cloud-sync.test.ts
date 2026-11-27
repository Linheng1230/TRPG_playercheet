import {describe,expect,it,vi} from "vitest";
import {boundOwner,readNativeCloudSave,syncNativeSave,type CloudApi,type CloudRecord} from "./creator-cloud-sync";
import {characterStorageKey,importCloudSaveToLocal,readLocalRaw,type RosterStorage} from "./local-roster";
import {upload,getMineForDownload} from "../convex/characters";
import {createUserGoogle} from "../convex/users";
vi.mock("@convex-dev/auth/server",()=>({getAuthUserId:vi.fn(async()=>"ownerA")}));
const id="cP0Test";
const raw=(hp=21,ts=1)=>JSON.stringify({v:10,ruleset:"2024",id,meta:{name:"合成角色"},play:{hp},ts});
function storage(seed?:string):RosterStorage{
 const m=new Map<string,string>();const s={getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)},removeItem:(k:string)=>{m.delete(k)}};
 if(seed)importCloudSaveToLocal(s,seed);
 return s;
}
function backend(){
 let row:CloudRecord|null=null;
 const api:CloudApi={list:async()=>row?[{_id:row._id,characterId:row.characterId,revision:row.revision}]:[],
 read:async()=>{if(!row)throw Error("MISSING");return {...row}},
 upload:async(args)=>{if(args.expectedOwnerId!=="ownerA")throw Error("ACCOUNT_CHANGED");
 if((row?.revision??null)!==args.expectedRevision)throw Error("REVISION_CONFLICT");
 row={_id:"cloudRow",ownerId:"ownerA",characterId:id,originalJson:args.originalJson,revision:(row?.revision??0)+1};return{id:row._id,revision:row.revision}}};
 return {api,get row(){return row}};
}
const current=()=>true;
describe("existing Convex upload/read adapter (fixture transport, not hosted runtime)",()=>{
 it("explicitly binds, saves, ignores bookkeeping timestamp and reads on another device",async()=>{
  const a=storage(raw()),b=storage(),server=backend();
  expect((await syncNativeSave(a,server.api,"ownerA",id,current)).revision).toBe(1);
  a.setItem(characterStorageKey(id),raw(21,2));
  expect((await syncNativeSave(a,server.api,"ownerA",id,current)).revision).toBe(1);
  a.setItem(characterStorageKey(id),raw(17,3));
  expect((await syncNativeSave(a,server.api,"ownerA",id,current)).revision).toBe(2);
  await readNativeCloudSave(b,server.api,"ownerA","cloudRow",current);
  expect(readLocalRaw(b,id)).toBe(raw(17,3));expect(boundOwner(b,id)).toBe("ownerA");
  b.setItem(characterStorageKey(id),raw(15,4));
  await syncNativeSave(b,server.api,"ownerA",id,current);
  await readNativeCloudSave(a,server.api,"ownerA","cloudRow",current);
  expect(readLocalRaw(a,id)).toBe(raw(15,4));
 });
 it("does not overwrite dirty local edits or a newer remote revision",async()=>{
  const a=storage(raw()),b=storage(),server=backend();
  await syncNativeSave(a,server.api,"ownerA",id,current);
  await readNativeCloudSave(b,server.api,"ownerA","cloudRow",current);
  a.setItem(characterStorageKey(id),raw(10));b.setItem(characterStorageKey(id),raw(11));
  await syncNativeSave(b,server.api,"ownerA",id,current);
  await expect(syncNativeSave(a,server.api,"ownerA",id,current)).rejects.toThrow("REVISION_CONFLICT");
  await expect(readNativeCloudSave(a,server.api,"ownerA","cloudRow",current)).rejects.toThrow("LOCAL_REVISION_CONFLICT");
  expect(readLocalRaw(a,id)).toBe(raw(10));expect(server.row?.originalJson).toBe(raw(11));
 });
 it("rejects unproved ownership and account switches, never automatically merges",async()=>{
  const a=storage(raw()),server=backend();
  await syncNativeSave(a,server.api,"ownerA",id,current);
  await expect(syncNativeSave(a,server.api,"ownerB",id,current)).rejects.toThrow("LOCAL_ACCOUNT_MISMATCH");
  await expect(readNativeCloudSave(storage(),server.api,"ownerB","cloudRow",current)).rejects.toThrow("CLOUD_IDENTITY_MISMATCH");
  await expect(syncNativeSave(storage(raw()),server.api,"ownerA",id,()=>false)).rejects.toThrow("ACCOUNT_CHANGED");
  const other=storage(raw(9));await expect(syncNativeSave(other,server.api,"ownerA",id,current)).rejects.toThrow("REVISION_CONFLICT");
  expect(server.row?.originalJson).toBe(raw());
 });
});
describe("actual Convex handlers, synthetic transaction stubs",()=>{
 it("new Google user is never promoted or matched by name/email",async()=>{
  const insert=vi.fn(async()=>"freshUser");
  const result=await (createUserGoogle as any)._handler({db:{insert}},{method:{name:"google",profile:{id:"fixture",email:"admin@example.test",name:"admin",emailVerified:true}}});
  expect(result).toBe("freshUser");
  expect(insert).toHaveBeenCalledWith("users",{role:"user",createdAt:expect.any(Number)});
 });
 it("guard denies switched session before character query or write",async()=>{
  const query=vi.fn();const insert=vi.fn();
  const ctx={db:{get:vi.fn(async()=>({role:"user"})),query,insert}};
  await expect((upload as any)._handler(ctx,{originalJson:raw(),expectedRevision:null,expectedOwnerId:"ownerB"})).rejects.toThrow("ACCOUNT_CHANGED");
  expect(query).not.toHaveBeenCalled();expect(insert).not.toHaveBeenCalled();
 });
 it("old clients can still create without the additive owner argument; read remains owner scoped",async()=>{
  const insert=vi.fn(async()=>"cloudRow");
  const ctx={db:{get:vi.fn(async(id:string)=>id==="ownerA"?{role:"user"}:{ownerId:"ownerB"}),query:()=>({withIndex:()=>({unique:async()=>null})}),insert}};
  expect(await (upload as any)._handler(ctx,{originalJson:raw(),expectedRevision:null})).toEqual({id:"cloudRow",revision:1});
  expect(insert).toHaveBeenCalledWith("characters",expect.objectContaining({ownerId:"ownerA",originalJson:raw()}));
  await expect((getMineForDownload as any)._handler(ctx,{id:"foreign"})).rejects.toThrow("FORBIDDEN");
 });
});

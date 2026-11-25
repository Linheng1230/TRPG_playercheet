import {beforeAll,afterAll,beforeEach,describe,expect,it} from "vitest";
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from "@firebase/rules-unit-testing";
import {collection,doc,getDoc,getDocs} from "firebase/firestore";
import {readFileSync} from "node:fs";
import {saveBoundCharacter,bindAndSaveLocal,openOwnedCloudCharacter,localOwner,readBoundCharacter} from "../src/creator-sync";
import {characterStorageKey,ROSTER_KEY,readLocalRaw,type RosterStorage} from "../../cloud-free/src/local-roster";
const uid="creator_account_A_123",other="creator_account_B_123",id="cGoogleSyncTest";
const fixture=(v:9|10=10,hp=21)=>JSON.stringify({v,ruleset:v===9?"2014":"2024",id,
 cls:"德魯伊",sp:"卓爾",level:4,meta:{name:"跨裝置驗收角色"},base:{wis:18},play:{hp,hpMax:28}});
function local(raw?:string):RosterStorage{
 const values=new Map<string,string>();
 if(raw){values.set(characterStorageKey(id),raw);values.set(ROSTER_KEY,JSON.stringify([{id,name:"跨裝置驗收角色"}]));}
 return {getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v)},removeItem:k=>{values.delete(k)}};
}
let env:RulesTestEnvironment;
const db=(u:string)=>env.authenticatedContext(u).firestore();
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:"demo-dnd5r-creator-sync",firestore:{host:"127.0.0.1",port:8089,rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")}})});
beforeEach(async()=>{await env.clearFirestore()});
afterAll(async()=>{if(env)await env.cleanup()});
describe("Google UID creator synchronization against Firestore emulator",()=>{
 for(const v of [9,10] as const)it("native v"+v+" exact round-trip with independent clients and browser storage",async()=>{
  const a=local(fixture(v)),b=local(),clientA=db(uid),clientB=db(uid);
  const initial=await bindAndSaveLocal(a,clientA,uid,id,()=>true);
  expect(initial.revision).toBe(1);expect(localOwner(a,id)).toBe(uid);
  const read=(await getDoc(doc(clientB,"users",uid,"characters",id))).data()!;
  expect(read.originalJson).toBe(fixture(v));
  const saved=await saveBoundCharacter(clientA,uid,fixture(v,17),initial.revision);
  expect(saved.revision).toBe(2);
  const fresh=(await getDoc(doc(clientB,"users",uid,"characters",id))).data() as typeof saved;
  await openOwnedCloudCharacter(b,uid,fresh);
  expect(readLocalRaw(b,id)).toBe(fixture(v,17));
  expect(b.getItem("dnd5r:current")).toBe(id);
  expect(localOwner(b,id)).toBe(uid);
 });
 it("blocks concurrent stale revision and preserves both local and newer cloud data",async()=>{
  const a=db(uid),b=db(uid);
  const first=await saveBoundCharacter(a,uid,fixture(),null);
  const next=await saveBoundCharacter(b,uid,fixture(10,13),first.revision);
  await expect(saveBoundCharacter(a,uid,fixture(10,7),first.revision)).rejects.toThrow("CLOUD_REVISION_CONFLICT");
  expect((await getDoc(doc(a,"users",uid,"characters",id))).data()?.originalJson).toBe(next.originalJson);
  const conflicting=local(fixture(10,7));
  await expect(openOwnedCloudCharacter(conflicting,uid,next)).rejects.toThrow("LOCAL_REVISION_CONFLICT");
  expect(readLocalRaw(conflicting,id)).toBe(fixture(10,7));
 });
 it("enforces remote ACL, same browser local binding, signed-out cancellation and exact identity",async()=>{
  const a=local(fixture()),own=db(uid),attacker=db(other);
  const saved=await bindAndSaveLocal(a,own,uid,id,()=>true);
  await assertFails(getDoc(doc(attacker,"users",uid,"characters",id)));
  await assertFails(getDocs(collection(attacker,"users",uid,"characters")));
  await expect(saveBoundCharacter(attacker,uid,fixture(10,7),saved.revision)).rejects.toThrow();
  await expect(bindAndSaveLocal(a,attacker,other,id,()=>true)).rejects.toThrow("LOCAL_ACCOUNT_MISMATCH");
  await expect(bindAndSaveLocal(local(fixture()),attacker,other,id,()=>false)).rejects.toThrow("ACCOUNT_CHANGED");
  await expect(openOwnedCloudCharacter(local(),other,saved)).rejects.toThrow("CLOUD_IDENTITY_MISMATCH");
  expect((await getDocs(collection(attacker,"users",other,"characters"))).size).toBe(0);
 });
 it("fast-forwards a clean old browser and rejects an edited local baseline",async()=>{
  const a=local(fixture()),b=local(),clientA=db(uid),clientB=db(uid);
  const first=await bindAndSaveLocal(a,clientA,uid,id,()=>true);
  await openOwnedCloudCharacter(b,uid,first);
  const second=await saveBoundCharacter(clientA,uid,fixture(10,17),first.revision);
  // Native save bookkeeping is not a gameplay edit.
  const tsOnly=JSON.stringify({...JSON.parse(first.originalJson),ts:777});
  b.setItem(characterStorageKey(id),tsOnly);
  await openOwnedCloudCharacter(b,uid,second);
  expect(readLocalRaw(b,id)).toBe(second.originalJson);
  const third=await saveBoundCharacter(clientA,uid,fixture(10,15),second.revision);
  b.setItem(characterStorageKey(id),fixture(10,9));
  await expect(openOwnedCloudCharacter(b,uid,third)).rejects.toThrow("LOCAL_REVISION_CONFLICT");
  expect(readLocalRaw(b,id)).toBe(fixture(10,9));
 });
 it("authoritative read never regresses below known revision and rejects another UID",async()=>{
  const a=db(uid),b=db(uid);
  const first=await saveBoundCharacter(a,uid,fixture(),null);
  const storage=local();
  await openOwnedCloudCharacter(storage,uid,first);
  const next=await saveBoundCharacter(b,uid,fixture(10,16),first.revision);
  const read=await readBoundCharacter(a,uid,id,next.revision);
  expect(read.originalJson).toBe(next.originalJson);
  await openOwnedCloudCharacter(storage,uid,read);
  await expect(readBoundCharacter(a,uid,id,next.revision+1)).rejects.toThrow("CLOUD_STALE_READ");
  await expect(openOwnedCloudCharacter(storage,uid,first)).rejects.toThrow("CLOUD_STALE_READ");
  expect(readLocalRaw(storage,id)).toBe(next.originalJson);
  await expect(readBoundCharacter(db(other),uid,id)).rejects.toThrow();
 });
 it("idempotent repeat writes do not increment revision; same ID in another account is independent",async()=>{
  const a=db(uid),b=db(other);
  const first=await saveBoundCharacter(a,uid,fixture(),null);
  const repeat=await saveBoundCharacter(a,uid,fixture(),null);
  expect(repeat.revision).toBe(first.revision);
  const timestampOnly=JSON.stringify({...JSON.parse(fixture()),ts:12345});
  expect((await saveBoundCharacter(a,uid,timestampOnly,first.revision)).revision).toBe(first.revision);
  const second=await saveBoundCharacter(b,other,fixture(10,5),null);
  expect(second.revision).toBe(1);
  expect((await getDoc(doc(a,"users",uid,"characters",id))).data()?.originalJson).toBe(fixture());
 });
});

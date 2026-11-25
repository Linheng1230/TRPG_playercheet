// Synthetic-only migration rehearsal. Never import this from application code.
// No real credentials, exports, identity mappings, or hosted database access.
import {beforeAll,afterAll,beforeEach,describe,expect,it} from "vitest";
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from "@firebase/rules-unit-testing";
import {doc,getDoc,setDoc} from "firebase/firestore";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {parseCharacter} from "../src/model";
import {listOwnCharacters,listGmSharedSheets,listMyShares,listMembers} from "../src/firestore-service";

const g="fixture_gm_google",a="fixture_player_google_a",b="fixture_player_google_b";
const users=[{id:"old-gm",role:"admin",createdAt:1},{id:"old-a",role:"user",createdAt:2},{id:"old-b",role:"user",createdAt:3}] as const;
const raw=(v:9|10,hp:number)=>JSON.stringify({v,ruleset:v===9?"2014":"2024",id:"sameNativeId",meta:{name:"相同名稱"},cls:"德魯伊",play:{hp,hpMax:28},unknownFutureField:{keep:true}});
const source={
 users:[...users],
 characters:[
  {id:"old-char-a",ownerId:"old-a",characterId:"sameNativeId",saveVersion:9,ruleset:"2014",revision:7,updatedAt:15,originalJson:raw(9,19)},
  {id:"old-char-b",ownerId:"old-b",characterId:"sameNativeId",saveVersion:10,ruleset:"2024",revision:11,updatedAt:16,originalJson:raw(10,14)}
 ],
 campaigns:[{id:"old-campaign",ownerId:"old-gm",name:"原有團務",createdAt:4}],
 memberships:[{campaignId:"old-campaign",userId:"old-a",joinedAt:5},{campaignId:"old-campaign",userId:"old-b",joinedAt:6}],
 characterShares:[{campaignId:"old-campaign",characterId:"old-char-a",ownerId:"old-a",createdAt:8}]
};
type Source=typeof source;
type Link={oldId:string;uid:string};
const links:Link[]=[{oldId:"old-gm",uid:g},{oldId:"old-a",uid:a},{oldId:"old-b",uid:b}];
type Row={path:string;data:Record<string,unknown>};
const sha=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");

// This fixture adapter only models the exact known source schema. It consumes
// synthetic explicit links; it does NOT establish or verify real identity.
function fixturePlan(s:Source,mapping:Link[]):Row[]{
 const byOld=new Map(mapping.map(x=>[x.oldId,x.uid]));
 if(byOld.size!==mapping.length||new Set(mapping.map(x=>x.uid)).size!==mapping.length||
   mapping.length!==s.users.length||s.users.some(u=>!byOld.has(u.id)))throw Error("IDENTITY_LINK_NOT_BIJECTIVE");
 const uid=(id:string)=>{const v=byOld.get(id);if(!v)throw Error("UNLINKED_OWNER");return v;};
 const rows:Row[]=[];
 const add=(path:string,data:Record<string,unknown>)=>{
  if(rows.some(x=>x.path===path))throw Error("DESTINATION_COLLISION");
  rows.push({path,data});
 };
 for(const u of s.users)add("profiles/"+uid(u.id),{role:u.role==="admin"?"gm":"player",displayName:"合成驗收",createdAt:u.createdAt});
 const chars=new Map<string,Record<string,unknown>>();
 for(const c of s.characters){
  const parsed=parseCharacter(c.originalJson);
  if(c.characterId!==parsed.sheet.id||c.ruleset!==parsed.sheet.ruleset||c.saveVersion!==parsed.v||!Number.isInteger(c.revision)||c.revision<1||chars.has(c.id))throw Error("SOURCE_CHARACTER_MISMATCH");
  const data={ownerUid:uid(c.ownerId),saveId:c.characterId,originalJson:c.originalJson,revision:c.revision,saveVersion:c.saveVersion,ruleset:c.ruleset,displayName:parsed.sheet.name,updatedAt:c.updatedAt};
  chars.set(c.id,data);add("users/"+uid(c.ownerId)+"/characters/"+c.characterId,data);
 }
 for(const c of s.campaigns){
  if(s.users.find(u=>u.id===c.ownerId)?.role!=="admin")throw Error("INVALID_GM_OWNER");
  add("campaigns/"+c.id,{ownerUid:uid(c.ownerId),name:c.name,createdAt:c.createdAt,closedAt:0,deletedAt:0});
 }
 for(const m of s.memberships){
  if(!s.campaigns.some(c=>c.id===m.campaignId))throw Error("MISSING_CAMPAIGN");
  add("campaigns/"+m.campaignId+"/members/"+uid(m.userId),{uid:uid(m.userId),joinedAt:m.joinedAt});
 }
 for(const sh of s.characterShares){
  const c=chars.get(sh.characterId);
  if(!c||c.ownerUid!==uid(sh.ownerId)||!s.memberships.some(m=>m.campaignId===sh.campaignId&&m.userId===sh.ownerId))throw Error("SHARE_WITHOUT_CONSENT_GRAPH");
  const {updatedAt:_,...data}=c;
  add("campaigns/"+sh.campaignId+"/members/"+uid(sh.ownerId)+"/shares/"+c.saveId,{...data,sharedAt:sh.createdAt});
 }
 return rows;
}
let env:RulesTestEnvironment;
beforeAll(async()=>{
 env=await initializeTestEnvironment({projectId:"demo-dnd5r-firebase-migration-contract",firestore:{host:"127.0.0.1",port:8089,rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")}});
});
beforeEach(async()=>{await env.clearFirestore()});
afterAll(async()=>{if(env)await env.cleanup()});
const db=(uid:string)=>env.authenticatedContext(uid).firestore();

describe("synthetic migration compatibility only (no real identity proof)",()=>{
 it("fails closed for missing or duplicate identity mappings, ownership/consent errors, and duplicate destination IDs",()=>{
  expect(()=>fixturePlan(source,links.slice(0,2))).toThrow("IDENTITY_LINK_NOT_BIJECTIVE");
  expect(()=>fixturePlan(source,[links[0],links[1],{oldId:"old-b",uid:a}])).toThrow("IDENTITY_LINK_NOT_BIJECTIVE");
  expect(()=>fixturePlan({...source,characterShares:[{...source.characterShares[0],ownerId:"old-b"}]},links)).toThrow("SHARE_WITHOUT_CONSENT_GRAPH");
  expect(()=>fixturePlan({...source,memberships:source.memberships.slice(1)},links)).toThrow("SHARE_WITHOUT_CONSENT_GRAPH");
  expect(()=>fixturePlan({...source,characters:[...source.characters,{...source.characters[0],id:"duplicate"}]},links)).toThrow("DESTINATION_COLLISION");
 });
 it("mapped exact native bytes, revision, GM role, memberships and consent survive emulator readback; fixture restore leaves source untouched",async()=>{
  const sourceDigest=sha(source);
  const plan=fixturePlan(source,links);
  const pathA="users/"+a+"/characters/sameNativeId";
  const oldBackup={path:pathA,data:{...plan.find(x=>x.path===pathA)!.data,revision:99}};
  // An occupied destination is never overwritten by the fixture rehearsal.
  await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),oldBackup.path),oldBackup.data));
  const occupied=await getDoc(doc(db(a),pathA));
  expect(occupied.data()).toEqual(oldBackup.data);
  expect(plan.some(x=>x.path===pathA&&sha(x.data)!==sha(occupied.data()))).toBe(true);
  // Clear only the isolated, disposable demo dataset; never a production target.
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>{
   for(const row of plan)await setDoc(doc(ctx.firestore(),row.path),row.data);
  });
  const [ca]=await listOwnCharacters(db(a),a),[cb]=await listOwnCharacters(db(b),b);
  expect(ca.originalJson).toBe(source.characters[0].originalJson);
  expect(cb.originalJson).toBe(source.characters[1].originalJson);
  expect([ca.revision,cb.revision]).toEqual([7,11]);
  await assertFails(getDoc(doc(db(a),"users/"+b+"/characters/sameNativeId")));
  await assertFails(getDoc(doc(db(g),pathA)));
  expect((await getDoc(doc(db(g),"profiles",g))).data()?.role).toBe("gm");
  expect((await listMembers(db(g),"old-campaign")).sort()).toEqual([a,b].sort());
  const shares=await listGmSharedSheets(db(g),"old-campaign");
  expect(shares.map(x=>[x.ownerUid,x.sheet.hp])).toEqual([[a,19]]);
  expect(await listMyShares(db(b),"old-campaign",b)).toHaveLength(0);
  await assertFails(getDoc(doc(db(b),"campaigns","old-campaign","members",a,"shares","sameNativeId")));
  // Local recovery rehearsal restores the previous destination fixture only.
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),oldBackup.path),oldBackup.data));
  expect((await getDoc(doc(db(a),pathA))).data()).toEqual(oldBackup.data);
  expect((await getDoc(doc(db(b),"users/"+b+"/characters/sameNativeId"))).exists()).toBe(false);
  expect(sha(source)).toBe(sourceDigest);
 });
});

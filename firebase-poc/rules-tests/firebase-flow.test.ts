import {beforeAll,afterAll,beforeEach,describe,expect,it} from "vitest";
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from "@firebase/rules-unit-testing";
import {collectionGroup,doc,getDoc,getDocs,query,setDoc,updateDoc,where} from "firebase/firestore";
import {readFileSync} from "node:fs";
import {
  addMember,createCampaign,getOrCreatePlayerProfile,
  listGmSharedSheets,listMembers,listMyShares,listOwnCampaigns,listOwnCharacters,
  readJoinedCampaign,refreshExistingShare,refreshOwnedShares,revokeShare,saveCharacter,shareCharacter,updateCampaignClosed,updateCampaignDeleted
} from "../src/firestore-service";

import {saveBoundCharacter} from "../src/creator-sync";
import {MAX_CHARACTER_BYTES,parseCharacter} from "../src/model";
import {validateCharacterJson} from "../../cloud-free/convex/lib/characterPayload";
const gmUid="gm_realflow_123456", playerUid="player_realflow_123456";
const attackerUid="attacker_realflow_123456";
const saveId="firebaseFlow2024";
const raw=JSON.stringify({
  v:10,ruleset:"2024",id:saveId,cls:"德魯伊",sp:"卓爾",
  subName:"星辰結社",bg:"隱士",level:4,meta:{name:"星辰冒險者",player:"測試玩家"},
  base:{wis:18,dex:14},play:{hp:21,hpMax:28},
  cantrips:["指引術"],prepared:["治療真言"],gear:{items:"旅行背包"}
});
let env:RulesTestEnvironment;
const f=(uid:string)=>env.authenticatedContext(uid).firestore();
beforeAll(async()=>{
 env=await initializeTestEnvironment({
  projectId:"demo-dnd5r-firebase-flow",
  firestore:{host:"127.0.0.1",port:8089,
    rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")}
 });
});
afterAll(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),"profiles",gmUid),{role:"gm",displayName:"GM",createdAt:1});
  await setDoc(doc(ctx.firestore(),"profiles",attackerUid),{role:"player",displayName:"陌生人",createdAt:1});
 });
});
describe("End-to-end client SDK against actual Firestore rules emulator",()=>{
 it("preserves legacy 512 KiB UTF-8 Save boundary; rejects one excess byte in client and rules",async()=>{
  const gm=f(gmUid),player=f(playerUid);
  const empty=JSON.stringify({...JSON.parse(raw),migrationFixture:""});
  const padding=MAX_CHARACTER_BYTES-Buffer.byteLength(empty,"utf8");
  const exact=JSON.stringify({...JSON.parse(raw),migrationFixture:"龍".repeat(Math.floor(padding/3))+"a".repeat(padding%3)});
  const over=exact.slice(0,-2)+"a"+exact.slice(-2);
  expect(Buffer.byteLength(exact,"utf8")).toBe(524288);
  expect(Buffer.byteLength(over,"utf8")).toBe(524289);
  expect(validateCharacterJson(exact).characterId).toBe(saveId);
  expect(parseCharacter(exact).sheet.id).toBe(saveId);
  expect(()=>parseCharacter(over)).toThrow();
  const saved=await saveBoundCharacter(player,playerUid,exact,null);
  expect((await listOwnCharacters(player,playerUid))[0].originalJson).toBe(exact);
  await assertFails(setDoc(doc(player,"users",playerUid,"characters",saveId),{...saved,revision:2,originalJson:over}));
  const cid=await createCampaign(gm,gmUid,"migration-size");
  await addMember(gm,cid,playerUid);
  await shareCharacter(player,cid,playerUid,saveId);
  expect((await listGmSharedSheets(gm,cid))[0].sheet.hp).toBe(21);
 });
 it("trash/restore via GM SDK retains real player files and memberships",async()=>{
   const gm=f(gmUid),player=f(playerUid),attacker=f(attackerUid);
   await getOrCreatePlayerProfile(player,playerUid,"玩家");
   const cid=await createCampaign(gm,gmUid,"可恢復的團務");
   await addMember(gm,cid,playerUid);
   await saveCharacter(player,playerUid,raw);
   await shareCharacter(player,cid,playerUid,saveId);
   await expect(updateCampaignDeleted(attacker,attackerUid,cid,true)).rejects.toThrow();
   await updateCampaignDeleted(gm,gmUid,cid,true);
   expect((await listOwnCampaigns(gm,gmUid)).find(c=>c.id===cid)?.deletedAt).toBeGreaterThan(0);
   await expect(readJoinedCampaign(player,cid,playerUid)).rejects.toThrow();
   expect((await listOwnCharacters(player,playerUid))[0].originalJson).toBe(raw);
   await updateCampaignDeleted(gm,gmUid,cid,false);
   expect((await listOwnCampaigns(gm,gmUid)).find(c=>c.id===cid)?.deletedAt).toBe(0);
   expect((await readJoinedCampaign(player,cid,playerUid)).id).toBe(cid);
   expect((await listGmSharedSheets(gm,cid))[0].sheet.name).toBe("星辰冒險者");
 });
 it("Google user identity substitute -> save -> explicit share -> GM sheet -> close/reopen -> preserve -> revoke",async()=>{
  const gm=f(gmUid),player=f(playerUid);
  const profile=await getOrCreatePlayerProfile(player,playerUid,"示範玩家");
  expect(profile.role).toBe("player");
  const created=await createCampaign(gm,gmUid,"星辰研究隊");
  expect((await listOwnCampaigns(gm,gmUid)).map(x=>x.id)).toContain(created);
  await addMember(gm,created,playerUid);
  expect(await listMembers(gm,created)).toEqual([playerUid]);
  const joined=await readJoinedCampaign(player,created,playerUid);
  expect(joined.closedAt).toBe(0);
  const save=await saveCharacter(player,playerUid,raw);
  expect(save.revision).toBe(1);
  expect(await listOwnCharacters(player,playerUid)).toHaveLength(1);
  await shareCharacter(player,created,playerUid,saveId);
  expect(await listMyShares(player,created,playerUid)).toHaveLength(1);
  let read=await listGmSharedSheets(gm,created);
  expect(read).toHaveLength(1);
  expect(read[0].sheet.name).toBe("星辰冒險者");
  expect(read[0].sheet.hp).toBe(21);
  await updateCampaignClosed(gm,gmUid,created,true);
  const closed=await listOwnCampaigns(gm,gmUid);
  expect(closed[0].closedAt).toBeGreaterThan(0);
  expect(await listMembers(gm,created)).toEqual([playerUid]);
  expect(await listMyShares(player,created,playerUid)).toHaveLength(1);
  expect((await listOwnCharacters(player,playerUid))[0].originalJson).toBe(raw);
  expect(await listGmSharedSheets(gm,created)).toHaveLength(1);
  await updateCampaignClosed(gm,gmUid,created,false);
  expect((await listOwnCampaigns(gm,gmUid))[0].closedAt).toBe(0);
  await revokeShare(player,created,playerUid,saveId);
  read=await listGmSharedSheets(gm,created);
  expect(read).toHaveLength(0);
  expect(await listOwnCharacters(player,playerUid)).toHaveLength(1);
 });
 it("creator CAS autosave refreshes only existing active shares across campaigns, preserving consent",async()=>{
  const gm=f(gmUid),player=f(playerUid),attacker=f(attackerUid);
  await getOrCreatePlayerProfile(player,playerUid,"玩家");
  const ids=await Promise.all(["active A","active B","closed","trashed","revoked","unshared"].map(name=>createCampaign(gm,gmUid,name)));
  for(const cid of ids)await addMember(gm,cid,playerUid);
  const initial=await saveBoundCharacter(player,playerUid,raw,null);
  for(const cid of ids.slice(0,5))await shareCharacter(player,cid,playerUid,saveId);
  await updateCampaignClosed(gm,gmUid,ids[2],true);
  await updateCampaignDeleted(gm,gmUid,ids[3],true);
  await revokeShare(player,ids[4],playerUid,saveId);
  const next=JSON.parse(raw);next.play.hp=13;
  await saveBoundCharacter(player,playerUid,JSON.stringify(next),initial.revision);
  const result=await refreshOwnedShares(player,playerUid,saveId);
  expect(result).toEqual({refreshed:2,skipped:4,failed:0});
  for(const cid of ids.slice(0,2))expect((await listGmSharedSheets(gm,cid))[0].sheet.hp).toBe(13);
  expect((await listGmSharedSheets(gm,ids[2]))[0].sheet.hp).toBe(21);
  await updateCampaignDeleted(gm,gmUid,ids[3],false);
  expect((await listGmSharedSheets(gm,ids[3]))[0].sheet.hp).toBe(21);
  expect(await listGmSharedSheets(gm,ids[4])).toHaveLength(0);
  expect(await listGmSharedSheets(gm,ids[5])).toHaveLength(0);
  expect((await listOwnCharacters(player,playerUid))[0].originalJson).toBe(JSON.stringify(next));
  // The new read permission is only own membership metadata; never another UID.
  expect((await getDocs(query(collectionGroup(player,"members"),where("uid","==",playerUid)))).size).toBe(6);
  await assertFails(getDocs(query(collectionGroup(attacker,"members"),where("uid","==",playerUid))));
  await assertFails(getDocs(collectionGroup(player,"members")));
  await assertFails(getDocs(query(collectionGroup(env.unauthenticatedContext().firestore(),"members"),where("uid","==",playerUid))));
  await expect(refreshOwnedShares(attacker,playerUid,saveId)).rejects.toThrow();
  await expect(refreshOwnedShares(player,playerUid,saveId,()=>false)).rejects.toThrow("ACCOUNT_CHANGED");
  await updateCampaignClosed(gm,gmUid,ids[2],false);
  const reopened=await refreshOwnedShares(player,playerUid,saveId);
  expect(reopened).toEqual({refreshed:4,skipped:2,failed:0});
  for(const cid of ids.slice(0,4))expect((await listGmSharedSheets(gm,cid))[0].sheet.hp).toBe(13);
 });
 it("re-upload refreshes an existing GM share but never resurrects revoked access",async()=>{
  const gm=f(gmUid),player=f(playerUid),attacker=f(attackerUid);
  await getOrCreatePlayerProfile(player,playerUid,"測試玩家");
  const cid=await createCampaign(gm,gmUid,"第二團");
  await addMember(gm,cid,playerUid);
  await saveCharacter(player,playerUid,raw);
  await shareCharacter(player,cid,playerUid,saveId);
  const next=JSON.parse(raw);next.play.hp=17;
  expect((await saveCharacter(player,playerUid,JSON.stringify(next))).revision).toBe(2);
  expect(await refreshExistingShare(player,cid,playerUid,saveId)).toBe(true);
  const snapshot=await listGmSharedSheets(gm,cid);
  expect(snapshot[0].sheet.hp).toBe(17);
  await revokeShare(player,cid,playerUid,saveId);
  expect(await refreshExistingShare(player,cid,playerUid,saveId)).toBe(false);
  expect(await listGmSharedSheets(gm,cid)).toHaveLength(0);
  await expect(updateCampaignClosed(attacker,attackerUid,cid,true)).rejects.toThrow();
  await assertFails(getDoc(doc(attacker,"campaigns",cid,"members",playerUid,"shares",saveId)));
 });
});

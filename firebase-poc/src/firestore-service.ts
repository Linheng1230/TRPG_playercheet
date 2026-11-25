import {
  addDoc,collection,collectionGroup,deleteDoc,doc,getDoc,getDocs,getDocsFromServer,onSnapshot,
  query,runTransaction,setDoc,where,type Firestore
} from "firebase/firestore";
import {
  campaignIsClosed,campaignIsDeleted,parseCharacter,viewSharedSave,type Campaign,
  type CampaignRef,type PlayerProfile,type SavedCharacter,
  type SharedCharacter
} from "./model";

const profiles=(db:Firestore,uid:string)=>doc(db,"profiles",uid);
const ownChar=(db:Firestore,uid:string,id:string)=>doc(db,"users",uid,"characters",id);
const campaign=(db:Firestore,id:string)=>doc(db,"campaigns",id);
const member=(db:Firestore,cid:string,uid:string)=>doc(db,"campaigns",cid,"members",uid);
const shareDoc=(db:Firestore,cid:string,uid:string,saveId:string)=>
  doc(db,"campaigns",cid,"members",uid,"shares",saveId);
const validUid=(uid:string)=>/^[A-Za-z0-9][A-Za-z0-9_-]{5,127}$/.test(uid);
const validSaveId=(id:string)=>/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(id);
export async function getOrCreatePlayerProfile(db:Firestore,uid:string,displayName:string):Promise<PlayerProfile>{
  const ref=profiles(db,uid);
  const existing=await getDoc(ref);
  if(existing.exists())return existing.data() as PlayerProfile;
  const profile:PlayerProfile={role:"player",displayName:displayName.slice(0,120),createdAt:Date.now()};
  try{await setDoc(ref,profile);}catch(error){
    // Another login tab may have created it; never overwrite a GM profile.
    const newer=await getDoc(ref);
    if(!newer.exists())throw error;
  }
  const result=await getDoc(ref);
  if(!result.exists())throw Error("個人資料初始化失敗。");
  return result.data() as PlayerProfile;
}
export async function listOwnCharacters(db:Firestore,uid:string):Promise<SavedCharacter[]>{
  const list=await getDocs(collection(db,"users",uid,"characters"));
  return list.docs.map(d=>d.data() as SavedCharacter);
}
export async function saveCharacter(db:Firestore,uid:string,raw:string):Promise<SavedCharacter>{
  const {sheet,v}=parseCharacter(raw);
  if(!validSaveId(sheet.id))throw Error("角色 ID 不符合格式");
  const ref=ownChar(db,uid,sheet.id);
  return runTransaction(db,async tx=>{
    const old=await tx.get(ref),revision=old.exists()?Number(old.data().revision)+1:1;
    const data:SavedCharacter={
      ownerUid:uid,saveId:sheet.id,originalJson:raw,revision,saveVersion:v,
      ruleset:sheet.ruleset,displayName:sheet.name,updatedAt:Date.now()
    };
    tx.set(ref,data);
    return data;
  });
}
export async function listOwnCampaigns(db:Firestore,uid:string):Promise<CampaignRef[]>{
  const result=await getDocs(query(collection(db,"campaigns"),where("ownerUid","==",uid)));
  return result.docs.map(d=>({id:d.id,...(d.data() as Campaign)}));
}
export async function createCampaign(db:Firestore,uid:string,name:string):Promise<string>{
  const trimmed=name.trim().slice(0,100);
  if(!trimmed)throw Error("請輸入戰役名稱");
  const data:Campaign={ownerUid:uid,name:trimmed,createdAt:Date.now(),closedAt:0,deletedAt:0};
  const ref=await addDoc(collection(db,"campaigns"),data);
  return ref.id;
}
export async function updateCampaignClosed(db:Firestore,uid:string,cid:string,close:boolean):Promise<void>{
  await runTransaction(db,async tx=>{
    const ref=campaign(db,cid),snap=await tx.get(ref);
    if(!snap.exists())throw Error("找不到戰役");
    const data=snap.data() as Campaign;
    if(data.ownerUid!==uid)throw Error("不是戰役擁有者");
    if(campaignIsDeleted(data))throw Error("已移至垃圾桶的團務必須先還原");
    if(campaignIsClosed(data)===close)return;
    tx.update(ref,{closedAt:close?Date.now():0});
  });
}
// Soft-delete: remove campaign from normal roster and block access, but retain
// memberships, shares and players' own character files. Only owner GM can restore.
export async function updateCampaignDeleted(db:Firestore,uid:string,cid:string,deleted:boolean):Promise<void>{
  await runTransaction(db,async tx=>{
    const ref=campaign(db,cid),snap=await tx.get(ref);
    if(!snap.exists())throw Error("找不到團務");
    const data=snap.data() as Campaign;
    if(data.ownerUid!==uid)throw Error("不是團務擁有者");
    if(campaignIsDeleted(data)===deleted)return;
    tx.update(ref,{deletedAt:deleted?Date.now():0});
  });
}
export async function addMember(db:Firestore,cid:string,memberUid:string):Promise<void>{
  if(!validUid(memberUid))throw Error("請提供有效的 Firebase 玩家 UID");
  const ref=member(db,cid,memberUid);
  if((await getDoc(ref)).exists())return;
  await setDoc(ref,{uid:memberUid,joinedAt:Date.now()});
}
export async function listMembers(db:Firestore,cid:string):Promise<string[]>{
  const snaps=await getDocs(collection(db,"campaigns",cid,"members"));
  return snaps.docs.map(x=>x.id);
}
export async function readJoinedCampaign(db:Firestore,cid:string,uid:string):Promise<CampaignRef>{
  const mem=await getDoc(member(db,cid,uid));
  if(!mem.exists())throw Error("尚未加入這個戰役");
  const snap=await getDoc(campaign(db,cid));
  if(!snap.exists())throw Error("找不到戰役");
  const result={id:cid,...(snap.data() as Campaign)};
  if(campaignIsDeleted(result))throw Error("此團務已移至垃圾桶");
  return result;
}
export async function shareCharacter(db:Firestore,cid:string,uid:string,saveId:string):Promise<void>{
  const charSnap=await getDoc(ownChar(db,uid,saveId));
  if(!charSnap.exists())throw Error("角色不存在，請先保存角色");
  const char=charSnap.data() as SavedCharacter;
  const shared:SharedCharacter={
    ownerUid:uid,saveId,originalJson:char.originalJson,revision:char.revision,
    saveVersion:char.saveVersion,ruleset:char.ruleset,
    displayName:char.displayName,sharedAt:Date.now()
  };
  await setDoc(shareDoc(db,cid,uid,saveId),shared);
}
// Refresh an already-consented share after its authoritative character save.
// Never create a new share implicitly: a previously revoked permission stays revoked.
export async function refreshExistingShare(db:Firestore,cid:string,uid:string,saveId:string):Promise<boolean>{
  const ref=shareDoc(db,cid,uid,saveId);
  // All authoritative reads belong to the SAME transaction. Revocation,
  // campaign closure, and a newer character revision cannot race this write.
  return runTransaction(db,async tx=>{
    // A trashed campaign is intentionally unreadable to its members. Only
    // denial on this exact campaign read means unavailable; a later share
    // or character write denial is a failure and must not be called synced.
    const camp=await tx.get(campaign(db,cid)).catch(error=>{
      if((error as {code?:string})?.code==="permission-denied")return null;
      throw error;
    });
    if(!camp||!camp.exists())return false;
    const data=camp.data() as Campaign;
    if(campaignIsClosed(data)||campaignIsDeleted(data))return false;
    const shared=await tx.get(ref);
    if(!shared.exists())return false;
    const previous=shared.data() as SharedCharacter;
    if(previous.ownerUid!==uid||previous.saveId!==saveId)throw Error("分享擁有權不一致");
    const current=await tx.get(ownChar(db,uid,saveId));
    if(!current.exists())throw Error("無法同步不存在的角色");
    const c=current.data() as SavedCharacter;
    if(c.ownerUid!==uid||c.saveId!==saveId||c.revision<previous.revision)throw Error("分享版本不一致");
    if(c.revision===previous.revision&&c.originalJson===previous.originalJson)return true;
    tx.update(ref,{
      originalJson:c.originalJson,revision:c.revision,saveVersion:c.saveVersion,
      ruleset:c.ruleset,displayName:c.displayName
    });
    return true;
  });
}

/** Discover existing memberships, not new permissions. Only exact, previously
 * consented shares are refreshed. Personal saves remain authoritative even
 * when a closed, revoked, unavailable, or disconnected share cannot update. */
export async function refreshOwnedShares(db:Firestore,uid:string,saveId:string,isCurrent:()=>boolean=()=>true){
  if(!validUid(uid)||!validSaveId(saveId))throw Error("分享識別不正確");
  if(!isCurrent())throw Error("ACCOUNT_CHANGED");
  const memberships=await getDocsFromServer(query(collectionGroup(db,"members"),where("uid","==",uid)));
  const result={refreshed:0,skipped:0,failed:0};
  for(const row of memberships.docs){
    if(!isCurrent())throw Error("ACCOUNT_CHANGED");
    const parts=row.ref.path.split("/");
    if(parts.length!==4||parts[0]!=="campaigns"||parts[2]!=="members"||parts[3]!==uid||row.data().uid!==uid){
      result.failed++;continue;
    }
    try{
      if(await refreshExistingShare(db,parts[1],uid,saveId))result.refreshed++;
      else result.skipped++;
    }catch{
      result.failed++;
    }
  }
  return result;
}
export async function revokeShare(db:Firestore,cid:string,uid:string,saveId:string):Promise<void>{
  await deleteDoc(shareDoc(db,cid,uid,saveId));
}
export async function listMyShares(db:Firestore,cid:string,uid:string):Promise<SharedCharacter[]>{
  const list=await getDocs(collection(db,"campaigns",cid,"members",uid,"shares"));
  return list.docs.map(x=>x.data() as SharedCharacter);
}
export async function listGmSharedSheets(db:Firestore,cid:string):Promise<{ownerUid:string;saveId:string;sheet:ReturnType<typeof viewSharedSave>}[]>{
  const uids=await listMembers(db,cid);
  const rows=await Promise.all(uids.map(async uid=>{
    const docs=await getDocs(collection(db,"campaigns",cid,"members",uid,"shares"));
    return docs.docs.map(docSnap=>{
      const v=docSnap.data() as SharedCharacter;
      return {ownerUid:uid,saveId:docSnap.id,sheet:viewSharedSave(v)};
    });
  }));
  return rows.flat();
}

// A read-only real-time subscription to the authoritative GM role.
// A demoted GM must lose their roster UI without a manual page refresh.
export function observePlayerProfile(
  db:Firestore,uid:string,
  onValue:(profile:PlayerProfile|null)=>void,
  onError:(error:Error)=>void
):()=>void{
  return onSnapshot(profiles(db,uid),
    snap=>onValue(snap.exists()?snap.data() as PlayerProfile:null),
    onError);
}

export type GmSharedSheetRow={
  ownerUid:string;saveId:string;sheet:ReturnType<typeof viewSharedSave>
};
// One member-list listener plus one share listener per joined player.
// Revoke/share changes replace rows, so the GM never keeps an old selected
// sheet after the corresponding share disappears from the current snapshot.
export function observeGmSharedSheets(
  db:Firestore,cid:string,
  onValue:(rows:GmSharedSheetRow[])=>void,
  onError:(error:Error)=>void
):()=>void{
  let cancelled=false;
  const watchers=new Map<string,()=>void>();
  const rowsByOwner=new Map<string,GmSharedSheetRow[]>();
  const publish=()=>{
    if(cancelled)return;
    onValue([...rowsByOwner.values()].flat());
  };
  const fail=(error:Error)=>{
    if(cancelled)return;
    rowsByOwner.clear();
    publish();
    onError(error);
  };
  const unsubMembers=onSnapshot(
    collection(db,"campaigns",cid,"members"),
    members=>{
      if(cancelled)return;
      const current=new Set(members.docs.map(d=>d.id));
      for(const [uid,stop] of watchers){
        if(!current.has(uid)){
          stop();watchers.delete(uid);rowsByOwner.delete(uid);
        }
      }
      for(const uid of current){
        if(watchers.has(uid))continue;
        rowsByOwner.set(uid,[]);
        const stop=onSnapshot(
          collection(db,"campaigns",cid,"members",uid,"shares"),
          snap=>{
            if(cancelled)return;
            try{
              const rows=snap.docs.map(share=>{
                const s=share.data() as SharedCharacter;
                if(s.ownerUid!==uid||s.saveId!==share.id)
                  throw Error("角色分享擁有權不一致");
                return {ownerUid:uid,saveId:share.id,sheet:viewSharedSave(s)};
              });
              rowsByOwner.set(uid,rows);
              publish();
            }catch(error){fail(error as Error);}
          },
          error=>fail(new Error("分享訂閱："+String(error.code||error.message)))
        );
        watchers.set(uid,stop);
      }
      publish();
    },
    error=>fail(new Error("團員訂閱："+String(error.code||error.message)))
  );
  return ()=>{
    cancelled=true;
    unsubMembers();
    for(const stop of watchers.values())stop();
    watchers.clear();rowsByOwner.clear();
  };
}

// Members must see campaign closure changes without a stale local copy.
export function observeJoinedCampaign(
  db:Firestore,cid:string,
  onValue:(campaign:CampaignRef)=>void,
  onError:(error:Error)=>void
):()=>void{
  return onSnapshot(campaign(db,cid),snap=>{
    if(!snap.exists()){
      onError(Error("加入的團務已不存在或已刪除"));
      return;
    }
    const result={id:cid,...snap.data() as Campaign};
    if(campaignIsDeleted(result)){
      onError(Error("團務已移至垃圾桶，分享暫停"));
      return;
    }
    onValue(result);
  },onError);
}

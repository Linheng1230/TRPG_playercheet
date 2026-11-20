import {
  addDoc,collection,deleteDoc,doc,getDoc,getDocs,onSnapshot,
  query,runTransaction,setDoc,where,type Firestore
} from "firebase/firestore";
import {
  campaignIsClosed,parseCharacter,viewSharedSave,type Campaign,
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
  const data:Campaign={ownerUid:uid,name:trimmed,createdAt:Date.now(),closedAt:0};
  const ref=await addDoc(collection(db,"campaigns"),data);
  return ref.id;
}
export async function updateCampaignClosed(db:Firestore,uid:string,cid:string,close:boolean):Promise<void>{
  await runTransaction(db,async tx=>{
    const ref=campaign(db,cid),snap=await tx.get(ref);
    if(!snap.exists())throw Error("找不到戰役");
    const data=snap.data() as Campaign;
    if(data.ownerUid!==uid)throw Error("不是戰役擁有者");
    if(campaignIsClosed(data)===close)return;
    tx.update(ref,{closedAt:close?Date.now():0});
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
  return {id:cid,...(snap.data() as Campaign)};
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
          fail
        );
        watchers.set(uid,stop);
      }
      publish();
    },
    fail
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
      onError(Error("加入的團務已不存在"));
      return;
    }
    onValue({id:cid,...snap.data() as Campaign});
  },onError);
}

import {validateCharacterJson} from "../convex/lib/characterPayload";
import {characterStorageKey,importCloudSaveToLocal,readLocalRaw,ROSTER_KEY,type RosterStorage} from "./local-roster";
import {LEGACY_CURRENT_CHARACTER_KEY} from "./vault-actions";

// Thin adapter to existing Convex owner-scoped upload/read APIs; no new server store.
export type CloudRecord={_id:string;ownerId:string;characterId:string;originalJson:string;revision:number};
export type CloudApi={
  list:()=>Promise<{_id:string;characterId:string;revision:number}[]>;
  read:(id:string)=>Promise<CloudRecord>;
  upload:(args:{originalJson:string;expectedRevision:number|null;expectedOwnerId:string})=>Promise<{id:string;revision:number}>;
};
type Baseline={ownerId:string;revision:number;digest:string};
const key=(id:string)=>"dnd5r:convex-sync:"+id;
function getBinding(storage:RosterStorage,id:string):{ownerId:string;baseline?:Baseline}|null{
  const raw=storage.getItem(key(id));
  if(raw===null)return null;
  const val=JSON.parse(raw);
  if(!val||typeof val.ownerId!=="string"||!val.ownerId)throw Error("LOCAL_BINDING_INVALID");
  if(val.baseline&&(val.baseline.ownerId!==val.ownerId||!Number.isInteger(val.baseline.revision)||val.baseline.revision<1||!(/^[0-9a-f]{64}$/).test(val.baseline.digest)))throw Error("LOCAL_BINDING_INVALID");
  return val;
}
export function boundOwner(storage:RosterStorage,id:string){return getBinding(storage,id)?.ownerId??null;}
export function canUseLocalCharacter(storage:RosterStorage,id:string,ownerId:string){
  try{const bound=boundOwner(storage,id);return !!ownerId&&(bound===null||bound===ownerId);}
  catch{return false;}
}
function assertOwner(storage:RosterStorage,id:string,ownerId:string){
  const old=boundOwner(storage,id);if(old!==null&&old!==ownerId)throw Error("LOCAL_ACCOUNT_MISMATCH");
}
function assertCurrent(isCurrent:()=>boolean){if(!isCurrent())throw Error("ACCOUNT_CHANGED");}
function comparable(raw:string){const x=JSON.parse(raw);delete x.ts;return JSON.stringify(x);}
export async function saveDigest(raw:string){
  validateCharacterJson(raw);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(comparable(raw)))),x=>x.toString(16).padStart(2,"0")).join("");
}
function checkRecord(row:CloudRecord,ownerId:string,id:string){
  if(row.ownerId!==ownerId||row.characterId!==id||validateCharacterJson(row.originalJson).characterId!==id||
    !Number.isInteger(row.revision)||row.revision<1)throw Error("CLOUD_IDENTITY_MISMATCH");
}
async function remember(storage:RosterStorage,ownerId:string,id:string,row:CloudRecord,isCurrent:()=>boolean){
  checkRecord(row,ownerId,id);
  const digest=await saveDigest(row.originalJson);
  assertCurrent(isCurrent);assertOwner(storage,id,ownerId);
  const old=getBinding(storage,id)?.baseline;
  if(old&&old.revision>row.revision)throw Error("CLOUD_STALE_READ");
  storage.setItem(key(id),JSON.stringify({ownerId,baseline:{ownerId,revision:row.revision,digest}}));
  return row;
}
/** One explicit opt-in, followed by CAS updates using acknowledged revisions. */
export async function syncNativeSave(storage:RosterStorage,api:CloudApi,ownerId:string,id:string,isCurrent:()=>boolean){
  assertCurrent(isCurrent);assertOwner(storage,id,ownerId);
  const raw=readLocalRaw(storage,id);
  const binding=getBinding(storage,id);
  if(!binding)storage.setItem(key(id),JSON.stringify({ownerId}));
  const baseline=binding?.baseline;
  const digest=await saveDigest(raw);
  assertCurrent(isCurrent);assertOwner(storage,id,ownerId);
  const rows=(await api.list()).filter(x=>x.characterId===id);
  assertCurrent(isCurrent);
  if(rows.length>1)throw Error("CLOUD_IDENTITY_MISMATCH");
  if(rows.length){
    const remote=await api.read(rows[0]._id);
    assertCurrent(isCurrent);checkRecord(remote,ownerId,id);
    if(remote.revision<rows[0].revision||(baseline&&remote.revision<baseline.revision))throw Error("CLOUD_STALE_READ");
    if(await saveDigest(remote.originalJson)===digest)return remember(storage,ownerId,id,remote,isCurrent);
    if(!baseline||baseline.revision!==remote.revision)throw Error("REVISION_CONFLICT");
  }else if(baseline)throw Error("REVISION_CONFLICT");
  assertCurrent(isCurrent);
  const saved=await api.upload({originalJson:raw,expectedRevision:baseline?.revision??null,expectedOwnerId:ownerId});
  assertCurrent(isCurrent);
  // Read back the server-owned row; do not treat an upload result as proof of bytes.
  const remote=await api.read(saved.id);
  if(remote.revision!==saved.revision||remote.originalJson!==raw)throw Error("CLOUD_READBACK_MISMATCH");
  return remember(storage,ownerId,id,remote,isCurrent);
}
/** Explicit fresh-device read or fast-forward of a proven clean local Save. */
export async function readNativeCloudSave(storage:RosterStorage,api:CloudApi,ownerId:string,recordId:string,isCurrent:()=>boolean){
  assertCurrent(isCurrent);
  const remote=await api.read(recordId);
  assertCurrent(isCurrent);
  const id=remote.characterId;checkRecord(remote,ownerId,id);assertOwner(storage,id,ownerId);
  const old=getBinding(storage,id)?.baseline;
  if(old&&old.revision>remote.revision)throw Error("CLOUD_STALE_READ");
  const raw=storage.getItem(characterStorageKey(id));
  const rkey=characterStorageKey(id);
  const before=storage.getItem(ROSTER_KEY);
  if(raw!==null&&raw!==remote.originalJson){
    const same=await saveDigest(raw)===await saveDigest(remote.originalJson);
    if(!same&&(!old||old.revision>=remote.revision||await saveDigest(raw)!==old.digest))throw Error("LOCAL_REVISION_CONFLICT");
    assertCurrent(isCurrent);assertOwner(storage,id,ownerId);
    const rows=JSON.parse(before??"[]");
    if(!Array.isArray(rows)||rows.filter(x=>x?.id===id).length!==1)throw Error("LOCAL_REVISION_CONFLICT");
    // Reuse the canonical roster adapter's safe projection (including escaping).
    const shadow=new Map<string,string>();
    const adapter:RosterStorage={getItem:k=>shadow.get(k)??null,setItem:(k,v)=>{shadow.set(k,v)},removeItem:k=>{shadow.delete(k)}};
    importCloudSaveToLocal(adapter,remote.originalJson);
    const replacement=JSON.parse(adapter.getItem(ROSTER_KEY)??"[]")[0];
    if(storage.getItem(rkey)!==raw||storage.getItem(ROSTER_KEY)!==before)throw Error("LOCAL_REVISION_CONFLICT");
    if(!getBinding(storage,id))storage.setItem(key(id),JSON.stringify({ownerId}));
    storage.setItem(rkey,remote.originalJson);
    try{storage.setItem(ROSTER_KEY,JSON.stringify(rows.map(x=>x?.id===id?replacement:x)));}
    catch(e){if(storage.getItem(rkey)===remote.originalJson)storage.setItem(rkey,raw);throw e;}
  }else{
    if(!getBinding(storage,id))storage.setItem(key(id),JSON.stringify({ownerId}));
    const result=importCloudSaveToLocal(storage,remote.originalJson);
    if(result.status==="conflict")throw Error("LOCAL_REVISION_CONFLICT");
  }
  assertCurrent(isCurrent);
  await remember(storage,ownerId,id,remote,isCurrent);
  assertCurrent(isCurrent);
  storage.setItem(LEGACY_CURRENT_CHARACTER_KEY,id);
  if(readLocalRaw(storage,id)!==remote.originalJson)throw Error("LOCAL_READBACK_FAILED");
  return remote;
}

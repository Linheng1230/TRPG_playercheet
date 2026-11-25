import {doc,runTransaction,type Firestore} from "firebase/firestore";
import {parseCharacter,type SavedCharacter} from "./model";
import {importCloudSaveToLocal,readLocalRaw,characterStorageKey,ROSTER_KEY,type RosterStorage} from "../../cloud-free/src/local-roster";
import {LEGACY_CURRENT_CHARACTER_KEY} from "../../cloud-free/src/vault-actions";

const ownerKey=(id:string)=>"dnd5r:firebase-owner:"+id;
const baselineKey=(id:string)=>"dnd5r:firebase-baseline:"+id;
type Baseline={uid:string;revision:number;digest:string};
export const localOwner=(storage:RosterStorage,id:string)=>storage.getItem(ownerKey(id));
export function assertLocalOwner(storage:RosterStorage,uid:string,id:string){
  const owner=localOwner(storage,id);
  if(owner!==null&&owner!==uid)throw Error("LOCAL_ACCOUNT_MISMATCH");
}
export function bindLocalOwner(storage:RosterStorage,uid:string,id:string){
  assertLocalOwner(storage,uid,id);
  storage.setItem(ownerKey(id),uid);
  if(localOwner(storage,id)!==uid)throw Error("LOCAL_BINDING_FAILED");
}
export function readBaseline(storage:RosterStorage,uid:string,id:string):Baseline|null{
  try{
    const b=JSON.parse(storage.getItem(baselineKey(id))??"null") as Baseline|null;
    return b&&b.uid===uid&&Number.isInteger(b.revision)&&b.revision>0&&/^[0-9a-f]{64}$/.test(b.digest)?b:null;
  }catch{return null;}
}
// Native creator refreshes ts even on a no-op save or beforeunload. Ignore only
// that bookkeeping field for equality; all game data and unknown fields remain significant.
function comparable(raw:string){const value=JSON.parse(raw);delete value.ts;return JSON.stringify(value);}
function sameContent(a:string,b:string){return a===b||comparable(a)===comparable(b);}
async function digest(raw:string){
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(comparable(raw)))),b=>b.toString(16).padStart(2,"0")).join("");
}
/** Only remember an acknowledged remote revision; never persist credentials or another full Save. */
export async function rememberCloudBaseline(storage:RosterStorage,uid:string,saved:SavedCharacter){
  if(saved.ownerUid!==uid||parseCharacter(saved.originalJson).sheet.id!==saved.saveId)throw Error("CLOUD_IDENTITY_MISMATCH");
  const hash=await digest(saved.originalJson);
  if(localOwner(storage,saved.saveId)!==uid)throw Error("LOCAL_ACCOUNT_MISMATCH");
  const before=readBaseline(storage,uid,saved.saveId);
  if(before&&before.revision>saved.revision)return;
  const b:Baseline={uid,revision:saved.revision,digest:hash};
  storage.setItem(baselineKey(saved.saveId),JSON.stringify(b));
}

/** Authoritative read: use the transaction's server BatchGet, not a watch's
 * potentially delayed snapshot. No writes are issued by this transaction. */
export async function readBoundCharacter(db:Firestore,uid:string,id:string,minRevision=0):Promise<SavedCharacter>{
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(id))throw Error("INVALID_CHARACTER_ID");
  return runTransaction(db,async tx=>{
    const snap=await tx.get(doc(db,"users",uid,"characters",id));
    if(!snap.exists())throw Error("CLOUD_CHARACTER_NOT_FOUND");
    const saved=snap.data() as SavedCharacter;
    if(saved.ownerUid!==uid||saved.saveId!==id||parseCharacter(saved.originalJson).sheet.id!==id||
       !Number.isInteger(saved.revision)||saved.revision<1)throw Error("CLOUD_IDENTITY_MISMATCH");
    if(saved.revision<minRevision)throw Error("CLOUD_STALE_READ");
    return saved;
  });
}

/** Reuse the native Save document; never overwrite a newer remote revision. */
export async function saveBoundCharacter(db:Firestore,uid:string,raw:string,expectedRevision:number|null):Promise<SavedCharacter>{
  const {sheet,v}=parseCharacter(raw);
  if(!/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(sheet.id))throw Error("INVALID_CHARACTER_ID");
  const ref=doc(db,"users",uid,"characters",sheet.id);
  return runTransaction(db,async tx=>{
    const snap=await tx.get(ref);
    const old=snap.exists()?snap.data() as SavedCharacter:null;
    if(old&&(old.ownerUid!==uid||old.saveId!==sheet.id||!Number.isInteger(old.revision)||old.revision<1))
      throw Error("CLOUD_IDENTITY_MISMATCH");
    if(old&&sameContent(old.originalJson,raw))return old; // No-op/retry remains idempotent.
    if((old?.revision??null)!==expectedRevision)throw Error("CLOUD_REVISION_CONFLICT");
    const data:SavedCharacter={ownerUid:uid,saveId:sheet.id,originalJson:raw,
      revision:(old?.revision??0)+1,saveVersion:v,ruleset:sheet.ruleset,
      displayName:sheet.name,updatedAt:Date.now()};
    tx.set(ref,data);
    return data;
  });
}

/** Explicit opt-in of ONE local native Save. Never automatically merge a whole browser roster. */
export async function bindAndSaveLocal(storage:RosterStorage,db:Firestore,uid:string,id:string,isCurrent:()=>boolean){
  if(!isCurrent())throw Error("ACCOUNT_CHANGED");
  assertLocalOwner(storage,uid,id);
  const raw=readLocalRaw(storage,id);
  const expected=readBaseline(storage,uid,id)?.revision??null;
  // Reserve the local ID before the async operation, preventing cross-account races.
  bindLocalOwner(storage,uid,id);
  const saved=await saveBoundCharacter(db,uid,raw,expected);
  if(!isCurrent())throw Error("ACCOUNT_CHANGED");
  await rememberCloudBaseline(storage,uid,saved);
  if(!isCurrent())throw Error("ACCOUNT_CHANGED");
  return saved;
}

/** Replace only a known clean local baseline, preserving all unrelated roster rows.
 * Generate metadata with the existing safe native roster adapter, not a new schema.
 */
function replaceCleanLocal(storage:RosterStorage,id:string,oldRaw:string,newRaw:string){
  const key=characterStorageKey(id);
  const beforeRoster=storage.getItem(ROSTER_KEY);
  const rows:unknown=JSON.parse(beforeRoster??"[]");
  if(!Array.isArray(rows)||rows.filter(x=>x?.id===id).length!==1)throw Error("LOCAL_REVISION_CONFLICT");
  const map=new Map<string,string>();
  const shadow:RosterStorage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v)},removeItem:k=>{map.delete(k)}};
  const imported=importCloudSaveToLocal(shadow,newRaw);
  if(imported.status!=="created"||imported.id!==id)throw Error("LOCAL_READBACK_FAILED");
  const replacement=JSON.parse(shadow.getItem(ROSTER_KEY)??"[]")[0];
  const nextRoster=JSON.stringify(rows.map(x=>x?.id===id?replacement:x));
  if(storage.getItem(key)!==oldRaw||storage.getItem(ROSTER_KEY)!==beforeRoster)
    throw Error("LOCAL_REVISION_CONFLICT");
  storage.setItem(key,newRaw);
  try{storage.setItem(ROSTER_KEY,nextRoster);}
  catch(error){if(storage.getItem(key)===newRaw)storage.setItem(key,oldRaw);throw error;}
}

/** Fresh-device readback; fast-forward a proven clean local baseline, never unsynced edits. */
export async function openOwnedCloudCharacter(storage:RosterStorage,uid:string,saved:SavedCharacter,isCurrent:()=>boolean=()=>true){
  if(!isCurrent())throw Error("ACCOUNT_CHANGED");
  if(saved.ownerUid!==uid||parseCharacter(saved.originalJson).sheet.id!==saved.saveId)
    throw Error("CLOUD_IDENTITY_MISMATCH");
  const id=saved.saveId,key=characterStorageKey(id);
  assertLocalOwner(storage,uid,id);
  if((readBaseline(storage,uid,id)?.revision??0)>saved.revision)throw Error("CLOUD_STALE_READ");
  const existing=storage.getItem(key);
  if(existing!==null&&existing!==saved.originalJson){
    const baseline=readBaseline(storage,uid,id);
    if(!sameContent(existing,saved.originalJson)&&(localOwner(storage,id)!==uid||!baseline||baseline.revision>=saved.revision||
       await digest(existing)!==baseline.digest))throw Error("LOCAL_REVISION_CONFLICT");
    if(!isCurrent())throw Error("ACCOUNT_CHANGED");
    assertLocalOwner(storage,uid,id);
    replaceCleanLocal(storage,id,existing,saved.originalJson);
  }else{
    const result=importCloudSaveToLocal(storage,saved.originalJson);
    if(result.status==="conflict")throw Error("LOCAL_REVISION_CONFLICT");
  }
  bindLocalOwner(storage,uid,id);
  await rememberCloudBaseline(storage,uid,saved);
  if(!isCurrent())throw Error("ACCOUNT_CHANGED");
  storage.setItem(LEGACY_CURRENT_CHARACTER_KEY,id);
  if(readLocalRaw(storage,id)!==saved.originalJson)throw Error("LOCAL_READBACK_FAILED");
  return id;
}

export function syncError(error:unknown):string{
  const m=error instanceof Error?error.message:String(error);
  if(m.includes("LOCAL_ACCOUNT_MISMATCH"))return "此本機角色已綁定其他 Google 帳號，不會上傳。";
  if(m.includes("CLOUD_REVISION_CONFLICT")||m.includes("LOCAL_REVISION_CONFLICT"))
    return "本機與雲端版本不同，已停止同步並保留兩份資料。請先備份，再手動處理版本。";
  if(m.includes("CLOUD_STALE_READ"))return "雲端版本尚未確認，已保留本機資料。請重新讀回角色。";
  if(m.includes("ACCOUNT_CHANGED"))return "帳號已切換，已停止同步。";
  return "雲端同步未完成；本機存檔仍保留。請確認網路並重試。";
}

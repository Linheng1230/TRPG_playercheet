import {useEffect,useRef,useState} from "react";
import {doc,getDocFromServer,type Firestore} from "firebase/firestore";
import type {Auth} from "firebase/auth";
import {readLocalCharacters,readLocalRaw,characterStorageKey,ROSTER_KEY,type LocalCharacter} from "../../cloud-free/src/local-roster";
import type {SavedCharacter} from "./model";
import {assertLocalOwner,bindAndSaveLocal,localOwner,openOwnedCloudCharacter,readBaseline,rememberCloudBaseline,saveBoundCharacter,syncError} from "./creator-sync";

type Props={auth:Auth;db:Firestore;uid:string;cloud:SavedCharacter[];onSaved:(saved:SavedCharacter)=>void;openNative?:(id:string)=>void};
type Binding={id:string;revision:number;raw:string};
const ACTIVE_SESSION_KEY="dnd5r:firebase-active-sync";
export function CreatorSyncPanel({auth,db,uid,cloud,onSaved,openNative}:Props){
  const [local,setLocal]=useState<LocalCharacter[]>([]);
  const [selected,setSelected]=useState("");
  const [binding,setBinding]=useState<Binding|null>(null);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const active=useRef<Binding|null>(null),mounted=useRef(false),running=useRef(false),operation=useRef(false);
  const current=()=>mounted.current&&auth.currentUser?.uid===uid;
  const clearSession=()=>{try{
    const saved=JSON.parse(sessionStorage.getItem(ACTIVE_SESSION_KEY)??"null");
    if(saved?.uid===uid)sessionStorage.removeItem(ACTIVE_SESSION_KEY);
  }catch{/* Session storage is optional; do not lose a native Save. */}};
  const setActive=(b:Binding|null)=>{
    active.current=b;setBinding(b);
    try{if(b)sessionStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify({uid,id:b.id}));else clearSession();}catch{/* current-tab synchronization can still work */}
  };
  const refreshLocal=()=>{if(current())setLocal(readLocalCharacters(localStorage).filter(c=>{
    const owner=localOwner(localStorage,c.id);
    return owner===null||owner===uid;
  }));};
  const savedCallback=useRef(onSaved);
  savedCallback.current=onSaved;
  useEffect(()=>{
    mounted.current=true;
    refreshLocal();
    // Reload can resume only an explicit opt-in from the same authenticated tab.
    try{
      const session=JSON.parse(sessionStorage.getItem(ACTIVE_SESSION_KEY)??"null");
      const id=typeof session?.id==="string"?session.id:"";
      const baseline=id&&session.uid===uid?readBaseline(localStorage,uid,id):null;
      if(baseline&&localOwner(localStorage,id)===uid&&current()){
        readLocalRaw(localStorage,id);
        setActive({id,revision:baseline.revision,raw:""});
        setNotice("已恢復此分頁的 Google 同步設定，正在確認雲端版本。");
      }else if(session)sessionStorage.removeItem(ACTIVE_SESSION_KEY);
    }catch{clearSession();}
    const refresh=()=>refreshLocal();
    const onStorage=(e:StorageEvent)=>{if(e.key===ROSTER_KEY||e.key===null)refreshLocal();};
    window.addEventListener("focus",refresh);
    window.addEventListener("storage",onStorage);
    return()=>{mounted.current=false;active.current=null;if(auth.currentUser?.uid!==uid)clearSession();window.removeEventListener("focus",refresh);window.removeEventListener("storage",onStorage);};
  },[uid]);
  useEffect(()=>{
    const tick=async()=>{
      const b=active.current;
      if(!b||running.current||operation.current||!current())return;
      running.current=true;
      try{
        assertLocalOwner(localStorage,uid,b.id);
        if(localOwner(localStorage,b.id)!==uid)throw Error("LOCAL_ACCOUNT_MISMATCH");
        const candidate=localStorage.getItem(characterStorageKey(b.id));
        if(candidate===b.raw)return;
        const raw=readLocalRaw(localStorage,b.id);
        const saved=await saveBoundCharacter(db,uid,raw,b.revision);
        if(!current()||active.current!==b)return;
        await rememberCloudBaseline(localStorage,uid,saved);
        if(!current()||active.current!==b)return;
        setActive({id:b.id,revision:saved.revision,raw});
        savedCallback.current(saved);
        if(saved.revision>b.revision)setNotice("已自動同步至 Google 雲端 · 修訂 "+saved.revision);
      }catch(e){
        if(!current()||active.current!==b)return;
        setActive(null);setNotice(syncError(e));
      }finally{running.current=false;}
    };
    const onStorage=(e:StorageEvent)=>{if(e.key===characterStorageKey(active.current?.id??""))void tick();};
    window.addEventListener("storage",onStorage);
    const timer=window.setInterval(()=>void tick(),1200);
    return()=>{clearInterval(timer);window.removeEventListener("storage",onStorage);};
  },[uid,db,auth]);
  const bind=async()=>{
    if(!current()||!selected||running.current||operation.current)return;
    operation.current=true;setBusy(true);setActive(null);
    try{
      const saved=await bindAndSaveLocal(localStorage,db,uid,selected,current);
      if(!current())return;
      setActive({id:saved.saveId,revision:saved.revision,raw:saved.originalJson});
      savedCallback.current(saved);setNotice("角色已綁定目前 Google 帳號，已啟用自動同步。");
    }catch(e){if(current())setNotice(syncError(e));}
    finally{operation.current=false;if(current()){setBusy(false);refreshLocal();}}
  };
  const open=async(id:string)=>{
    if(!current()||running.current||operation.current)return;
    operation.current=true;setBusy(true);setActive(null);
    try{
      const snapshot=await getDocFromServer(doc(db,"users",uid,"characters",id));
      if(!current())return;
      if(!snapshot.exists())throw Error("CLOUD_CHARACTER_NOT_FOUND");
      const saved=snapshot.data() as SavedCharacter;
      if(saved.saveId!==id)throw Error("CLOUD_IDENTITY_MISMATCH");
      await openOwnedCloudCharacter(localStorage,uid,saved,current);
      if(!current())return;
      if(openNative)openNative(id);
      setActive({id,revision:saved.revision,raw:saved.originalJson});
      savedCallback.current(saved);
      setNotice("已從 Google 雲端讀回角色，已啟用自動同步。");
    }catch(e){if(current())setNotice(syncError(e));}
    finally{operation.current=false;if(current()){setBusy(false);refreshLocal();}}
  };
  // The existing creator writes native same-origin Save JSON. Keep this tab open
  // while editing the character in the creator tab; no changes to the shared entry file.
  const creatorUrl=new URL(import.meta.env.VITE_CREATOR_URL||"../index.html",location.href);
  const canOpen=creatorUrl.origin===location.origin&&creatorUrl.pathname!==location.pathname;
  return <section className="fb-panel" aria-label="Google 角色同步">
    <h2>Google 角色同步（測試版）</h2>
    <p>{openNative?"只同步你主動綁定的角色，創角與跑團修改會自動儲存。登出或關閉此分頁會停止同步。":"只同步你主動綁定的單一角色。請保留此分頁開啟，再於同網域創角器編輯；離開或登出會停止自動同步。"}</p>
    <div className="fb-inline">
      <select aria-label="選擇本機角色" value={selected} onFocus={refreshLocal} onChange={e=>setSelected(e.target.value)}>
        <option value="">選擇本機角色</option>
        {local.map(c=><option key={c.id} value={c.id}>{c.name} · {c.ruleset}</option>)}
      </select>
      <button type="button" disabled={!selected||busy||!!binding} onClick={()=>void bind()}>綁定 Google 並同步</button>
    </div>
    {cloud.filter(c=>c.ownerUid===uid).map(c=><div className="fb-inline" key={c.saveId}>
      <span>{c.displayName} · 修訂 {c.revision}</span>
      <button type="button" disabled={busy||!!binding} onClick={()=>void open(c.saveId)}>從雲端讀回 {c.displayName}</button>
    </div>)}
    {binding&&<div className="fb-inline">
      <strong>自動同步中 · 修訂 {binding.revision}</strong>
      {!openNative&&canOpen&&<a href={creatorUrl.href} target="_blank" rel="noopener">開啟創角器（新分頁）</a>}
      <button type="button" onClick={()=>{setActive(null);setNotice("已停止自動同步，本機及雲端資料均保留。");}}>停止同步</button>
    </div>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}

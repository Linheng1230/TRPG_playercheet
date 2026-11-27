import {useEffect,useRef,useState} from "react";
import {useConvex,useConvexAuth,useQuery} from "convex/react";
import {anyApi} from "convex/server";
import {boundOwner,readNativeCloudSave,syncNativeSave,type CloudApi,type CloudRecord} from "./creator-cloud-sync";
import {characterStorageKey,readLocalCharacters,type LocalCharacter} from "./local-roster";
import {LEGACY_CURRENT_CHARACTER_KEY} from "./vault-actions";

type Meta={_id:string;characterId:string;ownerId:string;revision:number;displayName?:string};
type Active={id:string;revision:number;raw:string};
const sessionKey="dnd5r:convex-sync-session";
export function clearSyncSession(){try{sessionStorage.removeItem(sessionKey);}catch{/* No persistent resume. */}}
export function CreatorCloudSyncEntry({rows,openNative,prepareNative}:{rows:Meta[];openNative?:(id:string)=>void;prepareNative?:()=>void}){
  const auth=useConvexAuth();
  const id=useQuery(anyApi.users.myIdentity,auth.isAuthenticated?{}:"skip") as string|undefined;
  const owner=auth.isAuthenticated?id:undefined;
  const current=useRef(owner);
  current.current=owner;
  useEffect(()=>{if(!auth.isLoading&&!auth.isAuthenticated)clearSyncSession();},[auth.isLoading,auth.isAuthenticated]);
  return owner?<CreatorCloudSyncPanel key={owner} owner={owner} rows={rows.filter(r=>r.ownerId===owner)} isOwner={()=>current.current===owner} openNative={openNative} prepareNative={prepareNative}/>:null;
}
function CreatorCloudSyncPanel({owner,rows,isOwner,openNative,prepareNative}:{owner:string;rows:Meta[];isOwner:()=>boolean;openNative?:(id:string)=>void;prepareNative?:()=>void}){
  const client=useConvex();
  const [local,setLocal]=useState<LocalCharacter[]>([]);
  const [selected,setSelected]=useState("");
  const [active,setActive]=useState<Active|null>(null);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  const live=useRef(false),run=useRef(false),binding=useRef<Active|null>(null);
  const current=()=>live.current&&isOwner();
  const api:CloudApi={
    list:async()=>await client.query(anyApi.characters.listMine,{}) as Meta[],
    read:async id=>await client.query(anyApi.characters.getMineForDownload,{id}) as CloudRecord,
    upload:async args=>await client.mutation(anyApi.characters.upload,args) as {id:string;revision:number}
  };
  const refresh=()=>{if(current())setLocal(readLocalCharacters(localStorage).filter(c=>{
    try{const o=boundOwner(localStorage,c.id);return o===null||o===owner;}catch{return false;}
  }));};
  const setBinding=(b:Active|null)=>{
    binding.current=b;setActive(b);
    try{if(b)sessionStorage.setItem(sessionKey,JSON.stringify({owner,id:b.id}));else sessionStorage.removeItem(sessionKey);}catch{/* Keep current-tab state only. */}
  };
  const failure=(e:unknown)=>{
    if(!current())return;
    setBinding(null);
    const m=String(e);
    setNotice(m.includes("CONFLICT")?"本機或雲端已有其他版本，已停止同步並保留資料。":
      m.includes("ACCOUNT")?"帳號或角色歸屬不一致，已停止同步。":"同步尚未確認，本機角色仍保留。");
  };
  const activate=async(id:string,remote=false,resuming=false)=>{
    if(run.current||!current())return;
    run.current=true;setBusy(true);setBinding(null);
    try{
      if(!resuming)prepareNative?.();
      const result=remote?await readNativeCloudSave(localStorage,api,owner,id,current):
        await syncNativeSave(localStorage,api,owner,id,current);
      if(!current())return;
      if(!resuming){
        localStorage.setItem(LEGACY_CURRENT_CHARACTER_KEY,result.characterId);
        if(openNative)openNative(result.characterId);
      }
      setBinding({id:result.characterId,revision:result.revision,raw:result.originalJson});
      setNotice("已確認雲端修訂 "+result.revision+"，自動同步已開啟。");
    }catch(e){failure(e);}
    finally{run.current=false;if(current()){setBusy(false);refresh();}}
  };
  useEffect(()=>{
    live.current=true;refresh();
    const tick=async()=>{
      const b=binding.current;
      if(!b||run.current||!current())return;
      if(openNative&&localStorage.getItem(LEGACY_CURRENT_CHARACTER_KEY)!==b.id){
        setBinding(null);setNotice("已切換本機角色，請明確選擇要同步的新角色。");return;
      }
      const raw=localStorage.getItem(characterStorageKey(b.id));
      if(raw===b.raw)return;
      run.current=true;
      try{
        const result=await syncNativeSave(localStorage,api,owner,b.id,current);
        if(!current()||binding.current!==b)return;
        setBinding({id:b.id,revision:result.revision,raw:raw??result.originalJson});
        if(result.revision!==b.revision)setNotice("已確認雲端修訂 "+result.revision+"。");
      }catch(e){if(binding.current===b)failure(e);}
      finally{run.current=false;}
    };
    const storage=()=>{refresh();void tick();};
    window.addEventListener("focus",refresh);window.addEventListener("storage",storage);
    const timer=window.setInterval(()=>void tick(),1200);
    // A reload may resume only the explicitly bound owner and role in this tab.
    try{
      const prior=JSON.parse(sessionStorage.getItem(sessionKey)??"null");
      if(prior?.owner===owner&&typeof prior.id==="string"&&boundOwner(localStorage,prior.id)===owner&&(!openNative||localStorage.getItem(LEGACY_CURRENT_CHARACTER_KEY)===prior.id))void activate(prior.id,false,true);
      else sessionStorage.removeItem(sessionKey);
    }catch{sessionStorage.removeItem(sessionKey);}
    return()=>{live.current=false;binding.current=null;clearInterval(timer);window.removeEventListener("focus",refresh);window.removeEventListener("storage",storage);};
  },[owner]);
  const newer=active?Math.max(active.revision,...rows.filter(r=>r.characterId===active.id).map(r=>r.revision)):0;
  return <section className="panel" aria-label="角色自動雲端同步">
    <h2>角色自動雲端同步（隔離候選）</h2>
    <p>{openNative?"只同步本頁主動選擇的角色；切換角色或登出會停止同步。":"只同步主動選擇的角色。保持此角色庫分頁開啟，在另一分頁使用原創角器；登出或關閉本分頁就停止同步。"}</p>
    <select aria-label="選擇要綁定的本機角色" value={selected} onFocus={refresh} onChange={e=>setSelected(e.target.value)}>
      <option value="">選擇角色</option>{local.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
    <button type="button" disabled={busy||!!active||!selected} onClick={()=>void activate(selected)}>綁定及啟用同步</button>
    {rows.map(r=><div key={r._id}><span>{r.displayName||"雲端角色"} · 修訂 {r.revision}</span>
      <button type="button" disabled={busy||!!active} onClick={()=>void activate(r._id,true)}>讀回並同步</button></div>)}
    {active&&<div><strong>自動同步中 · 修訂 {active.revision}</strong>
      {newer>active.revision&&<p role="alert">已有較新的雲端修訂 {newer}，請先停止同步再讀回；不會自動覆寫本機修改。</p>}
      {!openNative&&<a href="../index.html?view=sheet" target="_blank" rel="noopener">開啟創角器（新分頁）</a>}
      <button type="button" onClick={()=>{setBinding(null);setNotice("已停止後續自動同步；已送出的儲存請求可能仍會完成。");}}>停止同步</button>
    </div>}
    {notice&&<p role="status">{notice}</p>}
  </section>;
}

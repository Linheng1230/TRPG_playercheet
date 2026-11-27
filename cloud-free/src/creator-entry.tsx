import React,{useEffect,useRef,useState} from "react";
import {createRoot} from "react-dom/client";
import {useConvexAuth,useQuery} from "convex/react";
import {ConvexAuthProvider,useAuthActions} from "@convex-dev/auth/react";
import {anyApi} from "convex/server";
import {client,syncEnabled} from "./cloud-client";
import {AuthPanel} from "./shared-auth-panel";
import {SiteAccountLinks} from "./site-account-links";
import {CreatorCloudSyncEntry,clearSyncSession} from "./creator-cloud-sync-panel";
import "./creator-entry.css";
type Meta={_id:string;characterId:string;ownerId:string;revision:number;displayName?:string};
function prepareNative(){
  const w=window as Window&{serialize?:()=>{cls?:unknown};saveCurrent?:(silent:boolean)=>boolean};
  if(typeof w.serialize!=="function"||typeof w.saveCurrent!=="function")throw Error("NATIVE_CREATOR_NOT_READY");
  // Flush the existing creator's debounced in-memory edits before a readback.
  if(w.serialize()?.cls&&w.saveCurrent(true)!==true)throw Error("LOCAL_SAVE_FAILED");
}
function openNative(id:string){
  const load=(window as Window&{loadChar?:(id:string)=>void}).loadChar;
  if(typeof load!=="function")throw Error("NATIVE_CREATOR_NOT_READY");
  load(id);
}
function SiteConnected({native}:{native:HTMLElement|null}){
  const auth=useConvexAuth();
  const {signOut}=useAuthActions();
  const rows=useQuery(anyApi.characters.listMine,native&&auth.isAuthenticated?{}:"skip") as Meta[]|undefined;
  const dialog=useRef<HTMLDialogElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const syncDialog=useRef<HTMLDialogElement>(null);
  const syncTrigger=useRef<HTMLButtonElement>(null);
  const [syncStatus,setSyncStatus]=useState<"idle"|"active"|"attention">("idle");
  const [syncOpenVersion,setSyncOpenVersion]=useState(0);
  useEffect(()=>{if(!auth.isLoading&&!auth.isAuthenticated)clearSyncSession();},[auth.isLoading,auth.isAuthenticated]);
  useEffect(()=>{if(auth.isAuthenticated&&dialog.current?.open)dialog.current.close();},[auth.isAuthenticated]);
  const redirect=()=>{const u=new URL(location.href);u.hash="";u.searchParams.delete("code");u.searchParams.delete("state");return u.href;};
  const logout=()=>{clearSyncSession();void signOut();dialog.current?.close();};
  const openSync=()=>{
    if(auth.isAuthenticated){
      setSyncOpenVersion(v=>v+1);
      syncDialog.current?.showModal();
    }
    else dialog.current?.showModal();
  };
  return <>
    {native&&<>
      <button ref={syncTrigger} type="button" className="site-cloud-sync-trigger" data-sync-status={auth.isAuthenticated?syncStatus:"idle"} disabled={auth.isLoading} onClick={openSync}>
        雲端同步{auth.isAuthenticated&&syncStatus!=="idle"&&<span className="site-sync-indicator" aria-label={syncStatus==="active"?"同步中":"需確認"}/>}
      </button>
      <dialog ref={syncDialog} className="site-account-dialog site-cloud-sync-dialog" aria-label="雲端角色同步" onClose={()=>syncTrigger.current?.focus()}>
        <div className="site-account-heading"><strong>雲端角色同步</strong><button type="button" aria-label="關閉同步視窗" onClick={()=>syncDialog.current?.close()}>×</button></div>
        {auth.isAuthenticated&&<CreatorCloudSyncEntry rows={rows??[]} openNative={openNative} prepareNative={prepareNative} onSyncStatus={setSyncStatus} refreshVersion={syncOpenVersion}/>}
      </dialog>
    </>}
    <button ref={trigger} className="site-account-trigger" type="button" disabled={auth.isLoading} onClick={()=>dialog.current?.showModal()}>{auth.isLoading?"確認帳號…":auth.isAuthenticated?"我的帳號":"登入／註冊"}</button>
    <dialog ref={dialog} className="site-account-dialog" aria-label="冒險者帳號" onClose={()=>trigger.current?.focus()}>
      <div className="site-account-heading"><strong>冒險者帳號</strong><button type="button" aria-label="關閉帳號視窗" onClick={()=>dialog.current?.close()}>×</button></div>
      {auth.isAuthenticated?<><p role="status">已登入 · 可使用雲端角色庫</p><SiteAccountLinks/><button type="button" onClick={logout}>登出</button></>:<><AuthPanel redirectTo={redirect}/><p>不登入也可以使用創角、百科與跑團工具。</p><SiteAccountLinks/></>}
    </dialog>
  </>;
}
const header=document.getElementById("site-account-root");
const native=document.getElementById("convex-creator-sync-root");
if((header||native)&&syncEnabled&&client){
  const mount=header||document.createElement("div");
  if(!header&&native){native.before(mount);mount.id="site-account-root";}
  // The legacy body mount is only a capability marker; never consume layout.
  if(native)native.hidden=true;
  createRoot(mount).render(<React.StrictMode><ConvexAuthProvider client={client} api={anyApi.auth as any}><SiteConnected native={native}/></ConvexAuthProvider></React.StrictMode>);
}

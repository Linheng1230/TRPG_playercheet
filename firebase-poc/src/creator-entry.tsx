import {useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {collection,onSnapshot} from "firebase/firestore";
import type {User} from "firebase/auth";
import {configured,getFirebaseServices,loginWithGoogle,logout,watchGoogleUser} from "./firebase-client";
import {CreatorSyncPanel} from "./creator-sync-panel";
import type {SavedCharacter} from "./model";
import "./creator-entry.css";

const svc=getFirebaseServices();
function CreatorGoogleEntry(){
  const [user,setUser]=useState<User|null>(null);
  const [ready,setReady]=useState(!configured);
  const [rows,setRows]=useState<SavedCharacter[]>([]);
  const [notice,setNotice]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let stop=()=>{},epoch=0;
    const authStop=watchGoogleUser(u=>{
      const e=++epoch;
      stop();stop=()=>{};setRows([]);setUser(u);setReady(true);setNotice("");
      if(!svc||!u)return;
      stop=onSnapshot(collection(svc.db,"users",u.uid,"characters"),snap=>{
        if(e!==epoch||svc.auth.currentUser?.uid!==u.uid)return;
        setRows(snap.docs.map(d=>d.data() as SavedCharacter).filter(c=>c.ownerUid===u.uid));
      },()=>{
        if(e===epoch){setRows([]);setNotice("雲端角色讀取失敗，請確認連線。");}
      });
    });
    return()=>{++epoch;stop();authStop();};
  },[]);
  const handleAuth=async()=>{
    if(busy)return;
    setBusy(true);setNotice("");
    try{if(user)await logout();else await loginWithGoogle();}
    catch(error){
      const code=(error as {code?:unknown})?.code;
      setNotice("Google 登入／登出未完成，請重試。"+(typeof code==="string"&&/^auth\/[a-z-]+$/.test(code)?"（"+code+"）":""));
    }
    finally{setBusy(false);}
  };
  const nativeOpen=(id:string)=>{
    const load=(window as Window&{loadChar?:(id:string)=>void}).loadChar;
    if(typeof load!=="function")throw Error("CREATOR_NOT_READY");
    load(id);
  };
  return <details className="fgs-details" open>
    <summary>Google 雲端角色（隔離測試）</summary>
    {!configured?<p>尚未連接測試環境，角色仍只儲存在本機。</p>:!ready?<p>確認 Google 登入中…</p>:<>
      <div className="fb-inline">
        <span>{user?"已登入："+(user.displayName||"Google 玩家"):"登入後可綁定角色與跨裝置讀取"}</span>
        <button type="button" disabled={busy} onClick={()=>void handleAuth()}>{user?"登出 Google":"使用 Google 登入"}</button>
      </div>
      {user&&svc&&<CreatorSyncPanel key={user.uid} auth={svc.auth} db={svc.db} uid={user.uid} cloud={rows} openNative={nativeOpen}
        onSaved={saved=>{if(svc.auth.currentUser?.uid===saved.ownerUid)setRows(prev=>[saved,...prev.filter(c=>c.ownerUid===saved.ownerUid&&c.saveId!==saved.saveId)]);}}/>}
    </>}
    {notice&&<p role="status">{notice}</p>}
  </details>;
}
const root=document.getElementById("firebase-creator-sync-root");
if(root)createRoot(root).render(<CreatorGoogleEntry/>);

import {useState} from "react";
import {anyApi} from "convex/server";
import {useOauth,useSignInWithGoogle} from "@convex-dev/auth/methods/google/react";
export function GoogleAuthOption({redirectTo}:{redirectTo:()=>string}){
  const {signIn}=useSignInWithGoogle(anyApi.auth as any);
  const {flowError}=useOauth();
  const [busy,setBusy]=useState(false);
  const [failed,setFailed]=useState(false);
  const start=async()=>{
    if(busy)return;
    setBusy(true);setFailed(false);
    try{const result=await signIn({redirectTo:redirectTo()});if(result.status==="error")setFailed(true);}
    catch{setFailed(true);}
    finally{setBusy(false);}
  };
  return <section aria-label="Google 登入">
    <p>Google 帳號首次登入會建立獨立玩家身分，不會自動合併舊帳密帳號或上傳本機角色。</p>
    <button type="button" disabled={busy} onClick={()=>void start()}>{busy?"正在前往 Google…":"使用 Google 登入"}</button>
    {(failed||flowError)&&<p role="alert">Google 登入未完成。可重試或繼續使用原有帳密登入。</p>}
  </section>;
}

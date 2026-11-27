import React,{useState} from "react";
import {anyApi} from "convex/server";
import {useSignInWithUsernamePassword,useSignUpWithUsernamePassword} from "@convex-dev/auth/methods/username-password/react";
import {authFailureMessage,PASSWORD_MAX_LENGTH,SIGNIN_PASSWORD_MIN_LENGTH,SIGNUP_PASSWORD_MIN_LENGTH} from "./auth-feedback";
import {shouldAutoMergeAfterAuth} from "./signup-local-merge";
import {GoogleAuthOption} from "./google-auth-option";
import {syncEnabled} from "./cloud-client";
export function AuthPanel({onSignupAutoMerge,siteRoot='./',redirectTo}:{onSignupAutoMerge?:()=>void;siteRoot?:string;redirectTo:()=>string}) {
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [mergeAfterSignup,setMergeAfterSignup]=useState(true);
  const [message,setMessage]=useState("");
  const {signIn,pending:signingIn}=useSignInWithUsernamePassword(anyApi.auth as any);
  const {signUp,pending:signingUp}=useSignUpWithUsernamePassword(anyApi.auth as any);
  const pending=signingIn||signingUp;
  const submit=async (e:React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(pending)return;
    setMessage("");
    const submittedMode=mode;
    const result=submittedMode==="signin"
      ?await signIn({username,password})
      :await signUp({username,password});
    if(result.status==="complete"){
      setPassword("");
      if(onSignupAutoMerge&&shouldAutoMergeAfterAuth(submittedMode,result.status,mergeAfterSignup))onSignupAutoMerge();
      return;
    }
    setMessage(authFailureMessage(submittedMode,result.userError));
  };
  return <section className="panel auth-panel"><h2>{mode==="signin"?"登入雲端角色庫":"建立玩家帳號"}</h2>
    <p>使用帳號及密碼即可，不必提供 Email 或手機。</p>
    <p><a href={siteRoot+"index.html?view=sheet"} aria-label="返回原角色卡">返回原角色卡</a></p>
    <form onSubmit={submit}>
      <label>帳號<input name="username" autoComplete="username" type="text" value={username} onChange={e=>{setUsername(e.target.value);setMessage("");}} required minLength={3} maxLength={64} disabled={pending}/></label>
      <label>密碼<input name="password" autoComplete={mode==="signin"?"current-password":"new-password"} type="password" value={password} onChange={e=>{setPassword(e.target.value);setMessage("");}} required minLength={mode==="signup"?SIGNUP_PASSWORD_MIN_LENGTH:SIGNIN_PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} disabled={pending}/></label>
      <button disabled={pending} type="submit">{pending?"驗證中…":mode==="signin"?"登入":"註冊"}</button>
    </form>
    {mode==="signup"&&<>
      <p className="auth-hint">註冊密碼至少 10 個字元，請避免常見密碼，且開頭與結尾不能有空白。</p>
      {onSignupAutoMerge&&<label className="auth-hint"><input type="checkbox" checked={mergeAfterSignup} onChange={e=>setMergeAfterSignup(e.target.checked)} disabled={pending}/> 註冊成功後，自動把這個瀏覽器已有的角色合併到雲端（只新增，不覆蓋或刪除角色）。</label>}
    </>}
    {message && <p role="alert" className="error">{message}</p>}
    <button className="text-link" type="button" disabled={pending} onClick={()=>{setMode(mode==="signin"?"signup":"signin");setPassword("");setMessage("");}}>
      {mode==="signin"?"沒有帳號？建立新帳號":"已有帳號？返回登入"}
    </button>
    {syncEnabled&&<GoogleAuthOption redirectTo={redirectTo}/>}
    <p className="notice">第一版不提供忘記密碼復原。請自行妥善保管帳密，並保留角色 JSON 備份。</p>
  </section>;
}

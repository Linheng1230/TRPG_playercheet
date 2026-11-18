import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { ConvexReactClient, useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import { useSignInWithUsernamePassword, useSignUpWithUsernamePassword } from "@convex-dev/auth/methods/username-password/react";
import "./style.css";

const endpoint = String(import.meta.env.VITE_CONVEX_URL || "").trim();
const connected = /^https:\/\/[a-z0-9.-]+$/i.test(endpoint);
const client = connected ? new ConvexReactClient(endpoint) : null;
type AnyDoc = Record<string, any>;

function decodeSave(raw: string): { id: string; ruleset: string; version: number; name: string } {
  if (new TextEncoder().encode(raw).byteLength > 512 * 1024) throw Error("角色 JSON 超過 512KB 上限");
  const s: unknown = JSON.parse(raw);
  if (!s || typeof s !== "object" || Array.isArray(s)) throw Error("JSON 不是角色物件");
  const o = s as Record<string, any>;
  if ((o.v !== 9 && o.v !== 10) || !["2014","2024"].includes(o.ruleset) || typeof o.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(o.id)) {
    throw Error("角色存檔必須是 D&D 5R 原生 { v:9|10, id, ruleset:2014|2024 }");
  }
  return { id:o.id, ruleset:o.ruleset, version:o.v, name:String(o.meta?.name || o.cls || "未命名角色").slice(0,80) };
}
function downloadJson(raw: string, name: string) {
  const blob = new Blob([raw], {type:"application/json;charset=utf-8"});
  const uri = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href=uri; a.download = name.replace(/[^\w\u4e00-\u9fff-]/g,"_").slice(0,60)+".json";
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(uri),1000);
}
async function sha256(value:string) {
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function newInviteCode() {
  if (!globalThis.crypto?.getRandomValues) throw Error("瀏覽器不支援安全亂數，無法產生邀請碼");
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
}
function AuthPanel() {
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [mode,setMode]=useState<"signin"|"signup">("signin");
  const [message,setMessage]=useState("");
  const {signIn,pending:signingIn}=useSignInWithUsernamePassword(anyApi.auth as any);
  const {signUp,pending:signingUp}=useSignUpWithUsernamePassword(anyApi.auth as any);
  const pending=signingIn||signingUp;
  return <section className="panel auth-panel"><h2>{mode==="signin"?"登入雲端角色庫":"建立玩家帳號"}</h2>
    <p>使用帳號及密碼即可，不必提供 Email 或手機。</p>
    <form onSubmit={async e=>{e.preventDefault();setMessage("");const result=mode==="signin"?await signIn({username,password}):await signUp({username,password});setPassword("");if(result.status!=="complete")setMessage("帳號或密碼驗證失敗，請檢查後重試。");}}>
      <label>帳號<input autoComplete="username" type="text" value={username} onChange={e=>setUsername(e.target.value)} required minLength={3} maxLength={64} disabled={pending}/></label>
      <label>密碼<input autoComplete={mode==="signin"?"current-password":"new-password"} type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} disabled={pending}/></label>
      <button disabled={pending} type="submit">{pending?"驗證中…":mode==="signin"?"登入":"註冊"}</button>
    </form>
    {message && <p role="alert" className="error">{message}</p>}
    <button className="text-link" type="button" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setMessage("");}}>
      {mode==="signin"?"沒有帳號？建立新帳號":"已有帳號？返回登入"}
    </button>
    <p className="notice">第一版不提供忘記密碼復原。請自行妥善保管帳密，並保留角色 JSON 備份。</p>
  </section>;
}
function Vault() {
  const {signOut}=useAuthActions();
  const list=useQuery(anyApi.characters.listMine) as AnyDoc[] | undefined;
  const upload=useMutation(anyApi.characters.upload);
  const remove=useMutation(anyApi.characters.remove);
  const campaigns=useQuery(anyApi.campaigns.myCampaigns) as {owned:AnyDoc[];joined:AnyDoc[]}|undefined;
  const create=useMutation(anyApi.campaigns.create);
  const issue=useMutation(anyApi.campaigns.issueInvite);
  const join=useMutation(anyApi.campaigns.join);
  const leave=useMutation(anyApi.campaigns.leave);
  const share=useMutation(anyApi.campaigns.share);
  const unshare=useMutation(anyApi.campaigns.unshare);
  const [message,setMessage]=useState("");
  const [pending,setPending]=useState(false);
  const [campaignName,setCampaignName]=useState("");
  const [inviteCode,setInviteCode]=useState("");
  const [latestCode,setLatestCode]=useState("");
  const [selectedCampaign,setSelectedCampaign]=useState("");
  const [selectedCharacter,setSelectedCharacter]=useState("");
  const [dmCampaign,setDmCampaign]=useState("");
  const itemList=useMemo(()=>list??[],[list]);
  const run=async(fn:()=>Promise<unknown>,ok:string)=>{setPending(true);setMessage("");try{await fn();setMessage(ok);}catch(e){setMessage(e instanceof Error?e.message:"操作失敗，請重試");}finally{setPending(false);}};
  const loadFile=async(file?:File)=>{
    if(!file)return;
    await run(async()=>{
      const text=await file.text();const meta=decodeSave(text);
      const existing=itemList.find(x=>x.characterId===meta.id);
      await upload({originalJson:text,expectedRevision:existing?existing.revision:null});
    },"角色已安全儲存至雲端；若不同裝置同時編輯，會拒絕舊版本覆蓋。");
  };
  const download=async(id:string,name:string)=>{
    await run(async()=>{
      const raw=await new Promise<string>((resolve,reject)=>{
        // useQuery data is deliberately metadata-only. User JSON download via protected query below.
        const clientRef=client;if(!clientRef){reject(Error("尚未連線"));return;}
        clientRef.query(anyApi.characters.getMineForDownload,{id}).then((r:any)=>resolve(r.originalJson),reject);
      });
      downloadJson(raw,name);
    },"角色 JSON 已準備下載。");
  };
  const createInvite=async(id:string)=>{
    await run(async()=>{
      const code=newInviteCode();
      await issue({campaignId:id,codeHash:await sha256(code),expiresAt:Date.now()+24*3600000});
      setLatestCode(code);
    },"已建立一次性 24 小時邀請碼，請複製給玩家；關閉後不會再次顯示。");
  };
  return <><header className="topbar"><span className="eyebrow">D&D 5R｜雲端卷宗</span><button type="button" onClick={()=>void signOut()}>登出</button></header>
    <main>
      <section className="hero"><h1>我的冒險角色庫</h1><p>角色資料留在玩家自己的帳號，跨裝置登入即可讀回。只有按下儲存才會上傳，本機角色不會自動同步。</p></section>
      {message&&<p className="message" role="status">{message}</p>}
      <section className="panel"><h2>我的角色 <small>{itemList.length} 位</small></h2>
        <label className="upload-label">選擇原生角色 JSON，儲存至雲端
          <input type="file" accept=".json,application/json" disabled={pending} onChange={e=>{const f=e.target.files?.[0];void loadFile(f);e.target.value="";}}/>
        </label>
        <p className="hint">來自現有網站的 JSON 檔可以直接上傳，不會修改 D&D 2014／2024 規則或存檔內容。</p>
        {list===undefined?<p>讀取角色清單中…</p>:itemList.length===0?<p className="empty">尚未儲存角色，請先選擇 JSON 檔。</p>:<div className="items">
          {itemList.map((x:AnyDoc)=><article className="item" key={String(x._id)}><div><strong>{x.characterId}</strong><span>{x.ruleset} 規則・Save v{x.saveVersion}・修訂 {x.revision}</span></div><div className="actions">
            <button disabled={pending} onClick={()=>void download(x._id,x.characterId)}>下載 JSON</button>
            <button className="danger" disabled={pending} onClick={()=>{if(confirm("確認刪除雲端角色？本機 JSON 不會受影響。"))void run(()=>remove({id:x._id,expectedRevision:x.revision}),"已刪除雲端角色");}}>刪除</button>
          </div></article>)}
        </div>}
      </section>
      <section className="panel"><h2>跑團戰役與 DM</h2>
        <div className="inline-form"><input value={campaignName} maxLength={80} onChange={e=>setCampaignName(e.target.value)} placeholder="戰役名稱（由 DM 建立）" aria-label="戰役名稱"/><button disabled={pending||campaignName.trim().length<2} onClick={()=>void run(async()=>{await create({name:campaignName.trim()});setCampaignName("");},"戰役已建立")}>建立戰役</button></div>
        <div className="inline-form"><input value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="輸入 DM 傳來的邀請碼" aria-label="戰役邀請碼"/><button disabled={pending||!inviteCode.trim()} onClick={()=>void run(async()=>{await join({codeHash:await sha256(inviteCode.trim())});setInviteCode("");},"已加入戰役")}>加入戰役</button></div>
        {latestCode&&<div className="notice"><strong>新邀請碼（只顯示這一次）</strong><code>{latestCode}</code><button onClick={()=>void navigator.clipboard.writeText(latestCode)}>複製</button><button className="text-link" onClick={()=>setLatestCode("")}>關閉</button></div>}
        <h3>我主持的戰役</h3><div className="items">
          {(campaigns?.owned??[]).map((c:AnyDoc)=><article className="item" key={c._id}><strong>{c.name}</strong><div className="actions"><button disabled={pending} onClick={()=>void createInvite(c._id)}>產生一次性邀請碼</button><button onClick={()=>setDmCampaign(c._id)}>DM 團員角色</button></div></article>)}
          {!campaigns?.owned?.length&&<p className="empty">尚未建立戰役。</p>}
        </div>
        <h3>我參加的戰役</h3><div className="items">
          {(campaigns?.joined??[]).map((c:AnyDoc)=><article className="item" key={c._id}><strong>{c.name}</strong><div className="actions"><button onClick={()=>setSelectedCampaign(c._id)}>管理我分享的角色</button><button className="danger" disabled={pending} onClick={()=>{if(confirm("退出戰役會立刻解除所有角色分享，確定嗎？"))void run(()=>leave({campaignId:c._id}),"已退出，角色分享已撤銷");}}>退出</button></div></article>)}
          {!campaigns?.joined?.length&&<p className="empty">尚未加入戰役。</p>}
        </div>
        {selectedCampaign && <SharePanel key={selectedCampaign} campaignId={selectedCampaign} characters={itemList} onClose={()=>setSelectedCampaign("")} />}
        {dmCampaign && <DmPanel key={dmCampaign} campaignId={dmCampaign} onClose={()=>setDmCampaign("")}/>}
      </section>
    </main></>;
}
function SharePanel({campaignId,characters,onClose}:{campaignId:string;characters:AnyDoc[];onClose:()=>void}) {
  const [msg,setMsg]=useState("");
  const shares=useQuery(anyApi.campaigns.myShares,{campaignId}) as AnyDoc[]|undefined;
  const share=useMutation(anyApi.campaigns.share),unshare=useMutation(anyApi.campaigns.unshare);
  const ids=new Set((shares??[]).map(s=>String(s.characterId)));
  return <div className="inner-panel"><button className="close" onClick={onClose}>關閉</button><h4>角色分享授權</h4><p>只有你主動分享的角色，該團 DM 才能閱讀。你可以隨時撤銷。</p>{characters.map(c=><div className="item" key={c._id}><span>{c.characterId}（{c.ruleset}）</span><button onClick={()=>void (ids.has(c._id)?unshare({campaignId,characterId:c._id}):share({campaignId,characterId:c._id})).then(()=>setMsg("已更新分享權限")).catch(()=>setMsg("操作失敗"))}>{ids.has(c._id)?"撤銷分享":"分享給 DM"}</button></div>)}{msg&&<p role="status">{msg}</p>}</div>;
}
function DmPanel({campaignId,onClose}:{campaignId:string;onClose:()=>void}) {
  const roster=useQuery(anyApi.campaigns.dmRoster,{campaignId}) as AnyDoc[]|undefined;
  const [text,setText]=useState("");
  const [msg,setMsg]=useState("");
  return <div className="inner-panel"><button className="close" onClick={onClose}>關閉</button><h4>DM 團員角色（唯讀）</h4><p>僅顯示仍在戰役內且主動分享的角色。</p>{(roster??[]).map((c:AnyDoc)=><div className="item" key={c.id}><span>{c.characterId}・{c.ruleset}</span><button onClick={()=>void client!.query(anyApi.campaigns.dmReadShared,{campaignId,characterId:c.id}).then((r:any)=>{setText(JSON.stringify(JSON.parse(r.originalJson),null,2));setMsg("");}).catch(()=>{setText("");setMsg("角色分享已撤銷，無法讀取。");})}>查看（唯讀）</button></div>)}{msg&&<p role="alert">{msg}</p>}{text&&<textarea aria-label="DM 唯讀角色 JSON" className="json-view" value={text} readOnly rows={12}/>}</div>;
}
function ConnectedApp(){const {isAuthenticated,isLoading}=useConvexAuth();return isLoading?<main className="panel">正在驗證登入狀態…</main>:isAuthenticated?<Vault/>:<main className="auth-wrap"><AuthPanel/></main>;}
function App(){return connected&&client?<ConvexAuthProvider client={client} api={anyApi.auth as any}><ConnectedApp/></ConvexAuthProvider>:<main className="offline"><h1>D&D 5R｜雲端角色庫</h1><h2>尚未啟用雲端連線</h2><p>此版本尚未連接免費 Convex 專案，不能註冊或上傳角色。你仍可使用原本的創角網站與 JSON 存檔。</p><a href="../index.html">返回創角</a></main>;}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);

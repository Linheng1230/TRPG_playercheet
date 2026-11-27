import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { anyApi } from "convex/server";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import {AuthPanel} from "./shared-auth-panel";
import {SiteAccountLinks} from "./site-account-links";
import {client,connected,syncEnabled} from "./cloud-client";
import { extractNativeSave, importCloudSaveToLocal, readLocalCharacters, readLocalRaw, type LocalCharacter } from "./local-roster";
import { mergeLocalIntoCloud, type LocalMergeResult } from "./signup-local-merge";
import { makeInviteCode, normalizeInviteCode } from "../convex/lib/inviteCodes";
import { stageCloudCharacterForOpen } from "./vault-actions";
import {CreatorCloudSyncEntry,clearSyncSession} from "./creator-cloud-sync-panel";
import {canUseLocalCharacter} from "./creator-cloud-sync";
import "./style.css";
import "./creator-entry.css";


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
function newCharacterCopyId() {
  const bytes=crypto.getRandomValues(new Uint8Array(8));
  return "c"+Date.now().toString(36)+Array.from(bytes,v=>v.toString(16).padStart(2,"0")).join("");
}

function Vault({autoMergeAfterSignup,onAutoMergeHandled}:{autoMergeAfterSignup:boolean;onAutoMergeHandled:()=>void}) {
  const {signOut}=useAuthActions();
  const owner=useQuery(anyApi.users.myIdentity,syncEnabled?{}:"skip") as string|undefined;
  const ownerNow=async()=>syncEnabled?String(await client!.query(anyApi.users.myIdentity,{})):undefined;
  const guardLocal=(id:string,expectedOwner:string|undefined)=>{
    if(syncEnabled&&(!expectedOwner||!canUseLocalCharacter(localStorage,id,expectedOwner)))throw Error("本機角色已綁定其他帳號或歸屬未確認。");
  };
  const list=useQuery(anyApi.characters.listMine) as AnyDoc[] | undefined;
  const upload=useMutation(anyApi.characters.upload);
  const remove=useMutation(anyApi.characters.remove);
  const campaigns=useQuery(anyApi.campaigns.myCampaigns) as {owned:AnyDoc[];joined:AnyDoc[]}|undefined;
  const myRole=useQuery(anyApi.users.myRole) as "user" | "admin" | undefined;
  const create=useMutation(anyApi.campaigns.create);
  const issue=useMutation(anyApi.campaigns.issueInvite);
  const join=useMutation(anyApi.campaigns.join);
  const leave=useMutation(anyApi.campaigns.leave);
  const share=useMutation(anyApi.campaigns.share);
  const unshare=useMutation(anyApi.campaigns.unshare);
  const [message,setMessage]=useState("");
  const [pending,setPending]=useState(false);
  const autoMergeStarted=useRef(false);
  const [mergeSummary,setMergeSummary]=useState<LocalMergeResult|null>(null);
  const [allLocalCharacters,setLocalCharacters]=useState<LocalCharacter[]>(()=>readLocalCharacters(window.localStorage));
  const localCharacters=syncEnabled?allLocalCharacters.filter(c=>owner&&canUseLocalCharacter(localStorage,c.id,owner)):allLocalCharacters;
  useEffect(()=>{
    const update=()=>setLocalCharacters(readLocalCharacters(window.localStorage));
    window.addEventListener("storage",update);
    return ()=>window.removeEventListener("storage",update);
  },[]);
  const refreshLocal=()=>setLocalCharacters(readLocalCharacters(window.localStorage));
  const [campaignName,setCampaignName]=useState("");
  const [inviteCode,setInviteCode]=useState("");
  const [latestCode,setLatestCode]=useState("");
  const [selectedCampaign,setSelectedCampaign]=useState("");
  const [selectedCharacter,setSelectedCharacter]=useState("");
  const [dmCampaign,setDmCampaign]=useState("");
  const itemList=useMemo(()=>syncEnabled?(list??[]).filter(c=>owner&&String(c.ownerId)===owner):list??[],[list,owner]);
  const run=async(fn:()=>Promise<unknown>,ok:string)=>{setPending(true);setMessage("");try{await fn();setMessage(ok);}catch(e){setMessage(e instanceof Error?e.message:"操作失敗，請重試");}finally{setPending(false);}};
  const mergeAllLocal=async()=>{
    if(pending)return;
    setPending(true);setMergeSummary(null);setMessage("正在將本機角色安全合併至雲端…");
    try{
      const expectedOwner=await ownerNow();
      const result=await mergeLocalIntoCloud(window.localStorage,{
        listMine:async()=>await client!.query(anyApi.characters.listMine,{}) as { _id:string; characterId:string; revision:number }[],
        getJson:async id=>String((await client!.query(anyApi.characters.getMineForDownload,{id}) as AnyDoc).originalJson),
        createOnly:async raw=>{
          guardLocal(decodeSave(raw).id,expectedOwner);
          return await upload({originalJson:raw,expectedRevision:null,...(expectedOwner?{expectedOwnerId:expectedOwner}:{})});
        },
      },id=>!syncEnabled||!!expectedOwner&&canUseLocalCharacter(localStorage,id,expectedOwner));
      setMergeSummary(result);
      setMessage(`合併完成：新增 ${result.added} 位、已存在且相同 ${result.identical} 位、需要確認 ${result.conflicts.length} 位、失敗 ${result.failed.length} 位、未支援舊存檔 ${result.unsupported} 位。本機資料完全保留。`);
    }catch(e){setMessage((e instanceof Error?e.message:"合併失敗")+" 本機角色仍保留，請稍後重試。");}
    finally{setPending(false);}
  };
  useEffect(()=>{
    if(!autoMergeAfterSignup||autoMergeStarted.current)return;
    autoMergeStarted.current=true;
    onAutoMergeHandled();
    void mergeAllLocal();
    // Signup intent is consumed once; login never starts a merge by itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[autoMergeAfterSignup]);
  const uploadChecked=async(raw:string)=>{
    const native=extractNativeSave(raw);
    const meta=decodeSave(native);
    const expectedOwner=await ownerNow();
    guardLocal(meta.id,expectedOwner);
    const existing=itemList.find(x=>x.characterId===meta.id);
    if(existing){
      const current=await client!.query(anyApi.characters.getMineForDownload,{id:existing._id}) as AnyDoc;
      if(current.originalJson===native)throw Error("雲端已經有相同存檔，不需要再次上傳。");
      if(!window.confirm("雲端已有這位角色的另一個版本，確定要以本機版本覆寫？建議先下載雲端 JSON 備份。"))throw Error("已取消覆寫，雲端資料未變更。");
      guardLocal(meta.id,expectedOwner);
      await upload({originalJson:native,expectedRevision:current.revision,...(expectedOwner?{expectedOwnerId:expectedOwner}:{})});
    }else{
      await upload({originalJson:native,expectedRevision:null,...(expectedOwner?{expectedOwnerId:expectedOwner}:{})});
    }
  };
  const loadFile=async(file?:File)=>{
    if(!file)return;
    await run(async()=>uploadChecked(await file.text()),"角色已儲存至雲端，原始角色 JSON 保持不變。");
  };
  const uploadFromLocal=async(character:LocalCharacter)=>{
    await run(async()=>uploadChecked(readLocalRaw(window.localStorage,character.id)),"已從本機角色庫儲存到雲端。");
  };
  const saveCloudToLocal=async(id:string)=>{
    await run(async()=>{
      const cloud=await client!.query(anyApi.characters.getMineForDownload,{id}) as AnyDoc;
      const raw=String(cloud.originalJson);
      const expectedOwner=await ownerNow();
      if(expectedOwner&&String(cloud.ownerId)!==expectedOwner)throw Error("帳號已切換，已取消讀回。");
      guardLocal(decodeSave(raw).id,expectedOwner);
      const result=importCloudSaveToLocal(window.localStorage,raw);
      if(result.status==="conflict"){
        if(!window.confirm("本機已存在相同角色 ID 的不同存檔。為避免覆蓋本機角色，是否將雲端角色另存成副本？"))throw Error("已取消，本機角色保持不變。");
        const copy=importCloudSaveToLocal(window.localStorage,raw,"copy",()=>{
          return newCharacterCopyId();
        });
        if(copy.status!=="copied")throw Error("副本建立失敗");
      }else if(result.status==="identical"){
        throw Error("這位角色已存在於此裝置，本機資料沒有變更。");
      }
      refreshLocal();
    },"角色已存回本機角色庫。請回到同網域的創角頁重新整理並開啟角色庫讀取。");
  };
  const openCloudCharacter=async(id:string)=>{
    if(pending)return;
    setPending(true);setMessage("");
    try {
      const cloud=await client!.query(anyApi.characters.getMineForDownload,{id}) as AnyDoc;
      const expectedOwner=await ownerNow();
      if(expectedOwner&&String(cloud.ownerId)!==expectedOwner)throw Error("帳號已切換，已取消開啟。");
      guardLocal(decodeSave(String(cloud.originalJson)).id,expectedOwner);
      const opened=stageCloudCharacterForOpen(
        window.localStorage, String(cloud.originalJson),
        ()=>window.confirm("本機已有這位角色的其他版本。為保留雙方資料，是否將雲端角色另存成副本並開啟？"),
        newCharacterCopyId,
      );
      // Creator boot uses this existing storage key; no second manual import.
      if(!opened.id)throw Error("角色無法開啟");
      window.location.assign("../index.html?view=sheet");
    }catch(e){setMessage(e instanceof Error?e.message:"無法開啟雲端角色");}
    finally{setPending(false);}
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
      for (let attempt=0;attempt<4;attempt++){
        const code=makeInviteCode();
        try{
          await issue({campaignId:id,codeHash:await sha256(code),expiresAt:Date.now()+24*3600000});
          setLatestCode(code);
          return;
        }catch(error){
          // Five-character codes can collide. Retry only the server's exact collision error.
          if(!String(error).includes("INVITE_ALREADY_EXISTS"))throw error;
        }
      }
      throw Error("邀請碼重複，請再次按下產生邀請碼。");
    },"已建立五碼英數邀請碼（一次性、有效 24 小時），請複製給玩家。");
  };
  const joinByInvite=async()=>{
    if(pending)return;
    const normalized=normalizeInviteCode(inviteCode);
    if(!normalized){setMessage("請輸入 5 碼英數邀請碼（舊版邀請碼仍可使用）。");return;}
    setPending(true);setMessage("");
    try{
      const result=await join({codeHash:await sha256(normalized),clientProtocol:"v2"});
      if(result.status==="rate_limited")throw Error("邀請碼嘗試次數過多，請 10 分鐘後再試。");
      if(result.status==="owner")throw Error("你已經是這個戰役的 GM，不需要加入。");
      if(result.status!=="joined"||!result.campaignId)throw Error("邀請碼無效、已使用或已過期，請向 GM 索取新碼。");
      setInviteCode("");
      setSelectedCampaign(String(result.campaignId));
      setMessage("已加入戰役！請在下方選擇要分享給 DM 的角色。");
    }catch(e){setMessage(e instanceof Error?e.message:"加入戰役失敗");}
    finally{setPending(false);}
  };
  return <><header className="topbar"><span className="eyebrow">D&D 5R｜雲端卷宗</span><SiteAccountLinks root="../"/><div className="topbar-actions"><a href="../index.html?view=sheet" aria-label="返回角色卡">返回角色卡</a><button type="button" disabled={pending} onClick={()=>{clearSyncSession();void signOut();}}>登出</button></div></header>
    <main>
      <section className="hero"><h1>我的冒險角色庫</h1><p>換裝置登入後，按「開啟角色」即可從雲端取回角色並直接進入原角色卡，不必手動匯入 JSON。編輯後會先保存在這個瀏覽器；要更新雲端版本仍須在此頁重新儲存，且不同版本會先詢問，不會自動覆寫。</p></section>
      {message&&<p className="message" role="status">{message}</p>}
      {mergeSummary&&(mergeSummary.conflicts.length>0||mergeSummary.failed.length>0)&&<p className="notice" role="status">尚需處理：{mergeSummary.conflicts.map(x=>x.name).join("、")||"無衝突"}；失敗：{mergeSummary.failed.map(x=>x.name).join("、")||"無"}。可手動選擇角色上傳；遇到雲端版本不同時，系統會先要求確認。</p>}
      {import.meta.env.VITE_ENABLE_GOOGLE_AUTH==="true"&&<CreatorCloudSyncEntry rows={itemList.map(x=>({_id:String(x._id),characterId:String(x.characterId),ownerId:String(x.ownerId),revision:Number(x.revision),displayName:x.displayName}))}/>}
      <section className="panel"><h2>我的角色 <small>{itemList.length} 位</small></h2>
        <label className="upload-label">選擇原生角色 JSON，儲存至雲端
          <input type="file" accept=".json,application/json" disabled={pending} onChange={e=>{const f=e.target.files?.[0];void loadFile(f);e.target.value="";}}/>
        </label>
        <p className="hint">支援創角網站匯出的角色 JSON（含 _save），只儲存完整原生存檔，不更動 2014／2024 規則。</p>
        <div className="local-roster"><div className="local-heading"><h3>此裝置的本機角色庫 <small>{localCharacters.length} 位</small></h3><button type="button" disabled={pending} onClick={refreshLocal}>重新掃描</button><button type="button" disabled={pending||localCharacters.length===0} onClick={()=>void mergeAllLocal()}>合併本機角色到雲端</button></div>
          <p className="hint">僅能讀取<strong>與原創角網站相同網域</strong>的瀏覽器存檔；其他網址、不同瀏覽器或檔案模式請用上方 JSON 上傳；舊版或過大的角色可能無法自動合併。登入既有帳號不會自動上傳。</p>
          {localCharacters.length===0?<p className="empty">此網域尚未找到可直接同步的 v9／v10 角色，原有本機資料不受影響。</p>:
          <div className="items">{localCharacters.map(c=><article className="item" key={c.id}><div><strong>{c.name}</strong><span>{c.ruleset} 規則・Save v{c.saveVersion}</span></div><div className="actions">
            <button type="button" disabled={pending} onClick={()=>void uploadFromLocal(c)}>儲存此角色到雲端</button>
          </div></article>)}</div>}
        </div>
        {list===undefined?<p>讀取角色清單中…</p>:itemList.length===0?<p className="empty">尚未儲存角色，請先選擇 JSON 檔。</p>:<div className="items">
          {itemList.map((x:AnyDoc)=><article className="item" key={String(x._id)}><div><strong>{x.displayName || "未命名冒險者"}</strong><span>{x.ruleset} 規則・Save v{x.saveVersion}・修訂 {x.revision}</span></div><div className="actions">
            <button disabled={pending} onClick={()=>void openCloudCharacter(x._id)}>開啟角色</button>
            <button disabled={pending} onClick={()=>void download(x._id,x.displayName || "角色")}>下載 JSON</button>
            <button disabled={pending} onClick={()=>void saveCloudToLocal(x._id)}>存回本機角色庫</button>
            <button className="danger" disabled={pending} onClick={()=>{if(confirm("確認刪除雲端角色？本機 JSON 不會受影響。"))void run(()=>remove({id:x._id,expectedRevision:x.revision}),"已刪除雲端角色");}}>刪除</button>
          </div></article>)}
        </div>}
      </section>
      <section className="panel"><h2>跑團戰役與 DM</h2>
        {myRole==="admin"&&<div className="inline-form"><input value={campaignName} maxLength={80} onChange={e=>setCampaignName(e.target.value)} placeholder="戰役名稱（由 GM 建立）" aria-label="戰役名稱"/><button disabled={pending||campaignName.trim().length<2} onClick={()=>void run(async()=>{await create({name:campaignName.trim()});setCampaignName("");},"戰役已建立")}>建立戰役</button></div>}
        {myRole!=="admin"&&<p className="hint">玩家帳號可加入 GM 邀請的戰役並分享角色；僅已授權的 GM 帳號能建立新戰役。</p>}
        <div className="inline-form"><input value={inviteCode} maxLength={64} onChange={e=>setInviteCode(e.target.value.toUpperCase())} placeholder="5 碼英數邀請碼" aria-label="戰役邀請碼" autoComplete="off"/><button disabled={pending||!inviteCode.trim()} onClick={()=>void joinByInvite()}>加入戰役</button></div>
        <p className="hint">邀請碼為 5 碼英文字母＋數字（不分大小寫），一次性且 24 小時內有效；舊版長邀請碼在有效期內仍可使用。</p>
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
  return <div className="inner-panel"><button className="close" onClick={onClose}>關閉</button><h4>選擇本團角色</h4><p>請點選要讓 DM 查看哪位雲端角色。只有你主動分享的角色，該團 DM 才能閱讀；隨時可以撤銷。</p>{characters.length===0&&<p className="notice">目前沒有雲端角色。請先回到上方「我的角色」，按「合併本機角色到雲端」或上傳 JSON，再回來選擇分享。</p>}{characters.map(c=><div className="item" key={c._id}><span>{c.displayName || "未命名冒險者"}（{c.ruleset}）</span><button onClick={()=>void (ids.has(c._id)?unshare({campaignId,characterId:c._id}):share({campaignId,characterId:c._id})).then(()=>setMsg("已更新分享權限")).catch(()=>setMsg("操作失敗"))}>{ids.has(c._id)?"撤銷分享":"分享給 DM"}</button></div>)}{msg&&<p role="status">{msg}</p>}</div>;
}
function DmPanel({campaignId,onClose}:{campaignId:string;onClose:()=>void}) {
  const roster=useQuery(anyApi.campaigns.dmRoster,{campaignId}) as AnyDoc[]|undefined;
  const [text,setText]=useState("");
  const [msg,setMsg]=useState("");
  const [openedId,setOpenedId]=useState<string|null>(null);
  const stillShared=Boolean(openedId && roster?.some(c=>String(c.id)===openedId));
  useEffect(()=>{
    if(openedId && roster && !roster.some(c=>String(c.id)===openedId)){
      setText("");setOpenedId(null);setMsg("角色分享已撤銷，畫面已清除。");
    }
  },[roster,openedId]);
  return <div className="inner-panel"><button className="close" onClick={onClose}>關閉</button><h4>DM 團員角色（唯讀）</h4><p>僅顯示仍在戰役內且主動分享的角色。</p>{(roster??[]).map((c:AnyDoc)=><div className="item" key={c.id}><span>{c.displayName || "未命名冒險者"}・{c.ruleset}</span><button onClick={()=>void client!.query(anyApi.campaigns.dmReadShared,{campaignId,characterId:c.id}).then((r:any)=>{setOpenedId(String(c.id));setText(JSON.stringify(JSON.parse(r.originalJson),null,2));setMsg("");}).catch(()=>{setText("");setMsg("角色分享已撤銷，無法讀取。");})}>查看（唯讀）</button></div>)}{msg&&<p role="alert">{msg}</p>}{stillShared&&text&&<textarea aria-label="DM 唯讀角色 JSON" className="json-view" value={text} readOnly rows={12}/>}</div>;
}
function ConnectedApp(){
  const {isAuthenticated,isLoading}=useConvexAuth();
  const [signupAutoMerge,setSignupAutoMerge]=useState(false);
  return isLoading?<main className="panel">正在驗證登入狀態…</main>
    :isAuthenticated?<Vault autoMergeAfterSignup={signupAutoMerge} onAutoMergeHandled={()=>setSignupAutoMerge(false)}/>
    :<main className="auth-wrap"><AuthPanel siteRoot="../" redirectTo={()=>new URL("./",location.href).href} onSignupAutoMerge={()=>setSignupAutoMerge(true)}/><SiteAccountLinks root="../"/></main>;
}
function App(){return connected&&client?<ConvexAuthProvider client={client} api={anyApi.auth as any}><ConnectedApp/></ConvexAuthProvider>:<main className="offline"><h1>D&D 5R｜雲端角色庫</h1><h2>尚未啟用雲端連線</h2><p>此版本尚未連接免費 Convex 專案，不能註冊或上傳角色。你仍可使用原本的創角網站與 JSON 存檔。</p><a href="../index.html">返回創角</a></main>;}
createRoot(document.getElementById("root")!).render(<React.StrictMode><App/></React.StrictMode>);

import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import type {User} from "firebase/auth";
import {DmCharacterSheet} from "../../cloud-free/src/dm-character-sheet";
import {projectDmSheet,type DmSheet} from "../../cloud-free/src/dm-sheet-projection";
import {configured,getFirebaseServices,loginWithGoogle,logout,watchGoogleUser} from "./firebase-client";
import {campaignIsClosed,campaignIsDeleted,parseCharacter,type CampaignRef,type PlayerProfile,type SavedCharacter} from "./model";
import {
  addMember,createCampaign,getOrCreatePlayerProfile,observeGmSharedSheets,
  observeJoinedCampaign,observePlayerProfile,listMyShares,listOwnCampaigns,listOwnCharacters,
  readJoinedCampaign,revokeShare,saveCharacter,shareCharacter,updateCampaignClosed,updateCampaignDeleted,
  type GmSharedSheetRow
} from "./firestore-service";
import "../../cloud-free/src/style.css";
import "./style.css";

const previewSave={
  v:10,ruleset:"2024",id:"demoStars2024",cls:"德魯伊",sp:"卓爾",
  subName:"星辰結社",level:4,bg:"隱士",meta:{name:"星辰冒險者",player:"訪客示範",align:"混亂善良"},
  base:{str:8,dex:14,con:12,int:10,wis:18,cha:13},skills:["察覺","自然","醫藥"],
  cantrips:["荊棘之鞭","指引術"],prepared:["治療真言","妖火","月光束"],
  play:{hp:21,hpMax:28,thp:0,hd:"1d8",insp:true},
  gear:{armor:"皮甲",weapons:["長棍"],items:"旅行背包、筆記本",gold:{gp:20}},
  bio:{story:"從幽暗地域出發，尋找星星墜落的地方。"}
};
const previewSheet=projectDmSheet(JSON.stringify(previewSave));
const svc=getFirebaseServices();
const roleText=(p:PlayerProfile|null)=>p?.role==="gm"?"GM":"玩家";
function App(){
  const [user,setUser]=useState<User|null>(null);
  const [profile,setProfile]=useState<PlayerProfile|null>(null);
  const [ready,setReady]=useState(!configured);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [previewClosed,setPreviewClosed]=useState(false);
  const [ownChars,setOwnChars]=useState<SavedCharacter[]>([]);
  const [campaigns,setCampaigns]=useState<CampaignRef[]>([]);
  const [activeCampaign,setActiveCampaign]=useState<string>("");
  const [campaignName,setCampaignName]=useState("");
  const [memberUid,setMemberUid]=useState("");
  const [members,setMembers]=useState<string[]>([]);
  const [selectedSharedKey,setSelectedSharedKey]=useState("");
  const [joinedId,setJoinedId]=useState("");
  const [joined,setJoined]=useState<CampaignRef|null>(null);
  const [myShares,setMyShares]=useState<string[]>([]);
  const [busyKey,setBusyKey]=useState("");

  useEffect(()=>{
    let destroyed=false,session=0,stopProfile=()=>{};
    const stopAuth=watchGoogleUser(u=>{
      const current=++session;
      stopProfile();stopProfile=()=>{};
      setUser(u);setProfile(null);setReady(!u);
      setSelectedSharedKey("");setActiveCampaign("");setSharedRows([]);setMembers([]);
      setJoined(null);setMyShares([]);setOwnChars([]);setCampaigns([]);
      if(!u||!svc)return;
      void getOrCreatePlayerProfile(svc.db,u.uid,u.displayName??"玩家")
        .then(()=>{
          if(destroyed||current!==session)return;
          stopProfile=observePlayerProfile(svc.db,u.uid,p=>{
            if(destroyed||current!==session)return;
            setProfile(p);setReady(true);
            if(p?.role!=="gm"){
              setSelectedSharedKey("");setActiveCampaign("");
              setSharedRows([]);setMembers([]);setCampaigns([]);
            }
          },e=>{
            if(destroyed||current!==session)return;
            setProfile(null);setReady(true);setSelectedSharedKey("");
            setSharedRows([]);setMembers([]);setActiveCampaign("");setCampaigns([]);
            setMessage("GM 身分讀取失敗："+errorMessage(e));
          });
        }).catch(e=>{
          if(destroyed||current!==session)return;
          setReady(true);setMessage("個人設定讀取失敗："+errorMessage(e));
        });
    });
    return ()=>{destroyed=true;++session;stopProfile();stopAuth();};
  },[]);
  const selected=useMemo(()=>campaigns.find(x=>x.id===activeCampaign&&!campaignIsDeleted(x))??null,[campaigns,activeCampaign]);
  const liveCampaigns=useMemo(()=>campaigns.filter(x=>!campaignIsDeleted(x)),[campaigns]);
  const trashedCampaigns=useMemo(()=>campaigns.filter(campaignIsDeleted),[campaigns]);
  const run=async(key:string,fn:()=>Promise<void>)=>{
    if(!svc||loading)return;
    setBusyKey(key);setLoading(true);setMessage("");
    try{await fn();}catch(e){setMessage("操作未完成："+errorMessage(e));}
    finally{setBusyKey("");setLoading(false);}
  };
  const refreshChars=async()=>{if(svc&&user)setOwnChars(await listOwnCharacters(svc.db,user.uid));};
  const refreshCampaigns=async()=>{if(svc&&user)setCampaigns(await listOwnCampaigns(svc.db,user.uid));};
  const [sharedRows,setSharedRows]=useState<GmSharedSheetRow[]>([]);
  const sheet=useMemo(
    ()=>sharedRows.find(x=>x.ownerUid+":"+x.saveId===selectedSharedKey)?.sheet??null,
    [sharedRows,selectedSharedKey]
  );
  const loadCampaign=async(cid:string)=>{
    if(!svc||!user)return;
    setSelectedSharedKey("");setSharedRows([]);setMembers([]);
    setActiveCampaign(cid); // The subscription below owns subsequent updates.
  };
  useEffect(()=>{
    if(!svc||!user||profile?.role!=="gm"||!activeCampaign)return;
    return observeGmSharedSheets(svc.db,activeCampaign,rows=>{
      setSharedRows(rows);
      setMembers([...new Set(rows.map(x=>x.ownerUid))]);
    },e=>{
      setSharedRows([]);setMembers([]);setSelectedSharedKey("");
      setMessage("角色分享同步失敗："+errorMessage(e));
    });
  },[user?.uid,profile?.role,activeCampaign]);
  useEffect(()=>{
    if(!svc||!user||!profile)return;
    void refreshChars().catch(e=>setMessage("角色讀取失敗："+errorMessage(e)));
    if(profile.role==="gm")void refreshCampaigns().catch(e=>setMessage("戰役讀取失敗："+errorMessage(e)));
  },[user?.uid,profile?.role]);
  useEffect(()=>{
    if(!svc||!user||!joined)return;
    return observeJoinedCampaign(svc.db,joined.id,
      current=>setJoined(current),
      e=>{
        setJoined(null);setMyShares([]);
        setMessage("目前團務狀態無法讀取："+errorMessage(e));
      }
    );
  },[user?.uid,joined?.id]);
  const login=()=>run("google",async()=>{await loginWithGoogle();setMessage("Google 登入成功，正在確認角色權限。");});
  const signout=()=>run("signout",async()=>{await logout();setMessage("已登出。");});
  const importJson=(file:File|null)=>{
    if(!file||!svc||!user)return;
    void run("import",async()=>{
      if(file.size>500000)throw Error("檔案超過 500 KB");
      const raw=await file.text();
      parseCharacter(raw);
      await saveCharacter(svc.db,user.uid,raw);
      await refreshChars();setMessage("角色已儲存到 Firebase 測試資料庫，未修改 Convex。");
    });
  };
  const create=()=>run("create",async()=>{
    await createCampaign(svc!.db,user!.uid,campaignName);
    await refreshCampaigns();setCampaignName("");setMessage("測試戰役已建立。");
  });
  const toggle=()=>run("toggle",async()=>{
    if(!selected)return;
    const closing=!campaignIsClosed(selected);
    if(!window.confirm(closing?
      "關閉測試團務？角色、成員與分享都會保留。":
      "重新開啟測試團務？"))return;
    await updateCampaignClosed(svc!.db,user!.uid,selected.id,closing);
    await refreshCampaigns();setMessage(closing?"團務已關閉，資料保留。":"團務已重新開啟。");
  });
  const trash=()=>run("trash",async()=>{
    if(!selected)return;
    const typed=window.prompt("將團務移至垃圾桶，保留全部玩家角色、成員與分享資料。請輸入團務名稱以確認：", "");
    if(typed!==selected.name){
      setMessage(typed===null?"已取消刪除。":"名稱不一致，未刪除團務。");
      return;
    }
    await updateCampaignDeleted(svc!.db,user!.uid,selected.id,true);
    setActiveCampaign("");setSelectedSharedKey("");setSharedRows([]);setMembers([]);
    await refreshCampaigns();setMessage("團務已移至垃圾桶，可還原。玩家角色與分享資料保留。");
  });
  const restore=(c:CampaignRef)=>run("restore",async()=>{
    if(!window.confirm("還原團務「"+c.name+"」？全部成員與既有分享都會保留。"))return;
    await updateCampaignDeleted(svc!.db,user!.uid,c.id,false);
    await refreshCampaigns();setMessage("已還原團務，角色及原本團員資料仍在。");
  });
  const add=()=>run("member",async()=>{
    if(!selected)return;
    await addMember(svc!.db,selected.id,memberUid.trim());
    setMemberUid("");await loadCampaign(selected.id);
    setMessage("已新增測試成員，沒有建立帳號或變更 Convex。");
  });
  const selectMemberCard=(row:GmSharedSheetRow)=>setSelectedSharedKey(row.ownerUid+":"+row.saveId);
  const enterCampaign=()=>run("enter",async()=>{
    const j=await readJoinedCampaign(svc!.db,joinedId.trim(),user!.uid);
    setJoined(j);
    const data=await listMyShares(svc!.db,j.id,user!.uid);
    setMyShares(data.map(x=>x.saveId));
    setMessage("已讀取既有成員權限。");
  });
  const share=(saveId:string)=>run("share",async()=>{
    if(!joined)return;
    const shared=myShares.includes(saveId);
    if(shared)await revokeShare(svc!.db,joined.id,user!.uid,saveId);
    else {
      if(campaignIsClosed(joined))throw Error("團務已關閉，不能新增分享");
      await shareCharacter(svc!.db,joined.id,user!.uid,saveId);
    }
    const data=await listMyShares(svc!.db,joined.id,user!.uid);
    setMyShares(data.map(x=>x.saveId));
    setMessage(shared?"角色分享已撤銷。":"已主動分享角色給目前戰役的 GM。");
  });
  return <div className="fb-stage">
    <header className="fb-head">
      <span className="fb-eyebrow">D&D 5R · Firebase 隔離試驗</span>
      <h1>Google 登入與 GM 雲端角色卡</h1>
      <p>不取代正式 Convex；此頁僅連接你設定的 Firebase 測試專案。</p>
    </header>
    <section className="fb-auth" aria-label="登入區域">
      {!configured?<div>
        <h2>Firebase 專案尚未連接</h2>
        <p>下方可以安全體驗示範角色卡及關閉／重開團務，但不會建立帳號或寫入資料。</p>
        <p className="fb-note">完成 Firebase Web App 設定及啟用 Google 登入後，才可驗證真實 Google OAuth。</p>
      </div>:!ready?<p>正在確認 Google 登入狀態…</p>:!user?<div>
        <h2>使用 Google 帳號登入</h2>
        <button className="fb-primary" type="button" disabled={loading} onClick={login}>
          {busyKey==="google"?"正在開啟 Google 登入…":"使用 Google 登入"}
        </button>
        <p className="fb-note">測試版使用官方 Firebase Authentication；不會變更既有 Convex 帳號。</p>
      </div>:<div>
        <h2>已登入：{user.displayName||"Google 玩家"}</h2>
        <p>身分：{roleText(profile)} · 電子郵件由 Firebase 驗證，不會用來自動授予 GM 權限。</p>
        <div className="fb-inline"><code>玩家 UID：{user.uid}</code><button onClick={()=>navigator.clipboard?.writeText(user.uid)}>複製 UID</button><button disabled={loading} onClick={signout}>登出</button></div>
      </div>}
    </section>
    {message&&<p className="fb-notice" role="status">{message}</p>}
    {!configured&&<section className="fb-panel">
      <h2>訪客示範（不寫入雲端）</h2>
      <div className="fb-inline">
        <strong>範例戰役：星辰之旅</strong>
        <span>{previewClosed?"已關閉":"進行中"}</span>
        <button type="button" onClick={()=>setPreviewClosed(v=>!v)}>
          {previewClosed?"重新開啟團務":"關閉團務（可還原）"}
        </button>
      </div>
      <p>此示範角色和團員資料始終存在，關閉後仍可檢視。</p>
      <DmCharacterSheet sheet={previewSheet}/>
    </section>}
    {configured&&user&&profile&&<main>
      <section className="fb-panel">
        <h2>我的雲端角色</h2>
        <p>可匯入既有 2014／2024 JSON 檔，但顯示時會轉成角色卡，GM 不會看到原始 JSON。</p>
        <label className="fb-file">選擇角色存檔 <input type="file" accept=".json,application/json" disabled={loading} onChange={e=>importJson(e.target.files?.[0]??null)}/></label>
        {ownChars.length===0?<p>尚未匯入測試角色。</p>:<ul className="fb-list">{ownChars.map(c=><li key={c.saveId}>{c.displayName} · {c.ruleset} · 修訂 {c.revision}</li>)}</ul>}
      </section>
      {profile.role==="gm"&&<section className="fb-panel">
        <h2>GM 團務（限現任 GM）</h2>
        <div className="fb-inline"><input aria-label="新戰役名稱" value={campaignName} placeholder="新戰役名稱" onChange={e=>setCampaignName(e.target.value)} />
          <button disabled={loading||!campaignName.trim()} onClick={create}>建立測試戰役</button></div>
        <div className="fb-campaigns">{liveCampaigns.map(c=><button key={c.id} disabled={loading} onClick={()=>void run("open",()=>loadCampaign(c.id))} className={c.id===activeCampaign?"active":""}>
          {c.name} · {campaignIsClosed(c)?"已關閉":"進行中"}</button>)}</div>
        {trashedCampaigns.length>0&&<div className="fb-panel fb-panel-inner">
          <h3>團務垃圾桶（可復原）</h3>
          {trashedCampaigns.map(c=><div key={c.id} className="fb-inline">
            <span>{c.name} · 已刪除（資料保留）</span>
            <button disabled={loading} onClick={()=>restore(c)}>還原團務</button>
          </div>)}
        </div>}
        {selected&&<div className="fb-panel fb-panel-inner">
          <div className="fb-inline"><h3>{selected.name}</h3><button disabled={loading} onClick={toggle}>{campaignIsClosed(selected)?"重新開啟團務":"關閉團務（可還原）"}</button>
            <button disabled={loading} onClick={trash}>刪除團務（可還原）</button></div>
          <p>測試戰役 ID：<code>{selected.id}</code></p>
          {!campaignIsClosed(selected)&&<div className="fb-inline"><input aria-label="現有玩家 UID" value={memberUid} onChange={e=>setMemberUid(e.target.value)} placeholder="現有玩家 UID"/>
            <button disabled={loading||!memberUid.trim()} onClick={add}>邀請現有玩家加入（測試方式）</button></div>}
          <p className="fb-note">正式五碼邀請碼尚未移植；此 PoC 以已登入的 Firebase UID 驗證權限。</p>
          <div className="fb-inline"><h3>團員分享角色</h3><button disabled={loading} onClick={()=>void run("refresh",()=>loadCampaign(selected.id))}>更新列表</button></div>
          {members.length===0?<p>尚無分享角色。</p>:<p>具有可閱讀分享的團員數：{members.length}</p>}
          {sharedRows.map(x=><div key={x.ownerUid+"-"+x.saveId} className="fb-inline">
            <span>{x.sheet.name} · {x.sheet.className} {x.sheet.level} 級</span>
            <button onClick={()=>selectMemberCard(x)}>查看唯讀角色卡</button>
          </div>)}
          {sheet&&<DmCharacterSheet sheet={sheet}/>}
        </div>}
      </section>}
      <section className="fb-panel">
        <h2>玩家分享角色</h2>
        <p>由 GM 先以你的 Firebase UID 加入測試戰役，再輸入該戰役 ID。角色分享完全由玩家本人控制。</p>
        <div className="fb-inline"><input aria-label="已加入的戰役 ID" value={joinedId} placeholder="戰役 ID" onChange={e=>setJoinedId(e.target.value)}/>
          <button disabled={loading||!joinedId.trim()} onClick={enterCampaign}>開啟分享管理</button></div>
        {joined&&<div className="fb-panel fb-panel-inner">
          <h3>{joined.name} · {campaignIsClosed(joined)?"已關閉":"進行中"}</h3>
          {ownChars.map(c=><div className="fb-inline" key={c.saveId}><span>{c.displayName}（{c.ruleset}）</span>
            <button disabled={loading||(campaignIsClosed(joined)&&!myShares.includes(c.saveId))} onClick={()=>share(c.saveId)}>
              {myShares.includes(c.saveId)?"撤銷分享": "主動分享給 GM"}</button></div>)}
          <p className="fb-note">關閉團務不刪除既有分享；玩家仍可撤銷。更新角色存檔後需再次分享最新快照。</p>
        </div>}
      </section>
    </main>}
    <footer>獨立 Firebase 技術驗證 · 不遷移現有 Convex 使用者或正式角色 · 團務刪除可復原，不永久刪除角色</footer>
  </div>;
}
function errorMessage(err:unknown):string{
  const value=err as {code?:string;message?:string};
  const code=typeof value?.code==="string"?value.code:"";
  if(code==="auth/popup-blocked")return "瀏覽器阻擋了 Google 登入視窗，請允許彈出視窗後重試。";
  if(code==="auth/unauthorized-domain")return "Firebase 未授權此網站網域，請先在 Authentication 設定授權網域。";
  if(code==="auth/popup-closed-by-user"||code==="auth/cancelled-popup-request")return "登入已取消。";
  return code||value?.message?.slice(0,220)||"未知錯誤";
}
createRoot(document.getElementById("root")!).render(<App/>);

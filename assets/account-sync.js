(function(){
"use strict";

var CFG=window.ZIZI_ACCOUNT_CONFIG||{};
var MOUNT_ID="accountSyncMount";
var META_PREFIX="dnd5r:cloud-sync:";
var PENDING_UPLOAD="dnd5r:cloud-pending-upload-email";
var CLOUD_FIELDS="owner_user_id,client_character_id,snapshot,schema_version,revision,updated_at";
var provider=null,user=null,cloudRows=[],unsubscribe=null,recoveryMode=false;
var timers=new Map(),chains=new Map();
var statusText="",statusKind="muted";

function esc(v){
  return String(v==null?"":v).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function clone(v){return JSON.parse(JSON.stringify(v));}
function configured(){
  return !!CFG.enabled && (!!window.__ZIZI_ACCOUNT_PROVIDER_FACTORY__ || (!!CFG.supabaseUrl&&!!CFG.supabasePublishableKey));
}
function setStatus(msg,kind){statusText=msg;statusKind=kind||"muted";render();}
function authRedirectUrl(){
  if(location.origin==="null")return "";
  return location.origin+location.pathname.replace(/index\.html$/,"");
}
function metaKey(uid){return META_PREFIX+uid;}
function readMeta(uid){
  if(!uid||!window.storageAvailable||!storageAvailable())return {};
  try{return JSON.parse(localStorage.getItem(metaKey(uid))||"{}");}catch(e){return {};}
}
function writeMeta(uid,m){
  if(!uid||!window.storageAvailable||!storageAvailable())return;
  try{localStorage.setItem(metaKey(uid),JSON.stringify(m));}catch(e){}
}
function setCharMeta(uid,id,patch){
  var m=readMeta(uid);m[id]=Object.assign({},m[id]||{},patch);writeMeta(uid,m);
}
function removeCharMeta(uid,id){
  var m=readMeta(uid);delete m[id];writeMeta(uid,m);
}
function hashSnapshot(obj){
  var s=JSON.stringify(obj||{}),h=2166136261;
  for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0).toString(16).padStart(8,"0");
}
function loadExternal(src){
  return new Promise(function(resolve,reject){
    if(window.supabase&&window.supabase.createClient)return resolve();
    var old=document.querySelector('script[data-zizi-supabase="1"]');
    if(old){
      old.addEventListener("load",resolve,{once:true});
      old.addEventListener("error",function(){reject(new Error("Supabase client 載入失敗"));},{once:true});
      return;
    }
    var s=document.createElement("script");
    s.src=src;s.async=true;s.dataset.ziziSupabase="1";
    s.onload=resolve;
    s.onerror=function(){reject(new Error("Supabase client 載入失敗"));};
    document.head.appendChild(s);
  });
}
async function createRealProvider(){
  await loadExternal(CFG.supabaseJsUrl);
  if(!window.supabase||!window.supabase.createClient)throw new Error("Supabase client 不可用");
  var c=window.supabase.createClient(CFG.supabaseUrl,CFG.supabasePublishableKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  function must(data,error){if(error)throw error;return data;}
  return {
    async getSession(){
      var r=await c.auth.getSession();return (must(r.data,r.error)||{}).session||null;
    },
    onAuthStateChange:function(cb){
      var r=c.auth.onAuthStateChange(function(event,session){
        setTimeout(function(){cb(session,event);},0);
      });
      return function(){if(r.data&&r.data.subscription)r.data.subscription.unsubscribe();};
    },
    async signUp(email,password){
      var r=await c.auth.signUp({email:email,password:password,options:{emailRedirectTo:authRedirectUrl()||undefined}});
      return must(r.data,r.error);
    },
    async signIn(email,password){
      var r=await c.auth.signInWithPassword({email:email,password:password});
      return must(r.data,r.error);
    },
    async signOut(){
      var r=await c.auth.signOut({scope:"local"});if(r.error)throw r.error;
    },
    async sendPasswordReset(email){
      var r=await c.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl()||undefined});
      return must(r.data,r.error);
    },
    async updatePassword(password){
      var r=await c.auth.updateUser({password:password});
      return must(r.data,r.error);
    },
    async listCharacters(ownerId){
      var r=await c.from("characters").select(CLOUD_FIELDS).eq("owner_user_id",ownerId).order("updated_at",{ascending:false});
      return must(r.data,r.error)||[];
    },
    async getCharacter(ownerId,id){
      var r=await c.from("characters").select(CLOUD_FIELDS).eq("owner_user_id",ownerId).eq("client_character_id",id).maybeSingle();
      return must(r.data,r.error)||null;
    },
    async createCharacter(ownerId,snapshot){
      var row={
        owner_user_id:ownerId,
        client_character_id:snapshot.id,
        snapshot:clone(snapshot),
        schema_version:+snapshot.v||0,
        revision:1,
        updated_at:new Date().toISOString()
      };
      var r=await c.from("characters").insert(row).select(CLOUD_FIELDS).single();
      return must(r.data,r.error);
    },
    async updateCharacterCas(ownerId,snapshot,expectedRevision){
      var patch={
        snapshot:clone(snapshot),
        schema_version:+snapshot.v||0,
        revision:expectedRevision+1,
        updated_at:new Date().toISOString()
      };
      var r=await c.from("characters").update(patch)
        .eq("owner_user_id",ownerId)
        .eq("client_character_id",snapshot.id)
        .eq("revision",expectedRevision)
        .select(CLOUD_FIELDS)
        .maybeSingle();
      return must(r.data,r.error)||null;
    },
    async deleteCharacter(ownerId,id){
      var r=await c.from("characters").delete()
        .eq("owner_user_id",ownerId)
        .eq("client_character_id",id)
        .select("client_character_id");
      return must(r.data,r.error)||[];
    }
  };
}
async function ensureProvider(){
  if(provider)return provider;
  if(!configured())return null;
  provider=window.__ZIZI_ACCOUNT_PROVIDER_FACTORY__
    ? await window.__ZIZI_ACCOUNT_PROVIDER_FACTORY__(CFG)
    : await createRealProvider();
  return provider;
}
function injectStyles(){
  if(document.getElementById("accountSyncStyles"))return;
  var s=document.createElement("style");s.id="accountSyncStyles";
  s.textContent=
    ".account-box{border:1px solid var(--line-soft);background:var(--panel);padding:11px;margin:10px 0 14px}"+
    ".account-head{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}"+
    ".account-head b{font-size:14px}.account-badge{font-size:12px;color:var(--muted)}"+
    ".account-status{font-size:12.5px;line-height:1.6;margin:7px 0;color:var(--muted)}"+
    ".account-status.ok{color:var(--gold)}.account-status.err{color:var(--danger)}"+
    ".account-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:7px;margin-top:8px}"+
    ".account-form input{min-width:0;padding:8px;border:1px solid var(--line-soft);background:var(--bg);color:var(--text)}"+
    ".account-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}"+
    ".account-actions button,.cloud-row button{border:1px solid var(--line-soft);background:var(--panel);color:var(--text);padding:7px 10px}"+
    ".account-actions .primary{background:var(--gold);color:#17120a}"+
    ".account-upload-opt{grid-column:1/-1;font-size:12.5px;color:var(--muted)}"+
    ".cloud-list{display:grid;gap:6px;margin-top:8px}.cloud-row{display:flex;gap:8px;align-items:center;border-top:1px solid var(--line-soft);padding-top:7px}"+
    ".cloud-main{min-width:0;flex:1}.cloud-main b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cloud-main small{color:var(--muted)}"+
    "@media(max-width:520px){.account-form{grid-template-columns:1fr}.account-upload-opt{grid-column:1}.cloud-row{align-items:flex-start;flex-wrap:wrap}.cloud-main{flex-basis:100%}}";
  document.head.appendChild(s);
}
function localSave(id){
  try{return JSON.parse(localStorage.getItem(SK.char(id))||"null");}catch(e){return null;}
}
function storeLocalSnapshot(snapshot){
  if(!storageAvailable())throw new Error("目前環境無法使用瀏覽器儲存");
  localStorage.setItem(SK.char(snapshot.id),JSON.stringify(snapshot));
  var r=getRoster().filter(function(x){return x.id!==snapshot.id;});
  r.unshift(rosterEntry(snapshot));setRoster(r);renderRoster();
}
function backupLocal(existing){
  var b=clone(existing),oldName=(b.meta&&b.meta.name)||"未命名冒險者";
  b.id=newId();b.ts=Date.now();b.meta=Object.assign({},b.meta||{},{name:oldName+"（雲端下載前備份）"});
  localStorage.setItem(SK.char(b.id),JSON.stringify(b));
  var r=getRoster().filter(function(x){return x.id!==b.id;});
  r.unshift(rosterEntry(b));setRoster(r);
  return b.id;
}
function render(){
  var mount=document.getElementById(MOUNT_ID);if(!mount)return;
  injectStyles();
  if(!configured()){
    mount.innerHTML="";
    return;
  }
  if(!user){
    mount.innerHTML='<div class="account-box">'+
      '<div class="account-head"><b>帳號同步</b><span class="account-badge">訪客模式</span></div>'+
      '<div class="account-status '+esc(statusKind)+'">'+esc(statusText||"可繼續使用本機角色；登入後才會連到你的雲端角色。")+'</div>'+
      '<div class="account-form">'+
      '<input id="accountEmail" type="email" autocomplete="username" placeholder="Email">'+
      '<input id="accountPassword" type="password" autocomplete="current-password" minlength="8" placeholder="密碼（至少 8 碼）">'+
      '<label class="account-upload-opt"><input id="accountUploadAfterSignup" type="checkbox" checked> 註冊並完成登入後，上傳此裝置的角色</label>'+
      '</div><div class="account-actions"><button class="primary" id="accountSignIn">登入</button><button id="accountSignUp">註冊</button><button id="accountForgot">忘記密碼</button></div></div>';
    bindGuest();return;
  }
  var rows=cloudRows.map(function(r){
    var n=(r.snapshot&&r.snapshot.meta&&r.snapshot.meta.name)||"未命名冒險者";
    var cls=(r.snapshot&&r.snapshot.cls)||"未選職業",lv=(r.snapshot&&r.snapshot.level)||1;
    return '<div class="cloud-row"><div class="cloud-main"><b>'+esc(n)+'</b><small>'+esc(cls)+' · '+lv+' 級 · 雲端 rev '+r.revision+'</small></div>'+
      '<button data-cloud-download="'+esc(r.client_character_id)+'">下載到此裝置</button>'+
      '<button data-cloud-delete="'+esc(r.client_character_id)+'">刪除雲端</button></div>';
  }).join("");
  var recoveryHtml=recoveryMode
    ? '<div class="account-form"><input id="accountNewPassword" type="password" autocomplete="new-password" minlength="8" placeholder="新密碼（至少 8 碼）"></div><div class="account-actions"><button class="primary" id="accountUpdatePassword">更新密碼</button></div>'
    : "";
  mount.innerHTML='<div class="account-box">'+
    '<div class="account-head"><b>帳號同步</b><span class="account-badge">'+esc(user.email||"已登入")+'</span></div>'+
    '<div class="account-status '+esc(statusKind)+'">'+esc(statusText||"本機角色仍可離線使用；只有已連結角色才會背景同步。")+'</div>'+
    recoveryHtml+
    '<div class="account-actions"><button class="primary" id="accountUploadLocal">上傳本機角色</button><button id="accountRefreshCloud">重新整理雲端</button><button id="accountSignOut">登出</button></div>'+
    '<div class="cloud-list">'+(rows||'<div class="account-status">雲端目前沒有角色。</div>')+'</div></div>';
  bindUser();
}
function readEmail(){
  var e=document.getElementById("accountEmail"),email=e?e.value.trim():"";
  if(!email||email.indexOf("@")<1)throw new Error("請輸入有效 Email");
  return email;
}
function readCredentials(){
  var email=readEmail(),p=document.getElementById("accountPassword"),password=p?p.value:"";
  if(password.length<8)throw new Error("密碼至少需要 8 碼");
  return {email:email,password:password};
}
function bindGuest(){
  var signIn=document.getElementById("accountSignIn");
  if(signIn)signIn.addEventListener("click",async function(){
    try{
      var v=readCredentials();setStatus("登入中…");
      var p=await ensureProvider(),data=await p.signIn(v.email,v.password);
      user=(data&&data.session&&data.session.user)||(data&&data.user)||null;
      if(!user)throw new Error("登入成功但沒有取得有效 Session");
      setStatus("已登入","ok");await refreshCloud();await maybePendingUpload();
    }catch(e){setStatus(e.message||String(e),"err");}
  });
  var forgot=document.getElementById("accountForgot");
  if(forgot)forgot.addEventListener("click",async function(){
    try{
      var email=readEmail();setStatus("正在送出密碼重設信…");
      var p=await ensureProvider();await p.sendPasswordReset(email);
      setStatus("如果此 Email 有帳號，將收到密碼重設信；請由信件連結回到本站設定新密碼。","ok");
    }catch(e){setStatus(e.message||String(e),"err");}
  });
  var signUp=document.getElementById("accountSignUp");
  if(signUp)signUp.addEventListener("click",async function(){
    try{
      var v=readCredentials(),box=document.getElementById("accountUploadAfterSignup"),want=!!(box&&box.checked);
      setStatus("建立帳號中…");var p=await ensureProvider(),data=await p.signUp(v.email,v.password);
      if(want)localStorage.setItem(PENDING_UPLOAD,v.email.toLowerCase());
      if(data&&data.session&&data.session.user){
        user=data.session.user;setStatus("帳號已建立並登入","ok");await refreshCloud();await maybePendingUpload();
      }else{
        setStatus("帳號已建立。請先到信箱完成 Email 確認，再回來登入；你勾選的本機角色上傳會保留到同一個 Email 登入後。","ok");
      }
    }catch(e){setStatus(e.message||String(e),"err");}
  });
}
function bindUser(){
  var update=document.getElementById("accountUpdatePassword");
  if(update)update.addEventListener("click",async function(){
    try{
      var input=document.getElementById("accountNewPassword"),password=input?input.value:"";
      if(password.length<8)throw new Error("新密碼至少需要 8 碼");
      await provider.updatePassword(password);recoveryMode=false;setStatus("密碼已更新。","ok");
    }catch(e){setStatus(e.message||String(e),"err");}
  });
  var b=document.getElementById("accountUploadLocal");if(b)b.addEventListener("click",function(){uploadLocalCharacters(true);});
  b=document.getElementById("accountRefreshCloud");if(b)b.addEventListener("click",function(){refreshCloud(true);});
  b=document.getElementById("accountSignOut");if(b)b.addEventListener("click",async function(){
    try{await provider.signOut();user=null;cloudRows=[];statusText="已登出；本機角色仍保留。";statusKind="ok";render();}
    catch(e){setStatus(e.message||String(e),"err");}
  });
  document.querySelectorAll("[data-cloud-download]").forEach(function(x){x.addEventListener("click",function(){downloadCloud(x.dataset.cloudDownload);});});
  document.querySelectorAll("[data-cloud-delete]").forEach(function(x){x.addEventListener("click",function(){deleteCloud(x.dataset.cloudDelete);});});
}
async function refreshCloud(show){
  if(!user||!provider)return;
  var uid=user.id;
  try{
    if(show)setStatus("讀取雲端角色…");
    var rows=await provider.listCharacters(uid);
    if(!user||user.id!==uid)return;
    cloudRows=rows;
    if(show){statusText="已讀取 "+cloudRows.length+" 個雲端角色";statusKind="ok";}
    render();
  }catch(e){
    if(user&&user.id===uid)setStatus("雲端讀取失敗："+(e.message||e),"err");
  }
}
async function maybePendingUpload(){
  if(!user)return;
  var pending=(localStorage.getItem(PENDING_UPLOAD)||"").toLowerCase();
  if(!pending||pending!==(user.email||"").toLowerCase())return;
  localStorage.removeItem(PENDING_UPLOAD);await uploadLocalCharacters(false);
}
async function uploadLocalCharacters(showConfirm){
  if(!user||!provider)return;
  var roster=getRoster();if(!roster.length){setStatus("這台裝置沒有可上傳的角色。");return;}
  if(showConfirm&&
     !confirm("要把這台裝置的 "+roster.length+" 個角色上傳到 "+(user.email||"目前帳號")+" 嗎？\n\n同 ID 若雲端已有不同內容會跳過，不會覆蓋。"))return;
  var created=0,linked=0,conflicts=0,failed=0;setStatus("正在上傳本機角色…");
  for(var i=0;i<roster.length;i++){
    var save=localSave(roster[i].id);if(!save)continue;
    try{
      var remote=await provider.getCharacter(user.id,save.id);
      if(remote){
        if(hashSnapshot(remote.snapshot)===hashSnapshot(save)){
          setCharMeta(user.id,save.id,{revision:+remote.revision,lastHash:hashSnapshot(save)});linked++;
        }else conflicts++;
        continue;
      }
      var row=await provider.createCharacter(user.id,save);
      setCharMeta(user.id,save.id,{revision:+row.revision,lastHash:hashSnapshot(save)});created++;
    }catch(e){failed++;}
  }
  statusText="上傳完成：新增 "+created+"、已連結 "+linked+"、衝突跳過 "+conflicts+(failed?"、失敗 "+failed:"");
  statusKind=(failed||conflicts)?"err":"ok";await refreshCloud(false);render();
}
async function downloadCloud(id){
  if(!user||!provider)return;
  try{
    var row=cloudRows.find(function(x){return x.client_character_id===id;})||await provider.getCharacter(user.id,id);
    if(!row)throw new Error("找不到雲端角色");
    var snap=clone(row.snapshot);snap.id=id;
    var existing=localSave(id);
    if(existing&&hashSnapshot(existing)!==hashSnapshot(snap)){
      if(!confirm("這台裝置已有同一角色 ID，但內容不同。\n\n繼續會先建立一份「雲端下載前備份」，再下載雲端版本。"))return;
      backupLocal(existing);
    }
    storeLocalSnapshot(snap);setCharMeta(user.id,id,{revision:+row.revision,lastHash:hashSnapshot(snap)});
    setStatus("已下載雲端角色；若原本有不同內容，已保留本機備份。","ok");
  }catch(e){setStatus(e.message||String(e),"err");}
}
async function deleteCloud(id){
  if(!user||!provider)return;
  var row=cloudRows.find(function(x){return x.client_character_id===id;});
  var name=(row&&row.snapshot&&row.snapshot.meta&&row.snapshot.meta.name)||"該角色";
  if(!confirm("確定刪除雲端的「"+name+"」嗎？\n\n這不會刪除目前裝置的本機角色。"))return;
  try{
    await provider.deleteCharacter(user.id,id);removeCharMeta(user.id,id);
    setStatus("已刪除雲端角色；本機資料未刪除。","ok");await refreshCloud(false);
  }catch(e){setStatus(e.message||String(e),"err");}
}
async function pushLinked(snapshot,uid){
  if(!user||user.id!==uid||!provider||!snapshot||!snapshot.id)return;
  var meta=readMeta(uid)[snapshot.id];if(!meta||!meta.revision)return;
  try{
    var row=await provider.updateCharacterCas(uid,snapshot,+meta.revision);
    if(!row){
      if(user&&user.id===uid)setStatus("「"+(((snapshot.meta||{}).name)||"角色")+"」雲端版本已被其他裝置更新。已停止自動覆蓋；請重新整理雲端並決定要下載或保留本機版本。","err");
      return;
    }
    setCharMeta(uid,snapshot.id,{revision:+row.revision,lastHash:hashSnapshot(snapshot)});
    if(!user||user.id!==uid)return;
    statusText="已同步到雲端";statusKind="ok";render();
  }catch(e){
    if(user&&user.id===uid)setStatus("本機已儲存，但雲端同步失敗；稍後再次修改時會重試："+(e.message||e),"err");
  }
}
function enqueueSync(snapshot){
  if(!user||!provider||!snapshot||!snapshot.id)return;
  var uid=user.id,meta=readMeta(uid)[snapshot.id];if(!meta||!meta.revision)return;
  var id=snapshot.id,chainKey=uid+":"+id,copy=clone(snapshot);clearTimeout(timers.get(chainKey));
  timers.set(chainKey,setTimeout(function(){
    var prev=chains.get(chainKey)||Promise.resolve();
    var next=prev.catch(function(){}).then(function(){return pushLinked(copy,uid);});
    chains.set(chainKey,next);
    next.finally(function(){if(chains.get(chainKey)===next)chains.delete(chainKey);});
  },Math.max(300,+CFG.syncDebounceMs||1200)));
}
function unlinkLocal(id){if(user)removeCharMeta(user.id,id);}
async function init(){
  render();if(!configured())return;
  try{
    var p=await ensureProvider(),session=await p.getSession();user=session&&session.user||null;
    if(unsubscribe)unsubscribe();
    unsubscribe=p.onAuthStateChange(function(session,event){
      if(event==="PASSWORD_RECOVERY")recoveryMode=true;
      user=session&&session.user||null;cloudRows=[];render();
      if(user){
        refreshCloud(false).then(maybePendingUpload).catch(function(e){setStatus(e.message||String(e),"err");});
      }
    });
    render();if(user){await refreshCloud(false);await maybePendingUpload();}
  }catch(e){setStatus("帳號同步初始化失敗；訪客模式仍可正常使用："+(e.message||e),"err");}
}

window.AccountSync={
  init:init,
  onLocalSave:enqueueSync,
  onLocalDelete:unlinkLocal,
  refreshCloud:refreshCloud,
  uploadLocalCharacters:uploadLocalCharacters,
  _debug:{hashSnapshot:hashSnapshot,readMeta:readMeta}
};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();

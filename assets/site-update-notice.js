/* D&D 5R: release notice. Build identity comes from the Pages artifact, never character State. */
(()=>{
 "use strict";
 const meta=document.querySelector('meta[name="dnd5r-build-version"]');
 const current=String(meta?.content||"").trim().toLowerCase();
 const valid=v=>/^[0-9a-f]{40}$/.test(v);
 // Source HTML and preview pages intentionally carry an unexpanded marker.
 if(!valid(current))return;
 const endpoint=new URL("./site-version.json",document.baseURI);
 if(endpoint.origin!==location.origin)return;
 let next="",notice=null,checking=false,applying=false;
 const deferKey=version=>"dnd5r:update-deferred:"+version;
 const deferred=version=>{try{return sessionStorage.getItem(deferKey(version))==="1"}catch{return false}};
 const defer=version=>{try{sessionStorage.setItem(deferKey(version),"1")}catch{}};
 function hide(){
  if(notice){notice.remove();notice=null}
 }
 function show(version){
  if(!valid(version)||version===current||deferred(version))return;
  next=version;
  if(notice)return;
  const box=document.createElement("section");
  box.id="dnd5r-version-notice";
  box.setAttribute("role","status");
  box.setAttribute("aria-label","網站版本更新");
  const title=document.createElement("strong");
  title.textContent="有新版本";
  const desc=document.createElement("p");
  desc.textContent="已推出新版角色卷宗。更新前會先確認目前角色已安全儲存。";
  const error=document.createElement("p");
  error.className="dnd5r-update-error";
  error.setAttribute("role","alert");
  error.hidden=true;
  const actions=document.createElement("div");
  actions.className="dnd5r-update-actions";
  const later=document.createElement("button");
  later.type="button";later.className="dnd5r-update-later";later.textContent="稍後再說";
  later.addEventListener("click",()=>{defer(next);hide()});
  const now=document.createElement("button");
  now.type="button";now.className="dnd5r-update-now";now.textContent="立即更新";
  now.addEventListener("click",async()=>{
   if(applying)return;
   applying=true;
   now.disabled=true;later.disabled=true;
   now.textContent="正在確認存檔…";
   error.hidden=true;
   let safe=false;
   try{
    if(typeof window.DND5RSafeVersionReload==="function"){
     safe=(await window.DND5RSafeVersionReload())===true;
    }else{
     // Home is informational. The creator must have a working save guard.
     safe=document.body.classList.contains("wcs-home");
    }
   }catch{safe=false}
   if(!safe){
    error.textContent="角色資料未能安全儲存，已取消更新。請先確認儲存空間及角色資料。";
    error.hidden=false;now.disabled=false;later.disabled=false;
    now.textContent="再試一次";applying=false;
    return;
   }
   const target=new URL(location.href);
   target.searchParams.set("_dnd5r_build",next.slice(0,12));
   try{window.location.replace(target.href)}
   catch{
    error.textContent="重新載入未成功，請稍後再試。";
    error.hidden=false;now.disabled=false;later.disabled=false;
    now.textContent="再試一次";applying=false;
   }
  });
  actions.append(later,now);
  box.append(title,desc,error,actions);
  document.body.append(box);
  notice=box;
 }
 async function checkNow(){
  if(checking||document.visibilityState==="hidden")return false;
  checking=true;
  try{
   const url=new URL(endpoint.href);
   url.searchParams.set("_",String(Date.now()));
   const response=await fetch(url.href,{cache:"no-store",credentials:"omit"});
   if(!response.ok)return false;
   const body=await response.json();
   const incoming=String(body?.sha||"").toLowerCase();
   if(body?.schemaVersion!==1||!valid(incoming))return false;
   if(incoming===current){next="";hide();return false}
   if(next!==incoming){hide();next=incoming}
   if(!deferred(incoming))show(incoming);
   return incoming!==current;
  }catch{return false}
  finally{checking=false}
 }
 function init(){
  void checkNow();
  window.addEventListener("focus",()=>void checkNow());
  window.addEventListener("pageshow",()=>void checkNow());
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)void checkNow()});
  window.setInterval(()=>{if(!document.hidden)void checkNow()},300000);
 }
 window.DND5RUpdateNotice={checkNow};
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
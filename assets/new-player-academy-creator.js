/* 30｜接回既有 Creator 的極薄導航外掛。
 * 只於 ?academy=1 啟用；不自動選職業、不觸碰 S 或保存 schema。
 * 加在既有 boot()、watercolor-site-bridge.js 後面執行。
 */
(function(){
"use strict";
const params=new URLSearchParams(window.location.search);
if(params.get("academy")!=="1")return;
const bridge=window.DND5RAcademyBridge;
if(!bridge||typeof go!=="function"||typeof S==="undefined")return;
bridge.configure({
 getRuleset:()=>S.ruleset,
 getCreatorStep:()=>S.step,
 hasCharacter:()=>!!S.cls,
 navigateCreator:step=>{go(step);return true;},
 navigateAcademy:url=>{window.location.assign(url);return true;},
 isValidSuggestion:(kind,ref,edition)=>{
  if(edition!=="2024")return false;
  if(kind==="class")return CLASSES.some(c=>c.n===ref);
  if(kind==="background")return BACKGROUNDS_2024.some(b=>b.n===ref);
  if(kind==="species")return SPECIES_2024.some(s=>s.n===ref);
  if(kind==="subclass")return Object.values(PROG_2024).some(p=>p.subs?.some(s=>s.n===ref));
  return false;
 },
 canOpenCreatorStep:()=>true
});
const route=bridge.getRoute();
// The route is validated against the trusted session bridge, not accepted from URL alone.
const queryReturnValid=!!route && params.get("returnURL")==="academy.html" &&
 params.get("returnStep")===route.returnStep;
const main=document.querySelector("main");
const workspace=main?.querySelector(":scope > .workspace");
if(!main||!workspace)return;
const bar=document.createElement("section");
bar.id="academyCreatorReturn";
bar.setAttribute("aria-label","新手學院返回導覽");
bar.style.cssText="border:1px solid #b4a586;background:#f9f3dd;color:#303b30;border-radius:10px;padding:12px 15px;margin:12px 0;line-height:1.75;font-size:15.5px";
const text=document.createElement("span");
text.textContent=S.ruleset==="2014"
 ? "目前是 2014 規則的角色。新手學院採 2024 規則，不會自動轉換或清除角色。"
 : "你正在原本的角色創建工具。教學推薦不會替你確認或覆蓋既有角色。";
bar.append(text);
const action=document.createElement("button");
action.type="button";action.textContent=queryReturnValid&&S.ruleset==="2024"?"← 返回原本的教學位置":"← 回新手學院首頁";
action.style.cssText="display:inline-block;min-height:44px;margin:4px 10px;padding:7px 14px;border-radius:8px;background:#34584d;color:#fff;border:1px solid #24473b;font:inherit;font-weight:700;cursor:pointer";
action.onclick=()=>{
 if(S.ruleset!=="2024"||!queryReturnValid){window.location.assign("./academy.html");return;}
 const out=bridge.returnToAcademy();
 if(!out.ok){text.textContent="返回位置無法驗證，請使用新手學院安全入口。";action.textContent="回新手學院首頁";action.onclick=()=>window.location.assign("./academy.html");}
};
bar.append(action);
// Creator main is a CSS grid: adding a new direct child shifts the rail/workspace/sheet columns.
// Keep the learning return UI inside the canonical workspace, never as a grid item.
workspace.prepend(bar);
if(S.ruleset!=="2024"||!queryReturnValid)return;
if(route.suggestion && route.suggestion.kind==="class" && route.creatorStepId==="creator.class" &&
 CLASSES.some(c=>c.n===route.suggestion.canonicalRef)){
 const selected=route.suggestion.canonicalRef;
 const label=document.createElement("p");
 label.id="academyRecommendedClass";
 label.setAttribute("role","status");
 label.textContent=S.classConfirmed&&S.cls
  ?"測驗推薦："+selected+"。你目前的「"+S.cls.n+"」職業已確認並鎖定，不會被推薦取代。若想嘗試不同職業，請先保存目前角色，使用原站的「新建角色」另建一張角色卡。"
  :"測驗推薦："+selected+"。請在下方自行選擇並按「確定職業」；推薦不會替你完成確認。";
 label.style.cssText="margin:10px 0;padding:8px 11px;border-left:4px solid #806a3b;background:#fffaf0";
 const grid=document.getElementById("classGrid");
 if(grid) {
  grid.before(label);
  const card=[...grid.querySelectorAll("[data-class-name]")].find(c=>c.dataset.className===selected);
  if(card){card.style.outline="3px solid #7b632f";card.style.outlineOffset="2px";card.setAttribute("aria-description",S.classConfirmed?"新手測驗推薦；已確認職業維持鎖定，不會自動更動":"新手測驗推薦；尚未確認職業");}
 }
}
})();

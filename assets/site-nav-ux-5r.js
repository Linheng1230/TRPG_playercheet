/* Global navigation UX: preserve the existing 4-category structure; one reversible history. */
(function(){
"use strict";
const STEP_LABELS=["職業","種族／背景","屬性","技能","詳情","升級","法術","角色卡","速查","法表","購物","跑團狀態"];
const GROUP_START=[0,7,8,11],lastStep=GROUP_START.slice(),history=[];
let restoring=false,lastCharacterId="";
const groupOf=step=>step<=6?0:step===7?1:step<=10?2:3;
const validStep=step=>Number.isInteger(step)&&step>=0&&step<STEP_LABELS.length;
const instant=top=>window.scrollTo({top:Math.max(0,top),behavior:"instant"});

function beforeGo(oldStep,newStep){
 if(!validStep(newStep))return;
 if(validStep(oldStep)&&oldStep!==newStep&&!restoring){
  const entry={step:oldStep,y:Math.max(0,Math.round(window.scrollY))};
  history.push(entry);
  if(history.length>16)history.shift();
 }
 lastStep[groupOf(newStep)]=newStep;
}
function pickGroupStep(steps,current){
 if(steps.includes(current))return current;
 const previous=lastStep[groupOf(steps[0])];
 return steps.includes(previous)?previous:steps[0];
}
function beforeRender(nav){
 const scroller=nav?.querySelector(".nav-secondary");
 return {activeText:scroller?.querySelector("button.active")?.textContent||"",scrollLeft:scroller?.scrollLeft||0};
}
function previousLocation(){
 const entry=history.pop();
 if(!entry||typeof window.go!=="function")return;
 restoring=true;
 try{
  window.go(entry.step);
  instant(entry.y);
 }finally{restoring=false}
 const back=document.querySelector("#stepNav .nav-ux-back");
 if(back)back.disabled=history.length===0;
}
function afterRender(nav,snapshot,step,characterId){
 if(!nav)return;
 const id=String(characterId||"");
 if(id&&lastCharacterId&&id!==lastCharacterId){
  history.length=0;
  GROUP_START.forEach((value,i)=>{lastStep[i]=value});
 }
 if(id)lastCharacterId=id;
 nav.setAttribute("aria-label","網站主要導覽");
 if(validStep(step))lastStep[groupOf(step)]=step;
 nav.querySelectorAll(".nav-primary button,.nav-secondary button").forEach(button=>{
  if(button.classList.contains("active"))button.setAttribute("aria-current","page");
 });
 const secondary=nav.querySelector(":scope > .nav-secondary");
 const strip=document.createElement("div");
 strip.className="nav-ux-strip";
 if(history.length){
  const previous=history[history.length-1];
  const back=document.createElement("button");
  back.type="button";back.className="nav-ux-back";
  back.setAttribute("aria-label","返回剛才的「"+STEP_LABELS[previous.step]+"」及原本閱讀位置");
  back.title="返回剛才的「"+STEP_LABELS[previous.step]+"」及原本閱讀位置";
  back.innerHTML='<span aria-hidden="true">↩</span><span class="nav-ux-back-long">回剛才 · '+STEP_LABELS[previous.step]+'</span><span class="nav-ux-back-short">返回</span>';
  back.addEventListener("click",previousLocation);
  nav.querySelector(".nav-primary")?.prepend(back);
 }
 if(secondary){
  strip.appendChild(secondary);
  const toggle=document.createElement("button");
  toggle.type="button";toggle.className="nav-ux-steps-toggle";
  toggle.textContent="創角步驟 ▾";toggle.setAttribute("aria-expanded","false");
  toggle.setAttribute("aria-controls","stepNavSubmenu");
  secondary.id="stepNavSubmenu";
  nav.querySelector(".nav-primary")?.appendChild(toggle);
  toggle.addEventListener("click",()=>{
   const open=strip.classList.toggle("open");
   toggle.setAttribute("aria-expanded",String(open));
   toggle.textContent=open?"收合步驟 ▴":"創角步驟 ▾";
  });
 }
 if(strip.childElementCount)nav.appendChild(strip);
 if(secondary){
  const active=secondary.querySelector("button.active");
  if(snapshot&&active&&snapshot.activeText===active.textContent){
   secondary.scrollLeft=snapshot.scrollLeft;
  }else if(active){
   const left=active.getBoundingClientRect().left-secondary.getBoundingClientRect().left+secondary.scrollLeft;
   secondary.scrollLeft=Math.max(0,left-(secondary.clientWidth-active.getBoundingClientRect().width)/2);
  }
 }
}
const style=document.createElement("style");
style.textContent=[
 "nav.steps .nav-ux-strip{display:flex;align-items:stretch;min-width:0;background:#342522;border-top:1px solid #60463a}",
 "nav.steps .nav-ux-strip>.nav-secondary{flex:1 1 auto;min-width:0;width:0;overflow-x:auto;border-top:0}",
 "nav.steps .nav-ux-back{display:flex;flex:0 0 auto;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:9px 11px;background:#654237;color:#fff5e3;border-right:1px solid #b19176;font-weight:700;font-size:13px;letter-spacing:0;white-space:nowrap}",
 "nav.steps .nav-ux-back:hover{background:#805044;color:#fff}",
 "nav.steps .nav-ux-back:focus-visible{outline:3px solid #e1b64c;outline-offset:-3px}",
 "nav.steps .nav-ux-back-short{display:none}",
 "@media(max-width:620px){nav.steps .nav-ux-back{padding:8px 9px;gap:4px}nav.steps .nav-ux-back-long{display:none}nav.steps .nav-ux-back-short{display:inline}}",
 "@media print{nav.steps .nav-ux-strip{display:none!important}}"
].join("\n");
document.head.appendChild(style);
window.SiteNavUX5R={beforeGo,pickGroupStep,beforeRender,afterRender};
})();
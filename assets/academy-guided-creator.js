/* 2024 Creator: one shared, dismissible teaching surface.
 * Quiz recommendations preselect ONLY through the original unconfirmed UI, never bypass locks.
 * Character data lives exclusively in S and its canonical save/export paths.
 */
(function(){
"use strict";
if(typeof S==="undefined"||!document.querySelector("main > .workspace"))return;
const params=new URLSearchParams(location.search);
const bridge=window.DND5RAcademyBridge;
const route=bridge?.getRoute?.();
const quizEntry=params.get("academy")==="1" &&
  params.get("returnURL")==="academy.html" &&
  params.get("returnStep")==="quiz.result" &&
  route?.source==="quiz"&&route.returnStep==="quiz.result"&&
  route.creatorStepId==="creator.class"&&route.suggestion?.kind==="class"&&
  route.suggestion.catalogVersion==="2024"&&S.ruleset==="2024";
const classRef=quizEntry&&CLASSES.some(c=>c.n===route.suggestion.canonicalRef)?route.suggestion.canonicalRef:"";
let recommendation=null;
if(classRef){
 try{
  const progress=bridge.restoreProgress();
  const quiz=window.ZIZI_CLASS_FIT_5R;
  const catalog=window.DND5RAcademyCatalog2024;
  if(progress?.questionSetId==="class-fit-5r-v"+quiz?.version &&
    catalog?.edition==="2024"&&progress.answers){
   const result=quiz.evaluate(progress.answers,catalog);
   if(result?.status==="READY") recommendation=result.recommendations.find(r=>r.classRef===classRef)||null;
  }
 }catch(_){/* The quiz metadata is optional; never affect Creator startup. */}
}
const selectedName=classRef;
const order={
 "野蠻人":["str","con","dex","wis","cha","int"],
 "吟遊詩人":["cha","dex","con","wis","int","str"],
 "牧師":["wis","con","str","dex","cha","int"],
 "德魯伊":["wis","con","dex","int","cha","str"],
 "戰士":["str","con","dex","wis","cha","int"],
 "武僧":["dex","wis","con","str","cha","int"],
 "聖武士":["str","cha","con","wis","dex","int"],
 "遊俠":["dex","wis","con","str","int","cha"],
 "遊蕩者":["dex","con","wis","cha","int","str"],
 "術士":["cha","con","dex","wis","int","str"],
 "邪術師":["cha","con","dex","wis","int","str"],
 "法師":["int","con","dex","wis","cha","str"]
};
const labels={str:"力量",dex:"敏捷",con:"體質",int:"智力",wis:"感知",cha:"魅力"};
const valueList=[15,14,13,12,10,8];
const sourceClass=()=>S.cls?.n||(typeof pendingClassChoice!=="undefined"?pendingClassChoice?.n:null);
const canUse=()=>S.ruleset==="2024"&&Number.isInteger(S.step)&&S.step>=0&&S.step<=7;
function plan(){
 const cls=sourceClass(),keys=order[cls];
 if(!keys||keys.length!==6||new Set(keys).size!==6)return null;
 const base=Object.fromEntries(keys.map((k,i)=>[k,valueList[i]]));
 const allowed=Array.isArray(S.bg?.ab)?S.bg.ab:[];
 const bonus2=keys.find(k=>allowed.includes(k));
 const bonus1=keys.find(k=>allowed.includes(k)&&k!==bonus2);
 return {base,bonus2,bonus1,cls};
}
// Only quiz to a NEW, blank class selection. Existing/draft characters are not overwritten.
function preselectClass(){
 if(!selectedName||S.classConfirmed||S.cls||S.bg||S.sp||S.skillsConfirmed)return;
 if(typeof pendingClassChoice!=="undefined"&&pendingClassChoice)return;
 const card=[...document.querySelectorAll("#classGrid [data-class-name]")]
   .find(e=>e.dataset.className===selectedName);
 if(card&&!card.disabled){
  card.click(); // existing Creator sets pendingClassChoice, not S.cls
  requestAnimationFrame(()=>{
   const selected=document.querySelector("#classGrid [data-class-name].selected");
   if(!selected||selected.dataset.className!==selectedName)return;
   const box=selected.getBoundingClientRect();
   if(box.top<100||box.bottom>window.innerHeight-12)
     selected.scrollIntoView({behavior:"instant",block:"center"});
  });
 }
}
// When arriving at origin, preview both selections via original click handlers.
// The player's own earlier choice always takes precedence.
function preselectOrigin(){
 if(!recommendation||!S.classConfirmed||S.cls?.n!==selectedName||S.skillsConfirmed||S.step!==1)return;
 for(const [kind,ref] of [["bg",recommendation.background?.ref],["sp",recommendation.species?.ref]]){
  if(!ref||(kind==="bg"?(S.bg||S.bgConfirmed):(S.sp||S.spConfirmed)))continue;
  const data=kind==="bg"?BACKGROUNDS:SPECIES;
  const grid=document.getElementById(kind==="bg"?"bgGrid":"spGrid");
  const idx=data.findIndex(x=>x.n===ref);
  const card=idx>=0?grid?.children[idx]:null;
  if(card&&card.matches("button")&&!card.disabled)card.click();
 }
}
function badgeSelected(){
 if(!selectedName||S.ruleset!=="2024"||S.step!==0)return;
 const card=[...document.querySelectorAll("#classGrid [data-class-name]")]
   .find(e=>e.dataset.className===selectedName);
 if(!card||!card.classList.contains("selected")||card.querySelector(".academy-quiz-inline-badge"))return;
 const badge=document.createElement("span");
 badge.className="academy-quiz-inline-badge";
 badge.textContent="適性測驗選擇";
 card.append(badge);
}
const workspace=document.querySelector("main > .workspace");
const style=document.createElement("style");
style.textContent=`
.academy-quiz-inline-badge{display:block;color:#396148;font-size:12.5px;font-weight:700;margin:5px auto 0}
#academyGuidedCoach{position:sticky;top:8px;z-index:30;border:1px solid #a69a7c;border-left:5px solid #466a52;border-radius:10px;background:#fcf8ec;color:#28372d;padding:10px 14px;margin:12px auto;max-width:960px;box-shadow:0 3px 14px #302a1d1c;font-family:"Microsoft JhengHei",system-ui,sans-serif;line-height:1.7;font-size:15.5px}
#academyGuidedCoach .coach-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
#academyGuidedCoach strong{font-size:1.03rem}
#academyGuidedCoach .coach-body{margin-top:7px}
#academyGuidedCoach .coach-body p{margin:0}
#academyGuidedCoach.is-collapsed .coach-body{display:none}
#academyGuidedCoach button{min-height:44px;padding:6px 12px;border:1px solid #446756;border-radius:7px;background:transparent;color:#315245;font:inherit;font-weight:700;cursor:pointer}
#academyGuidedCoach button:focus-visible,#academyAbilitySuggestion button:focus-visible{outline:3px solid #1666a2;outline-offset:3px}
#academyAbilitySuggestion{border:1px solid #b7a88a;border-left:4px solid #52745b;background:#fbf5e7;padding:12px 14px;border-radius:9px;margin:12px 0;font-size:15px;line-height:1.7}
#academyAbilitySuggestion p{margin:0 0 8px}
#academyAbilitySuggestion button{min-height:44px;padding:8px 16px;border:1px solid #34594a;border-radius:7px;color:white;background:#34594a;font:inherit;font-weight:700;cursor:pointer}
#academyAbilitySuggestion button:disabled{opacity:.55;cursor:not-allowed}
@media(max-width:600px){#academyGuidedCoach{top:0;padding:8px 11px;font-size:15px}#academyGuidedCoach:not(.is-collapsed){max-height:34vh;overflow:auto}#academyAbilitySuggestion{font-size:15px}}
@media print{#academyGuidedCoach,#academyAbilitySuggestion{display:none!important}}
`;
document.head.append(style);
const guide=document.createElement("aside");
guide.id="academyGuidedCoach";
guide.setAttribute("aria-label","創角逐步教學");
const header=document.createElement("div");header.className="coach-heading";
const heading=document.createElement("strong");heading.id="coachHeading";
const toggle=document.createElement("button");toggle.type="button";toggle.id="academyCoachToggle";
toggle.setAttribute("aria-controls","academyCoachBody");
const body=document.createElement("div");body.id="academyCoachBody";body.className="coach-body";
const message=document.createElement("p");message.id="coachLead";
const info=document.createElement("p");info.id="coachStatus";
info.setAttribute("aria-live","polite");
body.append(message,info);
header.append(heading,toggle);guide.append(header,body);workspace.prepend(guide);
const collapsedKey="dnd5r:creator:coachCollapsed:v1";
let collapsed=!quizEntry;
try{if(!quizEntry&&sessionStorage.getItem(collapsedKey)==="false")collapsed=false;}catch(_){}
function setCollapsed(value){
 collapsed=!!value;guide.classList.toggle("is-collapsed",collapsed);
 toggle.textContent=collapsed?"展開教學":"收起引導";
 toggle.setAttribute("aria-expanded",String(!collapsed));
 try{sessionStorage.setItem(collapsedKey,String(collapsed));}catch(_){}
}
toggle.addEventListener("click",()=>setCollapsed(!collapsed));
setCollapsed(collapsed);
const instructions=[
 "點選職業卡，確認預覽後再按「確定職業」。",
 "選擇背景與物種，完成各自需要的選項後確認。",
 "選擇標準陣列分配六項屬性，背景加值也需要確認。",
 "依職業可選清單，選滿所需技能。",
 "填寫角色資訊，完成必要語言選擇。",
 "升級時查看職業特性與子職業選項；初次創角可先保留 1 級。",
 "施法職業依現有清單選擇法術與戲法。",
 "確認角色資料後，使用原本的儲存與匯出功能。"
];
const titles=["選擇職業","背景與物種","分配屬性","選擇技能","角色資訊","等級與特性","法術","角色卡"];
let updating=false;
function abilityBar(){
 let bar=document.getElementById("academyAbilitySuggestion");
 if(S.step!==2||S.ruleset!=="2024"){
  if(bar)bar.remove();
  return;
 }
 const proposal=plan();
 if(!proposal){
  if(bar)bar.remove();
  return;
 }
 if(!bar){
  bar=document.createElement("section");bar.id="academyAbilitySuggestion";
  bar.setAttribute("aria-label","建議屬性分配");
  document.getElementById("methodTabs")?.after(bar);
 }
 const untouched=S.method==="array"&&!S.abilitiesConfirmed &&
  ABILITIES.every(a=>S.base[a.k]==null);
 const summary=document.createElement("p");
 summary.textContent="建議分配（"+proposal.cls+"）："+
  ABILITIES.map(a=>a.n+" "+proposal.base[a.k]).join("、")+"。";
 const note=document.createElement("p");
 note.textContent=untouched?"可以套用，再自行調整；背景加值依目前背景提供的三項屬性分配。":
  "已有屬性配置或目前非標準陣列，不會覆寫玩家的數值。";
 const button=document.createElement("button");
 button.type="button";button.textContent="套用建議分配";
 button.disabled=!untouched;button.id="academyApplySuggestedAbilities";
 button.addEventListener("click",()=>{
  if(S.ruleset!=="2024"||S.step!==2||S.abilitiesConfirmed||S.method!=="array"||
     !ABILITIES.every(a=>S.base[a.k]==null))return;
  const fresh=plan();if(!fresh)return;
  S.base={...fresh.base};
  if(!Object.values(S.bonus||{}).some(Boolean)&&fresh.bonus2&&fresh.bonus1){
   S.bonusMode="21";
   S.bonus={b2:fresh.bonus2,b1:fresh.bonus1,c1:"",c2:"",c3:""};
  }
  renderBonus();renderAbilities();renderAbilityConfirm();update();
  autoSave();
 });
 bar.replaceChildren(summary,note,button);
}
function update(){
 if(updating)return;
 updating=true;
 try{
  if(!canUse()){guide.hidden=true;abilityBar();return;}
  guide.hidden=false;
  preselectOrigin();
  const step=S.step;
  heading.textContent="創角提示 "+(step+1)+" / 8";
  message.textContent=step===0&&selectedName&&sourceClass()===selectedName?"測驗選擇已帶入職業卡；核對預覽後按「確定職業」。":instructions[step];
  const status=[];
  if(step===1){
   if(S.bg)status.push("背景："+S.bg.n+(S.bgConfirmed?"（已確認）":"（待確認）"));
   if(S.sp)status.push("物種："+S.sp.n+(S.spConfirmed?"（已確認）":"（待確認）"));
  }
  if(step===2&&S.abilitiesConfirmed)status.push("屬性已確認，不會修改。");
  info.hidden=status.length===0;
  info.textContent=status.join("　｜　");
  abilityBar();
  badgeSelected();
 }finally{updating=false;}
}
preselectClass();
const panels=[...document.querySelectorAll(".step-panel")];
const observer=new MutationObserver(()=>requestAnimationFrame(update));
for(const panel of panels)observer.observe(panel,{attributes:true,attributeFilter:["class"]});
document.addEventListener("click",()=>requestAnimationFrame(update),true);
document.addEventListener("change",()=>requestAnimationFrame(update),true);
update();
})();

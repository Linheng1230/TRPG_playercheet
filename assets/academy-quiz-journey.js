/* 新手創角導覽：沿用 20 測驗與 30 Bridge，不維護第二套角色 State。 */
(function(){
"use strict";
const quiz=window.ZIZI_CLASS_FIT_5R;
const catalog=window.DND5RAcademyCatalog2024;
const bridge=window.DND5RAcademyBridge;
const main=document.getElementById("academyContent");
const notice=document.getElementById("academyNotice");
const start=document.getElementById("academyQuiz");
const ready=!!(quiz&&catalog&&bridge&&catalog.edition==="2024"&&typeof quiz.evaluate==="function");
if(!main||!notice||!start)return;
const questions=ready?quiz.questions():[];
const questionSetId=ready?"class-fit-5r-v"+quiz.version:"";
const state={q:0,answers:{}};
const make=(tag,cls,content)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(content!==undefined)node.textContent=String(content);
 return node;
};
const btn=(label,click,cls="academy-button")=>{
 const node=make("button",cls,label);
 node.type="button";
 node.addEventListener("click",click);
 return node;
};
function heading(title,detail) {
 main.replaceChildren();
 const h=make("h2","",title);h.id="academyContentTitle";h.tabIndex=-1;
 main.append(h);
 if(detail)main.append(make("p","academy-caption",detail));
}
function save() {
 const id=state.q>=questions.length?"quiz.result":"quiz.q"+String(state.q+1).padStart(2,"0");
 const result=bridge.saveProgress({v:1,curriculumVersion:"academy-quiz-guide-20261120",activeSource:"quiz",
  academyStepId:id,completedStepIds:[],questionSetId,answers:{...state.answers},updatedAt:Date.now()});
 if(!result.persisted)notice.textContent="目前無法儲存測驗進度，關閉頁面後可能要重新填答。";
}
function focusHeading() {
 const h=document.getElementById("academyContentTitle");
 h?.focus({preventScroll:true});
 window.scrollTo({top:0,behavior:"instant"});
}
function openCreator(ref) {
 const result=bridge.openCreator({v:1,source:"quiz",academyStepId:"quiz.result",
  creatorStepId:"creator.class",returnURL:"./academy.html",returnStep:"quiz.result",
  mode:"suggest",suggestion:{kind:"class",canonicalRef:ref,catalogVersion:"2024"}});
 if(!result.ok)notice.textContent="無法安全開啟創角器（"+result.reason+"）。你的測驗答案仍保留，可再試一次。";
}
function paragraph(parent,title,value) {
 const p=make("p");p.append(make("strong","",title+"："),document.createTextNode(String(value||"自行決定")));
 parent.append(p);
}
function renderResults() {
 const result=quiz.evaluate(state.answers,catalog);
 if(result.status!=="READY") {
  state.q=0;
  heading("職業適性測驗","請先完成測驗，才能顯示具體的推薦。");
  main.append(make("p","academy-warning",result.message||"測驗答案不完整。"));
  main.append(btn("從第一題開始",()=>{save();render(true);}));
  return;
 }
 heading("這三種職業玩法可能適合你","請選一種你最有興趣的玩法。推薦只是方向，不是幫你決定職業。");
 const cards=make("div","academy-grid academy-result-grid");
 for(const r of result.recommendations) {
  const card=make("article","academy-card academy-result-card");
  card.id="academyResult"+r.rank;
  card.append(make("p","rank","推薦 "+r.rank+"｜"+r.label));
  card.append(make("h3","",r.className));
  card.append(make("p","academy-result-role",r.role+"｜新手上手："+r.difficulty));
  card.append(make("p","",r.reasonText));
  paragraph(card,"實際回合",r.actualTurn);
  paragraph(card,"需要留意",r.tradeoff);
  const action=btn("用「"+r.className+"」進入創角器",()=>openCreator(r.classRef));
  action.dataset.action="academy-start-class";
  card.append(action);
  const extra=make("details","academy-result-details");
  extra.append(make("summary","","背景、物種與未來子職業建議"));
  paragraph(extra,"背景方向",r.background?.name+" — "+(r.background?.why||"由你選擇"));
  paragraph(extra,"物種方向",r.species?.name+" — "+(r.species?.why||"由你選擇"));
  paragraph(extra,"3 級子職業參考",r.subclass?.name||"升級時再選");
  extra.append(make("p","academy-caption","這些都不是自動套用；請在正式創角器逐步確認。"));
  card.append(extra);
  cards.append(card);
 }
 main.append(cards);
 main.append(btn("返回測驗，修改答案",()=>{state.q=questions.length-1;save();render(true);},"academy-button secondary"));
}
function renderQuestion() {
 const q=questions[state.q];
 if(!q){heading("無法取得題目","請重新進入測驗。");return;}
 heading("找出自己喜歡的職業玩法","沒有標準答案，選擇你真正想玩的冒險風格。");
 main.append(make("p","academy-progress","第 "+(state.q+1)+" / "+questions.length+" 題"));
 const progress=make("div","academy-meter");
 const fill=make("span");fill.style.width=(100*(state.q+1)/questions.length)+"%";
 progress.setAttribute("aria-hidden","true");progress.append(fill);main.append(progress);
 const panel=make("article","academy-panel");
 panel.append(make("h3","",q.prompt));
 const choices=make("div","academy-choice-list");
 const next=btn(state.q===questions.length-1?"查看三種職業推薦 →":"下一題 →",()=>{
  state.q=Math.min(questions.length,state.q+1);save();render(true);
 });
 next.disabled=!state.answers[q.id];
 q.options.forEach((opt,i)=>{
  const choice=btn(String.fromCharCode(65+i)+"．"+opt.text,()=>{
   state.answers[q.id]=opt.id;
   choices.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===choice)));
   next.disabled=false;save();
  },"academy-choice");
  choice.setAttribute("aria-pressed",String(state.answers[q.id]===opt.id));
  choices.append(choice);
 });
 panel.append(choices);
 const nav=make("div","academy-nav");
 const back=btn("← 上一題",()=>{state.q=Math.max(0,state.q-1);save();render(true);},"academy-button secondary");
 back.disabled=state.q===0;
 nav.append(back,next);panel.append(nav);main.append(panel);
}
function render(focus=false){
 document.body.classList.toggle("academy-show-results",ready&&state.q>=questions.length);
 if(!ready){heading("測驗暫時無法載入","職業資料或安全導覽器未就緒。");main.append(btn("直接進入原創角器",()=>window.location.assign("./index.html?view=creator")));return;}
 if(state.q>=questions.length)renderResults();else renderQuestion();
 if(focus)focusHeading();
}
if(!ready){render();return;}
bridge.configure({
 getRuleset:()=> "2024",getCreatorStep:()=>0,hasCharacter:()=>false,
 isValidSuggestion:(kind,ref,edition)=>edition==="2024"&&kind==="class"&&catalog.classes.some(c=>c.n===ref),
 acceptQuestionSetId:id=>id===questionSetId,
 navigateCreator:(_step,view,route)=>{
  const query=new URLSearchParams({view,academy:"1",returnURL:"academy.html",returnStep:route.returnStep});
  location.assign("./index.html?"+query);return true;
 },
 navigateAcademy:()=>false
});
const restored=bridge.restoreProgress();
if(restored?.questionSetId===questionSetId&&restored.activeSource==="quiz"){
 state.answers={...restored.answers};
 if(restored.academyStepId==="quiz.result")state.q=questions.length;
 else if(/^quiz\.q(0[1-9]|10)$/.test(restored.academyStepId))state.q=Number(restored.academyStepId.slice(-2))-1;
}
const requested=new URLSearchParams(location.search).get("step");
if(requested==="quiz.result"&&Object.keys(state.answers).length===questions.length)state.q=questions.length;
start.addEventListener("click",()=>{state.q=0;state.answers={};notice.textContent="";save();render(true);});
render();
})();

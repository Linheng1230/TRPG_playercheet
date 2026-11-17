/* 30｜D&D 5R 新手學院 UI；消費 00 bridge、10/20/40 模組，不更動 Creator State。 */
(function(){
"use strict";
const lesson=window.ZIZI_NEW_PLAYER_ACADEMY_2024;
const quiz=window.ZIZI_CLASS_FIT_5R;
const practice=window.ZIZI_FIRST_SESSION_TUTORIAL_5R;
const catalog=window.DND5RAcademyCatalog2024;
const bridge=window.DND5RAcademyBridge;
const main=document.getElementById("academyContent"),notice=document.getElementById("academyNotice");
const tabs=document.getElementById("academyTabs");
const questionSetId=quiz ? "class-fit-5r-v"+quiz.version : "";
const sourceReady=!!(lesson&&quiz&&practice&&catalog&&bridge&&lesson.ruleset==="2024"&&catalog.edition==="2024");
const lessonIds=sourceReady?lesson.lessonOrder:[];
const state={section:"lesson",lessonIndex:0,q:0,answers:{},completed:[],
  scenario:-1,practiceStep:0,practiceChoice:null};
const $=(tag,cls,value)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(value!=null)e.textContent=String(value);return e;
};
const put=(parent,...nodes)=>{nodes.forEach(n=>parent.append(n));return parent;};
function line(parent,label,value) {
 const row=$("p");
 put(row,$("strong","",label),document.createTextNode(" "+String(value||"")));
 parent.append(row);return row;
}
function button(label,fn,cls="academy-button",disabled=false) {
 const b=$("button",cls,label);b.type="button";b.disabled=disabled;b.addEventListener("click",fn);return b;
}
function link(label,href,cls="academy-button") {
 const a=$("a",cls,label);a.href=href;return a;
}
function msg(text){notice.textContent=text||"";}
function goFocus() {
 const heading=document.getElementById("academyContentTitle");
 if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 window.scrollTo({top:0,behavior:"instant"});
}
function stepId() {
 if(state.section==="lesson")return lessonIds[state.lessonIndex]||"lesson.welcome";
 if(state.section==="quiz")return state.q>=quiz.questions().length?"quiz.result":"quiz.q"+String(state.q+1).padStart(2,"0");
 if(state.section==="practice"){
  if(state.scenario===-1)return "practice.intro";
  if(state.practiceChoice==="review")return "practice.review";
  if(state.practiceStep===0&&state.scenario===0)return "practice.intro";
  return state.scenario===2?"practice.turn-choice":"practice.ability-check";
 }
 return "lesson.welcome";
}
function progress() {
 return {v:1,curriculumVersion:"academy-v1",activeSource:state.section,
  academyStepId:stepId(),completedStepIds:state.completed.slice(),
  questionSetId,answers:{...state.answers},updatedAt:Date.now()};
}
function remember() {
 const saved=bridge.saveProgress(progress());
 if(!saved.persisted)msg("提醒：這個瀏覽器目前無法保存進度；本頁仍可繼續操作，但關閉後可能遺失答案。");
}
function section(id) {
 state.section=id;
 if(id==="practice"){state.practiceChoice=null;state.scenario=-1;}
 remember();render(true);
}
function routeToCreator(creatorStepId,source,id,mode="inspect",suggestion) {
 const route={v:1,source,academyStepId:id,creatorStepId,
  returnURL:"./academy.html",returnStep:id,mode};
 if(suggestion)route.suggestion=suggestion;
 const output=bridge.openCreator(route);
 if(!output.ok)msg(output.reason==="edition-2014"?"偵測到 2014 角色，教學只支援 2024；不會自動切換或清除角色。請回到原角色頁。":
  output.reason==="session-storage-unavailable"?"瀏覽器無法保存返回位置；為保護原角色，暫不執行跨頁跳轉。":
  "目前無法安全進入創角頁（"+output.reason+"）；請稍後使用熟手入口。");
}
function heading(text,desc) {
 main.replaceChildren();put(main,$("h2","",text));
 main.lastChild.id="academyContentTitle";
 if(desc)main.append($("p","academy-caption",desc));
 tabs.querySelectorAll("button[data-tab]").forEach(b=>{
  b.setAttribute("aria-current",b.dataset.tab===state.section?"page":"false");
 });
}
function navigation(back,next) {
 const bar=$("div","academy-nav");
 if(back)bar.append(button("← 上一步",back,"academy-button secondary"));
 if(next)bar.append(button("下一步 →",next));
 return bar;
}
function renderLesson() {
 const item=lesson.lessons.find(l=>l.id===lessonIds[state.lessonIndex]);
 if(!item){msg("教學內容有更新，已回到新手入口。");state.lessonIndex=0;return renderLesson();}
 heading(item.title,"第 "+(state.lessonIndex+1)+" / "+lessonIds.length+" 章｜"+item.summary);
 const panel=$("article","academy-panel academy-lesson");
 const guide=lesson.guides?.[item.id];
 if(guide){
  const intro=$("section","academy-learning-goal");
  put(intro,$("h3","","這一章你會學到"),$("p","",guide.goal));
  panel.append(intro);
  const how=$("section","academy-instruction");
  how.append($("h3","","照著這三步試一次"));
  const ordered=$("ol","academy-steps");
  for(const step of guide.steps){
   const li=$("li");put(li,$("strong","",step.title),$("p","",step.detail));ordered.append(li);
  }
  how.append(ordered);panel.append(how);
  const sample=$("section","academy-walkthrough");
  put(sample,$("h3","","實際示範"),$("p","",guide.worked));
  panel.append(sample);
  const exercise=$("section","academy-understanding");
  exercise.setAttribute("aria-label","本章理解練習");
  put(exercise,$("h3","","你來判斷看看"),$("p","",guide.question));
  const choiceList=$("div","academy-understanding-options");
  const response=$("p","academy-understanding-feedback");
  response.setAttribute("role","status");response.setAttribute("aria-live","polite");
  for(const option of guide.options){
   const btn=button(option.text,()=>{
    for(const sibling of choiceList.querySelectorAll("button"))sibling.setAttribute("aria-pressed","false");
    btn.setAttribute("aria-pressed","true");
    response.textContent=option.feedback;
    response.classList.toggle("is-correct",!!option.correct);
    response.classList.toggle("is-incorrect",!option.correct);
   },"academy-choice");
   btn.setAttribute("aria-pressed","false");
   choiceList.append(btn);
  }
  put(exercise,choiceList,response,$("p","academy-caption",guide.exit));
  panel.append(exercise);
 }
 const more=$("details","academy-further-reading");
 const summary=$("summary","","延伸閱讀：本章名詞與規則說明（"+(item.topicIds||[]).length+" 則）");
 more.append(summary);
 for(const id of item.topicIds||[]){
  const topic=lesson.topics.find(t=>t.id===id);if(!topic)continue;
  const body=$("section","academy-topic");
  put(body,$("h3","",topic.title),$("p","",topic.summary),$("p","academy-example",topic.example));
  if(topic.nextAction?.creatorStepId)body.append(button(topic.nextAction.label||"到創角試試",
   ()=>routeToCreator(topic.nextAction.creatorStepId,"lesson",item.id,topic.nextAction.mode||"inspect"),"academy-button secondary"));
  more.append(body);
 }
 panel.append(more);
 const actions=$("div","academy-toolbar");
 actions.append(button(item.nextAction?.label||"前往創角查看",
  ()=>routeToCreator(item.nextAction?.creatorStepId||"creator.class","lesson",item.id,item.nextAction?.mode||"inspect")));
 actions.append(button("我想先做職業測驗",()=>section("quiz"),"academy-button secondary"));
 panel.append($("p","academy-caption","可先讀完並練習，再到原本的創角頁實際操作；不會自動更改角色資料。"));
 panel.append(actions);
 const last=state.lessonIndex===lessonIds.length-1;
 panel.append(navigation(state.lessonIndex>0?()=>{state.lessonIndex--;remember();render(true);}:null,()=>{
  if(!state.completed.includes(item.id))state.completed.push(item.id);
  if(last){state.scenario=-1;state.practiceStep=0;section("practice");}
  else{state.lessonIndex++;remember();render(true);}
 }));
 main.append(panel);
}
function quizResult() {
 const result=quiz.evaluate(state.answers,catalog);
 heading("找出三種你可能喜歡的職業玩法","這不是能力高低排名，也不會替你改動角色。先看每種職業在一回合會做什麼，再選一個去原站親自確認。");
 if(result.status!=="READY"){
  main.append($("div","academy-warning",result.message||"推薦資料不足。"));
  main.append(button("重新作答",()=>{state.q=0;remember();render(true);}));
  return;
 }
 const cards=$("div","academy-grid academy-result-grid");
 for(const r of result.recommendations){
  const card=$("article","academy-card academy-result-card");
  card.id="academyResult"+r.rank;
  const title=$("h3","",r.className);title.tabIndex=-1;
  put(card,$("p","rank","推薦 "+r.rank+"｜"+r.fitLabel),title,
   $("p","academy-result-role",r.role+"｜上手難度："+r.difficulty));
  const answers=(r.reasons||[]).map(d=>d.answer).filter(Boolean).slice(0,2);
  if(answers.length)line(card,"你選過的偏好：",answers.map(x=>"「"+x+"」").join("、"));
  line(card,"實際輪到你時：",r.actualTurn);
  line(card,"需要留意：",r.tradeoff);
  const actions=$("div","academy-actions");
  const step="quiz.result";
  const cta=button("去創角頁選擇這個職業",()=>routeToCreator("creator.class","quiz",step,"suggest",
    {kind:"class",canonicalRef:r.classRef,catalogVersion:"2024"}));
  cta.dataset.action="academy-start-class";
  actions.append(cta);card.append(actions);
  const more=$("details","academy-result-details");
  more.append($("summary","","延伸建議：3 級子職業、背景與物種"));
  if(r.subclass) {
   line(more,"3 級可考慮的子職業：",r.subclass.name+"（"+r.subclass.theme+"）");
   more.append($("p","academy-caption","現在只是在了解方向，3 級才正式選子職業；完整特性仍以原站規則為準。"));
  }
  if(r.background) {
   line(more,"背景建議：",r.background.name);
   more.append($("p","academy-caption",r.background.why||"可在創角時自行比較背景的屬性與起源專長。"));
  }
  if(r.species) {
   line(more,"物種建議：",r.species.name);
   more.append($("p","academy-caption","2024 物種不提供屬性加值，你可以自由選喜歡的故事與特質。"));
  }
  more.append(button("前往角色百科查完整規則",()=>routeToCreator("reference.characters","quiz",step,"inspect"),"academy-button secondary"));
  card.append(more);
  cards.append(card);
 }
 main.append(cards);
 main.append($("p","academy-caption","如果三個都不喜歡，可以重新測驗，也可以直接到創角頁看其他職業。"));
 main.append(button("重新測驗，修改答案",()=>{state.q=0;remember();render(true);},"academy-button secondary"));
 main.append(navigation(()=>{state.q=9;remember();render(true);},()=>section("practice")));
}

function renderQuiz() {
 const questions=quiz.questions();
 if(state.q>=questions.length)return quizResult();
 const q=questions[state.q];
 heading("找出你喜歡的職業玩法","職業適性測驗沒有正確答案。依直覺選擇，之後可以回上一題修改。");
 main.append($("p","academy-progress","第 "+(state.q+1)+" / "+questions.length+" 題"));
 const meter=$("div","academy-meter");meter.setAttribute("aria-hidden","true");
 const fill=$("span");fill.style.width=(100*(state.q+1)/questions.length)+"%";meter.append(fill);main.append(meter);
 const panel=$("article","academy-panel");
 panel.append($("h3","",q.prompt));
 const options=$("div","academy-choice-list");
 q.options.forEach((opt,j)=>{
  const selected=state.answers[q.id]===opt.id;
  const b=button(" "+String.fromCharCode(65+j)+"．"+opt.text,()=>{
   state.answers[q.id]=opt.id;
   remember();render(false);
  },"academy-choice");
  b.setAttribute("aria-pressed",String(selected));
  options.append(b);
 });
 panel.append(options);
 const actions=$("div","academy-nav");
 actions.append(button("← 上一題",()=>{
  if(state.q===0)section("lesson");
  else{state.q--;remember();render(true);}
 },"academy-button secondary"));
 actions.append(button(state.q===questions.length-1?"查看三組推薦 →":"下一題 →",()=>{
  if(state.q===questions.length-1){state.q=questions.length;state.completed.push("quiz.review");}
  else state.q++;
  remember();render(true);
 },"academy-button",!state.answers[q.id]));
 actions.append(button("跳過測驗，直接創角",()=>routeToCreator("creator.class","quiz",stepId()),"academy-button ghost"));
 panel.append(actions);
 main.append(panel);
}
function practiceIntro() {
 const intro=$("div","academy-panel");
 intro.append($("p","",practice.meta.description+" "+practice.meta.disclaimer));
 const topics=$("details");
 const summary=$("summary","", "先學跑團最常見的操作（共 "+practice.topics.length+" 則）");
 topics.append(summary);
 for(const t of practice.topics) {
  const row=$("section","academy-topic");
  put(row,$("h3","",t.title),$("p","",t.summary),$("p","academy-example",t.example),$("p","academy-caption",t.nextAction));
  topics.append(row);
 }
 intro.append(topics);
 const choices=$("div","academy-grid");
 practice.scenarios.forEach((scenario,i)=>{
  const card=$("article","academy-card");
  put(card,$("h3","",scenario.title),$("p","",scenario.intro));
  card.append(button("開始這段情境",()=>{state.scenario=i;state.practiceStep=0;state.practiceChoice=null;remember();render(true);}));
  choices.append(card);
 });
 intro.append(choices);
 main.append(intro);
}
function renderPractice() {
 if(state.scenario===-1){heading("第一次跑團：先學會如何行動","不需要自己先決定要骰什麼；先說角色的目標和做法，再由 DM 裁定。");practiceIntro();return;}
 const scenario=practice.scenarios[state.scenario];
 if(!scenario){state.scenario=0;return renderPractice();}
 const step=scenario.steps[state.practiceStep];
 heading("第一次跑團：情境選擇題",scenario.title+"｜"+scenario.intro);
 if(!step){return practiceIntro();}
 const panel=$("article","academy-panel");
 put(panel,$("p","academy-progress","第 "+(state.practiceStep+1)+" / "+scenario.steps.length+" 題"),
   $("h3","",step.title),$("p","",step.prompt));
 const choices=$("div","academy-choice-list");
 for(const c of step.choices) {
  const b=button(c.label,()=>{state.practiceChoice=c.id;remember();render(false);},"academy-choice");
  b.setAttribute("aria-pressed",String(state.practiceChoice===c.id));
  choices.append(b);
 }
 panel.append(choices);
 if(state.practiceChoice) {
  const feedback=practice.getFeedback(scenario.id,step.id,state.practiceChoice);
  if(feedback) {
   const box=$("div","academy-topic");
   put(box,$("h3","",feedback.title),$("p","",feedback.body));
   box.setAttribute("role","status");
   panel.append(box);
  }
 }
 const actions=$("div","academy-nav");
 actions.append(button("← 上一題",()=>{
  if(state.practiceStep>0)state.practiceStep--;
  else{state.practiceChoice=null;section("lesson");return;}
  state.practiceChoice=null;remember();render(true);
 },"academy-button secondary"));
 actions.append(button("下一題 →",()=>{
  if(state.practiceStep<scenario.steps.length-1){state.practiceStep++;state.practiceChoice=null;}
  else {state.practiceStep=0;state.practiceChoice=null;state.scenario=(state.scenario+1)%practice.scenarios.length;}
  remember();render(true);
 },"academy-button",!state.practiceChoice));
 actions.append(button("回到創角",()=>routeToCreator("creator.sheet","practice",stepId()),"academy-button ghost"));
 panel.append(actions);main.append(panel);
 main.append($("p","academy-status","這裡只提供回饋，沒有擲骰、扣生命值或更動法術位。"));
}
function render(focus) {
 if(bridge?.getProgressPersistence?.())msg("");
 if(!sourceReady){
  heading("教材尚未準備完成","目前無法安全載入 2024 完整學院資料。");
  main.append(link("直接使用既有創角系統","./index.html?view=creator"));
  msg("新手教材或合法來源資料未載入。為避免錯誤推薦，已停止測驗。");
  return;
 }
 if(state.section==="lesson")renderLesson();
 else if(state.section==="quiz")renderQuiz();
 else renderPractice();
 if(focus)goFocus();
}
if(!sourceReady){render(false);return;}
const official=bridge.configure({
 getRuleset:()=> "2024",
 getCreatorStep:()=>0,
 hasCharacter:()=>false,
 isValidSuggestion:(kind,ref,edition)=>{
  if(edition!=="2024")return false;
  if(kind==="class")return catalog.classes.some(c=>c.n===ref);
  if(kind==="background")return catalog.backgrounds.some(b=>b.n===ref);
  if(kind==="species")return catalog.species.some(s=>s.n===ref);
  if(kind==="subclass")return Object.values(catalog.progression).some(c=>c.subs.some(s=>s.n===ref));
  return false;
 },
 acceptQuestionSetId:id=>id===questionSetId,
 navigateCreator:(_step,view,route)=>{
  const params=new URLSearchParams({view,academy:"1",returnURL:"academy.html",returnStep:route.returnStep});
  window.location.assign("./index.html?"+params.toString());return true;
 },
 navigateAcademy:()=>false
});
const restored=official.restoreProgress();
if(restored) {
 state.completed=restored.completedStepIds.slice();
 state.answers=restored.answers||{};
 state.section=restored.activeSource;
 const id=restored.academyStepId;
 if(state.section==="lesson")state.lessonIndex=Math.max(0,lessonIds.indexOf(id));
 if(state.section==="quiz")state.q=id==="quiz.result"?10:Math.max(0,Number((id.match(/^quiz\.q(\d+)$/)||[])[1]||1)-1);
}
const query=new URLSearchParams(window.location.search);
const desired=query.get("step");
let unknownStep=false;
if(desired) {
 if(lessonIds.includes(desired)){state.section="lesson";state.lessonIndex=lessonIds.indexOf(desired);}
 else if(desired==="quiz.result"){state.section="quiz";state.q=10;}
 else if(desired==="quiz.intro"||desired==="quiz.review"){state.section="quiz";state.q=0;}
 else if(/^quiz\.q(0[1-9]|10)$/.test(desired)){state.section="quiz";state.q=Number(desired.slice(-2))-1;}
 else if(["practice.intro","practice.ability-check","practice.turn-choice","practice.spell-choice","practice.review"].includes(desired)){state.section="practice";state.scenario=-1;state.practiceStep=0;}
 else {state.section="lesson";state.lessonIndex=0;unknownStep=true;}
}
document.getElementById("academyBegin").addEventListener("click",()=>{state.section="lesson";state.lessonIndex=0;remember();render(true);});
document.getElementById("academyQuiz").addEventListener("click",()=>section("quiz"));
tabs.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>section(b.dataset.tab)));
render(!!desired);
if(unknownStep)msg("教材已更新，請重新選擇章節；目前顯示新手入口。");
})();

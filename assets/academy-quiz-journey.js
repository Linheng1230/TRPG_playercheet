/* 新手創角導覽：沿用 20 測驗與 30 Bridge，不維護第二套角色 State。 */
(function(){
"use strict";
const quiz=window.ZIZI_CLASS_FIT_5R;
const catalog=window.DND5RAcademyCatalog2024;
const bridge=window.DND5RAcademyBridge;
// 30 presentation-only humour: source quiz's A/B/C/D IDs and scoring remain untouched.
const DIALOGUE = Object.freeze([
  {
    "q": "Q1",
    "prompt": "敵人衝過來了！第一句你想喊什麼？",
    "lines": [
      "你們先退後！這裡我來扛！",
      "他露出破綻了！先解決最危險的那個！",
      "等等，我先想辦法讓敵人動不了！",
      "你們放心上，我負責讓大家撐得住！"
    ]
  },
  {
    "q": "Q2",
    "prompt": "輪到你了！哪種回合讓你最有成就感？",
    "lines": [
      "花招就免了，我每回合都要穩穩出手！",
      "我先繞到側面，等他露出空隙！",
      "讓我看一下戰況……這個法術剛剛好！",
      "武器先上，魔法留著補關鍵的一手！"
    ]
  },
  {
    "q": "Q3",
    "prompt": "對你來說，魔法最好是什麼存在？",
    "lines": [
      "魔法？不了，我靠練出來的真本事！",
      "平常靠武器，危急時才秀一下魔法！",
      "我想常常施法，也想保留一點近戰本事。",
      "拜託，讓我把整場戰鬥變成魔法秀！"
    ]
  },
  {
    "q": "Q4",
    "prompt": "隊友快被打倒了！你會怎麼做？",
    "lines": [
      "衝我來！別碰我的隊友！",
      "敢動他？我先去處理最危險的敵人！",
      "先別讓他出手！我試著控住場面！",
      "撐住！我先治療、掩護，幫你撤退！"
    ]
  },
  {
    "q": "Q5",
    "prompt": "冒險不是只有打架，你想負責什麼？",
    "lines": [
      "讓我跟酒館老闆談，搞不好還能殺價！",
      "鎖和陷阱？先讓我偷偷研究一下。",
      "腳印還很新，我帶大家找到方向！",
      "這古老符文……我好像在書裡看過！"
    ]
  },
  {
    "q": "Q6",
    "prompt": "如果有人問你的力量從哪來，你怎麼回答？",
    "lines": [
      "我每天苦練，可不是靠運氣變強的！",
      "我的力量來自信念、自然，或我立下的誓約！",
      "這力量本來就在我體內，現在才學會駕馭！",
      "我研究過奧祕……也可能跟神祕存在談了條件。"
    ]
  },
  {
    "q": "Q7",
    "prompt": "自己的招牌能力，你喜歡怎麼安排？",
    "lines": [
      "不用算一堆資源，我就愛可靠又常用的招式！",
      "我的大招次數不多，要留給最關鍵的一刻！",
      "法術位有限，現在該花幾環才划算？",
      "先準備好不同法術，遇到什麼就挑哪招！"
    ]
  },
  {
    "q": "Q8",
    "prompt": "最理想的戰鬥回合，對你來說像什麼？",
    "lines": [
      "簡單可靠就好，我想一眼知道自己能做什麼！",
      "讓我找好位置，抓準時機再出手！",
      "等等，我先把接下來三步都想好。",
      "照劇本太無聊了，我想試試出人意料的招式！"
    ]
  },
  {
    "q": "Q9",
    "prompt": "升到 3 級後，你最想往哪個方向發展？",
    "lines": [
      "我要練成一出手就很有存在感的武藝高手！",
      "可以有野獸夥伴、變身，或操控大自然嗎？",
      "我想成為大家遇到危機時會想到的守護者！",
      "幻術、異能、神祕魔法？聽起來太棒了！"
    ]
  },
  {
    "q": "Q10",
    "prompt": "冒險開始前，你過著哪種生活比較有趣？",
    "lines": [
      "我曾是軍人或守衛，訓練可是很扎實的！",
      "圖書館就是我第二個家，筆記比行李還多！",
      "比起城市，我更熟荒野裡的路。",
      "走南闖北混過生活，表演或街頭求生都難不倒我。"
    ]
  }
]);
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
 const tone=DIALOGUE[state.q]?.q===q.id&&q.options.length===4?DIALOGUE[state.q]:null;
 panel.append(make("h3","",tone?.prompt||q.prompt));
 if(tone)panel.append(make("p","academy-caption","原題意："+q.prompt+"。趣味台詞只是角色想法，不代表職業一定能做到。"));
 const choices=make("div","academy-choice-list");
 const next=btn(state.q===questions.length-1?"查看三種職業推薦 →":"下一題 →",()=>{
  state.q=Math.min(questions.length,state.q+1);save();render(true);
 });
 next.disabled=!state.answers[q.id];
 q.options.forEach((opt,i)=>{
  const choice=btn(String.fromCharCode(65+i)+"．"+(tone?.lines[i]||opt.text),()=>{
   state.answers[q.id]=opt.id;
   choices.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===choice)));
   next.disabled=false;save();
  },"academy-choice");
  choice.setAttribute("aria-pressed",String(state.answers[q.id]===opt.id));
  if(tone)choice.append(make("span","academy-quiz-meaning","玩法偏好："+opt.text));
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

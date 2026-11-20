/* 新手創角就地引導：僅讀取既有 S，永不確認、代選或儲存角色。 */
(function(){
"use strict";
const params=new URLSearchParams(location.search);
if(params.get("academy")!=="1")return;
const bridge=window.DND5RAcademyBridge;
if(!bridge||typeof S==="undefined"||S.ruleset!=="2024")return;
const route=bridge.getRoute();
if(!route||route.source!=="quiz"||route.creatorStepId!=="creator.class"||
 params.get("returnURL")!=="academy.html"||params.get("returnStep")!==route.returnStep||
 route.returnStep!=="quiz.result")return;
const back=document.getElementById("academyCreatorReturn");
const host=back?.parentElement;
if(!host)return;
const definitions=[
 {title:"選擇職業",short:"找到推薦的職業卡，閱讀能力後自行點選，再按「確定職業」。",selector:"#classGrid",
  detail:"職業決定你擅長什麼、生命骰和可選技能。推薦只供參考，正式確認後會被鎖定。",completed:()=>!!S.classConfirmed},
 {title:"選擇背景與物種",short:"先選背景、確認，再選物種、確認；兩者都是起源的一部分。",selector:"#bgGrid",
  detail:"2024 背景提供屬性加值方向、起源專長及熟練；物種提供獨特特性，不直接提供屬性加值。別漏掉各自的確定按鈕與額外選項。",
  completed:()=>!!(S.bgConfirmed&&S.spConfirmed)},
 {title:"分配六項屬性",short:"新手可以選「標準陣列」，分配六項屬性，再設定背景提供的加值並確認。",selector:"#methodTabs",
  detail:"先把高數值放在職業最需要的屬性。屬性分數與調整值不同；例如 16 的調整值是 +3。記得按原創角器的「確定屬性」。",
  completed:()=>!!S.abilitiesConfirmed},
 {title:"選擇技能熟練",short:"在現有技能清單中選滿規定數量，再按「最終確認技能」。",selector:"#skillGrid",
  detail:"有熟練才加熟練加值；選擇仍由職業、背景與物種規則限制。別把技能多選或重複來源當成額外加值。",
  completed:()=>!!S.skillsConfirmed},
 {title:"填寫角色資訊與語言",short:"填角色姓名，查看語言選項並完成原創角器的確認。",selector:"#fName",
  detail:"角色個性、陣營與背景故事可以慢慢補；語言及其他必填選項需按現有介面確認。這裡不會替你填入任何資料。"},
 {title:"確認等級與職業特性",short:"初次遊玩建議先保留 1 級；只有要升級時才操作這頁。",selector:"#lvlBody",
  detail:"2024 全部職業在 3 級選擇子職業。此處的實際升級與能力取得完全由原系統計算。"},
 {title:"查看或選擇法術",short:"施法職業要依現有清單選戲法與法術；不施法的職業可繼續。",selector:"#spellBody",
  detail:"留意施法時間、射程、法術位與專注。是否需要選法術及可選數量由你目前的職業與等級決定。"},
 {title:"檢查並儲存角色卡",short:"核對生命值、AC、裝備、特性與法術，再用原本功能保存或匯出。",selector:".fs-toolbar",
  detail:"JSON 與 PDF 照原有功能操作；本引導完全不接觸儲存、匯出和角色資料。"}
];
const style=document.createElement("style");
style.textContent=`
#academyGuidedCoach{position:sticky;top:8px;z-index:30;border:1px solid #a69a7c;border-left:5px solid #466a52;border-radius:11px;background:#fcf8ec;color:#28372d;padding:12px 15px;margin:12px auto;max-width:960px;box-shadow:0 4px 18px #302a1d26;font-family:"Microsoft JhengHei",system-ui,sans-serif;line-height:1.7;font-size:15.5px}
#academyGuidedCoach strong{font-size:1.08rem}
#academyGuidedCoach p{margin:4px 0}
#academyGuidedCoach .coach-meta{color:#586250;font-size:.86rem}
#academyGuidedCoach .coach-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}
#academyGuidedCoach button{min-height:44px;padding:8px 12px;border:1px solid #446756;border-radius:8px;background:#34584c;color:#fff;font:inherit;font-weight:700;cursor:pointer}
#academyGuidedCoach button.coach-secondary{background:transparent;color:#315245}
#academyGuidedCoach button:focus-visible{outline:3px solid #1666a2;outline-offset:3px}
#academyGuidedCoach details{margin-top:6px;font-size:.92rem}
#academyGuidedCoach summary{cursor:pointer;font-weight:700}
#academyGuidedCoach.is-collapsed .coach-body{display:none}
@media(max-width:600px){#academyGuidedCoach{top:0;padding:10px 12px;max-height:41vh;overflow:auto;font-size:15px}}
@media print{#academyGuidedCoach{display:none!important}}
`;
document.head.append(style);
const guide=document.createElement("aside");
guide.id="academyGuidedCoach";
guide.setAttribute("aria-label","新手創角逐步引導");
const header=document.createElement("strong");
header.id="coachHeading";
const body=document.createElement("div");body.className="coach-body";
const lead=document.createElement("p");lead.id="coachLead";
const status=document.createElement("p");status.className="coach-meta";status.id="coachStatus";status.setAttribute("aria-live","polite");
const more=document.createElement("details");
const moreTitle=document.createElement("summary");moreTitle.textContent="為什麼要這樣填？";
const moreText=document.createElement("p");more.id="coachMore";
more.append(moreTitle,moreText);
const actions=document.createElement("div");actions.className="coach-actions";
const locate=document.createElement("button");locate.type="button";locate.textContent="找到這一步的欄位";
const close=document.createElement("button");close.type="button";close.className="coach-secondary";close.textContent="收起引導";
body.append(lead,status,more,actions);actions.append(locate,close);
const returnButton=back.querySelector("button");
if(returnButton){
 returnButton.textContent="← 回推薦結果";
 returnButton.className="coach-secondary";
 returnButton.style.cssText="";
 actions.append(returnButton);
 back.hidden=true;back.style.display="none";
}
guide.append(header,body);back.after(guide);
let collapsed=false,previous="";
const suggested=route.suggestion?.kind==="class"?route.suggestion.canonicalRef:"";
function stepNumber(){return Number.isInteger(S.step)?S.step:0;}
function update(){
 if(S.ruleset!=="2024"){guide.hidden=true;return;}
 guide.hidden=false;
 const step=stepNumber();
 const data=definitions[step];
 const key=[step,S.classConfirmed,S.bgConfirmed,S.spConfirmed,S.abilitiesConfirmed,S.skillsConfirmed,S.cls?.n].join("|");
 if(previous===key)return;
 previous=key;
 if(!data){header.textContent="新手引導｜目前在其他功能頁";lead.textContent="可以回到創角流程，或使用上方按鈕返回測驗。";status.textContent="";moreText.textContent="";locate.disabled=true;return;}
 locate.disabled=false;
 header.textContent="新手創角 "+(step+1)+" / 8｜"+data.title;
 let message=data.short;
 if(step===0&&suggested)message="你的測驗推薦是「"+suggested+"」。"+message;
 if(step===0&&S.classConfirmed&&S.cls?.n!==suggested&&suggested)
  message="你已確認「"+S.cls.n+"」，推薦「"+suggested+"」不會覆寫已鎖定職業。若要改用其他職業，請先保存原角色，再透過原站新建角色。";
 lead.textContent=message;
 status.textContent=data.completed?(data.completed()?"這一步已在原創角器確認。":"尚未完成原創角器的必要確認。"):"請按照原創角器目前顯示的選項操作。";
 moreText.textContent=data.detail;
 more.open=false;
}
locate.addEventListener("click",()=>{
 const step=stepNumber(),data=definitions[step];
 const target=document.querySelector(data?.selector||"")||document.querySelector(".step-panel.active");
 if(!target)return;
 target.scrollIntoView({behavior:"smooth",block:"start"});
 if(target instanceof HTMLElement){target.setAttribute("tabindex","-1");target.focus({preventScroll:true});}
});
close.addEventListener("click",()=>{
 collapsed=!collapsed;
 guide.classList.toggle("is-collapsed",collapsed);
 close.textContent=collapsed?"展開新手引導":"收起引導";
 if(collapsed)guide.append(close);else actions.append(close);
});
const panels=[...document.querySelectorAll(".step-panel")];
const observer=new MutationObserver(()=>requestAnimationFrame(update));
panels.forEach(panel=>observer.observe(panel,{attributes:true,attributeFilter:["class"]}));
document.addEventListener("click",()=>requestAnimationFrame(update),true);
update();
})();

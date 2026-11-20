/* D&D 2024 running-state helper: canonical condition IDs, local persistent state only. */
(function(root){
"use strict";
const DEFINITIONS=[
["blinded","目盲","視線相關的檢定自動失敗；攻擊檢定有劣勢，對你的攻擊有優勢。"],
["charmed","魅惑","不能攻擊魅惑者，也不能以傷害性能力或魔法效果針對魅惑者；魅惑者與你社交互動的屬性檢定有優勢。"],
["deafened","耳聾","需要聽覺的屬性檢定自動失敗。"],
["exhaustion","力竭","每級 D20 檢定減 2，速度每級減少 5 呎；達 6 級死亡。長休後依規則可降低 1 級。"],
["frightened","恐慌","恐懼來源在視線內時，屬性檢定與攻擊檢定有劣勢；不能自願靠近來源。"],
["grappled","擒抱","速度為 0 且不能提高；攻擊擒抱者以外的目標有劣勢。擒抱者拖動你時，每移動 1 呎通常需多花 1 呎移動力（體型差例外）；可依擒抱規則掙脫。"],
["incapacitated","失能","不能採取動作、附贈動作或反應；專注立即結束；無法說話。"],
["invisible","隱形","擲先攻時有優勢；通常無法被需要看見目標的效果指定，所穿戴攜帶裝備也隱蔽。對你的攻擊有劣勢、你的攻擊有優勢；能看見你的生物不受此攻擊優劣勢影響。"],
["paralyzed","麻痺","同時失能、倒地，速度 0；力量與敏捷豁免自動失敗；攻擊者有優勢，5 呎內命中為重擊。"],
["petrified","石化","變成固體，重量十倍且不再老化；同時失能，速度為 0；對你的攻擊有優勢，力量與敏捷豁免自動失敗；對所有傷害有抗性，免疫中毒狀態。"],
["poisoned","中毒","攻擊檢定與屬性檢定有劣勢。"],
["prone","倒地","只能爬行或消耗一半速度站起；自身攻擊有劣勢；5 呎內對你的攻擊有優勢，較遠有劣勢。"],
["restrained","束縛","速度 0；自身攻擊有劣勢，對你的攻擊有優勢；敏捷豁免有劣勢。"],
["stunned","震懾","同時失能；力量與敏捷豁免自動失敗；對你的攻擊有優勢。"],
["unconscious","昏迷","同時失能、倒地；失去意識，速度 0；力量與敏捷豁免自動失敗；對你的攻擊有優勢，5 呎內命中為重擊。"]
];
// Note: PHB conditions have 15 entries including Exhaustion; this array is deliberately complete.
// Artwork order is fixed independently of rules, so condition reordering cannot swap icons.
const WATERCOLOR_STATUS_IDS=[
 "blinded","charmed","deafened","exhaustion",
 "frightened","grappled","incapacitated","invisible",
 "paralyzed","petrified","poisoned","prone",
 "restrained","stunned","unconscious","concentration"
];
const WATERCOLOR_POS=["0%","33.333333%","66.666667%","100%"];
function watercolorIcon(id,compact=false){
 const n=WATERCOLOR_STATUS_IDS.indexOf(id);
 if(n<0)return "";
 return `<span class="session-watercolor-icon${compact?" session-watercolor-icon-compact":""}" data-status-art="${id}" style="--wc-x:${WATERCOLOR_POS[n%4]};--wc-y:${WATERCOLOR_POS[Math.floor(n/4)]}" aria-hidden="true"></span>`;
}
const BREAKS=new Set(["incapacitated","paralyzed","petrified","stunned","unconscious"]);
const SPEED_ZERO=["grappled","restrained","paralyzed","unconscious","petrified"];
const ICONS={
 blinded:"◉",charmed:"♥",deafened:"◒",exhaustion:"⌛",frightened:"!",grappled:"⛓",
 incapacitated:"⊘",invisible:"◇",paralyzed:"▥",petrified:"◆",poisoned:"☠",prone:"↧",
 restrained:"⌁",stunned:"✦",unconscious:"☾",concentration:"◎"
};
const ENGLISH_IDS={frightened:"Frightened"};
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function levelOf(play){return Math.max(0,Math.min(6,Math.trunc(Number(play?.exhaustion2024)||0)));}
function hasCondition(play,id){return !!(play?.conditions2024&&typeof play.conditions2024==="object"&&!Array.isArray(play.conditions2024)&&play.conditions2024[id]);}
function canonicalInfo(id,canonicalRows){
 const fallback=DEFINITIONS.find(row=>row[0]===id)||[id,id,""];
 const english=ENGLISH_IDS[id]||id.charAt(0).toUpperCase()+id.slice(1);
 const matched=(canonicalRows||[]).find(row=>row[1]===english);
 return {id,label:matched?.[0]||fallback[1],rule:matched?[matched[2],matched[3]].filter(Boolean).join(" "):fallback[2],icon:ICONS[id]||"◆"};
}

// Pure display projection. It never normalizes or writes play/base character state.
function project(play,baseSpeed,movementRemaining=null){
 const exhaustionLevel=levelOf(play);
 const source=Number(baseSpeed);
 const characterSpeed=Number.isFinite(source)?Math.max(0,Math.floor(source)):0;
 const speedAfterExhaustion=Math.max(0,characterSpeed-exhaustionLevel*5);
 const immobilizedBy=SPEED_ZERO.filter(id=>hasCondition(play,id));
 const effectiveSpeed=immobilizedBy.length?0:speedAfterExhaustion;
 const prone=hasCondition(play,"prone");
 const standCost=Math.floor(effectiveSpeed/2);
 const remaining=movementRemaining==null?null:Math.max(0,Math.floor(Number(movementRemaining)||0));
 const canStand=!prone?true:(effectiveSpeed===0?false:(remaining==null?null:remaining>=standCost));
 return {
  exhaustionLevel,d20Penalty:exhaustionLevel?-2*exhaustionLevel:0,characterSpeed,speedAfterExhaustion,
  effectiveSpeed,immobilizedBy,prone,standCost,movementRemaining:remaining,canStand,
  death:exhaustionLevel===6
 };
}
function applyD20(value,projectionOrLevel){
 const n=Number(value);if(!Number.isFinite(n))return null;
 const penalty=typeof projectionOrLevel==="object"?Number(projectionOrLevel?.d20Penalty)||0:-2*Math.max(0,Math.min(6,Math.trunc(Number(projectionOrLevel)||0)));
 return n+penalty;
}
function movementCost(distance,prone=false){
 const n=Number(distance);if(!Number.isFinite(n)||n<0)throw Error("移動距離必須是非負數");
 return n*(prone?2:1);
}
function normalize(play){
 if(!play||typeof play!=="object")throw Error("缺少跑團狀態");
 if(!play.conditions2024||typeof play.conditions2024!=="object"||Array.isArray(play.conditions2024))play.conditions2024={};
 if(!Array.isArray(play.concentrationChecks2024))play.concentrationChecks2024=[];
 if(play.concentration2024!=null&&typeof play.concentration2024!=="string")play.concentration2024="";
 play.exhaustion2024=Math.max(0,Math.min(6,Math.trunc(Number(play.exhaustion2024)||0)));
 return play;
}
function dc(damage){let n=Number(damage);if(!Number.isFinite(n)||n<=0)return null;return Math.min(30,Math.max(10,Math.floor(n/2)));}
function end(play){normalize(play);play.concentration2024="";play.concentrationChecks2024=[];}
function start(play,name){
 normalize(play);name=String(name||"").trim().slice(0,120);
 if(!name)throw Error("請輸入正在專注的法術或效果名稱");
 if(Object.keys(play.conditions2024).some(k=>BREAKS.has(k)&&play.conditions2024[k]))throw Error("目前處於失能相關狀態，無法維持專注");
 play.concentration2024=name;play.concentrationChecks2024=[];
}
function damage(play,amount){normalize(play);const d=dc(amount);if(d!==null&&play.concentration2024)play.concentrationChecks2024.push(d);return d;}
function resolve(play,success){normalize(play);if(!play.concentrationChecks2024.length)return false;play.concentrationChecks2024.shift();if(!success)end(play);return true;}
function setCondition(play,id,enabled){
 normalize(play);if(id==="exhaustion")throw Error("力竭請用級數設定");
 if(!DEFINITIONS.some(r=>r[0]===id))throw Error("未知狀態");
 if(enabled)play.conditions2024[id]=true;else delete play.conditions2024[id];
 if(enabled&&BREAKS.has(id))end(play);
}
function exhaustion(play,n){normalize(play);if(!Number.isInteger(n)||n<0||n>6)throw Error("力竭必須是 0 至 6 級");play.exhaustion2024=n;if(n===6)end(play);}
function removeActive(play,id){
 if(id==="exhaustion")return exhaustion(play,0);
 if(id==="concentration")return end(play);
 return setCondition(play,id,false);
}

// Presentation-only tokens. Never mutate rule text or the persisted play state.
const SESSION_TERMS=/(附贈動作|主要動作|魔法動作|操作動作|豁免檢定|短休|長休|優勢|劣勢|豁免|反應|動作|DC\s*\d+|成功|失敗)/gu;
function semanticKind(token){
 if(token==="優勢"||token==="成功")return "advantage";
 if(token==="劣勢"||token==="失敗")return "disadvantage";
 if(token.includes("豁免"))return "save";
 if(token==="短休"||token==="長休")return "rest";
 if(/^DC\s*\d+$/u.test(token))return "dc";
 return "action";
}
function semanticText(value){
 const source=String(value??"");let out="",last=0;
 for(const m of source.matchAll(SESSION_TERMS)){
  out+=esc(source.slice(last,m.index));
  out+=`<strong class="ps-term ps-term-${semanticKind(m[0])}">${esc(m[0])}</strong>`;
  last=m.index+m[0].length;
 }
 return out+esc(source.slice(last));
}
function ruleLines(value){
 const pieces=String(value??"").match(/[^。；]+[。；]?/gu)||[];
 return `<div class="session-rule-lines">${pieces.filter(s=>s.trim()).map(s=>`<p>${semanticText(s.trim())}</p>`).join("")}</div>`;
}
function highlightElement(rootEl){
 if(!rootEl?.ownerDocument)return;
 const doc=rootEl.ownerDocument,walker=doc.createTreeWalker(rootEl,4),nodes=[];
 while(walker.nextNode()){
  const n=walker.currentNode;
  if(!n.nodeValue||n.nodeValue.search(SESSION_TERMS)<0)continue;
  if(n.parentElement?.closest(".ps-term,script,style"))continue;
  nodes.push(n);
 }
 for(const n of nodes){
  const wrapper=doc.createElement("span");
  wrapper.innerHTML=semanticText(n.nodeValue);
  n.replaceWith(...wrapper.childNodes);
 }
}

function activeItems(play,canonicalRows){
 const out=DEFINITIONS.filter(([id])=>id!=="exhaustion"&&hasCondition(play,id)).map(([id])=>{
  const info=canonicalInfo(id,canonicalRows);return {...info,display:info.label};
 });
 const exhaustionLevel=levelOf(play);
 if(exhaustionLevel){const info=canonicalInfo("exhaustion",canonicalRows);out.push({...info,display:`${info.label} ${exhaustionLevel}`});}
 const concentration=typeof play?.concentration2024==="string"?play.concentration2024.trim():"";
 if(concentration)out.push({id:"concentration",label:"專注",display:`專注：${concentration}`,icon:ICONS.concentration,rule:"受到傷害時，每個傷害來源都要分別進行一次體質豁免。DC 為 10 或該次傷害的一半（無條件捨去），取較高者，最高 30。失敗、陷入失能或死亡時，專注結束。"});
 return out;
}
function summaryHTML(play,edition,canonicalRows){
 if(edition==="2014")return "";
 const chips=activeItems(play,canonicalRows).map(item=>`<button type="button" class="session-current-chip" data-session-chip="${esc(item.id)}" aria-haspopup="dialog" aria-label="查看${esc(item.display)}規則；長按約 0.55 秒可移除">${watercolorIcon(item.id,true)}<span>${esc(item.display)}</span></button>`).join("");
 return `<section id="psCurrentConditions" class="session-current" aria-label="目前狀態摘要">
 <div class="session-current-heading"><strong>目前狀態</strong><span>點按看規則 · 長按可移除</span></div>
 <div class="session-current-chips" aria-live="polite">${chips||'<span class="session-current-empty">目前沒有 2024 狀態效果或專注。</span>'}</div>
 <dialog id="sessionConditionDialog" class="session-condition-dialog" aria-labelledby="sessionConditionDialogTitle">
  <div class="session-dialog-card"><header><h3 id="sessionConditionDialogTitle">狀態規則</h3><button type="button" data-session-dialog-close aria-label="關閉狀態規則">×</button></header><div class="session-dialog-body" data-session-dialog-body></div><footer><button type="button" class="session-remove-active" data-session-remove>移除狀態</button><button type="button" data-session-dialog-close>關閉</button></footer></div>
 </dialog>
</section>`;
}
function projectionHTML(play,edition,baseSpeed,canonicalRows){
 if(edition==="2014")return "";
 const p=project(play,baseSpeed),penalty=p.d20Penalty?`−${Math.abs(p.d20Penalty)}`:"0";
 const blocked=p.immobilizedBy.map(id=>canonicalInfo(id,canonicalRows).label);
 const warnings=[];
 if(blocked.length)warnings.push(`<p class="session-projection-warning"><strong>${esc(blocked.join("、"))}：</strong>目前有效速度設為 0；角色原本速度與力竭後速度都沒有被改寫。</p>`);
 if(p.prone)warnings.push(`<p class="session-projection-warning"><strong>倒地：</strong>不會減半角色速度。只能爬行；爬行每移動 1 呎要多花 1 呎移動力。站起要花 ${p.standCost} 呎移動力（目前有效速度 ${p.effectiveSpeed} 呎的一半，無條件捨去），站起後解除倒地；有效速度為 0 或剩餘移動力不足 ${p.standCost} 呎時不能站起。</p>`);
 if(p.death)warnings.push('<p class="session-projection-death" role="alert"><strong>力竭 6 級：角色死亡。</strong></p>');
 return `<section class="ps-section session-projection" aria-label="狀態衍生數值">
 <h3>狀態影響投影</h3><p class="session-projection-intro">只投影目前效果，不修改屬性、熟練、法術命中來源或角色速度來源。</p>
 <div class="session-projection-grid">
  <div><span>D20 檢定</span><strong>${penalty}</strong><small>力竭 ${p.exhaustionLevel} 級；套用於屬性檢定、攻擊檢定、豁免檢定</small></div>
  <div><span>角色速度（效果前）</span><strong>${p.characterSpeed} 呎</strong><small>來自角色速度計算</small></div>
  <div><span>力竭後速度</span><strong>${p.speedAfterExhaustion} 呎</strong><small>${p.exhaustionLevel?`每級 −5 呎，共 −${p.exhaustionLevel*5} 呎`:'目前沒有力竭減值'}</small></div>
  <div><span>目前有效速度</span><strong>${p.effectiveSpeed} 呎</strong><small>${blocked.length?`受 ${esc(blocked.join("、"))} 限制`:'沒有速度歸零狀態'}</small></div>
 </div>${warnings.join("")}
</section>`;
}

function dialogContent(play,id,canonicalRows,baseSpeed){
 const p=project(play,baseSpeed),info=id==="concentration"
  ?{id,label:"專注",rule:activeItems(play,canonicalRows).find(x=>x.id==="concentration")?.rule||"目前沒有專注。"}
  :canonicalInfo(id,canonicalRows);
 const extra=[];
 if(id==="exhaustion"){
  extra.push(`目前力竭 ${p.exhaustionLevel} 級：D20 檢定 ${p.d20Penalty?`−${Math.abs(p.d20Penalty)}`:"0"}；角色速度 ${p.characterSpeed} 呎，力竭後 ${p.speedAfterExhaustion} 呎，目前有效速度 ${p.effectiveSpeed} 呎。`);
  if(p.death)extra.push("力竭 6 級：角色死亡。");
 }
 if(id==="prone")extra.push(`目前有效速度 ${p.effectiveSpeed} 呎。爬行 1 呎要花 ${movementCost(1,true)} 呎移動力；站起要花 ${p.standCost} 呎移動力，且剩餘移動力不足或有效速度為 0 時不能站起。`);
 if(SPEED_ZERO.includes(id))extra.push(`目前速度投影為 ${p.effectiveSpeed} 呎；這不會改寫角色速度來源。`);
 return {title:id==="concentration"?`專注：${play.concentration2024}`:info.label,body:`${ruleLines(info.rule)}${extra.map(x=>`<p class="session-dialog-derived">${semanticText(x)}</p>`).join("")}`,removeLabel:id==="concentration"?"結束專注":id==="exhaustion"?"清除力竭":"移除「"+info.label+"」"};
}

function html(play,edition,canonicalRows){
 if(edition==="2014")return "";
 normalize(play);
 const name=play.concentration2024;
 const canonical=new Map((canonicalRows||[]).map(r=>[r[1],r]));
 const rows=DEFINITIONS.filter(r=>r[0]!=="exhaustion").map(([id])=>{
  const info=canonicalInfo(id,canonicalRows);
  return `<div class="session-condition-row"><button type="button" data-session-condition="${id}" aria-pressed="${!!play.conditions2024[id]}" class="${play.conditions2024[id]?"is-on":""}">${watercolorIcon(id)}${play.conditions2024[id]?"✓ ":""}${esc(info.label)}</button><details class="session-condition-details"><summary aria-label="查看${esc(info.label)}規則">規則</summary><div class="session-rule-panel">${ruleLines(info.rule)}</div></details></div>`;
 }).join("");
 const pending=play.concentrationChecks2024.length?`<div class="session-save-alert" role="alert">體質豁免 DC <strong>${play.concentrationChecks2024[0]}</strong>（${play.concentrationChecks2024.length} 次待判定）<div><button type="button" data-session-save="success">成功，維持專注</button><button type="button" data-session-save="fail">失敗，結束專注</button></div></div>`:"";
 return `
<section class="ps-section session-effects" aria-label="專注管理">
 <h3 class="pt">${watercolorIcon("concentration")} 專注管理</h3>
 <div class="session-concentration-status"><span>目前專注</span><strong>${esc(name||"無")}</strong></div>
 <div class="session-actions"><button type="button" data-session-start ${name?"disabled":""}>開始專注</button><button type="button" data-session-end ${name?"":"disabled"}>結束專注</button></div>
 ${pending}
 <div class="session-help" role="note">
  <p class="session-help-intro">${semanticText("受到傷害時，要做體質豁免，看看能不能繼續專注。")}</p>
  <p>${semanticText("每個傷害來源都要分別做一次豁免。")}</p>
  <p>${semanticText("DC 10 或該次傷害的一半（無條件捨去），取較高的數字，最高 30。")}</p>
  <p>${semanticText("成功：繼續專注。失敗：專注結束。")}</p>
  <p>陷入失能、死亡，或開始專注另一個效果時，原本的專注就會結束。</p>
 </div>
</section>
<section class="ps-section session-effects" aria-label="狀態效果管理">
 <h3 class="pt">狀態效果</h3>
 <p class="session-list-intro">點擊狀態名稱切換目前是否生效；點「規則」查看完整效果。</p>
 <div class="session-condition-grid" aria-label="可用狀態列表">${rows}</div>
 <div class="session-exhaustion"><label for="sessionExhaustion">${watercolorIcon("exhaustion")}力竭等級</label><select id="sessionExhaustion">${Array.from({length:7},(_,i)=>`<option value="${i}" ${i===play.exhaustion2024?"selected":""}>${i} 級</option>`).join("")}</select><details class="session-exhaustion-details"><summary>力竭規則</summary><div class="session-rule-panel">${ruleLines(canonical.get("Exhaustion")?.slice(2,4).join(" ")||DEFINITIONS.find(r=>r[0]==="exhaustion")[2])}</div></details></div>
 <p class="session-note">這裡只記錄目前狀態；持續多久、如何解除，依造成效果的法術、能力與 DM 判定。</p>
</section>`
}
function bind(container,play,edition,rerender,persist,canonicalRows,baseSpeed){
 if(edition==="2014")return;normalize(play);
 const apply=fn=>{try{fn();persist();rerender();}catch(e){alert(e.message);}};
 container.querySelector("[data-session-start]")?.addEventListener("click",()=>{apply(()=>start(play,"專注中"));});
 container.querySelector("[data-session-end]")?.addEventListener("click",()=>apply(()=>end(play)));
 container.querySelectorAll("[data-session-save]").forEach(b=>b.addEventListener("click",()=>apply(()=>resolve(play,b.dataset.sessionSave==="success"))));
 container.querySelectorAll("[data-session-condition]").forEach(b=>b.addEventListener("click",()=>apply(()=>setCondition(play,b.dataset.sessionCondition,!play.conditions2024[b.dataset.sessionCondition]))));
 container.querySelector("#sessionExhaustion")?.addEventListener("change",e=>apply(()=>exhaustion(play,Number(e.target.value))));
 const dialog=container.querySelector("#sessionConditionDialog"),title=dialog?.querySelector("#sessionConditionDialogTitle"),body=dialog?.querySelector("[data-session-dialog-body]"),remove=dialog?.querySelector("[data-session-remove]");
 let openId="";
 const closeDialog=()=>{if(dialog?.open)dialog.close();};
 const openDialog=id=>{
  if(!dialog||!title||!body||!remove)return;
  const content=dialogContent(play,id,canonicalRows,baseSpeed);openId=id;
  title.textContent=content.title;body.innerHTML=content.body;remove.textContent=content.removeLabel;
  if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");
  dialog.querySelector("[data-session-dialog-close]")?.focus();
 };
 dialog?.querySelectorAll("[data-session-dialog-close]").forEach(b=>b.addEventListener("click",closeDialog));
 dialog?.addEventListener("click",e=>{if(e.target===dialog)closeDialog();});
 remove?.addEventListener("click",()=>{if(openId)apply(()=>removeActive(play,openId));});
 container.querySelectorAll("[data-session-chip]").forEach(chip=>{
  let timer=0,startX=0,startY=0,suppressClick=false;
  const cancel=()=>{if(timer){clearTimeout(timer);timer=0;}};
  chip.addEventListener("pointerdown",e=>{
   if(e.button!==0||e.isPrimary===false)return;
   cancel();suppressClick=false;startX=e.clientX;startY=e.clientY;
   timer=setTimeout(()=>{timer=0;suppressClick=true;chip.dataset.sessionLongPressed="1";apply(()=>removeActive(play,chip.dataset.sessionChip));},550);
  });
  chip.addEventListener("pointermove",e=>{if(Math.hypot(e.clientX-startX,e.clientY-startY)>12)cancel();});
  ["pointerup","pointercancel","lostpointercapture"].forEach(type=>chip.addEventListener(type,cancel));
  chip.addEventListener("contextmenu",e=>{if(timer||suppressClick)e.preventDefault();});
  chip.addEventListener("click",e=>{
   if(suppressClick||chip.dataset.sessionLongPressed==="1"){e.preventDefault();e.stopImmediatePropagation();return;}
   openDialog(chip.dataset.sessionChip);
  });
 });
}
root.DND5RSessionEffects={DEFINITIONS,SPEED_ZERO,normalize,dc,start,end,damage,resolve,setCondition,exhaustion,removeActive,project,applyD20,movementCost,canonicalInfo,activeItems,summaryHTML,projectionHTML,html,bind,semanticText,ruleLines,highlightElement};
})(typeof globalThis!=="undefined"?globalThis:window);

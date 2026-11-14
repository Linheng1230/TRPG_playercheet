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
const BREAKS=new Set(["incapacitated","paralyzed","petrified","stunned","unconscious"]);
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
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
function html(play,edition,canonicalRows){
 if(edition==="2014")return "";
 normalize(play);
 const name=play.concentration2024;
 const canonical=new Map((canonicalRows||[]).map(r=>[r[1],r]));
 const rows=DEFINITIONS.filter(r=>r[0]!=="exhaustion").map(([id,label,rule])=>{const matched=canonical.get(({frightened:"Frightened"})[id]||id.charAt(0).toUpperCase()+id.slice(1));if(matched){label=matched[0];rule=matched[2]+" "+matched[3]}return`<div class="session-condition-row"><button type="button" data-session-condition="${id}" aria-pressed="${!!play.conditions2024[id]}" class="${play.conditions2024[id]?"is-on":""}">${play.conditions2024[id]?"✓ ":""}${label}</button><details><summary aria-label="查看${label}規則">規則</summary><p>${esc(rule)}</p></details></div>`;}).join("");
 const pending=play.concentrationChecks2024.length?`<div class="session-save-alert" role="alert">體質豁免 DC <strong>${play.concentrationChecks2024[0]}</strong>（${play.concentrationChecks2024.length} 次待判定）<div><button type="button" data-session-save="success">成功，維持專注</button><button type="button" data-session-save="fail">失敗，結束專注</button></div></div>`:"";
 return `<section class="ps-section session-effects" aria-label="專注管理"><div class="pt">專注管理</div><p>目前專注：<strong>${esc(name||"無")}</strong></p><div class="session-actions"><button type="button" data-session-start>開始／更換專注</button><button type="button" data-session-end ${name?"":"disabled"}>結束專注</button></div>${pending}<p class="session-help">受傷時每個傷害來源須分別進行體質豁免：DC 10 或傷害一半（無條件捨去），取較高者，最高 30。失能、死亡或開始另一項專注效果會結束原專注。</p></section><section class="ps-section session-effects" aria-label="狀態效果管理"><div class="pt">狀態效果</div><div class="session-condition-grid">${rows}</div><div class="session-exhaustion"><label for="sessionExhaustion">力竭等級</label><select id="sessionExhaustion">${Array.from({length:7},(_,i)=>`<option value="${i}" ${i===play.exhaustion2024?"selected":""}>${i} 級</option>`).join("")}</select><details><summary>力竭規則</summary><p>${esc(canonical.get("Exhaustion")?.slice(2,4).join(" ")||DEFINITIONS.find(r=>r[0]==="exhaustion")[2])}</p></details></div><p class="session-help">狀態勾選僅記錄目前效果；持續時間及解除條件以造成效果的法術、能力與 DM 判定為準。</p></section>`;
}
function bind(container,play,edition,rerender,persist){
 if(edition==="2014")return;normalize(play);
 const apply=fn=>{try{fn();persist();rerender();}catch(e){alert(e.message);}};
 container.querySelector("[data-session-start]")?.addEventListener("click",()=>{const n=prompt("目前正在專注的法術或效果",play.concentration2024||"");if(n!==null)apply(()=>start(play,n));});
 container.querySelector("[data-session-end]")?.addEventListener("click",()=>apply(()=>end(play)));
 container.querySelectorAll("[data-session-save]").forEach(b=>b.addEventListener("click",()=>apply(()=>resolve(play,b.dataset.sessionSave==="success"))));
 container.querySelectorAll("[data-session-condition]").forEach(b=>b.addEventListener("click",()=>apply(()=>setCondition(play,b.dataset.sessionCondition,!play.conditions2024[b.dataset.sessionCondition]))));
 container.querySelector("#sessionExhaustion")?.addEventListener("change",e=>apply(()=>exhaustion(play,Number(e.target.value))));
}
root.DND5RSessionEffects={DEFINITIONS,normalize,dc,start,end,damage,resolve,setCondition,exhaustion,html,bind};
})(typeof globalThis!=="undefined"?globalThis:window);

/* Warlock familiar attachment. Canonical creature statistics come from ZIZI_5R_CREATURES. */
(function(){
"use strict";
const SPECIAL=new Set(["Imp","Pseudodragon","Quasit","Skeleton","Slaad Tadpole","Sphinx of Wonder","Sprite","Venomous Snake"]);
const TYPES={celestial:"天界生物",fey:"妖精",fiend:"邪魔"};
const STAT={str:"力量",dex:"敏捷",con:"體質",int:"智力",wis:"感知",cha:"魅力"};
function invocationRule(name){const iv=typeof INVOCATIONS!=="undefined"?INVOCATIONS.find(x=>x.n===name):null;return iv&&typeof activeOptionText5R==="function"?activeOptionText5R("invocations",iv.n,iv.d):"";}
const escape=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const creatures=()=>window.ZIZI_5R_CREATURES||[];
const byId=id=>creatures().find(x=>x.id===id);
const zh=x=>(window.ZIZI_5R_CREATURES_ZH||{})[x.id]||{};
function eligible(x,chain){return !!x && ((x.type==="beast"&&x.crValue===0&&!x.isSwarm)||chain&&SPECIAL.has(x.name));}
function candidates(chain){return creatures().filter(x=>eligible(x,chain)).sort((a,b)=>(SPECIAL.has(b.name)?1:0)-(SPECIAL.has(a.name)?1:0)||a.name.localeCompare(b.name));}
function normalize(raw){if(!raw||typeof raw!=="object")return null;
 const id=String(raw.creatureId||"").slice(0,100),x=byId(id);
 if(!x)return null;
 return {creatureId:id,nickname:String(raw.nickname||"").slice(0,60),spirit:TYPES[raw.spirit]?raw.spirit:"fey",notes:String(raw.notes||"").slice(0,400),status:["present","dismissed","gone"].includes(raw.status)?raw.status:"present"};
}
function permission(s){return s.ruleset==="2024"&&s.cls?.n==="邪術師"&&typeof validInvocationsSet2024==="function"&&validInvocationsSet2024().has("鎖鏈之契");}
function hasInvestment(s){return permission(s)&&validInvocationsSet2024().has("鎖鏈大師之資");}
const detail=(label,value)=>'<div class="wf-item"><small>'+escape(label)+'</small><strong>'+escape(value)+'</strong></div>';
function render(s){
 if(s.ruleset!=="2024"||s.cls?.n!=="邪術師")return "";
 const chain=permission(s),investment=hasInvestment(s),stored=normalize(s.familiar),x=stored&&byId(stored.creatureId);
 const active=!!(x&&eligible(x,chain));
 const q=String(window.__wfQuery||"").toLowerCase();
 const opts=candidates(chain).filter(c=>(c.name+" "+(zh(c).nameZh||"")).toLowerCase().includes(q));
 let out='<section class="fs-sec wf-panel" id="warlockFamiliar" aria-label="契術師魔寵"><div class="st">魔寵 · Find Familiar</div>';
 if(!chain)out+='<p class="wf-note">尚未選擇「鎖鏈之契」。此區僅提供一般魔寵資料參考；選擇此祈喚後才會開啟特殊形態與魔寵攻擊例外。若透過巨冊之契等途徑習得《尋找魔寵》，仍須遵守該法術的普通魔寵規則。</p>';
 if(stored&&!active)out+='<p class="wf-warn">先前儲存的特殊形態目前不符合角色的祈喚資格，已暫停顯示其可用能力；原紀錄仍保留。</p>';
 out+='<div class="wf-tools"><label>快速搜尋生物<input id="wfSearch" type="search" value="'+escape(window.__wfQuery||"")+'" placeholder="搜尋中文或英文生物名稱"></label></div>';
 out+='<div class="wf-choices" role="group" aria-label="選擇魔寵形態">'+opts.slice(0,30).map(c=>'<button type="button" class="wf-choice" data-wf-choose="'+escape(c.id)+'" aria-pressed="'+(x?.id===c.id)+'">'+escape(zh(c).nameZh||c.name)+' <small>'+escape(c.name)+'</small>'+(SPECIAL.has(c.name)?'<em>鎖鏈限定</em>':'')+'</button>').join("")+'</div>';
 if(opts.length>30)out+='<p class="wf-note">目前顯示前 30 筆，請輸入名稱縮小結果。</p>';
 if(active){
 const z=zh(x),speed=Object.entries(x.speed||{}).map(([k,v])=>(typeof PR_SPEED!=="undefined"?PR_SPEED[k]:k||k)+" "+v+" 呎").join("、");
 out+='<div class="wf-selected"><h4>'+escape(stored.nickname||z.nameZh||x.name)+' <small>'+escape(z.nameZh||x.name)+'｜'+escape(x.name)+'</small></h4>';
 out+='<div class="wf-edit"><label>暱稱<input data-wf-edit="nickname" maxlength="60" value="'+escape(stored.nickname)+'"></label><label>靈體選擇偏好<div class="wf-picks">'+Object.entries(TYPES).map(([k,v])=>'<button type="button" data-wf-spirit="'+k+'" aria-pressed="'+(stored.spirit===k)+'">'+v+'</button>').join("")+'</div></label></div>';
 out+='<div class="wf-stats">'+detail("護甲等級",z.acZh||x.ac)+detail("生命值",z.hpZh||x.hpSpecial||x.hp||"—")+detail("速度",speed||"—")+detail("被動察覺",x.passive??"—")+detail("挑戰等級",x.cr)+detail("生物來源",x.source)+'</div>';
 out+='<div class="wf-attributes">'+Object.entries(STAT).map(([k,v])=>detail(v,(x[k]??"—")+(x[k]!=null?"（"+(Math.floor((x[k]-10)/2)>=0?"+":"")+Math.floor((x[k]-10)/2)+"）":""))).join("")+'</div>';
 out+='<p class="wf-note">使用原始生物數據，但須套用《尋找魔寵》及「鎖鏈之契」限制。靈體類型依施法選擇，不可直接把所有特殊生物的原始類型視為已改變。</p>';
 const sections=[["特性",z.traitsZh],["動作（需符合魔寵攻擊例外）",z.actionsZh],["附贈動作",z.bonusZh],["反應",z.reactionsZh]];
 out+=sections.map(([title,rows])=>Array.isArray(rows)&&rows.length?'<details class="wf-rule"><summary>'+title+'</summary>'+rows.map(r=>'<div><b>'+escape(r.h||"")+'</b><p>'+escape(r.t||"")+'</p></div>').join("")+'</details>':"").join("");
 out+='<div class="wf-ruletext"><b>魔寵行動與指令速查</b><p>普通魔寵不能攻擊；戰鬥中自行擲先攻、在自己的回合行動。可依情況使用協助等非攻擊行動。</p><p>100 呎內可心靈溝通。主人使用附贈動作共享感官，持續到主人下回合開始。傳遞接觸法術須在 100 呎內，魔寵消耗反應。</p>';
 if(chain)out+='<p><b>鎖鏈之契（正式規則）：</b></p><p>'+escape(invocationRule("鎖鏈之契"))+'</p>';
 if(investment)out+='<p><b>鎖鏈大師之資（正式規則）：</b></p><p>'+escape(invocationRule("鎖鏈大師之資"))+'</p>';
 out+='<p>生命值降至 0 會消失，須重新施法；暫時遣返後可用魔法動作召回到 30 呎內。重新施法改變形態，不會得到第二隻魔寵。</p></div>';
 out+='<div class="wf-edit"><label>紀錄狀態（非自動戰鬥結算）<div class="wf-picks">'+[["present","在場"],["dismissed","暫時遣返"],["gone","已消失"]].map(([k,v])=>'<button type="button" data-wf-status="'+k+'" aria-pressed="'+(stored.status===k)+'">'+v+'</button>').join("")+'</div></label><label>備註<textarea data-wf-edit="notes" rows="2" maxlength="400">'+escape(stored.notes)+'</textarea></label></div>';
 out+='<button type="button" class="wf-remove" data-wf-remove="1">移除魔寵紀錄</button></div>';
 }
 out+='</section>';return out;
}
function onClick(e){
 const root=e.target.closest("#warlockFamiliar");if(!root||typeof S==="undefined")return;
 const btn=e.target.closest("button");if(!btn)return;
 if(btn.dataset.wfChoose){
  const x=byId(btn.dataset.wfChoose);if(!eligible(x,permission(S)))return;
  S.familiar={creatureId:x.id,nickname:S.familiar?.nickname||zh(x).nameZh||x.name,spirit:S.familiar?.spirit||"fey",notes:S.familiar?.notes||"",status:"present"};window.__wfQuery="";renderFinal();autoSave();return;
 }
 if(btn.dataset.wfSpirit){if(!S.familiar)return;S.familiar.spirit=btn.dataset.wfSpirit;renderFinal();autoSave();return;}
 if(btn.dataset.wfStatus){if(!S.familiar)return;S.familiar.status=btn.dataset.wfStatus;renderFinal();autoSave();return;}
 if(btn.dataset.wfRemove){if(!confirm("移除目前角色的魔寵紀錄？"))return;S.familiar=null;renderFinal();autoSave();}
}
function onInput(e){
 if(!e.target.closest("#warlockFamiliar")||typeof S==="undefined")return;
 if(e.target.id==="wfSearch"){window.__wfQuery=e.target.value;const pos=e.target.selectionStart;renderFinal();let input=document.getElementById("wfSearch");if(input){input.focus();input.setSelectionRange(pos,pos)}return;}
 const key=e.target.dataset.wfEdit;if(!key||!S.familiar)return;
 if(key==="nickname"||key==="notes"){S.familiar[key]=e.target.value.slice(0,key==="nickname"?60:400);autoSave();}
}
document.addEventListener("click",onClick);
document.addEventListener("input",onInput);
const css=document.createElement("style");
css.textContent=`.wf-panel{line-height:1.75}.wf-note{font-size:14px;line-height:1.7}.wf-warn{color:#8f2e22;border:1px solid #b45c40;padding:8px}.wf-tools input,.wf-edit input,.wf-edit textarea{width:100%;min-width:0;box-sizing:border-box;font:inherit;padding:9px;border:1px solid #a58d63;background:#fffdf8;color:#32291e}.wf-tools label,.wf-edit label{display:block;min-width:0;flex:1}.wf-choices,.wf-picks{display:flex;flex-wrap:wrap;gap:7px;margin:9px 0}.wf-choice,.wf-picks button,.wf-remove{font:inherit;font-size:14px;min-height:44px;cursor:pointer;background:#fffdf8;border:1px solid #a58d63;color:#43352b;padding:8px 12px;border-radius:6px;white-space:normal;text-align:left}.wf-choice small{display:block}.wf-choice em{display:block;font-size:12px;color:#9b3c2d}.wf-choice[aria-pressed=true],.wf-picks button[aria-pressed=true]{background:#873a33;color:white}.wf-choice[aria-pressed=true] em{color:white}.wf-selected{margin-top:15px;border-top:1px solid #c5a87c;padding-top:10px}.wf-selected h4{font-size:18px;margin:8px 0}.wf-selected h4 small{font-size:13px;font-weight:400}.wf-edit{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0}.wf-stats,.wf-attributes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:10px 0}.wf-item{border:1px solid #d6c5ab;border-radius:5px;padding:7px;min-width:0;overflow-wrap:anywhere}.wf-item small{display:block;color:#6b5544;font-size:12px}.wf-item strong{font-size:15px}.wf-rule{margin:8px 0;border:1px solid #d6c5ab;padding:8px}.wf-rule summary{cursor:pointer;font-weight:700}.wf-rule p,.wf-ruletext p{font-size:15px;line-height:1.8;margin:5px 0 10px}.wf-ruletext{border:1px solid #d6c5ab;padding:10px}.wf-remove{margin-top:8px}@media(max-width:420px){.wf-stats,.wf-attributes{grid-template-columns:repeat(2,minmax(0,1fr))}.wf-choices{max-height:280px;overflow-y:auto}.wf-edit{display:block}}`;
document.head.appendChild(css);
window.WarlockFamiliar={render,normalize,eligible,permission,candidates,hasInvestment};
})();

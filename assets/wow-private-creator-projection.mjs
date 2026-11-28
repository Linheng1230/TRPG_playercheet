const CATEGORY_KEYS = Object.freeze([
  "grantItemIds","overrideItemIds","spellTableItemIds",
  "spellIds","resourceItemIds","choiceItemIds",
]);

function unique(values){return [...new Set(values)];}
function safe(value){return String(value??"").replace(/[&<>"']/g,ch=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;",
}[ch]));}
function body(record){
  const raw=String(record?.description||"").trim();
  return raw || "私人來源未提供可顯示正文。";
}
export function selectWowPrivateRows(manifest,state){
  if(!manifest||!state?.wowClassId||state.ruleset!=="2024")return [];
  const max=Math.min(3,Math.max(1,Number(state.level)||1));
  const source=(manifest.progressionRows||[])
    .filter(row=>row.classId===state.wowClassId&&row.level<=max);
  const out=[];
  for(let level=1;level<=max;level++){
    const rows=source.filter(row=>row.level===level);
    if(!rows.length)continue;
    const exact=state.wowSpecializationId
      ?rows.find(row=>row.specializationId===state.wowSpecializationId):null;
    if(exact){out.push(exact);continue;}
    const common={classId:state.wowClassId,specializationId:null,level,
      eligibility:"BASE_LEVEL_OK",subclassAvailable:false,coreProgressionInherited:true};
    for(const key of CATEGORY_KEYS){
      const pools=rows.map(row=>new Set(Array.isArray(row[key])?row[key]:[]));
      common[key]=pools.length
        ?[...pools[0]].filter(id=>pools.every(pool=>pool.has(id))):[];
    }
    out.push(common);
  }
  return out;
}
export function buildWowPrivateProjection(provider,state){
  const rows=selectWowPrivateRows(provider?.manifest,state);
  if(!provider?.contentBundle?.records||!rows.length)return null;
  const records=provider.contentBundle.records,tableIds=new Set();
  rows.forEach(row=>(row.spellTableItemIds||[]).forEach(id=>tableIds.add(id)));
  const collect=key=>unique(rows.flatMap(row=>Array.isArray(row[key])?row[key]:[]))
    .filter(id=>records[id]).map(id=>records[id]);
  return {
    rows,
    grants:collect("grantItemIds").filter(record=>!tableIds.has(record.id)),
    overrides:collect("overrideItemIds"),
    spells:collect("spellIds"),
    resources:collect("resourceItemIds"),
    choices:collect("choiceItemIds"),
  };
}
export function numericWowPrivateResources(provider,state){
  const projection=buildWowPrivateProjection(provider,state);
  if(!projection)return [];
  return projection.resources.map(record=>{
    const uses=record?.mechanics?.uses,maxRaw=uses?.max;
    const max=typeof maxRaw==="number"?maxRaw:
      typeof maxRaw==="string"&&/^\d+(?:\.\d+)?$/.test(maxRaw.trim())
        ?Number(maxRaw):NaN;
    if(!Number.isFinite(max)||max<=0)return null;
    const recoveryRaw=JSON.stringify(uses?.recovery||record?.mechanics?.recovery||"").toLowerCase();
    const rest=/sr|short/.test(recoveryRaw)?"short":
      /lr|long|day/.test(recoveryRaw)?"long":"manual";
    return {key:"wow:"+record.id,label:record.name||record.sourceName||record.id,
      max,rest,record};
  }).filter(Boolean);
}
function classLabel(meta,state){
  const row=meta?.classes?.find(x=>x.id===state?.wowClassId);
  return row?row.zh+" · "+row.en:(state?.wowClassId||"WoW");
}
function specLabel(meta,state){
  const row=meta?.specializations?.find(x=>x.id===state?.wowSpecializationId);
  return row?row.zh+" · "+row.en:"";
}
function cards(records,kind){
  return (records||[]).map(record=>
    '<details class="subclass-preview-tier wow-private-record" data-wow-private-kind="'+safe(kind)+
    '" data-wow-private-record="'+safe(record.id)+'"><summary><b>'+
    safe(record.name||record.sourceName||record.id)+'</b></summary>'+
    '<div class="subclass-preview-items"><div class="subclass-feature-row">'+
    '<div class="subclass-feature-body">'+body(record)+'</div></div></div></details>'
  ).join("");
}
export function renderWowHeroClassStarts(root,provider,meta,state,bridge={}){
  const grid=root?.querySelector?.("#classGrid");if(!grid)return;
  root.querySelector("#wowHeroStartControls")?.remove();
  if(state?.ruleset!=="2024"||state?.classConfirmed)return;
  const rows=(provider?.manifest?.classes||[]).filter(row=>Number(row.minLevel)>1);
  if(!rows.length)return;
  const box=root.createElement("section");box.id="wowHeroStartControls";
  box.className="pb-info";box.setAttribute("aria-label","WoW 英雄職業起始等級");
  box.innerHTML='<b>英雄職業起始</b><div class="actions">'+rows.map(row=>{
    const cls=meta?.classes?.find(x=>x.id===row.id),label=cls?cls.zh+" · "+cls.en:row.id;
    return '<button type="button" data-wow-hero-start="'+safe(row.id)+'">'+
      safe(label)+'｜以 Lv'+Number(row.minLevel)+' 起始</button>';
  }).join("")+'</div><small>不降低官方最低等級；死亡騎士／惡魔獵人的 Lv1–2 GM waiver 仍走獨立授權 Gate。</small>';
  box.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-wow-hero-start]");if(!button)return;
    const row=rows.find(x=>x.id===button.dataset.wowHeroStart);if(!row)return;
    const card=grid.querySelector('[data-wow-class-id="'+CSS.escape(row.id)+'"]');
    const current=bridge.getState?.();if(!card||typeof card._commitClass!=="function"||!current)return;
    const cls=meta?.classes?.find(x=>x.id===row.id),label=cls?cls.zh+" · "+cls.en:row.id;
    const win=root.defaultView;
    if(win?.confirm&&!win.confirm("確定以 "+label+" Lv"+row.minLevel+" 建立角色？\n\n這會遵守官方最低起始等級，不會解鎖 Lv1–2。"))return;
    card._commitClass();
    const next=bridge.getState?.();if(!next?.cls)return;
    next.wowClassId=row.id;next.wowSpecializationId=null;
    next.level=Math.max(Number(row.minLevel)||3,Number(next.level)||1);
    next.classLevels={[next.cls.n]:next.level};
    next.classConfirmed=true;next.sub=null;next.subConfirmed=false;
    bridge.renderClasses?.();bridge.renderLevel?.();bridge.update?.();bridge.save?.();
  });
  grid.after(box);
}

export function renderWowPrivateProgression(root,provider,meta,state){
  const host=root?.querySelector?.("#lvlBody");if(!host)return;
  host.querySelector("#wowPrivateProjection")?.remove();
  const x=buildWowPrivateProjection(provider,state);if(!x)return;
  const groups=[
    ["能力",x.grants],["WoW 覆寫",x.overrides],
    ["職業資源",x.resources],["職業選項",x.choices],
  ].filter(([,list])=>list.length);
  if(!groups.length)return;
  const node=root.createElement("section");node.id="wowPrivateProjection";
  node.className="subclass-preview";node.setAttribute("aria-label","WoW 私人職業進程");
  const scope=state.wowSpecializationId?specLabel(meta,state):
    "尚未選專精 · 僅顯示所有專精共同內容";
  node.innerHTML='<div class="subclass-preview-heading">'+safe(classLabel(meta,state))+
    ' · Lv1–'+Math.min(3,Number(state.level)||1)+' 私人規則投影</div>'+
    '<p class="subclass-preview-help">'+safe(scope)+
    '。核心 2024 HP、熟練、法術位與通用機制仍由原 Creator 引擎計算。</p>'+
    groups.map(([label,list])=>'<details class="subclass-preview-tier" open>'+
      '<summary><b>'+label+'</b>　'+list.length+' 筆</summary>'+
      '<div class="subclass-preview-items">'+cards(list,label)+'</div></details>').join("");
  const ctl=host.querySelector(".lvl-ctl");
  if(ctl?.nextSibling)host.insertBefore(node,ctl.nextSibling);else host.prepend(node);
}
export function renderWowPrivateSpells(root,provider,state){
  const host=root?.querySelector?.("#spellBody");if(!host)return;
  host.querySelector("#wowPrivateSpellProjection")?.remove();
  const x=buildWowPrivateProjection(provider,state);if(!x?.spells?.length)return;
  const node=root.createElement("section");node.id="wowPrivateSpellProjection";
  node.className="subclass-preview";node.setAttribute("aria-label","WoW 私人法術");
  node.innerHTML='<div class="subclass-preview-heading">WoW 官方職業／專精法術映射</div>'+
    '<p class="subclass-preview-help">依目前 Lv1–'+Math.min(3,Number(state.level)||1)+
    ' progression 顯示私人來源法術；不會錯寫成 PHB 核心法術或擅自改變準備數量。</p>'+
    '<div class="spell-grid">'+x.spells.map(record=>
      '<div class="spell-chip inbook granted-spell-chip" data-wow-private-spell="'+safe(record.id)+'">'+
      '<span class="sn"><span style="color:var(--leaf)">❧ '+
      safe(record.name||record.sourceName||record.id)+'</span>'+
      '<span class="tags">WoW 私人來源</span></span>'+
      '<span class="sd">'+body(record)+'</span></div>').join("")+'</div>';
  host.prepend(node);
}
export function renderWowPrivateRunResources(root,provider,state,bridge={}){
  const host=root?.querySelector?.("#playStatusBody");if(!host)return;
  host.querySelector("#wowPrivateRunResources")?.remove();
  const rows=numericWowPrivateResources(provider,state);if(!rows.length)return;
  state.play=state.play||{};state.play.res=state.play.res||{};state.play.resMax=state.play.resMax||{};
  const node=root.createElement("section");node.id="wowPrivateRunResources";
  node.className="ps-feature-library";node.setAttribute("aria-label","WoW 私人職業資源");
  node.innerHTML='<div class="ps-feature-group-title">WoW 私人職業資源</div>'+
    rows.map(row=>{
      state.play.resMax[row.key]=row.max;
      const used=Math.max(0,Math.min(row.max,Number(state.play.res[row.key])||0));
      state.play.res[row.key]=used;
      return '<div class="ps-resource-entry" data-wow-private-resource="'+safe(row.key)+'">'+
        '<div class="ps-counter"><div><div class="ps-counter-name">'+safe(row.label)+
        '</div><div class="ps-counter-info">已使用 '+used+' / '+row.max+'</div></div>'+
        '<div class="ps-count">剩餘 '+(row.max-used)+'</div>'+
        '<div class="ps-counter-help ps-resource-hint"><div><b>效果：</b>'+
        body(row.record)+'</div><div><b>恢復：</b>'+
        safe(row.rest==="short"?"依來源短休／長休恢復":row.rest==="long"?"依來源長休恢復":"依來源規則手動恢復")+
        '</div></div><div class="ps-counter-actions">'+
        '<button type="button" data-wow-res-delta="1" data-wow-res-key="'+safe(row.key)+
        '" '+(used>=row.max?"disabled":"")+'>消耗 −1</button>'+
        '<button type="button" data-wow-res-delta="-1" data-wow-res-key="'+safe(row.key)+
        '" '+(used<=0?"disabled":"")+'>恢復 ＋1</button></div></div></div>';
    }).join("");
  node.addEventListener("click",event=>{
    const button=event.target.closest?.("[data-wow-res-delta]");if(!button)return;
    const key=button.dataset.wowResKey,row=rows.find(x=>x.key===key);if(!row)return;
    const next=Math.max(0,Math.min(row.max,(Number(state.play.res[key])||0)+Number(button.dataset.wowResDelta||0)));
    state.play.res[key]=next;state.play.resMax[key]=row.max;
    bridge.save?.();bridge.renderPlay?.();
  });
  host.append(node);
}
export function renderWowPrivateIdentity(root,meta,state){
  const host=root?.querySelector?.("#finalSheet .fs-id");if(!host)return;
  host.querySelector(".wow-private-identity")?.remove();
  if(!state?.wowClassId)return;
  const span=root.createElement("span");span.className="wow-private-identity";
  span.textContent=" · WoW "+classLabel(meta,state)+(state.wowSpecializationId?" / "+specLabel(meta,state):"");
  host.append(span);
}
export function installWowPrivateCreatorProjection({root=document,provider,meta,bridge={}}={}){
  if(!root||!provider?.ok||!meta)return {ok:false,reason:"PRIVATE_PROVIDER_REQUIRED"};
  const state=()=>bridge.getState?.();
  const api={
    renderClasses:()=>{const s=state();if(s)renderWowHeroClassStarts(root,provider,meta,s,bridge);},
    renderLevel:()=>{const s=state();if(s)renderWowPrivateProgression(root,provider,meta,s);},
    renderSpells:()=>{const s=state();if(s)renderWowPrivateSpells(root,provider,s);},
    renderPlay:()=>{const s=state();if(s)renderWowPrivateRunResources(root,provider,s,bridge);},
    renderFinal:()=>{const s=state();if(s)renderWowPrivateIdentity(root,meta,s);},
    renderAll(){this.renderClasses();this.renderLevel();this.renderSpells();this.renderPlay();this.renderFinal();},
  };
  api.renderAll();
  return {ok:true,...api};
}

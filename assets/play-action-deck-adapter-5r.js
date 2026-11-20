/* Source bridge: invokes existing character State and canonical spell metadata; no persistence of its own. */
function playStatusActionDeckHTML(){
 const api=window.PlayActionDeck5R;
 if(!api)return "";
 const edition=S.ruleset;
 const db=edition==="2014"?SPELLS14:SPELLS;
 const byName=new Map(db.map(sp=>[sp.n,sp]));
 const metadata=spellMetaDb();
 const slots=playStatusSlots();
 const freeSpeciesNames=new Set(playStatusSpeciesSpellGrants().map(x=>x.name));
 const hasUsableSlot=lv=>lv>0&&slots.some(x=>x.key==="pact"
  ?(Number(String(x.label).match(/\d+/)?.[0])||0)>=lv
  :Number(String(x.key).slice(1))>=lv);
 const picked=[],byId=new Map(),unmapped=new Set();
 const add=(raw,source)=>{
  const name=typeof raw==="string"?raw:(raw?.n||raw?.name||"");
  if(!name)return;
  const canonical=edition==="2024"?normalizeSpellName2024(name):spell14Name(name);
  const sp=byName.get(canonical)||byName.get(name);
  if(!sp){unmapped.add(name);return;}
  const m=metadata[sp.n]||{};
  const sourceText=String(source||"");
  // A granted spell is not automatically eligible to consume ordinary spell slots.
  const slotEntitled=["已準備","已準備／已知","恆定準備"].includes(sourceText)
   ||raw?.mode==="prepared"||/也可用法術位/.test(String(raw?.note||""));
  const slotAvailable=slotEntitled&&hasUsableSlot(Number(sp.lv)||0);
  const id=edition+":"+(sp.identifier||sp.eng||sp.n);
  const existing=byId.get(id);
  if(existing){
   existing.freeResource ||= freeSpeciesNames.has(sp.n);
   existing.slotAvailable ||= slotAvailable;
   if(sourceText&&!existing.src.split("／").includes(sourceText))existing.src+=(existing.src?"／":"")+sourceText;
   return;
  }
  const row={
   id,n:sp.n,name:spellNameText(sp),lv:sp.lv,
   time:m.time||"",range:m.range||"",con:sp.con,rit:sp.rit,src:sourceText,
   freeResource:freeSpeciesNames.has(sp.n),slotAvailable,
   fullHtml:spellSheetEntry({n:sp.n,lv:sp.lv,d:sp.d,tag:sourceText,con:sp.con,rit:sp.rit})
  };
  picked.push(row);byId.set(id,row);
 };
 if(edition==="2014"){
  for(const ci of castingProfiles2014()){
   const st=S.spellByClass?.[ci.name]||{};
   (st.cantrips||[]).forEach(n=>add(n,"職業戲法"));
   (ci.kind==="book"?(st.prepared||[]):(st.known||[])).forEach(n=>add(n,"已準備／已知"));
   fixedSpells2014(ci.name).forEach(x=>add(x,"恆定準備"));
   if(ci.name==="邪術師"){
    const cs=S.classChoices14?.["邪術師"]||{};
    [6,7,8,9].forEach(lv=>{if(cs["arcanum"+lv])add(cs["arcanum"+lv],"玄奧秘法")});
   }
  }
  featGrantedSpells().forEach(x=>add(x,x.src||"來源授予"));
 }else{
  [...S.cantrips,...(S.styleCantrips2024||[])].forEach(n=>add(n,"戲法"));
  [...S.prepared].forEach(n=>add(n,"已準備"));
  grantedSpells2024().forEach(x=>add(x,x.src||"特性授予"));
  (S.customSpells||[]).forEach(x=>add(x,"自訂法術"));
 }
 let html=api.render(picked,{escape:x=>escFeatureHTML(String(x??""))});
 if(unmapped.size)html=html.replace("</section>",'<p class="ps-ad-explain">有 '+unmapped.size+' 項角色自訂／非標準法術尚無可核對的施法時間，請至法術表查看；未強行分類。</p></section>');
 return html;
}

/* Presentation only: rehome the SAME controls. No extra character State or counters.
   Keep all spell cards under #psActions so existing rule detail, quick jumps and QA
   continue using the canonical spell projection. */
function arrangePlayActionWorkspace(root){
 const nav=root?.querySelector(".ps-jump-nav");
 const action=root?.querySelector("#psActions"),slots=root?.querySelector("#psSlots"),resources=root?.querySelector("#psResources");
 if(!nav||!action||!slots||!resources||root.querySelector(".ps-unified-workspace"))return;
 const make=(tag,cls)=>{const node=document.createElement(tag);node.className=cls;return node};
 const layout=make("div","ps-unified-workspace");
 const main=make("div","ps-unified-main");
 const rail=make("aside","ps-unified-rail");
 rail.setAttribute("aria-label","角色狀態、法術位與資源");
 // The action column remains a SINGLE #psActions section. Split only its
 // presentation into ordinary actions versus bonus actions/reactions/checks.
 const columns=make("div","ps-action-columns");
 const primary=make("div","ps-action-primary");
 const secondary=make("div","ps-action-secondary");
 for(const group of [...action.querySelectorAll(":scope > .ps-ad-group")]){
  (["bonus","reaction"].includes(group.dataset.psActionGroup)?secondary:primary).append(group);
 }
 columns.append(primary,secondary);action.append(columns);
 const death=root.querySelector("#psDeath");
 const ability=[...root.querySelectorAll(".ps-section")].find(s=>
  s.querySelector(":scope > h3")?.textContent?.includes("屬性調整值／豁免"));
 const advanced=root.querySelector(".ps-secondary-stats");
 if(death)secondary.append(death);
 if(ability)secondary.append(ability);
 if(advanced)secondary.append(advanced);
 const hud=root.querySelector(".ps-run-hud");
 const life=root.querySelector("#psLife");
 if(hud)rail.append(hud);
 rail.append(slots,resources);
 if(life)rail.append(life);
 main.append(action);layout.append(rail,main);
 nav.insertAdjacentElement("afterend",layout);
 // The main renderer deliberately moves these three controls after arranging
 // the workspace. Rehome them after that move without cloning or rebinding.
 queueMicrotask(()=>{
  if(!root.isConnected||root.querySelector(".ps-unified-workspace")!==layout)return;
  const conditions=root.querySelector(".session-current");
  if(conditions)rail.insertBefore(conditions,slots);
  for(const selector of ["#psRest",".ps-undo-row"]){
   const item=root.querySelector(selector);
   if(item)rail.append(item);
  }
 });
 const hero=root.querySelector(".ps-hero");
 if(hero&&!hero.querySelector(".ps-desktop-tools")){
  const toolbar=make("div","ps-desktop-tools");
  toolbar.setAttribute("role","group");
  toolbar.setAttribute("aria-label","角色卡與匯出捷徑");
  for(const [label,run] of [
   ["完整角色卡",()=>go(7)],
   ["匯出 JSON",()=>exportJSON()],
   ["下載 PDF",()=>exportOfficialCharacterSheet()]
  ]){
   const button=document.createElement("button");
   button.type="button";button.textContent=label;
   button.addEventListener("click",run);
   toolbar.append(button);
  }
  hero.append(toolbar);
 }
}

/* Source bridge: invokes existing character State and canonical spell metadata; no persistence of its own. */
function playStatusActionDeckHTML(){
 const api=window.PlayActionDeck5R;
 if(!api)return "";
 const edition=S.ruleset;
 const db=edition==="2014"?SPELLS14:SPELLS;
 const byName=new Map(db.map(sp=>[sp.n,sp]));
 const metadata=spellMetaDb();
 const picked=[],unmapped=new Set();
 const add=(raw,source)=>{
  const name=typeof raw==="string"?raw:(raw?.n||raw?.name||"");
  if(!name)return;
  const canonical=edition==="2024"?normalizeSpellName2024(name):spell14Name(name);
  const sp=byName.get(canonical)||byName.get(name);
  if(!sp){unmapped.add(name);return;}
  const m=metadata[sp.n]||{};
  const sourceText=String(source||"");
  picked.push({
   id:edition+":"+(sp.identifier||sp.eng||sp.n),
   n:sp.n,name:spellNameText(sp),lv:sp.lv,
   time:m.time||"",range:m.range||"",con:sp.con,rit:sp.rit,src:sourceText,
   fullHtml:spellSheetEntry({n:sp.n,lv:sp.lv,d:sp.d,tag:sourceText,con:sp.con,rit:sp.rit})
  });
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

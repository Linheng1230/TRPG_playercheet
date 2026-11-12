/* PHB 2024 class starting equipment. Source: pinned 5RTools PHB2024
 * D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024/data__class__class-*.json
 * Only actual (A)/(B)/(C) branches are choices; prose "選擇A或B" is not a branch.
 * label = visible inventory; weapons = unique combat choices; items records quantities/packs.
 */
const CLASS_GEAR_2024=Object.freeze({
 "野蠻人":[
  {k:"A",label:"巨斧、手斧 ×4、探索套組、15 gp",gp:15,weapons:["巨斧","手斧"],items:"手斧 ×4、探索套組"},
  {k:"B",label:"75 gp",gp:75}
 ],
 "吟遊詩人":[
  {k:"A",label:"皮甲、匕首 ×2、自選樂器、藝人套組、19 gp",gp:19,armor:"皮甲",weapons:["匕首"],items:"匕首 ×2、藝人套組",pick:"請輸入你所選擇的樂器"},
  {k:"B",label:"90 gp",gp:90}
 ],
 "牧師":[
  {k:"A",label:"鍊甲衫、盾牌、釘頭錘、聖徽、祭司套組、7 gp",gp:7,armor:"鍊甲衫",shield:true,weapons:["釘頭錘"],items:"聖徽、祭司套組"},
  {k:"B",label:"110 gp",gp:110}
 ],
 "德魯伊":[
  {k:"A",label:"皮甲、盾牌、鐮刀、德魯伊法器、探索套組、草藥工具、9 gp",gp:9,armor:"皮甲",shield:true,weapons:["鐮刀"],items:"德魯伊法器、探索套組、草藥工具"},
  {k:"B",label:"50 gp",gp:50}
 ],
 "戰士":[
  {k:"A",label:"鍊甲、巨劍、連枷、標槍 ×8、地城探索者包、4 gp",gp:4,armor:"鍊甲",weapons:["巨劍","連枷","標槍"],items:"標槍 ×8、地城探索者包"},
  {k:"B",label:"鑲釘皮甲、彎刀、短劍、長弓、箭 ×20、箭袋、地城探索者包、11 gp",gp:11,armor:"鑲釘皮甲",weapons:["彎刀","短劍","長弓"],items:"箭 ×20、箭袋、地城探索者包"},
  {k:"C",label:"155 gp",gp:155}
 ],
 "武僧":[
  {k:"A",label:"矛、匕首 ×5、自選已熟練的工匠工具或樂器、探索套組、11 gp",gp:11,weapons:["矛","匕首"],items:"匕首 ×5、探索套組",pick:"請輸入你已熟練的工匠工具或樂器"},
  {k:"B",label:"50 gp",gp:50}
 ],
 "聖武士":[
  {k:"A",label:"鍊甲、盾牌、長劍、標槍 ×6、聖徽、祭司套組、9 gp",gp:9,armor:"鍊甲",shield:true,weapons:["長劍","標槍"],items:"標槍 ×6、聖徽、祭司套組"},
  {k:"B",label:"150 gp",gp:150}
 ],
 "遊俠":[
  {k:"A",label:"鑲釘皮甲、彎刀、短劍、長弓、箭 ×20、箭袋、德魯伊法器（槲寄生）、探索套組、7 gp",gp:7,armor:"鑲釘皮甲",weapons:["彎刀","短劍","長弓"],items:"箭 ×20、箭袋、德魯伊法器（槲寄生）、探索套組"},
  {k:"B",label:"150 gp",gp:150}
 ],
 "遊蕩者":[
  {k:"A",label:"皮甲、匕首 ×2、短劍、短弓、箭 ×20、箭袋、盜賊工具、竊賊套組、8 gp",gp:8,armor:"皮甲",weapons:["匕首","短劍","短弓"],items:"匕首 ×2、箭 ×20、箭袋、盜賊工具、竊賊套組"},
  {k:"B",label:"100 gp",gp:100}
 ],
 "術士":[
  {k:"A",label:"矛、匕首 ×2、奧術法器（水晶）、地城探索者包、28 gp",gp:28,weapons:["矛","匕首"],items:"匕首 ×2、奧術法器（水晶）、地城探索者包"},
  {k:"B",label:"50 gp",gp:50}
 ],
 "邪術師":[
  {k:"A",label:"皮甲、鐮刀、匕首 ×2、奧術法器（法球）、秘術書、學者套組、15 gp",gp:15,armor:"皮甲",weapons:["鐮刀","匕首"],items:"匕首 ×2、奧術法器（法球）、秘術書、學者套組"},
  {k:"B",label:"100 gp",gp:100}
 ],
 "法師":[
  {k:"A",label:"匕首 ×2、奧術法器（長棍）、長袍、法術書、學者套組、5 gp",gp:5,weapons:["匕首"],items:"匕首 ×2、奧術法器（長棍）、長袍、法術書、學者套組"},
  {k:"B",label:"55 gp",gp:55}
 ]
});
function classGearChoice24(){return (CLASS_GEAR_2024[S.cls&&S.cls.n]||[]);}
function gear24Escape(s){return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
function addClassGear24(mode){
 if(S.ruleset!=="2024"||!S.cls)return;
 const g=S.gear,option=classGearChoice24().find(x=>x.k===mode);
 if(!option){toast("找不到職業起始裝備方案");return}
 if(g.classPackage24){toast("已領取職業起始裝備，請先使用「修改方案」退回原方案");return}
 const selection=String(g.classGearChoice24||"").trim();
 if(option.pick){const permitted=S.cls.n==="吟遊詩人"?INSTRUMENTS_2014:[...ARTISAN_TOOLS_2014,...INSTRUMENTS_2014];if(!permitted.includes(selection)){toast("請先從列表選擇符合職業的樂器或工具");return}}
 const armBefore=g.armor||"",shieldBefore=!!g.shield;
 let extra=[option.items||"",option.pick?selection:""].filter(Boolean).join("、");
 let armorSet="";
 if(option.armor){
  if(!g.armor){g.armor=option.armor;armorSet=option.armor}
  else if(g.armor!==option.armor)extra=[extra,"備用護甲："+option.armor].filter(Boolean).join("、");
 }
 if(option.shield)g.shield=true;
 const weaponGrant=(option.weapons||[]).filter(n=>WEAPONS.some(w=>w[1]===n));
 weaponGrant.forEach(n=>g.weapons.push(n));
 if(extra)g.items=[g.items,extra].filter(Boolean).join("、");
 setMoneyCp(moneyCp()+option.gp*100);
 g.classGearGrant24={owner:S.cls.n,mode:option.k,items:extra,weapons:weaponGrant,goldCp:option.gp*100,armorBefore:armBefore,armorSet:armorSet,shieldBefore:shieldBefore,shieldSet:!!option.shield};
 g.classPackage24=S.cls.n;g.classPackage24Mode=option.k;
 renderFinal();update();autoSave();toast("已領取 "+S.cls.n+"職業方案 "+option.k);
}
/* Undo must never silently discard later purchases or make the coin balance negative.
 * Legacy grants without provenance remain read-only to protect existing saved characters.
 */
function rollbackStartingGear24(kind){
 const g=S.gear,isClass=kind==="class",pkgKey=isClass?"classPackage24":"bgPackage24",modeKey=isClass?"classPackage24Mode":"bgPackage24Mode",grantKey=isClass?"classGearGrant24":"bgGearGrant24";
 if(!g[pkgKey])return true;
 const grant=g[grantKey];
 if(!grant||grant.owner!==g[pkgKey]){toast("舊版起始裝備缺少可安全退回的紀錄，請先匯出角色 JSON 備份，再手動調整裝備");return false}
 const cp=+grant.goldCp||0;
 if(moneyCp()<cp){toast("原方案金幣已花費，請先補足 "+(cp/100)+" gp，才能安全更換");return false}
 const orig=String(g.items||"").split("、").filter(Boolean),part=String(grant.items||"").split("、").filter(Boolean);
 let pos=-1;
 if(part.length){
  for(let i=0;i<=orig.length-part.length;i++){if(part.every((x,j)=>orig[i+j]===x)){pos=i;break}}
  if(pos<0){toast("起始物品已被手動修改，無法安全退回；請先恢復原物品清單");return false}
 }
 const probe=(g.weapons||[]).slice();
 for(const n of grant.weapons||[]){const i=probe.lastIndexOf(n);if(i<0){toast("起始武器已被移除，無法安全退回；請先補回武器");return false}probe.splice(i,1)}
 if(pos>=0)orig.splice(pos,part.length);
 g.items=orig.join("、");g.weapons=probe;
 setMoneyCp(moneyCp()-cp);
 if(grant.armorSet&&g.armor===grant.armorSet)g.armor=grant.armorBefore||"";
 if(grant.shieldSet&&!grant.shieldBefore&&!(g.purchases||{})["a:盾牌"])g.shield=false;
 delete g[pkgKey];delete g[modeKey];delete g[grantKey];
 return true;
}
function renderClassGear24(){
 if(S.ruleset!=="2024"||!S.cls)return "";
 const g=S.gear,opts=classGearChoice24(),claimed=g.classPackage24===S.cls.n,mode=g.classPackage24Mode||"A";
 const current=opts.find(x=>x.k===mode);
 let h='<div class="play-box"><div class="pt">2024 職業起始裝備 · '+gear24Escape(displayName5R("classes",S.cls.n))+'</div>';
 if(claimed){
  h+='<div style="font-size:13px">✓ 已選 '+gear24Escape(mode)+' 方案：'+gear24Escape(current?current.label:"已領取")+' <button type="button" data-classgear-edit style="margin-left:8px">修改方案</button></div>';
 }else{
  h+='<div style="font-size:12.5px;margin-bottom:8px">請選擇職業提供的起始裝備（與背景裝備分開領取）：</div>';
  opts.forEach(o=>{h+='<div style="padding:7px 0;border-top:1px solid var(--line-soft);font-size:13px"><b>'+gear24Escape(o.k)+'：</b>'+gear24Escape(o.label)+' <button type="button" data-classgear="'+o.k+'" style="margin-left:8px">選擇 '+o.k+'</button></div>'});
  const needsPick=opts.some(o=>o.pick);
  if(needsPick){
   const allowed=S.cls.n==="吟遊詩人"?INSTRUMENTS_2014:[...ARTISAN_TOOLS_2014,...INSTRUMENTS_2014];
   const selected=String(g.classGearChoice24||"");
   h+='<label style="display:block;font-size:12px;margin-top:8px">A 方案自選樂器／工具 <select id="classGearChoice24" style="min-width:220px;width:70%;margin-left:6px"><option value="">— 選擇樂器或工具 —</option>'+allowed.map(x=>'<option value="'+gear24Escape(x)+'"'+(selected===x?' selected':'')+'>'+gear24Escape(x)+'</option>').join("")+'</select></label>';
  }
 }
 h+='</div>';return h;
}
function renderBgGear24(){
 if(S.ruleset!=="2024"||!S.bg||!BG_GEAR_2024[S.bg.n])return "";
 const g=S.gear,bg=resolvedBgGear24(),claimed=g.bgPackage24===S.bg.n,mode=g.bgPackage24Mode||"A";
 let h='<div class="play-box"><div class="pt">2024 背景起始裝備 · '+gear24Escape(displayName5R("backgrounds",S.bg.n))+'</div>';
 if(claimed)h+='<div style="font-size:13px">✓ 已選 '+gear24Escape(mode)+' 方案 <button type="button" data-bggear-edit style="margin-left:8px">修改方案</button></div>';
 else{
  h+='<div style="font-size:13px"><b>A：</b>'+canonicalInventoryText5R(bg.items)+(bg.weapons&&bg.weapons.length?'、'+bg.weapons.map(n=>displayName5R("weapons",n)).join("、"):"")+'、'+bg.gp+' gp<br><b>B：</b>50 gp</div>';
  if(S.bg.n==="流浪兒")h+='<div class="gear-ctl" style="margin-top:7px"><span style="font-size:12px">A 包賭具</span><select id="bgGearGame24"><option value="">— 選擇賭具 —</option>'+GAMING_2014.map(x=>'<option value="'+gear24Escape(x)+'"'+(S.bgChoice2024&&S.bgChoice2024.gearGame===x?' selected':'')+'>'+gear24Escape(displayName5R("tools",x))+'</option>').join("")+'</select></div>';
  h+='<div style="display:flex;gap:7px;margin-top:8px"><button type="button" data-bggear="A">選擇 A 裝備包</button><button type="button" data-bggear="B">選擇 B：50 gp</button></div>';
 }
 h+='</div>';return h;
}

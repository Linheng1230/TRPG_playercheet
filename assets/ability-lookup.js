/* Ability Lookup module contract:
 * - Defines abilityRefFilter and the pure/derived helpers consumed by renderRef().
 * - Reads canonical globals only at call time; it does not own Creator state.
 * - Must load before the main inline application script.
 */
const abilityRefFilter={mode:"active",q:"",actions:new Set()};
/* ============ 能力速查 ============ */
function abilityRuleKey(raw){return String(raw||"").split("(")[0].trim()}
function abilityMeta(text){
 const t=String(text||"").replace(/\s+/g," ");
 const actions=[];
 if(/附贈動作/.test(t))actions.push("附贈動作");
 if(/反應/.test(t))actions.push("反應");
 if(/(?:攻擊動作[^。；]{0,45}(?:替換|取代)|將其中一次攻擊替換)/.test(t))actions.push("攻擊替代");
 if(/魔法動作/.test(t))actions.push("魔法動作");
 if(/(?:^|[。；])[^。；]{0,24}(?:以|用|執行|採取)一?個?動作/.test(t)||/(?:執行|採取)動作/.test(t))actions.push("動作");
 if(/無需動作/.test(t))actions.push("無需動作");
 const explicit=actions.length>0||/(?:你可以|你可|可用|可以用|消耗|啟動|施放|傳送|替換為|改為|選擇[^。；]{0,20}(?:生物|目標|效果))/.test(t);
 const trigger=/(?:當你|每當|若你|命中|未命中|受到[^。；]{0,18}傷害|生命值[^。；]{0,15}0)/.test(t);
 const active=explicit||trigger;
 const passive=!active||/(?:抗性|免疫|熟練|速度(?:提升|增加)|生命值上限|AC\s*[+＋]|具有優勢|具有劣勢)/.test(t);
 const ranges=[...new Set((t.match(/\d+\s*尺/g)||[]).map(x=>x.replace(/\s+/g,"")))].slice(0,3);
 const dice=[...new Set(t.match(/\b\d+d\d+\b/gi)||[])].slice(0,4);
 const checks=[...new Set((t.match(/(?:力量|敏捷|體質|智力|感知|魅力)?(?:\([^)]{1,12}\))?(?:檢定|豁免)|DC\s*=?\s*[^，。；]{1,36}/gi)||[]))].slice(0,3);
 const resources=[...new Set((t.match(/(?:每回合一次|每長休[^，。；]*|每短休[^，。；]*|長休[^，。；]{0,18}|短休[^，。；]{0,18}|熟練加值[^，。；]{0,12}次|\d+\s*(?:術法點|魔源點|專注點)|法術位|生命骰)/g)||[]))].slice(0,3);
 return {active,passive,actions:[...new Set(actions)],ranges,dice,checks,resources};
}
function abilityRefRows(){
 const out=[],push=(name,source,level,text,kind,id="")=>{if(!name||!text)return;out.push({name,source,level,text:String(text),kind,id,meta:abilityMeta(text)})};
 if(S.ruleset!=="2024")return out;
 for(const sp of SPECIES_2024||[]){
  for(const tr of sp.traits||[]){const m=String(tr).match(/^([^:：]+)[:：](.*)$/),name=m?m[1].trim():String(tr).trim(),fallback=m?m[2].trim():"";push(name,"物種｜"+sp.n,"1",window.ZIZI_5R_SPECIES_RULES?.[sp.n+"|"+name]||fallback,"species")}
 }
 for(const [cls,p] of Object.entries(PROG_2024||{})){
  for(const [lv,raw] of Object.entries(p.f||{}))for(const token of String(raw).split("、")){const key=abilityRuleKey(token),full=window.resolveFeatureRule2024?.(cls,"",key,+lv)||CLASSDESC_2024?.[cls]?.[key]||ALLDESC?.[key],shown=typeof displayFeatureName5R==="function"?displayFeatureName5R(cls,"",token,+lv):key;push(shown,"職業｜"+(typeof displayName5R==="function"?displayName5R("classes",cls):cls),String(lv),full,"class")}
  for(const sub of p.subs||[])for(const [lv,raw] of Object.entries(sub.f||{}))for(const token of String(raw).split("、")){const key=abilityRuleKey(token),full=window.resolveFeatureRule2024?.(cls,sub.n,key,+lv)||SUBD?.[key]||CLASSDESC_2024?.[cls]?.[key]||ALLDESC?.[key],shown=typeof displayFeatureName5R==="function"?displayFeatureName5R(cls,sub.n,token,+lv):key;push(shown,"子職業｜"+(typeof displayName5R==="function"?displayName5R("classes",cls):cls)+"・"+(typeof displayName5R==="function"?displayName5R("subclasses",sub.n):sub.n),String(lv),full,"subclass")}
 }
 for(const [name,id] of Object.entries(ORIGIN_FEAT_IDENTIFIER_2024||{})){const r=window.ZIZI_5R_FEAT_RULES?.[id],shown=typeof canonicalFeatName5R==="function"?canonicalFeatName5R(name):name;push(shown,"起源專長","1",r?.text||FEATS?.[name],"feat",id)}
 for(const f of GFEATS_2024||[]){const r=window.ZIZI_5R_FEAT_RULES?.[f.id],shown=typeof canonicalFeatName5R==="function"?canonicalFeatName5R(f):f.n;push(shown,"通用專長","4+",r?.text||f.d,"feat",f.id)}
 for(const f of FSTYLES||[]){const r=window.ZIZI_5R_FEAT_RULES?.[f.id],shown=typeof canonicalFeatName5R==="function"?canonicalFeatName5R(f):f.n;push(shown,"戰鬥風格","職業授予",r?.text||f.d,"style",f.id)}
 for(const f of BOONS||[]){const r=window.ZIZI_5R_FEAT_RULES?.[f.id],shown=typeof canonicalFeatName5R==="function"?canonicalFeatName5R(f):f.n;push(shown,"史詩恩賜","19",r?.text||f.d,"boon",f.id)}
 for(const [name,text] of Object.entries(window.ZIZI_5R_MANEUVERS||{}))push(typeof displayName5R==="function"?displayName5R("maneuvers",name):name,"戰技","3+",text,"maneuver");
 for(const x of METAMAGIC||[])push(typeof canonicalActiveName5R==="function"?canonicalActiveName5R(x.n):x.n,"超魔法","2+",window.ZIZI_5R_ACTIVE_OPTION_RULES?.["metamagic|"+x.n]?.text||x.d,"metamagic");
 for(const x of INVOCATIONS||[])push(typeof canonicalActiveName5R==="function"?canonicalActiveName5R(x.n):x.n,"魔能祈喚",String(x.lv||1)+"+",window.ZIZI_5R_ACTIVE_OPTION_RULES?.["invocations|"+x.n]?.text||x.d,"invocation");
 const divineRule=window.ZIZI_5R_FULL_FEATURE_RULES?.["牧師||神聖秩序|1"]||"";for(const x of DIVINE_ORDER||[])push(x.n,"牧師｜神聖秩序","1",divineRule||x.d,"choice");
 const primalRule=window.ZIZI_5R_FULL_FEATURE_RULES?.["德魯伊||原初秩序|1"]||"";for(const x of PRIMAL_ORDER||[])push(x.n,"德魯伊｜原初秩序","1",primalRule||x.d,"choice");
 const blessedRule=window.ZIZI_5R_FULL_FEATURE_RULES?.["牧師||受祝打擊|7"]||"";for(const x of BLESSED_OPTS||[])push(x.n,"牧師｜受祝打擊","7",blessedRule||x.d,"choice");
 const efuryRule=window.ZIZI_5R_FULL_FEATURE_RULES?.["德魯伊||元素之怒|7"]||"";for(const x of EFURY_OPTS||[])push(x.n,"德魯伊｜元素之怒","7",efuryRule||x.d,"choice");
 return out;
}
function abilityBadge(txt){return '<span class="ability-ref-badge">'+escFeatureHTML(txt)+'</span>'}
function abilityRuleHTML(raw){
 const {flavor,rows}=featureRuleParts(raw);
 return (flavor?'<div class="ability-ref-flavor">'+escFeatureHTML(flavor)+'</div>':'')+
 rows.map(({key,val})=>'<div class="ability-ref-row">'+(key?'<span class="ability-ref-key">'+escFeatureHTML(key)+'</span>':'')+'<span class="ability-ref-val">'+escFeatureHTML(val)+'</span></div>').join('');
}
function renderAbilityRef(){
 const rows=abilityRefRows(),q=abilityRefFilter.q.trim().toLowerCase();
 const filtered=rows.filter(r=>{
  if(abilityRefFilter.mode==="active"&&!r.meta.active)return false;
  if(abilityRefFilter.mode==="passive"&&!r.meta.passive)return false;
  if(abilityRefFilter.actions.size&&!r.meta.actions.some(x=>abilityRefFilter.actions.has(x)))return false;
  if(q&&!((r.name+" "+r.source+" "+r.text).toLowerCase().includes(q)))return false;
  return true;
 }).sort((a,b)=>(b.meta.active-a.meta.active)||String(a.source).localeCompare(String(b.source),"zh-Hant")||((+a.level||99)-(+b.level||99))||a.name.localeCompare(b.name,"zh-Hant"));
 const actionOpts=["動作","附贈動作","反應","攻擊替代","魔法動作","無需動作"];
 return '<div class="ability-ref-panel">'+
  '<div class="ability-ref-tools"><input id="abilityRefQ" value="'+escFeatureHTML(abilityRefFilter.q)+'" placeholder="搜尋能力、來源、效果、DC、傷害骰…">'+
  '<div class="ability-ref-modes"><button data-ar-mode="active" class="'+(abilityRefFilter.mode==="active"?"active":"")+'">主動優先</button><button data-ar-mode="all" class="'+(abilityRefFilter.mode==="all"?"active":"")+'">全部</button><button data-ar-mode="passive" class="'+(abilityRefFilter.mode==="passive"?"active":"")+'">被動</button></div></div>'+
  '<div class="ability-ref-actions">'+actionOpts.map(x=>'<button data-ar-action="'+x+'" class="'+(abilityRefFilter.actions.has(x)?"active":"")+'">'+x+'</button>').join("")+'<button data-ar-clear="1">清除</button></div>'+
  '<div class="ability-ref-note">共 '+filtered.length+' / '+rows.length+' 項。主動能力優先整理使用時機、目標／距離、檢定／豁免、傷害骰、資源與恢復；點開卡片查看完整規則。</div>'+
  '<div class="ability-ref-list">'+filtered.map(r=>{const tags=[r.meta.active?"主動":"被動",...r.meta.actions,...r.meta.ranges,...r.meta.dice,...r.meta.checks,...r.meta.resources].slice(0,9);return '<details class="ability-ref-card"><summary><span class="ability-ref-name">'+escFeatureHTML(r.name)+'</span><span class="ability-ref-source">'+escFeatureHTML(r.source)+' · '+escFeatureHTML(r.level)+'級</span><span class="ability-ref-tags">'+tags.map(abilityBadge).join("")+'</span></summary><div class="ability-ref-rule">'+abilityRuleHTML(r.text)+'</div></details>'}).join("")+'</div></div>';
}

/* 2024 職業速查：僅投影既有 CLASSES / PROG_2024 / canonical Feature rules，不維護第二份規則。 */
const classRefState5R={className:"野蠻人",subName:"",band:"all",q:""};
const CLASS_REF_EN_5R={野蠻人:"Barbarian",吟遊詩人:"Bard",牧師:"Cleric",德魯伊:"Druid",戰士:"Fighter",武僧:"Monk",聖武士:"Paladin",遊俠:"Ranger",遊蕩者:"Rogue",術士:"Sorcerer",邪術師:"Warlock",法師:"Wizard"};
function cr5rEsc(value){return escFeatureHTML(String(value==null?"":value));}
function cr5rTitle(cls,sub,name,level){
 const clean=String(name||"").trim();
 return typeof displayFeatureName5R==="function"?displayFeatureName5R(cls,sub,clean,level):clean;
}
function cr5rSplit(value){return String(value||"").split("、").map(s=>s.trim()).filter(Boolean);}
/* 規則正文只取 canonical 原文；以下僅負責閱讀排版，不另存摘要或改動機制。 */
function cr5rRuleHTML(value){
 const source=String(value||"").replace(/\r\n?/g,"\n").trim();
 if(!source)return "";
 // 上游以空格串接子項與條列，先還原可識別的自然分界。
 const prepared=source.replace(/：[ \t]+(?=[\u3400-\u9fff])/g,"：\n");
 const chunks=(prepared.match(/[^。！？\n]+(?:[。！？]+)?[ \t]*|\n+/g)||[])
   .map(s=>s.trim()).filter(Boolean);
 let html="",paragraph=[],items=[],offerList=false;
 function flushParagraph(){
  if(paragraph.length){html+='<p>'+cr5rEsc(paragraph.join(" "))+'</p>';paragraph=[];}
 }
 function flushItems(){
  if(items.length){html+='<ul class="cr5r-rule-list">'+items.map(x=>'<li>'+cr5rEsc(x)+'</li>').join("")+'</ul>';items=[];}
 }
 for(const chunk of chunks){
  const heading=/^[\u3400-\u9fff（）「」· ]{2,18}[A-Z][A-Za-z0-9'(), \-]{2,56}[。！？]$/.test(chunk);
  if(heading){
   flushParagraph();flushItems();offerList=false;
   html+='<h4 class="cr5r-rule-heading">'+cr5rEsc(chunk)+'</h4>';
   continue;
  }
  if(chunk.endsWith("：")){
   flushParagraph();flushItems();
   html+='<p class="cr5r-rule-lead">'+cr5rEsc(chunk)+'</p>';
   offerList=/以下|下列|任一|選項|方式/.test(chunk);
   continue;
  }
  if(offerList&&chunk.length<=52){
   flushParagraph();items.push(chunk);continue;
  }
  flushItems();offerList=false;
  paragraph.push(chunk);
  if(paragraph.length>=2||paragraph.join("").length>=115)flushParagraph();
 }
 flushParagraph();flushItems();
 return html;
}
function cr5rRule(cls,sub,raw,level){
 const db=window.ZIZI_5R_FULL_FEATURE_RULES||{};
 const name=String(raw||"").trim();
 const base=name.replace(/\([^)]*\)|（[^）]*）/g,"").replace(/增至\s*\d+\s*種.*$/,"").trim();
 const keys=[name,base];
 const candidates=[];
 keys.forEach(k=>{
  candidates.push(cls+"|"+(sub||"")+"|"+k+"|"+level);
  if(sub)candidates.push(cls+"||"+k+"|"+level);
 });
 for(const id of candidates)if(db[id])return {text:db[id],canonical:true};
 // 只能取同一職業／子職業之原有特性；不把其他職業的同名特性混進來。
 if(typeof window.resolveFeatureRule2024==="function"){
  for(const k of keys){
   const text=window.resolveFeatureRule2024(cls,sub||"",k,level);
   if(text)return {text,canonical:true};
  }
 }
 const fallback=(typeof CLASSDESC_2024!=="undefined"&&CLASSDESC_2024[cls]||{})[base]
   ||(typeof SUBD!=="undefined"&&SUBD[base])
   ||(typeof FDESC!=="undefined"&&FDESC[base])||"";
 return {text:fallback,canonical:false};
}
function cr5rSpellTier(prog,lv){
 if(prog.caster==="full")return "最高 "+Math.min(9,Math.ceil(lv/2))+" 環法術位";
 if(prog.caster==="half")return "最高 "+Math.min(5,Math.ceil(lv/4))+" 環法術位";
 if(prog.caster==="pact")return "魔契法術位最高 "+Math.min(5,Math.ceil(lv/2))+" 環";
 return "";
}
function cr5rLevelRecords(prog,sub,lv){
 const rows=cr5rSplit(prog.f[lv]).map(raw=>({raw,kind:"職業",sub:""}));
 if(sub)cr5rSplit(sub.f[lv]).forEach(raw=>rows.push({raw,kind:"子職業",sub:sub.n}));
 if((prog.asi||[]).includes(lv))rows.push({raw:"屬性值提升／通用專長",kind:"升級",sub:"",general:true});
 if(lv===19)rows.push({raw:"史詩恩賜專長",kind:"升級",sub:"",general:true});
 return rows;
}
function cr5rCards(cls,prog,sub){
 return Array.from({length:20},(_,i)=>{
  const lv=i+1,rows=cr5rLevelRecords(prog,sub,lv);
  const band=classRefState5R.band;
  if(band!=="all"&&(Math.ceil(lv/5)!==Number(band)))return "";
  const pb=2+Math.floor((lv-1)/4);
  const extras=cr5rSpellTier(prog,lv);
  const headline=rows.map(x=>cr5rTitle(cls.n,x.sub,x.raw,lv)).join("、")||"本級無新增職業特性";
  let blocks=rows.map(x=>{
   const name=cr5rTitle(cls.n,x.sub,x.raw,lv);
   let rule=x.general?{text:lv===19?"於第 19 級依 2024 升級規則取得一項史詩恩賜專長；實際選項與先決條件請參照「專長」速查。":"於此級取得屬性值提升特性，可依 2024 規則選擇適用的通用專長；實際選項與先決條件請參照「專長」速查。",canonical:true}:cr5rRule(cls.n,x.sub,x.raw,lv);
   return '<div class="cr5r-feature"><div class="cr5r-feature-head"><span class="cr5r-kind">'+cr5rEsc(x.kind)+'</span><strong>'+cr5rEsc(name)+'</strong></div>'
    +(rule.text?'<div class="cr5r-rule">'+cr5rRuleHTML(rule.text)+'</div>':'<p class="cr5r-no-rule">本級進程列有此項變動，但目前規則庫沒有獨立的完整說明；請對照職業特性或「能力速查」，勿將本處視為完整規則。</p>')
    +'</div>';
  }).join("");
  if(!rows.length)blocks='<p class="cr5r-level-empty">此級未新增職業／子職業特性；生命值、法術準備及相關數值仍依各職業升級規則進展。</p>';
  return '<details class="cr5r-level" id="cr5rLv'+lv+'"'+(lv===3?' open':'')+'><summary><span class="cr5r-level-badge">Lv '+lv+'</span><span class="cr5r-level-summary"><strong>'+cr5rEsc(headline)+'</strong><small>熟練加值 +'+pb+(extras?' · '+cr5rEsc(extras):'')+'</small></span></summary><div class="cr5r-level-body">'+blocks+'</div></details>';
 }).join("");
}
function renderClassRef5R(){
 const classes=CLASSES,dict=PROG_2024;
 const current=classes.find(c=>c.n===classRefState5R.className)||classes[0];
 if(!current)return '<p>無可用的職業資料。</p>';
 classRefState5R.className=current.n;
 const prog=dict[current.n];
 const sub=prog.subs.find(s=>s.n===classRefState5R.subName)||prog.subs[0];
 classRefState5R.subName=sub.n;
 const isLegacy=S.ruleset==="2014";
 const classButtons=classes.map(c=>{
  const active=c.n===current.n;
  return '<button type="button" class="cr5r-class'+(active?' is-active':'')+'" data-cr5r-class="'+cr5rEsc(c.n)+'" aria-pressed="'+active+'"><strong>'+cr5rEsc(displayName5R("classes",c.n))+'</strong><small>'+cr5rEsc(CLASS_REF_EN_5R[c.n]||"")+'</small></button>';
 }).join("");
 const subButtons=prog.subs.map(s=>{
  const active=s.n===sub.n;
  return '<button type="button" class="cr5r-sub'+(active?' is-active':'')+'" data-cr5r-sub="'+cr5rEsc(s.n)+'" aria-pressed="'+active+'"><strong>'+cr5rEsc(displayName5R("subclasses",s.n))+'</strong><small>'+cr5rEsc(s.d)+'</small></button>';
 }).join("");
 const title=displayName5R("classes",current.n);
 const skills=current.sk.map(n=>cr5rEsc(displayName5R("skills",n))).join("、");
 const bands=[["all","1～20 等"],["1","1～5 等"],["2","6～10 等"],["3","11～15 等"],["4","16～20 等"]].map(x=>{
  const active=x[0]===classRefState5R.band;
  return '<button type="button" class="'+(active?'is-active':'')+'" data-cr5r-band="'+x[0]+'" aria-pressed="'+active+'">'+x[1]+'</button>';
 }).join("");
 return '<section class="cr5r" id="cr5rTop">'
  +'<p class="cr5r-intro">先選職業，再選子職業。下方列出 1～20 等所有等級，點開等級可查職業特性、子職業能力及其效果。內容直接讀取本站 2024 創角／升級的共用規則資料。</p>'
  +(isLegacy?'<p class="cr5r-warning"><strong>規則版本提醒：</strong>目前角色選用 2014；以下職業百科固定展示 2024（5R）規則，不會替換或套用 2014 角色的能力。</p>':'')
  +'<div class="cr5r-section-head"><h3>選擇職業 <small>12 種</small></h3><button type="button" data-cr5r-ability>改用能力速查</button></div>'
  +'<label class="cr5r-search-label" for="cr5rSearch">搜尋職業</label><input id="cr5rSearch" type="search" placeholder="輸入職業中文／英文名稱…" autocomplete="off" value="'+cr5rEsc(classRefState5R.q)+'">'
  +'<div class="cr5r-classes" id="cr5rClasses">'+classButtons+'</div><p id="cr5rNoMatches" class="cr5r-no-matches" hidden>找不到符合的職業。</p>'
  +'<section class="cr5r-detail" id="cr5rDetail"><h3>'+cr5rEsc(title)+' <small>'+cr5rEsc(CLASS_REF_EN_5R[current.n]||"")+'</small></h3><p>'+cr5rEsc(current.desc)+'</p>'
  +'<div class="cr5r-metadata"><span><b>主要屬性</b>'+cr5rEsc(current.pri)+'</span><span><b>生命骰</b>d'+current.hd+'</span><span><b>豁免熟練</b>'+current.saves.map(k=>cr5rEsc(ABN[k]||k)).join("、")+'</span><span><b>技能熟練</b>任選 '+current.skc+' 項</span><span><b>護甲訓練</b>'+cr5rEsc(current.armor)+'</span><span><b>武器熟練</b>'+cr5rEsc(current.weapon)+'</span></div>'
  +'<details class="cr5r-skills"><summary>可選技能一覽</summary><p>'+skills+'</p></details></section>'
  +'<section id="cr5rSubSection" class="cr5r-detail"><div class="cr5r-section-head"><h3>選擇子職業 <small>4 種 · 3 級起</small></h3><button type="button" data-cr5r-top>返回職業</button></div>'
  +'<div class="cr5r-subs">'+subButtons+'</div><p class="cr5r-sub-note">目前查看：<strong>'+cr5rEsc(displayName5R("subclasses",sub.n))+'</strong>。切換子職業後，1～20 等表會同步顯示該子職業的能力。</p></section>'
  +'<section id="cr5rTimeline" class="cr5r-detail"><div class="cr5r-section-head"><h3>1～20 等能力成長</h3><button type="button" data-cr5r-subtop>返回子職業</button></div>'
  +'<div class="cr5r-bands" role="group" aria-label="篩選職業等級">'+bands+'</div>'
  +'<p class="cr5r-progress-note">每一級都列出熟練加值；有施法能力的職業另外標示可用的最高法術位環階。魔契師的秘傳奧法獨立計算。選擇上方區間可快速縮小列表。</p>'
  +'<div class="cr5r-levels">'+cr5rCards(current,prog,sub)+'</div>'
  +'<div class="cr5r-footer"><button type="button" data-cr5r-top>↑ 返回職業列表</button><button type="button" data-cr5r-subtop>↑ 返回子職業</button><button type="button" data-cr5r-ability>前往能力速查</button></div></section>'
  +'<p class="cr5r-source">資料版本：PHB 2024（5R）。核心職業 12 種、各 4 種子職業，共 48 種。共用本站既有的職業等級進程與完整特性規則；不另建獨立文字副本。</p>'
  +'</section>';
}
function cr5rScrollTo(id){
 requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"}));
}
document.addEventListener("input",e=>{
 if(e.target?.id!=="cr5rSearch")return;
 const input=e.target;
 classRefState5R.q=input.value;
 let visible=0;
 document.querySelectorAll("#cr5rClasses [data-cr5r-class]").forEach(btn=>{
  const name=btn.dataset.cr5rClass||"";
  const word=(name+" "+displayName5R("classes",name)+" "+(CLASS_REF_EN_5R[name]||"")).toLocaleLowerCase();
  btn.hidden=!word.includes(classRefState5R.q.trim().toLocaleLowerCase());
  if(!btn.hidden)visible++;
 });
 const empty=document.getElementById("cr5rNoMatches");if(empty)empty.hidden=visible!==0;
});
document.addEventListener("click",e=>{
 const node=e.target.closest?.("[data-cr5r-class],[data-cr5r-sub],[data-cr5r-band],[data-cr5r-top],[data-cr5r-subtop],[data-cr5r-ability]");
 if(!node||!document.getElementById("refBody")?.contains(node))return;
 if(node.hasAttribute("data-cr5r-class")){
  classRefState5R.className=node.dataset.cr5rClass;classRefState5R.subName="";
  classRefState5R.band="all";classRefState5R.q="";
  renderRef();cr5rScrollTo("cr5rDetail");return;
 }
 if(node.hasAttribute("data-cr5r-sub")){
  classRefState5R.subName=node.dataset.cr5rSub;
  renderRef();cr5rScrollTo("cr5rTimeline");return;
 }
 if(node.hasAttribute("data-cr5r-band")){
  classRefState5R.band=node.dataset.cr5rBand;
  renderRef();cr5rScrollTo("cr5rTimeline");return;
 }
 if(node.hasAttribute("data-cr5r-top")){cr5rScrollTo("cr5rTop");return;}
 if(node.hasAttribute("data-cr5r-subtop")){cr5rScrollTo("cr5rSubSection");return;}
 if(node.hasAttribute("data-cr5r-ability"))document.querySelector('#refTabs [data-r="ability"]')?.click();
});
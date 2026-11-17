/* D&D 5R / PHB2024 新手職業適性測驗（僅推薦，不修改角色 S）。
 * Source: docs/NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md
 * 2024 class/subclass/background/species rules and selectable IDs MUST come from
 * the caller's canonical catalog (index.html CLASSES/PROG_2024/etc.).
 * UX affinities below are NOT a rules, feature, origin-feat or character database.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ZIZI_CLASS_FIT_5R = api;
})(typeof globalThis !== "undefined" ? globalThis : null, function () {
  "use strict";
  const VERSION = 1, LETTERS = "ABCD";
  const WEIGHTS = Object.freeze([9, 9, 9, 8, 7, 7, 7, 7, 4, 2]);
  const QUESTIONS = Object.freeze([
    ["戰鬥時，你最希望自己做出什麼貢獻？",["擋住敵人，讓同伴能安全行動","找到破綻，迅速擊倒重要目標","用法術改變戰場，限制敵人行動","治療、強化或激勵隊友"]],
    ["輪到你行動時，哪種操作最有趣？",["使用武器穩定攻擊，持續施壓","迂迴移動，閃避並抓準時機出手","判斷場面，施展最合適的法術","在武器攻擊與魔法之間靈活切換"]],
    ["你希望魔法在角色玩法中佔多少比例？",["幾乎不需要，我喜歡靠本領作戰","主要使用武器，魔法用於關鍵時刻","經常使用魔法，也能應付近身危機","魔法就是我的主要戰鬥手段"]],
    ["敵人準備攻擊受傷的隊友，你會優先？",["上前擋住敵人，保護隊友","快速切入，先解決最危險的目標","阻止敵人行動，或讓他失去優勢","治療、保護或幫隊友撤退"]],
    ["沒有戰鬥的時候，你最想負責？",["與 NPC 交談、說服或表演","潛入、開鎖、偵查與破解陷阱","追蹤、辨認危險與荒野求生","研究線索、辨識魔法與解謎"]],
    ["哪種獲得力量的方式最吸引你？",["苦練武藝、身手與戰鬥技巧","信念、自然力量或神聖誓約","身體或血脈中與生俱來的力量","研究奧祕或與神祕存在建立連結"]],
    ["你比較喜歡如何管理角色能力？",["有穩定可靠的招式，不必常算資源","保留少量強力能力，抓時機爆發","分配有限的法術資源，決定何時施放","事先準備多種能力，依狀況選用"]],
    ["什麼樣的戰鬥節奏最符合你？",["直覺、可靠，操作越清楚越好","位置與時機重要，每回合都在找破綻","先想好策略，再選出最有效的工具","喜歡出其不意，嘗試戲劇性的招式"]],
    ["你最期待在 3 級以後獲得哪類招牌能力？",["狂怒爆發、武器絕技或體術強化","野獸夥伴、自然變身或操控自然","神聖守護、治療奇蹟或鼓舞他人","神祕異能、幻術詭計或超自然魔法"]],
    ["哪一種冒險前的生活最能引起你的興趣？",["軍人、守衛或長期訓練的戰士","學者、抄寫員或祕法學徒","荒野嚮導、農人或隱居者","街頭求生者、藝人或旅行者"]]
  ].map((x,i)=>Object.freeze({id:"Q"+(i+1),index:i,prompt:x[0],options:Object.freeze(x[1].map((t,j)=>Object.freeze({id:LETTERS[j],text:t})))})));
  // Affinity axes, not game rules. Each profile has ten explicit answer signals.
  // A match contributes a positive weight; minority play styles remain possible.
  const CLASS_META = Object.freeze([
    ["barbarian","野蠻人","A A A A C A B A A A","前線突破","靠狂暴近戰壓迫敵人，守住戰線","容易","需要貼近敵人，遠距離與調查手段較有限"],
    ["bard","吟遊詩人","D C D D A B C D C D","團隊支援／社交","先鼓舞同伴，再以法術或交談改變局勢","中等","需要挑選支援時機，直接硬扛傷害不是強項"],
    ["cleric","牧師","D C D D D B C C C B","神聖支援／防護","衡量治療、守護與神術的使用時機","中等","法術選擇多，需要照顧法術位與隊友位置"],
    ["druid","德魯伊","C C D C C B D C B C","自然法術／控場","用自然法術左右地形與敵人，必要時改變形態","較高","法術、變形與不同場景的選擇較多"],
    ["fighter","戰士","A A A A D A A A A A","武器專家／前線","以可靠的武器攻擊與位置控制威脅敵人","容易","若想主要靠施法，必須選擇有魔法路線的子職業"],
    ["monk","武僧","B B A B B A B B A D","機動近戰／體術","利用速度與位置切入，再以體術打亂對手","中等","須兼顧自身防護、距離與有限資源"],
    ["paladin","聖武士","A D B A A B B A C A","神聖前線／隊友守護","持武器站在前線，視需要用神聖力量支援隊友","中等","魔法與武器都要管理，機動與遠距離彈性有限"],
    ["ranger","遊俠","B D B B C B B B B C","荒野追獵／魔武兼修","觀察敵人與地形，以武器和自然魔法靈活應對","中等","必須分配追獵、法術與位置的注意力"],
    ["rogue","遊蕩者","B B A B B A A B D D","偵查潛行／精準打擊","先偵查與找掩護，等時機成熟再精準出手","中等","失去位置優勢時較難發揮，正面防守不占優勢"],
    ["sorcerer","術士","C C D C A C C D D B","天賦魔法／爆發","在關鍵時刻使用法術與超魔法改變局勢","較高","可選法術有限，需要規劃資源與站位"],
    ["warlock","邪術師","C D C C D D B D D D","契約異能／攻守轉換","用穩定魔法攻擊，選擇時機施展少量關鍵法術","中等","法術位較少，特性選擇會影響玩法"],
    ["wizard","法師","C C D C D D D C D B","知識法術／戰場控制","預先準備法術，用不同效果處理戰鬥與謎題","較高","擅長解題但防護較脆弱，法術管理量較多"]
  ].map(row=>Object.freeze({id:row[0],name:row[1],signal:row[2].split(" "),role:row[3],turn:row[4],difficulty:row[5],tradeoff:row[6]})));
  const CLASS_BY_NAME = new Map(CLASS_META.map(x=>[x.name,x]));
  // Subclass hints only. Each entry: canonical site name, answer signals (Q#=letter),
  // thematic direction, practical cost. The actual feature text stays in PROG_2024.
  const SUB_HINTS = Object.freeze({
    "野蠻人":[
      ["狂戰士之道","9A 8A 4B","強烈的近戰進攻節奏","更常把自己放在敵人火力範圍"],
      ["野心之道","9B 5C 6B","野獸與荒野主題","偏向探索與情境選擇"],
      ["世界樹之道","9C 1A 4A","守護同伴與戰線","更在乎隊友位置而非只追求輸出"],
      ["狂熱者之道","9C 6B 7B","信念驅動的狂暴","神聖主題很鮮明，少了純武藝的中性風格"]
    ],
    "吟遊詩人":[
      ["舞蹈學院","2B 8B 5A","靈活走位與舞蹈","更重視位置變化"],
      ["魅音學院","5A 8D 6C","社交魅惑與戲劇表現","需要善用交涉與時機"],
      ["傳識學院","5D 7D 8C","知識與多技能解題","比起正面作戰更仰賴準備"],
      ["勇氣學院","2D 3B 9A","武器與激勵並進","要兼顧近身風險和支援"]
    ],
    "牧師":[
      ["生命領域","1D 4D 9C","治療與團隊續航","需要觀察同伴受傷時機"],
      ["光明領域","1C 3D 9D","聖光施法與反制","偏重法術與位置選擇"],
      ["詭術領域","5B 8D 9D","幻術和機動詭計","需要靈活設計行動"],
      ["戰爭領域","2D 4A 9A","武器前線與神術","比純後排治療更需要承擔風險"]
    ],
    "德魯伊":[
      ["大地結社","5C 7D 8C","環境適應與多用途法術","要安排不同場合的法術"],
      ["月亮結社","2D 3C 9B","野獸變身與近身作戰","需要熟悉形態和戰場位置"],
      ["海洋結社","1C 8D 9B","浪潮與戰場空間","較重視環境與位置配合"],
      ["星辰結社","5D 6D 9D","星象與靈活施法","持續在不同施法目的間取捨"]
    ],
    "戰士":[
      ["戰鬥大師","7D 8C 2A","戰技和精準決策","每回合要多想戰術選項"],
      ["冠軍","7A 8A 9A","直觀的武器進攻","特殊變化少但操作清楚"],
      ["魔能騎士","2D 3C 9D","武器與奧術結合","必須額外學習法術"],
      ["靈能武士","6C 8D 9D","心靈力量增幅武藝","需要掌握額外能力的使用時機"]
    ],
    "武僧":[
      ["開手之道","2B 8B 9A","近身體術與戰場擾亂","要拿捏貼身和撤退距離"],
      ["慈悲之手","1D 4D 9C","攻擊與照護並用","須在傷害與援助之間抉擇"],
      ["陰影之道","5B 8B 9D","潛行與暗影機動","依賴地形與切入時機"],
      ["四象之道","3C 8D 9B","元素力量和體術","管理額外能力與戰場距離"]
    ],
    "聖武士":[
      ["奉獻誓言","4A 6B 9C","守護、信念與榮譽","偏向正面守護"],
      ["榮耀誓言","2B 8D 9A","英雄壯舉與鼓舞","更偏向主動進攻和冒險"],
      ["古賢誓言","5C 6B 9B","自然與生命守護","偏重保護，較少追求純爆發"],
      ["復仇誓言","1B 4B 7B","追擊強敵與精準制裁","容易投入單一優先目標"]
    ],
    "遊俠":[
      ["獸王","5C 9B 4D","與野獸夥伴並肩","需要同時顧及夥伴位置"],
      ["精類浪遊者","5A 6C 8D","妖精魅力與交涉","偏重社交和特殊應對"],
      ["幽域追獵者","5B 8B 4B","埋伏與暗處狩獵","依賴時機和情報"],
      ["獵人","2A 7A 9A","武器獵殺與穩定戰術","魔法變化比其他路線少"]
    ],
    "遊蕩者":[
      ["盜賊","5B 7A 8B","道具、潛入與機動","需要觀察環境與工具"],
      ["刺客","1B 4B 7B","精準伏擊與高風險進攻","仰賴預先取得情報"],
      ["奧術騙徒","2D 3C 9D","幻術、魔法與技巧","要額外管理法術"],
      ["靈魂之刃","6C 8D 9D","心靈力量與潛行","須安排特殊能力和資源"]
    ],
    "術士":[
      ["龍族血脈","6C 9D 1B","血脈力量與元素施法","主題集中，魔法準備需取捨"],
      ["狂野魔法","8D 7B 6C","意外變化與戲劇性魔法","結果變化較難完全預測"],
      ["時鐘靈魂","8C 4C 7D","精密秩序與防護","較重視安排時機"],
      ["異怪心靈","5D 6D 9D","心靈與異界魔法","偏重特殊解法和社交情報"]
    ],
    "邪術師":[
      ["至高妖精宗主","5A 8D 9D","妖精契約與靈活機動","需要善用位置和交涉"],
      ["天界宗主","1D 4D 9C","天界契約與援護","要將有限能力分配給隊友"],
      ["邪魔宗主","1B 7B 9A","強攻與自我生存","更偏向積極進攻"],
      ["舊日支配者","5D 6D 9D","宇宙祕密與心靈異能","以特殊控制取代單純輸出"]
    ],
    "法師":[
      ["防護師","1A 4D 8C","護盾與反制","更重視生存和保護"],
      ["預言師","5D 7D 8C","事先推演和預兆","需要提前規劃法術"],
      ["塑能師","1B 3D 9D","直接的法術火力","較聚焦傷害而非多種解法"],
      ["幻術師","5B 8D 9D","幻象與創意解題","需要靈活判斷敵人的反應"]
    ]
  });
  const FEAT_THEME = Object.freeze({警覺:["B","B"],匠人:["D","C"],治療者:["D","C"],幸運:["B","D"],法術新手:["C","D"],樂師:["A","D"],蠻力攻擊者:["A","A"],多才多藝:["D","A"],酒館鬥士:["A","B"],堅韌:["A","A"]});
  const SPECIES_THEME = Object.freeze({
    人類:["A","D"],精靈:["C","D"],矮人:["A","A"],半身人:["B","D"],阿斯莫:["D","C"],
    龍裔:["B","D"],侏儒:["D","D"],歌利亞:["A","A"],獸人:["A","B"],提夫林:["D","D"]
  });
  const CTAS = Object.freeze(["前往角色百科查規則","到創角頁選擇職業","查看背景與物種建議","比較其他職業"]);
  function questions(){return QUESTIONS.map(q=>({id:q.id,index:q.index,prompt:q.prompt,options:q.options.map(o=>({id:o.id,text:o.text}))}));}
  function normalizeAnswers(a){
    const arr=Array.isArray(a)?a:(a && typeof a==="object"?QUESTIONS.map(q=>a[q.id]??a[q.index]??null):[]);
    return QUESTIONS.map((_,i)=>{const v=arr[i];return typeof v==="string"&&LETTERS.includes(v.trim().toUpperCase())&&v.trim().length===1?v.trim().toUpperCase():null;});
  }
  function serializeAnswers(a){return JSON.stringify({schema:"class-fit-5r",version:VERSION,answers:normalizeAnswers(a)});}
  function restoreAnswers(text){try{const v=typeof text==="string"?JSON.parse(text):text;return v&&v.schema==="class-fit-5r"&&v.version===VERSION?normalizeAnswers(v.answers):Array(10).fill(null);}catch(_){return Array(10).fill(null);}}
  function getAnswersDetails(a,positions){
    return positions.map(i=>({questionId:"Q"+(i+1),question:QUESTIONS[i].prompt,choiceId:a[i],answer:QUESTIONS[i].options[LETTERS.indexOf(a[i])].text}));
  }
  function scoreClass(meta,a){
    let score=0;const contributions=[];
    a.forEach((v,i)=>{
      if(!v)return;
      const primary=meta.signal[i],match=v===primary;
      // Secondary affinity is deliberately weaker; all Q choices can influence rankings.
      const secondary=LETTERS[(LETTERS.indexOf(primary)+1)%4],points=WEIGHTS[i]*(match?3:v===secondary?0.7:0);
      score+=points;if(points>0)contributions.push({i,points,primary:match});
    });
    return {meta,score,contributions};
  }
  function subclassPick(name,subCatalog,a){
    const hints=SUB_HINTS[name]||[];
    const available=(Array.isArray(subCatalog)?subCatalog:[]).filter(s=>s&&typeof s.n==="string");
    const ranked=available.map(s=>{
      const hint=hints.find(h=>h[0]===s.n),signals=hint?hint[1].split(" "):[];
      let tagScore=0;const matched=[];
      for(const token of signals){
        const q=Number(token.slice(0,-1))-1,opt=token.slice(-1);
        if(a[q]===opt){const points=q===8?8:q>=4&&q<=7?5:3;tagScore+=points;matched.push(q);}
      }
      return {source:s,hint,tagScore,matched};
    }).sort((x,y)=>y.tagScore-x.tagScore||available.indexOf(x.source)-available.indexOf(y.source));
    return ranked[0]||null;
  }
  function coreAbilityKeys(classSource,a){
    // Derive ASI compatibility from the actual 2024 Creator class.pri, never a copied class rule table.
    const p=String(classSource?.pri||"");
    const labels={str:"力量",dex:"敏捷",con:"體質",int:"智力",wis:"感知",cha:"魅力"};
    const all=Object.keys(labels).filter(key=>p.includes(labels[key]));
    if(classSource?.n==="戰士"&&p.includes("或"))return [a[1]==="B"||a[0]==="B"?"dex":"str"];
    return all;
  }
  function backgroundFor(meta,classSource,a,catalog,used){
    const available=(catalog.backgrounds||[]).filter(b=>b&&typeof b.n==="string"&&Array.isArray(b.ab)&&b.feat);
    const abilities=coreAbilityKeys(classSource,a);let choices=[];
    for(const b of available){
      const overlap=abilities.filter(x=>b.ab.includes(x)).length;
      if(!overlap)continue;
      // Prefer both primary abilities for dual-attribute builds, rather than flavor-only origins.
      const mechanical=overlap===abilities.length;
      const feat=String(b.feat).split("(")[0],theme=FEAT_THEME[feat]||[];
      const origin=({A:["士兵","衛士","農夫"],B:["賢者","抄寫員","侍僧"],C:["嚮導","農夫","隱士"],D:["流浪兒","藝人","商人","江湖騙子"]})[a[9]]||[];
      const narrative=origin.indexOf(b.n)>=0?2:0;
      const featMatch=(theme.includes(a[0])?1.5:0)+(theme.includes(a[4])?1:0);
      const score=overlap*14+(mechanical?8:0)+featMatch+narrative-(used.has(b.n)?3:0);
      choices.push({source:b,score,mechanical,overlap,feat});
    }
    choices.sort((x,y)=>y.score-x.score||available.indexOf(x.source)-available.indexOf(y.source));
    return choices[0]||null;
  }
  function speciesFor(a,catalog,used){
    const valid=(catalog.species||[]).filter(s=>s&&typeof s.n==="string");
    const scored=valid.map((s,i)=>{
      const theme=SPECIES_THEME[s.n]||[];
      return {source:s,score:(theme.includes(a[0])?3:0)+(theme.includes(a[8])?3:0)+(theme.includes(a[9])?1:0)-(used.has(s.n)?4:0),i};
    }).sort((x,y)=>y.score-x.score||x.i-y.i);
    return scored[0]||null;
  }
  function sourceId(record,fallback){return record && (record.id||record.identifier||record.key||record.n)||fallback;}
  function evaluate(raw,catalog){
    const a=normalizeAnswers(raw),answered=a.filter(Boolean).length;
    if(!catalog || catalog.edition!=="2024" || !Array.isArray(catalog.classes) || !catalog.progression || !Array.isArray(catalog.backgrounds) || !Array.isArray(catalog.species)){
      return {status:"UNAVAILABLE",edition:"2024",answered,total:10,questions:questions(),recommendations:[],message:"尚未載入合法的 2024 職業、子職業、背景與物種資料，無法安全推薦。"};
    }
    if(answered!==10)return {status:"INCOMPLETE",edition:"2024",answered,total:10,questions:questions(),recommendations:[],message:"完成 10 題後會顯示適合的三種角色路線。"};
    const classRows=catalog.classes.filter(c=>c&&CLASS_BY_NAME.has(c.n)&&Array.isArray(catalog.progression[c.n]?.subs)&&catalog.progression[c.n].subs.length);
    const ranked=classRows.map(source=>({source,...scoreClass(CLASS_BY_NAME.get(source.n),a)})).sort((x,y)=>y.score-x.score||CLASS_META.indexOf(x.meta)-CLASS_META.indexOf(y.meta));
    if(!ranked.length)return {status:"UNAVAILABLE",edition:"2024",answered,total:10,questions:questions(),recommendations:[],message:"目前沒有可驗證的 2024 職業，請先載入官方職業清單。"};
    const top=ranked.slice(0,3),usedBg=new Set(),usedSp=new Set(),warnings=[];
    const recommendations=top.map((row,i)=>{
      const sub=subclassPick(row.meta.name,catalog.progression[row.meta.name].subs,a);
      const bg=backgroundFor(row.meta,row.source,a,catalog,usedBg),sp=speciesFor(a,catalog,usedSp);
      if(bg)usedBg.add(bg.source.n);else warnings.push(row.meta.name+"：無相容的合法背景");
      if(sp)usedSp.add(sp.source.n);else warnings.push(row.meta.name+"：無合法物種");
      if(!sub)warnings.push(row.meta.name+"：無合法 2024 子職業");
      const primary=row.contributions.filter(x=>x.primary).sort((x,y)=>y.points-x.points||x.i-y.i);
      // Explain both a concrete combat preference and a distinct play-style signal when possible.
      const combat=primary.find(x=>x.i<4),style=primary.find(x=>x.i>=4&&x.i<=8);
      const relevance=[combat?.i,style?.i,...primary.map(x=>x.i),...row.contributions.filter(x=>!x.primary).map(x=>x.i)].filter(x=>x!==undefined);
      const picked=[...new Set(relevance)].slice(0,2);
      while(picked.length<2){const q=a.findIndex((_,j)=>!picked.includes(j));if(q<0)break;picked.push(q);}
      picked.sort((x,y)=>x-y);
      const near=i>0&&Math.abs(row.score-top[0].score)<=7;
      const contrast=i===0?"首選路線":i===1?(near?"與首選同樣適合，偏向"+row.meta.role:"第二種路線：更偏向"+row.meta.role):"另一種玩法：偏向"+row.meta.role;
      const sourceSub=sub?.source||null,hint=sub?.hint||null;
      const bgCompatibility=bg?(bg.mechanical?"背景可提升此路線需要的主要屬性，並提供起源專長「"+bg.feat+"」。":"背景支援部分主要屬性；創角時請再檢查其餘屬性安排。"):null;
      const pref={edition:"2024",confirmed:false,classId:sourceId(row.source,row.meta.id),classRef:row.source.n,subclassId:sourceId(sourceSub,null),subclassRef:sourceSub?.n||null,backgroundId:sourceId(bg?.source,null),backgroundRef:bg?.source.n||null,speciesId:sourceId(sp?.source,null),speciesRef:sp?.source.n||null,subclassAtLevel:3};
      return {
        rank:i+1,classId:row.meta.id,classRef:row.source.n,className:row.source.n,
        label:contrast,fitLabel:near?"同樣適合":i===0?"優先建議":"不同玩法",
        reasons:getAnswersDetails(a,picked),
        reasonText:getAnswersDetails(a,picked).map(d=>"你選「"+d.answer+"」").join("；")+"，這與「"+row.meta.role+"」的玩法相符。",
        role:row.meta.role,actualTurn:row.meta.turn,difficulty:row.meta.difficulty,
        tradeoff:row.meta.tradeoff,subclass:sourceSub?{
          id:sourceId(sourceSub,sourceSub.n),ref:sourceSub.n,name:sourceSub.n,atLevel:3,
          status:"預計 3 級可選，尚未取得子職業能力",
          theme:hint?.[2]||sourceSub.d||"依官方子職業說明選擇",tradeoff:hint?.[3]||"請閱讀該路線的完整規則",
          tagScore:sub.tagScore,signalReasons:sub.matched.slice(0,2).map(j=>getAnswersDetails(a,[j])[0]),
          why:sub.matched.length?
            sub.matched.slice(0,2).map(j=>"你選「"+QUESTIONS[j].options[LETTERS.indexOf(a[j])].text+"」").join("；")+"，比較貼近「"+(hint?.[2]||sourceSub.d||sourceSub.n)+"」。請閱讀官方完整規則再決定。":
            "目前答案沒有明確指向此子職業，暫列「"+(hint?.[2]||sourceSub.d||sourceSub.n)+"」供探索；可改選，請先閱讀完整規則。"
        }:null,
        background:bg?{id:sourceId(bg.source,bg.source.n),ref:bg.source.n,name:bg.source.n,originFeat:bg.source.feat,compatible:bg.mechanical,abilityOverlap:bg.overlap,why:bgCompatibility}:null,
        species:sp?{id:sourceId(sp.source,sp.source.n),ref:sp.source.n,name:sp.source.n,why:"符合你偏好的冒險風格；2024 物種不提供屬性加值，可自由改選。"}:null,
        prefill:pref,ctas:CTAS.slice()
      };
    });
    const complete=recommendations.length===3&&recommendations.every(r=>r.subclass&&r.background&&r.species);
    return {status:complete?"READY":"PARTIAL",edition:"2024",answered,total:10,
      questionCount:QUESTIONS.length,optionCount:4,recommendations,warnings,
      disclaimer:"本測驗沒有對錯，也不是官方強弱評比；推薦只標示可考慮的職業，必須由你在創角頁親自選擇與確認，不會修改既有角色。",
      message:complete?"可從三種不同職業路線選擇，也可以全部忽略。":"部分官方選項缺漏，已省略無法驗證的推薦欄位。"};
  }
  return Object.freeze({version:VERSION,questions,normalizeAnswers,serializeAnswers,restoreAnswers,evaluate,weights:WEIGHTS.slice()});
});
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'assets/data/feature-5r-full-rules.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(js,ctx);
const db=ctx.window.ZIZI_5R_FULL_FEATURE_RULES;
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/feature-nested-labels-2024.json'),'utf8'));
let checked=0;
for(const [key,labels] of Object.entries(fixture.expected)){
 const full=db[key];
 assert(full,'missing feature '+key);
 for(const label of labels){
  assert(full.includes(label),'missing canonical nested label '+key+' > '+label);
  checked++;
 }
}
const checks={
 '術士||魔源之泉|2':['1環法術位：消耗2術法點','2環法術位：消耗3術法點','3環法術位：消耗5術法點','4環法術位：消耗6術法點','5環法術位：消耗7術法點'],
 '德魯伊||荒野變身|2':['德魯伊2級：已知4種形態','最大挑戰等級1/4','德魯伊4級：已知6種形態','德魯伊8級：已知8種形態'],
 '德魯伊|大地結社|自然守護|10':['荒漠：火焰傷害抗性','極地：寒冷傷害抗性','溫帶：閃電傷害抗性','熱帶：毒素傷害抗性'],
 '德魯伊|星辰結社|星圖|3':['骰值1：','骰值2：','骰值3：','骰值4：','骰值5：','骰值6：'],
 '戰士|靈能武士|靈能力量|3':['戰士3級：靈能骰d6','戰士5級：靈能骰d8','戰士9級：靈能骰d8','戰士11級：靈能骰d10','戰士13級：靈能骰d10','戰士17級：靈能骰d12'],
 '遊蕩者|靈魂之刃|靈能力量|3':['遊蕩者3級：靈能骰d6','遊蕩者5級：靈能骰d8','遊蕩者9級：靈能骰d8','遊蕩者11級：靈能骰d10','遊蕩者13級：靈能骰d10','遊蕩者17級：靈能骰d12'],
 '遊俠|精類浪遊者|流派法術|3':['精野之賜 d6','骰值1：','骰值6：'],
 '術士|時鐘靈魂|起源法術|3':['秩序顯跡 d6','骰值1：','骰值6：'],
 '遊俠|獸王|原初夥伴|3':['大地野獸、海洋野獸和天空野獸','AC 13+你的感知調整值','HP 5+你遊俠等級的五倍','HP 4+你遊俠等級的四倍','屬性值','野獸打擊','野獸可以在空氣和水中呼吸','野獸飛行離開敵人的觸及時不會引發藉機攻擊']
};
let tableChecks=0;
for(const [key,fragments] of Object.entries(checks)){
 const full=db[key];assert(full,'missing table feature '+key);
 for(const phrase of fragments){
  assert(full.includes(phrase),'missing table row '+key+' > '+phrase);
  tableChecks++;
 }
}
// The Beast Master source already contains three full stat blocks. Duplicating them
// breaks the level-up preview's 1:1 option-to-block parser (historical 6-block bug).
const primal=db['遊俠|獸王|原初夥伴|3'];
for(const phrase of ["\u6307\u63ee\u65b9\u5f0f\u4e00\uff08\u9644\u8d08\u52d5\u4f5c\uff09", "\u4e0d\u5fc5\u72a7\u7272\u81ea\u5df1\u7684\u653b\u64ca", "\u6307\u63ee\u65b9\u5f0f\u4e8c\uff08\u72a7\u7272\u4e00\u6b21\u653b\u64ca\uff09", "\u4e0d\u6d88\u8017\u9644\u8d08\u52d5\u4f5c", "\u672a\u4e0b\u9054\u547d\u4ee4\uff1a\u91ce\u7378\u53ea\u6703\u57f7\u884c\u8ff4\u907f\u52d5\u4f5c", "\u5927\u578b\u6216\u66f4\u5c0f", "\u50b7\u5bb3\uff1a1d8+2+\u4f60\u7684\u611f\u77e5\u8abf\u6574\u503c", "\u50b7\u5bb3\uff1a1d6+2+\u4f60\u7684\u611f\u77e5\u8abf\u6574\u503c", "\u50b7\u5bb3\uff1a1d4+3+\u4f60\u7684\u611f\u77e5\u8abf\u6574\u503c", "\u547d\u4e2d\u5f8c\uff0c\u76ee\u6a19\u9677\u5165\u53d7\u64d2\u72c0\u614b"]) assert(primal.includes(phrase),"Primal Companion command/damage clarity drift: "+phrase);
assert(!/\u547d\u4e2d\uff1a1d[468]|\u4e0d\u8d85\u904e\u5de8\u578b/.test(primal),"Legacy ambiguous damage/size wording");
const boundaries=[...primal.matchAll(/(?:中型|小型)野獸，絕對中立/g)].map(m=>m.index);
assert.equal(boundaries.length,3,'Primal Beast must have exactly one canonical stat block per choice');
for(let i=0;i<boundaries.length;i++){
 const stat=primal.slice(boundaries[i],boundaries[i+1]??primal.length);
 assert.match(stat,/AC 13\+你的感知調整值/);
 assert.match(stat,i===2?/HP 4\+你遊俠等級的四倍/:/HP 5\+你遊俠等級的五倍/);
 assert.match(stat,[/倒地狀態/,/受擒狀態/,/野獸飛行離開敵人的觸及/][i]);
}
console.log(JSON.stringify({pass:true,nestedFeatures:Object.keys(fixture.expected).length,nestedLabels:checked,tableFeatures:Object.keys(checks).length,tableChecks,primalBeastBlocks:boundaries.length},null,2));

// PHB 2024 p. 50: distinguish both benefits and preserve the omitted expiration clause.
const worldTreeKey="野蠻人|世界樹之道|世界樹活力|3";
const worldTree=db[worldTreeKey];
assert(worldTree, 'Missing World Tree vitality');
const worldTreeParts=worldTree.split('\n');
assert.equal(worldTreeParts.length,3,'World Tree vitality must preserve two named benefits');
assert(worldTreeParts[1].includes('Vitality Surge')&&worldTreeParts[1].includes('野蠻人等級')&&worldTreeParts[1].includes('不因狂暴結束消失'),'Self THP rule missing');
assert(worldTreeParts[2].includes('Life-Giving Force')&&worldTreeParts[2].includes('每當你的回合開始時')&&worldTreeParts[2].includes('10呎內一個其他生物')&&worldTreeParts[2].includes('狂暴傷害加值顆d6')&&worldTreeParts[2].includes('狂暴結束時，其他生物藉此效果獲得且剩餘的臨時生命值立即消失'),'Other-creature THP trigger/expiry rule missing');
const worldTreeManual=JSON.parse(fs.readFileSync(path.join(__dirname,'feature-5r-manual-full-rules.json'),'utf8'));
assert.equal(worldTreeManual[worldTreeKey],worldTree,'Manual fixture and canonical World Tree text drift');
console.log('World Tree vitality: self / other / expiration / fixture parity PASS');


// Independent mechanical invariants from the published 2024 World Tree feature descriptions.
// The old source contained entirely unrelated Lv6/Lv10/Lv14 effects.
const worldTreeChecks={
  "野蠻人|世界樹之道|世界樹枝幹|6": {
    "must": [
      "30呎",
      "開始其回合",
      "反應",
      "力量豁免",
      "力量調整值＋熟練加值",
      "5呎內",
      "最近的可見未占據空間",
      "速度降為0",
      "當前回合結束"
    ],
    "not": [
      "所有盟友",
      "魅惑",
      "體質調整值"
    ]
  },
  "野蠻人|世界樹之道|重擊之根|10": {
    "must": [
      "你的回合",
      "重型或兩用",
      "觸及增加10呎",
      "命中",
      "另一種武器精通",
      "推離或擊倒",
      "無須狂暴"
    ],
    "not": [
      "附贈動作",
      "力量豁免",
      "長休"
    ]
  },
  "野蠻人|世界樹之道|沿樹旅行|14": {
    "must": [
      "啟動狂暴",
      "附贈動作",
      "最多60呎",
      "每次狂暴一次",
      "150呎",
      "10呎內最多6個自願生物",
      "距離你抵達位置10呎內"
    ],
    "not": [
      "體質調整值",
      "分支位面",
      "短休",
      "長休"
    ]
  }
};
for(const [key,contract] of Object.entries(worldTreeChecks)){
 const rule=db[key]; assert(rule,key+" missing canonical rule");
 assert.equal(worldTreeManual[key],rule,key+" manual fixture drift");
 for(const phrase of contract.must)assert(rule.includes(phrase),key+" missing "+phrase);
 for(const phrase of contract.not)assert(!rule.includes(phrase),key+" obsolete rule "+phrase);
}
const provenance=JSON.parse(fs.readFileSync(path.join(root,"assets/data/feature-5r-manual-provenance.json"),"utf8"));
assert.equal(provenance.verifiedSourceCorrections.filter(x=>x.canonicalKey.startsWith("野蠻人|世界樹之道|")).length,4,"All four World Tree corrections must have source provenance");
const exporter=fs.readFileSync(path.join(root,"assets/character-sheet-export.js"),"utf8");
const pdfResolver=exporter.slice(exporter.indexOf("const featureDescForPdf="),exporter.indexOf("const featureLines="));
assert(pdfResolver.includes("ZIZI_5R_FULL_FEATURE_RULES")&&pdfResolver.includes("resolveFeatureRule2024")&&!/CLASSDESC_2024|SUBD|ALLDESC(?!14)/.test(pdfResolver),"2024 PDF must not use stale name-only summary");
assert(exporter.includes("featureDescForPdf(n,{cls,sub,lv})"),"PDF feature resolver missing level-aware context");
assert(exporter.includes("lineHeight=Math.max(lineHeight,font.heightAtSize(1)*1.2)"),"Multiline fit must use real font metrics");
assert(exporter.includes("appendPdfText5R")&&exporter.includes("fitCompleteFeatures5R"),"PDF complete-text continuation missing");
console.log("World Tree four-level source checks and canonical PDF projection PASS");

// Source-bound independent facts: additional Zealot and Fey Wanderer corrections.
const correctedChecks={
  "野蠻人|狂熱者之道|神聖狂怒|3": {
    "must": [
      "每個回合",
      "武器或徒手打擊",
      "1d6＋野蠻人等級的一半",
      "向下取整",
      "每次造成此傷害時"
    ],
    "not": [
      "1d8",
      "1d10",
      "1d12"
    ]
  },
  "野蠻人|狂熱者之道|狂熱專注|6": {
    "must": [
      "每次狂暴期間一次",
      "豁免檢定失敗",
      "重骰",
      "狂暴傷害加值",
      "新的結果"
    ],
    "not": [
      "體質調整值",
      "長休"
    ]
  },
  "野蠻人|狂熱者之道|狂熱威儀|10": {
    "must": [
      "附贈動作",
      "60呎",
      "最多10個其他生物",
      "下一回合開始",
      "攻擊檢定及豁免檢定",
      "長休",
      "消耗一次狂暴使用次數",
      "無需動作"
    ],
    "not": [
      "30呎",
      "看見"
    ]
  },
  "野蠻人|狂熱者之道|超越死亡之怒|14": {
    "must": [
      "啟動狂暴",
      "1分鐘",
      "生命值降為0",
      "每長休一次",
      "飛行速度",
      "懸停",
      "黯蝕、心靈、光耀",
      "30呎內一個生物",
      "反應",
      "消耗一次狂暴使用次數",
      "野蠻人等級"
    ],
    "not": [
      "死亡豁免",
      "立即死亡"
    ]
  },
  "遊俠|精類浪遊者|恐怖打擊|3": {
    "must": [
      "武器命中",
      "1d4心靈傷害",
      "每個生物每回合至多",
      "遊俠11級",
      "1d6"
    ],
    "not": [
      "魅力檢定",
      "技能之一"
    ]
  }
};
for(const [key,contract] of Object.entries(correctedChecks)){
 const rule=db[key];assert(rule,key+" missing");
 assert.equal(worldTreeManual[key],rule,key+" manual fixture drift");
 for(const phrase of contract.must)assert(rule.includes(phrase),key+" missing "+phrase);
 for(const phrase of contract.not)assert(!rule.includes(phrase),key+" obsolete mechanic "+phrase);
 assert(provenance.verifiedSourceCorrections.some(x=>x.canonicalKey===key),key+" missing source evidence");
}
const nameSource=fs.readFileSync(path.join(root,"assets/data/feature-names-5r.js"),"utf8");
const nameContext={globalThis:{}};
vm.runInNewContext(nameSource,nameContext);
const nameDB=nameContext.globalThis.ZIZI_5R_FEATURE_NAMES;
const identitySeen=new Map();
for(const [key,alias] of Object.entries(nameDB)){
 if(alias.source!=="feature")continue;
 const [cls,sub,,lv]=key.split("|"),identity=[cls,sub,lv,alias.en].join("|");
 assert(!identitySeen.has(identity),"Duplicate feature identity: "+key+" vs "+identitySeen.get(identity));
 identitySeen.set(identity,key);
}
const correctedNames={
  "野蠻人|世界樹之道|世界樹活力|3": [
    "聖樹活力",
    "Vitality of the Tree"
  ],
  "野蠻人|世界樹之道|世界樹枝幹|6": [
    "靈樹枝杈",
    "Branches of the Tree"
  ],
  "野蠻人|世界樹之道|重擊之根|10": [
    "根擊千鈞",
    "Battering Roots"
  ],
  "野蠻人|世界樹之道|沿樹旅行|14": [
    "世界樹之奇旅",
    "Travel along the Tree"
  ],
  "野蠻人|狂熱者之道|神聖狂怒|3": [
    "神性之怒",
    "Divine Fury"
  ],
  "野蠻人|狂熱者之道|狂熱專注|6": [
    "專心熾志",
    "Fanatical Focus"
  ],
  "野蠻人|狂熱者之道|狂熱威儀|10": [
    "狂熱威儀",
    "Zealous Presence"
  ],
  "野蠻人|狂熱者之道|超越死亡之怒|14": [
    "神之狂暴",
    "Rage of the Gods"
  ],
  "遊俠|精類浪遊者|恐怖打擊|3": [
    "哀懼靈襲",
    "Dreadful Strikes"
  ]
};
for(const [key,[zh,en]] of Object.entries(correctedNames)){
 assert.equal(nameDB[key].zh,zh,key+" Chinese display identity");
 assert.equal(nameDB[key].en,en,key+" English display identity");
}
console.log("Zealot and Fey source contracts / distinct feature identities PASS");

const extraSourceChecks={
  "術士|狂野魔法|扭曲運數|6": {
    "must": [
      "另一個生物",
      "能看見",
      "D20檢定",
      "立即使用反應",
      "消耗1魔源點",
      "1d4",
      "不能用於自己的檢定"
    ],
    "not": [
      "60呎",
      "消耗2魔源點"
    ]
  },
  "遊蕩者|奧術騙徒|法術竊賊|17": {
    "must": [
      "立即使用反應",
      "智力豁免",
      "法術豁免DC",
      "對你的效果無效",
      "1環以上",
      "環階不高於",
      "不限法師法術",
      "8小時",
      "只有成功竊取法術後",
      "長休"
    ],
    "not": [
      "更高等級"
    ]
  }
};
for(const [key,contract] of Object.entries(extraSourceChecks)){
 const rule=db[key];assert(rule,key+" missing");
 assert.equal(worldTreeManual[key],rule,key+" fixture drift");
 for(const phrase of contract.must)assert(rule.includes(phrase),key+" missing "+phrase);
 for(const phrase of contract.not)assert(!rule.includes(phrase),key+" obsolete scope "+phrase);
 assert(provenance.verifiedSourceCorrections.some(x=>x.canonicalKey===key),key+" missing source evidence");
}
console.log("Bend Luck target scope and Spell Thief consumption contracts PASS");

// Wild Magic Surge: slot-funded trigger and individual invisibility expiry, not 2014 scope.
const surgeKey="術士|狂野魔法|狂野魔法湧動|3";
const surge=db[surgeKey];
assert(surge,"missing canonical Wild Magic Surge");
for(const q of [{"old": "一回合一次，你每次施展一個不低於一環的術士法術後，可以立刻骰一次d20。", "new": "每回合一次，當你消耗法術位施展術士法術後，可以立即擲1d20；未消耗法術位的施法不觸發此能力。"}, {"old": "此隱形會在該生物發動攻擊、造成傷害或施展法術後立即結束。", "new": "個別生物的隱形會在它進行攻擊檢定、造成傷害或施展法術後立即結束。"}]){assert(surge.includes(q.new),"Wild Magic Surge missing corrected scope");assert(!surge.includes(q.old),"Wild Magic Surge obsolete wording");}
assert.equal(worldTreeManual[surgeKey].replace(/尺/g,"呎"),surge,"Wild Magic Surge fixture drift");
assert(provenance.verifiedSourceCorrections.some(x=>x.canonicalKey===surgeKey),"Wild Magic Surge source evidence missing");
console.log("Wild Magic Surge slot trigger and individual expiry contracts PASS");

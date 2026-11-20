"use strict";
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
require(path.join(root,"assets/data/spells-phb-2024.js"));
require(path.join(root,"assets/data/spell-rules-2024.js"));
const rows=globalThis.SPELLS_2024_TUPLES;
const fullRules=globalThis.SPELLS_2024_FULL_RULES;
assert.equal(rows.length,391,"Expected pinned 391 PHB2024 spells");
assert.equal(Object.keys(fullRules).length,391,"Expected 391 canonical rules");
const cases={
  message:{short:["120呎","隔物須熟識目標","魔法沉默","薄鉛"],canonical:["隔著固態物件","熟悉法術目標"]},
  resistance:{short:["自願生物","專注期間","每回合至多一次","1d4","不因首次觸發結束"],canonical:["一名生物一回合只能受到一次","1d4"]},
  guidance:{short:["自願生物","一項技能","每次","1d4"],canonical:["自願生物","技能"]},
  elementalism:{short:["5呎立方","1呎立方","1小時"],canonical:["立方","塑形"]},
  shillelagh:{short:["附贈動作","1d8","原傷害類型","丟下或重施法則終止"],canonical:["短棒","丟掉"]}
};
for(const [id,required] of Object.entries(cases)){
  const row=rows.find(r=>r[0]===id),rule=fullRules[id]||"";
  assert(row,"Missing spell identifier "+id);
  assert.equal(row[4],0,"P0 five spells must be cantrips: "+id);
  const text=String(row[13]||"");
  assert(text.length>0&&text.length<=112,"Invalid source preview length: "+id+" "+text.length);
  for(const cue of required.short)assert(text.includes(cue),id+" short source omission: "+cue+" / "+text);
  for(const cue of required.canonical)assert(rule.includes(cue),id+" canonical drift: "+cue);
  assert(!/[<>]/u.test(text),id+" short source contains markup");
}
console.log("PR78_FIVE_P0_SOURCE_PASS",JSON.stringify({count:5,ids:Object.keys(cases),rows:rows.length}));

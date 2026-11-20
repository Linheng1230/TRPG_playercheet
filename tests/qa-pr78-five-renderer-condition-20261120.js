"use strict";
/* PR78: five curated PHB2024 condition-bearing cantrip summaries.
 * Guards are tied to the pinned canonical full rules; no second rules DB.
 * Validates the actual committed 2024 renderer including existing 15 conditions.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
for(const rel of ["assets/data/spells-phb-2024.js","assets/data/spell-rules-2024.js",
  "assets/spell-quick-facts-2024.js","assets/creator-spell-preview-2024.js",
  "assets/creator-spell-glance-2024.js"])require(path.join(root,rel));
const data=globalThis.SPELLS_2024_TUPLES;
const full=globalThis.SPELLS_2024_FULL_RULES;
const glance=globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024;
assert.equal(data.length,391);
assert.equal(Object.keys(full).length,391);
assert.equal(Object.keys(glance.conditionTerms||{}).length,15,"Condition semantics must remain");
const cases={
  message:{anchor:"你可以隔著固態物件施展此法術",cues:["120呎","隔物須熟識目標","魔法沉默","薄鉛"]},
  resistance:{anchor:"一名生物一回合只能受到一次該法術的增益",cues:["自願生物","每回合至多一次","1d4","不因首次觸發結束"]},
  guidance:{anchor:"你觸碰一名自願生物",cues:["自願生物","一項技能","每次","1d4"]},
  elementalism:{anchor:"一處5呎立方區域內創造一股和風",cues:["5呎立方","1呎立方","1小時"]},
  shillelagh:{anchor:"你再次施展該法術或丟掉該武器時",cues:["附贈動作","1d8","原傷害類型","丟下或重施法則終止"]}
};
const byId=new Map(data.map(row=>[row[0],row]));
let checked=0;
for(const [id,spec] of Object.entries(cases)){
  const row=byId.get(id);
  assert(row,id+" source tuple missing");
  assert.equal(row[4],0,id+" must be cantrip");
  const source=full[id];
  assert(source.includes(spec.anchor),id+" canonical anchor not present");
  const args={identifier:id,n:row[3],d:source};
  const meta={time:row[9],range:row[10],dur:row[12]};
  const result=glance.render(args,0,meta);
  assert(result.omitted,id+" must offer complete rule disclosure");
  assert(result.text.length>0&&result.text.length<=113,id+" summary overflow");
  assert(!/升環施法|高環施法|戲法強化/u.test(result.text),id+" scaling in summary");
  for(const cue of spec.cues)assert(result.text.includes(cue),id+" mechanic omitted: "+cue+" / "+result.text);
  assert(result.html.includes("sr-readable"),id+" marked renderer missing");
  try{
    full[id]=source.replace(spec.anchor,"");
    const guard=glance.compact({identifier:id,n:row[3]},0,meta);
    assert(guard.text.includes("規則來源已更新"),id+" stale source not rejected");
  }finally{full[id]=source;}
  checked++;
}
for(const [zh,en] of Object.entries(glance.conditionTerms)){
  const html=glance.highlight(zh);
  assert(html.includes('class="sr-condition"'),zh+" markup lost");
  assert(html.includes('data-condition="'+en+'"'),zh+" semantic identifier lost");
}
const testRaw=glance.highlight("倒地、束縛、中毒");
assert.equal((testRaw.match(/class="sr-condition"/g)||[]).length,3,"Combined condition semantics lost");
console.log("PR78_FIVE_RENDERER_15_CONDITIONS_PASS",JSON.stringify({five:checked,canonicalCount:data.length,conditions:15,sourceGuards:checked}));

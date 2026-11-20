"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
for(const file of [
  "assets/data/spells-phb-2024.js",
  "assets/data/spell-rules-2024.js",
  "assets/spell-quick-facts-2024.js",
  "assets/creator-spell-preview-2024.js",
  "assets/creator-spell-glance-2024.js"
]) require(path.join(root,file));

const g=globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024;
const rows=new Map(globalThis.SPELLS_2024_TUPLES.map(row=>[row[0],row]));
const rules=globalThis.SPELLS_2024_FULL_RULES;
const conditions={
  "束縛":"restrained","倒地":"prone","中毒":"poisoned",
  "失能":"incapacitated","目盲":"blinded","耳聾":"deafened",
  "魅惑":"charmed","恐慌":"frightened","隱形":"invisible",
  "麻痺":"paralyzed","石化":"petrified","震懾":"stunned",
  "昏迷":"unconscious","擒抱":"grappled","力竭":"exhaustion"
};
assert.equal(Object.keys(g.conditionTerms).length,15);
assert.deepEqual({...g.conditionTerms},conditions);
for(const [term,id] of Object.entries(conditions)){
  const h=g.highlight("陷入"+term+"狀態");
  assert(h.includes('class="sr-condition" data-semantic-type="condition" data-condition="'+id+'"'),term);
  assert.equal((h.match(/class="sr-condition"/g)||[]).length,1,term);
  assert(h.includes(">"+term+"</strong>"),term);
}
const mixed=g.highlight("束縛、倒地、中毒；體質豁免失敗，附贈動作有劣勢、受到2d6點毒素傷害");
assert.equal((mixed.match(/class="sr-condition"/g)||[]).length,3);
for(const cls of ["sr-save","sr-action","sr-disadvantage","sr-damage"]) assert(mixed.includes(cls),cls);
assert(!g.highlight("毒素傷害、毒素、治療").includes("sr-condition"),"Damage type is not condition");
assert(!g.highlight("力場、光耀").includes("sr-condition"),"Damage type false positive");
assert.equal(g.highlight('<script>alert("x")</script>'),"&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");

const ids=["entangle","faerie-fire","poison-spray","ray-of-sickness",
 "hold-person","blindness-deafness","grease","sleet-storm"];
const cases=[];
for(const id of ids){
  const row=rows.get(id); assert(row,"missing canonical spell "+id);
  const full=String(rules[id]||""); assert(full.length>20,id+" full rules missing");
  const sp={identifier:id,n:row[3],d:full,con:!!row[6],rit:!!row[7]};
  const meta={time:row[9],range:row[10],dur:row[12]};
  const original=full;
  const rendered=g.render(sp,1,meta);
  assert(rendered.text.length>0&&rendered.text.length<=113,id+" summary");
  assert.equal(rules[id],original,id+" must not mutate canonical body");
  const found=Object.keys(conditions).filter(t=>full.includes(t));
  const fullHighlighted=g.highlight(full);
  for(const t of found){
    assert(fullHighlighted.includes('data-condition="'+conditions[t]+'">'+t+"</strong>"),id+":"+t);
  }
  const compactFound=Object.keys(conditions).filter(t=>rendered.text.includes(t));
  for(const t of compactFound){
    assert(rendered.html.includes('data-condition="'+conditions[t]+'">'+t+"</strong>"),id+" glance:"+t);
  }
  cases.push({id,fullConditionTokens:found,glanceConditionTokens:compactFound,fullLength:full.length,glanceLength:rendered.text.length});
}
assert(cases.some(x=>x.id==="entangle"&&x.fullConditionTokens.includes("束縛")),"Entangle condition missing in source");
assert(cases.some(x=>x.id==="ray-of-sickness"&&x.fullConditionTokens.includes("中毒")),"Ray of Sickness poison source");
assert(cases.some(x=>x.id==="hold-person"&&x.fullConditionTokens.includes("麻痺")),"Hold Person paralysis source");
assert(cases.some(x=>x.id==="grease"&&x.fullConditionTokens.includes("倒地")),"Grease prone source");
console.log("SPELL_CONDITION_TARGETED_PASS",JSON.stringify({conditionCount:15,cases}));

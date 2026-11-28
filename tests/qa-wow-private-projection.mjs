import assert from "node:assert/strict";
import { buildWowPrivateProjection, numericWowPrivateResources, selectWowPrivateRows }
 from "../assets/wow-private-creator-projection.mjs";

const records={
 common:{id:"common",name:"共同能力",description:"共同",mechanics:{}},
 specA:{id:"specA",name:"A能力",description:"A",mechanics:{}},
 overrideA:{id:"overrideA",name:"A覆寫",description:"O",mechanics:{}},
 spellA:{id:"spellA",name:"A法術",description:"S",mechanics:{}},
 resA:{id:"resA",name:"A資源",description:"R",mechanics:{uses:{max:2,recovery:[{period:"lr"}]}}},
 resFormula:{id:"resFormula",name:"公式資源",description:"RF",mechanics:{uses:{max:"@prof"}}},
 choiceA:{id:"choiceA",name:"A選項",description:"C",mechanics:{}},
 table:{id:"table",name:"表",description:"T",mechanics:{}},
};
const row=(spec,level,extra={})=>({classId:"monk",specializationId:spec,level,
 eligibility:"BASE_LEVEL_OK",subclassAvailable:level===3,coreProgressionInherited:true,
 grantItemIds:level===1?["common"]:[],overrideItemIds:[],spellTableItemIds:[],
 spellIds:[],resourceItemIds:[],choiceItemIds:[],...extra});
const manifest={progressionRows:[
 row("monk.a",1),row("monk.b",1),row("monk.c",1),
 row("monk.a",2),row("monk.b",2),row("monk.c",2),
 row("monk.a",3,{grantItemIds:["specA","table"],overrideItemIds:["overrideA"],
  spellTableItemIds:["table"],spellIds:["spellA"],resourceItemIds:["resA","resFormula"],choiceItemIds:["choiceA"]}),
 row("monk.b",3),row("monk.c",3),
]};
const provider={manifest,contentBundle:{records}};
const commonState={ruleset:"2024",wowClassId:"monk",wowSpecializationId:null,level:3};
const commonRows=selectWowPrivateRows(manifest,commonState);
assert.equal(commonRows.length,3);
assert.deepEqual(commonRows[0].grantItemIds,["common"]);
assert.deepEqual(commonRows[2].grantItemIds,[]);
const commonProjection=buildWowPrivateProjection(provider,commonState);
assert.deepEqual(commonProjection.grants.map(x=>x.id),["common"]);
assert.deepEqual(commonProjection.spells,[]);
const exactState={...commonState,wowSpecializationId:"monk.a"};
const exact=buildWowPrivateProjection(provider,exactState);
assert.deepEqual(exact.grants.map(x=>x.id).sort(),["common","specA"]);
assert.deepEqual(exact.overrides.map(x=>x.id),["overrideA"]);
assert.deepEqual(exact.spells.map(x=>x.id),["spellA"]);
assert.deepEqual(exact.choices.map(x=>x.id),["choiceA"]);
assert.deepEqual(exact.resources.map(x=>x.id),["resA","resFormula"]);
const counters=numericWowPrivateResources(provider,exactState);
assert.equal(counters.length,1);
assert.equal(counters[0].key,"wow:resA");
assert.equal(counters[0].max,2);
assert.equal(counters[0].rest,"long");
console.log("PASS WoW private projection: common rows fail closed; exact spec projects ability/override/spell/resource/choice");

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { WOW_PUBLIC_CLASSES, WOW_PUBLIC_SPECIALIZATIONS } from "../assets/wow-dlc-policy.mjs";

const sandbox={globalThis:{}};
vm.runInNewContext(fs.readFileSync("assets/data/canonical-5r-zh-names.js","utf8"),sandbox);
vm.runInNewContext(fs.readFileSync("assets/data/name-migrations-5r.js","utf8"),sandbox);
const N=sandbox.globalThis.ZIZI_5R_CANONICAL_NAMES||{};
const M=sandbox.globalThis.ZIZI_5R_NAME_MIGRATIONS||{};
const migrate=(kind,name)=>(M[kind]||{})[String(name)]||String(name);

const html=fs.readFileSync("index.html","utf8");
const start=html.indexOf("const PROG_2024=");
const end=html.indexOf(";\nconst PHB14_FEATURES",start);
assert.ok(start>=0&&end>start,"PROG_2024 extraction anchors must exist");
const literal=html.slice(start+"const PROG_2024=".length,end);
const PROG=vm.runInNewContext("("+literal+")");

const classZh={
 barbarian:"野蠻人",bard:"吟遊詩人",cleric:"牧師",druid:"德魯伊",fighter:"戰士",monk:"武僧",
 paladin:"聖武士",ranger:"遊俠",rogue:"遊蕩者",sorcerer:"術士",warlock:"邪術師",wizard:"法師",
};
assert.equal(WOW_PUBLIC_CLASSES.length,13);
assert.equal(WOW_PUBLIC_SPECIALIZATIONS.length,40);
assert.equal(new Set(WOW_PUBLIC_SPECIALIZATIONS.map(x=>x.id)).size,40);

let core=0,privateSpecs=0;
const aliases=[];
for(const spec of WOW_PUBLIC_SPECIALIZATIONS){
 const cls=WOW_PUBLIC_CLASSES.find(x=>x.id===spec.classId);
 assert.ok(cls,`missing class metadata for ${spec.id}`);
 const base=PROG[classZh[cls.coreClassId]];
 assert.ok(base,`missing core progression for ${spec.id}: ${cls.coreClassId}`);
 if(spec.sourceKind==="wow"){
   privateSpecs++;
   assert.equal(spec.coreSubclassName,null,`private spec must not claim a core subclass: ${spec.id}`);
   continue;
 }
 core++;
 const coreEn=cls.coreClassId[0].toUpperCase()+cls.coreClassId.slice(1);
 const canonical=N.subclasses?.[coreEn+"|"+spec.coreSubclassName]||"";
 assert.ok(canonical,`missing canonical subclass name for ${spec.id}: ${coreEn}|${spec.coreSubclassName}`);
 const source=base.subs?.find(sub=>sub.n===canonical||migrate("subclasses",sub.n)===canonical);
 assert.ok(source,`core subclass mapping broken for ${spec.id}: canonical ${canonical}`);
 if(source.n!==canonical)aliases.push({id:spec.id,state:source.n,display:canonical});
}
assert.equal(core,27);
assert.equal(privateSpecs,13);
assert.equal(core+privateSpecs,40);
console.log(JSON.stringify({status:"WOW_40_SPECIALIZATION_MATRIX_PASS",total:40,core,privateSpecs,displayAliases:aliases.length}));

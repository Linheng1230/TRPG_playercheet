"use strict";
/* Narrow 2024 full-rule source gate. Tests the actual generated canonical text,
 * plus pure producer functions with a synthetic table fixture. No local D: access,
 * no second spell-rules catalog, and no claim of upstream snapshot regeneration.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
require("../assets/data/spell-rules-2024.js");
const rules=globalThis.SPELLS_2024_FULL_RULES;
assert.equal(Object.keys(rules).length,391,"PHB2024 canonical full-rule count");
for(const cue of [
  "吉兆（好結果）","凶兆（壞結果）",
  "吉凶參半（好壞兼有）","無吉無凶（既不好也不壞）"
]) assert(rules.augury.includes(cue),"Augury omens table row omitted: "+cue);
assert(rules.augury.includes("30分鐘")&&rules.augury.includes("25%"),"Augury mechanics drift");
assert(rules["locate-animals-or-plants"].includes("5哩範圍內存在"),"Locate spell lacks official five-mile condition");
assert(!rules["locate-animals-or-plants"].includes("5裡記憶體在"),"Broken 5RTools token reintroduced");
assert(rules["animal-messenger"].includes("25個詞"),"Animal Messenger message limit must be 25 words");
assert(!rules["animal-messenger"].includes("二十五個單次"),"Broken message unit reintroduced");
assert(rules["animal-messenger"].includes("魅力豁免"),"Animal Messenger target saving throw changed");

const producerPython=String.raw`
import ast
import pathlib
import sys
file=pathlib.Path(sys.argv[1])
tree=ast.parse(file.read_text(encoding="utf-8"))
wanted={"flat","table_row_count","repair_verified_source_typos"}
nodes=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in wanted]
assert {node.name for node in nodes}==wanted, "Source builder functions missing"
scope={}
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(file),"exec"),scope)
flat=scope["flat"]
count=scope["table_row_count"]
repair=scope["repair_verified_source_typos"]
fixture=[{"entries":[{"type":"table","rows":[
 ["吉兆","好結果"],
 {"row":["凶兆","壞結果"]},
 ["吉凶參半","好壞兼有"],
 ["無吉無凶","既不好也不壞"]
]}]}]
rendered=" ".join(flat(fixture))
assert count(fixture)==4, "Table count gate failed"
for item in ("吉兆：好結果","凶兆：壞結果","吉凶參半：好壞兼有","無吉無凶：既不好也不壞"):
 assert item in rendered, "Table row collapsed: "+item
source1="如果5裡記憶體在該類生物或植物"
fixed1="如果5哩範圍內存在該類生物或植物"
assert repair("locate-animals-or-plants",source1)==fixed1
assert repair("locate-animals-or-plants",fixed1)==fixed1
source2="一段不超過二十五個單次的資訊"
fixed2="一則不超過25個詞的訊息"
assert repair("animal-messenger",source2)==fixed2
assert repair("animal-messenger",fixed2)==fixed2
for name in ("locate-animals-or-plants","animal-messenger"):
 try: repair(name,"different upstream wording")
 except ValueError: pass
 else: raise AssertionError(name+" failed to block unreviewed upstream drift")
assert repair("guidance","unchanged")=="unchanged"
print("PHB2024_PRODUCER_TABLE_AND_SOURCE_DRIFT_PASS")
`;
const builder=path.resolve(__dirname,"../scripts/build-5r-spell-rules.py");
const runners=process.platform==="win32"?["py","python"]:["python3","python"];
let output;
for(const runner of runners){
 const result=spawnSync(runner,["-c",producerPython,builder],{encoding:"utf8",maxBuffer:1024*1024});
 if(result.error?.code==="ENOENT")continue;
 if(result.error)throw result.error;
 assert.equal(result.status,0,runner+" generator QA failed:\n"+result.stderr+"\n"+result.stdout);
 output=result.stdout.trim();
 break;
}
assert(output,"Python 3 unavailable: producer QA could not be run");
assert(output.includes("PHB2024_PRODUCER_TABLE_AND_SOURCE_DRIFT_PASS"));
console.log("PHB2024_CANONICAL_SOURCE_3_REPAIRS_PASS",JSON.stringify({
 generatedRules:391,changedRules:["augury","locate-animals-or-plants","animal-messenger"],
 tableRows:4,sourceDriftFailClosed:true,sourceSnapshotRebuilt:false,producerCheck:output
}));

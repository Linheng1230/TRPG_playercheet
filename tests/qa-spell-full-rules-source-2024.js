"use strict";
/* Narrow 2024 full-rule source gate. Tests the actual generated canonical text,
 * plus pure producer functions with a synthetic table fixture. No local D: access,
 * no second spell-rules catalog, and no claim of upstream snapshot regeneration.
 */
const assert=require("node:assert/strict");
const path=require("node:path");
const fs=require("node:fs"),crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
require("../assets/data/spell-rules-2024.js");
const rules=globalThis.SPELLS_2024_FULL_RULES;
const normalizedCanonical=fs.readFileSync(path.resolve(__dirname,"../assets/data/spell-rules-2024.js"),"utf8").replace(/\r\n/g,"\n");
const canonicalSha256=crypto.createHash("sha256").update(normalizedCanonical,"utf8").digest("hex");
// CI has no Windows 5RTools snapshot. Pin the exact output bytes instead of
// falsely claiming to rebuild from unavailable source; the AST producer
// fixture below remains hermetic, while local pre-release runs --check.
assert.equal(canonicalSha256,"5c7260cd91bb01dee3d961aa9dc5e81a955542b8d446d69cd066ef82e6461e14","Canonical 2024 rule projection SHA drift");
require("../assets/data/spells-phb-2024.js");
assert.equal(globalThis.SPELLS_2024_SOURCE.sha256,"9a45afaea0ad571011fb80b7af80c17a2aa1d321d39c4cb96dbf2d73f43ad0ea","PHB2024 source snapshot identity drift");
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

assert(rules["summon-beast"].includes("傷害\uff1a1d8+4+\u6cd5\u8853\u74b0\u968e\u7684\u7a7f\u523a\u50b7\u5bb3"),"Summon Beast damage type/label drift");
assert(!rules["summon-beast"].includes("\u547d\u4e2d\uff1a1d8+4"),"Damage dice mislabeled as attack roll");
assert(rules["summon-beast"].includes("\u7121\u9700\u6d88\u8017\u4f60\u7684\u52d5\u4f5c\u6216\u9644\u8d08\u52d5\u4f5c"),"Command must not consume player action");

assert(rules["summon-beast"].includes("\u667a\u529b 4\uff08-3\uff09"),"2024 Bestial Spirit Intelligence drift");
const summonDamageLabels={"summon-beast":1,"find-steed":1,"summon-fey":1,"summon-undead":3,"giant-insect":2,"summon-aberration":3,"summon-construct":1,"summon-elemental":1,"animate-objects":1,"summon-celestial":2,"summon-dragon":1,"summon-fiend":3};
for(const [id,count] of Object.entries(summonDamageLabels)){
 assert.equal((rules[id].match(/\u50b7\u5bb3\uff1a\s*\d+d\d+/g)||[]).length,count,"Damage dice labels: "+id);
 assert(!/\u547d\u4e2d\uff1a\s*\d+d\d+/.test(rules[id]),"Ambiguous damage dice label: "+id);
}
assert(!rules["summon-undead"].includes("\u6050\u614c}"),"Broken condition marker");

assert(rules["summon-celestial"].includes("\u653b\u64ca\u76ee\u6a1910\u544e\u5167"),"Radiant Mace target-relative distance drift");
assert(rules["animate-objects"].includes("1d4+3\uff08\u4e2d\u578b\u6216\u66f4\u5c0f\uff09"),"Animated Object size label");
const producerPython=String.raw`
import ast
import pathlib
import sys
file=pathlib.Path(sys.argv[1])
tree=ast.parse(file.read_text(encoding="utf-8"))
wanted={"flat","table_row_count","repair_verified_source_typos","apply_verified_post66_repair","clean"}
nodes=[node for node in tree.body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=="VERIFIED_POST66_REPAIRS" for target in node.targets)]
nodes+=[node for node in tree.body if isinstance(node,ast.FunctionDef) and node.name in wanted]
assert {node.name for node in nodes if isinstance(node,ast.FunctionDef)}==wanted, "Source builder functions missing"
import re,html,types
scope={"re":re,"html":html,"cc":types.SimpleNamespace(convert=lambda value:value)}
exec(compile(ast.Module(body=nodes,type_ignores=[]),str(file),"exec"),scope)
flat=scope["flat"]
count=scope["table_row_count"]
repair=scope["repair_verified_source_typos"]
post66=scope["apply_verified_post66_repair"]
clean=scope["clean"]
fixture=[{"entries":[{"type":"table","rows":[
 ["吉兆","好結果"],
 {"row":["凶兆","壞結果"]},
 ["吉凶參半","好壞兼有"],
 ["無吉無凶","既不好也不壞"]
]}]}]
rendered=" ".join(flat(fixture))
assert count(fixture)==4, "Table count gate failed"
assert flat(fixture,False)==[], "Scoped table flatten must not silently change 9 unrelated spell descriptions"
for item in ("吉兆：好結果","凶兆：壞結果","吉凶參半：好壞兼有","無吉無凶：既不好也不壞"):
 assert item in rendered, "Table row collapsed: "+item
source1="如果5裡記憶體在該類生物或植物"
fixed1="如果5哩範圍內存在該類生物或植物"
assert repair("locate-animals-or-plants",source1)==fixed1
assert repair("locate-animals-or-plants",fixed1)==fixed1
source2="一段不超過二十五個單次的資訊" + " 50\u88e1 25\u88e1"
fixed2="一則不超過25個詞的訊息" + " 50\u54e9 25\u54e9"
assert repair("animal-messenger",source2)==fixed2
assert repair("animal-messenger",fixed2)==fixed2
for spell,changes in scope["VERIFIED_POST66_REPAIRS"].items():
 original=" ".join(before for before,after in changes)
 corrected=post66(spell,original)
 for previous,replacement in changes:
  assert replacement in corrected,spell+" verified source correction missing"
  assert post66(spell,corrected)==corrected,spell+" corrected source should be stable"
  try: post66(spell,"unexpected upstream wording")
  except ValueError: pass
  else: raise AssertionError(spell+" must fail closed on source drift")
assert clean("5\u5c3a")=="5\u544e", "Taiwan feet normalization drift"
assert clean("\u5c3a\u5bf8")=="\u5c3a\u5bf8", "Ordinary size must not become feet"
for name in ("augury","locate-animals-or-plants","animal-messenger"):
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
console.log("PHB2024_CANONICAL_PIN_AND_PRODUCER_UNIT_PASS",JSON.stringify({
 canonicalRuleCount:391,changedRules:["augury","locate-animals-or-plants","animal-messenger"],
 tableRows:4,sourceDriftFailClosed:true,sourceSnapshotRebuilt:false,canonicalSha256,producerCheck:output
}));

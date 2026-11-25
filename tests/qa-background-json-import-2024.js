const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const start=source.indexOf("function restoreImportedBackgroundTool2024(");
const end=source.indexOf("\n}",start)+2;
assert.ok(start>0&&end>start,"source migration function present");
assert.ok(source.includes("restoreImportedBackgroundTool2024(save,o);"),"actual import calls migration");
const context={BG_TOOL_CHOICES_2024:{士兵:()=>["骰子組","龍棋組","撲克牌組","三龍牌組"],工匠:()=>["木匠工具"]}};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
const restore=context.restoreImportedBackgroundTool2024;
function run(save,tool,bg=save.bg){
 const readable={背景:bg,工具熟練:tool,_save:save};
 restore(save,readable);
 return save;
}
assert.equal(run({ruleset:"2024",bg:"士兵",v:7},"骰子組合").bgChoice2024.tool,"骰子組");
assert.equal(run({ruleset:"2024",bg:"士兵",v:7},"骰子組").bgChoice2024.tool,"骰子組");
assert.equal(run({ruleset:"2024",bg:"士兵",bgChoice2024:{tool:"龍棋組"}},"骰子組合").bgChoice2024.tool,"龍棋組");
assert.equal(run({ruleset:"2024",bg:"士兵"},"未知工具").bgChoice2024,undefined);
assert.equal(run({ruleset:"2024",bg:"士兵"},"骰子組合","貴族").bgChoice2024,undefined);
assert.equal(run({ruleset:"2014",bg:"士兵"},"骰子組合").bgChoice2024,undefined);
const bare={ruleset:"2024",bg:"士兵"};
restore(bare,{背景:"士兵",工具熟練:"骰子組合"});
assert.equal(bare.bgChoice2024,undefined);
console.log("PASS 7/7 background tool import migration cases");

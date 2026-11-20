"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const mod=require("../assets/play-action-deck-5r.js");
const root=path.resolve(__dirname,"..");
const samples=[
  ["動作","action"],["1 動作","action"],["魔法動作","action"],["Action","action"],["1 Action","action"],
  ["附贈動作","bonus"],["1 附贈動作","bonus"],["Bonus Action","bonus"],["1 Bonus Action","bonus"],
  ["反應（當你被命中時）","reaction"],["1 反應","reaction"],["Reaction","reaction"],
  ["1分鐘","other"],["10 分鐘","other"],["1 小時","other"],["特殊","other"],["—","other"],["","other"]
];
for(const [time,want] of samples)assert.equal(mod.classify(time),want,JSON.stringify(time));
const rows=[
{id:"cure-wounds",n:"治療傷勢",lv:1,time:"動作",range:"觸及",fullHtml:"<article>CANON</article>"},
{id:"healing-word",n:"療癒真言",lv:1,time:"附贈動作"},
{id:"shield",n:"護盾術",lv:1,time:"反應",slotAvailable:true,freeResource:true},
{id:"alarm",n:"警報術",lv:1,time:"1分鐘"},
{id:"shield",n:"護盾術",lv:1,time:"反應"}
];
const groups=mod.group(rows);
assert.deepEqual(mod.ORDER.map(k=>groups[k].length),[1,1,1,1],"groups and duplicate protection");
const esc=x=>String(x).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const html=mod.render(rows,{escape:esc});
assert(html.includes('data-ps-action-group="action"')&&html.includes('data-ps-action-group="bonus"')&&html.includes('data-ps-action-group="reaction"'));
assert(html.includes("CANON")&&html.includes("點開查看完整規則"));
assert(html.includes('data-ps-jump="psSlots"')&&html.includes('data-ps-jump="psResources"'),"only links to canonical counters");
assert(html.includes('data-ps-action-group="other"')&&html.includes("ps-ad-group-title"),"nested folding without persistent state");
assert(!html.includes('onclick='),"read-only action deck");
assert.equal(rows.length,5,"input not modified");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const adapter=fs.readFileSync(path.join(root,"assets/play-action-deck-adapter-5r.js"),"utf8");
assert(index.includes("playStatusActionDeckHTML()")&&index.includes('["psActions","行動速查"]'));
assert(index.includes("actionDeckHTML")&&index.includes("play-action-deck-adapter-5r.js"));
assert(adapter.includes("spellMetaDb()")&&adapter.includes("grantedSpells2024()"));
assert(adapter.includes("st.prepared")&&adapter.includes("st.known"));
console.log("PASS action deck module: 18 casting-time formats, 4 groups, dedupe, full-rule projection, State adapter, source wiring");

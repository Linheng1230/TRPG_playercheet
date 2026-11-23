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
const canonicalPreview=mod.render([{id:"2024:elementalism",n:"四象法門",name:"四象法門 Elementalism",lv:0,time:"動作",range:"30 呎",
 fullHtml:'<article class="ss-entry"><span class="sref" data-sref="四象法門">四象法門</span><div class="ss-entry-field"><span class="ss-k">學派</span><span class="ss-v">變化</span></div></article>',
 ruleHtml:'<div class="sr-readable"><p>召氣與召火的完整規則</p></div>'}],{escape:esc});
assert(canonicalPreview.includes('class="ps-ad-preview"')&&canonicalPreview.includes('class="ss-entry"'),"canonical meta is the default visible preview");
assert(!canonicalPreview.includes('class="sref" data-sref='),"popup must not capture card clicks");
assert(canonicalPreview.includes('class="ps-ad-rule"')&&canonicalPreview.includes("召氣與召火"),"click target owns canonical rule body");
assert.equal((canonicalPreview.match(/class="ss-entry"/g)||[]).length,1,"expanded card must not repeat the metadata");
assert.equal(rows.length,5,"input not modified");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const adapter=fs.readFileSync(path.join(root,"assets/play-action-deck-adapter-5r.js"),"utf8");
assert(index.includes("playStatusActionDeckHTML()")&&index.includes("buildPlayStatusJumpNav(root)"),"action deck must use live section navigation");
assert(index.includes('psActions:"行動速查"')&&index.includes("data-ps-jump"),"action deck anchor must remain reachable");
assert(index.includes("actionDeckHTML")&&index.includes("play-action-deck-adapter-5r.js"));
assert(adapter.includes("spellMetaDb()")&&adapter.includes("grantedSpells2024()"));
assert(adapter.includes("st.prepared")&&adapter.includes("st.known"));
console.log("PASS action deck module: 18 casting-time formats, 4 groups, dedupe, full-rule projection, State adapter, source wiring");

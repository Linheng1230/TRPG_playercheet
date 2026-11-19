"use strict";
// Source-of-truth reverse coverage: a successful counter test must not conceal
// finite-use features that were never added to the tracker projection.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const root=process.env.SOURCE_ROOT||process.cwd();
const raw=fs.readFileSync(path.join(root,"assets/data/feature-5r-full-rules.js"),"utf8");
const prefix="window.ZIZI_5R_FULL_FEATURE_RULES=Object.freeze(";
assert(raw.startsWith(prefix),"Canonical full rules header changed");
const rules=JSON.parse(raw.slice(prefix.length).trim().replace(/;\s*$/,"").replace(/\)\s*$/,""));
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const match=html.match(/const PLAY_CLASS_LIMITED_USE_META_2024=Object\.freeze\(\[\s*([\s\S]*?)\n\]\);/);
assert(match,"Missing class limited-use projection metadata");
const meta=match[1].split("\n").map(v=>v.trim()).filter(v=>v.startsWith("[")).map(v=>JSON.parse(v.replace(/,\s*$/,"")));
const classes=new Set(["野蠻人","吟遊詩人","牧師","德魯伊","戰士","武僧","聖武士","遊俠","遊蕩者","術士","邪術師","法師"]);
const alreadyTracked=new Set([
 "野蠻人||狂暴","吟遊詩人||吟遊激勵","吟遊詩人||激勵之泉","牧師||引導神力","德魯伊||荒野變身","戰士||回氣","戰士||動作如潮","戰士||不屈","武僧||武僧的專注",
 "聖武士||聖療","聖武士||引導神力","術士||天生魔源","術士||魔源之泉",
 "遊俠||宿敵獵殺","法師||奧術恢復",
 "德魯伊|星辰結社|星圖","德魯伊|星辰結社|宇宙徵兆"
]);
const noSeparateCounter=Object.freeze({
 "野蠻人||不滅之怒|11":"無次數限制；豁免 DC 在同一短休間遞增",
 "牧師|光明領域|強化護衛閃光|6":"改善既有護衛閃光並使原資源改為短休恢復；非額外次數",
 "法師||法術精通|18":"可不限次數以最低環階施放，禁止虛構每日次數",
 "牧師|詭術領域|詭術師祝福|3":"持續到長休或再次使用，並非使用一次後不能重用"
});
const key4=m=>m[0]+"|"+m[1]+"|"+m[2]+"|"+m[3];
const metadataSource=new Map();
for(const m of meta){
 assert(m.length===9,"Malformed class use metadata "+JSON.stringify(m));
 assert(classes.has(m[0]),"Unknown class "+m[0]);
 const k=key4(m);
 const rule=rules[k];
 assert(typeof rule==="string" && rule.length>30,"Missing canonical 5RTools source "+k);
 assert(["one","wis","cha","con","pb2","superiority","level-plus-one"].includes(m[5]),"Unrecognized quantity "+k);
 assert(["short","short-one","long"].includes(m[6]),"Unrecognized recovery "+k);
 const prev=metadataSource.get(k)||[];
 assert(!prev.some(x=>x[4]===m[4]),"Duplicate tracker stable ID "+k+" "+m[4]);
 metadataSource.set(k,[...prev,m]);
}
const candidates=[];
const unresolved=[];
for(const [k,rule] of Object.entries(rules)){
 const p=k.split("|");
 if(p.length!==4||!classes.has(p[0]))continue;
 const rest=/短休|長休/.test(rule);
 const freeSpell=/(?:不消耗|無需消耗|無需)(?:一個)?(?:法術位|魔契法術位)/.test(rule);
 const independent= /一經使用|使用此特性|使用次數|免費/.test(rule);
 const candidate=rest&&(freeSpell||independent);
 if(!candidate)continue;
 candidates.push(k);
 const b=p.slice(0,3).join("|");
 if(metadataSource.has(k)||alreadyTracked.has(b)||Object.hasOwn(noSeparateCounter,k))continue;
 unresolved.push(k);
}
assert.equal(unresolved.length,0,"Unreviewed granted limited-use features in 5RTools canonical: "+JSON.stringify(unresolved));
assert(candidates.length>=80,"Canonical scan unexpectedly empty or damaged");
assert(meta.length>=69,"Incomplete known finite-use tracker coverage");
const summary={pass:true,classes:classes.size,canonicalTotal:Object.keys(rules).length,reviewCandidates:candidates.length,distinctSourceFeatures:metadataSource.size,trackers:meta.length,borrowedOrExisting:[...alreadyTracked].length,explicitNonIndependent:Object.keys(noSeparateCounter).length,unresolved:unresolved.length};
console.log("PASS class limited-use source-to-counter coverage",JSON.stringify(summary));

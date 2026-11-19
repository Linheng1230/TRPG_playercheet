"use strict";
/* The short creator glance is deliberately NOT a second complete rules summary.
   Preserve full mechanical preview() and all canonical texts; explicitly signal omissions. */
const assert=require("node:assert/strict"),path=require("node:path");
const root=path.resolve(__dirname,"..");
for(const file of ["assets/data/spells-phb-2024.js","assets/data/spell-rules-2024.js",
 "assets/spell-quick-facts-2024.js","assets/creator-spell-preview-2024.js","assets/creator-spell-glance-2024.js"])
 require(path.join(root,file));
const tuples=globalThis.SPELLS_2024_TUPLES;
const fullRules=globalThis.SPELLS_2024_FULL_RULES;
const old=globalThis.ZIZI_CREATOR_SPELL_PREVIEW_2024;
const glance=globalThis.ZIZI_CREATOR_SPELL_GLANCE_2024;
assert.equal(tuples.length,391);
assert(glance&&typeof glance.render==="function");
const before=JSON.stringify(fullRules);
let reduced=0,truncated=0;
const byId=new Map();
for(const row of tuples){
 const id=row[0],sp={identifier:id,n:row[3],d:fullRules[id],con:!!row[6],rit:!!row[7]};
 const meta={time:row[9],range:row[10],dur:row[12]};
 const oldText=old.preview(sp,4,meta).text;
 const out=glance.render(sp,4,meta);
 assert(out.text.length>0&&out.text.length<=113,id+" glance length "+out.text.length);
 assert(!/(?:升環施法|高環施法|戲法強化)/.test(out.text),id+" contains scaling text");
 assert(!/(?:5|11|17)級\s*\d+\s*[dD]\d+/.test(out.text),id+" contains progression ranks");
 assert(out.html.includes('class="sr-readable"'),id+" missing styled container");
 assert(!out.text.includes("…"),id+" has dangling truncation marker");
 assert(!/[,;:]/u.test(out.text),id+" contains non-Chinese punctuation in prose");
 assert(!/；\s*(?:豁免|傷害|治療)\s+[^；。]+$/u.test(out.text),id+" has orphan mechanics appendage");
 assert(!/[，；。]$/u.test(out.text),id+" ends in dangling punctuation");
 assert(out.omitted===Boolean(out.omitted),id+" omission metadata not boolean");
 if(out.text.length<oldText.length)reduced++;
 if(out.omitted)truncated++;
 byId.set(id,{out,oldText});
 console.log("SPELL_EDITORIAL_AUDIT "+JSON.stringify({id,name:row[3],preview:out.text,sourcePreview:oldText,originalShort:String(row[13]||"").slice(0,240)}));
}
assert.equal(JSON.stringify(fullRules),before,"Canonical rules mutated by glance");
assert(reduced>50,"Expected material batch-wide reduction, got "+reduced);
assert(byId.get("shillelagh").oldText.includes("5級"),"Original mechanical preview must retain scaling");
assert(!byId.get("shillelagh").out.text.includes("5級"),"List glance must omit scaling");
assert(byId.get("shillelagh").out.text.includes("1d8"),"Keep base damage");
for(const id of ["witch-bolt","fire-bolt","chill-touch","guiding-bolt"]){
 assert(/進行一次(?:遠端|近戰)法術攻擊，命中時造成/u.test(byId.get(id).out.text),id+" unnatural attack phrase");
}
for(const id of ["acid-splash","friends","mind-sliver","thunderclap"]){
 assert(!/豁免[,，](?:失敗|成功)/u.test(byId.get(id).out.text),id+" shorthand save phrase");
}
assert(byId.get("animal-friendship").out.text.includes("感知豁免"),"Preserve save cue as a grammatical aside");
assert(!byId.get("animal-friendship").out.text.includes("；豁免 感知"),"No orphan save shorthand");

assert(byId.get("witch-bolt").out.text.includes("附贈動作"),"Keep recurring action cue");
assert(byId.get("friends").out.text.includes("豁免"),"Keep save cue");
const hi=glance.highlight;
for(const [text,css] of [
 ["遠端法術攻擊","sp-preview-attack"],["攻擊檢定","sp-preview-attack"],
 ["力量豁免","sr-save"],["法術豁免DC","sr-save"],
 ["主要動作","sr-action"],["附贈動作","sr-action"],["魔法動作","sr-action"],
 ["優勢","sr-advantage"],["劣勢","sr-disadvantage"],["2d12 閃電傷害","sr-damage"],
 ["1d8","sr-dice"]]){
 assert(hi(text).includes(css),text+" lacks semantic mark "+css);
}
assert.equal(hi('<img src=x onerror=alert(1)>'),"&lt;img src=x onerror=alert(1)&gt;","HTML escaping");
console.log("CREATOR_GLANCE_391_PASS",JSON.stringify({canonical:tuples.length,reduced,truncated,
 examples:["shillelagh","witch-bolt","friends","sleep","fog-cloud"].map(id=>({id,text:byId.get(id).out.text}))}));

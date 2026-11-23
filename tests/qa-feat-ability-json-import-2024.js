"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"..","index.html"),"utf8");
const start=source.indexOf("function restoreImportedFeatAbilities2024("),end=source.indexOf("\n}",start)+2;
assert.ok(start>0&&end>start);
assert.ok(source.includes("pre.push(...restoreImportedFeatAbilities2024(save,o));"));
const ctx={GFEATS:[{n:"衝鋒者",ab:["str","dex"]},{n:"耐久",ab:["con"]}],ABN:{str:"力量",dex:"敏捷",con:"體質"}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
const restore=ctx.restoreImportedFeatAbilities2024;
function run(save,b={}){const readable={背景:"士兵",屬性:{力量:{專長加值:0},敏捷:{專長加值:0}},_save:save,...b};return restore(save,readable)}
function base(){return {ruleset:"2024",asi:{"4":{t:"feat",feat:"衝鋒者"}}}}
let s=base(),w=run(s);assert.equal(s.asi[4].featAb,undefined);assert.match(w[0],/力量／敏捷/);
s=base();w=run(s,{屬性:{力量:{專長加值:1},敏捷:{專長加值:0}}});assert.equal(s.asi[4].featAb,"str");assert.equal(w.length,0);
s=base();w=run(s,{屬性:{力量:{專長加值:0},敏捷:{專長加值:1}}});assert.equal(s.asi[4].featAb,"dex");assert.equal(w.length,0);
s=base();w=run(s,{屬性:{體質:{專長加值:1}}});assert.equal(s.asi[4].featAb,undefined);assert.equal(w.length,1);
s=base();w=run(s,{屬性:{力量:{專長加值:1},敏捷:{專長加值:1}}});assert.equal(s.asi[4].featAb,undefined);assert.equal(w.length,1);
s=base();s.asi[4].featAb="dex";w=run(s);assert.equal(s.asi[4].featAb,"dex");assert.equal(w.length,0);
s=base();s.ruleset="2014";w=run(s);assert.equal(w.length,0);assert.equal(s.asi[4].featAb,undefined);
s=base();w=restore(s,{背景:"士兵",屬性:{力量:{專長加值:1}}});assert.equal(s.asi[4].featAb,undefined);assert.equal(w.length,0);
s=base();s.asi[8]={t:"feat",feat:"衝鋒者"};w=run(s,{屬性:{力量:{專長加值:1}}});assert.equal(s.asi[4].featAb,undefined);assert.equal(w.length,2);
console.log("PASS 9/9 feat ability import cases");

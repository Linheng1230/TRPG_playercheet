"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const src=fs.readFileSync(path.join(root,"assets/play-status-undo-5r.js"),"utf8");
const page=fs.readFileSync(path.join(root,"index.html"),"utf8");
const ctx={};ctx.window=ctx;vm.runInNewContext(src,ctx);
const api=ctx.PlayStatusUndo5R;assert(api&&api.snapshot&&api.record&&api.available&&api.undo);
const make=(ruleset="2024")=>({id:"test-c1",ruleset,cls:{n:"戰士"},level:4,classLevels:{戰士:4},
 slotsUsed:{l1:1,pact:1},play:{hp:12,hpMax:40,thp:5,hd:2,ds:{s:1,f:2},insp:true,
 res:{sw:1,ai:1},resMax:{sw:3},custom:[{n:"藥水",max:3,used:1,rest:"long"}],notes:"保留原始筆記"}});
const capture=api.snapshot;
for(const ruleset of ["2024","2014"]){
 const s=make(ruleset),old=capture(s);
 s.play.hp=40;s.play.hd=4;s.play.thp=0;s.play.ds={s:0,f:0};s.play.insp=false;
 s.play.res.sw=0;s.play.custom[0].used=0;s.slotsUsed.l1=0;
 assert.equal(api.record(s,"長休",old,40),true);
 assert(api.available(s,40));
 const saved=JSON.parse(JSON.stringify(s));
 const r=api.undo(saved,40);assert.equal(r.ok,true);assert.equal(r.label,"長休");
 assert.deepEqual(JSON.parse(JSON.stringify(capture(saved))),JSON.parse(JSON.stringify(old)));
 assert.equal(saved.play.notes,"保留原始筆記");
 assert.equal(saved.play.undo,undefined,"must be strictly one-step");
 assert.equal(api.available(saved,40),null);
 assert.equal(api.undo(saved,40).ok,false);
}
{
 const s=make(),first=capture(s);s.play.hp=10;assert(api.record(s,"受傷",first,40));
 const after=capture(s);assert.equal(api.record(s,"無變化",after,40),false);
 assert.equal(s.play.undo.label,"受傷");
 s.play.hd=1;assert(api.record(s,"生命骰",after,40));
 assert.equal(api.undo(s,40).ok,true);assert.equal(s.play.hp,10);assert.equal(s.play.hd,2);
}
{
 const s=make(),first=capture(s);s.play.hp=6;api.record(s,"受傷",first,40);
 s.slotsUsed.l1=2;const after=JSON.stringify(s);
 assert.equal(api.available(s,40),null);
 assert.equal(api.undo(s,40).ok,false);assert.equal(JSON.stringify(s),after);
}
for(const key of ["id","level","ruleset","classLevels"]){
 const s=make(),before=capture(s);s.play.hp=3;api.record(s,"受傷",before,40);
 if(key==="id")s.id="another-player";
 if(key==="level")s.level=5;
 if(key==="ruleset")s.ruleset="2014";
 if(key==="classLevels")s.classLevels={戰士:3,法師:1};
 assert.equal(api.available(s,40),null,"stale "+key);
}
{
 const s=make(),before=capture(s);s.play.hp=3;api.record(s,"受傷",before,40);
 assert.equal(api.available(s,41),null,"HP max growth blocks stale undo");
}
{
 const s=make(),before=capture(s);s.play.hp=7;api.record(s,"受傷",before,40);
 s.play.notes="休息後新增的筆記";
 assert(api.available(s,40));assert(api.undo(s,40).ok);
 assert.equal(s.play.notes,"休息後新增的筆記");
}
{
 const old=make();assert.equal(api.available(old,40),null);
 assert.equal(api.undo(old,40).ok,false);
}
assert.match(page,/play-status-undo-5r\.js\?v=20261114-v1/);
assert.match(page,/data-ps-action="undo"/);
assert.match(page,/undo\?\.record\(S,action==="rest-short"/);
assert.match(page,/undo\?\.record\(S,undoLabels\[action\]/);
assert.match(page,/renderPlayStatusTab\(\);autoSave\(\);toast\("已撤銷："/);
for(const [,inline] of page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))
 if(inline.trim())new vm.Script(inline,{filename:"index-inline.js"});
console.log("PASS: play-status undo snapshots, two rulesets, one-step only, no-op, stale guard, notes, save/DOM script syntax");

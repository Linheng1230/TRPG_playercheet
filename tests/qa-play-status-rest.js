"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const root=path.resolve(__dirname,"..");
const src=fs.readFileSync(path.join(root,"assets/play-status-rest-5r.js"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sandbox={};sandbox.window=sandbox;vm.runInNewContext(src,sandbox,{filename:"play-status-rest-5r.js"});
const rest=sandbox.PlayStatusRest5R;
assert(rest&&typeof rest.apply==="function"&&typeof rest.open==="function");
const state=(cls="戰士",ruleset="2024",level=4)=>({
 className:cls,level,ruleset,slotsUsed:{l1:2,pact:2},
 play:{hp:10,hd:level,thp:4,ds:{s:2,f:1},res:{sw:2,ai:1,rage:2,cd:2,ws:2,ki:3,bi:2,ar:1,sp:3,"stars-guiding-bolt":2},
 resMax:{},custom:[{n:"短休道具",max:3,used:2,rest:"short"},{n:"長休道具",max:3,used:2,rest:"long"},{n:"舊計數器",max:3,used:2}],notes:"記住這段筆記"}
});
const resource=(k,max)=>({k,label:k,max});
const fighterResources=[resource("sw",3),resource("ai",1)];
const allSlots=[{key:"l1",label:"1 環",max:4},{key:"pact",label:"契約魔法",max:2}];

{
 const s=state();
 const r=rest.apply(s,"short",{diceCount:2,hitDie:10,conMod:2,maxHP:30,random:()=>0,resources:fighterResources,slots:allSlots});
 assert.equal(s.play.hp,16,"每枚生命骰 d10=1 加體質+2，兩枚共6HP");
 assert.equal(s.play.hd,2);
 assert.equal(s.play.res.sw,1,"2024 戰士回氣短休只回 1 次");
 assert.equal(s.play.res.ai,0,"動作如潮短休回滿");
 assert.equal(s.slotsUsed.pact,0,"契約魔法短休回滿");
 assert.equal(s.slotsUsed.l1,2,"一般法術位短休不得回滿");
 assert.equal(s.play.custom[0].used,0);
 assert.equal(s.play.custom[1].used,2);
 assert.equal(s.play.custom[2].used,2);
 assert.equal(r.rolls.length,2);
 assert.equal(s.play.notes,"記住這段筆記");
 const long=rest.apply(s,"long",{diceCount:0,hitDie:10,conMod:2,maxHP:30,resources:fighterResources,slots:allSlots});
 assert.equal(s.play.hp,30);
 assert.equal(s.play.hd,4,"2024 長休恢復全部生命骰");
 assert.equal(s.play.thp,0);
 assert.equal(s.play.ds.s,0);
 assert.equal(s.slotsUsed.l1,0);
 assert.equal(s.play.res.sw,0);
 assert.equal(s.play.custom[1].used,0);
 assert.equal(s.play.custom[2].used,2,"舊自訂計數器不得擅自清空");
 assert.equal(long.rolls.length,0);
}
{
 const s=state("野蠻人");
 rest.apply(s,"short",{maxHP:30,diceCount:0,resources:[resource("rage",4)]});
 assert.equal(s.play.res.rage,1,"狂暴短休只回 1 次");
 rest.apply(s,"long",{maxHP:30,resources:[resource("rage",4)]});
 assert.equal(s.play.res.rage,0);
}
{
 const s=state("牧師");
 rest.apply(s,"short",{maxHP:30,diceCount:0,resources:[resource("cd",3)]});
 assert.equal(s.play.res.cd,1,"引導神力短休回 1 次");
}
{
 const s=state("武僧");
 rest.apply(s,"short",{maxHP:30,diceCount:0,resources:[resource("ki",4)]});
 assert.equal(s.play.res.ki,0,"武僧專注點短休全恢復");
}
{
 const s=state("法師");
 const r=rest.apply(s,"short",{maxHP:30,diceCount:0,resources:[resource("ar",1)],slots:[{key:"l1",max:4}]});
 assert.equal(s.play.res.ar,1,"奧術恢復的使用權不能短休自動消耗／恢復");
 assert.equal(s.slotsUsed.l1,2,"法師法術位不能自動從奧術恢復取得");
 assert(r.reminders.some(x=>x.includes("奧術恢復")));
}
{
 const s=state("術士");
 rest.apply(s,"short",{maxHP:30,diceCount:0,resources:[resource("sp",4)]});
 assert.equal(s.play.res.sp,3,"術法恢復需玩家選擇，不能無條件全恢復");
}
{
 const s=state("德魯伊");
 rest.apply(s,"short",{maxHP:30,diceCount:0,resources:[resource("ws",3),resource("stars-guiding-bolt",3)]});
 assert.equal(s.play.res.ws,1,"荒野變身短休恢復 1 次");
 assert.equal(s.play.res["stars-guiding-bolt"],2,"星圖免費施法次數僅長休恢復");
}
{
 const s=state("戰士","2024",4);
 s.sp={n:"人類"};s.play.insp=false;
 const r=rest.apply(s,"long",{maxHP:30,resources:[],slots:[]});
 assert.equal(s.play.insp,true,"2024 人類完成長休必須獲得英雄激勵");
 assert(r.changes.some(x=>x.scope==="inspiration"),"長休摘要必須顯示人類英雄激勵");
 rest.apply(s,"long",{maxHP:30,resources:[],slots:[]});
 assert.equal(s.play.insp,true,"重複長休不可讓英雄激勵變為未持有");
}
{
 const s=state("戰士","2014",4);
 s.sp={n:"人類"};s.play.insp=false;
 rest.apply(s,"long",{maxHP:30,resources:[],slots:[]});
 assert.equal(s.play.insp,false,"2014 人類不得錯誤取得 2024 英雄激勵");
}
{
 const s=state("戰士","2014",5);
 s.play.hd=1;
 s.play.res.sw=1;
 rest.apply(s,"short",{maxHP:30,diceCount:0,resources:fighterResources});
 assert.equal(s.play.res.sw,0,"2014 回氣短休回滿");
 rest.apply(s,"long",{maxHP:30,resources:fighterResources,slots:[]});
 assert.equal(s.play.hd,3,"2014 長休恢復最多一半（向下取整）生命骰");
}
{
 const s=state("戰士","2014",4),prev=JSON.stringify(s);
 assert.throws(()=>rest.apply(s,"short",{maxHP:30,diceCount:1,diceTypes:[{name:"戰士",level:2},{name:"法師",level:2}]}),/多職業/);
 assert.equal(JSON.stringify(s),prev,"多職業無法自動判定骰型時不得動到狀態");
}
{
 const s=state();s.play.hp=0;
 const prev=JSON.stringify(s);
 assert.throws(()=>rest.apply(s,"long",{maxHP:30}),/生命值/);
 assert.equal(JSON.stringify(s),prev,"0HP 不得啟動長休");
}
{
 const s=state(),prev=JSON.stringify(s);
 assert.throws(()=>rest.apply(s,"short",{maxHP:30,diceCount:5}),/生命骰數量/);
 assert.equal(JSON.stringify(s),prev,"非法數量必須 atomic no-op");
}
{
 const s=state();s.play.hp=29;
 const result=rest.apply(s,"short",{maxHP:30,diceCount:2,hitDie:10,conMod:-5,random:()=>0,slots:[]});
 assert.equal(result.hpGained,1,"負體質時每枚至少恢復1HP，仍不超過 HP 上限");
 assert.equal(s.play.hp,30);
}
assert(html.includes('<script src="assets/play-status-rest-5r.js?v=20261114-v2"></script>'),"rest module must load before main script");
assert(html.includes('data-ps-action="rest-short"')&&html.includes('data-ps-action="rest-long"'),"rest shortcuts visible");
assert(html.includes('rest.open(action==="rest-short"?"short":"long"'),"rest actions wired");
assert(html.includes("renderPlayStatusTab();autoSave()"),"rest changes must persist");
assert(html.includes(".ps-rest-dialog")&&html.includes("@media(max-width:390px){.ps-rest-shortcuts"),"responsive modal CSS missing");
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
for (const block of inline) new vm.Script(block,{filename:"index-inline.js"});
console.log("PASS: play-status rest 2024/2014 rules, protection, slot/resource/custom recovery, script syntax and UI wiring");

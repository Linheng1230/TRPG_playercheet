const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../assets/play-status-creatures-5r.js"),"utf8");
const fake={head:{appendChild(){}},createElement(){return {textContent:""}},readyState:"loading",addEventListener(){}};
const animals=[
 {id:"land",name:"Land",source:"XPHB",hp:null,ac:"13",speed:{walk:40}},
 {id:"cat",name:"Cat",source:"XMM",hp:2,ac:"12",speed:{walk:40}},
 {id:"steed",name:"Steed",source:"XPHB",hp:null,ac:"12",speed:{walk:60}},
 {id:"spirit",name:"Spirit",source:"XPHB",hp:null,ac:"11",speed:{walk:30}}
];
const context={document:fake,window:{ZIZI_5R_CREATURES:animals,ZIZI_5R_CREATURES_ZH:{},CreatureImport5R:{
 selectedCompanion:s=>s.companion?animals[0]:null,
 primalCompanionStats5R:(x,s)=>({ready:true,hp:s.level*5+5,ac:17,hit:6,damageDie:"1d8",damageFlat:6,dc:14,level:s.level,proficiency:2,wisdom:4,acBase:13,hpBase:5,hpPer:5,damageBase:2}),
 wildEligible:()=>true
 }},MutationObserver:class{},URLSearchParams};
vm.runInNewContext(source,context);
const api=context.window.PlayStatusCreatures5R;
const state={cls:{n:"遊俠"},ruleset:"2024",level:3,companion:true,play:{},familiar:{creatureId:"cat",status:"present"},creatureLibrary:{wildShape:["cat"],mounts:["cat"],summons:[{creatureId:"spirit",spell:"Summon Beast"},{creatureId:"steed",spell:"Find Steed"}]}};
const hp=(k,x,spell)=>api.hpStatus(state,k,animals.find(z=>z.id===x),k==="companion"?{ready:true,hp:5+state.level*5}:null,spell).current;
assert.match(api.render(state),/目前生命值/);
assert.match(api.render(state),/固定傷害加值/,"原初野獸傷害常數必須有明確標示");
assert.match(api.render(state),/不等於熟練加值/,"原初野獸固定傷害不可誤解成 PB");
assert.equal(hp("companion","land"),20);
assert.equal(api.adjust(state,"companion","land","","damage",6),true);
assert.equal(hp("companion","land"),14);
assert.equal(api.adjust(state,"companion","land","","heal",50),true);
assert.equal(hp("companion","land"),20);
assert.equal(api.adjust(state,"familiar","cat","","set",0),true);
assert.equal(hp("familiar","cat"),0);
assert.equal(hp("wildShape","cat"),2);
assert.equal(api.adjust(state,"summon","spirit","Summon Beast","damage",2),false);
assert.equal(api.adjust(state,"summon","spirit","Summon Beast","max",30),true);
assert.equal(api.adjust(state,"summon","spirit","Summon Beast","damage",7),true);
assert.equal(hp("summon","spirit","Summon Beast"),23);
assert.equal(api.adjust(state,"summon","spirit","Other Spell","damage",1),false);
assert.equal(api.adjust(state,"mount","cat","","damage",1),true);
assert.equal(hp("mount","cat"),1);
assert.equal(api.adjust(state,"mount","cat","","reset",0),true);
assert.equal(hp("mount","cat"),2);
assert.equal(api.adjust(state,"mount","cat","","damage",-4),false);
assert.equal(api.adjust(state,"mount","cat","","set",10000),false);
const restored=JSON.parse(JSON.stringify(state));
assert.equal(api.hpStatus(restored,"summon",animals[3],null,"Summon Beast").current,23);
restored.level=4;
assert.equal(api.hpStatus(restored,"companion",animals[0],{ready:true,hp:25}).current,20);
assert.match(api.render(restored),/23 \/ 30/);
console.log("PASS creature HP: calculated max, independent entries, clamps, invalid input, manual max, save roundtrip, level scale");

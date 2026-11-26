const assert=require("node:assert/strict"),R=require("../assets/starting-resources-5r.js");
for(let lv=1;lv<=20;lv++){const b=R.budget(lv);assert.equal(b.slots.length,lv===1?0:lv<=4?1:lv<=10?2:lv<=16?6:10);assert.equal(R.gold(lv,1),b.base+b.multiplier);assert.equal(R.gold(lv,10),b.base+b.multiplier*10)}
assert.equal(R.recommended("Ranger"),"armaments");assert.equal(R.recommended("遊俠"),"armaments");assert.equal(R.theme(4),"relics");
assert.throws(()=>R.budget(21));assert.throws(()=>R.gold(5,0));assert.throws(()=>R.theme(5));
const items=[{id:"c",rarity:"common"},{id:"staff-of-the-python|xdmg",rarity:"uncommon"}];
const faces=R.compileTable([{min:1,max:100,id:items[1].id}],"uncommon",items);for(let i=1;i<=100;i++)assert.equal(R.lookup(faces,i),items[1].id);
assert.deepEqual(R.lookup(R.compileTable([{min:1,max:100,ids:[items[1].id,"alt"]}],"uncommon",[...items,{id:"alt",rarity:"uncommon"}]),100),[items[1].id,"alt"]);
assert.throws(()=>R.compileTable([{min:1,max:99,id:items[1].id}],"uncommon",items));assert.throws(()=>R.compileTable([{min:1,max:100,id:"c"}],"uncommon",items));assert.throws(()=>R.compileTable([{min:1,max:100,id:items[1].id},{min:100,max:100,id:items[1].id}],"uncommon",items));
const s={ruleset:"2024",level:5,cls:{n:"Ranger"},gear:{gold:{gp:12,pp:1,sp:3,cp:2},magicItems:[]}};
const add=(d,id)=>{d.gear.magicItems.push({id,qty:1});return {ok:true}};
const p={d10:5,ids:items.map(x=>x.id)};
assert.equal(R.grant(s,p,items,add).ok,true);assert.equal(s.gear.gold.gp,637);assert.equal(s.gear.gold.pp,1);assert.equal(s.gear.magicItems.length,2);assert.equal(R.grant(JSON.parse(JSON.stringify(s)),p,items,add).ok,false);assert.equal(R.grant(s,p,items,add).ok,false);
const bad={ruleset:"2024",level:5,cls:{},gear:{gold:{gp:0},magicItems:[]}};const old=JSON.stringify(bad);assert.equal(R.grant(bad,p,items,()=>({ok:false})).ok,false);assert.equal(JSON.stringify(bad),old);assert.equal(R.grant({...bad,ruleset:"2014"},p,items,add).ok,false);
console.log("PASS: level bands 1–20, dice bounds, theme, complete D100 coverage, atomic grant and reload duplicate prevention");

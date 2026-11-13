/* Regression: PHB2024 class packages, separate background claim, no double issue, save compatibility. */
const fs=require("fs"),path=require("path"),vm=require("vm"),assert=require("assert");
const repo=path.resolve(__dirname,".."),source=fs.readFileSync(path.join(repo,"assets/class-starting-gear-2024.js"),"utf8");
const context={INSTRUMENTS_2014:["長笛","魯特琴"],ARTISAN_TOOLS_2014:["木匠工具"],
 S:null, WEAPONS:[], BG_GEAR_2024:{隱士:{items:"草藥工具、睡袋",gp:16}},
 resolvedBgGear24(){return {items:"草藥工具、睡袋",gp:16,weapons:[]}},
 moneyCp(){const g=context.S.gear.gold;return (g.gp||0)*100+(g.sp||0)*10+(g.cp||0)+(g.pp||0)*1000},
 setMoneyCp(cp){context.S.gear.gold={pp:0,gp:Math.floor(cp/100),sp:Math.floor(cp%100/10),cp:cp%10}},
 renderFinal(){context.renders++},update(){},autoSave(){context.saves++},
 toast(t){context.messages.push(t)},displayName5R(_type,n){return n},
 canonicalInventoryText5R(t){return t},GAMING_2014:[],
 renders:0,saves:0,messages:[]
};
vm.createContext(context);
vm.runInContext(source+";globalThis.__g={CLASS_GEAR_2024,addClassGear24,rollbackStartingGear24,renderClassGear24,renderBgGear24,startingGear24ReadyToConfirm,isStartingGear24Final,finalizeStartingGear24,reopenStartingGear24,renderStartingGear24Review};",context);
const {CLASS_GEAR_2024:data,addClassGear24:add,rollbackStartingGear24:rollback,renderClassGear24:renderClass,renderBgGear24:renderBg,startingGear24ReadyToConfirm:ready,isStartingGear24Final:isFinal,finalizeStartingGear24:finish,reopenStartingGear24:reopen,renderStartingGear24Review:review}=context.__g;
const names=Object.keys(data);assert.strictEqual(names.length,12);
assert.strictEqual(Object.values(data).reduce((a,x)=>a+x.length,0),25);
for(const [n,opts] of Object.entries(data)){
 assert.strictEqual(new Set(opts.map(o=>o.k)).size,opts.length,n);
 assert.deepStrictEqual([...opts.map(o=>o.k)],opts.length===3?["A","B","C"]:["A","B"],n);
 for(const op of opts)assert(Number.isInteger(op.gp)&&op.gp>=0,n+" "+op.k);
}
assert.strictEqual(data["戰士"][2].gp,155);
assert.deepStrictEqual(names.filter(n=>data[n].length===3),["戰士"]);
context.WEAPONS=[...new Set(Object.values(data).flatMap(a=>a.flatMap(o=>o.weapons||[])))].map(n=>["",n]);
function reset(n,extra={}){
 context.S={ruleset:"2024",cls:{n},bg:{n:"隱士"},bgChoice2024:{},gear:{gold:{pp:0,gp:0,sp:0,cp:0},items:"",weapons:[],shield:false,armor:"",purchases:{},...extra}};
 context.messages=[];context.renders=0;context.saves=0;
}
const expectedGP={野蠻人:[15,75],吟遊詩人:[19,90],牧師:[7,110],德魯伊:[9,50],戰士:[4,11,155],武僧:[11,50],聖武士:[9,150],遊俠:[7,150],遊蕩者:[8,100],術士:[28,50],邪術師:[15,100],法師:[5,55]};
for(const [name,options] of Object.entries(data)){
 assert.deepStrictEqual(Array.from(options,o=>o.gp),expectedGP[name],name+" source gold");
 for(const opt of options){
  reset(name);
  if(opt.pick)context.S.gear.classGearChoice24="長笛";
  assert(renderClass().includes("data-classgear="),name+" unclaimed controls");
  add(opt.k);
  assert.strictEqual(context.S.gear.classPackage24,name,name+" "+opt.k);
  assert.strictEqual(context.S.gear.classPackage24Mode,opt.k);
  assert.strictEqual(context.moneyCp(),opt.gp*100);
  assert(renderClass().includes("data-classgear-edit"),name+" "+opt.k+" collapse");
  assert(!renderClass().includes("data-classgear="),name+" "+opt.k+" no A/B buttons when claimed");
  const save=JSON.parse(JSON.stringify(context.S.gear));
  assert.strictEqual(save.classGearGrant24.goldCp,opt.gp*100);
  add(opt.k);assert.strictEqual(context.moneyCp(),opt.gp*100,"duplicate money blocked");
  assert(rollback("class"),name+" "+opt.k+" rollback");
  assert.strictEqual(context.moneyCp(),0);
  assert.strictEqual(context.S.gear.items,"");
  assert.strictEqual(context.S.gear.weapons.length,0);
  assert(!context.S.gear.classPackage24);
  add(opt.k);assert.strictEqual(context.S.gear.classPackage24,name,"reselect after safe rollback");
 }
}
reset("遊俠");
add("A");
context.S.gear.items+="、手動記錄藥水";
context.S.gear.weapons.push("長弓");
context.S.gear.gold.gp+=20;
assert(rollback("class"),"rollback leaves manual items/weapons");
assert.strictEqual(context.S.gear.items,"手動記錄藥水");
assert.strictEqual(context.S.gear.weapons.join(","),"長弓");
assert.strictEqual(context.moneyCp(),2000);
reset("法師");add("A");context.S.gear.gold.gp=0;
assert.strictEqual(rollback("class"),false,"spent cash must block rollback");
assert.strictEqual(context.S.gear.classPackage24,"法師");
reset("法師",{classPackage24:"法師",classPackage24Mode:"A"});assert.strictEqual(rollback("class"),false,"legacy unknown grant blocked");
reset("遊俠");add("A");
assert(!ready(),"not ready before background choice");finish();assert(!isFinal(),"premature confirmation blocked");
const g=context.S.gear;g.bgPackage24="隱士";g.bgPackage24Mode="B";g.bgGearGrant24={owner:"隱士",mode:"B",items:"",weapons:[],goldCp:5000};g.gold.gp+=50;
assert.strictEqual(context.moneyCp(),5700,"class and background gold add");
assert(renderBg().includes("data-bggear-edit"),"bg selected collapses");
assert(ready(),"both choices are ready");assert(review().includes("data-startgear-final"),"review has final confirmation");
assert(!isFinal(),"selection alone is not final");finish();assert(isFinal(),"final confirmation persists");
const snapshot=JSON.parse(JSON.stringify(g));assert.strictEqual(snapshot.startingGearFinal24.className,"遊俠");
assert.strictEqual(snapshot.startingGearFinal24.bgMode,"B");
reopen();assert(!isFinal(),"reopen clears final marker while preserving grants");assert.strictEqual(context.moneyCp(),5700);
finish();assert(isFinal());
assert(rollback("class"));assert(!isFinal(),"class rollback invalidates confirmation");assert.strictEqual(context.moneyCp(),5000,"class withdrawal preserves background");
assert(rollback("bg"));assert.strictEqual(context.moneyCp(),0,"background withdrawal safe");
const canonical=process.env.FIVERTOOLS_ROOT||"D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024";
const eng={野蠻人:"Barbarian",吟遊詩人:"Bard",牧師:"Cleric",德魯伊:"Druid",戰士:"Fighter",武僧:"Monk",聖武士:"Paladin",遊俠:"Ranger",遊蕩者:"Rogue",術士:"Sorcerer",邪術師:"Warlock",法師:"Wizard"};
if(fs.existsSync(canonical)){
 for(const [name,en] of Object.entries(eng)){
  const file=path.join(canonical,"data__class__class-"+en.toLowerCase()+".json");
  const j=JSON.parse(fs.readFileSync(file,"utf8").replace(/^\uFEFF/,""));
  const source=j.class.find(x=>x.ENG_name===en&&x.source==="PHB2024");
  assert(source,en+" canonical source present");
  const options=source.startingEquipment.default.filter(t=>/^\s*\([A-C]\)/.test(t));
  assert.strictEqual(options.length,data[name].length,name+" canonical option count");
  for(const [i,t] of options.entries()){
   const numbers=[...t.matchAll(/(\d+)\s*gp/gi)].map(x=>+x[1]);
   assert.strictEqual(data[name][i].gp,numbers[numbers.length-1],name+" "+i+" canonical GP");
  }
 }
}
const html=fs.readFileSync(path.join(repo,"index.html"),"utf8");
for(const marker of ['assets/class-starting-gear-2024.js','renderClassGear24()','renderBgGear24()','data-classgear-edit','rollbackStartingGear24("class")']){
 assert(html.includes(marker),"index integration missing "+marker);
}
assert(!html.includes('else if(S.bg&&BG_GEAR_2024[S.bg.n])'),"old background-only final gear path remains");
console.log("PASS: 12 classes / 25 official A/B/C options, class+background, no double claim, rollback guards, JSON state, 2014 path unaffected by new branch.");

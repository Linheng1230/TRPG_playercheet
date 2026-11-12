'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const actions={Attack:'攻擊',Dash:'疾行',Disengage:'撤離',Dodge:'迴避',Help:'協助',Hide:'躲藏',Influence:'影響',Magic:'魔法',Ready:'預備',Search:'搜尋',Study:'研究',Utilize:'使用物件'};
assert.equal(Object.keys(actions).length,12);
const source=read('index.html'),phb14=source.indexOf('const PHB14_FEAT_DESC=');
assert(phb14>0,'2014 boundary');
assert(!source.slice(0,phb14).includes('疾走'),'2024 in-page features have old Dash');
assert(source.includes('快速撤離|SKW|C|可用附贈動作疾行'),'2024 spell summary Dash');
assert(source.slice(phb14).includes('疾走動作'),'2014 action terminology preserved');
const expected={'assets/data/feat-5r-full-rules.js':3,'assets/data/feature-5r-full-rules.js':4,'assets/data/maneuvers-5r.js':1,'assets/data/species-5r-full-rules.js':1,'assets/data/spell-rules-2024.js':6,'assets/data/spells-phb-2024.js':1,'assets/data/creatures-5r-zh.js':12,'assets/data/magic-items-5r-zh.js':2};
for(const [f,n] of Object.entries(expected)){const s=read(f);assert(!s.includes('疾走'),f+' has 2014 Dash alias');assert((s.split('疾行').length-1)>=n,f+' missing canonical Dash occurrences');}
const full=read('assets/data/spell-rules-2024.js'),ctx={globalThis:{}};vm.runInNewContext(full,ctx);
const rules=ctx.globalThis.SPELLS_2024_FULL_RULES;
assert.equal(Object.keys(rules).length,391);
assert(rules.haste.includes('使用物件動作'),'2024 Haste Utilizes nonmagical object');
assert(!rules.haste.includes('操作動作'),'old Utilize synonym');
assert(rules.haste.includes('攻擊動作'),'Haste attack option preserved');
assert(Object.values(rules).some(r=>r.includes('魔法動作')),'Magic action must remain separate from Utilize');
assert(read('assets/data/spells-phb-2014.json').includes('疾走'),'2014 rule corpus remains unchanged');
for(const f of ['scripts/build-5r-zh-projection.py','scripts/build-5r-spell-rules.py']){assert(read(f).includes('疾行'),'Generator guard for '+f)}
console.log(JSON.stringify({pass:true,actions:12,spellRules:391,sourceFiles:Object.keys(expected).length,magicDistinctFromUtilize:true,legacy2014Preserved:true}));

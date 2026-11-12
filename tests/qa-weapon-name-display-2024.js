'use strict';
const fs=require('fs'),assert=require('assert'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const pdf=fs.readFileSync(path.join(root,'assets/character-sheet-export.js'),'utf8');
const mig=fs.readFileSync(path.join(root,'assets/data/name-migrations-5r.js'),'utf8');
const canon=fs.readFileSync(path.join(root,'assets/data/canonical-5r-zh-names.js'),'utf8');
const ctx={};vm.runInNewContext(mig+'\n'+canon,ctx);
const migrations=ctx.ZIZI_5R_NAME_MIGRATIONS.weapons;
const items=ctx.ZIZI_5R_CANONICAL_NAMES.items;
const targets={'Glaive':['長柄斧','長柄刀'],'Quarterstaff':['木杖','長棍'],'Pike':['長槍','長矛']};
const source=html.slice(html.indexOf('const WEAPONS='),html.indexOf('];',html.indexOf('const WEAPONS='))+2);
const weapons=Function(source+';return WEAPONS')();
assert.equal(weapons.length,38,'Weapon IDs should remain stable');
for(const [en,[legacy,display]] of Object.entries(targets)){
 assert.equal(weapons.filter(w=>w[1]===legacy).length,1,'Must preserve storage key '+legacy);
 assert.equal(migrations[legacy],display,'Display migration '+en);
 assert.equal(items[en].zh,display,'Canonical English binding '+en);
}
assert(pdf.includes('m[`attack-wp-name${j}`]=displayName5R("weapons",n)'), '2024 PDF attack slots must use translated display names');
assert(pdf.includes('m[i?`Wpn Name ${j}`:"Wpn Name"]=parts.type?`${n}(${parts.type})`:n'), '2014 PDF should retain original behavior');
console.log('PASS: 3/3 bilingual weapon names; immutable IDs; 2024 PDF display; 2014 PDF unchanged; 38 weapons');

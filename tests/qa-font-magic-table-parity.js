const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname,'../assets/data/feature-5r-full-rules.js'),'utf8');
const context = {window:{}};
vm.runInNewContext(src,context);
const rule = context.window.ZIZI_5R_FULL_FEATURE_RULES['術士||魔源之泉|2'];
assert(rule,'Font of Magic canonical rule must exist');
assert.match(rule,/法術位來獲得等同於其環位的術法點（無需動作）/);
assert.match(rule,/附贈動作/);
assert.match(rule,/無法創造高於五環的法術位/);
assert.match(rule,/長休時消失/);
const rows=[[1,2,2],[2,3,3],[3,5,5],[4,6,7],[5,7,9]];
for(const [lv,cost,min] of rows){
  assert(rule.includes(`${lv}環法術位：消耗${cost}術法點，最低術士${min}級。`),
    `missing canonical ratio for spell slot ${lv}`);
}
const ward=context.window.ZIZI_5R_FULL_FEATURE_RULES['德魯伊|大地結社|自然守護|10'];
for(const pair of ['荒漠：火焰傷害抗性','極地：寒冷傷害抗性','溫帶：閃電傷害抗性','熱帶：毒素傷害抗性'])assert(ward.includes(pair),pair);
const psi=context.window.ZIZI_5R_FULL_FEATURE_RULES['戰士|靈能武士|靈能力量|3'];
for(const row of [[3,'d6',4],[5,'d8',6],[9,'d8',8],[11,'d10',8],[13,'d10',10],[17,'d12',12]])assert(psi.includes(`戰士${row[0]}級：靈能骰${row[1]}，共${row[2]}枚`),JSON.stringify(row));
const soul=context.window.ZIZI_5R_FULL_FEATURE_RULES['遊蕩者|靈魂之刃|靈能力量|3'];
for(const [lv,die,count] of [[3,'d6',4],[5,'d8',6],[9,'d8',8],[11,'d10',8],[13,'d10',10],[17,'d12',12]])assert(soul.includes(`遊蕩者${lv}級：靈能骰${die}，共${count}枚`),`${lv} ${die} ${count}`);
const star=context.window.ZIZI_5R_FULL_FEATURE_RULES['德魯伊|星辰結社|星圖|3'];
for(let i=1;i<=6;i++)assert(star.includes(`骰值${i}：`),`Star Map d6 value ${i}`);
console.log('PASS Font 5/5, Nature Ward 4/4, Psi Fighter 6/6, Soulknife 6/6, Star Map 6/6');

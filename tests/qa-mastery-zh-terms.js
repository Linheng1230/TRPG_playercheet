'use strict';
const fs = require('fs');
const assert = require('assert');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const from = html.indexOf('const MASTERY=');
const to = html.indexOf('];', html.indexOf('const WEAPONS=', from)) + 2;
assert(from > -1 && to > from, 'Weapon data blocks must exist');
const code = html.slice(from, to);
const data = Function(code + '; return { MASTERY, WEAPONS };')();
const names = ['順劈','擦傷','迅捷','推離','削弱','減速','擊倒','擾敵'];
assert.deepStrictEqual(Object.keys(data.MASTERY), names, 'Eight mastery labels must be in PHB2024 order');
assert.strictEqual(data.WEAPONS.length, 38, 'Expected 38 weapon records');
for (const weapon of data.WEAPONS) {
  assert(names.includes(weapon[4]), 'Invalid mastery for ' + weapon[1] + ': ' + weapon[4]);
}
for (const name of ['順勢','掠傷','推撞','撂倒','破綻']) {
  assert(!code.includes('"' + name + '"'), 'Legacy mastery name remains in weapon data: ' + name);
}
assert(html.includes('順劈、擦傷、迅捷、推離、削弱、減速、擊倒、擾敵'), 'Mastery feature summary is stale');
assert(html.includes('掌握屬性臨時替換為推離、削弱或減速'), 'Tactical Master summary is stale');
console.log('PASS mastery zh terms: 8 masteries, 38 weapons, feature summaries');

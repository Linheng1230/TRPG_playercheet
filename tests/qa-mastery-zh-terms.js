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
const finalFrom = html.indexOf('const validMasteries=S.ruleset==="2024"?validMasterySet2024():S.mastery;');
const finalTo = html.indexOf('/* 法術位 */', finalFrom);
assert(finalFrom > -1 && finalTo > finalFrom, 'Final sheet weapon mastery section must exist');
const finalMastery = html.slice(finalFrom, finalTo);
assert(finalMastery.includes('class="ft"') && finalMastery.includes('aria-haspopup="dialog"'), 'Final sheet masteries must use the shared accessible feature popover');
assert(finalMastery.includes('data-tip-title="${escFeatureHTML(displayName5R("masteries",w[4]))}"'), 'Final sheet mastery card must display the localized mastery title');
assert(finalMastery.includes('data-tip="${escFeatureHTML(MASTERY[w[4]])}"'), 'Final sheet mastery card must use the canonical mastery rule, including Cleave and Vex');
console.log('PASS mastery zh terms: 8 masteries, 38 weapons, feature summaries, final-sheet rule popovers');

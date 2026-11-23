import assert from "node:assert/strict";
import { WOW_P0_SLOTS, auditP0Translations } from "../assets/wow-dlc-policy.mjs";

const sha = "a".repeat(64), translationSha = "b".repeat(64);
const entries = WOW_P0_SLOTS.map((slot, i) => ({
  slot, id: `wow:test-${i}`, sourceSha: sha,
}));
const approvals = entries.map(({ slot, id, sourceSha }) => ({
  slot, id, sourceSha, translationSha,
  locale: "zh-TW", semantic: "PASS", mechanics: "PASS", visibleText: "PASS",
}));
const deps = [
  { id: "Compendium.dnd-world-warcraft.origins.Item.wowsptTestOrig0", sourceSha: sha,
    referencedBy: ["species:wow:test-1"] },
  { id: "Compendium.dnd-world-warcraft.spells.Item.wowsplTestSpell", sourceSha: sha,
    referencedBy: ["spell:wow:test-6"] },
];
const itemApprovals = deps.map(({ id, sourceSha }) => ({
  id, sourceSha, translationSha,
  locale: "zh-TW", semantic: "PASS", mechanics: "PASS", visibleText: "PASS",
}));
const assess = (e = entries, a = approvals, d = deps, ia = itemApprovals) =>
  auditP0Translations({ inventory: { sourceSha: sha, entries: e, itemDependencies: d }, approvals: a, itemApprovals: ia });
const has = (r, prefix) => r.blockers.some(s => s.startsWith(prefix));

assert.deepEqual(assess(), { ok: true, checked: 8, checkedItems: 2, blockers: [] });
assert.equal(has(assess(entries.filter(x => x.slot !== "class2")), "MISSING_REQUIRED_SLOT:class2"), true);
assert.equal(has(assess(entries.filter(x => x.slot !== "feat"), approvals.filter(x => x.slot !== "feat")), "MISSING_REQUIRED_SLOT:feat"), true);
assert.equal(has(assess(entries.filter(x => x.slot !== "spell"), approvals.filter(x => x.slot !== "spell")), "MISSING_REQUIRED_SLOT:spell"), true);
assert.equal(has(assess(entries, approvals.slice(1)), "MISSING_QA:"), true);
assert.equal(has(assess(entries, [...approvals, approvals[0]]), "DUPLICATE_QA:"), true);
assert.equal(has(assess([...entries, entries[0]]), "DUPLICATE_SOURCE:"), true);
assert.equal(has(assess(entries, [...approvals, { ...approvals[0], id: "wow:unexpected" }]), "UNEXPECTED_QA:"), true);
assert.equal(has(assess(entries, [{ ...approvals[0], sourceSha: "c".repeat(64) }, ...approvals.slice(1)]), "QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, [{ ...approvals[0], semantic: "UNCERTAIN" }, ...approvals.slice(1)]), "QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, [{ ...approvals[0], visibleText: "FAIL" }, ...approvals.slice(1)]), "QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, [{ ...approvals[0], translationSha: "invalid" }, ...approvals.slice(1)]), "QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, [{ ...approvals[0], locale: "zh-CN" }, ...approvals.slice(1)]), "QA_NOT_APPROVED:"), true);
assert.equal(auditP0Translations({}).ok, false);
assert.equal(auditP0Translations({ inventory: { sourceSha: "not-sha", entries: [] }, approvals: [] }).ok, false);
assert.equal(has(assess(entries, approvals, []), "MISSING_REQUIRED_ITEMS"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals.slice(1)), "MISSING_ITEM_QA:"), true);
assert.equal(has(assess(entries, approvals, deps, [...itemApprovals, itemApprovals[0]]), "DUPLICATE_ITEM_QA:"), true);
assert.equal(has(assess(entries, approvals, [...deps, deps[0]]), "DUPLICATE_SOURCE_ITEM:"), true);
assert.equal(has(assess(entries, approvals, deps, [...itemApprovals, { ...itemApprovals[0], id: "Compendium.dnd-world-warcraft.spells.Item.wowsplNewSpell" }]), "UNEXPECTED_ITEM_QA:"), true);
assert.equal(has(assess(entries, approvals, deps, [{ ...itemApprovals[0], semantic: "UNCERTAIN" }, itemApprovals[1]]), "ITEM_QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, approvals, deps, [{ ...itemApprovals[0], sourceSha: "c".repeat(64) }, itemApprovals[1]]), "ITEM_QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, approvals, [{ ...deps[0], referencedBy: ["species:missing"] }, deps[1]]), "INVALID_SOURCE_ITEM"), true);
assert.equal(has(assess(entries, approvals, [{ ...deps[0], id: "forged.item" }, deps[1]]), "INVALID_SOURCE_ITEM"), true);
assert.equal(auditP0Translations({ inventory: { sourceSha: sha, entries, itemDependencies: deps }, approvals }).ok, false);
console.log("PASS wow-dlc-p0-inventory: fail-closed Journal and native Item reference QA");

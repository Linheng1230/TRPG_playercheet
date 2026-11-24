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
// SpellList and subclass JournalEntryPages are not ordinary text pages.
// All page/Item data here is synthetic: test only the fail-closed producer.
const nativePages = [
  { id: "wowDruid00000000/q2lmihAM5qpOz6Pu", type: "spells", sourceSha: sha,
    referencedItemIds: [deps[1].id] },
  { id: "wowPaladin000000/fgEzvxkOrwjepeWP", type: "subclass", sourceSha: sha,
    referencedItemIds: [] },
];
const nativePageApprovals = nativePages.map(({ id, type, sourceSha }) => ({
  id, type, sourceSha, translationSha, locale: "zh-TW",
  semantic: "PASS", mechanics: "PASS", visibleText: "PASS",
  nativeMapping: "PASS", liveRendering: "PASS", linkNavigation: "PASS",
}));
const assess = (e = entries, a = approvals, d = deps, ia = itemApprovals,
  np = nativePages, pa = nativePageApprovals) =>
  auditP0Translations({ inventory: { sourceSha: sha, entries: e,
    itemDependencies: d, nativePageDependencies: np },
    approvals: a, itemApprovals: ia, nativePageApprovals: pa });
const has = (r, prefix) => r.blockers.some(s => s.startsWith(prefix));

assert.deepEqual(assess(), { ok: true, checked: 8, checkedItems: 2, checkedNativePages: 2, blockers: [] });
// Full subclasses are P1 for ordinary Lv2 builds; hero exceptions have
// their own GM subclass-lock gate.
assert.equal(assess(entries.filter(x => x.slot !== "class2"),
  approvals.filter(x => x.slot !== "class2")).ok, true);
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
// The native page source, mapping and GM UI paths cannot inherit a
// PASS from Journal prose or Item source approvals.
assert.equal(has(assess(entries, approvals, deps, itemApprovals, []), "MISSING_REQUIRED_NATIVE_PAGES"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, nativePages, []), "MISSING_NATIVE_PAGE_QA:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, [...nativePages, nativePages[0]]), "DUPLICATE_SOURCE_NATIVE_PAGE:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, nativePages, [...nativePageApprovals, nativePageApprovals[0]]), "DUPLICATE_NATIVE_PAGE_QA:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, nativePages, [{ ...nativePageApprovals[0], sourceSha: "c".repeat(64) }, nativePageApprovals[1]]), "NATIVE_PAGE_QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, nativePages, [{ ...nativePageApprovals[0], liveRendering: "UNCERTAIN" }, nativePageApprovals[1]]), "NATIVE_PAGE_QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, nativePages, [{ ...nativePageApprovals[0], linkNavigation: "FAIL" }, nativePageApprovals[1]]), "NATIVE_PAGE_QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, nativePages, [{ ...nativePageApprovals[0], nativeMapping: "UNCERTAIN" }, nativePageApprovals[1]]), "NATIVE_PAGE_QA_NOT_APPROVED:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, [{ ...nativePages[0], referencedItemIds: ["Compendium.dnd-world-warcraft.spells.Item.wowsplUnknown1"] }, nativePages[1]]), "NATIVE_PAGE_ITEM_NOT_IN_INVENTORY:"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, [{ ...nativePages[0], referencedItemIds: [] }, nativePages[1]]), "INVALID_SOURCE_NATIVE_PAGE"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, [{ ...nativePages[0], referencedItemIds: [deps[1].id, deps[1].id] }, nativePages[1]]), "INVALID_SOURCE_NATIVE_PAGE"), true);
assert.equal(has(assess(entries, approvals, deps, itemApprovals, [{ ...nativePages[0], id: "invalid/journal" }, nativePages[1]]), "INVALID_SOURCE_NATIVE_PAGE"), true);
assert.equal(auditP0Translations({ inventory: { sourceSha: sha, entries,
  itemDependencies: deps, nativePageDependencies: nativePages },
  approvals, itemApprovals }).ok, false);
console.log("PASS wow-dlc-p0-inventory: fail-closed Journal, native Item, SpellList and Subclass QA");

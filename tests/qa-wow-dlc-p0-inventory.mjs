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
const inventory = { sourceSha: sha, entries };
const assess = (e = entries, a = approvals) =>
  auditP0Translations({ inventory: { sourceSha: sha, entries: e }, approvals: a });
const has = (r, prefix) => r.blockers.some(s => s.startsWith(prefix));

assert.deepEqual(assess(), { ok: true, checked: 8, blockers: [] });
assert.equal(has(assess(entries.filter(x => x.slot !== "class2")), "MISSING_REQUIRED_SLOT:class2"), true);
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
assert.equal(assess(entries.filter(x => x.slot !== "feat"), approvals.filter(x => x.slot !== "feat")).ok, true);
assert.equal(assess(entries.filter(x => x.slot !== "spell"), approvals.filter(x => x.slot !== "spell")).ok, true);
console.log("PASS wow-dlc-p0-inventory: 15 positive/negative schema and SHA-bound gates");

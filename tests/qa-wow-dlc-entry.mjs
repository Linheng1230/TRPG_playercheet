import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installWowDlcEntry } from "../assets/wow-dlc-entry.mjs";
import { WOW_PUBLIC_SPECIES, WOW_PUBLIC_CLASSES, WOW_PUBLIC_SPECIALIZATIONS, WOW_BASE_CLASS_IDS } from "../assets/wow-dlc-policy.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /<script defer src="assets\/wow-dlc-entry\.js/);
assert.match(html, /data-ruleset="2014"/);
assert.match(html, /data-ruleset="2024"/);
assert.doesNotMatch(html, /data-ruleset="wow(?:-2026)?"/);
assert.match(html, /S\.ruleset=o\.ruleset==="2014"\?"2014":"2024"/);

class MockNode {
  constructor(tag) {
    this.tagName = tag.toUpperCase(); this.nodes = []; this.style = {};
    this.handlers = {}; this.attributes = {}; this.textContent = ""; this.id = "";
  }
  appendChild(node) { this.nodes.push(node); return node; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, fn) { this.handlers[name] = fn; }
  click() { this.handlers.click?.(); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}
const chooser = new MockNode("div");
const body = new MockNode("body");
const doc = {
  body,
  createElement: tag => new MockNode(tag),
  querySelector: selector => selector === ".ruleset-chooser" ? chooser : null,
  getElementById: id => [...chooser.nodes, ...body.nodes].find(x => x.id === id) || null,
};
assert.deepEqual(installWowDlcEntry({ ...doc, querySelector: () => null }), { ok: false, reason: "CHOOSER_NOT_FOUND" });
const first = installWowDlcEntry(doc);
assert.equal(first.ok, true);
assert.equal(first.releaseBlocked, true);
assert.equal(chooser.nodes.length, 1);
const button = chooser.nodes[0];
assert.equal(button.id, "wowDlcEntry");
assert.equal(button.tagName, "BUTTON");
assert.equal(button.attributes["aria-haspopup"], "dialog");
assert.equal(button.attributes["data-ruleset"], undefined);
assert.equal(button.nodes[0].textContent.includes("施工中"), true);
const dialog = body.nodes[0];
assert.equal(dialog.tagName, "DIALOG");
assert.equal(dialog.nodes.some(x => x.tagName === "UL" && x.nodes.length === 5), true);
assert.equal(WOW_PUBLIC_SPECIES.length, 16);
assert.equal(WOW_PUBLIC_CLASSES.length, 13);
assert.equal(new Set(WOW_PUBLIC_SPECIES.map(x => x.journalId)).size, 16);
assert.equal(new Set(WOW_PUBLIC_CLASSES.map(x => x.id)).size, 13);
assert.equal(WOW_PUBLIC_SPECIALIZATIONS.length, 40);
assert.equal(new Set(WOW_PUBLIC_SPECIALIZATIONS.map(x => x.id)).size, 40);
for (const row of [...WOW_PUBLIC_SPECIES, ...WOW_PUBLIC_CLASSES]) {
  assert.match(row.zh, /[一-鿿]/u);
  assert.match(row.en, /^[A-Za-z ]+$/);
  assert.match(row.journalId, /^wow[A-Za-z0-9]{6,}$/);
}
for (const row of WOW_PUBLIC_CLASSES) assert.equal(row.coreClassId, WOW_BASE_CLASS_IDS[row.id]);
const previews=dialog.nodes.filter(x => x.tagName === "DETAILS");
assert.equal(previews.length, 3);
assert.match(previews[0].nodes[0].textContent, /16 類.*僅名稱預覽/);
assert.match(previews[1].nodes[0].textContent, /13 類.*僅名稱預覽/);
assert.match(previews[2].nodes[0].textContent, /40 類.*僅名稱預覽/);
assert.match(previews[0].nodes[1].textContent, /龍希爾 Dracthyr/);
assert.match(previews[0].nodes[1].textContent, /哈拉尼爾 Haranir/);
assert.match(previews[1].nodes[1].textContent, /死亡騎士 Death Knight/);
assert.match(previews[2].nodes[1].textContent, /酒仙 Brewmaster/);
assert.ok(!dialog.nodes.some(x => x.textContent.includes("已開放正式創角")));
assert.equal(dialog.nodes.find(x => x.tagName === "H3").textContent, "魔獸世界 DLC｜創角預告");
assert.match(dialog.nodes.find(x => x.tagName === "BUTTON").style.cssText, /background:#b89a5d;color:#20190f/);
button.click();
assert.equal(dialog.open, true);
dialog.nodes.find(x => x.tagName === "BUTTON").click();
assert.equal(dialog.open, false);
assert.deepEqual(installWowDlcEntry(doc), { ok: true, alreadyInstalled: true });
assert.equal(chooser.nodes.length, 1);
assert.equal(body.nodes.length, 1);
console.log("PASS wow-dlc-entry: mounted locked DLC, functional dialog, no third core edition");

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installWowDlcEntry } from "../assets/wow-dlc-entry.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(html, /type="module" src="assets\/wow-dlc-entry\.mjs/);
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
button.click();
assert.equal(dialog.open, true);
dialog.nodes.find(x => x.tagName === "BUTTON").click();
assert.equal(dialog.open, false);
assert.deepEqual(installWowDlcEntry(doc), { ok: true, alreadyInstalled: true });
assert.equal(chooser.nodes.length, 1);
assert.equal(body.nodes.length, 1);
console.log("PASS wow-dlc-entry: mounted locked DLC, functional dialog, no third core edition");

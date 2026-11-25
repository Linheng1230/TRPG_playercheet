import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const creator = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const start = creator.indexOf("function deserialize(o){");
const end = creator.indexOf(' featImportSlotKey="";', start);
assert.ok(start > 0 && end > start);
const preflightBody = creator.slice(start + "function deserialize(o){".length, end);
const preflight = new Function("o", preflightBody + "\nreturn null;");
const old5r = { v: 10, id: "character-1", ruleset: "2024", level: 2 };
const old5e = { v: 10, id: "character-2", ruleset: "2014", level: 2 };
assert.equal(preflight(old5r), null);
assert.equal(preflight(old5e), null);
const wow = { ...old5r, dlcId: "wow-2026" };
assert.equal(preflight(wow).ok, false);
assert.match(preflight(wow).warn.join(""), /原始存檔已保留/);
assert.equal(preflight({ ...old5r, dlcId: "future-dlc" }).ok, false);
assert.equal(preflight({ ...old5r, dlcId: "" }), null);
assert.ok(preflight(wow).warn[0].includes("wow-2026"));
assert.match(creator, /const r=deserialize\(o\);\s*if\(!r\.ok\)\{/);
assert.match(creator, /const res=deserialize\(save\);\s*if\(!res\.ok\)\{alert\(\(res\.warn\|\|\[\]\)/);
assert.match(creator, /if\(o\)\{const result=deserialize\(o\);restored=!!result\.ok\}/);
assert.match(creator, /<script defer src="assets\/wow-dlc-entry\.js/);
assert.match(creator, /S\.ruleset=o\.ruleset==="2014"\?"2014":"2024"/);
// Roster backup import must retain unknown DLC metadata instead of mislabelling
// or silently cloning it into a different GM authorization scope.
assert.match(creator, /dlcId:typeof save\.dlcId==="string"\?save\.dlcId:""/);
assert.match(creator, /const unsupportedDlc=typeof savedDlc==="string"&&savedDlc\.length>0/);
assert.match(creator, /unsupportedDlc\?"DLC（尚未支援編輯）"/);
assert.match(creator, /data-load="\$\{safeId\}"\$\{unsupportedDlc\?' disabled/);
assert.match(creator, /data-dup="\$\{safeId\}"\$\{unsupportedDlc\?' disabled/);
assert.match(creator, /if\(o\.dlcId\)\{toast\("此 DLC 角色尚不能複製/);
assert.match(creator, /<button data-exp="\$\{safeId\}">匯出<\/button>/);
// Imported roster text is untrusted, including a locked DLC backup. Test
// the same escape helper used by the real HTML renderer.
const escStart = creator.indexOf("const rosterHtmlText=value=>");
const escEnd = creator.indexOf("\nfunction renderRoster()", escStart);
assert.ok(escStart > 0 && escEnd > escStart);
const escapeText = new Function(creator.slice(escStart, escEnd) +
  "\nreturn rosterHtmlText;")();
const malicious = '<img src=x onerror="alert(1)"> & \u0027';
assert.equal(escapeText(malicious),
  "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;");
assert.equal(escapeText(null), "");
assert.equal(escapeText("獸人戰士"), "獸人戰士");
assert.match(creator, /const safeId=rosterHtmlText\(e\.id\),safeName=rosterHtmlText\(e\.name\)/);
assert.match(creator, /const safeThumb=rosterHtmlText\(e\.thumb\)/);
assert.match(creator, /const safeDetail=rosterHtmlText\(/);
assert.match(creator, /<div class="rname">\$\{safeName\}/);
assert.doesNotMatch(creator, /data-exp="\$\{e\.id\}"/);
console.log("PASS wow-dlc-quarantine: unsupported DLC backups display clearly, remain exportable, and cannot be cloned");

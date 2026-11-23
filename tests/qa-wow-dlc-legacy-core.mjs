import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCharacterDlc } from "../assets/wow-dlc-policy.mjs";

const creator = readFileSync(new URL("../index.html", import.meta.url), "utf8");
assert.match(creator, /const S=\{\s*ruleset:"2024"/);
assert.match(creator, /S\.ruleset=o\.ruleset==="2014"\?"2014":"2024";syncRulesetUI\(\)/);
assert.match(creator, /return \{v:SAVE_VERSION,ruleset:S\.ruleset,id:S\.id/);
// Legacy creator has only 2014/2024 engine. Do not silently insert WoW
// into data-ruleset or rely on unsupported third-edition Save semantics.
assert.equal(/data-ruleset="wow(?:-2026)?"/.test(creator), false);
assert.equal(validateCharacterDlc({ ruleset: "wow-2026", dlcId: "wow-2026", level: 2 }).reason,
  "CORE_RULESET_MISMATCH");
assert.equal(validateCharacterDlc({ ruleset: "2024", dlcId: "unknown", level: 2 }).reason,
  "DLC_MISMATCH");
console.log("PASS wow-dlc-legacy-core: orthogonal DLC identity and 2014/2024 Save contract");

"use strict";
/*
 * Independent regression gate for the read-only first-session tutorial.
 * Run: node tests/qa-first-session-tutorial-5r.js
 * Does not load index.html or connect to player saves/combat runtime.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.resolve(__dirname, "../assets/first-session-tutorial-5r.js");
const source = fs.readFileSync(sourcePath, "utf8");
const tutorial = require(sourcePath);
let assertions = 0;
const check = (condition, message) => { assertions++; assert.ok(condition, message); };
const eq = (a, b, message) => { assertions++; assert.equal(a, b, message); };
const unique = (items, context) => {
  const ids = items.map(x => x.id);
  eq(ids.length, new Set(ids).size, context + ": IDs must be unique");
};
const nonEmpty = (value, context) => check(typeof value === "string" && value.trim().length > 0, context);
const sheetFields = (value, context) => {
  check(Array.isArray(value) && value.length > 0, context + ": no character-sheet fields");
  value.forEach((label, i) => nonEmpty(label, context + " field " + i));
};
const ruleRef = (value, context) => {
  check(value && value.source === "5RTools" && value.book === "PHB2024", context + ": canonical pointer");
  nonEmpty(value.section, context + " section");
  nonEmpty(value.term, context + " term");
};

eq(tutorial.meta.edition, "2024", "must not mix editions");
eq(tutorial.meta.integration.owner, "30｜教學正式入口", "handoff owner");
for (const flag of ["characterStateRead", "characterStateWrite", "diceRoll", "combatSettlement"])
  eq(tutorial.meta.integration[flag], false, "simulation must not use " + flag);
nonEmpty(tutorial.meta.disclaimer, "simulation disclaimer");
check(tutorial.meta.disclaimer.includes("不擲骰") && tutorial.meta.disclaimer.includes("不改角色資料"), "clear simulation warning");
ruleRef({ source: tutorial.meta.canonical.authority, book: tutorial.meta.canonical.source,
  section: "Rules Glossary", term: "PHB2024" }, "source metadata");
check(tutorial.meta.canonical.availability.includes("部分資料表"), "disclose snapshot limitation");

const required = [
  "describe-and-dm", "d20-and-saves", "advantage", "attack-ac-damage",
  "initiative", "movement", "action-economy", "hp-and-death",
  "spell-slots", "concentration", "short-rest", "long-rest"
];
eq(tutorial.topics.length, required.length, "complete lesson count");
unique(tutorial.topics, "topics");
for (const id of required) {
  const item = tutorial.getTopic(id);
  check(item && item.id === id, "missing topic: " + id);
  nonEmpty(item.title, id + " title");
  nonEmpty(item.summary, id + " summary");
  nonEmpty(item.example, id + " example");
  nonEmpty(item.nextAction, id + " next action");
  sheetFields(item.sheetFields, id);
  ruleRef(item.ruleRef, id);
  check(item.summary.length < 230, id + " summary should be scannable on phone");
}
eq(tutorial.getTopic("no-such-topic"), null, "unknown topic must return null");

// Explicit semantic guardrails: guard against accidental removal of essential player concepts.
const contains = (id, terms) => {
  const item = tutorial.getTopic(id);
  const text = [item.title, item.summary, item.example, item.nextAction].join(" ");
  for (const term of terms) check(text.includes(term), id + ": missing " + term);
};
contains("describe-and-dm", ["DM", "描述"]);
contains("d20-and-saves", ["d20", "DC", "豁免"]);
contains("advantage", ["兩顆 d20", "較高", "較低", "抵銷"]);
contains("attack-ac-damage", ["AC", "傷害", "自然 20", "自然 1"]);
contains("initiative", ["先攻", "敏捷"]);
contains("movement", ["速度", "移動"]);
contains("action-economy", ["動作", "附贈動作", "反應"]);
contains("hp-and-death", ["HP", "死亡豁免", "3 次", "自然 20", "自然 1"]);
contains("spell-slots", ["戲法", "法術位", "施放時間"]);
contains("concentration", ["專注", "體質豁免", "DC"]);
contains("short-rest", ["短休", "1 小時", "生命骰"]);
contains("long-rest", ["長休", "8 小時", "生命骰"]);

eq(tutorial.scenarios.length, 3, "exactly three self-contained scenarios");
unique(tutorial.scenarios, "scenarios");
const expectedKinds = ["exploration", "social", "combat"];
eq(tutorial.scenarios.map(x => x.id).join(","), expectedKinds.join(","), "exploration/social/combat order");
const seenChoiceIds = new Set();
let totalSteps = 0, totalChoices = 0;
for (const scenario of tutorial.scenarios) {
  nonEmpty(scenario.title, scenario.id + " title");
  nonEmpty(scenario.intro, scenario.id + " intro");
  check(Array.isArray(scenario.steps) && scenario.steps.length >= 2, scenario.id + " needs multiple steps");
  unique(scenario.steps, scenario.id + " steps");
  eq(tutorial.getScenario(scenario.id), scenario, "scenario lookup " + scenario.id);
  for (const st of scenario.steps) {
    totalSteps++;
    nonEmpty(st.title, st.id + " title");
    nonEmpty(st.prompt, st.id + " prompt");
    sheetFields(st.sheetFields, st.id);
    ruleRef(st.ruleRef, st.id);
    eq(tutorial.getStep(scenario.id, st.id), st, "step lookup " + st.id);
    check(Array.isArray(st.choices) && st.choices.length >= 2, st.id + ": choices");
    unique(st.choices, st.id + " choices");
    for (const c of st.choices) {
      totalChoices++;
      const key = [scenario.id, st.id, c.id].join("/");
      check(!seenChoiceIds.has(key), "duplicate option " + key);
      seenChoiceIds.add(key);
      nonEmpty(c.label, key + " label");
      check(c.feedback && ["good", "hint", "caution"].includes(c.feedback.tone), key + ": feedback tone");
      nonEmpty(c.feedback.title, key + " feedback title");
      nonEmpty(c.feedback.body, key + " feedback body");
      sheetFields(c.feedback.sheetFields, key);
      eq(tutorial.getFeedback(scenario.id, st.id, c.id), c.feedback, key + ": feedback lookup");
      check(c.label.length < 115 && c.feedback.body.length < 195, key + ": phone text length");
    }
  }
}
eq(tutorial.getScenario("unknown"), null, "unknown scenario");
eq(tutorial.getStep("combat", "unknown"), null, "unknown step");
eq(tutorial.getFeedback("combat", "initiative", "unknown"), null, "unknown choice");
eq(tutorial.getFeedback("unknown", "initiative", "initiative-value"), null, "unknown scenario/choice");

// Immutable teaching-only material. Neither selecting an option nor looking up a topic may change it.
const baseline = JSON.stringify({ meta: tutorial.meta, topics: tutorial.topics, scenarios: tutorial.scenarios });
check(Object.isFrozen(tutorial) && Object.isFrozen(tutorial.scenarios), "module root immutable");
check(Object.isFrozen(tutorial.scenarios[0].steps[0].choices[0].feedback), "feedback deep-immutable");
assert.throws(() => { tutorial.topics[0].title = "mutated"; }, TypeError);
assert.throws(() => { tutorial.scenarios[0].steps[0].choices.push({}); }, TypeError);
for (let k = 0; k < 4; k++) {
  tutorial.getTopic(required[k]);
  tutorial.getScenario(expectedKinds[k % 3]);
  tutorial.getFeedback("combat", "your-turn", "move-attack");
}
eq(JSON.stringify({ meta: tutorial.meta, topics: tutorial.topics, scenarios: tutorial.scenarios }),
  baseline, "queries must not mutate content");

// Load as a browser script in a hostile fake runtime: accessing character state, storage,
// document, crypto, or rolling dice would throw. The only allowed global write is module export.
const sandbox = {};
for (const name of ["S", "localStorage", "sessionStorage", "document", "indexedDB", "crypto"]) {
  Object.defineProperty(sandbox, name, { configurable: false, get() {
    throw new Error("Unexpected access to " + name);
  } });
}
sandbox.Math = Object.create(Math);
sandbox.Math.random = () => { throw new Error("Dice / random forbidden"); };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: "first-session-tutorial-5r.js", timeout: 2000 });
const browser = sandbox.ZIZI_FIRST_SESSION_TUTORIAL_5R;
check(browser && browser.meta.id === "first-session-5r", "browser global export");
eq(JSON.stringify(browser.scenarios), JSON.stringify(tutorial.scenarios), "browser / Node content parity");
eq(browser.getFeedback("social", "approach", "empathy").tone, "good", "browser feedback");
check(!/\b(?:Math\.random\s*\(|fetch\s*\(|localStorage\.|sessionStorage\.|indexedDB\.|document\.|\bS\s*\.)/.test(source),
  "module contains runtime/storage/state side effects");
check(!source.includes("2014"), "no cross-edition references");

// Pure view smoke: options and feedback are plain text and have enough references for a
// consumer to render without invoking game actions. This is not production UI / mobile UAT.
function renderPreview(sc) {
  return [sc.title, sc.intro, ...sc.steps.flatMap(st => [
    st.title, st.prompt, ...st.sheetFields,
    ...st.choices.flatMap(c => [c.label, c.feedback.title, c.feedback.body, ...c.feedback.sheetFields])
  ])].join("\n");
}
for (const sc of tutorial.scenarios) {
  const preview = renderPreview(sc);
  check(preview.includes(sc.title) && preview.includes(sc.steps[0].choices[0].label), sc.id + ": display contract");
}
console.log(JSON.stringify({
  status: "PASS", suite: "qa-first-session-tutorial-5r",
  checks: assertions, topics: tutorial.topics.length,
  scenarios: tutorial.scenarios.length, steps: totalSteps, choices: totalChoices,
  evidence: "TARGETED; data-only VM/browser-export check; production UI and Live UAT not claimed"
}, null, 2));

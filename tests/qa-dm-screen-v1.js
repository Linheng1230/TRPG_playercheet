"use strict";

const assert = require("node:assert/strict");
const dm = require("../assets/dm-screen-v1.js");

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function activeTab(board) {
  return board.tabs.find((tab) => tab.id === board.activeTabId);
}

function panelOfType(board, type) {
  return activeTab(board).panels.find((panel) => panel.type === type);
}

test("tab and panel operations persist without mutating prior state", () => {
  const storage = new MemoryStorage();
  const original = dm.createDefaultBoard("2024");
  const originalSnapshot = JSON.stringify(original);

  let board = dm.createTab(original, "深水城");
  const newTabId = board.activeTabId;
  board = dm.renameTab(board, newTabId, "深水城：第二夜");
  board = dm.addPanel(board, newTabId, "notes");
  board = dm.addPanel(board, newTabId, "spell");
  board = dm.addPanel(board, newTabId, "creature");

  const notes = panelOfType(board, "notes");
  const spell = panelOfType(board, "spell");
  const creature = panelOfType(board, "creature");
  board = dm.updateNotes(board, newTabId, notes.id, "門後有三名守衛。 ");
  board = dm.setPanelTitle(board, newTabId, notes.id, "場景筆記");
  board = dm.updateReference(board, newTabId, spell.id, { query: "shield", selectedId: dm.makeReferenceId("spell2024", "shield") });
  board = dm.movePanel(board, newTabId, creature.id, "up");
  assert.equal(activeTab(board).panels[1].id, creature.id);
  board = dm.movePanel(board, newTabId, creature.id, "down");
  assert.equal(activeTab(board).panels[2].id, creature.id);

  dm.saveBoard(storage, board);
  const reloaded = dm.loadBoard(storage, "2024");
  assert.deepEqual(reloaded, board);
  assert.equal(panelOfType(reloaded, "notes").text, "門後有三名守衛。 ");
  assert.equal(panelOfType(reloaded, "spell").query, "shield");

  const switched = dm.switchTab(reloaded, original.activeTabId);
  assert.equal(switched.activeTabId, original.activeTabId);
  const returned = dm.switchTab(switched, newTabId);
  const withoutCreature = dm.deletePanel(returned, newTabId, creature.id);
  assert.equal(activeTab(withoutCreature).panels.some((panel) => panel.id === creature.id), false);
  const withoutTab = dm.deleteTab(withoutCreature, newTabId);
  assert.equal(withoutTab.tabs.length, 1);
  assert.equal(JSON.stringify(original), originalSnapshot);
});

test("initiative remains manual, sortable, editable, selectable, and advances rounds", () => {
  let board = dm.createDefaultBoard("2024");
  const tabId = board.activeTabId;
  board = dm.addPanel(board, tabId, "initiative");
  const initiativeId = panelOfType(board, "initiative").id;
  board = dm.addInitiativeEntry(board, tabId, initiativeId, "盜賊", 17);
  board = dm.addInitiativeEntry(board, tabId, initiativeId, "食人魔", 8);
  board = dm.addInitiativeEntry(board, tabId, initiativeId, "法師", 17);

  let initiative = panelOfType(board, "initiative");
  assert.deepEqual(initiative.entries.map((entry) => entry.name), ["盜賊", "食人魔", "法師"]);
  board = dm.sortInitiative(board, tabId, initiativeId);
  initiative = panelOfType(board, "initiative");
  assert.deepEqual(initiative.entries.map((entry) => entry.name), ["盜賊", "法師", "食人魔"]);

  const firstId = initiative.entries[0].id;
  const secondId = initiative.entries[1].id;
  const lastId = initiative.entries[2].id;
  board = dm.selectInitiative(board, tabId, initiativeId, firstId);
  board = dm.nextInitiative(board, tabId, initiativeId);
  assert.equal(panelOfType(board, "initiative").activeEntryId, secondId);
  board = dm.selectInitiative(board, tabId, initiativeId, lastId);
  board = dm.nextInitiative(board, tabId, initiativeId);
  initiative = panelOfType(board, "initiative");
  assert.equal(initiative.activeEntryId, firstId);
  assert.equal(initiative.round, 2);

  board = dm.editInitiativeEntry(board, tabId, initiativeId, secondId, "法師（專注）", 19);
  assert.equal(panelOfType(board, "initiative").entries.find((entry) => entry.id === secondId).value, 19);
  board = dm.removeInitiativeEntry(board, tabId, initiativeId, firstId);
  assert.equal(panelOfType(board, "initiative").entries.length, 2);
  assert.equal(panelOfType(board, "initiative").activeEntryId, secondId);
});

test("2014 and 2024 use separate storage namespaces", () => {
  const storage = new MemoryStorage();
  let board2024 = dm.createDefaultBoard("2024");
  let board2014 = dm.createDefaultBoard("2014");
  board2024 = dm.renameTab(board2024, board2024.activeTabId, "2024 冒險");
  board2014 = dm.renameTab(board2014, board2014.activeTabId, "2014 冒險");
  dm.saveBoard(storage, board2024);
  dm.saveBoard(storage, board2014);

  assert.notEqual(dm.storageKey("2024"), dm.storageKey("2014"));
  assert.equal(dm.loadBoard(storage, "2024").tabs[0].title, "2024 冒險");
  assert.equal(dm.loadBoard(storage, "2014").tabs[0].title, "2014 冒險");
  assert.throws(() => dm.createDefaultBoard("2025"), /不支援/);
});

test("valid edition-specific backup roundtrips", () => {
  const storage = new MemoryStorage();
  let source = dm.createDefaultBoard("2014");
  source = dm.updateNotes(source, source.activeTabId, panelOfType(source, "notes").id, "只屬於 2014 的筆記");
  const serialized = dm.exportBackup(source, "2026-11-17T00:00:00.000Z");
  const parsed = dm.parseBackup(serialized, "2014");
  assert.deepEqual(parsed, source);
  const imported = dm.importBackup(storage, serialized, "2014");
  assert.deepEqual(imported, source);
  assert.deepEqual(dm.loadBoard(storage, "2014"), source);
  assert.throws(() => dm.parseBackup(serialized, "2024"), /版本.*不同/);
});

test("XSS-looking text stays literal in state, backup, and textContent sink", () => {
  const attack = "<img src=x onerror=globalThis.pwned=true><script>alert(1)</script>";
  let board = dm.createDefaultBoard("2024");
  const notes = panelOfType(board, "notes");
  board = dm.updateNotes(board, board.activeTabId, notes.id, attack);
  board = dm.renameTab(board, board.activeTabId, attack.slice(0, 80));
  assert.equal(panelOfType(board, "notes").text, attack);

  const roundtrip = dm.parseBackup(dm.exportBackup(board), "2024");
  assert.equal(panelOfType(roundtrip, "notes").text, attack);
  const fakeNode = { textContent: "" };
  dm.writeText(fakeNode, attack);
  assert.equal(fakeNode.textContent, attack);
  assert.equal(globalThis.pwned, undefined);
});

test("malformed and prototype-polluted imports reject atomically", () => {
  const storage = new MemoryStorage();
  let prior = dm.createDefaultBoard("2024");
  prior = dm.renameTab(prior, prior.activeTabId, "不可遺失");
  dm.saveBoard(storage, prior);
  const key = dm.storageKey("2024");
  const before = storage.getItem(key);

  assert.throws(() => dm.importBackup(storage, "{not json", "2024"), /無法解析/);
  assert.equal(storage.getItem(key), before);

  const wrongEdition = dm.exportBackup(dm.createDefaultBoard("2014"));
  assert.throws(() => dm.importBackup(storage, wrongEdition, "2024"), /版本.*不同/);
  assert.equal(storage.getItem(key), before);

  const pollutedBackup = JSON.parse(dm.exportBackup(prior));
  Object.defineProperty(pollutedBackup.board, "__proto__", {
    value: { polluted: true },
    enumerable: true,
    configurable: true
  });
  assert.throws(() => dm.importBackup(storage, JSON.stringify(pollutedBackup), "2024"), /不安全/);
  assert.equal(storage.getItem(key), before);
  assert.equal(Object.prototype.polluted, undefined);

  const constructorBackup = JSON.parse(dm.exportBackup(prior));
  constructorBackup.board.constructor = { prototype: { polluted: true } };
  assert.throws(() => dm.importBackup(storage, JSON.stringify(constructorBackup), "2024"), /不安全/);
  assert.equal(storage.getItem(key), before);

  const inherited = Object.assign(Object.create({ polluted: true }), prior);
  assert.throws(() => dm.assertValidBoard(inherited), /原型不安全/);
  assert.equal(storage.getItem(key), before);

  const oversized = "x".repeat(dm.MAX_BACKUP_BYTES + 1);
  assert.throws(() => dm.importBackup(storage, oversized, "2024"), /超過/);
  assert.equal(storage.getItem(key), before);
  assert.equal(dm.loadBoard(storage, "2024").tabs[0].title, "不可遺失");
});

test("reference identities stay canonical across source reordering and backup", () => {
  const ids = [
    dm.makeReferenceId("spell2024", "fireball"),
    dm.makeReferenceId("spell2014", "Mordenkainen's Magnificent Mansion"),
    dm.makeReferenceId("creature2024", "giant-fly|xdmg")
  ];
  assert.equal(dm.parseReferenceId(ids[0]).canonicalId, "fireball");
  assert.equal(dm.parseReferenceId(ids[1]).canonicalId, "Mordenkainen's Magnificent Mansion");
  assert.equal(dm.parseReferenceId(ids[2]).canonicalId, "giant-fly|xdmg");
  const source = ["other-spell", "fireball"];
  assert.equal(source.find((id) => dm.makeReferenceId("spell2024", id) === ids[0]), "fireball");
  assert.equal(source.reverse().find((id) => dm.makeReferenceId("spell2024", id) === ids[0]), "fireball");
  let board = dm.createDefaultBoard("2024");
  board = dm.addPanel(board, board.activeTabId, "spell");
  const spell = panelOfType(board, "spell");
  board = dm.updateReference(board, board.activeTabId, spell.id, { selectedId: ids[0] });
  assert.equal(panelOfType(dm.parseBackup(dm.exportBackup(board), "2024"), "spell").selectedId, ids[0]);
  const before = JSON.stringify(board);
  assert.throws(() => dm.updateReference(board, board.activeTabId, spell.id, { selectedId: "spell2024:%GG" }), /識別碼無效/);
  assert.equal(JSON.stringify(board), before);
});

test("2014 inline tags render as literal rule values without changing source", () => {
  const canonical = "造成{@dice 8d6}點傷害，升環額外{@scaledice 8d6|3-9|1d6}，命中{@hit +5}。";
  assert.equal(dm.format2014RuleText(canonical), "造成8d6點傷害，升環額外1d6，命中+5。");
  assert.ok(canonical.includes("{@dice 8d6}"), "source content must stay immutable");
});

test("all 2014 spell rules render without raw 5etools tokens", () => {
  const spells = require("../assets/data/spells-phb-2014.json").spell;
  const fragments = [];
  function collect(value) {
    if (typeof value === "string") {
      fragments.push(value);
    } else if (Array.isArray(value)) {
      value.forEach(collect);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  }
  for (const spell of spells) {
    collect(spell.entries);
    collect(spell.entriesHigherLevel);
  }
  assert.equal(spells.length, 361);
  assert(fragments.some((fragment) => fragment.includes("{@")), "expected upstream tagged examples");
  for (const fragment of fragments) {
    assert(!dm.format2014RuleText(fragment).includes("{@"),
      "unprocessed markup in canonical 2014 text: " + fragment.slice(0, 80));
  }
});

test("2024 spell, 2014 spell, and 2024 creature reference IDs are unique", () => {
  const fs = require("node:fs");
  const vm = require("node:vm");
  const source = { globalThis: {}, window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve("../assets/data/spells-phb-2024.js"), "utf8"), source);
  vm.runInNewContext(fs.readFileSync(require.resolve("../assets/data/creatures-5r.js"), "utf8"), source);
  const ids2024 = source.globalThis.SPELLS_2024_TUPLES.map((row) => dm.makeReferenceId("spell2024", row[0]));
  const ids2014 = require("../assets/data/spells-phb-2014.json").spell.map((row) =>
    dm.makeReferenceId("spell2014", row.ENG_name));
  const creatures = source.window.ZIZI_5R_CREATURES.map((row) => dm.makeReferenceId("creature2024", row.id));
  for (const [ids, expected] of [[ids2024, 391], [ids2014, 361], [creatures, 520]]) {
    assert.equal(ids.length, expected);
    assert.equal(new Set(ids).size, ids.length, "duplicate canonical reference identity");
  }
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log("PASS", name);
  } catch (error) {
    console.error("FAIL", name);
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  }
}

if (process.exitCode) {
  console.error(`FAIL ${passed}/${tests.length} tests passed`);
} else {
  console.log(`PASS ${passed}/${tests.length} tests passed`);
}

// Opt-in real-browser regression. The ordinary Node gate has no Playwright dependency;
// review/release QA enables this using DM_SCREEN_BROWSER_URL and NODE_PATH.
if (process.env.DM_SCREEN_BROWSER_URL) {
  (async function browserRegression() {
    const { chromium } = require("playwright");
    const executablePath = process.env.DM_SCREEN_CHROMIUM_EXECUTABLE || undefined;
    const browser = await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {})
    });
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(process.env.DM_SCREEN_BROWSER_URL, { waitUntil: "load" });

      const text = "尚未點選儲存的臨時 DM 筆記";
      await page.locator("#board-panels textarea").first().fill(text);
      await page.locator("#panel-type").selectOption("spell");
      await page.locator("#add-panel-button").click();
      const spellPanel = page.locator(".panel-card--reference").last();
      await spellPanel.locator("input[id^=reference-query]").fill("Fireball");
      await spellPanel.getByRole("button", { name: "搜尋", exact: true }).click();
      await spellPanel.locator(".search-results button").filter({ hasText: /^火球術.*Fireball/ }).first().click();
      assert.equal(await spellPanel.locator(".reference-detail h3").innerText(), "火球術");

      await page.evaluate(() => globalThis.SPELLS_2024_TUPLES.reverse());
      await page.locator("#panel-type").selectOption("notes");
      await page.locator("#add-panel-button").click();
      assert.equal(await spellPanel.locator(".reference-detail h3").innerText(), "火球術",
        "reordered canonical source changed saved spell identity");
      assert.equal(await page.locator("#board-panels textarea").first().inputValue(), text,
        "uncommitted notes disappeared after another panel rendered");

      await page.locator("#edition-select").selectOption("2014");
      await page.locator("#panel-type").selectOption("spell");
      await page.locator("#add-panel-button").click();
      const oldSpellPanel = page.locator(".panel-card--reference").last();
      await oldSpellPanel.locator("input[id^=reference-query]").fill("Fireball");
      await oldSpellPanel.getByRole("button", { name: "搜尋", exact: true }).click();
      await oldSpellPanel.locator(".search-results button").filter({ hasText: /^火球術.*Fireball/ }).first().click();
      assert.equal(await oldSpellPanel.locator(".reference-detail h3").innerText(), "火球術");
      const text2014 = await oldSpellPanel.locator(".reference-detail").innerText();
      assert(!text2014.includes("{@"), "raw source markup leaked into 2014 visible rules");
      assert(/學派\s+塑能/.test(text2014), "school code was not localized");

      const layout = await page.evaluate(() => {
        const node = document.querySelector(".reference-detail .canonical-value");
        const style = getComputedStyle(node);
        return { font: parseFloat(style.fontSize), line: parseFloat(style.lineHeight),
          family: style.fontFamily, width: document.documentElement.scrollWidth, viewport: innerWidth };
      });
      assert(layout.font >= 15 && layout.line / layout.font >= 1.75,
        "canonical body size/line height below minimum");
      assert(/sans/i.test(layout.family), "canonical long text is not sans serif");
      assert(layout.width <= layout.viewport + 1, "2014 long rule overflowed the viewport");

      await page.locator("#edition-select").selectOption("2024");
      assert.equal(await page.locator("#board-panels textarea").first().inputValue(), text,
        "notes not persisted when switching editions without pressing Save");

      // Real DM encounter use: touch targets must remain usable with row actions.
      await page.locator("#panel-type").selectOption("initiative");
      await page.locator("#add-panel-button").click();
      const initiative = page.locator(".panel-card:has(.initiative-form)").last();
      const form = initiative.locator("form.initiative-form");
      await form.locator('input[type="text"]').fill("DM 模擬怪物");
      await form.locator('input[type="number"]').fill("17");
      await form.getByRole("button", { name: "加入先攻" }).click();
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        const dimensions = await page.evaluate(() => {
          const visibleButtons = [...document.querySelectorAll("button:not(:disabled)")];
          const small = visibleButtons.filter((button) => {
            const rect = button.getBoundingClientRect();
            return rect.height < 43.5 || rect.width < 43.5;
          }).map((button) => button.textContent.trim());
          return { viewport: innerWidth, document: document.documentElement.scrollWidth,
            small, initiativeWidth: document.querySelector(".panel-card:has(.initiative-toolbar)").getBoundingClientRect().width };
        });
        assert.equal(dimensions.document <= dimensions.viewport + 1, true,
          "board overflowed viewport at " + width);
        assert.deepEqual(dimensions.small, [], "undersized combat touch targets at " + width);
        if (width >= 768) {
          assert(dimensions.initiativeWidth >= Math.min(700, width * .7),
            "combat encounter board too narrow at " + width);
        }
      }

      assert.deepEqual(errors, [], "browser page errors");
      console.log("PASS browser stable canonical ID, draft notes, edition isolation, readable 2014 rules");
      await context.close();
    } finally {
      await browser.close();
    }
  })().catch((error) => {
    console.error("FAIL browser DM Screen regression", error.stack || error);
    process.exitCode = 1;
  });
}

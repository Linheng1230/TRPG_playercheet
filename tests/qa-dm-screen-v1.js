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
  board = dm.updateReference(board, newTabId, spell.id, { query: "shield", selectedId: "spell2024:12" });
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

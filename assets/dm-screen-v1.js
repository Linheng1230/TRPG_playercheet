(function (root, factory) {
  "use strict";

  const api = factory(root);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.DM_SCREEN_V1 = api;
  }

  if (root && root.document) {
    root.addEventListener("DOMContentLoaded", function () {
      api.initApp(root.document);
    }, { once: true });
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const SCHEMA_VERSION = 1;
  const BACKUP_FORMAT = "zizi-dm-screen-v1";
  const MAX_BACKUP_BYTES = 1024 * 1024;
  const MAX_TABS = 50;
  const MAX_PANELS_PER_TAB = 100;
  const MAX_INITIATIVE_ENTRIES = 500;
  const MAX_NOTE_LENGTH = 200000;
  const MAX_TOTAL_TEXT = 800000;
  const MAX_TREE_NODES = 20000;
  const EDITIONS = Object.freeze(["2024", "2014"]);
  const PANEL_TYPES = Object.freeze(["notes", "initiative", "spell", "creature"]);
  const STORAGE_PREFIX = "zizi.dm-screen.v1";
  const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
  // Spell school display codes match the existing index.html school filter.
  const SCHOOL_LABELS = Object.freeze({ A: "防護", C: "咒法", D: "預言", E: "惑控", V: "塑能", I: "幻術", N: "死靈", T: "變化" });
  const PANEL_LABELS = Object.freeze({
    notes: "筆記",
    initiative: "先攻",
    spell: "法術速查",
    creature: "生物速查"
  });
  let idCounter = 0;

  function fail(message) {
    throw new Error(message);
  }

  function assertEdition(edition) {
    if (!EDITIONS.includes(edition)) {
      fail("不支援的規則版本。");
    }
    return edition;
  }

  function byteLength(value) {
    const text = String(value);
    if (typeof TextEncoder !== "undefined") {
      return new TextEncoder().encode(text).length;
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.byteLength(text, "utf8");
    }
    return unescape(encodeURIComponent(text)).length;
  }

  function assertSafeTree(value) {
    const seen = new WeakSet();
    const budget = { nodes: 0, text: 0 };

    function visit(item) {
      budget.nodes += 1;
      if (budget.nodes > MAX_TREE_NODES) {
        fail("資料結構過大。");
      }

      if (typeof item === "string") {
        budget.text += byteLength(item);
        if (budget.text > MAX_TOTAL_TEXT) {
          fail("文字資料過大。");
        }
        return;
      }

      if (item === null || typeof item === "boolean" || typeof item === "number") {
        return;
      }

      if (typeof item !== "object") {
        fail("資料包含不支援的值。");
      }

      if (seen.has(item)) {
        fail("資料不可包含循環參照。");
      }
      seen.add(item);

      if (Array.isArray(item)) {
        if (Object.getPrototypeOf(item) !== Array.prototype) {
          fail("資料陣列原型不安全。");
        }
        for (const key of Reflect.ownKeys(item)) {
          if (typeof key !== "string" || FORBIDDEN_KEYS.has(key) || (key !== "length" && !/^(0|[1-9]\d*)$/.test(key))) {
            fail("資料陣列包含不安全的物件鍵。");
          }
        }
        for (const child of item) {
          visit(child);
        }
        return;
      }

      if (Object.getPrototypeOf(item) !== Object.prototype) {
        fail("資料物件原型不安全。");
      }

      for (const key of Reflect.ownKeys(item)) {
        if (typeof key !== "string" || FORBIDDEN_KEYS.has(key)) {
          fail("資料包含不安全的物件鍵。");
        }
        visit(item[key]);
      }
    }

    visit(value);
    return true;
  }

  function assertExactKeys(value, keys, label) {
    const allowed = new Set(keys);
    const actual = Reflect.ownKeys(value);
    if (actual.length !== allowed.size || actual.some(function (key) { return typeof key !== "string" || !allowed.has(key); })) {
      fail(label + "欄位不符規格。");
    }
  }

  function assertId(value, label) {
    if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(value)) {
      fail(label + "識別碼無效。");
    }
  }

  function assertString(value, label, maximum, allowEmpty) {
    if (typeof value !== "string" || value.length > maximum || (!allowEmpty && value.trim().length === 0)) {
      fail(label + "文字無效。");
    }
  }

  function assertNullableId(value, label) {
    if (value !== null) {
      assertId(value, label);
    }
  }

  // A reference uses a canonical identity, never a mutable array position.
  function makeReferenceId(kind, canonicalId) {
    if (!["spell2024", "spell2014", "creature2024"].includes(kind) ||
        typeof canonicalId !== "string" || !canonicalId || canonicalId.length > 120) {
      fail("canonical 速查識別碼無效。");
    }
    const value = kind + ":" + encodeURIComponent(canonicalId);
    assertNullableReferenceId(value, "速查項目");
    return value;
  }

  function parseReferenceId(value) {
    if (typeof value !== "string" ||
        !/^(?:spell2024|spell2014|creature2024):[A-Za-z0-9._~!%'()*-]{1,180}$/.test(value)) {
      return null;
    }
    const divider = value.indexOf(":");
    const encoded = value.slice(divider + 1);
    try {
      const canonicalId = decodeURIComponent(encoded);
      if (!canonicalId || canonicalId.length > 120 || encodeURIComponent(canonicalId) !== encoded) {
        return null;
      }
      return { kind: value.slice(0, divider), canonicalId: canonicalId };
    } catch (_) {
      return null;
    }
  }

  function assertNullableReferenceId(value, label) {
    if (value !== null && !parseReferenceId(value)) {
      fail(label + "識別碼無效。");
    }
  }

  function makeId(prefix) {
    idCounter += 1;
    if (root && root.crypto && typeof root.crypto.randomUUID === "function") {
      return prefix + "-" + root.crypto.randomUUID();
    }
    return prefix + "-" + Date.now().toString(36) + "-" + idCounter.toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function createPanel(type, title) {
    if (!PANEL_TYPES.includes(type)) {
      fail("不支援的面板類型。");
    }

    const panel = {
      id: makeId("panel"),
      type: type,
      title: typeof title === "string" && title.trim() ? title.trim().slice(0, 80) : PANEL_LABELS[type]
    };

    if (type === "notes") {
      panel.text = "";
    } else if (type === "initiative") {
      panel.entries = [];
      panel.activeEntryId = null;
      panel.round = 1;
    } else {
      panel.query = "";
      panel.selectedId = null;
    }

    return panel;
  }

  function createDefaultBoard(edition) {
    assertEdition(edition);
    const tabId = makeId("tab");
    return {
      schemaVersion: SCHEMA_VERSION,
      edition: edition,
      activeTabId: tabId,
      tabs: [{
        id: tabId,
        title: "主要冒險",
        panels: [createPanel("notes")]
      }]
    };
  }

  function assertInitiativePanel(panel) {
    assertExactKeys(panel, ["id", "type", "title", "entries", "activeEntryId", "round"], "先攻面板");
    if (!Array.isArray(panel.entries) || panel.entries.length > MAX_INITIATIVE_ENTRIES) {
      fail("先攻項目數量無效。");
    }
    if (!Number.isSafeInteger(panel.round) || panel.round < 1 || panel.round > 999999) {
      fail("先攻輪數無效。");
    }
    assertNullableId(panel.activeEntryId, "目前先攻");

    const entryIds = new Set();
    for (const entry of panel.entries) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        fail("先攻項目格式無效。");
      }
      assertExactKeys(entry, ["id", "name", "value"], "先攻項目");
      assertId(entry.id, "先攻項目");
      assertString(entry.name, "先攻名稱", 120, false);
      if (typeof entry.value !== "number" || !Number.isFinite(entry.value) || entry.value < -9999 || entry.value > 9999) {
        fail("先攻值無效。");
      }
      if (entryIds.has(entry.id)) {
        fail("先攻項目識別碼重複。");
      }
      entryIds.add(entry.id);
    }

    if (panel.activeEntryId !== null && !entryIds.has(panel.activeEntryId)) {
      fail("目前先攻項目不存在。");
    }
  }

  function assertPanel(panel) {
    if (!panel || typeof panel !== "object" || Array.isArray(panel)) {
      fail("面板格式無效。");
    }
    assertId(panel.id, "面板");
    assertString(panel.title, "面板標題", 80, false);
    if (!PANEL_TYPES.includes(panel.type)) {
      fail("面板類型無效。");
    }

    if (panel.type === "notes") {
      assertExactKeys(panel, ["id", "type", "title", "text"], "筆記面板");
      assertString(panel.text, "筆記", MAX_NOTE_LENGTH, true);
    } else if (panel.type === "initiative") {
      assertInitiativePanel(panel);
    } else {
      assertExactKeys(panel, ["id", "type", "title", "query", "selectedId"], "速查面板");
      assertString(panel.query, "搜尋文字", 200, true);
      assertNullableReferenceId(panel.selectedId, "速查項目");
    }
  }

  function assertValidBoard(board, expectedEdition) {
    assertSafeTree(board);
    if (!board || typeof board !== "object" || Array.isArray(board)) {
      fail("看板格式無效。");
    }
    assertExactKeys(board, ["schemaVersion", "edition", "activeTabId", "tabs"], "看板");
    if (board.schemaVersion !== SCHEMA_VERSION) {
      fail("看板版本不相容。");
    }
    assertEdition(board.edition);
    if (expectedEdition !== undefined && board.edition !== assertEdition(expectedEdition)) {
      fail("備份的規則版本與目前版本不同。");
    }
    assertId(board.activeTabId, "目前分頁");
    if (!Array.isArray(board.tabs) || board.tabs.length < 1 || board.tabs.length > MAX_TABS) {
      fail("分頁數量無效。");
    }

    const tabIds = new Set();
    const panelIds = new Set();
    for (const tab of board.tabs) {
      if (!tab || typeof tab !== "object" || Array.isArray(tab)) {
        fail("分頁格式無效。");
      }
      assertExactKeys(tab, ["id", "title", "panels"], "分頁");
      assertId(tab.id, "分頁");
      assertString(tab.title, "分頁名稱", 80, false);
      if (tabIds.has(tab.id)) {
        fail("分頁識別碼重複。");
      }
      tabIds.add(tab.id);
      if (!Array.isArray(tab.panels) || tab.panels.length > MAX_PANELS_PER_TAB) {
        fail("面板數量無效。");
      }
      for (const panel of tab.panels) {
        assertPanel(panel);
        if (panelIds.has(panel.id)) {
          fail("面板識別碼重複。");
        }
        panelIds.add(panel.id);
      }
    }

    if (!tabIds.has(board.activeTabId)) {
      fail("目前分頁不存在。");
    }
    return true;
  }

  function cloneBoard(board) {
    assertValidBoard(board);
    return JSON.parse(JSON.stringify(board));
  }

  function updateBoard(board, updater) {
    const next = cloneBoard(board);
    updater(next);
    assertValidBoard(next);
    return next;
  }

  function findTab(board, tabId) {
    const tab = board.tabs.find(function (candidate) { return candidate.id === tabId; });
    if (!tab) {
      fail("找不到指定分頁。");
    }
    return tab;
  }

  function findPanel(board, tabId, panelId, expectedType) {
    const tab = findTab(board, tabId);
    const panel = tab.panels.find(function (candidate) { return candidate.id === panelId; });
    if (!panel) {
      fail("找不到指定面板。");
    }
    if (expectedType && panel.type !== expectedType) {
      fail("面板類型不符。");
    }
    return panel;
  }

  function createTab(board, title) {
    assertString(title, "分頁名稱", 80, false);
    return updateBoard(board, function (next) {
      if (next.tabs.length >= MAX_TABS) {
        fail("分頁已達上限。");
      }
      const id = makeId("tab");
      next.tabs.push({ id: id, title: title.trim(), panels: [] });
      next.activeTabId = id;
    });
  }

  function renameTab(board, tabId, title) {
    assertString(title, "分頁名稱", 80, false);
    return updateBoard(board, function (next) {
      findTab(next, tabId).title = title.trim();
    });
  }

  function deleteTab(board, tabId) {
    return updateBoard(board, function (next) {
      if (next.tabs.length === 1) {
        fail("至少要保留一個分頁。");
      }
      const index = next.tabs.findIndex(function (tab) { return tab.id === tabId; });
      if (index < 0) {
        fail("找不到指定分頁。");
      }
      next.tabs.splice(index, 1);
      if (next.activeTabId === tabId) {
        next.activeTabId = next.tabs[Math.min(index, next.tabs.length - 1)].id;
      }
    });
  }

  function switchTab(board, tabId) {
    return updateBoard(board, function (next) {
      findTab(next, tabId);
      next.activeTabId = tabId;
    });
  }

  function addPanel(board, tabId, type, title) {
    return updateBoard(board, function (next) {
      const tab = findTab(next, tabId);
      if (tab.panels.length >= MAX_PANELS_PER_TAB) {
        fail("這個分頁的面板已達上限。");
      }
      tab.panels.push(createPanel(type, title));
    });
  }

  function setPanelTitle(board, tabId, panelId, title) {
    assertString(title, "面板標題", 80, false);
    return updateBoard(board, function (next) {
      findPanel(next, tabId, panelId).title = title.trim();
    });
  }

  function deletePanel(board, tabId, panelId) {
    return updateBoard(board, function (next) {
      const tab = findTab(next, tabId);
      const index = tab.panels.findIndex(function (panel) { return panel.id === panelId; });
      if (index < 0) {
        fail("找不到指定面板。");
      }
      tab.panels.splice(index, 1);
    });
  }

  function movePanel(board, tabId, panelId, direction) {
    if (direction !== "up" && direction !== "down") {
      fail("面板移動方向無效。");
    }
    return updateBoard(board, function (next) {
      const panels = findTab(next, tabId).panels;
      const index = panels.findIndex(function (panel) { return panel.id === panelId; });
      if (index < 0) {
        fail("找不到指定面板。");
      }
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= panels.length) {
        return;
      }
      const moved = panels.splice(index, 1)[0];
      panels.splice(target, 0, moved);
    });
  }

  function updateNotes(board, tabId, panelId, text) {
    assertString(text, "筆記", MAX_NOTE_LENGTH, true);
    return updateBoard(board, function (next) {
      findPanel(next, tabId, panelId, "notes").text = text;
    });
  }

  function updateReference(board, tabId, panelId, changes) {
    if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
      fail("速查變更格式無效。");
    }
    assertSafeTree(changes);
    const allowed = new Set(["query", "selectedId"]);
    if (Object.keys(changes).some(function (key) { return !allowed.has(key); })) {
      fail("速查變更欄位無效。");
    }
    if (Object.prototype.hasOwnProperty.call(changes, "query")) {
      assertString(changes.query, "搜尋文字", 200, true);
    }
    if (Object.prototype.hasOwnProperty.call(changes, "selectedId")) {
      assertNullableReferenceId(changes.selectedId, "速查項目");
    }
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId);
      if (panel.type !== "spell" && panel.type !== "creature") {
        fail("這不是速查面板。");
      }
      if (Object.prototype.hasOwnProperty.call(changes, "query")) {
        panel.query = changes.query;
      }
      if (Object.prototype.hasOwnProperty.call(changes, "selectedId")) {
        panel.selectedId = changes.selectedId;
      }
    });
  }

  function parseInitiativeValue(value) {
    const parsed = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(parsed) || parsed < -9999 || parsed > 9999) {
      fail("先攻值必須是 -9999 到 9999 之間的數字。");
    }
    return parsed;
  }

  function addInitiativeEntry(board, tabId, panelId, name, value) {
    assertString(name, "先攻名稱", 120, false);
    const parsedValue = parseInitiativeValue(value);
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId, "initiative");
      if (panel.entries.length >= MAX_INITIATIVE_ENTRIES) {
        fail("先攻項目已達上限。");
      }
      panel.entries.push({
        id: makeId("turn"),
        name: name.trim(),
        value: parsedValue
      });
    });
  }

  function editInitiativeEntry(board, tabId, panelId, entryId, name, value) {
    assertString(name, "先攻名稱", 120, false);
    const parsedValue = parseInitiativeValue(value);
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId, "initiative");
      const entry = panel.entries.find(function (candidate) { return candidate.id === entryId; });
      if (!entry) {
        fail("找不到指定先攻項目。");
      }
      entry.name = name.trim();
      entry.value = parsedValue;
    });
  }

  function sortInitiative(board, tabId, panelId) {
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId, "initiative");
      panel.entries = panel.entries
        .map(function (entry, index) { return { entry: entry, index: index }; })
        .sort(function (left, right) { return right.entry.value - left.entry.value || left.index - right.index; })
        .map(function (item) { return item.entry; });
    });
  }

  function selectInitiative(board, tabId, panelId, entryId) {
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId, "initiative");
      if (!panel.entries.some(function (entry) { return entry.id === entryId; })) {
        fail("找不到指定先攻項目。");
      }
      panel.activeEntryId = entryId;
    });
  }

  function nextInitiative(board, tabId, panelId) {
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId, "initiative");
      if (panel.entries.length === 0) {
        panel.activeEntryId = null;
        return;
      }
      const index = panel.entries.findIndex(function (entry) { return entry.id === panel.activeEntryId; });
      if (index < 0) {
        panel.activeEntryId = panel.entries[0].id;
        return;
      }
      if (index === panel.entries.length - 1) {
        panel.activeEntryId = panel.entries[0].id;
        panel.round = Math.min(999999, panel.round + 1);
      } else {
        panel.activeEntryId = panel.entries[index + 1].id;
      }
    });
  }

  function removeInitiativeEntry(board, tabId, panelId, entryId) {
    return updateBoard(board, function (next) {
      const panel = findPanel(next, tabId, panelId, "initiative");
      const index = panel.entries.findIndex(function (entry) { return entry.id === entryId; });
      if (index < 0) {
        fail("找不到指定先攻項目。");
      }
      const wasActive = panel.activeEntryId === entryId;
      panel.entries.splice(index, 1);
      if (wasActive) {
        panel.activeEntryId = panel.entries.length ? panel.entries[Math.min(index, panel.entries.length - 1)].id : null;
      }
    });
  }

  function storageKey(edition) {
    return STORAGE_PREFIX + "." + assertEdition(edition) + ".board";
  }

  function requireStorage(storage) {
    const selected = storage || (root && root.localStorage);
    if (!selected || typeof selected.getItem !== "function" || typeof selected.setItem !== "function") {
      fail("瀏覽器儲存空間不可用。");
    }
    return selected;
  }

  function saveBoard(storage, board) {
    assertValidBoard(board);
    const serialized = JSON.stringify(board);
    if (byteLength(serialized) > MAX_BACKUP_BYTES) {
      fail("看板資料超過 1 MiB 上限。");
    }
    requireStorage(storage).setItem(storageKey(board.edition), serialized);
    return board;
  }

  function loadBoard(storage, edition) {
    assertEdition(edition);
    const serialized = requireStorage(storage).getItem(storageKey(edition));
    if (serialized === null) {
      return createDefaultBoard(edition);
    }
    if (byteLength(serialized) > MAX_BACKUP_BYTES) {
      fail("已儲存的看板資料過大。");
    }
    let board;
    try {
      board = JSON.parse(serialized);
    } catch (error) {
      fail("已儲存的看板 JSON 無法解析。");
    }
    assertValidBoard(board, edition);
    return board;
  }

  function exportBackup(board, exportedAt) {
    assertValidBoard(board);
    const timestamp = exportedAt || new Date().toISOString();
    assertString(timestamp, "匯出時間", 64, false);
    const backup = {
      format: BACKUP_FORMAT,
      schemaVersion: SCHEMA_VERSION,
      edition: board.edition,
      exportedAt: timestamp,
      board: cloneBoard(board)
    };
    const serialized = JSON.stringify(backup, null, 2);
    if (byteLength(serialized) > MAX_BACKUP_BYTES) {
      fail("備份超過 1 MiB 上限。");
    }
    return serialized;
  }

  function parseBackup(serialized, expectedEdition) {
    if (typeof serialized !== "string" || byteLength(serialized) > MAX_BACKUP_BYTES) {
      fail("備份檔無效或超過 1 MiB 上限。");
    }
    let backup;
    try {
      backup = JSON.parse(serialized);
    } catch (error) {
      fail("備份 JSON 無法解析。");
    }
    assertSafeTree(backup);
    if (!backup || typeof backup !== "object" || Array.isArray(backup)) {
      fail("備份格式無效。");
    }
    assertExactKeys(backup, ["format", "schemaVersion", "edition", "exportedAt", "board"], "備份");
    if (backup.format !== BACKUP_FORMAT || backup.schemaVersion !== SCHEMA_VERSION) {
      fail("備份版本不相容。");
    }
    assertEdition(backup.edition);
    assertString(backup.exportedAt, "匯出時間", 64, false);
    if (expectedEdition !== undefined && backup.edition !== assertEdition(expectedEdition)) {
      fail("備份的規則版本與目前版本不同。");
    }
    assertValidBoard(backup.board, backup.edition);
    return cloneBoard(backup.board);
  }

  function importBackup(storage, serialized, edition) {
    const board = parseBackup(serialized, edition);
    saveBoard(storage, board);
    return board;
  }

  function format2014RuleText(value) {
    return String(value)
      .replace(/\{@([a-z][a-z0-9]*)\s+([^{}]+)\}/gi, function (_match, tag, payload) {
        const parts = payload.split("|");
        if (tag === "scaledice" || tag === "scaledamage") {
          return parts[2] || parts[0];
        }
        if (tag === "chance" && parts[1]) {
          return parts[1];
        }
        return parts[0];
      })
      .replace(/\{@h\}/gi, "命中：");
  }

  function writeText(node, value) {
    if (!node || !("textContent" in node)) {
      fail("文字輸出目標無效。");
    }
    node.textContent = value === null || value === undefined ? "" : String(value);
    return node;
  }

  function initApp(document) {
    if (!document || !document.getElementById("dm-screen-app")) {
      return null;
    }
    return createBrowserApp(document);
  }

  const api = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    BACKUP_FORMAT: BACKUP_FORMAT,
    MAX_BACKUP_BYTES: MAX_BACKUP_BYTES,
    EDITIONS: EDITIONS,
    PANEL_TYPES: PANEL_TYPES,
    PANEL_LABELS: PANEL_LABELS,
    assertSafeTree: assertSafeTree,
    assertValidBoard: assertValidBoard,
    createDefaultBoard: createDefaultBoard,
    createTab: createTab,
    renameTab: renameTab,
    deleteTab: deleteTab,
    switchTab: switchTab,
    addPanel: addPanel,
    setPanelTitle: setPanelTitle,
    deletePanel: deletePanel,
    movePanel: movePanel,
    updateNotes: updateNotes,
    updateReference: updateReference,
    makeReferenceId: makeReferenceId,
    parseReferenceId: parseReferenceId,
    addInitiativeEntry: addInitiativeEntry,
    editInitiativeEntry: editInitiativeEntry,
    sortInitiative: sortInitiative,
    selectInitiative: selectInitiative,
    nextInitiative: nextInitiative,
    removeInitiativeEntry: removeInitiativeEntry,
    storageKey: storageKey,
    saveBoard: saveBoard,
    loadBoard: loadBoard,
    exportBackup: exportBackup,
    parseBackup: parseBackup,
    importBackup: importBackup,
    writeText: writeText,
    format2014RuleText: format2014RuleText,
    initApp: initApp
  };

  return api;

  function createBrowserApp(document) {
    const elements = {
      edition: document.getElementById("edition-select"),
      exportButton: document.getElementById("export-button"),
      importFile: document.getElementById("import-file"),
      addTab: document.getElementById("add-tab-button"),
      tabs: document.getElementById("tabs-list"),
      activeTabTitle: document.getElementById("active-tab-title"),
      renameTab: document.getElementById("rename-tab-button"),
      deleteTab: document.getElementById("delete-tab-button"),
      panelType: document.getElementById("panel-type"),
      addPanel: document.getElementById("add-panel-button"),
      board: document.getElementById("board-panels"),
      emptyBoard: document.getElementById("empty-board"),
      status: document.getElementById("app-status")
    };
    const storage = root.localStorage;
    const lockedEditions = new Set();
    let statusTimer = null;
    let notesDirty = false;
    let spells2014 = null;
    let spells2014Error = null;
    let spells2014Promise = null;
    let board = loadEdition("2024");

    elements.edition.value = board.edition;
    bindStaticEvents();
    root.addEventListener("pagehide", function () {
      try { flushNotesDraft(); } catch (_) { /* Keep the last valid saved board. */ }
    });
    render();

    return {
      getBoard: function () { return cloneBoard(board); },
      render: render
    };

    function createElement(tagName, className, textValue) {
      const node = document.createElement(tagName);
      if (className) {
        node.className = className;
      }
      if (textValue !== undefined) {
        writeText(node, textValue);
      }
      return node;
    }

    function createButton(label, className, handler) {
      const button = createElement("button", className, label);
      button.type = "button";
      if (handler) {
        button.addEventListener("click", handler);
      }
      return button;
    }

    function announce(message, isError) {
      if (statusTimer !== null) {
        root.clearTimeout(statusTimer);
      }
      writeText(elements.status, message);
      elements.status.classList.toggle("is-error", Boolean(isError));
      elements.status.classList.add("is-visible");
      statusTimer = root.setTimeout(function () {
        elements.status.classList.remove("is-visible");
      }, isError ? 7000 : 3500);
    }

    function flushNotesDraft() {
      if (!notesDirty) {
        return;
      }
      if (lockedEditions.has(board.edition)) {
        fail("目前規則版本的存檔已鎖定，請先匯入有效備份。");
      }
      saveBoard(storage, board);
      notesDirty = false;
    }

    function loadEdition(edition) {
      try {
        const loaded = loadBoard(storage, edition);
        lockedEditions.delete(edition);
        return loaded;
      } catch (error) {
        lockedEditions.add(edition);
        root.setTimeout(function () {
          announce("無法載入 " + edition + " 看板：" + error.message + " 原資料未被覆寫；可用有效備份取代。", true);
        }, 0);
        return createDefaultBoard(edition);
      }
    }

    function commit(nextBoard, successMessage) {
      try {
        if (lockedEditions.has(nextBoard.edition)) {
          fail("這個版本的既有資料無效，為避免覆寫，目前只接受匯入有效備份。");
        }
        saveBoard(storage, nextBoard);
        board = nextBoard;
        notesDirty = false;
        render();
        if (successMessage) {
          announce(successMessage, false);
        }
        return true;
      } catch (error) {
        announce(error.message, true);
        return false;
      }
    }

    function run(action) {
      try {
        action();
      } catch (error) {
        announce(error.message, true);
      }
    }

    function bindStaticEvents() {
      elements.edition.addEventListener("change", function () {
        run(function () {
          const edition = assertEdition(elements.edition.value);
          flushNotesDraft();
          board = loadEdition(edition);
          notesDirty = false;
          render();
          if (edition === "2014") {
            ensure2014Spells();
          }
          announce("已切換到 " + edition + " 規則；看板資料彼此獨立。", false);
        });
      });

      elements.addTab.addEventListener("click", function () {
        const ordinal = board.tabs.length + 1;
        if (commit(createTab(board, "新分頁 " + ordinal), "已新增分頁。")) {
          elements.activeTabTitle.focus();
          elements.activeTabTitle.select();
        }
      });

      elements.renameTab.addEventListener("click", function () {
        run(function () {
          commit(renameTab(board, board.activeTabId, elements.activeTabTitle.value), "分頁名稱已更新。 ");
        });
      });

      elements.activeTabTitle.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          elements.renameTab.click();
        }
      });

      elements.deleteTab.addEventListener("click", function () {
        run(function () {
          const tab = findTab(board, board.activeTabId);
          if (root.confirm("確定刪除分頁「" + tab.title + "」及其中所有面板？")) {
            commit(deleteTab(board, tab.id), "分頁已刪除。 ");
          }
        });
      });

      elements.addPanel.addEventListener("click", function () {
        run(function () {
          const type = elements.panelType.value;
          commit(addPanel(board, board.activeTabId, type), "已新增「" + PANEL_LABELS[type] + "」面板。 ");
        });
      });

      elements.exportButton.addEventListener("click", exportCurrentBoard);
      elements.importFile.addEventListener("change", importCurrentBoard);
    }

    function render() {
      elements.edition.value = board.edition;
      const activeTab = findTab(board, board.activeTabId);
      elements.activeTabTitle.value = activeTab.title;
      elements.deleteTab.disabled = board.tabs.length === 1;
      renderTabs();
      elements.board.replaceChildren();
      activeTab.panels.forEach(function (panel, index) {
        elements.board.appendChild(renderPanel(activeTab, panel, index));
      });
      elements.emptyBoard.hidden = activeTab.panels.length !== 0;
      if (board.edition === "2014") {
        ensure2014Spells();
      }
    }

    function renderTabs() {
      elements.tabs.replaceChildren();
      board.tabs.forEach(function (tab, index) {
        const selected = tab.id === board.activeTabId;
        const tabButton = createButton(tab.title, "tab-button", function () {
          if (!selected) {
            commit(switchTab(board, tab.id));
          }
        });
        tabButton.id = "tab-button-" + tab.id;
        tabButton.setAttribute("role", "tab");
        tabButton.setAttribute("aria-selected", String(selected));
        tabButton.setAttribute("aria-controls", "board-panels");
        tabButton.tabIndex = selected ? 0 : -1;
        tabButton.addEventListener("keydown", function (event) {
          let targetIndex = null;
          if (event.key === "ArrowLeft") {
            targetIndex = (index - 1 + board.tabs.length) % board.tabs.length;
          } else if (event.key === "ArrowRight") {
            targetIndex = (index + 1) % board.tabs.length;
          } else if (event.key === "Home") {
            targetIndex = 0;
          } else if (event.key === "End") {
            targetIndex = board.tabs.length - 1;
          }
          if (targetIndex !== null) {
            event.preventDefault();
            const targetId = board.tabs[targetIndex].id;
            if (commit(switchTab(board, targetId))) {
              const target = document.getElementById("tab-button-" + targetId);
              if (target) {
                target.focus();
              }
            }
          }
        });
        elements.tabs.appendChild(tabButton);
      });
    }

    function renderPanel(tab, panel, index) {
      const article = createElement("article", "panel-card" + (panel.type === "spell" || panel.type === "creature" ? " panel-card--reference" : ""));
      article.id = "panel-" + panel.id;
      article.setAttribute("aria-labelledby", "panel-title-" + panel.id);

      const header = createElement("header", "panel-header");
      header.appendChild(createElement("p", "panel-kind", PANEL_LABELS[panel.type]));
      const titleRow = createElement("div", "panel-title-row");
      const titleInput = createElement("input", "panel-title-input");
      titleInput.id = "panel-title-" + panel.id;
      titleInput.value = panel.title;
      titleInput.maxLength = 80;
      titleInput.setAttribute("aria-label", "面板標題");
      const saveTitle = createButton("儲存標題", "", function () {
        run(function () {
          commit(setPanelTitle(board, tab.id, panel.id, titleInput.value), "面板標題已更新。 ");
        });
      });
      titleInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          saveTitle.click();
        }
      });
      titleRow.append(titleInput, saveTitle);
      header.appendChild(titleRow);

      const actions = createElement("div", "panel-actions");
      const moveUp = createButton("上移", "", function () {
        commit(movePanel(board, tab.id, panel.id, "up"), "面板已上移。 ");
      });
      moveUp.disabled = index === 0;
      const moveDown = createButton("下移", "", function () {
        commit(movePanel(board, tab.id, panel.id, "down"), "面板已下移。 ");
      });
      moveDown.disabled = index === tab.panels.length - 1;
      const remove = createButton("刪除面板", "danger-action", function () {
        if (root.confirm("確定刪除面板「" + panel.title + "」？")) {
          commit(deletePanel(board, tab.id, panel.id), "面板已刪除。 ");
        }
      });
      actions.append(moveUp, moveDown, remove);
      header.appendChild(actions);
      article.appendChild(header);

      const body = createElement("div", "panel-body");
      if (panel.type === "notes") {
        renderNotes(body, tab, panel);
      } else if (panel.type === "initiative") {
        renderInitiative(body, tab, panel);
      } else if (panel.type === "spell") {
        renderSpellReference(body, tab, panel);
      } else {
        renderCreatureReference(body, tab, panel);
      }
      article.appendChild(body);
      return article;
    }

    function renderNotes(container, tab, panel) {
      const help = createElement("p", "panel-help", "只儲存純文字；不解析 HTML，也不會自動傳送到外部服務。 ");
      const label = createElement("label", "", "筆記內容");
      label.htmlFor = "notes-" + panel.id;
      const textarea = createElement("textarea");
      textarea.id = "notes-" + panel.id;
      textarea.maxLength = MAX_NOTE_LENGTH;
      textarea.value = panel.text;
      // Preserve the draft in the single board state immediately, without
      // cloning/serializing the entire board on every keystroke.
      textarea.addEventListener("input", function () {
        if (lockedEditions.has(board.edition)) {
          announce("存檔已鎖定；請先匯入有效備份。", true);
          return;
        }
        const livePanel = findPanel(board, tab.id, panel.id, "notes");
        livePanel.text = textarea.value;
        notesDirty = true;
      });
      textarea.addEventListener("change", function () {
        run(flushNotesDraft);
      });
      const actions = createElement("div", "notes-actions");
      const save = createButton("儲存筆記", "primary-action", function () {
        run(function () {
          commit(updateNotes(board, tab.id, panel.id, textarea.value), "筆記已儲存在本機。 ");
        });
      });
      textarea.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          save.click();
        }
      });
      actions.appendChild(save);
      container.append(help, label, textarea, actions);
    }

    function renderInitiative(container, tab, panel) {
      container.appendChild(createElement("p", "panel-help", "所有數值都由你手動輸入。本工具不擲骰、不結算戰鬥，也不改動任何角色存檔。 "));
      const toolbar = createElement("div", "initiative-toolbar");
      toolbar.appendChild(createElement("p", "initiative-round", "第 " + panel.round + " 輪"));
      const toolbarActions = createElement("div", "row-actions");
      toolbarActions.append(
        createButton("依數值排序", "", function () {
          commit(sortInitiative(board, tab.id, panel.id), "先攻已由高至低排序。 ");
        }),
        createButton("下一回合", "primary-action", function () {
          commit(nextInitiative(board, tab.id, panel.id), "已前進到下一回合。 ");
        })
      );
      toolbar.appendChild(toolbarActions);
      container.appendChild(toolbar);

      const form = createElement("form", "initiative-form");
      const nameGroup = createElement("div", "field-group");
      const nameLabel = createElement("label", "", "名稱");
      const nameInput = createElement("input");
      nameInput.type = "text";
      nameInput.maxLength = 120;
      nameInput.required = true;
      nameInput.autocomplete = "off";
      nameLabel.htmlFor = "initiative-name-" + panel.id;
      nameInput.id = "initiative-name-" + panel.id;
      nameGroup.append(nameLabel, nameInput);
      const valueGroup = createElement("div", "field-group");
      const valueLabel = createElement("label", "", "先攻值");
      const valueInput = createElement("input");
      valueInput.type = "number";
      valueInput.min = "-9999";
      valueInput.max = "9999";
      valueInput.step = "any";
      valueInput.required = true;
      valueLabel.htmlFor = "initiative-value-" + panel.id;
      valueInput.id = "initiative-value-" + panel.id;
      valueGroup.append(valueLabel, valueInput);
      const add = createButton("加入先攻", "primary-action");
      add.type = "submit";
      form.append(nameGroup, valueGroup, add);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        run(function () {
          commit(addInitiativeEntry(board, tab.id, panel.id, nameInput.value, valueInput.value), "已加入先攻；順序維持手動，必要時再排序。 ");
        });
      });
      container.appendChild(form);

      if (panel.entries.length === 0) {
        container.appendChild(createElement("p", "muted", "尚無先攻項目。 "));
        return;
      }

      const scroll = createElement("div", "table-scroll");
      const table = createElement("table", "initiative-list");
      const caption = createElement("caption", "muted", "手動先攻順序");
      const head = createElement("thead");
      const headRow = createElement("tr");
      ["名稱", "數值", "操作"].forEach(function (labelText) {
        headRow.appendChild(createElement("th", "", labelText));
      });
      head.appendChild(headRow);
      table.append(caption, head);
      const body = createElement("tbody");
      panel.entries.forEach(function (entry) {
        const row = createElement("tr");
        const active = panel.activeEntryId === entry.id;
        row.setAttribute("aria-current", String(active));
        const nameCell = createElement("td");
        const entryName = createElement("input");
        entryName.type = "text";
        entryName.maxLength = 120;
        entryName.value = entry.name;
        entryName.setAttribute("aria-label", entry.name + "的名稱");
        nameCell.appendChild(entryName);
        const valueCell = createElement("td");
        const entryValue = createElement("input");
        entryValue.type = "number";
        entryValue.min = "-9999";
        entryValue.max = "9999";
        entryValue.step = "any";
        entryValue.value = String(entry.value);
        entryValue.setAttribute("aria-label", entry.name + "的先攻值");
        valueCell.appendChild(entryValue);
        const actionCell = createElement("td");
        const entryActions = createElement("div", "row-actions");
        entryActions.append(
          createButton("儲存", "", function () {
            run(function () {
              commit(editInitiativeEntry(board, tab.id, panel.id, entry.id, entryName.value, entryValue.value), "先攻項目已更新。 ");
            });
          }),
          createButton(active ? "目前行動" : "設為目前", active ? "primary-action" : "", function () {
            commit(selectInitiative(board, tab.id, panel.id, entry.id), "已選取目前行動者。 ");
          }),
          createButton("移除", "danger-action", function () {
            commit(removeInitiativeEntry(board, tab.id, panel.id, entry.id), "先攻項目已移除。 ");
          })
        );
        actionCell.appendChild(entryActions);
        row.append(nameCell, valueCell, actionCell);
        body.appendChild(row);
      });
      table.appendChild(body);
      scroll.appendChild(table);
      container.appendChild(scroll);
    }

    function renderSpellReference(container, tab, panel) {
      renderReferenceShell(container, tab, panel, "搜尋法術中英文名稱", searchSpells, findSpell, renderSpellDetail);
    }

    function renderCreatureReference(container, tab, panel) {
      if (board.edition === "2014") {
        const unavailable = createElement("div", "unavailable");
        unavailable.appendChild(createElement("h3", "", "2014 生物資料不可用"));
        unavailable.appendChild(createElement("p", "", "目前沒有經驗證的 2014 生物來源，因此不會以 2024 資料替代。 "));
        container.appendChild(unavailable);
        return;
      }
      renderReferenceShell(container, tab, panel, "搜尋生物中英文名稱或 ID", searchCreatures, findCreature, renderCreatureDetail);
    }

    function renderReferenceShell(container, tab, panel, placeholder, searcher, finder, detailRenderer) {
      const form = createElement("form", "reference-search");
      const field = createElement("div", "field-group");
      const label = createElement("label", "", "搜尋");
      const input = createElement("input");
      input.type = "search";
      input.maxLength = 200;
      input.placeholder = placeholder;
      input.value = panel.query;
      input.id = "reference-query-" + panel.id;
      label.htmlFor = input.id;
      field.append(label, input);
      const submit = createButton("搜尋", "primary-action");
      submit.type = "submit";
      form.append(field, submit);
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        run(function () {
          commit(updateReference(board, tab.id, panel.id, { query: input.value }), "搜尋條件已儲存。 ");
        });
      });
      container.appendChild(form);

      if (panel.type === "spell" && board.edition === "2014" && !spells2014) {
        const message = spells2014Error ? "2014 法術資料載入失敗：" + spells2014Error : "正在載入 2014 法術資料……";
        container.appendChild(createElement("p", spells2014Error ? "unavailable" : "muted", message));
        return;
      }

      const results = searcher(panel.query);
      const layout = createElement("div", "reference-layout");
      const resultArea = createElement("div");
      const resultCount = createElement("p", "source-note", results.length === 50 ? "顯示前 50 筆結果，請輸入更多關鍵字縮小範圍。 " : "找到 " + results.length + " 筆。 ");
      const list = createElement("ul", "search-results");
      list.setAttribute("aria-label", "搜尋結果");
      if (results.length === 0) {
        const empty = createElement("li", "muted", "沒有符合項目。 ");
        list.appendChild(empty);
      } else {
        results.forEach(function (result) {
          const item = createElement("li");
          const select = createButton(result.label, "result-button", function () {
            run(function () {
              commit(updateReference(board, tab.id, panel.id, { selectedId: result.id }));
            });
          });
          select.setAttribute("aria-pressed", String(panel.selectedId === result.id));
          item.appendChild(select);
          list.appendChild(item);
        });
      }
      resultArea.append(resultCount, list);

      const detail = createElement("div", "reference-detail");
      const selected = panel.selectedId === null ? null : finder(panel.selectedId);
      if (selected) {
        detailRenderer(detail, selected);
      } else if (panel.selectedId !== null) {
        detail.appendChild(createElement("p", "unavailable", "先前選取的 canonical 項目已不存在，請重新選擇。 "));
      } else {
        detail.appendChild(createElement("p", "muted", "從搜尋結果選擇一筆，即可查看完整內容。 "));
      }
      layout.append(resultArea, detail);
      container.appendChild(layout);
    }

    function normalizeSearch(value) {
      return String(value || "").trim().toLocaleLowerCase("zh-Hant");
    }

    function searchSpells(query) {
      const needle = normalizeSearch(query);
      if (board.edition === "2024") {
        const tuples = Array.isArray(root.SPELLS_2024_TUPLES) ? root.SPELLS_2024_TUPLES : [];
        const results = [];
        for (let index = 0; index < tuples.length && results.length < 50; index += 1) {
          const tuple = tuples[index];
          const haystack = normalizeSearch([tuple[0], tuple[2], tuple[3]].join(" "));
          if (!needle || haystack.includes(needle)) {
            results.push({
              id: makeReferenceId("spell2024", String(tuple[0])),
              label: String(tuple[3] || tuple[2] || tuple[0]) + (tuple[2] && tuple[3] ? " / " + tuple[2] : "") + "（" + formatSpellLevel(tuple[4]) + "）",
              tuple: tuple
            });
          }
        }
        return results;
      }

      const records = spells2014 || [];
      const results = [];
      for (let index = 0; index < records.length && results.length < 50; index += 1) {
        const spell = records[index];
        const haystack = normalizeSearch([spell.name, spell.ENG_name].join(" "));
        if (!needle || haystack.includes(needle)) {
          results.push({
            id: makeReferenceId("spell2014", String(spell.ENG_name)),
            label: String(spell.name || spell.ENG_name || "未命名法術") + (spell.ENG_name && spell.ENG_name !== spell.name ? " / " + spell.ENG_name : "") + "（" + formatSpellLevel(spell.level) + "）",
            spell: spell
          });
        }
      }
      return results;
    }

    function findSpell(selectedId) {
      const reference = parseReferenceId(selectedId);
      if (!reference || reference.kind !== "spell" + board.edition) {
        return null;
      }
      if (board.edition === "2024") {
        const tuples = Array.isArray(root.SPELLS_2024_TUPLES) ? root.SPELLS_2024_TUPLES : [];
        const tuple = tuples.find(function (row) { return row[0] === reference.canonicalId; });
        return tuple ? { id: selectedId, tuple: tuple } : null;
      }
      const spell = spells2014 && spells2014.find(function (entry) {
        return entry.ENG_name === reference.canonicalId;
      });
      return spell ? { id: selectedId, spell: spell } : null;
    }

    function formatSpellLevel(level) {
      const numeric = Number(level);
      return numeric === 0 ? "戲法" : (Number.isFinite(numeric) ? numeric + " 環" : String(level || "等級未載明"));
    }

    function schoolLabel(value) {
      return SCHOOL_LABELS[value] || value;
    }

    function time2014(entries) {
      if (!Array.isArray(entries)) { return flattenCanonicalText(entries); }
      const units = { action: "動作", bonus: "附贈動作", reaction: "反應", minute: "分鐘", hour: "小時" };
      return entries.map(function (part) {
        const unit = units[part.unit] || part.unit;
        return String(part.number || 1) + " " + unit + (part.condition ? "（" + part.condition + "）" : "");
      }).join("／");
    }

    function range2014(range) {
      if (!range || typeof range !== "object") { return flattenCanonicalText(range); }
      const distance = range.distance || {};
      const unit = { feet: "呎", miles: "英里", touch: "觸碰", self: "自身", sight: "視線內", unlimited: "無限" }[distance.type] || distance.type;
      const amount = typeof distance.amount === "number" ? distance.amount + " " : "";
      const base = amount + (unit || "");
      const shape = { cone: "錐形", line: "線形", radius: "半徑", sphere: "球體", hemisphere: "半球", cube: "立方體" }[range.type];
      return shape ? "自身（" + (shape === "半徑" ? "半徑 " : "") + base + (shape === "半徑" ? "" : " " + shape) + "）" : (base || flattenCanonicalText(range));
    }

    function components2014(c) {
      if (!c || typeof c !== "object") { return flattenCanonicalText(c); }
      const parts = [];
      if (c.v) { parts.push("聲語"); }
      if (c.s) { parts.push("姿勢"); }
      if (c.m) { parts.push("材料" + (typeof c.m === "string" ? "（" + c.m + "）" : "")); }
      return parts.join("、");
    }

    function duration2014(values) {
      if (!Array.isArray(values)) { return flattenCanonicalText(values); }
      const units = { round: "輪", minute: "分鐘", hour: "小時", day: "天" };
      return values.map(function (part) {
        if (part.type === "instant") { return "即效"; }
        if (part.type === "special") { return "特殊"; }
        if (part.type === "permanent") { return "永久／直到特定條件結束"; }
        if (part.type === "timed" && part.duration) {
          return (part.concentration ? "專注，至多 " : "") + String(part.duration.amount || 1) + " " +
            (units[part.duration.type] || part.duration.type);
        }
        return flattenCanonicalText(part);
      }).join("／");
    }

    function classes2014(classes) {
      if (!classes || typeof classes !== "object") { return flattenCanonicalText(classes); }
      const base = Array.isArray(classes.fromClassList) ? classes.fromClassList.map(function (entry) { return entry.name; }) : [];
      const extras = Array.isArray(classes.fromSubclass) ? classes.fromSubclass.map(function (entry) {
        return (entry.class && entry.class.name || "") + "（" + (entry.subclass && entry.subclass.name || "") + "）";
      }) : [];
      return base.concat(extras).filter(Boolean).join("、");
    }

    function renderSpellDetail(container, selected) {
      if (board.edition === "2024") {
        const tuple = selected.tuple;
        const title = tuple[3] || tuple[2] || tuple[0];
        container.appendChild(createElement("h3", "", title));
        if (tuple[2] && tuple[2] !== title) {
          container.appendChild(createElement("p", "muted", tuple[2]));
        }
        const stats = createElement("div", "stat-grid");
        addStat(stats, "等級", formatSpellLevel(tuple[4]));
        addStat(stats, "學派", schoolLabel(tuple[5]));
        addStat(stats, "施法時間", tuple[9]);
        addStat(stats, "射程", tuple[10]);
        addStat(stats, "成分", tuple[11]);
        addStat(stats, "持續時間", tuple[12]);
        container.appendChild(stats);
        if (tuple[13]) {
          const summaryHeading = createElement("h4", "", "摘要");
          container.append(summaryHeading, createElement("p", "canonical-value", tuple[13]));
        }
        container.appendChild(createElement("h4", "", "完整規則文字"));
        const ruleMap = root.SPELLS_2024_FULL_RULES;
        const fullRule = ruleMap && typeof ruleMap === "object" ? ruleMap[tuple[0]] : null;
        if (typeof fullRule === "string" && fullRule.length) {
          fullRule.split(/\n\s*\n/).forEach(function (paragraph) {
            container.appendChild(createElement("p", "canonical-value", paragraph));
          });
        } else {
          container.appendChild(createElement("p", "unavailable", "此 canonical 法術的完整規則文字目前未載入。 "));
        }
        container.appendChild(createElement("p", "source-note", "來源：本機 SPELLS_2024_TUPLES 與 SPELLS_2024_FULL_RULES canonical 投影。 "));
        return;
      }

      const spell = selected.spell;
      container.appendChild(createElement("h3", "", spell.name || spell.ENG_name || "未命名法術"));
      if (spell.ENG_name && spell.ENG_name !== spell.name) {
        container.appendChild(createElement("p", "muted", spell.ENG_name));
      }
      const stats = createElement("div", "stat-grid");
      addStat(stats, "等級", formatSpellLevel(spell.level));
      addStat(stats, "學派", schoolLabel(spell.school));
      addStat(stats, "施法時間", time2014(spell.time));
      addStat(stats, "射程", range2014(spell.range));
      addStat(stats, "成分", components2014(spell.components));
      addStat(stats, "持續時間", duration2014(spell.duration));
      addStat(stats, "職業", classes2014(spell.classes));
      addStat(stats, "來源", spell.source ? String(spell.source) + (spell.page ? "，第 " + spell.page + " 頁" : "") : "");
      container.appendChild(stats);
      container.appendChild(createElement("h4", "", "完整規則文字"));
      appendCanonicalValue(container, spell.entries);
      if (spell.entriesHigherLevel !== undefined) {
        container.appendChild(createElement("h4", "", "升環施法"));
        appendCanonicalValue(container, spell.entriesHigherLevel);
      }
      container.appendChild(createElement("p", "source-note", "來源：本機 spells-phb-2014.json canonical 投影。 "));
    }

    function addStat(container, label, value) {
      if (value === null || value === undefined || value === "") {
        return;
      }
      const item = createElement("div", "stat-item");
      item.append(createElement("span", "stat-label", label), createElement("span", "canonical-value", formatCanonicalValue(value)));
      container.appendChild(item);
    }

    function appendCanonicalValue(container, value) {
      if (value === null || value === undefined) {
        return;
      }
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        container.appendChild(createElement("p", "canonical-value", format2014RuleText(value)));
        return;
      }
      if (Array.isArray(value)) {
        if (value.every(function (item) { return item === null || ["string", "number", "boolean"].includes(typeof item); })) {
          const list = createElement("ul", "canonical-list");
          value.forEach(function (item) {
            list.appendChild(createElement("li", "canonical-value", item === null ? "" : format2014RuleText(item)));
          });
          container.appendChild(list);
        } else {
          value.forEach(function (item) { appendCanonicalValue(container, item); });
        }
        return;
      }
      if (typeof value !== "object") {
        container.appendChild(createElement("p", "canonical-value", String(value)));
        return;
      }

      if (value.type === "entries") {
        if (value.name) {
          container.appendChild(createElement("h4", "", value.name));
        }
        appendCanonicalValue(container, value.entries);
        return;
      }
      if (value.type === "list" && Array.isArray(value.items)) {
        const list = createElement("ul", "canonical-list");
        value.items.forEach(function (item) {
          const listItem = createElement("li", "canonical-value");
          if (typeof item === "object" && item !== null) {
            writeText(listItem, format2014RuleText(flattenCanonicalText(item)));
          } else {
            writeText(listItem, format2014RuleText(item));
          }
          list.appendChild(listItem);
        });
        container.appendChild(list);
        return;
      }
      if (value.type === "table" && Array.isArray(value.rows)) {
        appendCanonicalTable(container, value);
        return;
      }

      if (value.name) {
        container.appendChild(createElement("h4", "", value.name));
      }
      Object.keys(value).forEach(function (key) {
        if (key === "type" || key === "name") {
          return;
        }
        const child = value[key];
        if (child === null || child === undefined) {
          return;
        }
        if (typeof child === "object") {
          appendCanonicalValue(container, child);
        } else {
          const paragraph = createElement("p", "canonical-value");
          paragraph.append(createElement("strong", "", key + "："), document.createTextNode(format2014RuleText(child)));
          container.appendChild(paragraph);
        }
      });
    }

    function appendCanonicalTable(container, tableData) {
      const scroll = createElement("div", "table-scroll");
      const table = createElement("table", "initiative-list");
      if (tableData.caption) {
        table.appendChild(createElement("caption", "", tableData.caption));
      }
      if (Array.isArray(tableData.colLabels)) {
        const head = createElement("thead");
        const row = createElement("tr");
        tableData.colLabels.forEach(function (label) {
          row.appendChild(createElement("th", "", flattenCanonicalText(label)));
        });
        head.appendChild(row);
        table.appendChild(head);
      }
      const body = createElement("tbody");
      tableData.rows.forEach(function (sourceRow) {
        const row = createElement("tr");
        const cells = Array.isArray(sourceRow) ? sourceRow : [sourceRow];
        cells.forEach(function (cell) {
          row.appendChild(createElement("td", "canonical-value", format2014RuleText(flattenCanonicalText(cell))));
        });
        body.appendChild(row);
      });
      table.appendChild(body);
      scroll.appendChild(table);
      container.appendChild(scroll);
    }

    function flattenCanonicalText(value) {
      if (value === null || value === undefined) {
        return "";
      }
      if (["string", "number", "boolean"].includes(typeof value)) {
        return String(value);
      }
      if (Array.isArray(value)) {
        return value.map(flattenCanonicalText).filter(Boolean).join("；");
      }
      if (typeof value === "object") {
        return Object.keys(value)
          .filter(function (key) { return key !== "type"; })
          .map(function (key) {
            const text = flattenCanonicalText(value[key]);
            return text ? (key === "name" || key === "entries" || key === "items" ? text : key + " " + text) : "";
          })
          .filter(Boolean)
          .join("；");
      }
      return String(value);
    }

    function formatCanonicalValue(value) {
      return typeof value === "object" && value !== null ? flattenCanonicalText(value) : String(value);
    }

    function getCreatureRecords() {
      return Array.isArray(root.ZIZI_5R_CREATURES) ? root.ZIZI_5R_CREATURES : [];
    }

    function getCreatureTranslations() {
      return root.ZIZI_5R_CREATURES_ZH && typeof root.ZIZI_5R_CREATURES_ZH === "object" ? root.ZIZI_5R_CREATURES_ZH : {};
    }

    function searchCreatures(query) {
      const needle = normalizeSearch(query);
      const creatures = getCreatureRecords();
      const translations = getCreatureTranslations();
      const results = [];
      for (let index = 0; index < creatures.length && results.length < 50; index += 1) {
        const creature = creatures[index];
        const zh = translations[creature.id] || {};
        const haystack = normalizeSearch([creature.id, creature.name, zh.nameZh].join(" "));
        if (!needle || haystack.includes(needle)) {
          const primary = zh.nameZh || creature.name || creature.id;
          results.push({
            id: makeReferenceId("creature2024", String(creature.id)),
            label: String(primary) + (creature.name && creature.name !== primary ? " / " + creature.name : "") + "（CR " + String(creature.cr || "—") + "）",
            creature: creature,
            zh: zh
          });
        }
      }
      return results;
    }

    function findCreature(selectedId) {
      const reference = parseReferenceId(selectedId);
      if (!reference || reference.kind !== "creature2024" || board.edition !== "2024") {
        return null;
      }
      const creature = getCreatureRecords().find(function (entry) {
        return entry.id === reference.canonicalId;
      });
      if (!creature) {
        return null;
      }
      return {
        id: selectedId,
        creature: creature,
        zh: getCreatureTranslations()[creature.id] || {}
      };
    }

    function renderCreatureDetail(container, selected) {
      const creature = selected.creature;
      const zh = selected.zh;
      const title = zh.nameZh || creature.name || creature.id;
      container.appendChild(createElement("h3", "", title));
      if (creature.name && creature.name !== title) {
        container.appendChild(createElement("p", "muted", creature.name));
      }
      const descriptor = [creature.size, creature.type].filter(Boolean).map(formatCanonicalValue).join("，");
      if (descriptor) {
        container.appendChild(createElement("p", "canonical-value", descriptor));
      }

      const stats = createElement("div", "stat-grid");
      addStat(stats, "AC", zh.acZh || creature.ac);
      addStat(stats, "HP", zh.hpZh || creature.hp || creature.hpSpecial);
      addStat(stats, "生命骰", creature.hpFormula);
      addStat(stats, "CR", creature.cr);
      addStat(stats, "速度", creature.speed);
      addStat(stats, "力量 STR", creature.str);
      addStat(stats, "敏捷 DEX", creature.dex);
      addStat(stats, "體質 CON", creature.con);
      addStat(stats, "智力 INT", creature.int);
      addStat(stats, "感知 WIS", creature.wis);
      addStat(stats, "魅力 CHA", creature.cha);
      addStat(stats, "豁免", creature.save);
      addStat(stats, "技能", creature.skill);
      addStat(stats, "易傷", zh.vulnerableZh || creature.vulnerable);
      addStat(stats, "抗性", zh.resistZh || creature.resist);
      addStat(stats, "免疫", zh.immuneZh || creature.immune);
      addStat(stats, "狀態免疫", zh.conditionImmuneZh || creature.conditionImmune);
      addStat(stats, "感官", zh.sensesZh || creature.senses);
      addStat(stats, "被動感知", creature.passive);
      addStat(stats, "語言", zh.languagesZh || creature.languages);
      container.appendChild(stats);

      renderFeatureSection(container, "特性", creature.traits, zh.traitsZh);
      renderFeatureSection(container, "施法", creature.spellcasting, zh.spellcastingZh);
      renderFeatureSection(container, "動作", creature.actions, zh.actionsZh);
      renderFeatureSection(container, "附贈動作", creature.bonus, zh.bonusZh);
      renderFeatureSection(container, "反應", creature.reactions, zh.reactionsZh);
      renderFeatureSection(container, "傳奇動作", creature.legendary, zh.legendaryZh);

      if (zh.summonedBySpellZh || creature.summonedBySpell) {
        container.appendChild(createElement("h4", "", "召喚來源（法術）"));
        container.appendChild(createElement("p", "canonical-value", zh.summonedBySpellZh || formatCanonicalValue(creature.summonedBySpell)));
      }
      if (zh.summonedByClassZh || creature.summonedByClass) {
        container.appendChild(createElement("h4", "", "召喚來源（職業）"));
        container.appendChild(createElement("p", "canonical-value", zh.summonedByClassZh || formatCanonicalValue(creature.summonedByClass)));
      }
      if (zh.spellRefsZh || creature.spellRefs) {
        container.appendChild(createElement("h4", "", "法術參照"));
        container.appendChild(createElement("p", "canonical-value", zh.spellRefsZh || formatCanonicalValue(creature.spellRefs)));
      }
      if (zh.bodyZh) {
        const details = createElement("details");
        details.append(createElement("summary", "", "完整中文 canonical 投影文字"), createElement("p", "canonical-value", zh.bodyZh));
        container.appendChild(details);
      }
      container.appendChild(createElement("p", "source-note", "來源：本機 ZIZI_5R_CREATURES 與 ZIZI_5R_CREATURES_ZH canonical 投影；ID " + creature.id + "。 "));
    }

    function renderFeatureSection(container, heading, englishEntries, chineseEntries) {
      const english = Array.isArray(englishEntries) ? englishEntries : [];
      const chinese = Array.isArray(chineseEntries) ? chineseEntries : [];
      if (english.length === 0 && chinese.length === 0) {
        return;
      }
      container.appendChild(createElement("h4", "", heading));
      const length = Math.max(english.length, chinese.length);
      for (let index = 0; index < length; index += 1) {
        const en = english[index] || {};
        const zh = chinese[index] || {};
        const featureTitle = zh.h || en.h;
        if (featureTitle) {
          container.appendChild(createElement("h5", "", featureTitle));
        }
        if (zh.t) {
          container.appendChild(createElement("p", "canonical-value", zh.t));
        }
        if (en.t && en.t !== zh.t) {
          const englishText = createElement("p", "canonical-value muted", en.t);
          englishText.lang = "en";
          container.appendChild(englishText);
        }
      }
    }

    function ensure2014Spells() {
      if (spells2014 || spells2014Promise || spells2014Error) {
        return spells2014Promise;
      }
      if (typeof root.fetch !== "function") {
        spells2014Error = "瀏覽器不支援 fetch。";
        return null;
      }
      spells2014Promise = root.fetch("assets/data/spells-phb-2014.json", { credentials: "same-origin" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP " + response.status);
          }
          return response.json();
        })
        .then(function (payload) {
          if (!payload || !Array.isArray(payload.spell)) {
            throw new Error("canonical JSON 結構不符預期");
          }
          spells2014 = payload.spell;
          spells2014Error = null;
          if (board.edition === "2014") {
            render();
          }
          return spells2014;
        })
        .catch(function (error) {
          spells2014Error = error.message;
          if (board.edition === "2014") {
            render();
          }
          return null;
        });
      return spells2014Promise;
    }

    function exportCurrentBoard() {
      run(function () {
        const serialized = exportBackup(board);
        const blob = new Blob([serialized], { type: "application/json;charset=utf-8" });
        const url = root.URL.createObjectURL(blob);
        const link = createElement("a");
        link.href = url;
        link.download = "dm-screen-" + board.edition + "-" + new Date().toISOString().slice(0, 10) + ".json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 0);
        announce("已匯出 " + board.edition + " 看板備份。 ", false);
      });
    }

    async function importCurrentBoard() {
      const file = elements.importFile.files && elements.importFile.files[0];
      if (!file) {
        return;
      }
      try {
        if (file.size > MAX_BACKUP_BYTES) {
          fail("備份檔超過 1 MiB 上限。");
        }
        const serialized = await file.text();
        const imported = importBackup(storage, serialized, board.edition);
        lockedEditions.delete(board.edition);
        board = imported;
        notesDirty = false;
        render();
        announce("備份驗證完成，已匯入 " + board.edition + " 看板。 ", false);
      } catch (error) {
        announce("匯入失敗：" + error.message + " 原看板保持不變。", true);
      } finally {
        elements.importFile.value = "";
      }
    }
  }
}));

import {
  createCloudService,
  prepareCharacterImport
} from "./bridge.mjs";

const SUPABASE_ESM_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";

const elements = Object.fromEntries([
  "configStatus", "sessionStatus", "signInButton", "signOutButton", "cloudControls",
  "message", "refreshCharactersButton", "characterList", "importJson", "importConsent",
  "previewImportButton", "commitImportButton", "importPreview", "previewSource",
  "previewVersion", "previewRuleset", "previewName", "previewLocalId", "previewFingerprint",
  "previewBytes", "createCampaignForm", "campaignName", "joinCampaignForm", "inviteCode",
  "createdInviteNotice", "refreshCampaignsButton", "campaignList", "selectedCampaignLabel",
  "characterSelect", "linkCharacterButton", "linkedCharacterList", "loadDmRosterButton",
  "dmRosterList"
].map((id) => [id, document.getElementById(id)]));

let config = null;
let supabase = null;
let service = null;
let session = null;
let preparedImport = null;
let preparedText = "";
let characters = [];
let campaigns = [];
let selectedCampaign = null;

function setMessage(text, kind = "info") {
  elements.message.textContent = text;
  elements.message.dataset.kind = kind;
}

function errorText(error) {
  if (error && typeof error.message === "string" && error.message.trim()) {
    return error.message.trim().slice(0, 400);
  }
  return "動作失敗。請重新整理後再試；若持續發生，請由管理者檢查 Auth、RPC 與 RLS 設定。";
}

async function runAction(label, action) {
  setMessage(`${label}…`);
  try {
    const result = await action();
    return result;
  } catch (error) {
    setMessage(`${label}失敗：${errorText(error)}`, "error");
    return undefined;
  }
}

function pick(record, ...keys) {
  if (!record || typeof record !== "object") return undefined;
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function firstRecord(value) {
  if (Array.isArray(value)) return value[0] || null;
  if (value && typeof value === "object" && Array.isArray(value.data)) return value.data[0] || null;
  return value && typeof value === "object" ? value : null;
}

function characterPayload(row) {
  return pick(row, "payload", "save", "character_payload") || {};
}

function characterId(row) {
  return String(pick(row, "id", "character_id", "cloud_character_id") || "");
}

function characterName(row) {
  const payload = characterPayload(row);
  return String(pick(row, "display_name", "name") || payload?.meta?.name || "未命名角色");
}

function campaignId(row) {
  return String(pick(row, "id", "campaign_id") || "");
}

function campaignName(row) {
  return String(pick(row, "name", "campaign_name") || "未命名團務");
}

function appendText(parent, text, className = "") {
  const node = document.createElement("div");
  if (className) node.className = className;
  node.textContent = text;
  parent.append(node);
  return node;
}

function appendButton(parent, label, handler, className = "secondary") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", handler);
  parent.append(button);
  return button;
}

function validateConfig(candidate) {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("public-config.js 必須匯出設定物件。");
  }
  const url = new URL(String(candidate.supabaseUrl || ""));
  if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) {
    throw new Error("supabaseUrl 必須是 HTTPS 的 *.supabase.co 專案 URL。");
  }
  const key = String(candidate.supabaseAnonKey || "").trim();
  if (key.length < 20 || key.includes("YOUR_") || key.includes("PROJECT_")) {
    throw new Error("supabaseAnonKey 尚未填入公開 anon／publishable key。");
  }
  const authProvider = String(candidate.authProvider || "custom:line");
  if (authProvider !== "custom:line") {
    throw new Error("本 PoC 僅允許已審核的 custom:line provider identifier。");
  }
  return Object.freeze({ supabaseUrl: url.origin, supabaseAnonKey: key, authProvider });
}

async function loadPublicConfig() {
  try {
    const module = await import("./public-config.js");
    return validateConfig(module.default || module.cloudPocConfig);
  } catch (error) {
    const missing = error instanceof TypeError || /module|fetch|import/i.test(String(error?.message || ""));
    elements.configStatus.textContent = missing
      ? "未設定（unconfigured：未找到 public-config.js）"
      : `設定無效：${errorText(error)}`;
    elements.signInButton.disabled = true;
    setMessage("雲端預覽尚未設定。既有網站仍可維持訪客模式；請勿把任何私密金鑰放進公開設定。", "error");
    return null;
  }
}

function resetAuthenticatedViews() {
  characters = [];
  campaigns = [];
  selectedCampaign = null;
  preparedImport = null;
  preparedText = "";
  elements.characterList.replaceChildren();
  elements.campaignList.replaceChildren();
  elements.linkedCharacterList.replaceChildren();
  elements.dmRosterList.replaceChildren();
  elements.characterSelect.replaceChildren();
  elements.selectedCampaignLabel.textContent = "尚未選擇";
  elements.importPreview.hidden = true;
  elements.commitImportButton.disabled = true;
  elements.createdInviteNotice.hidden = true;
}

async function applySession(nextSession) {
  session = nextSession || null;
  const authenticated = Boolean(session?.user?.id);
  elements.sessionStatus.textContent = authenticated ? "已登入（後端 session 有效）" : "尚未登入";
  elements.signInButton.disabled = !config || authenticated;
  elements.signOutButton.disabled = !authenticated;
  elements.cloudControls.disabled = !authenticated;

  if (!authenticated) {
    resetAuthenticatedViews();
    setMessage(config ? "設定已載入；登入後才可存取雲端資料。" : "等待公開設定。");
    return;
  }

  await Promise.all([refreshCharacters(), refreshCampaigns()]);
  setMessage("已登入並讀取目前帳號可見的雲端資料。授權結果以後端為準。");
}

function renderCharacters() {
  elements.characterList.replaceChildren();
  elements.characterSelect.replaceChildren();
  elements.linkedCharacterList.replaceChildren();

  if (!characters.length) {
    appendText(elements.characterList, "目前沒有雲端角色。", "item meta");
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "沒有可連結的角色";
    elements.characterSelect.append(option);
    elements.linkCharacterButton.disabled = true;
    return;
  }

  elements.linkCharacterButton.disabled = !selectedCampaign;
  for (const row of characters) {
    const id = characterId(row);
    const payload = characterPayload(row);
    const ruleset = String(pick(row, "ruleset") || payload.ruleset || "未知");
    const revision = String(pick(row, "revision") ?? "?");
    const localId = String(pick(row, "native_id", "local_character_id") || payload.id || "未提供");

    const item = document.createElement("li");
    item.className = "item";
    appendText(item, characterName(row), "item-title");
    appendText(item, `規則 ${ruleset} ｜ revision ${revision} ｜ 雲端 ID ${id || "未知"}`, "meta");
    appendText(item, `本機來源 ID ${localId}`, "meta");
    elements.characterList.append(item);

    if (id) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${characterName(row)}（${ruleset}）`;
      elements.characterSelect.append(option);

      const revokeItem = document.createElement("li");
      revokeItem.className = "item";
      appendText(revokeItem, characterName(row), "item-title");
      const controls = document.createElement("div");
      controls.className = "controls";
      const revokeButton = appendButton(controls, "撤回此角色的團務連結", () => revokeLink(id), "danger");
      revokeButton.disabled = !selectedCampaign;
      revokeItem.append(controls);
      elements.linkedCharacterList.append(revokeItem);
    }
  }
}

async function refreshCharacters() {
  const rows = await runAction("讀取自己的角色", () => service.listOwnCharacters());
  if (rows === undefined) return;
  characters = Array.isArray(rows) ? rows : [];
  renderCharacters();
}

function renderCampaigns() {
  elements.campaignList.replaceChildren();
  if (!campaigns.length) {
    appendText(elements.campaignList, "目前沒有可見的團務。", "item meta");
    selectCampaign(null);
    return;
  }

  const selectedId = selectedCampaign ? campaignId(selectedCampaign) : "";
  for (const row of campaigns) {
    const id = campaignId(row);
    const role = String(pick(row, "member_role", "role") || "member");
    const item = document.createElement("li");
    item.className = "item";
    appendText(item, campaignName(row), "item-title");
    appendText(item, `顯示角色：${role} ｜ 團務 ID ${id || "未知"}`, "meta");
    appendText(item, "此角色標籤只供介面提示；實際權限由後端重新驗證。", "meta");
    if (id) {
      const controls = document.createElement("div");
      controls.className = "controls";
      appendButton(controls, id === selectedId ? "已選擇" : "選擇團務", () => selectCampaign(row));
      item.append(controls);
    }
    elements.campaignList.append(item);
  }

  if (selectedId) {
    const current = campaigns.find((row) => campaignId(row) === selectedId);
    selectCampaign(current || null);
  }
}

function selectCampaign(row) {
  selectedCampaign = row || null;
  elements.selectedCampaignLabel.textContent = selectedCampaign
    ? `${campaignName(selectedCampaign)}（${campaignId(selectedCampaign)}）`
    : "尚未選擇";
  elements.loadDmRosterButton.disabled = !selectedCampaign;
  elements.dmRosterList.replaceChildren();
  renderCharacters();
  if (campaigns.length) renderCampaignSelectionOnly();
}

function renderCampaignSelectionOnly() {
  const buttons = elements.campaignList.querySelectorAll("button");
  campaigns.forEach((row, index) => {
    const button = buttons[index];
    if (button) button.textContent = campaignId(row) === campaignId(selectedCampaign) ? "已選擇" : "選擇團務";
  });
}

async function refreshCampaigns() {
  const rows = await runAction("讀取團務", () => service.listCampaigns());
  if (rows === undefined) return;
  campaigns = Array.isArray(rows) ? rows : [];
  renderCampaigns();
}

function clearImportPreview() {
  preparedImport = null;
  preparedText = "";
  elements.importPreview.hidden = true;
  elements.commitImportButton.disabled = true;
}

async function previewImport() {
  clearImportPreview();
  if (!elements.importConsent.checked) {
    setMessage("請先勾選這次手動匯入的明確同意，再驗證內容。", "error");
    return;
  }
  const raw = elements.importJson.value;
  const prepared = await runAction("驗證角色 JSON", () => prepareCharacterImport(raw));
  if (!prepared) return;

  preparedImport = prepared;
  preparedText = raw;
  const save = prepared.save || {};
  elements.previewSource.textContent = prepared.source === "_save" ? "可讀匯出的 _save" : "原生裸存檔";
  elements.previewVersion.textContent = `v${prepared.version}${prepared.legacyV9 ? "（相容舊版，僅手動匯入）" : ""}`;
  elements.previewRuleset.textContent = String(prepared.ruleset);
  elements.previewName.textContent = String(save?.meta?.name || "未命名角色");
  elements.previewLocalId.textContent = String(prepared.localCharacterId || "未提供");
  elements.previewFingerprint.textContent = String(prepared.fingerprint);
  elements.previewBytes.textContent = `${prepared.byteLength} bytes`;
  elements.importPreview.hidden = false;
  elements.commitImportButton.disabled = false;
  setMessage("本機驗證完成，尚未上傳。確認預覽後按「確認上傳」才會建立或取得冪等的雲端角色。 ");
}

async function commitImport() {
  if (!preparedImport || preparedText !== elements.importJson.value || !elements.importConsent.checked) {
    clearImportPreview();
    setMessage("內容或同意狀態已變更，請重新驗證並預覽。", "error");
    return;
  }
  const result = await runAction("上傳角色", () => service.commitCharacterImport(preparedImport));
  if (result === undefined) return;
  elements.importJson.value = "";
  elements.importConsent.checked = false;
  clearImportPreview();
  await refreshCharacters();
  setMessage("角色已透過受驗證 RPC 寫入；同來源重複匯入由後端指紋策略處理。 ");
}

async function createCampaign(event) {
  event.preventDefault();
  const name = elements.campaignName.value.trim();
  if (!name) return;
  const result = await runAction("建立團務", () => service.createCampaign(name));
  if (result === undefined) return;
  elements.campaignName.value = "";
  const record = firstRecord(result);
  const inviteCode = String(pick(record, "invite_code", "inviteCode") || "");
  if (inviteCode) {
    elements.createdInviteNotice.textContent = `邀請碼只在建立／輪替時顯示，請透過安全管道交給玩家：${inviteCode}`;
    elements.createdInviteNotice.hidden = false;
  } else {
    elements.createdInviteNotice.hidden = true;
  }
  await refreshCampaigns();
  setMessage("團務已建立。若後端回傳一次性邀請碼，請現在安全保存；資料庫不提供邀請雜湊的讀取權。 ");
}

async function joinCampaign(event) {
  event.preventDefault();
  const inviteCode = elements.inviteCode.value.trim();
  if (!inviteCode) return;
  const result = await runAction("加入團務", () => service.joinCampaign(inviteCode));
  elements.inviteCode.value = "";
  if (result === undefined) return;
  await refreshCampaigns();
  setMessage("加入團務完成。邀請碼已從畫面清除。 ");
}

async function linkCharacter() {
  if (!selectedCampaign) {
    setMessage("請先選擇團務。", "error");
    return;
  }
  const id = elements.characterSelect.value;
  if (!id) return;
  const result = await runAction("連結角色", () => service.linkCharacter(campaignId(selectedCampaign), id));
  if (result === undefined) return;
  setMessage("角色已連結。後端已重新確認角色所有權與團務成員資格。 ");
}

async function revokeLink(id) {
  if (!selectedCampaign) return;
  const result = await runAction("撤回角色連結", () => service.revokeCharacterLink(campaignId(selectedCampaign), id));
  if (result === undefined) return;
  setMessage("自己的角色連結已撤回。 ");
  elements.dmRosterList.replaceChildren();
}

function renderDmRoster(rows) {
  elements.dmRosterList.replaceChildren();
  if (!rows.length) {
    appendText(elements.dmRosterList, "這個團務目前沒有可讀取的已連結角色。", "item meta");
    return;
  }
  for (const row of rows) {
    const payload = characterPayload(row);
    const item = document.createElement("li");
    item.className = "item";
    appendText(item, characterName(row), "item-title");
    appendText(item, `規則 ${String(pick(row, "ruleset") || payload.ruleset || "未知")} ｜ revision ${String(pick(row, "revision") ?? "?")}`, "meta");
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "檢視唯讀原生存檔";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(payload, null, 2);
    details.append(summary, pre);
    item.append(details);
    elements.dmRosterList.append(item);
  }
}

async function loadDmRoster() {
  if (!selectedCampaign) return;
  const rows = await runAction("讀取 DM 唯讀名冊", () => service.listDmLinkedCharacters(campaignId(selectedCampaign)));
  if (rows === undefined) return;
  renderDmRoster(Array.isArray(rows) ? rows : []);
  setMessage("名冊已讀取。此畫面沒有更新他人角色的操作；後端也未提供 DM 編輯角色方法。 ");
}

async function signIn() {
  if (!supabase || !config) return;
  setMessage("正要轉往 LINE／Supabase 授權頁…");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: config.authProvider,
    options: { redirectTo: new URL("./", window.location.href).href }
  });
  if (error) setMessage(`無法開始登入：${errorText(error)}`, "error");
}

async function signOut() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    setMessage(`登出失敗：${errorText(error)}`, "error");
    return;
  }
  await applySession(null);
}

function bindEvents() {
  elements.signInButton.addEventListener("click", signIn);
  elements.signOutButton.addEventListener("click", signOut);
  elements.refreshCharactersButton.addEventListener("click", refreshCharacters);
  elements.refreshCampaignsButton.addEventListener("click", refreshCampaigns);
  elements.previewImportButton.addEventListener("click", previewImport);
  elements.commitImportButton.addEventListener("click", commitImport);
  elements.createCampaignForm.addEventListener("submit", createCampaign);
  elements.joinCampaignForm.addEventListener("submit", joinCampaign);
  elements.linkCharacterButton.addEventListener("click", linkCharacter);
  elements.loadDmRosterButton.addEventListener("click", loadDmRoster);
  elements.importJson.addEventListener("input", clearImportPreview);
  elements.importConsent.addEventListener("change", () => {
    if (!elements.importConsent.checked) clearImportPreview();
  });
}

async function initialize() {
  bindEvents();
  elements.loadDmRosterButton.disabled = true;
  elements.linkCharacterButton.disabled = true;
  config = await loadPublicConfig();
  if (!config) return;

  elements.configStatus.textContent = "設定格式有效；正在載入 Supabase 瀏覽器用戶端…";
  try {
    const { createClient } = await import(SUPABASE_ESM_URL);
    supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    service = createCloudService(supabase);
    elements.configStatus.textContent = "已載入公開設定（不代表 LINE 相容性已驗證）";
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => applySession(nextSession), 0);
    });
    await applySession(data.session);
  } catch (error) {
    elements.configStatus.textContent = "設定存在，但無法初始化";
    elements.signInButton.disabled = true;
    elements.cloudControls.disabled = true;
    setMessage(`雲端初始化失敗：${errorText(error)}`, "error");
  }
}

initialize();

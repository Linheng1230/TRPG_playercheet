import {
  createCloudService,
  prepareCharacterImport
} from "./bridge.mjs";


const SUPABASE_ESM_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm";

const elements = Object.fromEntries([
  "configStatus", "sessionStatus", "credentialPanel", "loginForm", "registerForm",
  "recoverForm", "loginUsername", "loginPassword", "registerUsername",
  "registerPassword", "registerConfirm", "recoverUsername", "recoverCode",
  "recoverPassword", "loginSubmitButton", "registerSubmitButton", "recoverSubmitButton", "authModeButtons", "turnstileWidget",
  "recoveryNotice", "recoveryValue", "savedRecovery", "ackRecoveryButton",
  "signOutButton", "cloudControls",
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
let turnstileWidgetId = null;
let turnstileToken = "";
let authMode = "login";
let authBusy = false;
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
  if (Object.prototype.hasOwnProperty.call(candidate, "authProvider")) {
    throw new Error("舊版 LINE authProvider 設定已停用，請移除該欄位，改用 Email 驗證碼登入。");
  }
  const siteKey = String(candidate.turnstileSiteKey || "").trim();
  if (siteKey.length < 12 || /^(YOUR_|TEST_|0x000)/i.test(siteKey)) {
    throw new Error("Cloudflare Turnstile 公開 Site Key 尚未設定。");
  }
  return Object.freeze({ supabaseUrl: url.origin, supabaseAnonKey: key, turnstileSiteKey: siteKey });
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
    elements.loginSubmitButton.disabled = true;
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
  let verified = null;
  if (nextSession?.access_token && supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(nextSession.access_token);
      if (!error && data?.user?.id === nextSession?.user?.id) {
        verified = { ...nextSession, user: data.user };
      }
    } catch { /* Never treat local session cache as hosted authentication. */ }
  }
  session = verified;
  const authenticated = Boolean(session?.user?.id);
  elements.sessionStatus.textContent = authenticated ? "已驗證登入" : "尚未登入";
  elements.credentialPanel.hidden = authenticated;
  elements.signOutButton.disabled = !authenticated;
  elements.cloudControls.disabled = !authenticated;
  if (authenticated) {
    for (const id of ["loginPassword", "registerPassword", "registerConfirm", "recoverPassword", "recoverCode"]) {
      elements[id].value = "";
    }
  }
  if (!authenticated) {
    resetAuthenticatedViews();
    setMessage(config ? "登入後才能同步雲端角色；訪客可以直接使用原本角色卡。" : "等待公開設定。");
    return;
  }
  await Promise.all([refreshCharacters(), refreshCampaigns()]);
  setMessage("已驗證 Supabase Auth 身分，雲端資料依 auth.uid() 與後端 RLS 授權。");
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

function showAuthMode(mode) {
  if (!["login", "register", "recover"].includes(mode)) return;
  authMode = mode;
  elements.loginForm.hidden = mode !== "login";
  elements.registerForm.hidden = mode !== "register";
  elements.recoverForm.hidden = mode !== "recover";
  for (const button of elements.authModeButtons.querySelectorAll("button[data-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
  }
  for (const id of ["loginPassword", "registerPassword", "registerConfirm", "recoverPassword", "recoverCode"]) {
    elements[id].value = "";
  }
}
function resetTurnstile() {
  turnstileToken = "";
  if (turnstileWidgetId != null) window.turnstile?.reset(turnstileWidgetId);
}
function startTurnstile(attempt = 0) {
  if (!config || attempt > 40) return;
  if (!window.turnstile) {
    window.setTimeout(() => startTurnstile(attempt + 1), 200);
    return;
  }
  turnstileWidgetId = window.turnstile.render(elements.turnstileWidget, {
    sitekey: config.turnstileSiteKey,
    size: "compact",
    callback: token => { turnstileToken = token; },
    "expired-callback": () => { turnstileToken = ""; },
    "error-callback": () => { turnstileToken = ""; }
  });
  elements.loginSubmitButton.disabled = false;
  elements.registerSubmitButton.disabled = false;
  elements.recoverSubmitButton.disabled = false;
}
async function runUsernameAction(action, params) {
  if (!supabase || !config || session?.user?.id) return null;
  if (!turnstileToken) throw new Error("請先完成安全驗證。");
  if (authBusy) throw new Error("請稍候，目前已有帳號操作正在執行。");
  authBusy = true;
  const buttons = [elements.loginSubmitButton, elements.registerSubmitButton, elements.recoverSubmitButton];
  buttons.forEach(button => { button.disabled = true; });
  const body = { ...params, action, turnstileToken };
  try {
    const { data, error } = await supabase.functions.invoke("username-auth", { body });
    if (error || data?.error) {
      // Only fixed safe errors; never echo a password or server detail.
      const safe = {
        USERNAME_UNAVAILABLE: "帳號已被使用，請改用其他名稱。",
        PASSWORD_POLICY: "密碼至少 12 字元。",
        INVALID_CREDENTIALS: "帳號、密碼或復原碼無效。",
        RATE_LIMITED: "嘗試過於頻繁，請稍後再試。",
        CHALLENGE_REQUIRED: "安全驗證未通過，請重新驗證。",
        SERVICE_UNAVAILABLE: "帳號服務尚未準備好，請稍後再試。"
      };
      throw new Error(safe[data?.error] || "帳號服務目前無法完成操作。");
    }
    return data;
  } finally {
    authBusy = false;
    resetTurnstile();
    if (config && turnstileWidgetId != null && !session?.user?.id) {
      [elements.loginSubmitButton, elements.registerSubmitButton, elements.recoverSubmitButton]
        .forEach(button => { button.disabled = false; });
    }
  }
}
function showRecoveryCode(code, headline) {
  if (typeof code !== "string" || !/^R1-[a-zA-Z0-9_-]{43}$/.test(code)) {
    throw new Error("沒有取得有效的復原碼，請停止操作並聯絡管理員。");
  }
  elements.recoveryValue.textContent = code;
  elements.recoveryNotice.hidden = false;
  elements.savedRecovery.checked = false;
  elements.ackRecoveryButton.disabled = true;
  setMessage(headline + "。請立即將一次性復原碼保存在安全位置；離開後不會再提供原碼。");
}
async function setVerifiedTokens(result) {
  if (!result?.access_token || !result?.refresh_token) return false;
  const { data, error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token
  });
  if (error || !data?.session) throw new Error("登入工作階段未建立。");
  await applySession(data.session);
  if (!session?.user?.id) throw new Error("Supabase 身分尚未驗證。");
  return true;
}
async function loginWithUsername(event) {
  event.preventDefault();
  const username = elements.loginUsername.value;
  const password = elements.loginPassword.value;
  elements.loginPassword.value = "";
  try {
    const result = await runUsernameAction("login", { username, password });
    if (result) await setVerifiedTokens(result);
  } catch (error) { setMessage(errorText(error), "error"); }
}
async function registerWithUsername(event) {
  event.preventDefault();
  const username = elements.registerUsername.value;
  const password = elements.registerPassword.value;
  const confirmation = elements.registerConfirm.value;
  elements.registerPassword.value = "";
  elements.registerConfirm.value = "";
  if (password !== confirmation) {
    setMessage("兩次輸入的密碼不同。", "error"); return;
  }
  if (password.length < 12) { setMessage("密碼至少需要 12 字元。", "error"); return; }
  try {
    const result = await runUsernameAction("register", { username, password });
    if (!result?.account_created) throw new Error("註冊尚未成功。");
    showRecoveryCode(result.recovery_code, "帳號已建立");
    // Do not hide the one-time recovery code when the session is established.
    if (result.access_token) await setVerifiedTokens(result);
  } catch (error) { setMessage(errorText(error), "error"); }
}
async function recoverUsername(event) {
  event.preventDefault();
  const username = elements.recoverUsername.value;
  const recoveryCode = elements.recoverCode.value;
  const newPassword = elements.recoverPassword.value;
  elements.recoverCode.value = "";
  elements.recoverPassword.value = "";
  if (newPassword.length < 12) { setMessage("新密碼至少需要 12 字元。", "error"); return; }
  try {
    const result = await runUsernameAction("recover", { username, recoveryCode, newPassword });
    if (!result?.password_updated) throw new Error("密碼復原尚未完成。");
    showRecoveryCode(result.recovery_code, "密碼已更新");
    showAuthMode("login");
  } catch (error) { setMessage(errorText(error), "error"); }
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
  elements.authModeButtons.addEventListener("click", event => {
    const mode = event.target?.closest?.("button[data-mode]")?.dataset.mode;
    if (mode) showAuthMode(mode);
  });
  elements.loginForm.addEventListener("submit", loginWithUsername);
  elements.registerForm.addEventListener("submit", registerWithUsername);
  elements.recoverForm.addEventListener("submit", recoverUsername);
  elements.savedRecovery.addEventListener("change", () => {
    elements.ackRecoveryButton.disabled = !elements.savedRecovery.checked;
  });
  elements.ackRecoveryButton.addEventListener("click", () => {
    if (!elements.savedRecovery.checked) return;
    elements.recoveryValue.textContent = "";
    elements.recoveryNotice.hidden = true;
    elements.savedRecovery.checked = false;
  });
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
    elements.configStatus.textContent = "已載入公開設定（帳號服務與正式 Supabase Auth 仍待 Live 驗收）";
    startTurnstile();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    supabase.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => applySession(nextSession), 0);
    });
    await applySession(data.session);
  } catch (error) {
    elements.configStatus.textContent = "設定存在，但無法初始化";
    elements.loginSubmitButton.disabled = true;
    elements.registerSubmitButton.disabled = true;
    elements.recoverSubmitButton.disabled = true;
    elements.cloudControls.disabled = true;
    setMessage(`雲端初始化失敗：${errorText(error)}`, "error");
  }
}

initialize();

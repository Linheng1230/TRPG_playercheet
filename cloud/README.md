# D&D 5R｜LINE Login × 雲端角色庫 × DM 團務（隔離 PoC）

> 狀態：**SOURCE-ONLY / NOT DEPLOYED / NOT PRODUCTION READY**。這是獨立於原本站點的新目錄。尚未完成真實 LINE OAuth 與 Supabase live RLS 測試，**不能宣稱登入、權限或跨裝置已驗收**。請勿將測試帳號或真實玩家資料放入尚未驗證的環境。

## GitHub-first 範圍

程式碼唯一基準：`Linheng1230/TRPG_playercheet` 的獨立功能分支 `feature/line-cloud-campaign-poc-20261116`，起點 `096573445f9ee5264af2e8deae42191217beae45`。正式玩家網站仍是 GitHub Pages 的 `main`，本 PoC **不修改** 既有 `index.html`、創角器、PDF、JSON、5RTools 規則或本機訪客模式；此目錄不會自動出現在正式網站導覽。

新的雲端服務只保存原生角色 snapshot，不重新推導 D&D 規則。原生 `SAVE_VERSION=10` 是基準；手動備份匯入可接受已檢查的 v9，角色需含原生 `id`、`ruleset: "2014" | "2024"`。辨識原生 JSON、可讀匯出內的 `_save`，以及整庫備份；禁止自動從 localStorage 上傳。使用者必須預覽並明確勾選 consent 才能執行上傳。完整 JSON/PDF 回歸仍需在整合前重跑。

## 技術組件與部署隔離

- `schema.sql`：待在**獨立 Supabase 測試專案**執行的 Postgres schema、RLS 與受控 RPC。**未執行 migration**。
- `bridge.mjs`：可注入 Supabase-compatible client 的雲端同步 Adapter。所有資料處理都必須保留原生 snapshot，不用第二套規則；使用 revision compare-and-swap，拒絕靜默 last-write-wins。
- `index.html` / `app.mjs`：未接入主站的獨立預覽頁。未配置時顯示 unconfigured 且禁用登入；只在使用者明確決定時匯入 JSON。
- `public-config.example.js`：公開範例設定。正式 `public-config.js` 只能填瀏覽器允許公開的 Supabase URL、publishable/anon key、`custom:line` Provider 名稱。**絕不能放 LINE Channel Secret、Supabase service-role key、資料庫密碼或任何密鑰**。公開範例不是可用憑證。
- `../tests/qa-cloud-contract.mjs`：Node 靜態契約 QA。這些測試**不是 live RLS 測試**。
- GitHub Actions 新 workflow 暫不提交：現有 GitHub OAuth token 缺少 workflow 權限。先於本輪執行 `node --test tests/qa-cloud-*.mjs` 並保存證據，未取得授權前不能宣稱 GitHub CI 已自動執行。開 Draft PR 並不代表同意 merge。

## LINE OAuth：待做的真人驗證

LINE Login 需使用者/系統管理者在 LINE Developers 建立並授權 Login Channel、設定回呼 URL。OAuth2 常見端點：

- Authorization: `https://access.line.me/oauth2/v2.1/authorize`
- Token: `https://api.line.me/oauth2/v2.1/token`
- OIDC userinfo: `https://api.line.me/oauth2/v2.1/userinfo`
- Profile: `https://api.line.me/v2/profile`

**相容性尚未驗證**：LINE 的 ID Token 可能使用 `HS256`，不可假定 Supabase 的自訂 OIDC/JWKS 路徑可直接驗證。此 PoC 採 Supabase 的自訂 OAuth2 `custom:line` 方向為待測候選，須在真實測試環境確認 `email_optional`、scope、token/profile 欄位對應、登入/登出/重新登入、綁定唯一身分及 callback URL，且證明無 Email 的帳號可以順利登入。若 Supabase 自訂 Provider 與 LINE 不相容，評估 **Better Auth** 的 LINE provider + Cloudflare Worker/D1，但不得同時部署兩套身份系統。

不能將 Channel Secret 放在 GitHub Repository、前端設定或 GitHub Pages 靜態檔案。OAuth 重導向應以實際正式/測試網域設定，包含測試用的 Supabase OAuth callback；callback 尚未註冊或經人工授權前，**G1 BLOCKED**。真正的使用者登入不可由假 token 或 mock 取代。

## SQL 邊界與威脅模型

資料表：

| 表 | 權限與用途 |
| --- | --- |
| `characters` | 私有角色 snapshot、擁有者、原生 local id、ruleset、save_version、revision |
| `campaigns` | DM 建立團務；邀請碼只保存 SHA-256 digest，不做明文資料庫欄位 |
| `campaign_memberships` | DM/player membership，角色只由受控 RPC 決定 |
| `character_links` | 玩家主動將自己擁有的角色授權給團務，並可撤銷 |

所有表啟用 RLS，Client 不應取得任意 INSERT/UPDATE/DELETE；`characters` 有 owner read policy，DM 需透過 `list_linked_characters` RPC 讀取**已連結**的角色，並且不能使用該 RPC 寫入。受控 RPC：

- `create_character(payload, import_fingerprint)`：重複匯入應冪等，原生 local id 與雲端 UUID 分離。
- `update_character_cas(character_id, expected_revision, payload)`：只有 owner 且 revision 相同時更新；衝突應提示使用者重新整理並保留草稿。
- `create_campaign(name)`：建立團務、建立 owner 的 DM membership、產生高熵邀請碼（只回傳給建立者一次）。
- `join_campaign(invite_code)`：伺服端核對邀請碼 hash，僅加入 player 身分。
- `list_campaigns()`：回傳去除邀請 hash 的當前使用者團務。
- `link_character(campaign_id, character_id)`：只允許 owner 連結自己的角色。
- `revoke_character_link(campaign_id, character_id)`：只允許 owner 撤回。
- `list_linked_characters(campaign_id)`：只允許該團務的 DM 讀取已連結 snapshot。

SECURITY DEFINER 的固定 `search_path`、`auth.uid()`、函式 EXECUTE 權限、RLS 與 role escalation 防線尚需**真實 Postgres / Supabase 多帳號整合測試**。此外須加邀請碼限速、稽核與濫用防護；PoC 不可上正式服務。

## 驗收與工作流程

`node --test tests/qa-cloud-*.mjs` 及 `git diff --check` 是 TARGETED/source-only、static QA。Do not deploy or merge until the real OAuth, live RLS and end-to-end security gates pass.

正式整合至少還要做：G1 LINE 真實 OAuth；G2 2014/2024 原生 JSON round-trip + PDF 與角色選擇；G3 手機/桌機同帳號跨裝置讀回；G4 不同使用者與 DM 越權測試；G5 revision 衝突與復原；G6 390px/1440px UI 操作與可及性；G7 既有 Creator/功能回歸；G8 GitHub Pages live fresh reload 和可回復的發版證據。任一 FAIL 或 BLOCKED 都不可以合併 main。

**目前 G1、G3、G4、G6、G7、G8 為 BLOCKED/PENDING**：缺少真實 LINE 授權、獨立 Supabase 實例、瀏覽器與正式發布整合證據。靜態測試 PASS 不等於 production readiness。

## rollback / 復原

尚未合併時：只關閉 Draft PR 或刪除功能分支，既有 GitHub Pages 不會改動；原始本機 JSON 維持不變。測試雲端資料要另外備份/清理，不得當成已正式同步。日後若整合前端，必須能以功能旗標停用雲端入口、保留手動 JSON 匯出與訪客模式；發布失敗回退到已驗證的 GitHub main commit，避免覆蓋任何玩家裝置上的本機資料。

最後：此 PoC 的持有者只管理新功能分支，不得直接推送 main、部署 Pages、修改其他施工線或把缺少真人證據的 QA 標為 PASS。

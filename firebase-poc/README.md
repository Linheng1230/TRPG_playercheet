# D&D 5R × Firebase：Google 登入與 GM 團務隔離 PoC

這是 **PR85 的衍生技術驗證，不是正式後端遷移**。它沿用既有原生角色存檔格式與唯讀角色卡元件；**不修改正式 Convex、GitHub Pages 或玩家資料**。Firebase 測試專案 `dnd5r-55d99` 已啟用 Google 登入並部署先前版本的 Rules；本分支新增的可復原刪除功能仍必須通過完整 QA 與部署讀回才算上線。

## 已實測（2026-11-21）

| QA 路徑 | 結果 | 驗證範圍 |
| --- | --- | --- |
| 2014 v9／2024 v10、軟刪除狀態與來源檢查 | 9/9 PASS | Vitest |
| Firestore Emulator ACL／資料保留 | 10/10 PASS | 實際 Firestore Security Rules（Auth＋Firestore 同時啟動） |
| Firestore SDK 完整資料流程 | 3/3 PASS | 實際 Firestore Emulator；權限／資料整合合計 13/13 PASS |
| Firebase Auth Emulator Google 登入 → callback → 登出 | PASS | **本機模擬帳號，非真實 Google OAuth** |
| Brave GM＋玩家操作：登入→建團→上傳→分享→查看→關閉→重開→撤銷→刪除／還原→降權 | 14/14 PASS | **兩個本機模擬帳號，真實 UI + SDK + Auth/Firestore Emulators** |
| Brave 320／390／1440px 訪客示範 | 3/3 PASS | 無 JSON 編輯框與橫向溢出 |
| TypeScript／Vite Build | PASS | 本機 SDK 13.4.0 |

## 已實作的三項需求

- **GM 唯讀角色卡**：直接重用 `cloud-free/src/dm-character-sheet.tsx` 與 `dm-sheet-projection.ts`，不讓 GM 閱讀 JSON 編輯框；只讀有成員關係、玩家主動分享的角色快照。Firestore 即時訂閱會在撤銷分享後自動清除列表與已開啟角色卡；GM 降權也會自動隱藏管理介面。
- **關閉／重新開啟團務**：只修改 Firestore `campaigns/{cid}.closedAt`，不刪除角色、團員或既有分享；關閉期間禁止新增成員、分享，玩家仍可撤銷自己的分享。玩家畫面的關閉／重開狀態會透過 Firestore 訂閱自動更新。
- **資料保留**：安全規則禁止客戶端永久刪除角色、戰役和成員，並禁止玩家自己升為 GM。GM 身分由可信任的 Firebase Admin／Console 配置。

- **GM 刪除團務（可復原）**：只將 `campaigns/{cid}.deletedAt` 設成時間戳記並從正常團務清單移除，垃圾桶內可以還原；**不永久刪除**角色、成員、分享或戰役文件。已刪除的團務不可邀請新成員、存取舊分享或更新關閉狀態；還原後原資料恢復存取。舊團務沒有 `deletedAt` 欄位仍視為未刪除。只有戰役擁有者且目前為 GM 才能操作，UI 刪除前必須輸入戰役名稱。

## 測試與啟動

```powershell
cd firebase-poc
npm ci
npm test
npm run build
npm run dev
```

沒有 `.env.local` 時，只提供**不寫入雲端**的訪客示範角色卡與關閉／重開操作。

Firestore Rules Emulator（需 Java 21、Node 24；無須任何正式 Firebase 帳號）：

```powershell
npx --yes firebase-tools@15.37.0 emulators:exec --only auth,firestore --project demo-dnd5r-firebase-spike "npm run test:rules"
```

GM／玩家登入的模擬 UI E2E：啟動 Auth Emulator（9099）和 Firestore Emulator（8089）；本機 Vite 設定 `VITE_FIREBASE_USE_EMULATORS=true`，project ID `demo-dnd5r-firebase-spike`，網址 `http://127.0.0.1:5188`，再執行 `node e2e-emulator.mjs`。**只可在 localhost 啟用 Emulator；腳本會拒絕非本機 Google 授權頁。** 臨時報告置於被忽略的 `qa-output/`。

測試版提供 `npm run test:e2e`（需要已啟動 Auth／Firestore 模擬器與 Google 模擬設定），GitHub CI 也會在 Node 24／Java 21／Chromium 的隔離環境中自動執行瀏覽器 E2E。瀏覽器驗收會拒絕真正的 Google 登入頁，僅允許 127.0.0.1 模擬器。

## 真實 Google 帳號上線需要的最小設定（Human Gate）

1. 連接 Firebase 管理能力或在 Firebase Console 建立**獨立測試專案**，優先使用 Spark，不新增付款或升級。
2. Authentication → 啟用 Google 提供者；註冊 Web App；將實際測試網域設為 Authorized domain。
3. Firestore 使用經 Emulator 驗證的 `firestore.rules`；正式部署規則前仍需確認 ownership、備份與完整安全 Release Gate。
4. 將 `.env.example` 複製為 `.env.local`，填寫 Firebase **公開** Web SDK 設定。不需要也不得提供 Service Account 私鑰、密碼或 OAuth Token。
5. 使用自己的 Google 帳號完成一次真實 OAuth；授權 GM 必須透過可信任的管理端，前端不能自己改角色權限。

## 尚未實作，不能冒充已遷移

- 原 Convex 密碼帳號／UID 與 Firebase Google UID 的安全對應及玩家資料正式遷移。
- 現有**五碼邀請碼**、一次性兌換與防暴力猜測。這個 PoC 暫以 GM 輸入**已登入 Firebase 玩家 UID**進行安全測試；如需正式還原五碼流程，需受信任後端，例如 Cloud Functions（可能涉及 Blaze 計費），不應只靠用戶端 Firestore 查詢。
- 玩家儲存角色後，已分享的快照不會自動更新；需玩家重新分享最新版本。
- DND5R Firebase 測試專案已有一個真實 Google OAuth 帳號，指定使用者 UID 已在受信任後端提升為 GM；**兩個不同真實帳號的 Firebase GM／玩家 UI Live-UAT、可復原刪除的雲端部署讀回、正式雙向資料備份／Rollback 仍為 PENDING**。

本 PoC 是比較候選，不是使用另一服務繞過曾被拒絕的 Convex 正式部署。正式切換需另行合法驗證與授權。

## 2026-11-25：原生創角器 Google 角色同步候選（仍為隔離 PoC）

- 沿用既有 Save v9/v10 與 `users/{uid}/characters/{saveId}`；不建立另一套角色 schema 或資料庫。
- 原生創角器獨立 mount `firebase-creator-sync-root` 由 `creator-bridge.html` 的 Vite manifest 產生，使用已存在的 `loadChar` 與 native Save/localStorage；未改正式 `index.html`。
- 玩家主動選擇一個角色綁定目前 Google UID；不自動上傳整庫。創角／跑團的原生本機儲存之後，以 Firestore transaction 的 revision CAS 更新；只忽略 native Save 的 `ts` bookkeeping 欄位。
- 每次確認的遠端版本保存本機 SHA-256 baseline。無未同步修改的本機舊版可安全 fast-forward；有衝突時停止同步並保留兩份資料，不強制覆寫。不儲存額外完整 Save 或驗證憑證。
- 同一分頁重新整理可恢復既有同 UID 授權；登出、換帳號或停止同步會停用。新裝置登入後，明確選擇角色讀回至原生創角器。既有 localStorage 訪客角色庫並非帳號隔離的加密儲存區；換帳號後 Google 同步面板不顯示他人已綁定角色，也不會自動上傳。
- Firebase Vault 手動匯入同 ID 新版本須確認，並受同一 CAS 保護；目前團務的已同意 GM 分享快照仍可於重新匯入時刷新。原生 creator 自動儲存目前只更新個人角色，不聲稱跨所有團務的 GM 快照即時同步；該 consumer 仍須獨立驗收。
- Auth Emulator 設定非 loopback 時 fail closed；demo 專案禁止落到真實雲端。

### 重新驗收

本機 2026-11-25：TypeScript / Vite PASS；14 個既有 unit PASS；Firestore Rules + SDK 19/19 PASS（其中新 creator-sync 6/6）；最新 main `ca1bb2dd6b3230a09e5c17134e64f4a2ca57193a` 的唯讀原生創角器快照 + 真實 Brave 操作、兩個獨立 browser contexts、Google Auth Emulator 10/10 PASS；既有 GM/player UI 回歸 14/14 PASS。這些是 emulator integration evidence，非正式 Google OAuth 或 Production Live-UAT。

CI 使用既有 workflow 在 demo project 上執行 `node creator-sync-browser.mjs` 與原有 `npm run test:e2e`。測試需要 exact creator source root（`CREATOR_QA_SOURCE`）、SHA（`CREATOR_QA_SHA`）、以 demo 環境變數建置至 `qa-output/creator-sync-dist`，並啟動 Auth/Firestore Emulators。瀏覽器僅允許 loopback 與官方公開 gapi 靜態 script；OAuth popup 必須為本機 emulator handler。

正式發布仍 HOLD：真實 Google 帳號兩個獨立瀏覽器登入、測試專案實際讀寫、Convex 既有帳號/角色/分享對應及備份與 rollback、GM consumer 合約、共用入口 ownership 與正式 Release Gate。不得把此 PoC 用作迴避曾遭拒絕的 Convex Production 操作。正式 main、GitHub Pages、Convex 及既有玩家資料均未改。

### 2026-11-26: exact save acknowledgement and existing GM share consumer

- The previous async Playwright wait predicate could resolve to false before the actual write acknowledgement. The QA producer now awaits the evaluated digest and matching visible revision explicitly. The panel also discloses a newer remote revision and does not overwrite uncommitted local progress.
- After an acknowledged personal save, the client discovers only its own existing membership metadata via an indexed collection-group query, checks exact campaign/member paths, and refreshes existing active shares transactionally. No new share or membership is created. Closed, trashed, revoked and unshared records are not reactivated; unexpected write failures are reported separately from the acknowledged personal save. Membership discovery is list-only and owner-scoped; the new collection-group index and rules remain an isolated candidate, NOT deployed to the hosted Firebase project.
- SDK tests cover six campaigns (two active shares, closed, trashed, revoked, unshared), unauthorized UID and anonymous/unfiltered membership queries, and reopening without re-granting revoked consent. Browser GM consumer QA exercises the real sync panel with a synthetic native Save write; the independent creator suite exercises real native HP clicks. Neither constitutes production or real Google multi-account Live-UAT.
- The current official Convex repository uses username/password identities and native user IDs; no trusted Google UID crosswalk is present. Never map by display name or guess ownership. Hosted migration, identity proof, backup/rollback, index/rules publication and production cutover are NOT VERIFIED. Keep all existing production restrictions; do not treat Firebase as a workaround for a denied Convex production operation.

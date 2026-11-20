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

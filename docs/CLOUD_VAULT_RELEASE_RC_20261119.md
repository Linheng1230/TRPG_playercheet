# D&D 5R｜Convex Free 雲端角色庫 — 獨立 Release Candidate

**狀態（2026-11-19）：Convex Free Production 後端與 Production 靜態 RC 已通過定向 QA；GitHub CI、正式 Pages Live-UAT 與 FVTT Live-UAT 仍為 Release BLOCKED。未合併或部署 Pages。**

## Source of Truth
- 最新 GitHub `origin/main` 出發之隔離 worktree：`D:\Tools\zizi-ai-runtime\worktrees\dnd5r-cloud-pages-rc-20261119`
- 分支：`release/dnd5r-cloud-free-rc-20261119`，移入既有 Convex 免費後端與角色庫經驗證的三個提交。
- 原創角網站 `index.html` 是既有 State、2014/2024、JSON/PDF 的 canonical consumer。現在僅增加「雲端角色庫」導覽鈕，不修改 serialize、deserialize、localStorage、PDF 或 FVTT 規則。
- `home.html` 加入首頁導覽與入口卡；`cloud-free/` 為 React/Vite Source；`cloud-vault/` 是供 Pages 的靜態產物。已驗收 Production RC 靜態產物只指向 **canny-chickadee-40.convex.cloud**；從未公開部署 Pages。

## 本輪發版改動
1. 由 `home.html` 的可見卡片、主導覽和 `index.html` 角色庫視窗連到同一 Origin 的 `./cloud-vault/`；在雲端頁登入前後增加返回原角色卡入口。
2. `scripts/build-cloud-vault.cjs` 以 pinned Convex/Auth 依賴編譯 Vite：
   - 預設產生 `cloud-vault/`，沒有任何可用的 Convex 資料庫端點，避免把 Staging URL 當正式站設定。
   - `--qa-staging` 限定已授權的免費 Staging，輸出到 runtime QA 目錄，不提交到 Git；**不可直接拿 QA 版本發布玩家**。
3. `scripts/prepare-pages-site.cjs` 產生單一已審核的 Pages 發布資料夾，僅包含根目錄網站 HTML、`robots.txt`、`.nojekyll`、`assets/` 及 `cloud-vault/`。
4. 既有 `.github/workflows/pages.yml` 在正式 Pages Upload 前增加靜態打包步驟，將 Artifact 來源由整個 Repository 改為 sanitized output，避免將 `cloud-free/` 後端、Node 套件、測試檔、workflow 或機密暴露成網站檔案。
5. 保留玩家 JSON 原文與既有角色庫 State；同步仍須玩家主動上傳或下載，碰到衝突保留原本版本、另存副本。

## 本輪新增 QA 實證
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\convex-pages-rc-20261119\rc-pages-browser-qa.json`：**12/12 PASS**，Brave 320／390／1440px 真實首頁卡片、創角角色庫、登入，2014/2024 JSON 上傳與下載、存回角色庫及載入。
- `sanitized-pages-qa.json`：**8/8 PASS**，發版安全包可正確從首頁及原角色庫開啟並返回，未設定雲端連線時不顯示假登入；HTTP 404 防止存取 Convex 後端與 QA 來源，JS／CSS 皆從同 Origin 載入。
- `pages-artifact-audit.json`：139 個檔案、約 55 MB，靜態白名單與 PDF 核心資產 SHA read-back PASS。
- `targeted-regression-result.json`：原站 Save migration、2014 matrix、2014 PDF、2024 export/spell UI **4/4 PASS**。
- `targeted-pdf-fvtt-env-repaired.json`：2024 PDF layout 與 creature import **2/2 PASS**；另 `qa-magic-item-import.js` PASS。
- 先前已通過 13/13 Adapter、10/10 same-origin browser、3/3 Creator serialization、14/14 Convex Hosted/Local、5/5 舊版手機與 10/10 原雲端前端，本輪未重跑未改動範圍。

## 缺口與禁止事項
- 使用者提供官方 Convex Billing 截圖確認 **Free／Current Plan／No credit card required**。原已存在且無資料表的 Production `canny-chickadee-40` 已經授權部署；23 個函式、4 個 Auth 元件，以及 14/14 Production 合成玩家權限測試 PASS。RC 正式候選靜態網站只包含此 Production URL，未部署至正式 Pages。
- GitHub Checks 尚未針對 RC 遠端分支執行；Actions YAML 只完成本機預檢，**不能宣稱 CI Gate PASS**。
- 正式 GitHub Pages 尚未部署，沒有正式網址 fresh reload／Live-UAT；實際 Foundry World 的 FVTT Live-UAT 未執行。既有 JSON 與 PDF/FVTT consumers 未修改，定向網站匯入 QA 已通過。
- **不合併 main、不部署 Pages、不修改 Draft PR #47、不開立或升級任何付費資源、不輸入信用卡，不動本機 dirty main 及其他工作區。**
- 帳號復原暫不做，這是使用者已接受的 V1 產品決定；仍須讓玩家知道失去密碼可能失去雲端帳號，請保留完整 JSON 備份。

## 下一步 Release Gate
免費 Production 已建立與驗證；目前待對齊最新 `origin/main`、執行 GitHub Checks 與有影響範圍的 2014／2024、PDF／JSON／FVTT 回歸，完成真實網站部署後的 Live-UAT 才能申請合併／Pages 發布。此次仍不得合併或部署 Pages，正式 Release 維持 BLOCKED。

## 2026-11-19 Production 增量 Gate（本次新增）

- Billing：使用者提供 Convex Team henry861230 的官方 Free／Current Plan／No credit card required 畫面，驗收 PASS；沒有信用卡或付費資源。
- Backend：已存在且部署前無任何表格／函式的預設 Free Production `canny-chickadee-40`，Convex Auth v2 部署 TypeScript／索引／4 元件及 23 函式 read-back PASS。
- QA：`cloud-free/tests/local-integration.mjs` 以 Local／Staging／Production 三種**明確允許**的 URL 共用同一套 14 項權限測試；Production 合成帳號 14/14 PASS，實證獨立保存於 runtime `production-integration-14of14-20261119.json`。
- Production 網頁候選：`scripts/build-cloud-vault.cjs --release-production` 必須精確指定 `VITE_CONVEX_URL=https://canny-chickadee-40.convex.cloud`，禁止混入 Staging；產物打包後 139 個檔案，且 Pages whitelist 仍禁止釋出後端原始碼或機密。
- Brave 320／390／1440px：Production 候選 `prod-browser/rc-prod-browser-qa.json` 12/12 PASS，包含 2014 v9 與 2024 v10 JSON 完整上傳、下載、回填原創角頁。新版原創角規則版本 Modal 先關閉再操作，保留原本功能。
- 最新 main `736b2b5` 影響的 12 職業 × 2014／2024 × 手機／桌機技能測試，使用已安裝 Brave 執行原斷言 PASS；Save migration／2014 PDF／2024 PDF layout／2024 export 共 4/4 PASS。
- 隔離 RC 仍需對齊更新中的最新 main、取得 GitHub CI 與正式 Pages Live-UAT；本輪**沒有**合併／部署 Pages，沒有修改 PR #47。

## 最新 origin/main 51f1a7f 差異驗收

- 隔離 RC 已 rebase 至 `51f1a7f`，未碰正在運作的 Mobile Run P0 施工線或 dirty main。
- 最新 main 更新 `assets/creator-spell-glance-2024.js`、`index.html` 與 Pages／Creator QA workflows；影響範圍的新測試 `qa-creator-spell-glance-391-20261119.js`、`qa-creator-spell-glance-browser-20261119.js`、`qa-creator-spell-preview-2024.js` **3/3 PASS**，使用本機已安裝 Brave 執行原測試，不變更測試斷言。
- Production 候選最新 RC 仍保留 14/14 後端授權與 12/12 真實瀏覽器結果；本機測試不是正式 Pages Live-UAT。只有在獨立 Draft PR 的 GitHub Checks 以及正式 Live-UAT 全部 PASS，且另有部署授權時，才可考慮發布。

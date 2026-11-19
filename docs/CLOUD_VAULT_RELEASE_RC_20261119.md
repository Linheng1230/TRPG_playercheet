# D&D 5R｜Convex Free 雲端角色庫 — 獨立 Release Candidate

**狀態：RC Staging Gate PASS，正式 Release Gate BLOCKED。未推送、未合併、未部署。**

## Source of Truth
- 最新 GitHub `origin/main` 出發之隔離 worktree：`D:\Tools\zizi-ai-runtime\worktrees\dnd5r-cloud-pages-rc-20261119`
- 分支：`release/dnd5r-cloud-free-rc-20261119`，移入既有 Convex 免費後端與角色庫經驗證的三個提交。
- 原創角網站 `index.html` 是既有 State、2014/2024、JSON/PDF 的 canonical consumer。現在僅增加「雲端角色庫」導覽鈕，不修改 serialize、deserialize、localStorage、PDF 或 FVTT 規則。
- `home.html` 加入首頁導覽與入口卡；`cloud-free/` 為 React/Vite Source；`cloud-vault/` 是供 Pages 的靜態產物。離線／發版安全版本**沒有設定 Convex URL**。

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
- 正式角色雲端的 **Production Convex URL 未建立／未授權**。正式安全包目前刻意不可登入；實際可用的是授權免費 Hosted Development 測試環境。
- GitHub Checks 尚未針對 RC 遠端分支執行；Actions YAML 只完成本機預檢，**不能宣稱 CI Gate PASS**。
- 正式 GitHub Pages 尚未部署，沒有正式網址 fresh reload／Live-UAT；實際 Foundry World 的 FVTT Live-UAT 未執行。既有 JSON 與 PDF/FVTT consumers 未修改，定向網站匯入 QA 已通過。
- **不合併 main、不部署 Pages、不修改 Draft PR #47、不開立或升級任何付費資源、不輸入信用卡，不動本機 dirty main 及其他工作區。**
- 帳號復原暫不做，這是使用者已接受的 V1 產品決定；仍須讓玩家知道失去密碼可能失去雲端帳號，請保留完整 JSON 備份。

## 下一步 Release Gate
須另外取得正式免費 Production Convex 環境的明確授權、進行憑證／費用及網址查核，從官方可重現流程編譯 Production 靜態檔。再於獨立 release 工作線完成 GitHub Checks、2024／2014、PDF、JSON、FVTT 及 320／390／1440px 正式瀏覽器驗收。全部 PASS 才可申請合併與 Pages 部署；此前保持 BLOCKED。

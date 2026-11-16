# D&D 5R｜角色創建水彩美術 Golden Sample（2026-11-16）

**狀態：Golden Sample 的 TARGETED／INTEGRATION QA = PASS。尚未合併或部署，Live UAT = NOT RUN（本輪明確禁止）。**

本輪做的是既有 D&D 5R 前端的精準美術修復，**不重建設計系統、不改 2014/2024 規則、角色 State、PDF、JSON 或導覽資訊架構**。目前截圖由 AI 逐張檢視，但沒有使用者核准的像素級美術 Golden，因此把對原始 main 的截圖差異當成證據，不把差異變小當成通過條件。

## 1. Source of Truth／隔離施工

- 正式 GitHub Repository：Linheng1230/TRPG_playercheet。工作根目錄 D:\Repositories\trpg-playercheet-private 有其他施工線未提交修改，**本輪未修改其檔案**。
- 專案規則：README.md、PROJECT_RULES.md、docs/WATERCOLOR_VISUAL_SYSTEM.md。
- 施工 worktree：D:\Tools\zizi-ai-runtime\worktrees\trpg-visual-skill-golden-20261116
- 分支：feat/visual-skill-golden-20261116，原先建立自 origin/main 39a483d；本輪 QA 完成後在自己的隔離分支重放至更新後的 origin/main a386cc1，仍未合併或部署。
- 2026-11-16 19:35 核對 origin/main 85c222f：相關水彩圖集／CSS 未變；另建 **detached shadow main 85c222f**，僅覆蓋本輪 CSS＋圖集＋測試後重跑 Golden Sample，三種尺寸 PASS。影子工作樹已清理。其後 origin/main 再前進至 a386cc1（只有法術戲法腳本、index.html 引用及對應測試變更），本功能分支再安全重放至 a386cc1，Golden Sample 三尺寸再次 PASS。
- 任何未通過的新門檻不得修改 main 或部署 Pages。後續合併前仍須以當時最新 main 重跑正式 Release Gate。

## 2. 實際修改（最小邊界）

| 檔案 | 功能 |
|---|---|
| assets/illustrated-watercolor-ui.css | 只限制在 #classGrid .pick-card；標題與內容採固定上方流向，描述 15px、行距 1.7，手機／桌機保留足夠插畫間距；不改字體家族與共用語意配色 |
| assets/watercolor-class-icons-source.webp | 原始 RGB 672×270 圖集，保留不可變來源、可重新產生 |
| assets/watercolor-class-icons.webp | **同路徑、同尺寸、同 4×3 格位置的 lossless RGBA WebP**；既有 CSS URL／tile identity 不需改 |
| scripts/build-watercolor-transparent-atlas.py | 從原始素材用 Pillow／NumPy／OpenCV 技術性前景分離；移除原圖的矩形紙底與兩條非圖示裝飾線，光學重心定位、避免裁切，支援重複建置；僅建置時需要 Python 套件，網站執行時不需 |
| tests/qa-creator-visual-golden.js | Playwright Chrome 真實頁面測試（1440×900、390×844、320×700），記錄 before／selected 截圖、metrics.json、差異比例；驗證 12 職業、真 Alpha、繪製像素、角落透明、光學中心 ≤8px、字級／行距、無重疊溢出、CSS 選取前後不漂移、職業確認與網頁錯誤 |

### 圖示來源完整性

沒有採用重新生成的圖示候選（與原畫筆觸、比例不同）。原始美術資料逐像素保留在 -source.webp。輸出由原始 RGB 與計算所得 Alpha 直接組合，只在 168×90 單一 tile 內平移；輸出在無損 WebP 讀回後，Alpha 及所有 **可見 RGB** 都與編碼前一致。

- 原始圖：672×270、RGB、Alpha 不存在。
- 新圖：672×270、RGBA；真正接近完全透明的像素 82.78%；Browser Canvas 以 alpha <240 判定為透明的像素 87.564%。
- 建置重跑 SHA-256 **完全一致**（deterministic）。
- 12 個 tile 裁切損失上限：每張 <0.2% Alpha 質量（建置腳本 assert）；實際執行 PASS。
- 圖示背景不再帶方形米色紙塊，原創水彩與 12 職業識別均保留。

## 3. Skill／工具採用結論

| Upstream | Pin／授權 | 本輪決策 |
|---|---|---|
| Impeccable | pbakaus/impeccable d41d986，Skill 4.9.2，Apache-2.0 | **BORROW**。已實跑 context，參考 layout／typeset playbook；在 CSS 上跑 layout、type detector 均回傳空陣列 []。未強制建立第二套 DESIGN.md、PRODUCT.md 或新全域 hook |
| Frontend Design | anthropics/skills 1780c5e，frontend-design，Apache-2.0 | **BORROW**。作為「既有視覺世界、繁中字體與可讀性優先」的設計準則，不重做原創水彩設計 |
| Playwright | 使用專案現有 Playwright 與已安裝 Chrome | **REUSE＋補足 QA**。不新增 MCP／Agent 或另一套測試框架 |

Impeccable 機械 detector 沒有發現問題，不等於完成圖像透明與視覺驗收；必須看 Browser Canvas、DOM 座標及截圖。此項已有實際證據。

## 4. QA 證據（來源／畫面獨立核對）

| Gate | 結果 |
|---|---|
| 原始 Golden Sample 基準 | **FAIL**：桌機／390／320px 合計 54 項問題（Alpha、文字 12px、重心、間距等） |
| 目前獨立分支 Golden Sample | **PASS**：1440／390／320px 各 0 項 FAIL，包含 12 張圖示、實際透明、選取／確認 |
| 更嚴格光學中心 | **PASS**：容許偏差 ±8 CSS px；桌機最大 7.5px、390 手機最大 6.1px、320 手機最大 5.4px |
| 文字 | **PASS**：職業描述 >=15px、行距 1.7，無水平溢出；圖示與標題間距符合測試 |
| 原有水彩展示頁 | **PASS**：1440／480／390px |
| 原有插畫整合 | **PASS**：首頁／創角，320／390／480／1440px，共八組頁面／尺寸 |
| 原有創角 UX 回歸 | **PASS**：390／480／768／1440px，包括 preview、confirm/lock、origin、subclass、viewport resize |
| 原有插畫像素可見性 | **PASS**：四組首頁／內頁桌機手機像素比較 |
| origin/main 85c222f 影子相容性 | **PASS**：額外三尺寸全 0 項 FAIL |
| 最新 origin/main a386cc1 重放後專項驗收 | **PASS**：額外三尺寸全 0 項 FAIL |
| Impeccable layout／type detector | **PASS（機械掃描）**：[]／[] |
| git diff --check／Node JS syntax／無損圖集讀回 | **PASS** |
| GitHub PR／合併／Pages 部署／Live UAT | **NOT RUN**（使用者明確禁止，不能當作 FAIL 或虛報 DONE） |

原始 main 截圖與修正版比較，因文字放大使整頁高度改變，測試採用**共同可重疊區域的像素差異**，另外保存兩邊頁面大小；修改後 desktop 約 12.99%、390px 約 23.61%、320px 約 23.11% 像素改變。這些是描述性差異，**不是**未經使用者核准的金標視覺一致性 PASS。

證據統一目錄：D:\Tools\zizi-ai-runtime\visual-skill-golden-20261116

- alpha-strict-1935/metrics.json、alpha-strict-1935/creator-*-before.png、creator-*-selected.png
- shadow-main-strict-1935/metrics.json
- regression-1935/summary.json 及每個子測試 *.log、visibility 圖檔
- alpha-build.json（原始／輸出 SHA、圖示平移與裁切量）
- baseline/metrics.json、baseline 截圖、alpha-trials 試作及其他階段紀錄

## 5. 重跑方式與尚未執行的發布

在本 worktree 使用 PowerShell：

    Set-Location 'D:\Tools\zizi-ai-runtime\worktrees\trpg-visual-skill-golden-20261116'
    $env:NODE_PATH='D:\Repositories\trpg-playercheet-private\node_modules'
    python scripts/build-watercolor-transparent-atlas.py
    $env:VISUAL_GOLDEN_PHASE='verify-next'
    node tests/qa-creator-visual-golden.js
    git diff --check

其餘既有回歸測試在沒有 Playwright 內建 headless shell 的機器使用 Chrome 隔離副本，並已記錄完整輸出；正式測試檔未為了 PASS 而改掉判斷條件。

**本輪定義的 Golden Sample 已完成驗收，但尚未 Release。** 如需正式整合，下一步在當時最新 main 上建立獨立 release candidate、執行既有 38 項 Release Gate 與相依 UI／PDF／JSON 回歸、PR review／圖像人工確認，通過後才由明確授權的獨立發布施工線合併部署；不得從本實測直接發布。

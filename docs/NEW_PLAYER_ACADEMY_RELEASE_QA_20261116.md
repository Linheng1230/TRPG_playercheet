# 90｜新手學院整合 QA 與正式站發布 Gate（2026-11-16）

狀態：**BLOCKED / 技術基線與獨立 QA 準備中**。本文件由 90 擁有，不是 00 總控契約，也不替 10／20／30／40 宣告 Done。
Source of Truth：本 Repository、PROJECT_RULES.md、docs/MAINTENANCE_AND_EXTENSION_GUIDE.md、既有 5RTools pinned snapshot、實際瀏覽器與 GitHub Pages Runtime。
20 規格：docs/NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md（文件自述 DESIGN SPEC / NOT IMPLEMENTED / NOT DEPLOYED；必須用實物驗證）。
驗收入口：tests/qa-new-player-academy-intake.js（**只作 fail-closed intake，不是部署核准**）；案例：tests/fixtures/new-player-academy-qa-cases.json。
獨立證據輸出：D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\。不得以檔名、worker 自述或舊 PASS 推定已實作。

## 1. 發版前凍結的 Acceptance Criteria（90 專用）

- **G0／交付契約**：00 正式定稿的介面與路徑、10/20/30/40 ownership、跨頁連結、完成定義、版本與 QA 交接清楚；20 設計契約可追溯。確認檔案原文、Git status、現行程式，不能只驗收 Markdown 的存在。
- **G1／10 新手創角教學**：真實步驟與現有 Creator 一致，2024 種族／背景／屬性／調整值／職業／技能檢定有零基礎繁中說明、至少一個具體例子、明確下一步；手機可讀；不自建第二套創角狀態或 2024 規則。
- **G2／20 職業適性測驗**：10 題×4 選項，單選、改答、重測、跳過、上一題／下一題；推薦 3 個互不重複職業，包含 3 級未來子職業、背景／物種建議、根據答題的具體理由、玩法、取捨與 CTA；推薦不能提前授予子職業能力，不能繞過創角不可逆確認。需實測 **12 職業各有可達 Top-1**、**48 子職業可被推薦或具可解釋選擇策略**，測試 corpus 含前線、魔武、純施法、支援、潛行、荒野、社交、學術、契約、爆發、混合與矛盾偏好；驗證 tie、背景屬性相容、2024 物種不加屬性、缺失選項 fallback 與答案敏感度。
- **G3／30 雙向創角整合**：教學→既有 Creator→回到正確教學步驟→返回創角、測驗→套用建議→原創角確認；逐步往返、跳過、返回、reload/read-back。不得生出第二個 S state、serializer 或繞過既有鎖定；需確認 JSON 匯出保持 stable ID、選擇與版本隔離。
- **G4／40 第一次跑團教學**：零基礎解說實際一回合、行動／附贈動作／反應、能力檢定、豁免、命中、傷害、走位／資源、短休／長休等，附實例與下一步；規則回到 canonical 2024 與既有網站，只教學與查詢、不擴增自動戰鬥結算。
- **G5／整體 Regression**：G1–G4 真正 producer tests + source/runtime integration；PROJECT_RULES.md 相關 tests、12 職業×20 級與 48 子職業×3–20 級 1,104 case matrix、exhaustive spell/choice、2024 儲存→JSON 匯出→再匯入→reload、2014 matrix 與 2014 PDF、2024 PDF 實際 raster，以及 git diff --check。既有非本線失敗需標注來源、不得擅自修他人模組，也不得 false green。
- **G6／真實可視化 UAT**：1440×900、390×844，另含 480px 窄視窗；各入口及中途切換、彈窗/tooltip、中文 15px 以上正文與清楚對比、無不可操作的水平溢出、點擊區與鍵盤焦點；自動 DOM 斷言 + **實際 screenshot 人眼審查**。沒有真實畫面不能 PASS。
- **G7／安全部署與 Live parity**：四條線完成、ownership handoff、shared target lease 放行、Git diff 精確歸屬、無他人混入提交。依 PROJECT_RULES.md 指定發版路徑執行 Source→測試→GitHub Pages Live→fresh reload，核對最終 HTML、相關 JS/CSS hash、載入 script 版本與同一功能在正式 URL 可見；若頁籤仍是舊版須 REOPEN。不得把本機 QA 當 Live。
- **H1／教育效用真人測試（獨立標籤）**：若未有零基礎真人完成端到端的觀察紀錄，固定標 **PENDING 真人教育效果未驗證**；不能用自動測試推論理解效果。若 00 契約將其列為發布必需項，亦會阻擋 G7。

**批准條件**：G0–G7 全部具獨立可重跑 evidence、實際版本指紋、release receipt；任何 PENDING／FAIL／不明 ownership／shared file dirty 未隔離，發版為 BLOCKED。無條件禁止部署半成品。

## 2. 本輪 Intake 實測（2026-11-16，非已完成證據）

- 查詢 Repository 文件／相關檔名：**僅看到** 20 的職業適性測驗設計規格，未看到獨立 00 契約、10/20/30/40 正式模組與專屬測試。此為當下檢索結果，不等同判斷他人尚未在其他工作階段完成。
- Git main 相對 upstream/main **ahead 58、behind 13**；index.html、ability-lookup.js、character-sheet-export.js 與多個測試等已有他人修改。此線**不 checkout/reset/add/commit/index/edit 他人檔案**。
- 20 規格自述尚未實作；直到實際 modules、integration、test reports 與 browser 裁決完成前，一律不得把「規格完整」視為 PASS。
- 00 契約與整合端未出現前，**只跑現有網站的 read-only baseline**，不得跑半成品部署。
- 90 唯一可寫：本文件、tests/qa-new-player-academy-intake.js、tests/fixtures/new-player-academy-qa-cases.json，以及 runtime/new-player-90 專屬測試產物；取得 TTL lease 再寫。
- **已執行基線（獨立測試入口 http://127.0.0.1:18990/index.html）**：`qa-save-migration-fixtures.js`、`qa-2014-matrix.js`（含 2,340 cartesian）、`qa-stage0-runtime.js`、`qa-2014-pdf.js`（Lv1/Lv20）、`qa-2024-export-and-spell-ui.js`（隔離輸出副本）、`qa-pdf-export-fixes.js`（隔離輸出副本）、`qa-pdf-critical-raster.py`（隔離輸出副本）均實測 exit=0。原站 index.html 前後 SHA-256：`4A1AA102ED5BD18A3DEC34A2383402DF021953B07B0AF92589A4F207C9A8BC47`。此 PASS **只屬原站基線**。
- **視覺 baseline**：1440×900、390×844、480×850 已完成實際 Playwright 截圖與程式 console/overflow 記錄，`overflow=0` 且無 pageerror；`academyTerms=0`，因此**不是**新手學院視覺 UAT。測試日誌、截圖及 JSON 位於 `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\`。

## 2A. 施工中重新盤點與 TARGETED QA（2026-11-16）

**這份新證據取代 §2 舊檔名掃描的「未找到」快照。** 00 已建立 docs/NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md v1，明示文件契約交接但四線尚未整合；30 已建立 docs/NEW_PLAYER_ACADEMY_INTEGRATION_PLAN_20261116.md，標示 PARTIAL / SOURCE-ONLY。00 contract 仍不得當作 Live 成果。

90 直接執行下列 Producer 單測，且測試前後來源檔案 SHA-256 一致：

| 線 | 實際測試 | 結果 | 限制 |
| --- | --- | --- | --- |
| 10 | tests/qa-new-player-academy-content.js | TARGETED PASS：14/14、10 章／27 主題 | Source-only |
| 20 | tests/qa-class-fit-quiz-5r.js | TARGETED PASS：10,213 assertions、12/12 Top-1、48/48 子職業 | Source-only |
| 30 | tests/qa-new-player-academy-bridge.js | TARGETED PASS：15 項 | Mock bridge，不是跨頁 UI |
| 40 | tests/qa-first-session-tutorial-5r.js | TARGETED PASS：540 項、3 情境／21 選項 | Source-only |
| 90 | tests/qa-new-player-academy-quiz-corpus.js | TARGETED PASS：14 組獨立 corpus、12/12 Top-1、48/48 子職業 | 實際 Creator catalog，沒有整合 UI |

20 設計文件早先的 NOT IMPLEMENTED 標記是舊規格文字，純模組實際已出現並通過上述單測；不能再把舊描述當目前檔案事實。但不代表完成 UI、部署或真人測試。測試 log 和 90 JSON 在 D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\。

新一輪檢索時，30 剛建立 academy.html 和 assets/data/academy-catalog-2024.js；但 academy.html 參照的 assets/new-player-academy.css 和 assets/new-player-academy-app.js 尚未存在。這是並行施工中快照，不能認定實際頁面就緒。後續 intake 重跑時 CSS 已建立，但 assets/new-player-academy-app.js 仍缺（以該次 JSON evidence 為準）；90 intake 增加 referenced asset 檢查，等 30 owner handoff 後才能執行 00 A01–A16 整合／Live QA；不碰 30 的 owned source。

另外直接執行 30 新增的 tests/qa-academy-catalog-2024.js，檢查 upstream build --check、12 職業／48 子職業／16 背景／10 物種和實際三張推薦且不自動確認，exit 0，前後 catalog SHA-256 未變。這僅是來源 catalog TARGETED PASS。

**最新一次 fail-closed intake 更新**：academy.html 所列的 JS/CSS 檔案已全數出現（missingAssets=[]），但仍不等於可操作 UI、與 Creator 已接好或已完成 30 ownership handoff。維持所有 integration/live gate PENDING，PDF guard FAIL，release BLOCKED；原先缺檔記載保留為當時施工中快照。

## 2B. 2024 PDF False PASS：整體 Gate 仍 BLOCKED

既有 2024 PDF export 及 critical raster smoke 皆 exit 0，fit report 對 species 回報 overflow=false；但 90 親自檢查兩頁 PDF render 及文字讀回，矮人物種「矮人剛毅」最後的「級時再加1」在第一頁種族特性框被截斷，第二頁未接續。這是既有 PDF 測試的假 PASS。

90 新增 tests/qa-new-player-academy-pdf-visibility.py，直接抽取正式輸出 PDF 並比對 fit.species.text：**exit 1、FAIL**，classification=FALSE_PASS_FROM_FIT_REPORT、tailVisible=false、fullTextVisible=false、fitClaimsNoOverflow=true。證據位於專屬 runtime 的 pdf-visibility-guard.json、pdf-export-fix-smoke.pdf、pdf-2024-firstpage.png 和 pdf-2024-secondpage.png。

已確認的 verifier 根因是 **驗證覆蓋缺口**：既有 fit/raster 未比較文字實際末尾是否可見。造成裁切的 producer 完整根因待其 owner 修；90 不寫入其他線擁有的 PDF exporter 或測試。須由 owner 修 producer 並擴增正式 Regression，再由 90 重跑 PDF 完整視覺、read-back 才可撤銷 FAIL。任何原有 PDF PASS 都不能覆蓋此真實 FAIL。

## 3. 證據與回歸執行順序

1. **Preflight**：固定 Git HEAD、dirty list、每個功能檔的 hash、00／20 實際契約；稽核獨立 QA 來源與 producer 測試；記錄 G0–G4 初始 PENDING，不推定通過。
2. **Read-only baseline**：用私有本機 HTTP 伺服器與 fresh Playwright context 跑既有 qa-save-migration-fixtures、qa-2014-matrix、必要的 stage0/runtime；log + 命令 + 退出碼 + snapshot hash。不覆寫 18766 或其他工作線正在使用的伺服器。
3. **Integration ready**：等 10／20／30／40 提交精確 changed-file 清單、entrypoint、selector/API contract、producer QA 及版本後，90 重跑而不是信任自述。補新手專用 Playwright 行為腳本；20 使用固定 QA corpus 與生成 coverage search，報告真正可達 12/48 個數，不以 seed 數充數。
4. **Regression**：執行既有 release-gate.py 與專案新增必要 tests；若其他線正改動相關 shared source，先等 handoff/rebase，避免競態讀出混合版本。
5. **Release**：取得 00 發版授權／安全 lease，精準 stage 自己擁有的或已正式交接且驗證過的檔案；不採用 git add .。保留發版 commit、live HTML/script hash、fresh reload screenshot、瀏覽器 console 及正式站功能實測。
6. **False PASS 處理**：實際 Runtime 不符任何 checkpoint 的 PASS 時，立刻 REOPEN，追出 producer／驗證 target／舊快取或 state writer 原因，增回歸後重跑；不修改來源事實以迎合報告。

## 4. 暫時 Blockers / 解鎖條件

- **B00**：00 的正式整合契約與 ownership 清單須能讀到；從文件與實際合約內容確認。
- **B10／B20／B30／B40**：各線須交付可執行功能及真實 producer QA 證據；目前已知 20 只有設計規格。
- **BLease**：index.html／共用檔案仍有未歸屬 dirty 變更，未隔離前禁止 release。
- **BLive**：G0–G6 未完成，不做 publish。使用者無需重貼任何指令；90 可從 durable task `dnd5r-new-player-90-qa-20261116` 與本文件接續。



## 5. 2026-11-16 90 接續驗收（本節為最新結果）

**結果：LOCAL INTEGRATION／REGRESSION PASS；G7 DEPLOY BLOCKED。** 舊快照「只有 20 設計文件」、最初 PDF FAIL 已被本輪最新實際 QA 證據取代，不代表已部署。

### PDF exporter 正確 owner 修復

獨立任務 ID：trpg-pdf-exporter-2024-visibility-owner-20261116。於 exact target lease 下修復，保留 exporter 原有其他施工線的 exclusive-choice diff；Codex CLI 曾遇用量限制，改以精確單點修改而非批次覆蓋。2024 物種特性欄最大 7pt、lineHeight 1.42、pad 5，原始完整規則不刪減。producer 的 qa-pdf-export-fixes.js 已增加真實 PDF 頁面文字讀回（失敗即 FAIL），支援 QA_PDF_DIR 獨立輸出；qa-pdf-critical-raster.py 也支援相同隔離路徑。**新的真實 2024 PDF 末尾「級時再加1」已可讀回**，producer 出口 0、speciesVisibility.exitCode 0、fullTextVisible true，第一頁與第二頁 raster 已開啟目視抽查。2014 Lv1/Lv20 PDF 亦通過。這是本機修復，尚非正式站。

### 30 整合／新手學院真實操作與既有回歸

- Repository 實際存在 academy.html、30 App/Creator bridge、CSS、衍生 catalog，以及 10/20/40 內容與 QA。30 producer GUI QA 和 90 獨立 HTTP QA 均真正從 Home 點擊，完成 390px、480px、1440px 的教學→Creator step2→返回／reload、10 題問卷→三卡推薦→返回、跑團情境練習；pageerror 0、水平 overflow 0。90 另有 HTTP 可視化 PNG（http-academy-start/results/practice-寬度.png），已實際打開檢查。
- 90 逐一以真實 HTTP 入口載入 13 個 view route × 桌面／手機共 26 條，deep-link-http-uat.json = 26/26 PASS。
- 12/12 職業可達 Top-1、48/48 子職業可達；14 組獨立測驗 corpus。完整 1,104 角色矩陣、spell progression、subclass spell parity、choice exhaustive、2014 matrix、Save migration、stage0 reload/JSON、module smoke 均通過。
- 原先 Release Gate 38 項中 1 FAIL 是舊的 runtime E2E 腳本仍尋找已不存在的 #confirmAbilities；實際 Creator 現行以 abilitiesReady() 控制 #next2。90 先在隔離副本驗證，之後取得該 QA 驗證器 exact target lease 才修改原 runtime 腳本，改成檢查 #next2 可操作並正常點擊；支援 QA_E2E_REPORT 獨立輸出。正式原始 release-gate.py 已重新執行，**38/38 EXIT 0、0 FAIL**，最新報告位於 D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\release-gate-official-source.json。git diff --check PASS。

### Git 安全分離仍阻擋 G7

- index.html 含大量其他工作線未提交 hunks（並非只有 30 兩個 script）；assets/character-sheet-export.js 同時含既有 exclusive-choice 修改與本次 PDF owner 修復，**不能整檔 stage**。
- home.html、assets/watercolor-site-bridge.js、assets/watercolor-visual-system.css、assets/watercolor-icons.svg 都仍為 untracked 共享視覺／導覽依賴；本機 PASS 是在這組混合來源上跑過，不能直接將全部當成學院擁有的變更。
- main 相對最後一次 fetch 的 upstream/main 顯示 ahead 58、behind 13。不能在未取得乾淨候選與跨 owner 歸屬證據時 push 或 force push。
- 19 個檔案的安全隔離稽核與 hash 位於 new-player-90\release-isolation-audit.json。接下來必須取得 shared dependency 的 exact owner handoff、乾淨獨立 release candidate，重新對該候選跑完整 Gate，然後才可 Source→GitHub Pages→fresh reload 同版本 Live UAT。缺少零基礎真人實測，H1 單獨 PENDING。
- 發布狀態 **BLOCKED**；本輪沒有 git add、commit、push、GitHub Pages deploy，不混入他人未提交變更。



## 6. 正式來源 origin/main 隔離候選 QA（本節為最新）

2026-11-16：90 建立 detached candidate worktree，基於 origin/main 405591f，位於 D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\release-candidate-origin-main；原施工工作樹完全未 checkout、reset 或清除。只明確複製 Academy 相關 24 個檔案，對 candidate 的 home、index 加入小型導覽／橋接，並保留 origin/main 現有水彩視覺系統，不複製其他人的共用變更。

候選已重生 canonical catalog（12 職業、48 子職業、16 背景、10 物種），catalog parity PASS；候選 390／480／1440px 真實學院 GUI QA PASS，2024 PDF 實際全文抽取與 raster PASS。

**新發現的關鍵整合 FAIL**：origin/main 的 watercolor-site-bridge 有 play step11、characters step12、adventures step13；00 契約與 30 AcademyBridge 尚將 characters 設為11、adventures 設為12。初次候選實際 HTTP routes 26 條，4 次錯誤（桌機／手機各2次）。90 只在自己的隔離 candidate 試作兩行 Bridge 映射調整並驗證 Bridge 15 項 PASS、候選 14 routes ×2＝28／28 HTTP PASS；00/30 正式 owning source **沒有被 90 覆寫**。這是須由 00／30 owner 正式交接的 root-cause 契約失配。

原 release-gate.py 固定舊 source ROOT，不能直接宣稱是候選 Gate。90 另建立真正 candidate-root Gate，38 項中 37 PASS、1 FAIL 來自舊 runtime E2E selector；候選 origin/main 現行要求職業、屬性、語言依序最終確認。90 已在隔離 E2E 腳本按當前 UI 真實點擊三個確認鈕，桌機／手機 E2E PASS；尚須對最終同一候選重新執行正式全套 Gate。完整 owner handoff 與證據於 D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\OWNER_HANDOFF_00_30_ROUTE_DRIFT.md。

**正式站發版狀態仍 BLOCKED**：00 契約／30 原始模組需由 owning workstream 更新，最後同版全套 QA 與 Live fresh reload 未完成，無 git add／commit／push／Pages 部署；H1 零基礎真人教材效果仍 PENDING。不得拿舊混合工作樹 38/38 PASS 當新候選發版 PASS。


## 7. 2026-11-16｜90 隔離候選 17ec1db QA（非正式站）

**Source**：獨立候選 release-candidate-origin-main-b0b26dd，實際 Git base = 17ec1db（資料夾名稱只是過渡名稱）。GitHub main 於驗收後又前進到 0965734；涉及 Home／Index／Creator 導覽，舊候選不得直接部署。

- 完整 Release Gate：latest-release-gate.json = 38/38 PASS（2014 PDF／JSON、2024 PDF、1,104 角色矩陣、Save migration、5RTools）。
- PROJECT_RULES 擴充回歸：latest-extended-gate.json = 21/21 PASS。先前 QA stage0 舊控制項與參考頁固定舊 RGB 的兩個錯誤，由 90 取得 exact test lease，更新測試回到現行 UI。重新測到 HP、THP、死亡豁免、英雄激勵、奧術恢復、法術位、跑團筆記、JSON 匯出、手機匯入、reload；對比改驗 WCAG AA 4.5:1。
- Pages 工作流程前置：latest-pages-workflow-preflight.json = 9/9 PASS，含桌機／手機 2024 翻譯投影與撤銷實際操作；使用隔離的 Playwright 1.58.2 Chromium Headless Shell，未更動網站依賴。
- 學院獨立 UAT：latest-a-critical.json = A06/A07/A08/A10/A11 5/5 PASS；latest-a-evidence/candidate-a01-a04-a09-a12-a14.json = A01/A04/A09/A12/A14 5/5 PASS。
- 14 個原站導覽路由 × 390px／1440px = 28/28 PASS；學院 390／480／1440px HTTP 真實操作 PASS、零 pageerror、零水平溢出。latest-17ec-http-academy-start/results/practice 截圖已實際讀取檢查。
- 2024 PDF 兩頁真實抽取結果：species 7pt、無 overflow、全文及原截斷末尾「級時再加1」可見（speciesVisibility.exitCode=0；fullTextVisible=true）；raster PASS。A14 完成學院往返、Creator 存檔、JSON／PDF 實際下載、Final Sheet 及 reload 對照。

### A01–A16 對照

| Case | 結果與證據 |
| --- | --- |
| A01 | PASS：熟手入口直達 Creator，未強制進教材 |
| A02 | PASS：lesson.abilities 往返及 S 保持，由 Browser UAT 驗證 |
| A03 | PASS：13 Academy IDs bridge 15/15、14 原站路由雙尺寸 28/28 |
| A04 | PASS：關閉／重開分頁、學習進度還原及角色 Save read-back |
| A05 | PASS：12 職業／48 子職業／三組推薦，建議不自動選擇 |
| A06 | PASS：既有已確認角色的職業／裝備／法術不被建議覆蓋 |
| A07 | PASS：新存檔 classConfirmed=false，reload 仍未確認 |
| A08 | PASS：2014 角色保持 2014，2024 學院不清空或切版 |
| A09 | PASS：改答案、跳過與 quiz corpus |
| A10 | PASS：Storage denial／corrupt future schema 安全退回 |
| A11 | PASS：外部 returnURL 與非法 route 不導外 |
| A12 | PASS（自動化）：鍵盤、手機觸控、Accessibility Tree、三尺寸截圖；真實讀屏軟體及零基礎真人觀察尚 PENDING |
| A13 | PASS：10／20／40 mock Bridge producer tests |
| A14 | PASS：同一角色 JSON／PDF／Final Sheet／reload |
| A15 | PASS：原站全部 14 個 view 路由仍可 deep link |
| A16 | PASS（本機）：獨立工作樹只含 allowlist，不混入其他施工線 |

**發版狀態：PENDING／不可發布舊基底**。須於最新 origin/main 重新整合並執行同一 commit source gate，通過後才可非強制發布至 GitHub Pages；部署後仍需 Live fresh reload、完整資源 hash、桌機／手機驗收。零基礎真人教學成效 H1 始終 PENDING，不得聲稱已驗證。


## 8. 2026-11-16｜正式發布與 Live UAT 最終紀錄（最新狀態）

**結論：90 技術發布已 PASS。** 前面段落的 BLOCKED／LIVE PENDING 是當時候選的歷史狀態，現以本節及其實際證據為準。零基礎真人教學理解成效另維持 **H1 PENDING**，不得宣稱真人教育成效已驗證。

- **正式程式碼來源**：GitHub Linheng1230/TRPG_playercheet 最新 main；新手學院程式碼提交 dd3824d3ae5b5c060a49d6c3d81f12a1caa0b0e4（base 743fb6a）。只提交明確 allowlist 的 33 個檔案，未混入其他施工線未提交變更；非強制推送，遠端 main 讀回與 commit SHA 相同，原 dirty 工作樹未 reset。
- **GitHub Pages**：Deploy GitHub Pages run 43849206149，head SHA dd3824d，conclusion=success（2026-11-16 18:31 台灣時間）。包含正式 canonical 翻譯、跑團撤銷、發布後 REST/Undo 與 Live QA 角色驗證。工作流程 URL：https://github.com/Linheng1230/TRPG_playercheet/actions/runs/43849206149
- **正式網站**：https://linheng1230.github.io/TRPG_playercheet/ 。對正式 HTTPS + cache busting URL 實際下載 index、home、academy、Academy bridge/creator/app、quiz、first session、catalog、2024 PDF exporter、illustrated rail、cantrip tooltip 等 **12/12 個檔案**；Git blob SHA1 與同一提交逐檔完全一致。證據 D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\new-player-90\live-dd3824d\live-source-parity.json。
- **正式前置 QA**：同版 Local Release Gate 38/38 PASS；PROJECT_RULES 擴充回歸（含最新法術段落 Gate）26/26 PASS；Pages 前置 9/9 PASS；Academy 十項關鍵操作 10/10 PASS；原站 14 routes × 390／1440px 為 28/28 PASS；390、480、1440px UI 無 pageerror／水平 overflow。
- **Live Fresh UAT**：從新瀏覽器 Context 實際測正式站，路由 28/28 PASS；三種尺寸 home→academy→lesson→creator→return、quiz→三推薦→return、practice、reload 全 PASS。另 A06/A07/A08/A10/A11 共 5/5 PASS（角色資料保護、2014 隔離、Storage denial、外站 returnURL 拒絕）；A01/A04/A09/A12/A14 共 5/5 PASS（實際 JSON／PDF 下載、Final Sheet、重新載入）。首次 Creator 的原有規則版本彈窗，改用正常使用者操作關閉後完整重測 PASS。證據 live-dd3824d-all-retest.log、live-dd3824d-a-critical.json、live-dd3824d-a-evidence/candidate-a01-a04-a09-a12-a14.json、live-743-deep-link-http-uat.json。
- **2024 PDF 裁切 Release Blocker**：species fit 7pt、lineHeight=1.42、pad=5，獨立全文預期頭／尾 read-back、raster PASS，fullTextVisible=true。正式站實際匯出的約 30MB、2 頁 PDF 另經 PyMuPDF 文字抽取與渲染；第 1 頁 196 words、第 2 頁 166 words，無字詞方框超出頁面範圍，矮人／法師文字可讀。證據 live-dd3824d-pdf-visual-qa.json 與 PNG。僅宣稱此指定裁切案例 PASS，不宣稱所有角色組合皆已真人逐字驗證。
- **2014／2024 隔離**：2014 matrix、2014 PDF/JSON、2024 canonical matrix、Save migration 與輸出回歸均已通過；學院不改動 2014 角色的 edition。
- **H1 待驗證**：尚無真正零基礎玩家完成閱讀、測驗、創角、首次跑團的有人觀察測試；真人可理解性 UAT 維持 PENDING，不能用自動化測試冒充教育成效。

此節為發布後 QA 記錄；沒有變更 canonical 規則、角色 State 或其他施工線。

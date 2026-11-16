# 30｜新手學院 × 既有創角：整合計畫與實際驗證

狀態：**LOCAL INTEGRATION QA PASS／90 LIVE PENDING**。30 本機頁面已可操作；禁止宣稱已部署或 Live DONE。
Owner：30；Task：`dnd5r-new-player-academy-30-20261116`。
最後實際依據：`docs/NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md` v1、`index.html`、`home.html`、`assets/watercolor-site-bridge.js`、10／20／40 來源。
Release：**90** 專責，30 不擅自部署。

## 實際 Source of Truth 與相依

| 來源 | 已核對 | 30 的唯一責任 |
| --- | --- | --- |
| 00 | `docs/NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md` 現已存在，規定 13 個 creatorStepId、lesson／quiz／practice ID、唯一 `DND5RAcademyBridge` | 必須照合約映射；不能用第二套角色 State |
| 10 | `assets/new-player-academy-content-2024.js`，目前以 `lesson.*`、`creator.*` 實作唯讀教材 | 畫面顯示，點選下一步時只送合法 creatorStepId |
| 20 | `assets/class-fit-quiz-5r.js`、`docs/NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md`，10 題、三組推薦、純函式（仍有 owner 施工線） | 以實際 `CLASSES`、`PROG_2024`、`BACKGROUNDS_2024`、`SPECIES_2024` 投影 catalog；顯示三組而非複製演算法 |
| 40 | `assets/first-session-tutorial-5r.js`，唯讀教學題庫／情境／答案回饋 | 呈現選擇題和回饋；不得擲骰、扣資源或修改角色 |
| Creator | `index.html`：`S.ruleset`、`S.step`、`go(i)`、`renderClasses()`、`protectChoiceGrid()`、`boot()` | `S` 永遠唯一；推薦不能觸發 `_commitClass`／`_commitChoice` |
| 外層入口 | `home.html` 尚未追蹤；`assets/watercolor-site-bridge.js` 實作 `?view=`→`go(i)`，亦尚未追蹤 | 必須共用既有 view key，不能重造另一個 deep-link router |
| 持久化 | Creator Save v9；`dnd5r:char:*`、`dnd5r:current` | 學習進度只用 `dnd5r:academy:v1:progress`；跨頁回跳只存導航意圖 |

## 本線已建立的獨立內容

- `assets/new-player-academy-bridge.js`：00 §6 `AcademyBridgeV1` 的薄橋接器／唯一 `window.DND5RAcademyBridge`。提供 `openCreator`、`returnToAcademy`、`getRoute`、`getCreatorSnapshot`、`saveProgress`、`restoreProgress`；除角色外只保存經 schema 驗證的導航與學習進度。
- `tests/qa-new-player-academy-bridge.js`：15 項 TARGETED 測試。涵蓋 13 ID、源端返回、2014 隔離、canonical suggestion gate、local/sessionStorage 禁用、schema v2、URL 攻擊拒絕與無第二套角色 State。
- 已新增 `academy.html`、`assets/new-player-academy.css`、`assets/new-player-academy-app.js`、`assets/new-player-academy-creator.js`。`home.html` 已加入新手／熟手入口；`index.html` 僅在既有 `watercolor-site-bridge.js` 之後插入兩支 30 專用 JS。使用者是否套用推薦仍由既有 Creator 的確認鈕決定。

## UI 整合施工順序

1. **前置交付 gate**：讀取每個 owner 的實際模組及其 TARGETED QA；與 00 stable ID 比對，若不相容先建立小型投影或等 owner 修正，**不直接改 10／20／40 的業務檔**。
2. **獨立學院 UI**：只由 30 新增 `academy.html`、自己的 CSS／Controller。新手可看 10 教材、可跳過 20 測驗、從三組建議選擇職業方向、練習 40 情境；所有導覽經 00 bridge。手機繁中閱讀，原生按鈕，明確下一步。
3. **首頁共享檔 gate**：對 `home.html`、`index.html`、`assets/watercolor-site-bridge.js` 先讀 Git status、mtime/diff、既有 target lease 與近期施工紀錄。未取得 CLAiMED/handoff 不寫；其他聊天室活躍時 DEFERRED。
4. **Creator 最小接線**：若拿到 exact writer，僅加入 bridge script 與顯式 `academy=1` 的「返回教學」，沿用原 `?view=` 導覽與 `go(i)`。不改 Creator state machine／Save v9／2014 branch；既有 `boot()` 完成後才讀取 URL。裝備、法術、JSON、PDF 不能被橋接層自動修改。
5. **確認 Gate**：與 Creator 原本預選／修改／確認 UI 合作。20 推薦只能高亮與解說，不能替玩家確認。既有 S.cls 非空不等於剛按過確認；若目前 UI 允許跳過確認，須以實測證明安全或標 BLOCKED 並交由原 Creator owner 修正。
6. **Source → QA → 90**：先跑 00 A01～A16 的 targeted/integration QA，再交 90 deployment。沒有 90 的 Live fresh-load 及 390px/1440px 畫面驗收，不標 DONE。

## UI 行為與失敗處理

- 新手：`lesson.welcome`、`lesson.class` 等可返回的章節；教材內 `topic.*` 不作跨頁 returnStep。熟手入口直接 `index.html?view=creator`。
- 課程「到創角試試」：組 `AcademyRouteV1`，`returnURL=./academy.html`，`returnStep=academyStepId`，在 Creator 只導覽不確認。返回只採用 allowlist 相對網址。
- 測驗選項：對 20 `evaluate()` 只提供從現有 Creator 取得的合法 catalog；三組結果是可忽略的推薦。顯示 3 級子職業為方向，不預選 `S.sub`；每組有檢視規則／前往職業／改選背景物種／查看其他推薦。
- 練習：只顯示題目、回饋及下一步；沒有假骰或角色資源變動。
- 重新整理：教材進度、問卷答案以 schema v1 保存；不同 `questionSetId` 時清掉舊答案，不能保留舊推薦快取。若 storage 不可用，明確顯示僅暫存在本頁。
- 2014：保持原角色與規則版本，學院不自動切換 2024；顯示 2014 不適用說明、回原版 Creator 入口。
- 未知 step ID／URL 注入／模組未載入：拒絕並顯示繁中可理解的回復入口，不能將空畫面標 PASS。

## 30 整合 QA 與 90 Release Gate

原始待驗收清單如下；本輪已處理項目與剩餘阻塞在後段逐項更新：
- 10／20／40 模組單測與相互 ID/canonicalRef 契約；
- 真實 `academy.html` 互動／返回／刷新、題目更新、儲存失敗、舊問卷版本；
- 13 deep link、舊首頁相容、2014／已存角色回歸；
- Save v9 JSON roundtrip、PDF 出圖、Final Sheet 不變；
- 390×844／480px／1440×900 真實視覺、鍵盤／焦點／44px 觸控；
- 90 的正式站部署版本／fresh browser / script identity。

### 本輪已實際執行並通過（LOCAL Source／Integration）

- 橋接測試 `tests/qa-new-player-academy-bridge.js`：15 項 PASS（2014 隔離、Session route、Return URL allowlist、學習儲存降級、確認 gate）。
- 本線 catalog `scripts/build-academy-catalog-2024.js --check`、`tests/qa-academy-catalog-2024.js`：PASS。從現有 Creator canonical code 產生含主屬性的唯讀投影，12 職業／48 子職業／16 背景／10 物種；三組真實 READY 且 `prefill.confirmed===false`。Producer 修改後，`--check` 必須重生或阻擋發版。
- 前置 10/20/40：`qa-new-player-academy-content.js` 14 項、`qa-class-fit-quiz-5r.js` 10,213 assertions、`qa-first-session-tutorial-5r.js` 540 checks，均 PASS。
- **Playwright 真實頁面** `tests/qa-new-player-academy-browser.js`：390×844、480×900、1440×900 三種視窗 PASS；Home 新手／熟手入口，Lesson 進 Creator step 2，再返回原 Lesson，刷新進度，Quiz 10 題到 3 卡結果，點推薦前往 Class 而 `S.cls===null`、返回 Quiz 原結果、刷新三卡仍存在，40 選項回饋；各視窗 horizontal overflow **0px**、pageerror **0**。
- 既有回歸（經 http://127.0.0.1:18766 服務執行）：`qa-save-migration-fixtures.js` 4 份舊存檔/0 failures、`qa-module-smoke.js` 0 failures、`qa-2014-matrix.js` 0 failures、`qa-five-entry-navigation.js` 390/1440 PASS、`qa-choice-exhaustive.js` 0 failures、`qa-2024-export-and-spell-ui.js` PASS、`qa-2024-skill-display-roundtrip.js` PASS。
- `node --check` 新 JS / `git diff --check` PASS；未 checkout/reset、未提交、未部署。Home 與 Index 共用檔使用 30 的 exact-target lease 後增量修改；未寫 10/20/40、90 或其他施工線檔案。

### BLOCKED／PENDING（不可宣告整站 PASS）

1. **90 正式站 Live**：本線無部署；須由 90 完成 GitHub Pages 發版後 fresh-browser / script identity / 390×844、1440×900 實際 UI、鍵盤與觸控驗收。
2. **已存在的 2024 PDF 文字裁切 FAIL（90 已驗證）**：90 的 `qa-new-player-academy-pdf-visibility.py` 找到矮人物種特性末尾被裁切，舊 fit report 回報 `overflow=false` 為 false PASS。此問題不源自本線，但整站 Release Gate 不可略過；應由 PDF exporter owner 修復後 90 再驗證。30 不改 owner 的 PDF 檔。
3. **00 A01–A16 完整證據**：上述是本線 focused integration，不是 90 的全量 Gate。特別是既有 `S.cls` 存檔重載後 classChoiceLocked 狀態、PDF 全頁可見性、所有 13 deep links 與瀏覽器重啟等仍由 90 按 A01–A16 收斂。
4. **練習題精確子步驟跨重啟**：00 v1 progress 只記 `practice.*` 章節 ID，40 模組題目子步驟未定義跨重啟 schema；目前可回到跑團教學類別，但不能聲稱重啟精確回到某個情境的第 N 題。若列為 release hard gate，需 00 擴增同一進度契約，不建立平行角色 State。

**交接結論：30 的本機整合可供 90 QA；Live／PDF 等尚未解除前不標正式上線完成。**

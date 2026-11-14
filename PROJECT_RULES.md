[Reading 274 lines from start (total: 274 lines, 0 remaining)]

[Reading 130 lines from start (total: 130 lines, 0 remaining)]

# PROJECT RULES — TRPG Player Sheet

## 1. Source of Truth

D&D 5R / PHB2024 規則以固定的 5RTools snapshot 為規則權威。

- 規則數值、條件、距離、資源、恢復、傷害、DC、優勢/劣勢、持續時間等：以 5RTools 為主。
- FVTT PHB2024：提供 stable identifier、Item / Advancement / Runtime 結構驗證。
- Repository / Runtime 為實際完成狀態的驗收依據。
- 文件中的 PASS 不得凌駕實際 Runtime；若兩者不同，必須找到 False PASS 根因並修正 Gate。

## 2. 規則摘要不可遺失機制

可以極度精簡，但任何會改變遊戲結果的資訊都不可省略。

至少必須保留：

- 傷害：骰值、類型、屬性調整值、額外傷害。
- 資源：骰池/次數、消耗條件、短休/長休/其他恢復方式。
- 距離：射程、觸及、範圍、傳送/感知距離。
- 時間：持續時間、開始/結束條件。
- 行動經濟：動作、附贈動作、反應、藉機攻擊、無需動作。
- 觸發：何時可用、命中/未命中、受傷/造成傷害等。
- 目標：數量、體型、可見/可聽見/自願等限制。
- 檢定 / 豁免 / DC：屬性、公式、成功/失敗結果。
- 優勢 / 劣勢。
- 狀態：倒地、擒抱、震懾、隱形、中毒等，以及解除條件。
- 抗性 / 免疫 / 無視。
- 武器 / 法術結構：武器類型、傷害骰、詞條、Mastery、環階、學派、專注、儀式、構材。
- 等級成長：骰數、骰型、次數、距離、傷害、能力等。
- 替換 / 重選時機。
- 使用後限制與重置條件。

只要缺一個必要機制，就不得 PASS。

## 3. 畫面感規格

規則前可保留最多一句極短的具象描述，幫助玩家理解角色正在做什麼。

格式：

> 一句畫面感 → 行動/觸發 → 距離/目標 → 傷害/DC/優劣勢 → 資源 → 持續/恢復

畫面感不得：

- 取代規則。
- 新增原規則沒有的效果。
- 拉長成敘事段落。
- 壓縮掉必要機制。

若畫面感與規則空間衝突，規則優先。

## 4. Change Propagation Gate — TRPG 專案擴充

本節繼承全域 `D:\Tools\zizi-ai-rules\GLOBAL_WORKFLOW_RULES.md §8.1 Change Propagation Gate`；以下只列出本專案必須特別追查的 consumer。

任何一項 Feature / Rule / State / UI / Data Schema / Mapping 的改動，都不得只驗眼前畫面。

每次變更至少必須檢查下列鏈路：

1. **Canonical Rule Data**
   - 原始規則是否正確。
   - stable identifier 是否不變或有明確 migration。

2. **Creator UI**
   - 創角/升級頁是否正確顯示。
   - 必要選項是否能選且 Gate 正確阻擋未完成狀態。

3. **Final Sheet**
   - 最終角色頁是否同步。
   - 排版是否可讀、沒有黏成一段、沒有超框。

4. **Runtime Mechanics / State**
   - 熟練、專精、傷害、資源、法術、武器等實際角色狀態是否同步。
   - serialize → deserialize 是否 round-trip。

5. **Readable JSON / Exchange JSON**
   - 對外匯出是否保留完整選擇與 stable identity。
   - 不得靠繁中顯示名稱作唯一 key。

6. **PDF**
   - PDF 必須從同一 canonical 規則產生，不得維護另一套舊規則文字。
   - 固定欄位可省略畫面感，但不得省略任何規則機制。
   - 必須檢查 overflow、字體大小、欄位切割、跨欄是否切斷 Feature。
   - 改動任何 Feature 顯示或規則文字後，都必須跑相關 PDF regression。

7. **FVTT Import / Character Creator / Level-up**
   - 對應 FVTT Item / identifier / Advancement 是否一致。
   - 創角結果與升級結果必須得到相同的規則實體。
   - 同一 JSON 重複匯入不得產生重複 Item。
   - 等級提升後新增 / 替換 / 重選內容必須與 5RTools progression 一致。

8. **Backward Compatibility**
   - 2014 分支不得被 2024 修正破壞。
   - 舊 Save Schema 若不足，必須 migration 或明確版本升級。

## 5. PDF 專用呈現規則

網站與 PDF 不得各自維護獨立規則內容。

- 網站：可顯示「一句畫面感 + 分段規則」。
- PDF：使用同一 canonical Feature 的「純機制精簡版」。
- PDF 可省略畫面感句，節省固定欄位空間。
- PDF 不可省略：傷害、屬性加值、距離、時間、資源、恢復、行動、DC、狀態、優勢/劣勢、Mastery、升級成長等。
- 職業特性跨兩欄時，以完整 Feature block 為優先切割單位；不得把單一 Feature 腰斬後讓下一欄從「1枚」「長休」等半句開始。
- 任何 PDF fit report 出現 overflow，即 FAIL。
- 2024 PDF 護甲熟練必須同步勾選模板的 `light` / `medium` / `heavy` / `shld_pro` 欄位；不得只輸出文字熟練摘要。
- 陣營輸入需正規化舊值 `混亂善良/中立/邪惡` → `混沌善良/中立/邪惡`，並在 PDF `Ali` 欄位保留。
- PDF 種族特性禁止使用會退化成 `?` 的 bullet glyph；以純文字分段呈現。
- `BG_AND_PER` 背景故事與性格不得低於 5.5pt；需要壓縮時優先調整行高與 padding，不得縮到不可讀。
- **fit report = overflow:false 仍不能單獨標 PASS。** PDF 必須實際 render 成圖片檢查至少一次，確認沒有文字被欄位裁切、最後一行消失、文字重疊、跨欄半句開頭或欄位外溢。
- 職業特性跨欄必須優先在完整 Feature block 邊界切欄；右欄不得從「1枚」「長休」「若」等前一能力的半句開始。
- 固定欄位若必須縮字，應先刪除畫面感與重複修辭、壓縮冗句，再縮字；不得用刪除任何規則機制解決空間。

## 6. Required Regression

涉及 2024 Feature / Species / Class / Subclass 內容時，至少應跑：

- `tests/qa-feature-content-critical.js`
- `tests/qa-5rtools-parity.js`
- `tests/qa-5rtools-class-progression.js`
- `tests/qa-2024-feature-pdf-coupling.js`
- `tests/qa-2024-pdf-layout.js`
- `tests/qa-2024-export-and-spell-ui.js`
- `tests/qa-spell-filter-and-rules.js`
- `tests/qa-spell-filter-mobile.js`
- `tests/qa-spell-readability.js`
- `tests/qa-spell-tooltip-readability.js`
- `tests/qa-spell-bilingual-names.js`
- `tests/qa-granted-spell-cards.js`
- `tests/qa-5r-zh-name-parity.js`
- `tests/qa-5r-visible-name-surface.js`
- `tests/qa-choice-exhaustive.js`
- `tests/qa-save-migration-fixtures.js`
- `tests/qa-stage0-runtime.js`
- `tests/qa-feature-tooltip-readability.js`
- `tests/qa-feature-full-rules.js`
- `tests/qa-ability-ref.js`
- `tests/qa-reference-contrast.js`
- `tests/qa-general-feat-reference.js`
- `tests/qa-search-input-stability.js`
- `tests/qa-search-input-browser.js`
- `tests/qa-weapon-properties.js`
- `tests/qa-full-character-matrix.js`
- `tests/qa-class-check-modifier-source-inventory.js`（來源新增、刪除影響技能／檢定／豁免的特性，必須先審核候選再更新 baseline）
- `tests/qa-class-check-modifier-matrix.js`（2014／2024、跨職業、先攻、被動數值與正式 PDF 一致性）
- `tests/qa-spell-traditional.py`
- `tests/qa-languages.js`
- `tests/qa-identity-fields.js`
- `tests/qa-2014-matrix.js`
- `tests/qa-play-status-creature-projection.js`（跑團狀態與已導入野獸、原初夥伴、坐騎、魔寵及召喚參考同步；角色卡跳轉、存檔讀回與手機版）
- `tests/qa-creature-import.js`（生物來源與角色卡匯入相容）
- `tests/qa-2014-pdf.js`
- `git diff --check`

只有相關 Runtime 與回歸 Gate 都通過，才可把修改標成 PASS。

## 7. Web Typography / Readability Gate

本節是網站所有規則文字、法術卡、Feature 卡、Tooltip / Popover、最終角色卡長文的硬規則。只要畫面功能正確但閱讀性不合格，仍視為 FAIL。

### 7.1 字體角色分工

- 長篇中文正文、規則全文、法術效果、Feature 詳情：優先使用繁體中文 Sans Serif。
  - 建議字體鏈：`"PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif`
- 標題、角色名、章節名、短標籤可使用 Serif，作為視覺層級。
- 不得讓長篇中文規則正文長時間使用細筆畫 Serif 作唯一字體來源。
- 英文名稱、骰值、數值可沿用既有字體，但不得破壞中文行高與對齊。

### 7.2 正文字級與行高

- 一般長正文：
  - 桌面：至少 15.5px，建議 16px。
  - 窄版 / 手機：不得低於 15px。
  - line-height：1.75–1.9。
- 摘要文字：
  - 不得低於 14px。
  - line-height：至少 1.6。
- 次要 metadata、學派、來源、標籤：
  - 可使用 12–13.5px。
  - 不得拿 metadata 字級承載整段規則內容。
- Tooltip / Popover 內長規則：
  - 不得低於 13px。
  - line-height：至少 1.6。
- 禁止為了塞進畫面而把長規則正文縮到難以閱讀的尺寸。

### 7.3 顏色與對比

- 長正文必須使用主正文色，不得使用 `muted` 色承載。
- `muted` 僅限：
  - 次要 metadata
  - 輔助說明
  - 補充標籤
  - 非必要資訊
- 法術效果、傷害、DC、距離、持續時間、成功 / 失敗結果、限制條件等均視為主內容。
- 米色 / 羊皮紙背景上的正文不得呈現灰濛、低對比狀態。
- 若實際 render 在正常螢幕亮度下需要用力辨識，視為 FAIL。

### 7.4 閱讀寬度

- 長篇規則正文單行閱讀寬度應控制在約 55–75 個中文字元等效寬度內。
- 建議長文容器使用 `max-width: 70ch` 左右；可依版面調整，但不得讓正文無限制橫跨整個工作區。
- 若卡片本身很寬，正文區仍應有內部閱讀寬度限制。
- 表格、角色卡固定欄位可例外，但文字需有清楚分段。

### 7.5 規則內容分層

單一法術 / Feature 至少分成下列視覺層級：

1. 名稱
2. 學派 / 環位 / 類型
3. metadata：施法時間、射程、成分、持續時間、職業
4. 單一 canonical 規則正文（法術直接顯示 5RTools 對齊繁中版本）
5. 特殊段落：升環施法、戲法強化、成功 / 失敗、限制、消耗、恢復

- 不得讓上述資訊全部使用同一字級、同一顏色、同一字重。
- **法術禁止維護「摘要版 + 完整版」兩套規則文字。** 網站只能有一份 5RTools 對齊的 canonical 規則正文。
- 搜尋結果、tooltip 若需縮短顯示，只能從同一份 canonical 文字於 runtime 即時截取，不得另存或人工維護第二份摘要資料。
- 法術正文直接以分段排版呈現；不得要求玩家再點「查看完整規則」才能看到真正規則。

### 7.6 段落拆分

- 規則原文若包含多個效果、選項、成功 / 失敗結果、升環效果，必須拆段。
- 下列內容應優先獨立成段或明確標示：
  - 成功
  - 失敗
  - 升環施法
  - 戲法強化
  - 每回合開始 / 結束
  - 特殊限制
  - 可選效果
  - 使用次數 / 恢復
- 不得把完整法術效果壓成單一超長段落。
- 不得為了視覺縮短而刪除會改變遊戲結果的機制；法術頁必須直接呈現完整 canonical 規則。

### 7.7 Tooltip / Popover 規則

- Tooltip / 小卡可直接承載完整 canonical 規則，但不得以無分段的大段純文字呈現，也不得另維護一份縮寫規則。
- Tooltip 必須：
  - 不超出 viewport。
  - 可垂直捲動。
  - 無水平 overflow。
  - 不遮住主要互動到無法操作。
  - 文字對比足夠。
- 規則很長時，維持完整 canonical 內容並以限高、分段、垂直捲動處理；不得因長度改回摘要版或另建第二份規則文字。

### 7.8 Responsive Readability

至少驗證：

- 1440×900 桌面
- 390×844 手機
- 約 480px 寬的窄桌面 / 小視窗

每個尺寸均需確認：

- 無整頁水平 overflow。
- 長文不被裁切。
- chip / metadata 可換行。
- 正文仍符合最低字級。
- 段落寬度與行高可讀。
- 展開完整規則後不破版。

### 7.9 Readability Gate

以下任一發生即不得標 PASS：

- 長正文使用 muted 色。
- 正文小於最低字級。
- 行高過緊造成行與行黏在一起。
- 單行閱讀寬度過長，造成明顯掃讀困難。
- 規則全文被壓成單一長段落。
- 摘要與 metadata / 全文沒有視覺層級。
- Tooltip / 卡片 / 展開區文字超框或水平捲動。
- 實際畫面呈現「灰濛、密集、難以掃讀」。
- 只因沒有 overflow 就宣稱排版 PASS。

### 7.10 驗收方式

排版驗收不得只靠 CSS 靜態檢查或程式自述。

必須同時包含：

1. DOM / overflow 自動檢查。
2. 實際 render 截圖或瀏覽器 Live-UAT。
3. 至少抽查：
   - 短法術
   - 長法術
   - 含多選項法術
   - 含升環 / 戲法強化法術
   - Tooltip / Popover
   - 展開完整規則
4. 只有「功能正確 + 規則正確 + 實際可讀」三者同時成立，才可 PASS。

### 7.11 Unified Small-Card Contract

- 所有原本使用 .ft[data-tip] 的小卡必須共用同一個 renderer，不得為物種、職業、子職業、戰技、武器掌握各自維護不同 tooltip 排版。
- 適用範圍至少包含：物種特性、職業能力、子職業能力、戰技、武器掌握，以及其他既有小卡。
- 小卡顯示的規則內容必須來自該 Feature 的完整 canonical 文字，不得另建縮寫版規則。
- 小卡必須保留規則分段與具名子項；有『標題：內容』結構時，標題要獨立顯示。
- 小卡過長時必須可垂直捲動；不得用縮小字體或壓成單段來塞入畫面。
- 1440px、約 480px、390px 三種 viewport 必須無水平 overflow。
- 物種特性在主頁保留完整規則，同時特性名稱可觸發同一份 canonical 小卡。

### 7.12 Spell Bilingual Name Contract

- 2024 / 5R 法術名稱統一顯示為：繁中名稱 English Name。
- 英文名稱必須直接使用 5RTools / canonical spell data 的 ENG_name，不得人工翻譯或自行改寫。
- 範例：火球術 Fireball。
- 只有法術名稱加入英文；學派、環位、職業、成分、施法時間、規則正文等維持繁中。
- 法術搜尋必須同時支援繁中名稱與英文名稱。
- 法術 hover 小卡、法表速查、創角法術選擇、角色卡等共用 spell-name renderer；不得各自拼名稱。

### 7.13 Feature Canonical Full-Rule Contract

- 2024 / 5R 的物種、職業、子職業 Feature 小卡必須以 5RTools / canonical upstream 的完整規則為文字 Source of Truth；本地摘要只可供 mechanics / index 使用，不可成為小卡最終正文。
- 職業與子職業完整規則必須以「職業｜子職業｜Feature｜等級」解析；同名但不同等級的 Feature 不得共用錯誤版本。
- 5RTools 內的 refClassFeature、refSubclassFeature、具名 nested entries 與表格內容必須正確展開；不可只取父節點前言。
- 翻譯名稱差異可用 alias 對應，但 alias 必須回指 canonical upstream 正文，不得手寫第二份規則。
- 低信心或多對多配對不得自動套用；必須先用名稱、等級、mechanics signature 或明確 alias 驗證。
- Runtime 中任何實際具有小卡正文的 Feature 都不得落回摘要 fallback；純進度標記（例如武器掌握增加到 N 種）可沒有小卡正文。
- Species full-rule map 必須完整覆蓋網站實際物種特性。
- 子職業法術清單以 upstream additionalSpells / canonical metadata 為準；不得因本地舊表殘留而額外授予不存在的法術。
- 修改上述資料後必跑 tests/qa-feature-full-rules.js，並與 class progression、5RTools parity、tooltip readability 一起驗收。

### 7.14 Ability Lookup Contract

- 能力速查與角色建立器不實作戰鬥自動擲骰、技能結算、攻擊扣資源或自動套狀態。
- **明確例外：跑團狀態的玩家主動短休／長休**可以操作生命骰、生命值、法術位與已定義恢復規則的資源；不得影響任何未指定或需玩家另外選擇的能力。
- 休息操作必須保留 2014／2024 差異：2024 長休恢復全部生命骰，2014 長休恢復最多一半生命骰（至少1）；契約魔法短休恢復；同特性的「短休回1」不得誤當全部回滿。
- 不得依繁中自由文字猜測資源恢復規則，必須使用 stable resource key / 結構化 policy；未知資源維持手動、不得無條件重置。
- 休息只在玩家點擊確認操作後修改同一份 S.play / S.slotsUsed，並經 serialize/deserialize 驗證；需新增 2014 多職業混合骰型的保護與說明。
- 每次改動跑團恢復邏輯，至少執行 `tests/qa-play-status-rest.js`、現有角色存檔／跑團相容檢查，並做桌機／手機 Live 驗收。
- 能力查詢優先處理主動能力，但被動能力也必須可查且與 canonical 規則一致。
- 主動能力至少需可辨識並查詢：動作、附贈動作、反應、攻擊替代、魔法動作、無需動作，以及命中／未命中／受傷／資源消耗等觸發型能力。
- 能力卡應優先顯示或可搜尋：使用時機、目標／距離、檢定／豁免／DC、傷害骰或效果、資源消耗、使用次數與恢復條件。
- Ability Lookup 必須涵蓋：物種、1–20 級職業、1–20 級子職業、起源專長、通用專長、戰鬥風格、史詩恩賜、戰技、超魔法、魔能祈喚，以及職業內的主要能力選項。
- 物種／職業／子職業／專長／超魔法／魔能祈喚等查詢文字必須回到 5RTools canonical full rule；禁止以本地摘要作最終查詢正文。
- 若 PHB2024 upstream 不存在某選項，不得因舊版或擴充資料殘留而繼續出現在 2024 Creator。
- `tests/qa-ability-ref.js` 必須驗證桌面與 390px 手機版、主動／被動分類、動作類型篩選、搜尋，以及 canonical data coverage。


### 7.15 Full Character Matrix / Extension Gate

- 2024 Creator 的完整發版必須跑 `tests/qa-full-character-matrix.js`。
- Matrix 必須涵蓋 12 職業 1–20 級 base progression，以及全部 PHB2024 子職業 3–20 級。
- 每個案例用固定 seed 隨機選物種、背景、標準陣列屬性與職業技能，確保可重現又能覆蓋不同角色組合。
- 必須實際呼叫 Final Sheet 與 Spell renderer，不得只比靜態表格。
- 截至該等級應有的職業／子職業 Feature 必須出現在 Final Sheet；有 canonical rule 的 Feature 必須產生實際 runtime tooltip。
- 391 道法術的 class membership 必須與 5RTools `classes.fromClassList` 完全一致。
- 施法職業每級最高法術環位必須與 5RTools class table 一致；第三施法者與 Pact Magic 需使用各自 progression。
- always-prepared / subclass granted spell 必須存在於 canonical spell DB，且不得授予當前角色無法施放的錯誤環位（特殊規則另行明確白名單）。
- Matrix 任何 failure 都不得 Release；先判定是 verifier 錯誤或產品錯誤，再修 producer / parser / mapping 與 regression。
- 新增或移除任何物種、職業、子職業、專長、戰鬥風格、optional feature、法術或授法 mapping 後，Matrix 是必要 Gate。

- tests/qa-spell-progression-exhaustive.js

- tests/qa-subclass-spell-exact-parity.js

- tests/qa-choice-exhaustive.js

### 7.16 Expansion Exhaustive Gates

- Spell progression Gate must compare every class level against the 5RTools class table: cantrip count, prepared/known count, every spell-slot level, and Pact Magic slot count plus slot level.
- Eldritch Knight and Arcane Trickster must be checked against their upstream subclass spellcasting tables.
- Subclass granted spells require exact stable-English spell identity parity with upstream additionalSpells; a wrong spell of the same level is still a failure.
- Every 2024 selectable option must complete at least one State -> serialize -> deserialize -> renderFinal/renderSpells round-trip.
- 2024 Feature 規則不得再建立 runtime override 第二資料庫；差異名稱應透過 canonical level-aware key／alias resolver 解決。若有歷史例外遷移，僅保留 provenance，不保留第二份 runtime 規則正文。
- Git baseline may be created only after targeted gates, full character matrix, full release gate, and git diff --check all pass.

### 7.16 Maintainability Hardening Gate

- Legacy save fixtures are release evidence and must pass the real deserialize/render/serialize/read-back path.
- Runtime 不得存在 `ZIZI_5R_FEATURE_OVERRIDES`、`feature-5r-overrides.js` 或 `feature-override-manifest.json`；歷史相容例外必須遷入 `ZIZI_5R_FULL_FEATURE_RULES` 對應等級 key，並以 `feature-5r-manual-provenance.json` 留證據。
- Stable low-coupling modules may be extracted from index.html only when existing globals and runtime behavior remain compatible and a module smoke test exists.
- Required tests: qa-module-smoke.js, qa-feature-no-overrides.js, qa-save-migration-fixtures.js.
- Repository baseline may only be created after the complete release gate passes.

### 7.17 Player Reference Data Contract

- 2024 魔法物品核心來源固定為 XDMG；`584` 是 XDMG 原始 item-source 數量，包含普通財寶與商品，不得宣稱為 584 件魔法物品。目前真正 `rarity != none` 的魔法物品為 435 件。
- 2024 生物主庫固定為 XMM；XPHB 另納入玩家法術／職業專用 stat block，XDMG 特殊 stat block 保留來源標記。
- 玩家生物分類至少包含：召喚術生物、魔寵、Find Steed／坐騎、獸王夥伴、荒野變形與全部怪物。
- 荒野變形不得維護第二份手寫清單；必須由 canonical stat block 推導：一般德魯伊 Lv2 CR<=1/4 無飛行、Lv4 CR<=1/2 無飛行、Lv8 CR<=1 可飛；Swarm 排除。月亮結社最大 CR=floor(Druid level/3)，Lv8 前仍不可使用具有 Fly Speed 的形態。
- 「大型野獸坐騎候選」僅為體型 Large+、非 Swarm Beast、具有步行速度的初篩；不得把候選標成規則上必然可騎乘。
- 中文來源未提供權威 2024 翻譯時，保留 upstream English 規則正文，不得以機翻冒充 canonical。
- 資料更新後必跑 qa-player-reference-data.js、qa-player-reference-ui.js、qa-feature-no-overrides.js 與完整 Release Gate。

### 7.18 Player Reference Traditional Chinese Projection Contract

- 5R 魔法物品／生物的英文 canonical identity 與 mechanics 不得被翻譯層覆寫。
- 繁中顯示層唯一正式來源為 pinned `tjliqy/5etools-cn cn2.0` 的 `ENG_name + source` 精確對應，再以 OpenCC `s2twp` 轉台灣繁體。
- 名稱固定顯示「繁中｜English」；除此之外，稀有度、類型、同調、來源、能力欄位、感官、語言、抗性／免疫、規則正文、特性、施法、動作、附贈動作、反應與傳奇動作皆須只顯示繁體中文。
- 不得在存在結構化 5etools-cn 對應時使用 Qwen／Google／灰機／CHM 等 fallback 重新翻譯正文。
- 正式 builder 僅允許 `scripts/build-5r-zh-projection.py`；不得維護第二份中文規則資料庫。

### 7.19 Irreversible Choice Confirmation UX

- 角色建立／升級中，只有產品明定「確定後不可修改」的選項使用 Lock；能依規則重選的項目不可擅自鎖定。
- 每個 Lock 選項必須在選擇畫面明寫「確認後將無法修改」，並提供明確「確定」按鈕；按下後還要第二次確認（顯示選項名稱與不可修改後果）。取消不得鎖定。
- Lock 狀態由角色存檔保存且 reload 後生效；舊存檔沒有 Lock 訊號時不得反向自動鎖住。所有修改入口（包含速查導入）都必須尊重 Lock；不能只禁用畫面上的下拉式選單。
- 確認後應保留可讀的已選結果；依附於已確認選項但仍需要完成的屬性／法術／其他子選項可繼續填寫，不得隱藏或默默丟棄。
- 每新增此類不可逆選擇，至少驗證：取消不鎖定、確認後不可修改、存檔讀回、舊檔相容、替代操作入口無法繞過，以及手機版。

- `tests/qa-player-reference-zh.js` 必須驗證 435/435、520/520、繁中正文英文殘留=0、中文/英文搜尋、雙語名稱與 390px mobile。

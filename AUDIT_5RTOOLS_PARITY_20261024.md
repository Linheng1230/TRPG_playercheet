# 5RTools 5R / PHB2024 規則對齊驗收 — 2026-10-24

## 結論

**FULL PASS — 2026-10-25 04:30 重新驗收完成（含 Tooltip / Popover Live-UAT）。**

先前曾因 Feature 內容 Gate 只驗「名稱 / 等級存在」而產生 False PASS；使用者實際檢查後重新開案。該根因已修正，現在內容驗證會檢查實際機制資訊，而不是只看節點是否存在。

目前已重新確認：

- PHB2024 法術集合、identifier 與結構欄位：✅ PASS。
- PHB2024 專長、必要選擇 State 與 round-trip：✅ PASS。
- 12 職業 / 48 子職業 progression 與等級 Gate：✅ PASS。
- Species / Class / Subclass Feature 內容完整性：✅ PASS。
- effective-content Gate：mechanicalFlags = 0、unmatchedReportRows = 0、20 戰技無空白、允許的純成長 no-tip 節點均正確辨識。
- Soulknife 3/9/13/17 級與矮人石知覺：✅ PASS。
- 背景、物種、武器、Mastery、Save v9、JSON、語言、2014 回歸與 PDF coupling：✅ PASS。
- Live-UAT：桌面 1440×900 與手機 390×844，從職業 → 起源 → 屬性 → 技能 → 詳情 → 升級 → 法術 → 角色卡，全流程零水平 overflow、零 page/console error；罪犯背景固定裝備路徑可正常完成。
- Tooltip / Popover Live-UAT：武器／掌握頁 38 個 tooltip，於 1440px、484px、390px 三種 viewport 逐一捲入可視區並觸發定位，共 114 次檢查；viewport 越界 0、tooltip 內部水平 overflow 0、rule overflow 0。此項已成為固定 Release Gate。

False PASS 歷史保留作為回歸原因，但目前狀態已不再是 REOPENED。

## 規則摘要硬規格

所有 5R / PHB2024 規則可以極度精簡，但**不得省略任何會影響遊戲結果的規則資訊**。

必須保留的規則類型至少包括：

- **傷害**：骰值、傷害類型、是否加屬性、額外傷害、重擊/命中條件。
- **資源**：使用次數、骰池、熟練加值次數、是否消耗、何時恢復、短休/長休恢復。
- **距離**：射程、觸及、移動距離、傳送距離、光環範圍、感知距離。
- **時間**：持續時間、每回合/每輪/每分鐘/每小時、何時開始與結束。
- **行動經濟**：動作、附贈動作、反應、藉機攻擊、無需動作。
- **觸發條件**：何時可使用、命中/未命中、攻擊動作後、受到傷害時、特定狀態時。
- **目標與數量**：自己/生物/盟友、至多幾名、體型限制、可見/可聽見等條件。
- **檢定 / 豁免 / DC**：使用哪個屬性、DC 算式、成功/失敗各發生什麼。
- **優勢 / 劣勢**：作用在哪種檢定、攻擊、豁免，以及持續到何時。
- **狀態**：倒地、擒抱、震懾、隱形、中毒等，及結束條件。
- **抗性 / 免疫 / 無視**：哪些傷害或狀態，是否穿透抗性。
- **武器 / 法術結構**：武器類型、傷害骰、詞條、Mastery、法術環階、學派、專注、儀式、構材。
- **升級成長**：在哪個等級增加骰數、次數、射程、傷害、選項或能力。
- **替換 / 重選**：何時可替換、是否只能在升級/長休時重選。
- **使用後限制**：直到下回合、短休、長休、再次擲先攻等。

可省略的內容：

- 世界觀敘事、氣氛描寫。
- 重複解釋同一效果的句子。
- 不影響機制的修辭與範例。
- 已由標準 D&D 關鍵詞完整表達的冗長重述。

摘要原則：

> **先保機制，再壓字數。寧可多 1 行規則，也不能少 1 個判定條件。**

### 畫面感 / 實際做法格式

每個 Feature 可以在規則前保留 **最多一句極短的具象描述**，讓玩家立刻知道角色「正在做什麼」；這句不得取代任何規則資訊，也不得把摘要拉成長篇敘事。

建議格式：

> **一句畫面感。→ 行動/觸發 → 距離/目標 → 骰值/傷害/DC → 資源 → 持續/恢復。**

例如念刃：

> 你把自己的靈能凝成一把閃亮刀刃。攻擊動作或藉機攻擊時可空手生成；1d6心靈+攻擊屬性；靈巧、投擲60/120尺；侵擾精通且不占精通數。攻擊後消失。同回合另一手空閒可附贈動作生成第二把：1d4心靈+攻擊屬性。

畫面感句的要求：

- 最多一句。
- 優先描述玩家能想像的動作、感官或外觀。
- 不引入原規則沒有的額外效果。
- 不用形容詞堆疊，不寫世界觀背景。
- 若畫面感與規則資訊爭空間，**規則優先**。

任何 Feature 若缺少上述必要資訊之一，即使「名稱、等級、數量都正確」，也不得標 PASS。

權威順序：

1. **5RTools PHB2024 snapshot**：規則事實、數值、等級、選項與法術/專長結構。
2. Repository 現況：僅在 5RTools 未提供資料時保留既有行為。
3. FVTT PHB2024：只用於 stable identifier、Item ID、Advancement / pack 結構對齊；不得覆蓋 5RTools 規則事實。

> 5RTools class JSON 可能存在未被正式 progression 引用的孤兒 feature record。職業進程驗收只採用 `class.classFeatures` 與 `class.subclasses[].subclassFeatures` 的正式引用鏈，不把未引用記錄誤當有效規則。

## 本輪發現的問題與處理結果

### P1｜PHB2024 法術資料不完整 — 已修正

- **問題**：網站原本的 2024 法術資料不是完整 5RTools PHB2024 集合，少了 **13 道法術**。
- **影響**：玩家創角、升級、法術選擇與 JSON/PDF 匯出都可能找不到合法 PHB2024 法術；FVTT 匯入時也可能出現名稱或 identity 對不上。
- **處理**：建立 `assets/data/spells-phb-2024.js` canonical data layer，依 5RTools snapshot 重建。
- **驗收**：5RTools **391** 道，Runtime **391** 道，stable identifier **391 / 391 unique**，缺失 **0**。
- **狀態**：✅ PASS

### P2｜部分專長仍混有 2014 / 舊版規則 — 已修正

- **問題**：多個 2024 通用專長仍帶有 2014 或舊版敘述、數值與觸發方式。
- **已確認並修正的主要項目**：
  - Great Weapon Master
  - Durable
  - Heavy Armor Master
  - War Caster
  - Crossbow Expert
  - Dual Wielder
  - Grappler
  - Spell Sniper
  - Mage Slayer
  - Shield Master
  - Charger
  - Mounted Combatant
  - Sharpshooter
  - Sentinel
  - Polearm Master
  - Chef
  - Poisoner
  - Great Weapon Fighting
  - Protection
- **影響**：玩家會在網站上依錯誤規則做角色決策，即使角色最後能匯出，規則本身仍是錯的。
- **驗收**：PHB2024 feat identity **75 / 75** 對齊。
- **狀態**：✅ PASS

### P3｜缺少 Weapon Master — 已修正

- **問題**：PHB2024 的 `Weapon Master` 原本未完整進入網站。
- **影響**：4 級以上合法專長選項缺漏，且無法記錄玩家取得哪一項武器精通。
- **處理**：補入專長本體、屬性提升、武器精通選擇與 State。
- **狀態**：✅ PASS

### P4｜專長「看得到，但沒有真正變成角色資料」— 已修正

- **問題**：部分專長原本只有 UI / 說明文字，內部必要選擇沒有完整落進 State。
- **受影響項目**：
  - Crafter：3 工匠工具
  - Skilled：3 技能／工具
  - Musician：3 樂器
  - Magic Initiate：施法屬性、2 戲法、1 一環法術
  - Elemental Adept：傷害類型
  - Skill Expert：技能熟練、專精
  - Keen Mind / Observant：技能升級
  - Ritual Caster：依熟練加值增加儀式法術
  - Weapon Master：武器精通選擇
- **影響**：頁面看似完成，但存檔、角色摘要、JSON/FVTT importer 無法可靠重建真正的角色規則狀態。
- **處理**：必要選項全部接入規則效果、serialize / deserialize、摘要與 readable export。
- **狀態**：✅ PASS

### P5｜Druidic Warrior 原本不是完整可用規則 — 已修正

- **問題**：遊俠戰鬥風格 `Druidic Warrior` 原本只有文字，沒有真正讓玩家選擇兩道德魯伊戲法。
- **影響**：角色實際應取得的兩道戲法不會可靠進入角色資料與法術清單。
- **處理**：新增「選 2 道德魯伊戲法」UI、Next Gate、授予法術、存檔回讀與匯出。
- **驗收**：未選滿 2 道時 Gate = false；選滿後 Gate = true；round-trip PASS。
- **狀態**：✅ PASS

### P6｜Epic Boon 規則與必要選項不完整 — 已修正

- **問題**：部分史詩恩賜仍有舊規則，且需要二次選擇的恩賜沒有完整 State。
- **修正重點**：
  - Boon of Fate：改為 **2d4** 加／減 d20 結果。
  - Boon of Recovery：補 0 HP 防倒、最大 HP 一半恢復與 **10d10** healing pool。
  - Boon of Speed：補 +30 ft、Bonus Action Disengage 與結束 Grappled。
  - Boon of the Night Spirit：修正隱形與傷害抗性。
  - Boon of Energy Resistance：真正選 2 種能量抗性。
  - Boon of Skill：真正選 1 項尚未專精技能，並套用全技能熟練 + 該技能專精。
- **狀態**：✅ PASS

### P7｜背景工具與起源專長選擇沒有完整持久化 — 已修正

- **問題**：2024 背景中的工具選擇，以及背景／人類額外起源專長的細部選擇，原本有資料落差。
- **影響**：畫面上選過的工具或專長內容可能無法在角色摘要、JSON 或重新載入後完整還原。
- **處理**：新增 `bgChoice2024`、`originFeatChoices` 等 State，並進入存檔與匯出。
- **狀態**：✅ PASS

### P8｜College of Dance 的 Tandem Footwork 等級放錯 — 已修正

- **問題**：吟遊詩人舞蹈學院的 `Tandem Footwork / 協同舞步` 原本被網站放在 **10 級**。
- **5RTools 正式 progression**：該能力屬於 **6 級**。
- **處理**：已從 10 級移除，併入舞蹈學院 6 級能力。
- **狀態**：✅ PASS

### P9｜缺少穩定 identity，過度依賴中文名稱 — 已修正

- **問題**：部分法術／專長／戰鬥風格／史詩恩賜原本主要靠中文顯示名稱做對應。
- **影響**：繁中、簡中、英文名稱差異，或未來改譯名時，容易讓 FVTT／5RTools 對照失效。
- **處理**：
  - 391 法術皆有 stable identifier。
  - 10 Origin Feats、43 General Feats、10 5RTools Fighting Styles、12 Epic Boons 建立 stable identifier。
- **狀態**：✅ PASS

### P10｜5RTools 來源本身含孤兒資料，若整包照單全收會誤修 — 已處理

- **問題**：5RTools class JSON 內存在未被正式 progression 引用的 feature record。
- **實例**：Bard 資料中曾看到一筆 14 級 `Magical Secrets` record，但正式 `class.classFeatures` 引用鏈並未引用它。
- **另一來源差異**：Paladin 19 級同類史詩恩賜節點英文名稱使用 `Legendary Boon`，其他職業多使用 `Epic Boon`。
- **處理原則**：只把正式 `class.classFeatures` / `subclassFeatures` 引用鏈當成 progression Source of Truth。
- **狀態**：✅ QA 已防止假陽性與誤修

### P11｜舊 Save Schema 無法完整保存新增 2024 選項 — 已修正

- **問題**：原 Save Schema 無法完整表示 Battle Master、背景工具、Origin Feat、Epic Boon、Druidic Warrior 等新增 State。
- **處理**：`SAVE_VERSION` 升至 **9**，並加入：
  - `classChoices2024`
  - `bgChoice2024`
  - `originFeatChoices`
  - `boonChoices`
  - `styleCantrips2024`
  - 既有 `featSpells` 繼續保存專長法術選擇
- **驗收**：serialize → deserialize round-trip PASS。
- **狀態**：✅ PASS

### P12｜目前仍需保留的工程注意事項

這些不是目前的規則 FAIL，但不能當作「不存在」：

1. Repository 仍有其他先前施工留下的 modified / untracked 檔案，本輪沒有自行 reset、checkout 或 discard。
2. 尚未 commit；目前 PASS 是以實際 Runtime + QA 為準，不以 Git commit 狀態代替。
3. `git diff --check` 只有 `index.html` LF → CRLF 的 Git 提示，**不是 whitespace error**。
4. 未來若更新 5RTools snapshot，必須重新跑 parity Gate；不能沿用本次 PASS 當成永久保證。

## 固定 Snapshot

來源目錄：

`D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024`

| 資料 | SHA-256 |
|---|---|
| PHB2024 法術 | `9a45afaea0ad571011fb80b7af80c17a2aa1d321d39c4cb96dbf2d73f43ad0ea` |
| 專長 | `71b7d95d797c609bccb34644a78a0ab7785831aa64dcbb3c96986f47a495e0f2` |
| 背景 | `91c48243da03009ed86cdb3577ae13e1e4fc03978096d131bfb6c017d1b8bbfa` |
| Optional Features | `eb92aa60e38282bbab4ff62e677228de4c80ab6f34431886809a36792d6c7165` |

法術 snapshot UTC 修改時間：`2026-10-24T03:40:09.5611939Z`。

## 法術

- 5RTools PHB2024：**391**
- Runtime：**391**
- Unique stable identifier：**391**
- 原本缺少的 13 道：**13/13 已補**
- 全 391 道逐筆驗證：
  - level
  - school
  - concentration
  - ritual
  - stable identifier
  - structured signature
- 2024 Runtime 改由 `assets/data/spells-phb-2024.js` canonical data layer 提供。
- `scripts/build-5r-spell-data.js` 可由 snapshot 重建；不是 391 筆或 identifier 不唯一即 FAIL。
- 舊 embedded spell data 僅保留 fallback；2014 路徑不變。

## PHB2024 專長

5RTools snapshot 共 **75** 筆：

- Origin：**10**
- General：**43**
- Fighting Style：**10**
- Epic Boon：**12**

Runtime identity Gate 全數 PASS。

### 已完成的主要修正

- 補入 `Weapon Master`。
- 修正舊版殘留規則：Great Weapon Master、Durable、Heavy Armor Master、War Caster、Crossbow Expert、Dual Wielder、Grappler、Spell Sniper、Mage Slayer、Shield Master、Charger、Mounted Combatant、Sharpshooter、Sentinel、Polearm Master 等。
- 追加內容級校正：Chef、Poisoner、Great Weapon Fighting、Protection。
- Origin / General / Fighting Style / Epic Boon 均建立 stable identifier，不再只靠繁中顯示名稱作唯一 key。

### 必要選項已成為真正 State

- Crafter：3 工匠工具
- Skilled：3 技能/工具
- Musician：3 樂器
- Magic Initiate：施法屬性 + 2 戲法 + 1 一環法術
- Elemental Adept：傷害類型
- Skill Expert：技能熟練 + 專精
- Keen Mind / Observant：技能升級
- Ritual Caster：依 PB 數量的一環儀式；測得 level 1/5/9 = 2/3/4
- Weapon Master：武器精通選擇
- Druidic Warrior：2 道德魯伊戲法，實際進入授予法術清單

上述選項會進入角色規則效果、serialize / deserialize、角色摘要與 readable export，而非只存在 UI。

## 背景與工具

2024 背景工具選擇已落實並持久化，包含至少：

- Artisan
- Entertainer
- Soldier
- Guard
- Noble

角色輸出顯示實際選中的工具，不再只顯示「一種工具 / 賭具」泛稱。

## 職業 / 子職業

`tests/qa-5rtools-class-progression.js` 對 **12 職業 / 48 個 PHB2024 子職業** 驗證：

- Hit Die
- Saving Throw proficiencies
- 起始技能選擇數
- ASI levels
- 正式引用的核心 class feature 出現等級
- PHB2024 subclass count
- subclass feature level patterns

**12/12 職業 PASS。**

本輪抓到並修正的真差異：

- Bard — College of Dance：
  - `Tandem Footwork / 協同舞步`
  - 網站原本錯放 **10 級**
  - 5RTools 正式 progression 為 **6 級**
  - 已修成 6 級與 Inspiring Movement 同級。

來源資料異常但沒有誤修：

- 某些 class JSON 內存在未被 `class.classFeatures` 引用的孤兒 feature。
- Paladin 19 級同類型節點英文名稱使用 `Legendary Boon`，其他檔案常用 `Epic Boon`；QA 已視為同一泛用 19 級恩賜節點。

## 2024 Class / Subclass Choice State

已完成並驗證：

- Battle Master：3 / 5 / 7 / 9 戰技數量，以及 Student of War 工具與技能
- Champion：7 級 Additional Fighting Style
- Hunter：3 級 Hunter's Prey、7 級 Defensive Tactics
- 2014 Hunter 舊 11/15 級選擇不再滲入 2024
- Druidic Warrior：2 道德魯伊戲法

## Epic Boons

12 項已改為 5RTools 2024 規則並加入 stable id。

特別修正：

- Boon of Fate：2d4 加減 D20 結果，不再是舊的直接改 20/1
- Boon of Recovery：0 HP 防倒 + 最大 HP 一半、10d10 healing pool
- Boon of Speed：+30 ft、Bonus Action Disengage + 結束 Grappled
- Boon of the Night Spirit：微光/黑暗隱形與除 Psychic/Radiant 外傷害抗性

持久化選項：

- Boon of Energy Resistance：2 種能量抗性
- Boon of Skill：1 項尚未專精技能；會實際取得全技能熟練及該技能專精

## Save Schema

`SAVE_VERSION = 9`

新增持久化狀態包含：

- `classChoices2024`
- `bgChoice2024`
- `originFeatChoices`
- `boonChoices`
- `styleCantrips2024`
- 既有 `featSpells` 仍保存專長法術選擇

Round-trip QA：**PASS**。

## QA 證據

本輪最終執行均為 exit code 0：

- `tests/qa-5rtools-parity.js` — PASS
  - spells 391 / unique 391 / missing13 0
  - feats 75 = 10 + 43 + 10 + 12
  - Magic Initiate、Ritual Caster、Skill Expert、Keen Mind、Druidic Warrior、Epic Boon state/round-trip
- `tests/qa-5rtools-class-progression.js` — PASS
  - 12 classes / 48 PHB2024 subclasses
- `tests/qa-2014-matrix.js` — PASS
  - cartesian 2340 / failures 0
- `tests/qa-2024-export-and-spell-ui.js` — PASS
- `tests/qa-identity-fields.js` — PASS
- `tests/qa-languages.js` — PASS
- `tests/qa-2014-pdf.js` — PASS
- `tests/qa-2024-pdf-layout.js` — PASS
- `tests/qa-shopping.js` — PASS
- `git diff --check` — PASS
  - 僅有 Git 提示 `index.html` 未來可能由 LF 轉 CRLF，不是 diff error。

## 本輪主要交付檔

- `index.html`
- `assets/data/spells-phb-2024.js`
- `scripts/build-5r-spell-data.js`
- `tests/qa-5rtools-parity.js`
- `tests/qa-5rtools-class-progression.js`

Repository 原先已有其他 modified / untracked 工作；本輪沒有執行 reset / checkout / discard，也沒有 commit。

## Release Gate

目前可標記：

**5RTools 5R / PHB2024 規則對齊：PASS**

PASS 的含義是：

- 本報告列出的 5RTools snapshot 與 Runtime Gate 已一致；
- State PASS 由可重跑測試產生，不以人工狀態文字取代；
- 2014 舊版與既有 PDF / UI 回歸 Gate 未因本輪施工變紅。

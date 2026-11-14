# TRPG Player Sheet｜維護、修正與擴充手冊

> 這是工程維護與擴充的長期紀錄。規則 Hard Boundary 仍以 `PROJECT_RULES.md` 為準；本文件負責記錄架構、連動、問題、根因、修法與未來擴充流程。

## 一、網站定位

網站是 **D&D 5R / PHB2024 角色建立 + 規則查詢 + Final Sheet / JSON / PDF 輸出工具**。

不做戰鬥自動化：不代擲攻擊、不自動套狀態、不自動結算。**唯一明確例外：玩家主動點擊跑團狀態的短休／長休，依 2014／2024 規則恢復生命骰、生命值、法術位與明確標記的資源**，不處理未明確標記的觸發或選項。

必須做到：
- 角色建立資料正確。
- 1–20 級職業／子職業 progression 正確。
- 主動能力優先可查，被動能力完整可查。
- 物種、背景、專長、戰鬥風格、史詩恩賜、戰技、超魔、魔能祈喚與主要職業選項有完整規則。
- 法術清單、最高環位、授予法術與恆定準備法術正確。
- Final Sheet、Ability Lookup、Spell Lookup、JSON、PDF 不維護彼此矛盾的規則副本。

## 二、Source of Truth

1. **5RTools snapshot**：PHB2024 規則權威。
2. **FVTT PHB2024**：stable identifier / Item / Advancement 結構的第二證據。
3. **Repository / Live Runtime**：實際完成狀態。
4. **PROJECT_RULES.md**：專案 Hard Boundary 與 QA contract。

主要 canonical 投影：
- `assets/data/spell-rules-2024.js`：391 道法術正文。
- `assets/data/feature-5r-full-rules.js`：職業／子職業 full rules，key 含 class/subclass/feature/level。
- `assets/data/species-5r-full-rules.js`：物種 full rules。
- `assets/data/feat-5r-full-rules.js`：起源／通用／戰鬥風格／史詩恩賜 full rules。
- `assets/data/active-options-5r-full-rules.js`：超魔與魔能祈喚等 optional feature full rules。
- `assets/data/maneuvers-5r.js`：戰技。
- `index.html`：Creator、State、投影、Final Sheet、Ability Lookup、Spell UI、JSON。

## 跑團狀態休息流程（2026-11-14）
- 入口：`index.html` 的跑團狀態短休／長休按鈕。
- 單一引擎：`assets/play-status-rest-5r.js`，依穩定資源 key 產生更新清單；不解析本地中文簡述、不建立第二份職業規則資料庫。
- State：只修改 `S.play`、`S.slotsUsed`；既有 `serialize()` / `deserialize()` 包含這兩個欄位，舊自訂計數器若無 `rest` 欄位視為手動恢復。
- 短休：可使用 0～剩餘生命骰，骰值加體質調整值（至少 1 點）、以 HP 上限截斷；僅恢復被規則允許的資源與契約法術位。奧術恢復、術法恢復等需選擇的能力僅提示。
- 長休：HP 全滿、一般法術位與契約法術位恢復；2024 生命骰全部恢復、2014 最多恢復一半；暫時 HP 清除，死亡豁免歸零；2024 人類獲得英雄激勵；力竭或屬性損傷等未追蹤欄位僅提示。
- 保護：HP=0 禁止啟動、骰數不足不改 State；2014 多職業混合骰型保留手動生命骰處理，不擅自假定主職骰型。
- QA：`tests/qa-play-status-rest.js`、`tests/qa-play-status-rest-browser.js`（390／480／1440px、儲存讀回），以及原有部署回歸。

## 三、資料連動圖

```
5RTools / FVTT
  ↓ parser / stable identity / alias
canonical maps
  ↓
Creator UI / Level-up
  ↓
S state
  ├─ choice readiness
  ├─ granted / always-prepared spells
  ├─ Final Sheet
  ├─ Ability Lookup
  ├─ Spell Lookup / Spell Sheet
  ├─ Save JSON / deserialize migration
  ├─ Readable JSON
  └─ Official PDF
```

任何 entity 的新增、刪除、改名、等級調整或規則修正，都必須沿整條鏈查 consumer。

## 四、目前已完成的主要修改

### 5RTools / 規則
- 12 職業 progression parity。
- 48 個 PHB2024 子職業 level pattern 對齊。
- 物種 full-rule map。
- Feature parser 支援 refClassFeature、refSubclassFeature、nested entries、table。
- 同名 Feature 改用 class/subclass/feature/level，避免不同等級共用錯規則。
- 391/391 法術改為單一 canonical 正文。
- 法術名稱統一「繁中 English Name」，英文直接取 upstream ENG_name。
- 專長 canonical full-rule map。
- 超魔 canonical。
- 魔能祈喚改由 5RTools `optionalfeatures.json` / EI 來源對齊。
- 非 PHB2024 的「德魯伊戰士」已從 2024 Creator 移除，舊 2024 特殊授法／UI 路徑同步清理。

### Ability Lookup
- 速查頁新增「能力速查」為預設入口。
- 主動能力優先，另有全部／被動。
- 可篩動作、附贈動作、反應、攻擊替代、魔法動作、無需動作。
- 可搜尋 DC、傷害骰、距離、資源、效果、來源。
- 涵蓋物種、職業、子職業、專長、戰鬥風格、史詩恩賜、戰技、超魔、魔能祈喚與主要職業選項。

### Spell UI
- 禁止摘要版＋完整版雙軌。
- 卡片／搜尋／Tooltip 都由同一 canonical 規則投影。
- 環位、職業、專注、儀式、成分支援多選。
- 長文採分段、可讀字級與 responsive layout。

### PDF
- 修復本機 HTTP server 停止造成的 `Failed to fetch`。
- PDF template 與 NotoSansCJKtc 必須從 live URL 可讀。
- 修復「AcroForm 欄位有值但 PDF viewer 不顯示」：陣營與護甲熟練改烘焙進頁面。
- 舊「混亂」陣營 migration 為「混沌」。
- 移除會變問號的 bullet glyph。
- 背景故事最低字級提高。
- PDF PASS 必須 raster / render，不能只讀欄位值。

### Cache / Live Runtime
曾發生 Source 已修好，但瀏覽器仍執行舊 `character-sheet-export.js`。

修法：
- 關鍵 JS 使用版本化 query。
- QA 要驗瀏覽器真正 loaded script / runtime function。
- Source PASS 不等於 live browser PASS。

## 五、曾發生的 False PASS 與永久修法

### 1. PDF field 值正確，但人眼空白
根因：AcroForm appearance / viewer 相容性。
修法：關鍵欄位 static bake + raster QA。

### 2. 自動測試新版 PASS，真人仍輸出舊版
根因：browser cache。
修法：資源版本化 + fresh load + Runtime identity check。

### 3. 摘要與 full rule 同時存在
根因：兩份規則會漂移。
修法：canonical 單一正文；摘要僅可 runtime derive。

### 4. 同名 Feature 配錯等級
根因：只以名稱作 key。
修法：class|subclass|feature|level。

### 5. 只改 UI，State / spell grant / QA 還留舊邏輯
案例：德魯伊戰士。
修法：Entity 移除要查 UI → State → ready gate → serialize/deserialize → spell grant → Final Sheet → JSON → PDF → QA。

### 6. 中文同義名稱連到錯法術
案例：天界宗主 9 級原本用「召喚天界生物」，Runtime 命中 7 環 `Conjure Celestial`；PHB2024 正確是 5 環 `Summon Celestial / 天界生物召喚術`。
修法：授法 mapping 優先 stable identifier / ENG_name；中文顯示名只能是 projection，不得當唯一 identity。Full Matrix 已納入高環位異常檢查。

### 7. 其他已修資料問題
- Stars 子職業錯誤 additional spells。
- Hunter 錯誤 spell table。
- Fey Wanderer 9 級授法錯誤。
- PDF 輕甲熟練未顯示。
- 陣營值未正規化。
- PDF 種族 bullet 亂碼。
- 背景故事字級過小。

## 六、Change Propagation Checklist

任何修改至少檢查：
1. upstream canonical。
2. parser / alias / stable identifier。
3. Creator 選項。
4. readiness gate。
5. Runtime S state。
6. progression。
7. granted / always-prepared spells。
8. Final Sheet。
9. Ability Lookup。
10. Spell Lookup。
11. serialize / deserialize migration。
12. Readable JSON。
13. PDF。
14. responsive UI。
15. 2014 compatibility。
16. targeted regression。
17. full character matrix。
18. full Release Gate。
19. fresh runtime reload。

## 七、全角色矩陣 Gate

永久測試：`tests/qa-full-character-matrix.js`

固定 seed：`0x5A17C0DE`。

覆蓋：
- 12 職業 × 1–20 級 base：240 cases。
- 48 子職業 × 3–20 級：864 cases。
- 合計 1,104 cases。
- 每個 case 隨機物種、背景、標準陣列與職業技能。
- 實際 `renderFinal()`、`renderSpells()`。
- 累積 Feature 必須出現在 Final Sheet。
- canonical Feature 必須有 Runtime tooltip。
- 391 道法術 class membership 對 5RTools。
- 每級最高法術環位對 5RTools class table。
- always-prepared spell 不得不存在或誤授過高環位。

最新 machine report：
`D:\Tools\zizi-ai-runtime	rpg-playercheet-qaull-character-matrix-report.json`

## 八、未來擴充標準流程

新增物種／職業／子職業／專長／法術／optional feature：
1. 先確認 upstream。
2. stable identifier / ENG_name 優先，不以繁中名稱作唯一 key。
3. 建立 canonical data，不新增第二份摘要。
4. 接 Creator projection。
5. 接 State / migration。
6. 接 Final Sheet / Ability Lookup / Spell Lookup。
7. PDF 從同一 canonical 投影。
8. 新增 targeted QA。
9. 跑 Full Matrix。
10. 跑 Release Gate。
11. fresh browser reload。
12. 視覺輸出做 render / raster。

## 九、禁止的驗收捷徑

以下任何一項都不足以宣稱完成：
- 指令 exit 0。
- 檔案已寫入。
- DOM 有值。
- PDF field 有值。
- 單一角色 PASS。
- 單一職業 PASS。
- Source 測試 PASS 但 live browser 未 reload。
- State 寫 PASS。
- overflow=false。
- 人工只看一個畫面。

## 十、維護入口

- Hard Boundary：`PROJECT_RULES.md`
- 維護手冊：`docs/MAINTENANCE_AND_EXTENSION_GUIDE.md`
- 全矩陣：`tests/qa-full-character-matrix.js`
- Matrix report：runtime `full-character-matrix-report.json`
- Release Gate：`D:\Tools\zizi-ai-runtime	rpg-playercheet-qa
elease-gate.py`

## 十一、擴充前 Exhaustive Gates

Full Character Matrix validates many legal character combinations. It does not replace exhaustive branch coverage.

Required additional gates:
- tests/qa-spell-progression-exhaustive.js: every level spell-count/slot/Pact/third-caster parity.
- tests/qa-subclass-spell-exact-parity.js: exact additionalSpells parity by stable English spell identity.
- tests/qa-choice-exhaustive.js: every selectable 2024 branch is round-tripped at least once.
- tests/qa-feature-no-overrides.js: runtime 不得重新出現 Feature override DB；歷史例外必須已遷入 level-aware canonical map。

Both Matrix and Exhaustive Gates are required before future data expansion releases.

## 十二、擴充前硬化

Save migration fixtures: tests/fixtures/legacy-fighter.json、legacy-wizard.json、legacy-warlock.json、legacy-species-choice.json。qa-save-migration-fixtures.js 必須走 deserialize → renderFinal/renderSpells → serialize → deserialize 雙重 round-trip。

Feature resolution: `feature-5r-overrides.js` 與 `feature-override-manifest.json` 已退休。2024 Feature 一律由 `ZIZI_5R_FULL_FEATURE_RULES` 的 `職業|子職業|Feature|等級` key 與 `assets/feature-resolver-5r.js` 解析；歷史遷移只保留 `feature-5r-manual-provenance.json` 作證據，不可再建立第二份 runtime 規則正文。

薄模組化：assets/ability-lookup.js 只負責 Ability Lookup derived view；assets/save-compat.js 只放純 migration helper。Creator/Level-up/Final Sheet 核心 state machine 暫不拆。

Release 必須額外通過 qa-module-smoke.js、qa-feature-no-overrides.js、qa-save-migration-fixtures.js，以及既有 spell progression、subclass spell exact parity、choice exhaustive、full character matrix。

## 十三、5R 魔法物品與玩家生物資料

- 上游固定：5etools-src v2.37.0 / commit `8c026b807fac21862a309379a0c3228a0683198b`；詳見 `docs/PLAYER_REFERENCE_DATA_SOURCE.md`。
- `584` 是 XDMG 原始 item-source 總數，包含普通財物；目前真正魔法物品為 435 件，不得混稱。
- 生物庫目前為 XMM 503 + XPHB 15 + XDMG 2 = 520。
- `scripts/build-5r-player-reference.py` 會掃描全部 XPHB 法術的直接 `creature` 引用，不維護召喚法術白名單。
- 玩家分類：召喚／法術生物、魔寵、坐騎、獸王夥伴、荒野變形、全部怪物。
- 荒野變形與大型野獸坐騎候選均由 canonical stat block 推導，不維護第二份手寫清單。
- 每次資料更新必跑 `qa-player-reference-data.js`、`qa-player-reference-ui.js`、Full Matrix 與完整 Release Gate。

## 十四、Player Reference 繁中顯示層

正式中文資料流：

`5etools-src English canonical → ENG_name/source identity → 5etools-cn cn2.0 → OpenCC s2twp → zh projection`

目前覆蓋：XDMG 魔法物品 435/435、生物 520/520。名稱保留繁中＋英文，其餘顯示全部繁中。若未來 upstream 新增項目，先檢查 5etools-cn 是否已有同 identity 翻譯；只有在正式來源確實缺漏時才另開缺口處理，不得直接把機翻變成 canonical projection。

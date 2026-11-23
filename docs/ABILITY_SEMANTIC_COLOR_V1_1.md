# D&D 5R｜屬性語意上色規則 v1.1

狀態：施工候選／尚未正式發布；2026-11-23。適用既有 D&D 5R 網站規則閱讀 UI，**不**修改 5RTools canonical 規則、玩家資料、JSON、PDF 或列印文字。

## 目標與命名

讓六大屬性名稱在「屬性 + 檢定／豁免／豁免檢定／調整值／技能／施法與公式」等語境一眼可辨，且與原有傷害、狀態、施法語意配色共存。

只用**已存在的共用 renderer** `assets/damage-semantic-5r.js` 及其單一 DOM MutationObserver；配色定義維持在 `assets/damage-semantic-5r.css`，不另加全域觀察器或第二份規則文本。呈現 class 應統一為 `.ability-semantic[data-ability="<code>"]`，不建立功能重複的 `.attr-str` 等 class。資料鍵採 D&D 六屬性縮寫，CSS token 採 `--ability-<code>`。

| 屬性 | 英文 | `data-ability` | 淺底（羊皮紙） | 深底（#featureTip / #spellTip） |
|---|---|---|---|---|
| 力量 | Strength | str | `#9C3328` | `#FF9F8E` |
| 敏捷 | Dexterity | dex | `#1E664A` | `#91DFB0` |
| 體質 | Constitution | con | `#865413` | `#FFD38C` |
| 智力 | Intelligence | int | `#235C8C` | `#92C8F4` |
| 感知 | Wisdom | wis | `#68418D` | `#C9B0FF` |
| 魅力 | Charisma | cha | `#963D69` | `#F3A9D3` |

標示屬性時，應用語意色文字、較粗字重與輕量半透明底色；深底和淺底均需達 WCAG AA 正文對比（至少 4.5:1）。hover／pin／focus／selected 不得失色；print 不得把色彩與裝飾寫入原規則文本。

## 語意辨識契約

**應上色：** 六屬性本體，包含 `感知豁免檢定`、`敏捷豁免`、`魅力檢定`、`體質調整值`、`智力（奧秘）`、`力量（運動）`、`以感知作為施法屬性`、`使用敏捷進行攻擊`、`智力為 18`、`力量增加 1 點` 等規則句型。動作／檢定／豁免／DC 與傷害詞仍由既有規則語意控制，不把整句強迫變成屬性顏色。

**不可誤判：** `魅力學院`（子職名稱）、`立體質感`、`感知範圍`（一般感官能力）、`力量之源`（非屬性公式敘述）、人物名稱、玩家輸入內容。若字義無法確認，保留原文字樣，不靠字串全取代誤傷標題。

**DOM／相容性：** 不重寫 canonical text；不得改變文字節點的可讀全文、搜尋、複製結果、序列化或角色 State；不得把純文字重新編碼成 HTML 文字並插入。修飾既有文字節點、嵌套 emphasis／連結／小卡標題時應保持原元素和事件可用，避免重複包裝（idempotent）。`script/style/textarea/select/option/code/pre/contenteditable` 不處理，明確 `data-no-ability-color` 選擇性保留。

## 覆蓋範圍

創角與升級的職業／子職業、物種／背景／專長預覽；法術及具名 Feature 的規則小卡、展開全文；角色卡、跑團狀態、規則速查／角色百科、怪物／物品／效果文字。由現有共用 DOM 觀察器視實際容器套色，沒有另維護各頁摘要。未觀察到的其他 portal 顯示面須按實際 DOM 取證再修正。

## 驗收與風險邊界

1. 六屬性 × 常見句型有相同穩定 token；反例沒有上色。
2. 同時有傷害、豁免、其他規則重點時不掉色、不互相覆蓋。
3. 1440／480／390px 在淺底、深底皆可讀；對比度、長卡垂直捲動及整頁無水平 overflow。
4. 原文字 `textContent` 相同；動態插入、重複渲染、連結／互動／鍵盤不失效；大型 DOM 不出現無界限掃描。
5. 從角色百科 → 吟遊詩人 → 魅音學院 → 3 級特性，與真實創角法術／職業選擇入口驗證；API 或人工插入 fixture 只算 INTEGRATION，不可假冒 LIVE-UAT。
6. 既有 `qa-ability-semantic-color-v1.js`、`qa-damage-semantic-colors.cjs`、`qa-feature-tooltip-readability.js`、`qa-spell-tooltip-readability.js`、`qa-reference-contrast.js`、`qa-stage0-runtime.js` 及受影響完整回歸 PASS，且正常正式發布 Gate 通過後才准合併與部署。

## v1.1 增量施工與驗收證據

- 最初 v1 語法對新增六種合法的施法／公式語境為 **0/6**，已修復為 **6/6**，且 「魅力學院／立體質感／感知範圍／力量之源」 仍 **0 誤判**。
- 在現有 「13 種傷害 + 6 屬性」 共用 MutationObserver 中增加 `characterData` 更新處理，避免原地更新規則文字後漏上色；同一 pass 的實體 DOM 只包裝一次，不修改原 `textContent`。
- 追加 `tests/qa-ability-semantic-color-v11.js`，驗證六屬性色票（淺／深各一組）、語境辨識、巢狀重點／連結、opt-out、動態更新、重複處理、390／480／1440px 無水平 overflow，並保留手機截圖。
- 2026-11-23 隔離候選已通過 v1.1 及既有語意／傷害／法術／Tooltip／角色檢索 **13/13** 定向回歸，以及完整角色矩陣、2024 PDF、2014、舊存檔 **4/4** 相容回歸。最高證據等級 **INTEGRATION PASS**；不代表正式網站已部署。
- 新測試接回既有 `qa-damage-semantic-colors.yml` 與 `pages.yml`，不是第二條 CI 或第二個 renderer。

**Ownership／發版界線：** v1 的 `dnd5r-attribute-semantic-color-v1-20261123` 已釋放四個精確寫入租約；本 v1.1 在自己的獨立分支取得需要修改的五個精確檔案租約，沒有覆寫原 v1 工作樹。PR #113 仍為 Draft／尚非正式上線；本輪沒有新規則的正式網站部署明確授權，Release HOLD。

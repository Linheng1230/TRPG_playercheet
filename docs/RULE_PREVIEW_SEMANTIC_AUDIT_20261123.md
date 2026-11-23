# 全站規則預覽語意配色稽核（2026-11-23）

## 目標與邊界
將已有法術預覽的規則語意視覺層擴展到物種、角色背景、職業與子職業、專長、圖鑑及規則速查。這是**畫面投影修改**，不修改 canonical 規則、特性身分、角色 State、JSON、PDF 或正式資料庫。保留 2014／2024 版次隔離。角色介紹與世界觀敘事不應強制把每個詞上色。

## 本次已接入的既有預覽
| 入口 | 主要渲染器 | 對應處理 |
|---|---|---|
| 創角物種特性與分支 | `speciesTraitHTML5R`、`featureInlineHTML` | 數值、動作、資源、抗性、條件與法術連結 |
| 創角背景起源專長 | `renderOrigin`、`featDesc` | 從純文字改用共用 feature 預覽 |
| 2014 物種特性預覽 | `renderOrigin`、`RACE_TRAIT_DESC14` | 詳述文字標重點，保留原始字句 |
| 升級子職業等級預覽 | `subclassPreview5R` | 接回共用 feature 預覽 |
| 創角職業的特殊選擇 | `classReadOnlyChoicePreview2024`、`featureInlineHTML` | 透過既有共用渲染器自動覆蓋 |
| 特性懸停／釘選卡 | `featureTipHTML` | 使用深色版語意色票 |
| 物種／背景百科 | `renderRoleCatalog5R` | 特性與起源專長詳細規則 |
| 12 職業／48 子職業百科 | `cr5rRuleHTML` | 僅渲染層套色，保留原有分段 |
| 能力速查 | `abilityRuleHTML` | 覆蓋職業、物種、專長、戰技、超魔法、祈喚等 |
| 通用專長與戰鬥風格速查 | `renderRef` | 規則效果套色 |
| 武器精通與戰鬥行動速查 | `renderRef`、`combatRefCard5R` | 觸發與判定套色 |
| 魔法物品／怪物百科 | `prSectionsZh` | 章節正文套色，保持英文 canonical → 繁中投影 |
| 工具規則圖鑑 | `renderToolRef` | DC、製作和應用文字套色 |
| 施法預覽 | 既有 `creator-spell-glance-2024`、`cantrip-tooltip-2024` | 保留既有的法術語意規則，不複製第二套 |

## 配色契約
- 13 種傷害類型：直接引用 `ZIZI_DAMAGE_SEMANTICS_5R.types` 與 `damage-semantic-5r.css` 的既有色票
- 優勢：綠色、劣勢：紅色，跟法術語意標記相容
- DC／骰值／距離與等級、行動經濟、使用／恢復、豁免與狀態：共用 `featureSemanticHTML5R`
- 原文字義一律不改；HTML 特殊字元跳脫，保留法術連結。列印與 PDF 不套用新的重點顏色

## 驗證
- `tests/qa-rule-semantic-preview.js`：字詞、傷害類型、資源、法術連結與 HTML 安全
- `tests/qa-rule-semantic-browser.js`：Chrome 真實 UI，1440／480／390px；創角物種與背景實際點選、2014 物種，職業百科／能力／專長／魔法物品／怪物／工具／精通／動作
- 原本的 `qa-player-reference-ui.js`、`qa-player-reference-data.js`、`qa-tool-reference-5r.js`：回歸
- 仍須以最新 main 為基準做整合 Gate、CI、正式網站 Live-UAT。局部檢查不得冒充完整 Release PASS。

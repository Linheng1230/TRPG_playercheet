# 2024 法術預覽數值一致性修復（2026-11-19）

## 事件與影響

玩家在創角第七步的 **黑暗視覺 Darkvision** 小卡看到「60 呎黑暗視覺」，但點入 canonical 完整規則卻是「150 呎黑暗視覺」。這是**規則效果被錯誤摘要取代**的重大缺陷，而非配色或排版問題。

根因：`scripts/build-5r-spell-data.js` 原先優先保留既有 `SPELLS_2024_TUPLES[*][13]`，再從站內舊 `SPELL_RAW` / 其他摘要取得來源。這些歷史摘要不一定隨 5RTools PHB2024 canonical 完整規則更新。之前的 391 道 QA 僅檢查字數、語法、canonical 本身沒有變動，**沒有驗證預覽效果聲稱的數值是否與 canonical 一致**。

## 直接根因校正與上游防回退

5RTools canonical 的 `assets/data/spell-rules-2024.js` 保持原狀。更正由現有 canonical 讀取確認的歷史摘要（僅影響 2024）：

| ID | 舊短摘要缺陷 | Canonical 對應 |
| --- | --- | --- |
| darkvision | 60 呎黑暗視覺 | **150 呎** |
| befuddlement | 4d6、誤寫失去理解語言與能力檢定損害 | **10d12 心靈傷害**，不能施法／魔法動作 |
| prayer-of-healing | 2d8 **加上施法屬性調整值** | 僅 **2d8**，有短休增益 |
| aura-of-vitality | 每回合以**附贈動作**治療 | 施法時及之後**每回合開始**恢復 2d6 |
| ray-of-enfeeblement | 只說力量檢定與力量豁免 | 完整效果涵蓋**使用力量屬性的 D20 檢定**，傷害骰 -1d8 |

維護方式：除了更正版本庫已有的結構化 2024 摘要檔，也在 `scripts/build-5r-spell-data.js` 加入小型、以 canonical 明確片段驗證的修正函數。每個數值**在建置時由 canonical 文字抓取**，沒有第二套獨立真實規則值。若官方原文改動而驗證錨點失效，建置直接失敗，不得沿用舊數值。保留 2014/2024 隔離、13 種傷害色與完整詳情內容。

## 強化 Release Gate

`tests/qa-spell-summary-canonical-parity-20261119.js`：檢查全部 391 道 short summary 與 rendered glance 的骰式、呎數、明確時間、豁免屬性、額外施法屬性值及後續附贈動作宣稱。對 1d8 vs d8（橡棍術）及 1d6 vs d6（突觸靜止）設置**有 canonical 原文條件的等價表示例外**，不可把這類文法差異錯改成規則。上述五道加入明確的個別 Golden Assertions。自動 Gate 無法證明所有 391 道描述的**完整語義**均經獨立人工逐句校閱；缺陷封鎖範圍是可驗證的數值／已查明的機制差異。

`tests/qa-spell-summary-parity-browser-20261119.js`：320 / 390 / 1440px 真實創角路徑（德魯伊 4 級），直接讀取小卡摘要並點法術名稱，確認 **預覽與實際詳情都為 150 呎**、關閉鈕可觸控、原始閱讀樣式仍在。測試角色只存在隔離瀏覽器中，不修改正式玩家角色。

兩個 Gate 接入既有 Creator UX 與 Pages Workflow；Pages 部署前檢查 391 機制，部署後再次連公開網址操作。完整既有 QA 和 Live UAT 必須全部通過才能發布。無法以 CI 通過取代人工規則編審或獨立來源核對。

## 發版界線

禁止覆蓋 local dirty main；Remote Desktop Commander 此月額度用完，不重試。使用 GitHub 獨立分支 + Draft PR，未通過 Release Gate 不得解除 Draft／合併／部署。
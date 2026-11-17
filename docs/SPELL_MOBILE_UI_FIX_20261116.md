# D&D 5R 法術創角手機排版與詳情浮窗關閉修復｜2026-11-16

> 此文件為本次修復與 QA 證據索引；不保存另一份法術原文，也不是正式部署成功證明。

## 已重現問題及根因

1. **創角第七步法術摘要超出卡片：** `assets/readability-typography-5r.css` 的 `.spell-chip .sd` 設有 `display:-webkit-box` 與 `-webkit-line-clamp:2`；隨後 `index.html` 的 `#spellBody .creator-spell-card .sd` 將 `overflow` 改為 `visible`，卻沒有解除行數限制。卡片只取得兩行高度，第三行之後仍畫出到下一張卡片。根因是同一個元素兩套 CSS 契約衝突，不是字型太大或 Grid 本身限制高度。
2. **法術小卡往下捲動後關閉叉叉消失：** `.rule-popover-close` 採 `position:absolute`，但父層 `#spellTip` 是 `overflow-y:auto` 的捲動容器。按鈕跟著內容離開捲動視窗，失去可視與觸控命中。

### 修復前的量測

- 320px 德魯伊《四象法門》摘要 `clientHeight≈38px`、`scrollHeight≈134px`；卡片外框 `height≈111px`、實際內容 `scrollHeight≈198px`。
- 320px 《德魯伊伎倆》摘要也有 `clientHeight≈38px`、`scrollHeight≈96px`。
- 同樣 320px，釘選小卡向下捲 `365px` 後，關閉鈕頂端位置變成 `-28px`，點擊命中測試為 false。
- 原始定位與量測：`D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\spell-mobile-ui-baseline-20261116.js`、`spell-mobile-ui-after-patch.json`、修復前後截圖（QA runtime，不提交網站原始碼）。

## 最小修復

僅修改 `index.html` 的兩處 CSS；不改 `assets/readability-typography-5r.css`，以免破壞其他清單的兩行摘要樣式。

- `#spellBody .creator-spell-card .sd`：改為 `display:block`、`-webkit-line-clamp:unset`、`line-clamp:unset`，原預覽內容和數值完整顯示，Grid 高度由內容自然決定。
- `#spellTip.rule-popover-pinned>.rule-popover-close`：改為 `position:sticky`，維持上方可視、右側對齊及 36×36px 觸控範圍；保留原生 `data-rule-popover-close` 事件與釘選／解除流程，沒有增加第二組關閉器。
- 無框法術規則、98 道零環／一環語意分段、34 項多選核心效果粗體、13 種傷害色、豁免／DC／優勢與劣勢及 2014／二環隔離都不在本輪修改範圍。

## 可重跑真實操作 QA

- `tests/qa-creator-spell-mobile-layout-20261116.js`：從首頁選職業、背景、物種、屬性、技能、姓名、語言與職業選項，進入第七步法術列表。
- 驗證每張可見卡片 `scrollHeight <= clientHeight + 2px`、完整摘要不溢出、沒有水平超框。測試德魯伊與法師，320×700、390×844、1440×900 共六條真實操作路徑。
- 選取《德魯伊伎倆》、《四象法門》與長篇《尋獲魔寵》，使用手機觸控手勢／桌機滾輪捲動浮窗，讀回 scrollTop 正值、叉叉仍在浮窗及 Viewport 內、`document.elementFromPoint` 命中該按鈕，最後實際 `.tap()`／`.click()` 關閉。再透過同一法術名稱重新開啟與第二次觸控解除釘選。
- 逐條檢查原文 DOM parity、可見狀態、aria-hidden、無 JS 錯誤，截圖儲存至 `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa`；僅繪製按鈕或檢查 DOM 存在不算通過。
- 既有 38 項 Release Gate、2024 PDF/JSON/2014、正式 GitHub Pages 及部署後全新瀏覽器 Live UAT 為必要發版條件，通過後才可記錄正式 PASS。

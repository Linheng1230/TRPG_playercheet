# D&D 5R｜共用美術系統 A：手繪奇幻日式水彩

## 目標與真實交付

以使用者提供的 Soeling D&D 手機頁面作為視覺參考，採用「淡羊皮紙 × 奇幻手繪 × 日式水彩透明色層 × 棕金／苔綠」。**圖示皆為原創 SVG，不能複製或描摹第三方素材。**

本輪交付獨立的**共用視覺資產 + 實際可 render 的元件展示頁 + QA**。因主站 index.html 由其他施工線同步修改，A 階段不改它、session.html 或任何遊戲機制。此展示頁尚未正式部署，不能宣稱已套用網站。

## Source of Truth

- `assets/watercolor-visual-system.css`：共用色票和元件
- `assets/watercolor-icons.svg`：圖示 sprite
- `visual-styleguide.html`：響應式實際預覽
- `tests/qa-watercolor-visual-system.js`：自動驗收
- 專案規則仍以 `PROJECT_RULES.md`、`README.md` 為準

## 色票

| Token | 色碼 | 用途 |
|---|---|---|
| `--wcs-paper` | `#f4efe4` | 羊皮紙背景 |
| `--wcs-paper-light` | `#faf7f0` | 淺紙色 |
| `--wcs-card` | `#fffcf6` | 卡片底 |
| `--wcs-ink` | `#312a24` | 標題與重要文字 |
| `--wcs-text` | `#4b4035` | 正文 |
| `--wcs-muted` | `#63594e` | 次要說明，需 AA 對比 |
| `--wcs-line` | `#d8cbb5` | 細線 |
| `--wcs-bronze` | `#a58b66` | 裝飾色，不拿來寫重要文字 |
| `--wcs-bronze-dark` | `#745a3c` | 高對比棕金標籤 |
| `--wcs-moss` | `#496752` | 點綴綠 |

不得以這些裝飾色覆蓋既有**13 種傷害語意配色**：毒素綠、火焰紅、寒冷藍等需維持清晰辨認。

## 圖示規格

- 引用範例：`<svg aria-hidden="true"><use href="./assets/watercolor-icons.svg#wc-feather-book"></use></svg>`。
- 使用原創、柔和、非厚重浮雕的手繪奇幻素材，顏色偏褐金、苔綠，淺紙紋理。
- 大圖示 104–148px；小分類圖示約 57px；不可只有圖示沒有文字標題。
- 12 個圖示 ID：`wc-feather-book`、`wc-banner`、`wc-grimoire`、`wc-dragon-d20`、`wc-spell-scroll`、`wc-backpack`、`wc-species`、`wc-class`、`wc-feat`、`wc-combat`、`wc-conditions`、`wc-rest`。

## 元件 API（樣式 class）

- `.wcs-shell`／`.wcs-hero`：版面與頁首。
- `.wcs-section-heading`：章節細線＋古典標題。
- `.wcs-card-grid`／`.wcs-entry-card`／`.wcs-entry-art`：插畫入口卡。
- `.wcs-ornament`：細分隔線與小菱形。
- `.wcs-index-grid`／`.wcs-index-item`：簡潔索引。
- `.wcs-tag`／`.wcs-tag--selected`：膠囊標籤。
- `.wcs-back`：可互動的返回連結，提供鍵盤 focus 樣式。
- `body.wcs-demo` 只用於展示頁背景，**不要將它設成主站的全域 body 規則**。

## 響應式與可讀性

- 1440 × 900：大卡 3 欄、索引 6 欄。
- 390 × 844 與 480 × 800：大卡 2 欄、索引 3 欄。
- 沒有水平捲動；互動目標至少 44px 高；支援 `prefers-reduced-motion`。
- 章節標題用繁中 Serif，長篇規則正文仍使用專案指定的繁中 Sans Serif、手機字級至少 15px。
- 一般文字對比至少 4.5:1，大型文字至少 3:1，淡金僅作裝飾。
- 跑團狀態中的生命值、法術位、特性與資源保持快速操作導向，不加入大型圖片；主導覽仍只佔一排。

## 階段 B｜實際入口首頁與分類路由（2026-11-15）

- 本輪從最新遠端 main 製作乾淨的整合提交；發版前須重新比對遠端 HEAD。較舊的本機工作樹不可直接部署。
- 新增 home.html，提供八個可點擊入口：角色創建、角色卡、規則速查、法術圖鑑、商店購物、跑團狀態、角色百科、冒險圖鑑；下方九個小分類索引。
- index.html 只新增樣式連結、可返回首頁的標題連結及 assets/watercolor-site-bridge.js 深層連結橋接；不修改創角、存檔、法術、PDF 或跑團數值。
- URL 白名單：index.html?view=creator|sheet|rules|spells|shop|play|characters|adventures；子分類 origin、abilities。只導航，不改角色儲存資料。
- GitHub Pages 預設根路徑仍是 index.html；可以從網站標題或 home.html 進入水彩首頁，不改變既有玩家書籤。
- 手機入口卡兩欄、桌機四欄；首頁頂部保持單排，不增加舊站導覽列高度。
- 實際部署以 GitHub main、Pages 完成狀態及網頁 Live-UAT 為準，不能只靠本文件或本地 QA 宣稱已部署。
- QA：node tests/qa-watercolor-site-entry.js、node tests/qa-watercolor-visual-system.js，加上模組、法術、商店、角色百科與新版跑團狀態回歸測試。
- 已知基準測試債：qa-stage0-runtime.js 仍尋找最新版已不存在的 #hpAmt 舊欄位；比對未修改之遠端基準亦不存在。新版 play-status rest/shortcut 測試已通過，但舊測試需由對應跑團工作線更新，不得把它宣稱 PASS。

# D&D 5R｜共用美術系統 A：手繪奇幻日式水彩

## 目標與真實交付

以使用者提供的 Soeling D&D 手機頁面作為視覺參考，採用「淡羊皮紙 × 奇幻手繪 × 日式水彩透明色層 × 棕金／苔綠」。**正式網站插畫優先重用既有原創透明水彩 PNG／WebP；禁止再以手寫／程式幾何 SVG 路徑假裝日式手繪插畫。歷史 SVG 僅是舊展示與相容資產，不是後續美術施工規範。不得複製或描摹第三方素材。**

本輪交付獨立的**共用視覺資產 + 實際可 render 的元件展示頁 + QA**。因主站 index.html 由其他施工線同步修改，A 階段不改它、session.html 或任何遊戲機制。此展示頁尚未正式部署，不能宣稱已套用網站。

## Source of Truth

- `assets/watercolor-visual-system.css`：共用色票和元件
- `assets/watercolor-icons.svg`：歷史展示頁的 SVG sprite（不得作為正式站新插畫來源）
- `assets/watercolor-icons-alpha/*.png`：正式首頁、導覽、職業卡共用的既有透明水彩圖
- `assets/watercolor-ornaments/painted-icons.webp`：角色卷宗既有手繪 4×4 圖示母版
- `assets/dossier-watercolor-unification.css`：現行跨首頁／創角／角色卷宗／新手學院之 screen-only 素材整合層
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

- 正式站引用範例：`<img src="./assets/watercolor-icons-alpha/creator.png" alt="" aria-hidden="true">`。圖片只作裝飾，仍需文字標籤；不要用 SVG 路徑重畫已有水彩插畫。
- 使用原創、柔和、非厚重浮雕的手繪奇幻素材，顏色偏褐金、苔綠，淺紙紋理。
- 大圖示 104–148px；小分類圖示約 57px；不可只有圖示沒有文字標題。
- 歷史展示頁保留 12 個 `wc-*` SVG symbol ID，不代表新版首頁、卷宗或學院應沿用它們；正式介面改用已驗證 PNG／WebP。

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

## Stage C｜西方奇幻生物水彩背景（2026-11-16）

- 原創 SVG `assets/watercolor-western-background.svg` 是雙頁共用背景，只含有**蝙蝠狀翅膀、四足、角與棘刺長尾的西方奇幻龍**、一隻獅鷲、遠山與城堡，不採用東方式長條盤龍或密集紋樣。
- 首頁沿用 `assets/watercolor-visual-system.css`；內頁採獨立 `assets/watercolor-inner-unification.css`，僅在 `body.wcs-inner` 套用。原有遊戲 JS、資料、規則、PDF 不改。
- 背景只放頁面四角與邊緣，中間以高不透明度淺色紙面覆蓋；規則正文、角色數值與操作按鈕**不得直接壓在插畫上**。
- 手機因欄位狹窄，使用更淡的水彩暈色，避免龍形擠壓文字。主導覽保持單排橫向滑動。
- `wc-dragon-d20` 更換為西方翼龍徽章，去除原本偏蛇形的視覺。
- QA 以桌機、手機的真實 HTML、背景 SVG、文字對比、路由及 Live 讀回為準；AI 視覺樣稿不作規則資料來源。

## 背景可見度修復（2026-11-16）

- 前次 PASS 誤判：圖片已載入，卻被高透明遮罩洗淡；手機 CSS 直接移除了插畫背景。已重新開啟驗收。
- 調高原創西方龍／獅鷲／城堡的可見度，取消桌機高不透明遮罩。
- 新增資產 assets/watercolor-western-mobile.svg，首頁和內頁用獨立可見的水彩插畫帶。
- 遊戲規則、角色資料、存檔、傷害語意色維持不變，插畫放在文字面板之外。
- 新 QA 必須比較真實截圖中有圖／無圖的實際像素差異，不能只驗圖片 URL 或檔案雜湊。


## 2026-11-16｜高擬真水彩美術施工（第三張設計稿）

**Source of Truth**：使用者 2026-11-16 提供的「第三張」兩段式網站概念圖，已保存高品質參考檔於 `docs/design-reference/reference-mockup.webp`。此圖是**視覺樣稿，不是遊戲規則、角色數值、操作流程的資料來源**。

### 本次實際美術資產

- `assets/source/fantasy-watercolor-scene.png`：AI 原創西方奇幻水彩全景（城堡、瀑布、有翅西方龍、獅鷲、貓頭鷹熊、鹿）；網站採 `assets/fantasy-watercolor-scene.webp`（1600×901），確保筆觸及色彩保留。
- `assets/source/watercolor-icon-atlas.png`：依設計稿製作的八入口＋十二職業圖示母版（840×463）；網站採 `assets/watercolor-icon-atlas.webp`，由 CSS 背景座標切片，所有卡片維持可點擊 HTML 而非整張圖片。
- `assets/fantasy-watercolor-mobile.webp`（780×330）：專用手機構圖，左邊古堡、右邊西方龍，中央保留淺色羊皮紙；不是從桌機截去中央的圖。
- `assets/illustrated-watercolor-ui.css`：共用美術層。最外層 opt-in `body.wcs-demo.wcs-home` / `body.wcs-inner`，不新增角色 State、不修改 canonical 規則。
- `scripts/build-illustrated-watercolor-assets.py`：從 source 母版重建 WEBP；需要 Pillow，可重複且不依賴個人絕對路徑。

### 介面規格

- 桌機：首頁單排導覽與 4×2 八入口插畫卡；創角在足夠寬度時加入左側七步驟索引，中間 4 欄職業卡，右側依據原有角色 state 的資訊面板。
- 手機：首頁的西方奇幻橫幅確實可見，八入口變 2 欄；內頁保留 2 欄職業卡與角色操作，頂部導覽單排橫向滑動，絕不讓背景覆蓋規則文字。
- 職業卡的動態插入確認區會改變 DOM 子元素位置；CSS 使用 `:nth-child(N of .pick-card)`，確保選職業後也不錯位。
- 圖示只呈現、美化，不充當資料來源。首頁 9 個導覽連結與原有 8 入口仍指向原本 view；無額外創角 state 或手動同步。
- 傷害類型色票、PDF、角色資料、規則資料、序列化與 2014／2024 隔離保持原功能。
- 角色建立左側步驟欄屬導覽「進度指示」而非另一套獨立功能；隨目前的原有 `.step-panel.active` 顯示對應選取態。

### 必要 QA

1. desktop 1440×900、narrow 480×800、mobile 390×844：真實瀏覽器截圖、圖片完整載入、無水平捲動與 JS 錯誤。
2. 背景和職業圖示要有實際可辨識筆觸，不得再用 5 KB AVIF 假裝高清。腳本量測資產大小、實際背景 URL、圖像載入及截圖像素變化。
3. 選擇德魯伊之後，確認區塊插入但十二職業圖示位置不變。
4. 既有 2014/2024、角色卡、法術圖鑑、購物、PDF 等回歸，正式站發版後再驗 SHA、手機/桌機實際導航。
5. **禁止**只以背景圖存在或 CI 程式回傳零錯誤自稱美術驗收成功；需以使用者指定的第三張設計稿實際比對。

## 2026-11-16｜圖示完整度與創角步驟常駐修正

- 原因：首頁的 104px 母圖被 89px 容器裁掉；職業的 85px 母圖被 67px 視窗裁掉；導航每次 render 都重新收合；桌機側欄文字不可點且名稱不符實際程序。
- 修正：首頁入口畫作完整呈現；職業從原創母版裁成 assets/watercolor-class-icons.webp（672×270），可用 scripts/build-illustrated-watercolor-assets.py 重新產生；原本職業 stable identifier 與規則未變。
- 導覽：主功能維持單排，創角 0–6 的第二排固定可見且手機可左右滑動，不再有收合鈕；桌機側欄七項改為 button，click 轉發至現有 nav-secondary button，從原本 step-panel.active 讀取目前位置，不新增第二套創角 state。
- QA：tests/qa-illustrated-step-nav.js 驗 320／390／1440px、步驟常駐、左側點擊、圖示與角色選取一致、無橫向捲動。tests/qa-single-row-main-nav.js 維護常駐契約。


## 2026-11-17｜內頁導覽與標題圖示一致化（美術下一階段）

- 範圍：只處理八個主要功能入口的導覽圖示與內頁標題：創角、角色卡、規則速查、法術圖鑑、商店購物、角色百科、冒險圖鑑、跑團狀態。
- Source of Truth：沿用已通過正式站 Alpha QA 的 assets/watercolor-icons-alpha 八張透明 PNG；不修改圖示母版、不創建第二套圖。
- 執行：只修改 assets/watercolor-alpha20.css 的樣式層，不引入新 JavaScript 或角色 State。按鈕仍由原有 renderNav 與 SiteNavUX5R 決定；使用 CSS nth-child(N of button:not(.nav-ux-back)) 排除可選返回按鈕，避免歷史導航後圖示錯位。主導覽保持單排，手機使用既有橫向捲動。
- 可讀性：標題插畫 45～53px 寬、主要導覽圖示 25～28px；圖像與文字並列，不可覆蓋規則、數值、法術卡或商店。列印模式不顯示裝飾圖。
- 驗收：tests/qa-watercolor-inner-icons.js 從首頁卡片進入內頁，再實際點擊所有八個導覽入口；測 320／390／768／1440px、頁面正確、圖示對應、導覽單排、無文件水平溢位、無 JS／HTTP 失敗，保留截圖。另跑必要的 2014／2024 角色卡、法術與商店回歸。
- 禁止：不新增互動、不改創角步驟、不修改 canonical 規則、Save State、PDF／JSON／FVTT，也不合併 PR #50 獨立視覺工作線。

## 2026-11-25 | Character folio and uploaded portrait

- User reference: low-saturation Japanese watercolor fantasy, actual interactive website (not a flattened mockup). Use the player's uploaded portrait, not a static scene, in the right rail.
- Existing CSS/JS presentation layer: watercolor-alpha20.css/js. Original portrait upload, removal, persistence and serialization remain canonical. Move the existing node on desktop (1100px+ with an image); restore at narrow widths and in print. No portrait means full width, not a blank rail.
- Numeric shapes: AC shield, HP heart, initiative gem, movement boot, perception eye, six ability shields. Equipment AC is a display-only read from the existing calculated AC DOM; no parallel formula.
- The 4x4 transparent original watercolor atlas (160x160 WebP) is extracted from the generated visual style board; rows: shield/heart/book/backpack, coins/sword/bow/staff, scroll/potion/helmet/map, quill/dice/shop/compass. SVG ornaments are original vector frames. Existing fantasy scene and individual navigation illustrations remain in use.
- Golden workflow checks actual portrait selection, sticky placement, removal, AC update, image decode, print restoration, width and eight real navigation views. All new art is screen-only. Do not use visual elements to change canonical values or save format.

- Finishing pass: natural ink/leaf ornaments, improved equipment action controls and portrait frame; existing final-sheet live UI test has optional QA_FOLIO mode for actual creator, portrait upload/replace/save/reload/remove, canonical AC and three browser cases. Pages tests this before and after deploy and verifies the published SHA plus artwork bytes.

## 2026-11-25｜角色卷宗共用美術決議（取代前述新 SVG 插畫做法）

使用者明確要求：整站以**角色卷宗**的日式奇幻手繪水彩、低飽和度、繁中可讀性為美術基準。已存在且美術等級合格的素材**必須重用**；不得再拿簡化 SVG 幾何路徑、漸層盾牌／徽章、emoji 或大量同樣方框取代手繪插畫。這是本文件之前「全部使用原創 SVG」句子的**正式修正**，後續新施工以本節為準，不刪除歷史原始紀錄。

- **插畫來源**：`assets/watercolor-icons-alpha/*.png`、`assets/fantasy-watercolor-scene.webp`、`assets/fantasy-watercolor-mobile.webp`、`assets/watercolor-ornaments/painted-icons.webp`。只依已有圖像語義重用，不重畫或產生重複圖案。
- **樣式來源**：`assets/watercolor-visual-system.css` 的色票與 Serif/Sans 字體分工，`assets/dossier-watercolor-unification.css` 的 screen-only 薄整合。既有角色卷宗畫像由玩家上傳，不能以靜態插畫替換。
- **保留的技術邊界**：2014／2024、Save、JSON、PDF、FVTT、13 種傷害語意色、計數器與真實 AC／HP 數值；裝飾層不能修改或另算。
- **禁用新幾何美術**：不再新增手寫 SVG path 畫出的美術圖框。原 `watercolor-ornaments/*.svg` 是歷史來源，正式畫面依後載入的 screen-only 視覺層停用；原檔為其他 Owner 的交付，不直接刪除或覆寫。功能性 HTML／CSS 邊框仍可用，但不可自稱手繪插畫。
- **QA 契約**：`tests/qa-dossier-watercolor-unification.js` 驗三頁共用來源、390／480／1440px 交互與圖片；`tests/qa-illustrated-watercolor-ui.js` 驗 10 個導航 PNG、8 首頁入口、12 職業 PNG；`tests/qa-watercolor-portrait-redesign-20261125.cjs` 驗已有手繪 WebP、未使用向量盾牌、原生畫像／AC／列印與 2014／2024。部署後還須正式 Pages SHA／實際瀏覽器 UAT，不能把本機截圖當正式上線。

## 2026-11-25 | Painted folio fidelity and text containment

- Existing folio presentation owner replaces plain badges with raster art cropped from the watercolor design reference, cleared of baked-in values: folio-heart, folio-shield, folio-gem, folio-scroll, folio-torn-paper. Existing landscape art supplies folio-landscape and seamless folio-paper. No new SVG artwork.
- All visible values are live HTML from canonical character state. Keep glyph bounds within each artwork safe zone; stack HP values, fit font size to available width, and retain readable plain text for exceptional lengths. Scroll title padding reserves painted edges. Do not clip or truncate numeric content.
- Portrait is the existing uploaded player image, not replacement artwork. Desktop rail is sticky with scenery; without portrait, use full width. Print restores original tree. No new save fields or calculations.
- qa-folio-value-containment-20261125.cjs verifies actual glyph Range geometry, 15 value frames, labels and headings at nine viewport/ruleset combinations, normal and stress HP, uploaded portrait, equipment AC, and print. Golden and Pages gates run it alongside existing functional UI tests; public artwork SHA bytes are checked against the published commit.

# 2024 職業選擇小卡修復與跨職業稽核（2026-11-13）

## 狀態／證據
- 本機修復與針對性 QA 已完成；尚未提交、部署或 Live 驗收。不得宣稱全站 DONE。
- Source of Truth：PROJECT_RULES.md → pinned 5RTools assets/data/feature-5r-full-rules.js；不改 canonical 規則、ID、2014 狀態。
- 掃描 12 個基本職業的 396 筆職業／子職業規則，選項語句共 54 筆候選；其中包含戰鬥當下選擇、法術／武器／技能選擇，不能一律視為互斥永久能力。
- 根因：母特性把多個分支以同一段規則全部顯示；Final Sheet 選擇只顯示名稱，沒有專屬子卡。

## 已修復
- 德魯伊：原初秩序 L1、元素之怒 L7、元素神威 L15 強化。
- 牧師：神聖秩序 L1、受祝打擊 L7、強化受祝打擊 L14。
- 遊俠／獵人：獵手的殺技 L3、防禦戰術 L7。
- 母卡明示互斥；已選分支獨立子卡。小卡全文直接從 pinned 5RTools source 特性本文定位切段（只有定位錨點，沒有額外維護規則全文）；定位失敗顯示來源異常，不虛構效果。
- 只在 Final Sheet 放 HTML 子卡；JSON 與 PDF 使用純文字。PDF 選擇型特性僅顯示同一來源中已選的效果。

## QA
- tests/qa-exclusive-class-choice-cards.js：PASS 109 項，6 組雙分支、8 組 canonical 全文重組、存檔回讀、390px 手機、12 職業預設。
- tests/qa-exclusive-class-choice-pdf.js：PASS 4 份 PDF 實際產生與欄位讀回，確認所選效果、排除未選效果、無 HTML 外漏。
- 回歸 PASS：qa-feature-full-rules、qa-5rtools-parity、qa-5rtools-class-progression、qa-choice-exhaustive、qa-2024-feature-pdf-coupling、qa-2024-pdf-layout、qa-2024-export-and-spell-ui、qa-save-migration-fixtures、qa-mobile-rule-popovers、qa-feature-tooltip-readability（重測）、qa-2014-matrix、qa-2014-pdf，以及相關 spell filter/mobile/readability/bilingual/name parity/granted tests。
- 既有 qa-class-grants-2024.js 有 warlock-repeat-ready 單項 FAIL（邪術師重複祈喚），需獨立查核；不得因此變造測試。
- 原 localhost 18766/18767 HTTP 服務曾回傳 empty response；這輪用確認 HTTP 200 的 19876 做回歸。

## 尚待完成的風險與依賴
- 野蠻人獸心道途 L6 荒野形貌、L14 荒野偉力：目前 canonical full-rule 投影只剩下選擇前言，未顯示 Owl/Panther/Salmon 或 Falcon/Lion/Ram 子選項完整正文。需回 pinned snapshot 檢查 nested entries/parser；未能由專案權威來源驗證前不得自行填入規則。
- 其他 54 個候選的 nested table 完整性不能因 12 個職業渲染 PASS 就一概判斷無問題；這輪僅已確認的六組有完整選項卡修復。
- Repo 同時有其他尚未提交的修改；不能直接 git add . 或整批 push，避免混入其他施工。正式部署與 Live fresh reload 尚未完成。

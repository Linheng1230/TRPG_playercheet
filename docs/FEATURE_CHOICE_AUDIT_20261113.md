# PHB2024 職業特性「母卡／選項效果」驗收紀錄（2026-11-13）

> 本檔是此次修復的證據索引，不是額外規則庫、永久 Runtime State 或來源權威。實際結果以目前 Repository、測試報告及 Live 介面為準。

## 來源與根因

- Domain Truth：本專案固定的 5RTools PHB2024 快照（`D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\5rtools-2024`），結構化選項由 `data__class__class-*.json` 驗證；既有完整規則檢索 `assets/data/feature-5r-full-rules.js` + `assets/feature-resolver-5r.js`。
- **錯誤 A：flatten**。德魯伊 1 級「原初職能」與數個其他職業的「擇一」母特性在 UI 顯示完整段落，未將各選項標為互斥；已選子卡沒有出現。
- **錯誤 B：nested ref loss**。PHB2024 獸心道途 3、6、14 級各有三個 `refSubclassFeature` 巢狀子選項，原完整規則字串沒有攜帶這九個子特性的全文。
- **錯誤 C：consumer drift**。`assets/ability-lookup.js` 的八個二選一速查項目各自錯誤引用整段母特性全文。
- **錯誤 D：unit drift**。`spellRangeFeet2024` 僅辨識「尺」，已正規化成「呎」的距離無法通過秘法長矛可用戲法檢查；速查距離標籤也只匹配「尺」。

## 規則類型與修復

| 類型 | 處理方式 | 實際特性 |
|---|---|---|
| 永久／可在休息時調整的擇一 | 母卡說明選擇，最終角色頁只顯示已選的單一規則子卡；保留既有 Choice State | 德魯伊原初職能、元素之怒、野蠻人獸之形貌、牧師神聖秩序／受祝打擊、獵人獵手的殺技／防禦戰術、預言師天眼通 |
| 只強化既有選擇 | 依原分支呈現對應效果，不把強化誤認為第二次選擇 | 牧師 14 級強化受祝打擊、德魯伊 15 級元素神威 |
| 每次啟動／使用時擇一 | 以「可選方案」分列，不虛構永久鎖定狀態 | 獸心道途 3、14 級、星辰結社星辰形態、勇氣學院戰鬥激勵、至高妖精宗主迷霧遁走 |
| 可同時選多項，但需多次消耗資源 | 顯示每項個別效果，明確說明不是自動全得 | 異怪心靈 14 級血肉啟示 |
| 可學多種選項（非互斥） | 已習得的每一選項都有自己的規則卡；未習得者不顯示為取得 | 戰鬥大師戰技、術士超魔法 |
| 通用速查 | 每個獨立選項的正文來自 canonical 分支；母特性標註擇一／使用時機，不靠手寫規則副本 | 全部上述有 canonical split 的特性，以及 8 個四組二選一選項 |
| 來源自動化 | 從原始巢狀 PHB2024 JSON 提取，不手抄遊戲機制；檢查順序、數量、身份 | `scripts/build-5r-nested-choice-projection.py` → `assets/data/feature-5r-nested-choice-rules.js` |

## 結構掃描範圍

對固定快照所有 12 個基本職業的 `classFeature/subclassFeature` 執行 `type:"options"` 全域結構掃描，發現 8 個符合的選擇節點：獸心道途 3 組、德魯伊基礎與後續 3 組、戰鬥大師戰技 1 組、獸王原初野獸 1 組。這不等於所有可選機制都採此 JSON 形態：其他像星辰形態、勇氣學院等為列表／段落，已另外按 canonical 文本錨點抽查。

這一輪沒有改變已存在的 Choice State 欄位、儲存 schema、規則穩定識別、2014 分支，也沒有重建第二套規則引擎。獸王三種原初野獸的完整角色資料卡已有其他 Companion / Creature 路由，未在本輪重複造一份。

## QA 證據與限制

- `node tests/qa-exclusive-class-choice-cards.js`：**180 項 PASS**，包含所選分支隔離、JSON roundtrip、12 基礎職業未選情境、手機 390px 溢出檢查、巢狀來源驗證、戰技與超魔法已選卡。
- `node tests/qa-ability-exclusive-choice-reference.js`：**40 項 PASS**，包含母／子卡來源分段、速查不污染角色 State、呎／尺相容。
- `node tests/qa-exclusive-class-choice-pdf.js`：**9 個實際 PDF 匯出／表單讀回案例 PASS**，涵蓋互斥選擇與使用時選擇，不把 HTML 寫進 PDF。
- 來源生成器重跑 SHA-256 一致；未修改固定快照的原始 JSON。
- 最後整合回歸 **24/24 PASS（程序 Exit 0）**：`D:\Tools\zizi-ai-runtime\trpg-feature-qa-complete-20261113.txt`，包含 5RTools parity、2024 PDF、技能／法術、2014 Save migration、角色選擇卡、能力速查與搜尋。獨立 `qa-class-grants-2024.js` 亦已由射程單位根因修復並納入全綠驗收。
- **仍需注意實際列印可讀性**：對野蠻人 6 級 PDF 做過實際 raster 檢視，既有固定 PDF「職業能力」欄位的字體可能縮至約 4.75pt；即使 `overflow:false`，仍不應宣稱可直接高品質印刷。本次驗證的是「分支正確／不混入未選／可匯出／可讀回」；列印版面另需完整字級與視覺門檻。
- **已正式部署與 Live 驗收（2026-11-13）**：以獨立乾淨 worktree 從當時 `origin/main` 發布，未混入其他未提交工作；修復提交 `da54aa6` 已推送 `Linheng1230/TRPG_playercheet` 的 `main`。GitHub Pages Actions [43391685462](https://github.com/Linheng1230/TRPG_playercheet/actions/runs/43391685462) 回報 `success`。正式網站的 `index.html`、`assets/ability-lookup.js`、`assets/character-sheet-export.js` 與新增的巢狀選項資料，HTTP 200 且逐位元組等於該提交的 Git blob。實際手機 Chrome Live UAT 13/13 PASS；正式網站實際 PDF 下載與欄位讀回 9/9 PASS。發布工作區整合回歸 24/24 PASS，紀錄於 `D:\Tools\zizi-ai-runtime\class-choice-deploy-qa-20261113-1558.txt`。既有印刷字級可讀性問題仍屬獨立未通過的正式印刷門檻，不因網站部署成功而標記 PASS。

## 防止復發的驗收 Gate

新增加或修改「選項特性」時，確認：canonical node 型態（固定選擇、長休重選、使用時擇一、一次多選）→ 母卡不誤導 → 已獲得子卡只含合法選項 → 速查條目來源分隔 → JSON roundtrip → PDF 實際讀回 → 不破壞 2014 與其他職業 → QA 溢出／實際視覺檢查。失敗時保留 FAIL，不得以生成成功取代驗收。

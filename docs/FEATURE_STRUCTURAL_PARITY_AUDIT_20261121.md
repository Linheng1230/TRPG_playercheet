# PHB2024 職業特性小卡結構稽核｜2026-11-21

## 根因
固定 5RTools 2024 的 classFeature/subclassFeature 內含 `entries`、`table`、`options`，但網站 `assets/data/feature-5r-full-rules.js` 的繁中投影部分只保留串接正文，遺失表格列或具名子項標題。原有 `qa-feature-full-rules.js` 僅檢查文字存在/長度，未對上游的 nested label 及表格數據做結構回歸。

## 修復範圍
- 在**單一既有** canonical Feature 投影補回「魔源之泉」五環兌換表，並將重要兌換規則移到小卡前方；法術位換點（無需動作）及點換法術位（附贈動作）均保留。
- 補回荒野變身野獸形態進程、自然守禦抗性、星圖 d6、靈能武士/魂刃靈能骰進程、精野之賜/秩序顯跡 d6、獸王三種原初野獸完整資料。
- 補回其他職業 Feature 具名子項，涵蓋德魯伊、術士、武僧、戰士、遊俠、遊蕩者、聖武士等。翻譯不同但效果保留的法術清單由原法術系統維護，不重複投影。
- 新的 test-only 來源對照 fixture `tests/fixtures/feature-nested-labels-2024.json`：63 個唯一 Feature key、198 個必要子標題；`tests/qa-feature-structural-parity-2024.js`：9 個特殊表格 Feature/47 個關鍵檢查。此測試已接入既有 `qa-feature-full-rules.js`，可攔截後續重建投影造成的資料遺失。
- `tests/qa-feature-structural-cards-browser.js`：11 張代表小卡、1440/480/390px 實際瀏覽器呈現、長文可捲動、無水平溢出。加上 Font of Magic 定向來源與瀏覽器測試。

## 稽核範圍與限制
固定 PHB2024 上游共 584 個 class/subclass Feature、37 個 table、236 個 named subentries（原始數量，含同名及另有 consumer 的子項）；未把所有上游 entries 逐條重新建立可逆 AST，僅對具可核對 mapping 的核心 Feature 進行結構 QA。部分 subclass spell tables 故意由獨立 canonical spell consumer 顯示；需另按使用者實際角色驗證。

## QA
隔離工作樹 `fix/feature-table-parity-20261121`，從 `origin/main@511f8caa` 衍生，主工作樹大量 dirty files 未修改。定向 structural/DOM PASS；全角色矩陣、2014 相容、2024 PDF/Feature coupling、5RTools parity、子職授法與選擇矩陣等 13 種回歸均 PASS；`git diff --check` PASS。實際新版本尚未合併/部署至 GitHub Pages，正式 Live-UAT 與 Release Gate 仍 PENDING。

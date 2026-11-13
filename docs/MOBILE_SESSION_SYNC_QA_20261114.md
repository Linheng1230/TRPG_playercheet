# 手機跑團簡表 × 正式角色卡：雙向同步驗收（2026-11-14）

## 已發布狀態
- 正式網址：https://linheng1230.github.io/TRPG_playercheet/
- 手機簡表：https://linheng1230.github.io/TRPG_playercheet/session.html
- 基準：GitHub origin/main，隔離 worktree 分支 feat/mobile-session-sync-20261114
- 初版發布 commit：b7b004259b7fcfca9fa0fee3e8ecaaad9c91fa95
- Pages workflow：43490142190，completed / success，且網站 HTML 和 JS 皆回 200。
- Live Browser E2E：PASS（實際正式網址、390px、正式角色卡點選入口、雙向 HP/THP、法術位、德魯伊荒野變身、結算鎖定、重整恢復、無水平溢出）。

## 技術交付
- 正式角色卡存檔 `dnd5r:char:<id>` 為單一 Source of Truth。
- 正式角色卡計算並持久化 `sessionResourceLimits`（法術位和職業資源上限）；簡表只讀結果，不複製 5R 規則。
- 手機簡表採事件日誌、同網站 localStorage 與 storage 跨分頁事件雙向同步可變數值。
- 同角色 ID 自動連結（避免同名誤寫），本機上次場次可恢復；AL 未驗證時禁止自稱官方核准。
- 團務事件紀錄另有 JSON 匯出／匯入；不得將 JSON 匯入視為自動覆寫角色存檔。

## 主要 QA 證據
- `node tests/qa-session-character-sync.js`：PASS
- `node tests/qa-session-ledger-5r.js`：15 assertions PASS
- `node tests/qa-session-ledger-browser.js`：PASS
- `node tests/qa-session-bidirectional-browser.js`：LOCAL PASS；設定 `QA_BASE=https://linheng1230.github.io/TRPG_playercheet` 時 LIVE PASS
- `tests/qa-save-migration-fixtures.js`：4 legacy fixtures，failureCount=0
- `tests/qa-class-resource-hints.js`：2014／2024、390px／1440px PASS
- `tests/qa-full-character-matrix.js`：1,104 組角色，13,241 feature checks，failureCount=0
- `tests/qa-stage0-runtime.js`、`tests/qa-2014-matrix.js`、`tests/qa-2024-export-and-spell-ui.js`、`tests/qa-2014-pdf.js`：PASS
- `git diff --check`：PASS

## 邊界
- **雙向同步限定同一網站來源、同一瀏覽器儲存環境的不同分頁**。不同手機／裝置之間尚無共用雲端後端，不能稱為跨裝置即時同步。
- 手機簡表目前是跑團即時狀態與事件紀錄，不取代完整創角、升級或 PDF 功能。
- 不會自動判定短休、長休或 AL 官方資格；沿用正式角色卡計算與既有人工回復流程。
- 禁止將其他未驗收工作區改動混入本次部署；僅 9 個 session 範圍檔案與此 QA 文件。

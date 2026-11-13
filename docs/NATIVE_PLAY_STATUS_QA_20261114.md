# D&D 網站原生跑團狀態驗收（2026-11-14）

## 需求
使用者明確撤回獨立的手機跑團頁面方案。跑團期間的狀態與角色簡表必須直接整合在原本的 `index.html` 最終角色卡，不維護第二份角色 State 或第二個介面。

## 正式 Source of Truth
- 網址：https://linheng1230.github.io/TRPG_playercheet/
- 正式角色資料：既有 `dnd5r:char:<id>`；`S.play`、`S.slotsUsed` 與已存在的 `saveCurrent`。
- 直接於角色卡前段呈現跑團狀態、法術位；上方即為 HP/AC/先攻/速度/屬性，隨後是可操作的跑團資源。
- 保留既有受傷（先吸收暫時 HP）、治療、暫時 HP、生命骰、死亡豁免、英雄靈感、職業資源、法術位和跑團筆記。
- 新增 HP 一鍵受傷／治療 1 點，沿用原本計算與儲存；沒有額外的角色規則或儲存副本。
- 導覽列將跑團狀態與法術位提到前段。
- 已刪除 `session.html`、獨立 session ledger／adapter JS 及獨立頁面測試，移除其與首頁的連結。**不主動清除使用者瀏覽器裡已有的角色與歷史紀錄**。

## Regression evidence
- `tests/qa-native-session-browser.js`：390px 主網站瀏覽器 E2E PASS；原生頁面、HP/THP、法術位、職業資源、筆記、儲存／重開、導覽、無水平溢出。
- `tests/qa-final-sheet-jump-nav.js`：1440/480/390px 跳轉與列印隱藏 PASS。
- `tests/qa-stage0-runtime.js`：PASS。
- `tests/qa-class-resource-hints.js`：2014/2024 12 職業、1440/390px PASS。
- `tests/qa-save-migration-fixtures.js`：4 個舊存檔相容 PASS。
- `tests/qa-full-character-matrix.js`：1,104 組角色、13,241 項特性檢查，failureCount=0。
- `tests/qa-2014-matrix.js`、`tests/qa-2024-export-and-spell-ui.js`、`tests/qa-2014-pdf.js`、`tests/qa-2024-pdf-layout.js`、`tests/qa-2024-feature-pdf-coupling.js`：PASS。
- `git diff --check`：PASS。

## 發布與 Live UAT
- Deploy commit：等待 GitHub Pages 部署後補入。
- Live URL：原本網址；不得另給獨立 session 頁面作為使用者入口。
- 注意：同瀏覽器 localStorage 持久化；無跨裝置雲端即時同步，勿冒稱跨裝置。

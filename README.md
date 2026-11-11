# TRPG Player Sheet

繁體中文 D&D 角色建立器，支援 2014 與 2024 規則，並能將角色資料匯出至對應的中文 PDF 角色紙。

## 施工規則

修改規則、Feature、PDF、FVTT 對應或升級流程前，必須先遵守 [`PROJECT_RULES.md`](PROJECT_RULES.md) 的 Change Propagation Gate；不得只驗單一畫面後標記 PASS。

## 使用方式

開啟 GitHub Pages 網站，依畫面完成角色建立，最後按下「下載正式角色紙」。

## 部署

網站由 GitHub Pages 自動部署；入口為 `index.html`。PDF 模板、中文字型與瀏覽器端 PDF 工具位於 `assets/`。


## Maintenance / Extension

- Engineering guide: `docs/MAINTENANCE_AND_EXTENSION_GUIDE.md`
- Full 2024 character matrix: `tests/qa-full-character-matrix.js`
- Ability Lookup module: `assets/ability-lookup.js`
- Save compatibility helper: `assets/save-compat.js`
- Legacy save fixtures: `tests/fixtures/legacy-*.json`
- Save migration gate: `tests/qa-save-migration-fixtures.js`
- Canonical feature resolver: `assets/feature-resolver-5r.js`; runtime Feature override DB 已退休，使用 `tests/qa-feature-no-overrides.js` 驗證不得復活。

- 5R player reference: `assets/player-reference-5r.js`
- 2024 magic items: `assets/data/magic-items-5r.js` (435 magic items; 584 is the raw XDMG item-source count, including mundane goods)
- 2024 creatures: `assets/data/creatures-5r.js` (XMM 503 + XPHB 15 + XDMG 2)
- Source pin and derived filters: `docs/PLAYER_REFERENCE_DATA_SOURCE.md`
- Canonical feature resolver: `assets/feature-resolver-5r.js`; the old runtime feature override database is retired.

- Traditional Chinese player-reference projection: `scripts/build-5r-zh-projection.py` → `assets/data/magic-items-5r-zh.js`, `assets/data/creatures-5r-zh.js`, `assets/data/player-reference-zh-meta.js`.
- Chinese source pin: `tjliqy/5etools-cn cn2.0 @ 5cc0bbe2c2b241a334e731af4448bdba2168e8bd`; names display Traditional Chinese + English, all other player-reference UI is Traditional Chinese.

## 帳號同步（Stage 1）

帳號層使用 Supabase Auth + Postgres RLS，沿用既有角色 JSON snapshot；未設定 provider 時網站維持完整訪客模式。瀏覽器 client 固定 vendoring `@supabase/supabase-js` 2.119.0（`assets/vendor/supabase-2.119.0.js`；SHA-256 `A867EDBCFB029370AEEC7223DD6180B560B621FBE3BC64C6584FB0369D1B7BCE`），並保留對應 LICENSE。

啟用前必須：

1. 在 Supabase 建立 project，套用 `supabase/migrations/202611110001_stage1_account_sync.sql`。
2. 啟用 Email confirmation，設定正式 SMTP，並把正式 GitHub Pages URL 精確加入 Auth redirect allow list；公開註冊前再啟用 bot/CAPTCHA 防護與合理 rate limits。
3. 在 `assets/account-config.js` 填入 project URL 與 **publishable/anon key**，再設 `enabled:true`。禁止把 secret/service-role key 放進網站。
4. 跑 `supabase/tests/characters_rls_test.sql`，再跑 `tests/qa-account-sync.js` 與 Stage 0 regressions。
5. 正式上線前以兩個真實測試帳號驗證 A 無法讀寫 B、跨裝置下載與 revision conflict。

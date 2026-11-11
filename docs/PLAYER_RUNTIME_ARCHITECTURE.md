# 5R Player Runtime — Implementation Plan (2026-11-04)

## Goal and reference
One character built once, then usable from any signed-in phone/desktop for live play, leveling, resource tracking, resting, lookup, and PDF/JSON export.
Feature reference (read-only): DND 5R 萬象無常 v1.4.1, Google Sheets id 1L5XYBK2l945F5n8N45B6xgtZSbKpAMZpsyF_Tl-mim4. Reference tabs: 角色卡, 角色速查表, 法術, 裝備物品, 背景故事, 跑團紀錄卡, 角卡數據, 加值設定.
This spreadsheet has custom/homebrew mechanics; do NOT treat them as official PHB2024 rules.

## Verified existing implementation
- Static GitHub Pages entry: index.html; existing localStorage roster/getRoster/saveCurrent/autoSave/loadChar.
- serialize()/deserialize() already cover character choices and S.play (hp, hpMax, thp, hd, death saves, inspiration, res, resMax, custom, notes) and S.slotsUsed.
- Existing PDF and JSON exports and spells/skills lookup must remain functional.
- Current local worktree contains unrelated uncommitted player-reference zh edits; protect them.
- PROJECT_RULES.md 7.14 currently prohibits runtime resource operations: user explicitly supersedes this product boundary, but canonical rules and validation constraints remain.

## Stage 0 — 11/14 體驗團前必須完成：獨立本機角色 Runtime
Stage 0 的目標不是帳號系統，也不是跨裝置同步；目標是讓每位玩家可以直接用自己的手機，可靠地建立、開啟、保存並在實際跑團中操作角色。

### Scope（11/14 前必做）
- 每位玩家使用自己瀏覽器的 `localStorage` roster；不需登入、不需雲端、不需 GM 帳號。
- 手機可完成：開啟既有角色、查看角色核心數值、法術、能力與裝備，以及回到角色清單切換角色。
- 跑團狀態必須可手動修改並保存：HP、HP Max、THP、Hit Dice、死亡豁免、靈感、法術位、明確的職業／特性資源與玩家筆記。
- 所有 Stage 0 runtime state 必須走既有 `serialize()/deserialize()` 契約，不建立第二套角色資料模型。
- 重新整理頁面、關閉後重開瀏覽器，角色與 runtime state 不得遺失。
- JSON 匯出／匯入是 Stage 0 唯一正式備份、救援與跨裝置轉移方式；匯入後必須保留相同角色選擇、法術與 `S.play` / `S.slotsUsed` 狀態。
- PDF 匯出與現有創角、升級、法術／技能／規則查詢不可因 Runtime 功能而退化。
- 正式 GitHub Pages 必須可從玩家手機直接連線；至少以兩個彼此獨立的瀏覽器 profile 驗證角色資料互不污染。
- 11/14 前不做自動戰鬥結算、自動擲骰、自動扣資源、自動套狀態；Stage 0 只提供玩家明確操作的狀態追蹤。
- 短休／長休若尚未有 canonical recovery metadata，先不做自動恢復；寧可手動調整，也不得猜哪些資源應恢復。

### Explicitly deferred（11/14 後）
- 登入／登出。
- Supabase、Postgres 或其他雲端資料庫。
- 手機與桌機自動同步。
- GM 共用讀寫權限。
- 即時訂閱、多人同步、衝突合併。
- 自動短休／長休恢復引擎。
- Inventory transaction / campaign shared state / audit event stream。

刪除瀏覽器資料仍可能清除角色，因此體驗團前必須要求每位正式角色至少完成一次 JSON 備份。現有專案授權聲明維持原狀，不因 Stage 0 擴充推定額外商用或開源權利。

## Recommended architecture (later, only for automatic cross-device sync)
Keep existing 5R builder/canonical rule engine and static hosting. Add a thin sync adapter and managed auth/storage backend rather than a second character engine.
Preferred first implementation: Supabase Auth + Postgres JSONB character_snapshot with RLS. Use current serializer as payload contract with schema_version, revision, updated_at, and owner_user_id. No service-role secret in client.
Tables: characters(id uuid, owner_user_id uuid, snapshot jsonb, schema_version int, revision bigint, updated_at timestamptz); optional character_access(character_id, user_id, role) for GM; character_events for audit/log later. Enable RLS and least privilege.
Keep localStorage as offline cache/draft only; cloud is authority for signed-in character. Migration: existing local character -> explicit one-time cloud import preserving source backup.
Revision-based compare-and-swap: save only against expected revision; on conflict show review/reload (never silent last-write-wins). Offline queued commands must be deduplicated and replayed with conflict checks.

## Modules and user flows
Stage 0: local roster → open/create/import character → mobile play state → auto/manual local save → reload/read-back → JSON backup/recovery → PDF/JSON export.
P0（11/14 後）: login/logout, list own cloud characters, resume/create/import, cross-device persistence, tenant isolation.
P1（11/14 後）: enhanced mobile play view with Overview/Combat/Spells/Inventory/Journal, audit trail and richer explicit resource controls.
P2（11/14 後）: canonical 2024 short-rest/long-rest engine with recovery annotations and tests; spell preparation/learn/replace eligibility; lawful mastery swap timing.
P3（11/14 後）: GM shared read permission, optional write permission, near-real-time subscription, campaign notes, inventory transactions and other enhancements.
Use canonical English IDs for saved rules choices; display Traditional Chinese + English names and searchable aliases, including Animal Handling (動物馴養/馴獸) as one skill, not duplicate skills.

## Stage 0 acceptance gates — 11/14 Release Gate
1. **Local persistence**: 建立或匯入一隻正式角色，修改 HP、THP、死亡豁免、靈感、法術位、至少一種 class/feature resource 與 notes；reload 後全部 read-back 相同。
2. **Independent players**: 兩個獨立 browser profile 各保存不同角色；互相不得看到或覆蓋對方 roster。
3. **JSON recovery**: 將正式角色匯出 JSON，在另一個乾淨 browser profile 匯入；角色 stable identity、choices、spells、`S.play`、`S.slotsUsed` 必須一致。
4. **Creator round-trip**: Creator → Final Sheet / Play state → Save → Reload → Level up → Save → JSON export/import → PDF，不得遺失已選物種、背景、職業、子職業、技能、專長、武器掌握、法術與 runtime state。
5. **Runtime isolation**: 手動修改跑團狀態不得反向改壞 canonical 角色規則資料；HP／資源 state 與角色建構資料需保持清楚分離。
6. **No unsafe automation**: Stage 0 不得自動消耗或恢復未具 canonical metadata 的資源；任何休息／資源調整若無可靠規則支援，維持玩家手動操作。
7. **Mobile usability**: 390x844 實際 browser render 無整頁水平 overflow；核心角色數值、HP、法術位、資源控制、法術／能力查詢按鈕可正常操作，正文不得低於專案 readability gate。
8. **Desktop regression**: 1440x900 創角、角色頁、法術／能力查詢、PDF／JSON 匯出仍正常。
9. **Data safety UX**: 角色頁或 roster 必須清楚提供 JSON 匯出入口；體驗團使用的正式角色都需至少產生一份可重新匯入的 JSON 備份。
10. **Regression**: 跑相關 targeted tests、full character matrix（涉及 progression 時）、save migration fixtures、player-reference UI，以及 `git diff --check`；任何必要 Gate FAIL 不得 Release。
11. **Live deployment**: merge/deploy 後必須確認 source → main → GitHub Pages parity，重新從正式 URL fresh-load；不得以 local PASS 代替線上驗證。
12. **Fresh-client UAT**: 至少一台實際手機與一個獨立桌面／瀏覽器 profile 從正式網站完成「開角色 → 改 runtime state → reload → JSON 備份」完整路徑後，Stage 0 才能標 DONE。

## Later cloud/runtime acceptance gates
跨裝置登入同步、tenant isolation、revision conflict、GM visibility、自動 rest recovery 等 Gate 保留給 P0–P3；不阻擋 11/14 Stage 0 Release。

## Boundaries
No modification to reference Google Sheet. No login credentials/secrets committed. No purchase or cloud activation without user permission. No production migration until backup, schema migration, and rollback tested.

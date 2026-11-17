> **2026-11-17 更新：登入策略已改為訪客模式＋Supabase Email 六位數 OTP。** 下方 LINE OAuth 分析僅保留為歷史安全審查，不再是新前端登入契約。不得再將 `custom:line` 寫回公開設定；既有正式 Supabase LINE Provider 不刪除、不強制連結、不自動合併 UID。請以 [README.md](README.md) 的 Email OTP／SMTP／身分遷移 Gate 為本次 Source of Truth。真實 Email 登入、託管 RLS、跨裝置仍未 PASS。\n\n# PR #47 雲端權限獨立審查（2026-11-16）

本文件只描述 **GitHub 功能分支的程式碼與靜態分析**，不是已通過的 Supabase 實際安全驗收。**尚未部署 PostgreSQL migration，也尚未核發 LINE OAuth Session。**

## 已檢查的設計邊界

- `characters` 僅有 owner `SELECT` RLS，沒有授予一般使用者直接 INSERT/UPDATE/DELETE；角色寫入走 `create_character` / `update_character_cas`，依 `auth.uid()` 限制擁有者。
- `campaign_memberships` 的 DM/player 身分由 `create_campaign` 和 `join_campaign` RPC 寫入，不能由用戶端傳 role；`list_linked_characters` 必須核對 DM 身分，且沒有編輯他人角色的 RPC。
- `character_links` 連結與撤銷必須由角色 owner 呼叫；角色的 cloud UUID 與原本 local id 不混用。
- 邀請碼在資料庫僅留 `SHA-256` 雜湊；建立團務時由密碼學亂數產生 32-byte 原始碼。**目前沒有過期、撤銷、限速機制**；這是正式啟用團務前需要處理的缺口。
- `SECURITY DEFINER` 函式固定空 `search_path`，明確 schema qualification，並在 migration 結尾撤銷 `public/anon` 執行權。以上只完成原始碼審查，實際 Supabase grant/RLS 必須另外以兩個玩家帳號與一個 DM 帳號讀回驗證。
- SQL `private.assert_native_payload` 原先未檢查 `rolled/skills/asi/level/ts`，有繞過前端校驗寫入損壞 snapshot 的風險；本輪加上最低限度資料庫端檢查。**仍不能等同完整 JSON Schema 驗證**。

## 待執行負向測試（必須真實 PostgreSQL / Supabase 測試專案）

| 測試 | 預期 |
|---|---|
| 未登入呼叫 `create_character`／`list_linked_characters` | 權限拒絕 |
| 玩家 A 透過 REST SELECT 查玩家 B 的 `characters` | 0 筆，不能透過猜 UUID 讀取 |
| 玩家 A 用 `update_character_cas` 寫玩家 B 的角色 | 拒絕 |
| 直接透過 RPC 寫缺 `skills/rolled/asi/level` 的 v10 snapshot | `invalid_native_snapshot` |
| 角色更新帶過期 revision | 衝突，不覆寫 |
| 玩家試圖用 SQL Data API 把自己 role 改為 DM | 權限拒絕 |
| 未加入團務者查 DM 角色列表 | 拒絕 |
| 玩家連結角色後 DM 查詢，再撤銷連結重新查詢 | 撤銷後不得再回傳 |
| A/B 各持不同 LINE Login 帳號，登出後刷新 | 無其他帳號快取/角色洩漏 |
| 同時打開手機、桌機修改同一角色 | revision 衝突，草稿可回復 |

**注意：** 真實 SQL 正確性需要 Postgres 解析執行；Node 合約 QA 僅能證明原始碼包含相關防護，不應標示 SQL E2E PASS。

## LINE / Supabase 人工授權 Gate

1. 在 [Supabase Dashboard](https://supabase.com/dashboard) 建立**隔離測試專案**（不改現有玩家網站），取得測試專案 URL、可公開 publishable key；密碼與 secret 不要貼到聊天或 GitHub。
2. 在 [LINE Developers Console](https://developers.line.biz/console/) 建立/管理 LINE Login Channel。需要真人登入、同意條款與設定 callback，這些授權操作由帳號持有者執行。
3. 候選是 Supabase **Custom OAuth2** `custom:line`，不是直接假設 Custom OIDC 可用；Authorization URL `https://access.line.me/oauth2/v2.1/authorize`；Token URL `https://api.line.me/oauth2/v2.1/token`；UserInfo `https://api.line.me/oauth2/v2.1/userinfo`。申請 scopes `openid profile`，並設定 `email_optional=true`；電子郵件 scope 必須另經 LINE 核准，不能作為必需條件。
4. 把 Supabase 顯示的 **OAuth callback URL** 填入 LINE Login Channel；回到測試網頁使用一個沒有 email 的真實 LINE 帳號測試。檢查 profile `sub` 作唯一身分、不同 LINE 帳號隔離、登出/重新登入、nonce/state/PKCE；LINE Web ID token 用 **HS256**，不應直接當成可用 JWKS 驗證的 OIDC token。
5. 通過 OAuth 后才能在測試資料庫執行 SQL migration 與 RLS 多帳號測試。**不能在正式 main 或既有正式站設定測試用密鑰、回呼網址或資料庫。**

## 暫不發布

PR 保持 Draft；公開網頁依舊沒有 LINE 登入功能。若 OAuth2 不相容，才對 Better Auth LINE provider 做單一路徑備選 PoC，避免建立雙重 Auth 系統。既有 2014／2024、PDF／JSON、訪客模式與角色本機儲存不可受到這份測試覆蓋。

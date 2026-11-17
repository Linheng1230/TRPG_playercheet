# D&D 5R｜訪客優先 × 純帳號密碼 × 雲端角色與 DM 團務（隔離 Draft PoC）

> **NOT DEPLOYED · G1 BLOCKED · G2 BLOCKED**。此分支只是原 PR #47 的候選程式碼；未設定正式 Supabase Auth、未執行 SQL migration、未部署 Edge Function、未開放玩家登入、未合併 main／Pages。保留既有 LINE Provider、Email 使用者及角色資料，不自動合併 UID。

## 玩家操作

- **訪客直接使用角色卡**：`../`，不必 LINE／Email／帳號。既有本機 localStorage、2014/2024 創角規則、JSON/PDF、FVTT 不變，這個 Cloud PoC 不會自動讀取或上傳角色。
- **雲端登入選用**：玩家提供 3～24 位英數／底線帳號名稱與至少 12 字元密碼。登入工作階段由 Supabase Auth 管理，身分驗證後才解鎖雲端角色與 DM 團務。
- **註冊／重設密碼**：註冊產生 256-bit 隨機一次性復原碼，僅顯示一次、要求玩家親自保存；復原碼正確才可重設密碼並產生新的復原碼。沒有可猜測的安全問題、強制信箱或 LINE。
- **資料授權**：既有 `cloud/schema.sql`、`cloud/bridge.mjs` 不更動；角色 owner、團務、DM 唯讀、CAS revisions 仍由 `auth.uid()`／RLS／RPC 判定，絕不以帳號名稱或 Email 文字授權。

## 為何不是直接以使用者名稱呼叫 Supabase Auth？

Supabase Auth 原生密碼登入需要 Email／電話號碼，不支援直接輸入 username。因此增加一層**伺服器端** Supabase Edge Function：

1. `cloud/username-auth.sql`（尚未套用）建立私有 username → Auth UID 對應與原子限速／註冊保留／復原碼鎖定 RPC。
2. `supabase/functions/username-auth/index.ts`（尚未部署）在 Cloudflare Turnstile 驗證、請求大小限制、資料庫 IP＋username 速率限制後，用服務端權限產生內部 Email 識別。**前端永遠不能拼造 Email，也沒有管理用金鑰**。
3. 伺服器使用 `auth.admin.createUser`（密碼雜湊由 Supabase Auth 處理），後續以 `auth.signInWithPassword` 取得真正的 Supabase Auth session；瀏覽器只能 `auth.setSession`，並重新呼叫 `auth.getUser` 驗證，後端 RLS 仍使用 JWT `auth.uid()`。
4. 使用者名稱的唯一性由 SQL PRIMARY KEY 保證；註冊先原子保留帳號，再建立 Auth 使用者、最後依 nonce 完成連結。**部分失敗不自動刪除可能已建立的 Auth 使用者**：未完成的 reservation 留給管理員稽核修復，避免誤刪／搶註。
5. 復原碼只儲存伺服器端 HMAC-SHA256 digest；密碼從不進入自製雜湊或新資料表。復原時原子 claim/鎖定驗證碼 → Auth admin 更新同一個 UID 的密碼 → 原子完成並輪替驗證碼；不自動變更角色 owner_id 或團務身份。中途不明確成功時保留鎖定狀態，由管理員復核。

### 重要安全界線及待解決風險

- **必須使用由管理者實際控制、具有正常 DNS 的內部識別網域** `AUTH_ALIAS_DOMAIN`。Supabase Auth 可能拒絕 `.invalid`、測試／範例網域；所以程式沒有任何預設假網域，不設就**拒絕註冊／登入**。必須在隔離測試與正式 Supabase 驗證此網域是否接受 `auth.admin.createUser`／密碼登入，且確認沒有寄信需求與意外路由。
- Supabase Auth 回傳的 `user.email` 或 JWT 可能包含伺服器產生的內部識別 Email，即使 Edge API 不主動回傳，也**不能宣稱此 Alias 在用戶端完全隱藏**。使用者若取得該 Alias，可能直接呼叫 Supabase 密碼端點而繞過 Edge 的 Turnstile／額外限速。必須依賴 Supabase Auth 自有 rate-limit／濫用控制作第二道安全邊界並做真人滲透與配額驗證。未完成前不得公開註冊。
- Cloudflare Turnstile `TURNSTILE_SECRET_KEY` 只能放 Edge 環境，前端僅持有可公開的 Site Key。後端需驗證 siteverify 成功與 hostname；啟動前須設定正式網域白名單及 Turnstile。沒有 Secret、Rate Limit Pepper 或 HMAC Pepper 時服務 fail-closed。
- `supabase/config.toml` 為公開註冊端點設定 `verify_jwt=false`，故**不能把 JWT Gateway 當保護措施**；真正的防濫用在 Edge 伺服器，CORS 不是驗證機制。全站 HTTPS、POST-only、4 KiB 限額、限速需實際驗證。另有每操作 15 分鐘 1000 次的全域保護桶；它可以在未取得可信 IP 標頭時限制總量，但會造成共用配額，須配合正式站流量實測。IP 標頭不是可靠身分，不能假設任意用戶端提供的 `cf-connecting-ip`／`x-real-ip` 就受信任。所有服務端 Secret 需在 Supabase Secrets 管理，絕不能 commit 或輸出。
- 密碼復原後既有其他裝置 session／refresh token 是否撤銷尚未驗證。**未通過 session revocation QA 前，不可宣布帳號復原完整上線**。復原碼若遺失，不提供安全問題或 Email 自助復原；需獨立人工身分核實流程，不能任意覆蓋 UID。
- 服務端 `cloud_auth_rate_limits` 記錄需由管理員定期清理過期 bucket（只存 HMAC digest），而未完成的 `cloud_login_accounts` reservation **不自動刪除**，避免 partial-auth orphan 錯誤復用。
- 使用者必須選擇可靠的密碼，註冊後保存復原碼。Recovery code 只能透過當次成功 UI 複製；後端及 UI 不存明碼至檔案／localStorage；不要在日誌或錯誤訊息中洩漏。

## 需要的 Edge 環境設定（未建立、未讀取實際值）

- `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_ANON_KEY`（僅 Edge）
- `AUTH_ALIAS_DOMAIN`（**自己控制的真實網域**，無預設）及 `AUTH_ALIAS_DOMAIN_APPROVED=true`（僅在 DNS 所有權、Supabase Auth 註冊／登入相容性都人工證明後才設定；預設不核准）
- `TURNSTILE_SECRET_KEY`（僅 Edge）、公開的 `turnstileSiteKey`（只在 Cloud PoC public-config.js）
- `RECOVERY_PEPPER`、`RATE_LIMIT_PEPPER`（不同的高強度隨機值，各 32 字元以上，僅 Edge）
- `DND_PUBLIC_ORIGIN=https://linheng1230.github.io`，開發時額外的 `DND_DEV_ORIGIN` 僅在隔離環境啟用
- GitHub Pages 與現有主站不能使用服務端 Secret／service_role／資料庫帳密。

## 原 LINE／Email 使用者與遷移

原 Supabase `custom:line` Provider 與舊 Email Auth 身分**保留**，不刪除、不改密碼、不自動 Link／Merge。不同 Provider 的 UID 可能不同，不能因帳號名稱／Email 相似就轉移角色。既有角色僅允許原所有者明確輸出原生 JSON，再由新身分同意後手動匯入；團務關係／所有權的正式遷移需管理員在雙方身分核實與備份後逐筆授權，不能自行更動 `owner_id`。

## LINE 分享連結與外部瀏覽器

`https://linheng1230.github.io/TRPG_playercheet/?openExternalBrowser=1`

從 LINE 聊天分享上列普通 HTTPS 連結，可嘗試要求 LINE 使用外部瀏覽器；不屬 LIFF，也不保證所有平台均遵循。與帳號登入完全無關，須 iOS/Android 真實測試。

## 驗收與發布 Gate

- 舊的隔離 PostgreSQL 16 RLS/RPC QA 有歷史證據：https://github.com/Linheng1230/TRPG_playercheet/actions/runs/43847831945，但不能當作 Hosted Supabase JWT/RLS 的 Live PASS。
- 本機：`node --test tests/qa-cloud-*.mjs`、`node --check cloud/app.mjs`、`node --check supabase/functions/_shared/username-auth.mjs`、`git diff --check`。既有 2014/2024 JSON、DM/RLS、Revision CAS、訪客 consent 預期不變。Node/mock PASS 不等於 hosted Supabase/Auth PASS。
- **G1 BLOCKED**：具有正式權限的隔離 Supabase 專案套用新增 migration／建立內部 alias domain；SQL 實際 PostgreSQL 原子性、併發註冊／恢復中斷、網域接受性、RLS/ACL、Turnstile/CORS/限速與真實 Auth session 驗證。
- **G2 BLOCKED**：密碼更新後既有 session 撤銷、復原碼單次使用、雙帳號的 hosted `auth.uid()`／RLS／DM 越權、跨裝置登出刷新、攻擊者繞過 Edge 直接呼叫 Auth API。
- **G3 PENDING**：2014/2024 Creator／JSON／PDF／FVTT、手動 consent 上傳、DM、CAS 完整回歸與正式站版本 parity。
- **G4 PENDING**：320/390/480/1440px 的手機／桌機實際瀏覽器畫面與觸控，無 overflow；iOS／Android 從 LINE 分享連結用外部瀏覽器開啟。
- **G5 PENDING**：PR #47 獨立安全審查與 Release Gate，正式 GitHub Pages 整合、更新、rollback／fresh reload。**現在不部署、保持 Draft。**

## Rollback

所有變更都停留在 Draft PR 的 `cloud/` 與新增 `supabase/` 檔案，與正式創角器相互隔離。若登入服務故障，停止新雲端登入入口，角色卡仍可訪客操作；不得重置、覆蓋或刪除既有 LINE/Email 使用者、雲端角色或 Campaign 資料。

官方文件：
- https://supabase.com/docs/reference/javascript/auth-admin-createuser
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/functions/auth
- https://developers.cloudflare.com/turnstile/get-started/server-side-validation/

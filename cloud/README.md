# D&D 5R｜訪客模式 × Email 六位數 OTP × 雲端角色庫 × DM 團務（隔離 PoC）

> 狀態：**SOURCE-ONLY / NOT DEPLOYED / NOT PRODUCTION READY**。GitHub Draft PR #47 內的 `cloud/` 獨立預覽，**正式 GitHub Pages 尚未接入、不得合併或部署**。Email OTP 真實寄件、受控登入、託管 Supabase live RLS、多帳號與手機實測都仍是 **G1 BLOCKED** / PENDING。

## 變更範圍與基準

- Source of Truth：`Linheng1230/TRPG_playercheet` 的 Draft PR #47，原始起點 `c9b7a9a`；以每次執行時 GitHub 最新 HEAD 為準。
- **訪客優先**：原本的 GitHub Pages 創角器、本機角色庫、2014/2024 規則、原生 JSON/PDF、FVTT、跑團狀態完全不受 `cloud/` PoC 影響。預覽頁有返回正式角色卡的訪客連結。無帳號也能玩，但無法存取雲端角色／團務。
- **登入改造**：原 LINE OAuth 按鈕改為 `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`，再以 `supabase.auth.verifyOtp({ email, token, type: 'email' })` 驗證六位數。只有有效 Supabase Auth session 才能存取既有 RLS/RPC。前端不使用 `signInWithOAuth`，不保存 OTP、不得將 OTP 放在 URL 或日誌。重新登入仍依後端 UID，絕不以 Email 文字當權限。
- **LINE Provider 不刪除**：現有正式 Supabase `custom:line` Provider 仍可能為 Enabled，本輪只移除新前端的 LINE 依賴，不改其設定、Client Secret、既有 Auth 使用者或角色資料。正式服務如需停用此登入 Provider，另立審核後的可逆變更，不能把「前端沒有入口」誤稱為後端已停用。
- `cloud/schema.sql` 與 `cloud/bridge.mjs` 均不需要因登入方式變更而修改。原生 v10 2024 與 v9 2014 JSON 保存、Revision CAS、防越權 DM 唯讀、邀請碼 hash、RLS 全沿用同一份權限契約；本地資料只有在使用者勾選 consent、預覽並確認上傳時才進入雲端。

## 正式 Supabase 的 Email OTP 啟用條件（尚未驗收）

1. 在現有正式 Supabase 專案的 **Authentication → Sign In / Providers → Email** 確認 Email 登入及註冊政策。不要為了測試關閉 Confirm Email；發版前要驗證實際工作階段。
2. **Authentication → Email Templates → Magic Link** 的郵件內容必須包含 `{{ .Token }}`（六位數）；`signInWithOtp` 的函式名稱不保證寄出的不是 Magic Link。建議繁中範本：「您的 D&D 5R 登入驗證碼：`{{ .Token }}`。若不是您操作請忽略此信。」不用在郵件中包含登入連結。
3. Supabase 預設內建 SMTP 只會寄信至專案團隊成員地址，並有低頻率限制（官方文件目前為每小時 2 封）。**對外給玩家使用前必須設置正式 Custom SMTP 或 Send Email Hook**，並驗證網域、寄件身份、限速、防濫發、收件與垃圾郵件判斷，安全保存 SMTP 憑證於 Supabase 管理端。不要放在 `public-config.js`、GitHub 或任何瀏覽器程式碼。
4. 程式提供 60 秒**前端冷卻**，不是安全邊界；真正速率限制、驗證碼過期時間、OTP 防重放由 Supabase Auth 控管。需在正式環境驗證 60 秒寄件間隔、錯誤碼與真實過期時間。
5. URL Configuration 必須符合未來上線網址；Email OTP 以手輸驗證碼為主，不依賴 LINE App 或 Magic Link 回跳。以手機 Chrome/Safari 及桌機兩個獨立帳號驗證登入、登出、刷新、跨裝置。
6. 真實帳號資料及四張團務資料表尚未取得託管 Supabase RLS/JWT 驗收證據；在驗證前不得對玩家開放雲端服務。

官方文件：
- https://supabase.com/docs/guides/auth/auth-email-passwordless
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp

## LINE → Email 身分遷移（不得自動執行）

不同 Auth Provider 登入很可能得到不同的 Supabase `auth.users.id`。雲端 `characters.owner_id`、`campaign_memberships.user_id`、`character_links.owner_id` 都依 **UID** 判定。

- **不能**用相同信箱、自填名稱、LINE 顯示名稱或本機角色 ID 判定兩個帳號為同一人。
- 既有 LINE 雲端角色不因畫面切換而被刪除、複製、覆蓋，也不會自動出現在 Email 帳號。
- 如未來有實際 LINE 雲端角色，優先讓使用者從原 LINE 身分經授權匯出完整原生 JSON，再以 Email 帳號的手動 consent 匯入；但此方法不自動移轉 Campaign DM、member／link 關係。
- 如需跨帳號轉移雲端團務／權限：必須證明舊與新身分都是同一持有者、由管理員事先列出受影響的角色和團務、取得明確核准、保留完整備份與稽核紀錄，僅透過具管理權限的受控交易做逐筆遷移。完成前不得重新指定 `owner_id` 或合併帳號。
- 若需停用 LINE Provider，先盤點是否已有 LINE Auth 真實使用者／雲端資料，再單獨進行可回復的停用；**絕不刪除**現有 LINE Channel、Provider 或玩家資料。本輪不修改 Supabase 正式設定。

## 從 LINE 分享網站：外部瀏覽器

提供玩家分享連結（正式角色卡保持可訪客使用）：

`https://linheng1230.github.io/TRPG_playercheet/?openExternalBrowser=1`

LINE 官方文件允許在從 LINE 開啟的一般網頁 URL 加入 `openExternalBrowser=1` 以嘗試用 Chrome/Safari 等外部瀏覽器開啟；**不適用於 LIFF URL**，實際行為仍須在 iOS/Android、Chrome/Safari 親自驗證。這只是分享連結／瀏覽器體驗，不涉及 LINE Login，也不在雲端模組新增 LIFF SDK。

官方參考：https://developers.line.biz/en/docs/line-login/using-line-url-scheme/#opening-a-url-in-an-external-browser

## 既有雲端資料與 SQL 邊界

`cloud/schema.sql` 保留 `characters`、`campaigns`、`campaign_memberships`、`character_links` 四表與 RLS。權限跟隨 `auth.uid()`：只有角色 owner 可寫入；DM 透過 `list_linked_characters` 的 SECURITY DEFINER RPC 讀取已授權連結的角色，無權改寫別人的角色。使用 `update_character_cas` 的 Revision 檢查防止多裝置覆蓋；`prepareCharacterImport`、`commitCharacterImport` 必須保留手動勾選 consent。邀請碼的過期、撤銷輪替、濫用限制及線上監測仍須補完。

先前 Node 靜態／mock 合約及隔離 PostgreSQL 16 RLS 實際 SQL 測試已有證據（例如 GitHub Actions `43847831945`）；測試身分由專用 `auth.uid()` shim 注入，**不能當成 hosted Supabase 的 live RLS PASS**。新 Email OTP Node test 亦僅使用 mock Auth，不能當成真人寄件／身分 PASS。

## 測試與發版 Gate

本地最低範圍：`node --test tests/qa-cloud-*.mjs`、`node --check cloud/app.mjs`、`node --check cloud/email-otp.mjs`、`git diff --check`。檢查原生 2014/2024 JSON round-trip、RLS/DM 合約、Email OTP 寄件/驗證/切換信箱/冷卻/錯誤與訪客模式隔離。

- G1 **BLOCKED**：正式 Email 範本 `{{ .Token }}`、Custom SMTP 真實送達、六位數驗證、登出重登。
- G2 PENDING：真正 Email 帳號 A/B 的託管 Supabase JWT/RLS、角色/DM 越權、邀請生命週期。
- G3 PENDING：2014/2024 Creator JSON 與 PDF、舊 Save／手動匯入、CAS、FVTT。
- G4 PENDING：320/390/480/1440px 實際手機桌機操作、跨裝置 Live UAT、LINE 分享外部瀏覽器。
- G5 PENDING：GitHub Pages 整合、正式版 hash/rollback、fresh reload；**目前 NOT DEPLOYED**。
- G6 PENDING：正式停用舊 LINE Provider 的風險審核與必要遷移；若無實際使用者可另以管理介面停用，但不能在本次擅自動作。

## rollback

PR #47 維持 Draft；未合併時原本網站不受影響。若預覽需暫停，可不接入主站，不動 Supabase Auth 與玩家資料。日後發版必須保留可關閉雲端入口的旗標、訪客角色卡、JSON／PDF 手動備份；若 Auth/SMTP 故障，立即回退雲端入口但不能清除本機角色或覆蓋既有雲端資料。

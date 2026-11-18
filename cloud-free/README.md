# D&D 5R 免費雲端角色庫 — Convex Auth v2

**狀態：本機原型。正式登入／雲端讀寫尚未驗收，禁止認定已上線。**

## 功能及硬邊界
- 官方 Convex Auth 2.0.0 的 Username＋Password 註冊與登入，玩家不強制留 Email／手機。Convex SDK 1.50.0。
- 儲存原生 D&D 5R JSON，格式使用 `{v:9|10, ruleset:"2014"|"2024", id: ...}`，保留所有其他欄位與文字不變，單份上限 512 KiB。僅玩家主動選 JSON 上傳；下載後由原本站手動匯入，**不自動同步既有 localStorage**。
- 儲存採 owner＋characterId、revision CAS 防覆寫。角色只能由其 owner 上傳、下載、刪除。
- DM 建立戰役；玩家以一次性隨機邀請碼入團，選擇分享或撤銷角色；DM 只能閱讀仍有有效 membership＋share 的角色，不能編輯。
- 帳號遺失的密碼復原暫不做，玩家請保管帳號密碼和本地 JSON。
- `index.html`、PDF/FVTT、2014/2024 的 canonical data、舊玩家角色均未修改。

## 零付費
Convex Free 不會因用量達上限自動轉換成付費，但可能暫停服務／拒絕讀寫；額度和收費以 https://www.convex.dev/pricing 為準。**請勿提供信用卡、選 Pro 或其他付費服務。** 原生 JSON 仍需保留備份。Logto/Supabase 前一方案沒有接進本原型。

## 本機建置（已實測）
在 cloud-free/ 執行：
```powershell
npm.cmd ci
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```
目前僅前端 TypeScript＋Vite BUILD PASS，9/9 本機 JSON 合約測試 PASS；正式 Convex Backend 型別、CRUD、授權、跨裝置及手機實測 **BLOCKED**。

## 目前真正的阻擋原因：Convex CLI 需要本人免費帳號登入
實際 CLI 已確認：
- `convex dev --local` 在 1.50.0 已廢棄。
- `convex deployment create local --select` 回覆 `Creating a deployment requires logging in`。
- `convex codegen` 尚無部署時回覆 `No CONVEX_DEPLOYMENT set`。

使用者完成免費帳號授權後，才在目前獨立工作區執行：
```powershell
cd D:\Tools\zizi-ai-runtime\worktrees\dnd5r-cloud-free-convex-20261118\cloud-free
npx.cmd convex login
npx.cmd convex deployment create local --select
npx.cmd convex dev --once
npx.cmd convex codegen
```
如果 CLI 要求購買、信用卡或創建付費服務，立即停止。這是免費 local 部署仍需帳號登入的限制，不代表已啟用 Hosted 雲端。申請免費 Hosted Project 也須經使用者明確授權。

取得屬於使用者的 Convex deployment URL，再設定本地 `.env.local`：
```text
VITE_CONVEX_URL=https://<your-actual-deployment>.convex.cloud
```
此檔不提交至 Git；未設定 URL 前入口顯示「尚未啟用雲端連線」。前端 Vite `base: "./"` 支援 GitHub Pages 子路徑。

## 必須完成才可上線的 Gate
1. 真實帳密註冊 → 登出 → 重新登入，且不強制 Email／Phone。
2. 玩家 A/B 的角色 JSON 存/取隔離，2024 v10 與 2014 v9/v10 原文 round-trip，手機跨裝置。
3. 並行 Revision CAS、刪除／分享撤銷後無法再讀、DM 僅唯讀。
4. 正式 Convex Backend TypeScript Codegen＋型別檢查、真實 CLI CRUD/RLS-like 權限、320/390/1440px 真實瀏覽器與原站回歸。
5. 檢查 Free 用量與拒絕寫入時提示，不自動升級付費。通過後另行申請 PR/merge/Pages 授權。

保持 PR #47 Draft；不合併、不部署、不動正式 production、main 或 dirty worktree。

# D&D 5R｜免費雲端角色庫（Convex Auth v2）

**2026-11-18 現況：獨立 Convex Free Hosted Staging 的帳號、角色、DM 與瀏覽器驗收已通過；尚未合併／整合原網站，未部署 GitHub Pages。**

## 已驗證功能
- 原生 Username＋Password 註冊／登入／登出，不需 Email 或手機；使用官方 Convex Auth 2.0.0、Convex 1.50.0，不自建密碼系統。
- 玩家主動上傳原始 Save JSON \`{v:9|10,id,ruleset:"2014"|"2024",...}\`，單份 512 KiB；下載原文字節不變。後端按 User ID 隔離、revision CAS 防舊裝置覆寫。
- DM 建立戰役，一次性 256-bit 邀請碼（DB 只存 SHA-256）、玩家加入、分享或撤銷角色；DM 只有已分享角色的唯讀權限。
- 撤銷分享／退團後 DM 不能再查資料；前端已修正撤銷後仍顯示快取 JSON 的缺陷，會立即隱藏並清除。已下載的外部副本不能遠端回收。
- 雲端登入入口獨立於現有創角頁，未自動上傳既有 localStorage；目前需由原網站手動匯出 JSON 到本入口上傳，或從本入口下載後自行匯入原網站。
- 忘記密碼／帳號復原明確延後至下一階段。請保存帳密及 JSON 備份。

## 真實 QA 與證據
| Gate | 結果 |
| --- | --- |
| Convex Local Codegen、後端 TypeScript、四個 Auth Components | **PASS** |
| Local Deployment：兩玩家、角色 v9/v10、Owner、CAS、DM 分享及撤銷、第二 Session | **14/14 PASS** |
| 隔離 Convex Hosted Development：同一套真實後端負向流程 | **14/14 PASS** |
| Brave headless 行動瀏覽器 390px 註冊／登出／重新登入 | **5/5 PASS** |
| Brave 兩玩家三個獨立 Context、JSON 上傳／原文下載、DM 邀請／分享／撤銷、320／390／1440px | **10/10 PASS** |
| 修改後 React／Vite 前端正式建置 | **PASS** |
| 正式 GitHub Pages、原創角網站的角色 State 自動雙向同步 | **未整合／BLOCKED** |

第一次 Browser Full UAT 發現：撤銷分享後 DM 畫面仍留有舊 JSON。已修正 \`src/main.tsx\`，由即時 roster 決定能否顯示內容並清除舊文字；相同完整 UAT 重新驗證 **10/10 PASS**。

本目錄可重跑：\`tests/local-integration.mjs\`、\`tests/local-auth-smoke.mjs\`、\`tests/local-integration-result.json\`、\`tests/hosted-integration-result.json\`。瀏覽器完整程式、實測結果與 320／390／1440px 截圖：\`D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\convex-free-browser-20261118\`。

## 僅測試的免費專案（非正式部署）
- Convex Team：\`henry861230\`
- 獨立 Project：\`dnd5r-free-staging-20261118\`
- Hosted Development：\`scintillating-hornet-218\`
- Dashboard：https://dashboard.convex.dev/t/henry861230/dnd5r-free-staging-20261118/scintillating-hornet-218
- 公開 API URL（非密鑰）：https://scintillating-hornet-218.convex.cloud

官方 CLI 建立過程未要求信用卡、付費或 Pro。**必須繼續保持 Free；達用量上限可能停止服務／拒絕寫入，不得自動升級。** Convex Team Billing Plan 是否仍為 Free，可由本人在 Dashboard 核對；如非 Free，立即停止，不允許付費。官方參考：https://www.convex.dev/pricing 、https://docs.convex.dev/production/state/limits 。

## 重現命令（本目錄）
\`\`\`powershell
npm.cmd ci
npm.cmd test
npm.cmd run build
npx.cmd convex login status
npx.cmd convex deployment select dev/qa-20261118
npx.cmd convex dev --once --typecheck enable
$env:QA_CONVEX_URL="https://scintillating-hornet-218.convex.cloud"
node .\tests\local-integration.mjs
Remove-Item Env:\QA_CONVEX_URL
\`\`\`
\`npm ci\` 只從 package-lock 安裝。前端本機預覽：\`npx.cmd vite --host 127.0.0.1 --port 4173\`，在 \`.env.local\` 設定真正的 VITE_CONVEX_URL；此檔和任何管理金鑰不得提交 Git。未設定雲端網址時 UI 顯示「尚未啟用雲端連線」。

## 尚未完成與 Release Gate
1. 現有創角網站的登入按鈕、角色 State 儲存／載入整合尚未施工；目前是可運作的**獨立雲端角色入口**，不是已上線的正式角色卡雙向自動同步。
2. 原網站 2014／2024、JSON／PDF／FVTT、舊玩家 State、完整手機操作及頁面整合 Regression，須在主網站集成後另行驗證。
3. 正式 GitHub Pages／main 合併、PR Reviews、工作租約、正式 Live-UAT 均未授權；舊 Supabase Draft PR #47 不應與新 Convex 路徑同時寫角色資料。
4. 玩家遺失帳密無復原流程為 V1 明確取捨，應提供清楚提示及 JSON 備份下載。

**Hard Boundary：不購買任何服務，不輸入信用卡，不合併、不推送、不部署 Pages、不改 production 或 dirty main。**

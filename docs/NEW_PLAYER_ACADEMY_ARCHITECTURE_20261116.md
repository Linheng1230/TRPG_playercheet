# 00｜D&D 5R 新手學院：共用架構與串接契約

> 版本：Architecture Contract v1.0｜2026-11-16
> 狀態：**00 文件規格可交接（TARGETED QA）；10／20／30／40 未依本契約完成整合，90 Release Gate 未通過**
> Owner：00｜架構總控；唯一可寫目標：`docs/NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md`。
> 本文件**不是**已部署功能、不是角色存檔 schema，也不准其他施工線以此取代實際 Repository 或 canonical 5RTools。

## 1. 目標、界線、驗收判定

**產品目標**：讓完全沒玩過 D&D 的玩家先理解「角色想做什麼」，用繁中短教學、具體範例和可跳過的職業推薦進入既有 2024／5R 創角；能從教學跳到真實選項，再回到原教學續讀。熟手一鍵沿用原創角流程。長文、手機與鍵盤都可使用。

**CHANGE**：定義唯一導航協定、穩定教學 ID、Creator step mapping、問卷建議交付、reload/resume、安全與無障礙、owner 與 90 gate；只寫本文件。
**LOCKED**：`index.html`、`home.html`、現有 Creator、`S`、現有 save/JSON/PDF、canonical data、2014 分支、任何共享 CSS/JS、其他施工線所有未提交檔案。
**SOURCE**：`README.md`、`PROJECT_RULES.md`、`docs/MAINTENANCE_AND_EXTENSION_GUIDE.md`、`docs/NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md` 與本輪實際檢查的 `index.html`、`home.html`、`assets/watercolor-site-bridge.js`。
**RELEASE**：只有 30 取得 exact shared target ownership、完成實際整合，再由 90 做 Source → QA → Live fresh-load 驗收才能稱功能 DONE。

## 2. 已驗證現況（2026-11-16 working tree；非未來 API）

| 實際位置 | Verified fact | 串接含意 |
| --- | --- | --- |
| `index.html:1005–1230` | `.step-panel[data-step="0"… "13"]`，目前 14 個頁板（含 `play=11`），學院仍維持 13 個 stable IDs | 統一使用下表 ID，不讓 10／20／40 各寫自己的數字路由 |
| `index.html:4937–4986` | `STEP_NAMES`、`renderNav()`、`stepDone(i)`、`go(i)`；`go(i)` 直接設 `S.step` 並切換面板，並未檢查每步是否完成 | 導覽 ≠ 有效選擇／已確認；不可把 `go` 當完成 gate |
| `index.html:4674–4688` | `S.ruleset` 預設 `"2024"`，`S.cls/bg/sp`、`S.skills` 等是既有角色真實狀態；`S.step=0` | 學院只管導覽與偏好，不設另一個角色 State |
| `index.html:4990–5070` | `pendingClassChoice`、`S.classConfirmed`；須自行按「確定職業」，確認後不能直接修改；若想試別種職業，先儲存再用「新建角色」另建 | 推薦只能高亮／預覽；不得直接觸發 `_commitClass` 或修改 `S.cls` |
| `index.html:5050–5120` | `originPending`、`S.bgConfirmed`、`S.spConfirmed` 分別管理背景、物種確認；變更背景涉及技能／屬性加值／裝備 | 推薦不可繞過背景與物種的確認或 rollback |
| `index.html:5402–5462` | `pendingSkills`、`S.skillsConfirmed`，技能須按「最終確認技能」；`skillsReady()` 另檢查職業與物種額外技能 | 教學進度不得冒充技能完成 |
| `index.html:6556–6595` | `SAVE_VERSION=9`、`serialize()`、`deserialize()`；角色庫 localStorage keys 為 `dnd5r:roster`、`dnd5r:char:<id>`、`dnd5r:current` | Save Schema v9 唯一由既有 Creator 管理，學院不增欄位 |
| `index.html:6760–6853` | `saveCurrent()`、`autoSave()`、`loadChar()`、`resetState()`；會保存、還原既有角色 | 不得因推薦／返回而新建角色、覆蓋既有角色 |
| `index.html:7960–7977` | `boot()` 從當前角色 restore，隨後 `go(0)`；`S.step` 不在 `serialize()`；現行版本儲存明確的 class/bg/sp/abilities/skills 確認旗標與語言鎖定，pending 暫選值則不持久化 | reload 後的「教學位置」由 AcademyBridge 另存，已確認的 Creator 鎖定狀態由既有 Save／Reload 保護，不將尚未確認的 pending 當完成 |
| `assets/watercolor-site-bridge.js:1–14` | 已用 `?view=creator/origin/abilities/skills/details/level/prepare/sheet/rules/spells/shop/play/characters/adventures` → `go(number)` | 30 應擴充／統一現有薄 bridge，**不可新增平行第二套入口路由** |
| `home.html:18–40` | 現有連結透過 `index.html?view=...`；正式站基底首頁目前有八張入口卡（含跑團狀態），本地工作樹另有未追蹤修改 | 30 先協調首頁 owner；不要假設記憶中的「五入口」就是目前檔案 |
| `docs/NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md` | 20 線已定 10 題、每題四選、三組不同職業推薦及可略過策略；文件保留早期 NOT IMPLEMENTED 標籤，但 20 模組與 QA 現已存在，須以 Repository 與真實 QA 判斷 | 00 不擅改成五題；接口不硬綁題數，題庫演進由 20 決定 |

**確認風險與版本相容**：正式來源 `origin/main` 的 `renderClasses()` 使用 `S.classConfirmed` 約束 `next0`，Save JSON 亦保存 `classConfirmed`，`deserialize()` 對新版明確 `false` 應維持待確認；較舊存檔若缺此欄，另走既有相容遷移。`go(i)` 仍可作導覽，但不代表授權修改鎖定資料。**30／90 必須獨立測試學院捷徑不會自行確認或覆寫已確認角色**。

## 3. 唯一 Creator step mapping（由 30 轉譯）

| 穩定 `creatorStepId` | 目前 `S.step` | 2024 介面 | 用途 |
| --- | ---: | --- | --- |
| `creator.class` | 0 | 職業 | 可顯示職業推薦，**必須自行確認** |
| `creator.origin` | 1 | 起源：背景＋物種 | 背景、物種各自確認 |
| `creator.abilities` | 2 | 屬性 | 標準陣列／購點／投骰等沿用原 UI |
| `creator.skills` | 3 | 技能 | 檢查技能熟練與確認 |
| `creator.details` | 4 | 角色詳情 | 含語言與其他資訊，沿用下一步 gate |
| `creator.level` | 5 | 升級 | 3 級子職業須依現有選擇流程 |
| `creator.spells` | 6 | 法術 | 不提前授予能力 |
| `creator.sheet` | 7 | 角色卡 | 可回顧角色與手動操作 |
| `reference.rules` | 8 | 規則速查 | 純查詢 |
| `reference.spells` | 9 | 法術圖鑑 | 純查詢 |
| `reference.shop` | 10 | 商店購物 | 非教學交易代理 |
| （既有網站 `play`，無 Academy ID） | 11 | 跑團狀態 | 只供原站入口，學院不新增代理狀態 |
| `reference.characters` | 12 | 角色百科 | 純查詢 |
| `reference.adventures` | 13 | 冒險圖鑑 | 純查詢 |

**固定策略**：10／20／40 只能引用上述字串 ID；不可引用 `S.step`、`go(i)`、`S.cls` 或任一 JS global。30 提供單一 lookup map，調用既有 `go(number)`，不覆寫 `go`；未知 ID 必須拒絕／退回安全的創角入口，不默默轉成第一頁並當成功。2014 必須隔離：學院內容只保證 2024，遇 `S.ruleset==="2014"` 應清楚標示與提供原 2014 創角選項，**不得靜默切換或清除角色**。

## 4. 教學步驟 ID 與動作（10 主責內容）

| `academyStepId` | 完全新手要理解的事（範例） | 可跳 Creator step | 完成條件（僅學習進度） |
| --- | --- | --- | --- |
| `lesson.welcome` | 選新手教學或直接創角；沒有考試也能玩 | `creator.class` | 明確點選進入 |
| `lesson.class` | 戰士擅長武器、防守；法師靠法術，不等於孰強孰弱 | `creator.class` | 看過範例或主動略過 |
| `lesson.abilities` | 力量 16 的調整值是 +3；點屬性會影響技能與攻擊 | `creator.abilities` | 理解數值與調整值不同 |
| `lesson.checks` | 擲 d20＋能力調整值＋符合條件的熟練加值，比對 DC | `creator.skills`, `reference.rules` | 看過一個檢定例子 |
| `lesson.origin` | 背景給起源專長／屬性方向，物種給特性；兩者都可自行選 | `creator.origin` | 看過背景與物種的區別 |
| `lesson.details` | 角色姓名、語言、背景故事只是讓角色更好演繹 | `creator.details` | 可跳過 |
| `lesson.turn` | 自己回合常用動作、附贈動作、移動、反應的基礎區別 | `reference.rules` | 用一個回合範例理解 |
| `lesson.spells` | 戲法與法術位不同；攻擊命中、豁免 DC 是不同機制 | `creator.spells`, `reference.spells` | 看過一個簡單法術例子 |
| `lesson.sheet` | HP、AC、技能、裝備、法術在哪裡；之後能回來查 | `creator.sheet` | 能找到至少一個欄位 |
| `lesson.next` | 要開始冒險：回到原角色，或繼續看練習題 | `creator.class`, `creator.sheet` | 點選下一步 |

內容可獨立前進／返回、跳過／回看；上述是 **ID 契約**，不是要求 10 施工線把所有步驟寫在同一檔。教學文字屬例子，不得當 canonical 規則全文；任何規則詳情連回現有 5RTools 投影。行動提示必須告訴新手「接下來按哪裡」。

## 5. 20 問卷、40 練習的獨立 ID

- 20：`quiz.intro`、`quiz.q01`～`quiz.q10`、`quiz.result`、`quiz.review`。實際題數以 20 的版本化 `questionSetId` 宣告，不讓 30 對題目數寫死；**目前既有規格是 10 題**。
- 20 的輸出是三組建議／解釋／候選的 canonical reference，絕非已建立角色。結果卡的「套用職業」對 30 僅表示 **前往 `creator.class` 並提示候選**；玩家仍須親自選擇與確認。子職業 3 級方向僅為建議，不設定 `S.sub`。
- 40：`practice.intro`、`practice.ability-check`、`practice.turn-choice`、`practice.spell-choice`、`practice.review`；每題要讓完全新手選擇，說明理由和下一步，允許重做。練習結果不代骰、不扣資源、不變動 HP／法術位／技能／角色卡。
- 不在 00 新建另一份 `CLASSES`／`PROG`／`SPECIES`／`BACKGROUNDS`。20／40 可使用純測試 mock catalog；正式整合由 30 在 runtime 從目前 canonical catalog 解析、檢查規則版本與候選合法性。現有 `CLASSES[].n` 是 Creator 的選取／存檔名稱鍵，**不得直接假定是對外永久 stable ID**。

## 6. 單一 AcademyBridge v1（規格，尚未實作）

30 **唯一**實作 `window.DND5RAcademyBridge`，10／20／40 獨立模組以依賴注入接收同等 `bridge` 介面，未整合前以 mock bridge 測試。不得在其他線建立另一個 window global 或更動 `S`。

```ts
// 概念性 TypeScript interface；不等於現有 runtime 實作
type CreatorStepId =
  | "creator.class" | "creator.origin" | "creator.abilities"
  | "creator.skills" | "creator.details" | "creator.level"
  | "creator.spells" | "creator.sheet"
  | "reference.rules" | "reference.spells" | "reference.shop"
  | "reference.characters" | "reference.adventures";

type AcademySource = "lesson" | "quiz" | "practice";
type AcademyRouteV1 = {
  v: 1;
  source: AcademySource;
  academyStepId: string;       // 返回的原學習 ID，必須在來源模組白名單
  creatorStepId: CreatorStepId;
  returnURL: "./academy.html"; // only 30-validated relative same-origin pathname
  returnStep: string;          // validated academyStepId, no raw DOM selector
  mode: "inspect" | "suggest"; // 不設 "forceApply"／"skipConfirm"
  suggestion?: { kind: "class" | "background" | "species" | "subclass";
                 canonicalRef: string; catalogVersion: "2024" };
};
interface AcademyBridgeV1 {
  openCreator(route: AcademyRouteV1): { ok: boolean; reason?: string };
  returnToAcademy(): { ok: boolean; reason?: string };
  getRoute(): AcademyRouteV1 | null;
  getCreatorSnapshot(): { ruleset: "2024" | "2014"; creatorStepId: CreatorStepId;
                           characterPresent: boolean } | null; // 唯讀安全 projection
  saveProgress(p: AcademyProgressV1): { ok: boolean };
  restoreProgress(): AcademyProgressV1 | null;
}
type AcademyProgressV1 = {
  v: 1; curriculumVersion: string; activeSource: AcademySource;
  academyStepId: string; completedStepIds: string[];
  questionSetId?: string; answers?: Record<string,string>; updatedAt: number;
};
// 禁止夾帶整份 S、角色 ID、法術位、HP、角色私密資料。
```

**例子**：新手讀 `lesson.abilities` → 按「到創角試試屬性」→ 30 前往 `index.html?view=abilities&academy=1&returnURL=academy.html&returnStep=lesson.abilities` → 在既有 Creator 操作或只查看 → 按「返回教學」→ `academy.html?step=lesson.abilities`。這個 URL 是**預定格式**，不是目前已驗證可運作的網址。

URL 通道固定 `academy=1`、`returnURL`、`returnStep`；`view` 必須使用現有 bridge 的 key，30 以單一 map 轉換上表 `creatorStepId`。建議內容只透過已驗證的短期 session state／bridge 交換，**不要把 JSON、原始角色資料或自由文字放在網址**。未裝 30 bridge 的舊版頁面仍保留原 `view` 行為；不破壞熟手入口。

## 7. 新手／熟手入口與返回／恢復時序

1. **新手**：30 從既有首頁增加一個易懂的「我是新手，先學怎麼玩」入口，進學院；**熟手**：「我已經會創角」直接 `index.html?view=creator`，不要求作問卷。首頁 `home.html` 與共用 `index.html` 的唯一 writer 只能是 30，且須先取得別線 handoff／exact target lease；未取得前 BLOCKED，不可搶寫。
2. 進學院：10／20／40 可各自顯示獨立 UI，但皆接收 `AcademyBridgeV1`；上一題、下一題、跳過、回到創角與推薦操作都經 bridge。是否已讀教學屬 AcademyProgress，不是 `S`。
3. 去 Creator：30 先驗 `ruleset`；若既有角色是 2014，只能說明教材對應 2024 並提供原 2014 入口，不能自動 `chooseRuleset("2024")`。2024 的建議只能預覽，不能直接 mutate S；若要改既有角色，走原 UI 的修改、回滾與確認流程。
4. 返回：保留 `returnURL`、`returnStep` 並帶到新手入口；教學返回按鈕必須是可聚焦的實際互動。當步驟不再存在，降級到 `lesson.welcome`，顯示「教材已更新，請重新選擇章節」，不可空白。
5. **reload/resume**：由 30 用單一新 key `dnd5r:academy:v1:progress` 保存 `AcademyProgressV1`（localStorage，JSON schema 驗證）；有效資料在學院重載後恢復教學與問卷答案，重算結果；Creator 重載先尊重既有 `boot()/deserialize()`，待其完成才讀 URL `view` 並執行一次導覽。**不可寫入 `dnd5r:char:*`、`dnd5r:current` 或 Save v9 新欄位**。localStorage 禁用、空間不足、版本不相容時保持本頁記憶態並顯示「這次進度可能無法保存」，不冒充已保存。
6. 角色存檔與教學進度完全獨立：教學完成不等於角色已完成；Creator 的 `S.step` 每次重載不是持久欄位，必須由 URL bridge 恢復**導航意圖**，不是憑空恢復已確認狀態。無 URL 時沿用既有 `boot()`；不擅改其行為。

**安全驗證**：`returnURL` 只收站內相對路徑、明確 allowlist（初版 `academy.html`）；解析後 `origin===location.origin`，拒絕 `javascript:`、`data:`、`//other-host`、反斜線混淆、路徑穿越、過長 URL。解析錯誤／無 `returnStep` 時不要導去外站；回學院安全首頁。不得從 URL 直接操作 `S`、`deserialize`、`resetState` 或觸發確認按鈕。

## 8. 不可逆確認、無障礙、手機硬需求

**確認邊界**：在本次 UI session 中，`pendingClassChoice`／`originPending`／`pendingSkills` 是待確認；`classChoiceLocked`／`originLocked`／`skillsLocked` 是 UI 臨時旗標；`S.cls/bg/sp/skills` 是持久角色實體，兩者不同。只有本人在既有 Creator 真正確認才可提交；不得因推薦或 reload 自動把 UI lock 設成 true。若先前已有角色資料，要說清楚「套用不同職業可能重設後續選擇」，由原 Creator 的 rollback／確認流程承接。30 若發現現有 next/go 可以繞過需確認項目，應與 Creator owner 取得修改許可或在整合入口限制推薦提交；**不得在本契約裡宣稱已修正**。

**可及性／閱讀**：繁體中文（台灣用語）；正文桌機至少 15.5px、手機至少 15px、line-height 1.75–1.9，對比清晰；題目與操作按鈕使用原生 `button`、label、fieldset/radiogroup 語意，焦點可見，鍵盤 Tab/Enter/Space 可操作；回上一題不丟答案；跳轉後 `h1/h2` 收焦點並告知目前頁/進度（`aria-live="polite"`），錯誤訊息和必填提示可由讀屏讀到；任何提示不只靠顏色或 hover。觸控目標建議至少 44×44 CSS px。桌機 1440×900、480px 窄視窗及手機 390×844，無整頁水平 overflow；不遮住確認按鈕、不讓手機只能 hover 才能讀到說明。尊重 reduced-motion；新手可從任一教學步直接回原站。

## 9. Ownership / Handoff（每條線只有一個 exact writer）

| 線 | 只擁有 | 不得寫 | 交給 30 的輸入 |
| --- | --- | --- | --- |
| **00** 架構總控 | 本文件、contract 版本與 handoff | `index.html`／Creator／home／其他線規格 | Step IDs、API/schema、QA 阻塞與注意事項 |
| **10** 新手教學 | 自己命名空間的課程內容、lesson data、獨立測試與 view 模組（檔名與 30 對齊） | `index.html`、`home.html`、20／40 檔 | `lesson.*` IDs、`creatorStepId`、返回/跳過、繁中教學樣例 |
| **20** 職業適性測驗 | `docs/NEW_PLAYER_CLASS_FIT_QUIZ_SPEC_20261116.md`、問卷／評分純函式、自身單元測試 | Creator State、其他線入口／shared bridge | versioned questionSet、候選 canonicalRefs、三卡結果、解釋與偏好資料 |
| **30** 唯一入口整合 | **在 handoff/lease 後**唯一可改共用 `index.html`、`home.html`、既有 `assets/watercolor-site-bridge.js`，並實作單一橋接器／入口 UI | 10／20／40 模組業務內容，除非明確 handoff | 統合 ID／schema、單次導覽、Save/2014 防護、入口返回與進度 |
| **40** 新手實戰選擇題 | 獨立 `practice.*` 題庫／回饋／UI 模組／測試 | Creator／問卷評分／shared bridge | 題目 ID、答案解釋、下一步跳轉、可重試狀態 |
| **90** QA / Release Gate | 測試案例、evidence、發版驗收報告（需自有 target） | 不替其他線偷修共用入口、不改 canonical 規則 | Gate PASS/FAIL/BLOCKED、回歸、Live fresh reload 證據 |

**作業協定**：各線先獨立做可在 mock bridge 下運作的部分；任何需要碰同一 exact target 時由 30 收斂。若 30 沒有 lease／handoff 就把 shared target 標 `BLOCKED: OWNER_CONFLICT`，繼續測試獨立模組。不可 checkout／reset／`git add .` 或擅自提交他人變更。任何 10／20／40 的規格更動須維持本版 bridge 的 backward compatibility，必要才提案由 00 bump contract。

## 10. 可驗收測試案例（90 最低 Gate）

| Case | 操作／輸入 | 預期／禁止事項 |
| --- | --- | --- |
| A01 | 熟手從首頁選直接創角 | 直接到 `creator.class`，不強迫教學或測驗 |
| A02 | 新手教學 `lesson.abilities` → Creator → 返回 | 命中 `creator.abilities`、返回原 ID、同一角色 S 不變（除非使用者在 Creator 主動修改） |
| A03 | 每個 `creatorStepId` 路由與 `view` 實測 | 全 13 個 ID 映射正確；未知 ID 安全拒絕 |
| A04 | 學院／Creator 重新整理與瀏覽器重開 | Academy 進度合法恢復；Creator 已存角色仍由原 `deserialize`；不憑空恢復 lock |
| A05 | 20 推薦職業、背景、物種與 3 級子職業 | 只高亮或提示，S 不改，不能提前套子職業，能自由忽略 |
| A06 | 已有職業／裝備／法術的角色從問卷改推薦 | 已確認職業不得被推薦覆蓋或解鎖；原 Creator 不提供「修改職業」，應明示先保存再用原站「新建角色」另建。尚未確認的角色仍走原「選擇→確定職業」與必要的回滾保護；拒絕時不改資料。 |
| A07 | 已保存 `S.cls`，但本版 Save 的 `classConfirmed:false`，重新載入或經學院返回 | 必須保持 `classConfirmed:false`、仍需自行按「確定職業」，學院不可代為確認；舊版無此欄的既有存檔使用既有 migration，應與本版新角色測試分開記錄。 |
| A08 | 2014 存檔開啟 2024 新手入口 | 無資料損失、無自動切版；顯示 2014 不相容說明與原入口 |
| A09 | 改任一問卷答案、跳過、重測、只有兩筆合法候選 | 結果重算、可跳過、不出現舊快取結果；推薦只限合法來源 |
| A10 | localStorage 禁止、資料毀損、schema v2、舊 questionSetId | 安全降級、不 throw、不覆寫角色存檔；提示無法恢復 |
| A11 | `returnURL` 指向外站／危險 scheme、`returnStep` 無效 | 拒絕導外、不呼叫 `go` 修改角色、回安全學院入口 |
| A12 | 390×844、480px、1440×900；鍵盤／讀屏／觸控 | 焦點／進度／確認清楚；無橫向溢出、不遮擋、不依賴 hover |
| A13 | 10、20、40 模組單獨載入 mock bridge | 能互動與回傳協定，不需直接使用 S 或新角色 schema |
| A14 | 結束新手學院後 JSON save → reload → PDF/Final Sheet | 與未進學院的既有 Creator 結果一致；2014 與 2024 不混用 |
| A15 | 無 `academy` URL 的舊 `view` deep link | 所有原 `home.html` 入口保持運作 |
| A16 | Git 工作樹已有其他聊天室未提交改動 | 30/90 顯示 target ownership，不能覆蓋他人檔案；只測本線相關差異 |

**90 QA 訊號**：10／20／40 的單元測試 + bridge 契約測試 → 30 在整合頁的實際點選／鍵盤／reload／save round-trip → 既有 `qa-save-migration-fixtures.js`、`qa-choice-exhaustive.js`、必要的 `qa-module-smoke.js`／`qa-2014-matrix.js`、完整 Release Gate（實際需依 PROJECT_RULES 與變更依賴鏈擴充）→ GitHub Pages Live fresh browser / script identity / 390px 與桌面實際畫面。只跑 mock 或只檢查文件不得稱 90 PASS。

## 11. 目前 BLOCKED / 下一步

- **不阻塞 00 文件交付**：本文件可由 10、20、40 直接作為合同輸入；00 未觸碰共用程式碼。
- **30 整合 BLOCKED（直到取得共同入口的唯一寫入權）**：`index.html` 與多個 shared assets 有其他施工線未提交修改，且 `home.html`、`assets/watercolor-site-bridge.js` 目前也是未追蹤、可能由其他線編輯的檔案。先核對各 target owner、領 lease／完成交接；不能藉本契約搶改。
- **90 Live gate PENDING**：尚未有新手學院 UI、bridge、Creator 實際整合／Live read-back；不能標實際網站 DONE。
- **確認保護待驗**：既有 lock/pending 僅 UI 暫存，Save v9 沒有它們；30 必須提出恢復與確認策略，不得由 20 或 10 直接繞過。

**Handoff 給 10／20／40**：只讀 §3–§6、§8–§10，交付自己的可獨立執行模組及 mock bridge contract tests，不寫共享 target。
**Handoff 給 30**：先檢查 live Git status／首頁與 bridge owner，唯一實作 §6–§7，解決確認與 reload 防護，再整合 10／20／40。
**Handoff 給 90**：按 §10 逐案產 evidence；有任何進入下一步繞過確認、資料污染、2014 混用、手機不可讀或 Live 未 reload，一律 FAIL/BLOCKED，不能只收 worker 的 PASS 宣稱。

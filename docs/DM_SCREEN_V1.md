# 地下城主帷幕 V1

獨立入口是 `dm-screen.html`。這是一個純前端、本機優先的地下城主工作板，不會讀寫角色存檔，也不會自動擲骰、扣除資源、套用狀態或結算戰鬥。

## 功能範圍

- 2024 與 2014 規則版本各自保有分頁、面板與備份。
- 分頁可新增、切換、重新命名與刪除；至少保留一個分頁。
- 面板可新增、改名、刪除、上移與下移，不依賴拖放操作。
- 筆記只以純文字保存，動態畫面內容一律透過 `textContent` 或表單欄位輸出。
- 先攻完全手動：新增、編輯、排序、選取目前行動者、前進回合與輪數、移除項目。
- 法術與生物速查只在執行時讀取專案內的 canonical 資料，不另建規則資料庫。
- 匯出與匯入只由使用者明確操作；筆記不會自動送往外部服務。

## Canonical 資料來源

2024 法術使用：

- `assets/data/spells-phb-2024.js` 的 `globalThis.SPELLS_2024_TUPLES`
- `assets/data/spell-rules-2024.js` 的 `globalThis.SPELLS_2024_FULL_RULES`

2024 生物使用：

- `assets/data/creatures-5r.js` 的 `window.ZIZI_5R_CREATURES`
- `assets/data/creatures-5r-zh.js` 的 `window.ZIZI_5R_CREATURES_ZH`

2014 法術由 `assets/data/spells-phb-2014.json` 以同源 `fetch` 載入。2014 生物沒有經驗證的來源，介面會明確標示不可用，絕不改用 2024 生物資料。

本版自行實作面板互動層，研究參考已擷取的 `5r-dmscreen.html/js/css`、`upstream-dmscreen.html/js/css`，不直接複製它們的程式碼。5etools upstream 程式碼採 MIT 授權，若未來實際引入其程式碼，必須保留適當的 LICENSE／NOTICE；本 Repository 尚未確認整體授權，因此不得逕稱本專案全面採 MIT。規則文字、中文翻譯、圖片仍各自遵守來源權利，不因 upstream 程式碼授權而變成 MIT。

## 儲存與結構

頁面只使用下列兩個 `localStorage` 鍵：

- `zizi.dm-screen.v1.2024.board`
- `zizi.dm-screen.v1.2014.board`

看板 schema 版本為 `1`，根物件包含 `schemaVersion`、`edition`、`activeTabId`、`tabs`。每個分頁包含自己的面板；速查面板只保存查詢字串與 canonical 項目的穩定索引，不保存規則全文。

匯出格式是 `zizi-dm-screen-v1`，備份根物件包含 `format`、`schemaVersion`、`edition`、`exportedAt`、`board`。單一看板或備份上限為 1 MiB。

匯入流程會先完成以下檢查，再對目前版本的單一儲存鍵執行一次寫入：

1. 檔案大小與 JSON 語法。
2. 備份格式、schema 版本及規則版本一致性。
3. 所有必要欄位、型別、數量、文字長度與識別碼。
4. 拒絕 `__proto__`、`prototype`、`constructor`、非普通物件原型與循環結構。

任何檢查失敗都不會修改記憶體中的看板或原有 `localStorage` 值。若啟動時發現既有資料損壞，該規則版本會鎖定一般寫入，只允許以通過驗證的同版本備份明確取代。

## 執行與驗證

2014 法術依賴 `fetch`，因此請從專案根目錄以本機 HTTP 伺服器開啟，而不是直接使用 `file://`：

```powershell
python -m http.server 8000
```

然後瀏覽 `http://localhost:8000/dm-screen.html`。

靜態與狀態 QA：

```powershell
node --check assets/dm-screen-v1.js
node --check tests/qa-dm-screen-v1.js
node tests/qa-dm-screen-v1.js
git diff --check
```

CSS 針對 320、390、768 與 1440 像素寬度設計；所有主要控制至少 44 像素高，分頁支援方向鍵、Home、End，面板順序有鍵盤可用的上移／下移按鈕，長文字與表格則會換行或局部橫向捲動。

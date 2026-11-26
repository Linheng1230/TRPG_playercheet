# DM 帷幕：戰利品工具
- 兩種面板：尋找戰利品（CR、個別財寶／寶庫、數量、幣別骰式、寶石／藝術品件數與單價、稀有度名額、完整 D100 本機表）；隊伍戰利品（等級、人數、四階配額、本階／累積／精確比例）。以既有 board schema 儲存設定及最近結果，原有版別和備份互不干擾。
- 上游技術參考：5etools-mirror-3/5etools-src，js/lootgen/lootgen-generator-findtreasure.js、lootgen-generator-partyloot.js；MIT License (Copyright 2017 TheGiddyLimit and contributors)。獨立實作，未複製商業規則資料及上游原碼。原版 Party Loot 依 XGE major/minor 分類，本版只提供可設定的稀有度配額與比例，不聲稱還原 XGE 或 DMG 官方權重。2024 既有物品池按稀有度等機率抽取，2014 無已驗證的物品池故保留名額。
- 官方資料參考：https://www.dndbeyond.com/sources/dnd/br-2024/magic-items、https://5r.dndtools.top/lootgen.html。完整非 SRD 官方表須另有合法來源，不內建、不上傳。JSON 匯入驗版別、精確覆蓋、重疊與公式，僅暫存在瀏覽器記憶體，並不代表官方資料經過驗證。隊伍配額可手動設定，隊伍人數不乘算。精確模式向下取整是自訂設計。
- 公式僅接受 N、NdS、乘數、加減整數；限制骰數、次數和單次物品數量。主動按鈕才擲骰，無自動改角色、戰鬥、背包、雲端或正式玩家資料。
- 同步既有 DM_SCREEN_V1 backup validator，保留舊面板和舊備份向新版本相容；含新面板的備份不保證能回到舊版。
- Release：原 PR59 Draft／受保護 staging gate 不變。不得發布到公開玩家站或跳過 Cloudflare Access。新候選需重新建包與授權 Live-UAT。

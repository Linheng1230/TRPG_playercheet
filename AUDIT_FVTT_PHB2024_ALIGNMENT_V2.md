# 戲子劇坊角色卷宗 ↔ FVTT PHB2024 繁中對齊 Audit V2

> 目的：讓外部角色卷宗匯出的 JSON 能穩定映射到 FVTT 的 PHB2024 原生 Item / Advancement。
>
> 權威基準：目前實際運行中的 Foundry VTT Runtime，而不是手寫 State。
>
> - World: frozen-sick
> - D&D5e: 6.0.5
> - Pack: `dnd5e-collection-2024.phb-content`
> - Pack title: `PHB 2024｜全內容繁中`
> - Pack Items: 1271
> - 繁中覆蓋模組：`zizi-phb2024-zh-tw`

## 0. 結論摘要

### P0｜會造成 JSON → FVTT 角色不完整或規則錯誤

1. 網站法術 378，FVTT PHB2024 法術 391，**確定缺 13 個法術**。
2. 已配對法術中，至少 **15 個結構化規則欄位與 FVTT 不一致**（學派 / 專注）。
3. 網站通用專長 42，FVTT 43，**確定缺少 Weapon Master / 武器大師**。
4. 一批網站通用專長摘要仍混有舊規則，不能直接當 2024 規則資料。
5. 2024 戰鬥大師缺正式「戰技」選擇 State；FVTT 3 級需選 3 個，7/10/15 級還有新增/替換。
6. 2024 戰鬥大師「戰爭學徒」缺 **工匠工具 + 技能**兩個選擇 State。
7. 2024 冠軍 7 級「額外戰鬥風格」網站只叫玩家寫備註，沒有正式 State。
8. 2024 獵人子職業缺「狩者獵物 / 防禦戰術」正式選擇 State。
9. 多個背景、起源專長、通用專長只有效果文字，卻沒有保存 FVTT Item Advancement 所需的內部選擇。
10. 網站目前大量依賴中文名稱；**未來 JSON 綁定不得以中文名稱作唯一鍵**，必須保存 FVTT `identifier`，必要時再帶 Item ID。

### P1｜內容本身可用，但需要 alias / 結構轉換

- 職業 12 vs 12：完整，部分譯名不同。
- 子職業 48 vs 48：完整，很多譯名不同。
- 背景 16 vs 16：完整，4 個主要譯名不同；另有工具選擇 State 差異。
- 物種網站 10 vs FVTT Race Item 15：不是缺 5 個，而是網站把血統做成子選項、FVTT 拆成獨立 Race Item。
- 起源專長 10 vs 10：完整，主要是譯名不同，但部分內部選擇未保存。
- 超魔法 10 vs 10：完整，主要是譯名不同。
- 魔能祈喚 28 vs 28：數量完整，需用 identifier mapping。
- 戰鬥風格：網站 11；FVTT 戰鬥風格專長資料夾 10，但網站多出的「德魯伊戰士」其實在 FVTT 職業特性資料夾有正式 Item，非網站多收。
- 武器表網站 38：可全部對到 PHB 武器；FVTT 額外兩件 Staff 類是法器變體。
- 護甲表網站 12：FVTT 額外把盾牌做成 equipment Item；網站盾牌是獨立 boolean，非缺漏。

---

## 1. 法術

### 1.1 數量

| 環階 | 網站 | FVTT | 差 |
|---|---:|---:|---:|
| 戲法 | 34 | 34 | 0 |
| 1環 | 63 | 64 | -1 |
| 2環 | 59 | 63 | -4 |
| 3環 | 49 | 52 | -3 |
| 4環 | 39 | 41 | -2 |
| 5環 | 47 | 48 | -1 |
| 6環 | 32 | 34 | -2 |
| 7環 | 21 | 21 | 0 |
| 8環 | 18 | 18 | 0 |
| 9環 | 16 | 16 | 0 |
| **總計** | **378** | **391** | **-13** |

### 1.2 確定缺少的 13 個法術

| 環 | FVTT 繁中名稱 | identifier | FVTT Item ID |
|---:|---|---|---|
| 1 | 棘刺雹 | `hail-of-thorns` | `Tex5nbMbhvt6Myht` |
| 2 | 涅斯圖魔法靈光 | `nystuls-magic-aura` | `JxZ8YsIwjfrahS2R` |
| 2 | 馬友夫強酸箭 | `melfs-acid-arrow` | `Zqfcca7uGMTZCCFw` |
| 2 | 警戒箭陣 | `cordon-of-arrows` | `sdDS1uF0FMEpvHTg` |
| 2 | 野獸知覺 | `beast-sense` | `zS7Ekl2NKeczj5kL` |
| 3 | 李歐蒙小屋 | `leomunds-tiny-hut` | `ZM6uPtO6TsTHHvgA` |
| 3 | 閃電箭矢 | `lightning-arrow` | `aoFtH0MAEAICjj5e` |
| 3 | 十字軍斗篷 | `crusaders-mantle` | `n2GHLwUQGnICI7D4` |
| 4 | 李歐蒙秘藏箱 | `leomunds-secret-chest` | `K3KV547b2kRFamY6` |
| 4 | 硫酸法球 | `vitriolic-sphere` | `eMqyqIFwV58LJUmT` |
| 5 | 天界生物召喚術 | `summon-celestial` | `JMx0DR5xwDplQZ4s` |
| 6 | 秘法之門 | `arcane-gate` | `z3eMInZZbwZJiErB` |
| 6 | 歐提路克冰封法球 | `otilukes-freezing-sphere` | `lSDON0WsZVEKY1Md` |

### 1.3 已配對但規則欄位不一致

以下不是譯名問題，而是網站結構化資料與 FVTT 不同：

| 網站名稱 | FVTT 對應 | identifier | 差異 |
|---|---|---|---|
| 迷魂術 | 注目術 | `enthrall` | 網站非專注；FVTT 為專注 |
| 閃耀打擊 | 閃耀斬 | `shining-smite` | 網站塑能；FVTT 變化 |
| 群體治癒真言 | 群體治癒真言 | `mass-healing-word` | 網站防護；FVTT 塑能 |
| 巧言術 | 巧舌術 | `tongues` | 網站專注；FVTT 非專注 |
| 放逐打擊 | 放逐斬 | `banishing-smite` | 網站非專注；FVTT 專注 |
| 神聖結界 | 聖居 | `hallow` | 網站塑能；FVTT 防護 |
| 群體治療真言 | 群體治療傷勢 | `mass-cure-wounds` | 網站防護；FVTT 塑能 |
| 位面束縛 | 異界誓縛 | `planar-binding` | 網站防護；FVTT 咒法 |
| 應變術 | 觸發術 | `contingency` | 網站塑能；FVTT 防護 |
| 奧圖不可抗拒之舞 | 奧圖迷舞 | `ottos-irresistible-dance` | 網站非專注；FVTT 專注 |
| 靈體形態 | 跨入乙太界 | `etherealness` | 網站變化＋專注；FVTT 咒法＋非專注 |
| 獸群變形 | 動物化形 | `animal-shapes` | 網站專注；FVTT 非專注 |
| 巧言詭辯 | 花言巧語 | `glibness` | 網站變化；FVTT 惑控 |
| 傳心術 | 心靈感應 | `telepathy` | 網站專注；FVTT 非專注 |
| 群體療癒 | 群體治癒術 | `mass-heal` | 網站防護；FVTT 塑能 |

> 法術的中文譯名差異非常多。因此正式 mapping 必須使用 `identifier`，不能用中文名稱搜尋。

---

## 2. 物種 / Race

### 網站：10 個基礎物種
### FVTT：15 個 Race Item

差 5 不是缺漏，而是模型不同。

網站把下列血統放在基礎物種內：

- 精靈 → 卓爾 / 高等精靈 / 木精靈
- 侏儒 → 森林侏儒 / 岩石侏儒
- 提夫林 → 深淵 / 冥界 / 九獄

FVTT 則拆成獨立 Race Item：

- `elf-drow`
- `elf-high`
- `elf-wood`
- `gnome-forest`
- `gnome-rock`
- `tiefling-abyssal`
- `tiefling-chthonic`
- `tiefling-infernal`

### 匯入要求

JSON 不可只寫：

```json
{"species":"精靈","lineage":"卓爾"}
```

Importer 必須解析成：

```json
{"identifier":"elf-drow"}
```

### 譯名例

- 網站：歌利亞 → FVTT：哥利亞（`goliath`）

---

## 3. 背景

### 數量
- 網站 16
- FVTT 16
- 沒有缺背景

### 譯名 alias

- 衛士 → 守衛（`guard`）
- 賢者 → 學者（`sage`）
- 抄寫員 → 書記（`scribe`）
- 流浪兒 → 浪人（`wayfarer`）

### 真正的 State 差異

FVTT Background Advancement 要求玩家實際選擇：

- 工匠：1 種工匠工具（`tool:art:*`）
- 藝人：1 種樂器（`tool:music:*`）
- 士兵：1 種 Gaming Set
- 守衛：1 種 Gaming Set
- 貴族：1 種 Gaming Set

網站目前：
- 工匠、藝人只存「一種工匠工具 / 一種樂器」泛稱。
- 士兵、守衛、貴族部分被寫死成骰子組合 / 龍棋組合。

**結論：背景名稱齊全，但至少 5 個背景的工具選擇 State 需重做。**

---

## 4. 職業

- 網站 12
- FVTT 12
- 無缺漏

主要譯名：
- 聖武士 → 聖騎士（`paladin`）
- 邪術師 → 魔導師（`warlock`）

### 資料模型差異

網站常把同級多個能力合併成一句，例如：

> 戰鬥風格、回氣、武器掌握 3 種

FVTT Class Advancement 則是多個不同的 ItemGrant / Trait / ScaleValue。

因此 UI 可以保持摘要，但 JSON→FVTT 不可把摘要當一個 Item。

---

## 5. 子職業

- 網站 48
- FVTT 48
- 沒有數量缺漏

大量只是譯名不同，例如：

- 狂戰士之道 → 狂戰士之路（`berserker`）
- 世界樹之道 → 世界樹之途（`world-tree`）
- 魅音學院 → 魅力學院（`glamour`）
- 傳識學院 → 博學學院（`lore`）
- 靈能武士 → 靈能戰士（`psi-warrior`）
- 開手之道 → 散打武者（`open-hand`）
- 四象之道 → 元素武士（`elements`）
- 奧術騙徒 → 奧術詐騙師（`arcane-trickster`）
- 靈魂之刃 → 靈魂刀鋒（`soulknife`）
- 龍族血脈 → 龍族術法（`draconic`）
- 時鐘靈魂 → 機械術法（`clockwork`）
- 異怪心靈 → 異能術法（`aberrant`）

### 確定缺少的 2024 選擇型子職業資料

#### 戰鬥大師
FVTT「戰鬥卓越」Item：
- 3級：選 3 戰技
- 7級：再選 2，且可替換
- 10級：再選 2，且可替換
- 15級：再選 2，且可替換

網站 2024 沒有正式 Maneuver State；現有完整戰技 UI 是 2014 分支。

FVTT「戰爭學徒」另外要求：
- 1 種工匠工具
- 1 項指定技能

網站 2024 也尚未保存這兩項。

#### 冠軍
FVTT 7級「額外戰鬥風格」是正式 ItemChoice。
網站目前只提示「請在備註中註記」，沒有 State。

#### 獵人
FVTT：
- 3級「狩者獵物」：二選一
- 7級「防禦戰術」：二選一

網站的 hunter 選擇器目前只存在 2014 分支，2024 沒有正式 State。

> 法師 2級「學者」曾列為疑點，但已驗證網站共用 `S.expertise` + `WIZ_EXP_POOL` 有正確處理，因此不是缺漏。

---

## 6. 起源專長

- 網站 10
- FVTT 10
- 無缺漏

alias：
- 匠人 → 工匠（`crafter`）
- 治療者 → 醫者（`healer`）
- 法術新手 → 魔法啟蒙（`magic-initiate`）
- 蠻力攻擊者 → 野蠻攻擊者（`savage-attacker`）
- 多才多藝 → 技藝嫻熟（`skilled`）
- 堅韌 → 強韌（`tough`）

### 內部選擇 State 缺口

FVTT Item Advancement 要求：

- 工匠 / Crafter：選 3 種工匠工具
- 技藝嫻熟 / Skilled：選 3 項技能或工具
- 樂師 / Musician：選 3 種樂器

網站目前只有規則摘要，沒有完整保存這些選項。

Magic Initiate 的法術選擇則已有網站專門流程，屬於已實作項。

---

## 7. 通用專長

### 數量
- 網站 42
- FVTT 43

### 確定缺漏
- **武器大師 / Weapon Master**
  - identifier: `weapon-master`
  - FVTT Item: `BMW81iaEizQ9Jh8w`
  - 2024 效果核心是取得 1 種熟練武器的 Mastery 使用權，而不是舊版的額外武器熟練。

### 已確認內容仍混入舊規則／摘要錯誤

以下至少需要以 FVTT 2024 規則重寫：

- 巨武器大師 / Great Weapon Master
- 耐久 / Durable
- 重甲大師 / Heavy Armor Master
- 戰鬥施法者 / War Caster
- 弩術專家 / Crossbow Expert
- 雙武器高手 / Dual Wielder
- 擒抱高手 / Grappler
- 法術狙擊手 / Spell Sniper
- 法師殺手 / Mage Slayer
- 盾牌大師 / Shield Master
- 衝鋒者 / Charger
- 騎乘戰鬥者 / Mounted Combatant（至少屬性選項摘要不完整）

這份清單是「已確認」，不是所有可能有差異的專長上限。

### 內部選擇 State 缺口

FVTT 下列專長自身帶 Advancement，網站目前部分沒有保存完整選擇：

- 元素專精 / Elemental Adept：傷害類型
- 技能專家 / Skill Expert：技能熟練 + 專精
- 敏銳心智 / Keen Mind：指定知識技能升級
- 觀察者 / Observant：洞悉 / 調查 / 察覺其中一項升級
- 儀式施法者 / Ritual Caster：
  - 初始選 2 個一環儀式
  - **5 / 9 / 13 / 17 級各再選 1 個儀式**
- 武器大師 / Weapon Master：武器 Mastery 選擇（新增專長時必須一併保存）

Resilient 的屬性選擇目前網站已有對應 State，可保留。

Fey Touched / Shadow Touched 的法術選擇目前網站已有獨立法術流程，可保留，但 mapping 仍應改用 identifier。

---

## 8. 超魔法 / 魔能祈喚 / 戰鬥風格

### 超魔法
- 網站 10
- FVTT 10
- 數量完整
- 主要是譯名差異，例如「謹慎法術」→「謹慎超魔法」

### 魔能祈喚
- 網站 28
- FVTT 28
- 數量完整
- 中文名稱不可當唯一鍵，應 mapping 到每個 FVTT identifier。

### 戰鬥風格
- 網站 11
- FVTT「戰鬥風格專長」資料夾 10

網站多出的「德魯伊戰士」不是錯誤：
- FVTT 也存在正式 Item
- identifier: `druidic-warrior`
- Item ID: `PJzu0N9CcabFx9HT`
- 只是 FVTT 把它放在「職業特性」而非「戰鬥風格專長」資料夾。

譯名例：
- 射術 → 箭術
- 護衛 → 保護

---

## 9. 武器

網站 38 把 PHB 武器都可找到 FVTT 對應。

主要 alias：
- 巨棒 → 大棒
- 釘頭錘 → 錘矛
- 木杖 → 長棍（`quarterstaff`）
- 長柄斧 → 長柄刀
- 巨錘 → 大錘
- 晨星 → 流星錘
- 長槍 → 長矛
- 鞭 → 長鞭

FVTT 額外：
- 法杖（`staff`）
- 木製長棍（`wooden-staff`）

這兩個是可作為 Quarterstaff 使用的施法法器變體，不是 PHB 武器表缺漏。不要硬加入網站武器表；Importer 應依裝備/法器選擇映射。

---

## 10. 護甲

網站 12 件護甲本體完整。

alias：
- 襯墊甲 → 棉甲
- 鍊甲衫 → 鎖子襯衫
- 鍊甲 → 鎖子甲
- 全身板甲 → 板甲

FVTT 額外的「盾牌」屬於 equipment Item；網站使用獨立 `shield` 狀態，因此不是缺漏。

---

## 11. 正式對齊原則

### 禁止
- 用中文名稱做唯一 mapping。
- 用「網站一段職業摘要」直接生成一個 FVTT Item。
- 只保存專長名稱、不保存專長內部選擇。
- 只保存「精靈」而不保存精靈血統。

### 必須
每個可生成 FVTT Item 的網站選項，最終至少要有：

```json
{
  "siteKey": "stable-internal-key",
  "fvttIdentifier": "stable-fvtt-identifier",
  "fvttItemId": "optional-runtime-cache",
  "displayName": "網站顯示用繁中"
}
```

優先順序：

1. `fvttIdentifier`
2. 經驗證的固定 Item ID / UUID
3. alias table
4. 中文名稱只能做最後 fallback，不能作 SoT

---

## 12. 目前產出的機器資料

- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-phb2024-index.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-phb2024-folders.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\site-phb2024-data.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-spells-full.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\site-spells-full.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\spell-alignment-final.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-class-advancement.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-background-advancement.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-choice-bearing-feats.json`
- `D:\Tools\zizi-ai-runtime\trpg-playercheet-qa\fvtt-feat-choice-details.json`

---

## 13. 下一施工順序

1. P0-Spell：補 13 法術，修 15 結構欄位。
2. P0-Feat：補 Weapon Master，重寫已確認的舊規則專長摘要。
3. P0-Choice State：Battle Master / Champion / Hunter / Background tool choices / Crafter / Skilled / Musician / Elemental Adept / Skill Expert / Keen Mind / Observant / Ritual Caster。
4. 建立 `fvtt-phb2024-map.json`，全部使用 identifier 綁定。
5. JSON schema 升版，保存 Item choices。
6. 最後才做 FVTT Importer round-trip：
   - 網站角色 → JSON → FVTT Actor
   - 回讀 Actor Items
   - 驗證 identifier parity
   - 同一 JSON 重匯不得重複 Item。

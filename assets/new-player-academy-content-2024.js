/* D&D 5R / PHB2024｜完全新手創角教學資料
 * Owner：10 新手創角教學。2024 限定；不得修改既有 Creator、S state、存檔或 canonical 規則。
 * Contract：docs/NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md v1。
 * lesson.* 為正式導航 ID，topic.* 是章節內段落 ID，不是 Creator route。
 * 30 唯一擁有 AcademyBridge；此檔只是 UI 可消費的唯讀教學資料。
 */
(function (root) {
  "use strict";
  const content = {
  "schemaVersion": 1,
  "bridgeContractVersion": 1,
  "locale": "zh-TW",
  "ruleset": "2024",
  "edition": "D&D 5R / PHB 2024",
  "kind": "educational-content",
  "sourceOfTruth": "既有 pinned 5RTools／網站 Creator；本模組只有編輯性教學，不是規則或角色 State 資料庫。",
  "integrationNote": "依 docs/NEW_PLAYER_ACADEMY_ARCHITECTURE_20261116.md v1：lesson.* 為可返回的學習步驟；topic.* 僅是同章教學段落，不作返回路由；nextAction.creatorStepId 必須由 30 的唯一 AcademyBridge 驗證後映射。無 Bridge 時不自行操作 Creator、角色 State、localStorage 或切換 2014 規則。",
  "creatorStepIds": [
    "creator.class",
    "creator.origin",
    "creator.abilities",
    "creator.skills",
    "creator.details",
    "creator.level",
    "creator.spells",
    "creator.sheet",
    "reference.rules",
    "reference.spells",
    "reference.shop",
    "reference.characters",
    "reference.adventures"
  ],
  "creationOrder": [
    "creator.class",
    "creator.origin",
    "creator.abilities",
    "creator.skills",
    "creator.details",
    "creator.spells",
    "creator.sheet"
  ],
  "lessonOrder": [
    "lesson.welcome",
    "lesson.class",
    "lesson.abilities",
    "lesson.checks",
    "lesson.origin",
    "lesson.details",
    "lesson.turn",
    "lesson.spells",
    "lesson.sheet",
    "lesson.next"
  ],
  "lessons": [
    {
      "id": "lesson.welcome",
      "academyStepId": "lesson.welcome",
      "title": "第一次玩 D&D",
      "summary": "由玩家決定角色想做什麼，DM 描述世界並裁定結果。可以先看教學，也可以直接創角。",
      "example": "DM 說門後傳來腳步聲；你可以決定偵查、交談或先躲起來。",
      "topicIds": [
        "topic.welcome",
        "topic.roles",
        "topic.creating-order"
      ],
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "前往職業選擇開始創角"
      }
    },
    {
      "id": "lesson.class",
      "academyStepId": "lesson.class",
      "title": "選擇你的職業",
      "summary": "12 種職業代表不同玩法，先挑選想玩的方式。2024 全職業都在 3 級選子職業。",
      "example": "戰士偏向武器戰鬥；法師透過法術解決問題。兩者沒有絕對強弱。",
      "topicIds": [
        "topic.class.overview",
        "topic.class.subclasses"
      ],
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "查看並親自確認職業"
      }
    },
    {
      "id": "lesson.abilities",
      "academyStepId": "lesson.abilities",
      "title": "六屬性與調整值",
      "summary": "力量、敏捷、體質、智力、感知、魅力代表不同能力。檢定常用屬性調整值，不是直接加屬性分數。",
      "example": "力量 16 的調整值是 +3；安排屬性時還要考慮背景允許的加值。",
      "topicIds": [
        "topic.abilities.six",
        "topic.abilities.modifier",
        "topic.abilities.standard-array"
      ],
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "前往屬性分配"
      }
    },
    {
      "id": "lesson.checks",
      "academyStepId": "lesson.checks",
      "title": "擲骰、技能與豁免",
      "summary": "d20 檢定通常是擲 d20、加適用的能力調整值，符合熟練條件時再加熟練加值，並比對 DC。",
      "example": "DM 要求 DC 12 的運動檢定；你擲 11 加上力量 +2，得到 13。",
      "topicIds": [
        "topic.check.d20",
        "topic.check.proficiency",
        "topic.check.skills",
        "topic.check.saves"
      ],
      "nextAction": {
        "creatorStepId": "creator.skills",
        "mode": "inspect",
        "label": "查看角色擅長哪些技能"
      }
    },
    {
      "id": "lesson.origin",
      "academyStepId": "lesson.origin",
      "title": "背景與物種",
      "summary": "2024 背景決定可以加值的屬性及起源專長等，物種提供特質而不給創角屬性加值。",
      "example": "你可以選矮人法師；只要依背景規定分配屬性加值即可。",
      "topicIds": [
        "topic.origin.background",
        "topic.origin.background-asi",
        "topic.origin.origin-feat",
        "topic.origin.species",
        "topic.origin.languages"
      ],
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "查看並確認背景與物種"
      }
    },
    {
      "id": "lesson.details",
      "academyStepId": "lesson.details",
      "title": "角色與裝備細節",
      "summary": "為角色取名、選語言、填寫個性；職業與背景的起始裝備選項也需要確認。",
      "example": "護衛可以有自己的名字、價值觀和旅行動機；裝備包不要重複領取。",
      "topicIds": [
        "topic.equipment.start",
        "topic.sheet.identity"
      ],
      "nextAction": {
        "creatorStepId": "creator.details",
        "mode": "inspect",
        "label": "前往角色詳情並檢查裝備"
      }
    },
    {
      "id": "lesson.turn",
      "academyStepId": "lesson.turn",
      "title": "一個戰鬥回合能做什麼？",
      "summary": "你可以描述移動與行動；是否能使用附贈動作或反應，依實際能力與規則決定。",
      "example": "戰士移動到敵人身前，使用動作揮劍；其他能力則依時機決定。",
      "topicIds": [
        "topic.sheet.turn"
      ],
      "nextAction": {
        "creatorStepId": "reference.rules",
        "mode": "inspect",
        "label": "前往規則速查理解動作"
      }
    },
    {
      "id": "lesson.spells",
      "academyStepId": "lesson.spells",
      "title": "戲法、法術位與專注",
      "summary": "戲法通常不消耗法術位；其他法術可能消耗法術位。有的要求命中，有的要求目標豁免，專注效果通常不能同時維持兩個。",
      "example": "你先施放一個需要專注的法術，再施放另一個需要專注的法術，前者會結束。",
      "topicIds": [
        "topic.spells.basics",
        "topic.spells.slots",
        "topic.spells.attacks",
        "topic.spells.concentration"
      ],
      "nextAction": {
        "creatorStepId": "creator.spells",
        "mode": "inspect",
        "label": "檢查法術選擇與法術位"
      }
    },
    {
      "id": "lesson.sheet",
      "academyStepId": "lesson.sheet",
      "title": "認識自己的角色卡",
      "summary": "看懂生命值 HP、護甲等級 AC、技能、攻擊與法術資訊，就能較容易開始冒險。",
      "example": "DM 問攻擊是否命中時，你可以從角色卡找到 AC。",
      "topicIds": [
        "topic.sheet.overview"
      ],
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "前往角色卡找到必要數值"
      }
    },
    {
      "id": "lesson.next",
      "academyStepId": "lesson.next",
      "title": "完成創角並開始冒險",
      "summary": "確認背景、物種、屬性、技能、語言、裝備、法術及個人細節都處理好，再沿用原站輸出功能。",
      "example": "你把完整角色卡交給 DM，說：「我想先調查入口附近的足跡。」",
      "topicIds": [
        "topic.review",
        "topic.start-playing"
      ],
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "回到角色卡完成最後核對"
      }
    }
  ],
  "topics": [
    {
      "id": "topic.welcome",
      "category": "getting-started",
      "title": "D&D 是什麼？",
      "summary": "D&D 是大家一起創作故事的桌上角色扮演遊戲。玩家描述想做的事，擲骰決定有風險的結果。",
      "example": "DM 說：「門後傳來腳步聲。」你可以選擇開門、躲藏，或先和同伴商量。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "選擇 D&D 2024（5R）規則"
      },
      "academyStepId": "lesson.welcome"
    },
    {
      "id": "topic.roles",
      "category": "getting-started",
      "title": "玩家、角色與 DM",
      "summary": "玩家各自扮演一名冒險者；DM（地下城主）描述世界、扮演其他人物，並依規則裁定結果。",
      "example": "你說：「我想和守衛談談。」DM 回答守衛的態度，必要時要求一次檢定。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "先決定你想扮演哪一類冒險者"
      },
      "academyStepId": "lesson.welcome"
    },
    {
      "id": "topic.creating-order",
      "category": "getting-started",
      "title": "2024 創角從哪裡開始？",
      "summary": "2024 建角建議先選職業，再決定出身（背景、物種與語言），接著安排屬性、陣營與角色細節。網站可以分頁操作，但最後要逐項確認。",
      "example": "先決定想當戰士，再選士兵背景與精靈物種；背景會影響可以提高哪些屬性。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "先前往職業選擇"
      },
      "academyStepId": "lesson.welcome"
    },
    {
      "id": "topic.class.overview",
      "category": "class",
      "title": "12 種職業怎麼選？",
      "summary": "職業決定你最常用的本領，例如武器攻擊、魔法、潛行或支援。先選喜歡的玩法，不必背熟所有特性。",
      "example": "想站在前排、用武器保護同伴，可以先看戰士；想用法術解決問題，可以先看法師。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "查看 12 職業並挑一個"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "topic.class.subclasses",
      "category": "class",
      "title": "子職業要現在選嗎？",
      "summary": "2024 玩家手冊的 12 職業都在 3 級選子職業。1 級先選職業，喜歡的子職業可以先當未來方向。",
      "example": "你想當擅長幻術的法師，現在先建立 1 級法師，不會立刻拿到 3 級子職業能力。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "確認 1 級職業與職業提供的選項"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "topic.origin.background",
      "category": "origin",
      "title": "背景是冒險前的經歷",
      "summary": "背景不只是故事：2024 背景也決定可調整的屬性、起源專長、技能與工具熟練。實際效果以網站現有背景資料為準。",
      "example": "士兵曾受軍事訓練；嚮導則擅長荒野生活。選背景時也要看它是否有你想提高的屬性。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇背景並查看完整效果"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "topic.origin.background-asi",
      "category": "origin",
      "title": "2024 的屬性加值來自背景",
      "summary": "每個背景指定三項可提升的屬性；從中選一項 +2、另一項 +1，或三項各 +1。不能同一項 +3，提升後最高為 20。",
      "example": "士兵背景可選力量、敏捷、體質。力量 15 +2 變 17；體質 14 +1 變 15。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "先選相容背景，再分配並確認屬性加值"
      },
      "criticalRule": "background-asi-2024",
      "academyStepId": "lesson.origin"
    },
    {
      "id": "topic.origin.origin-feat",
      "category": "origin",
      "title": "什麼是起源專長？",
      "summary": "2024 背景會提供一個起源專長。它是角色一開始的額外能力，不必把它誤認成高等級才選的通用專長。",
      "example": "農夫背景提供的起源專長可從背景頁檢查；請點開規則小卡確認實際效果。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "檢查背景附帶的起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "topic.origin.species",
      "category": "origin",
      "title": "物種和職業有何不同？",
      "summary": "物種描述冒險者的族裔與天生特質。2024 物種不再提供創角屬性加值；屬性加值依背景處理。",
      "example": "你可以是矮人法師、精靈戰士或人類德魯伊，不必為了能力加值被迫選某個物種。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇物種並確認特質分支"
      },
      "criticalRule": "species-no-asi-2024",
      "academyStepId": "lesson.origin"
    },
    {
      "id": "topic.origin.languages",
      "category": "origin",
      "title": "語言需要選什麼？",
      "summary": "語言代表角色能溝通的文字與口語。依網站創角選項完成已知語言；有需要選擇的項目不能漏掉。",
      "example": "你想和不同城鎮的人交談，先看有哪些語言選項，再完成網站要求的選擇。",
      "nextAction": {
        "creatorStepId": "creator.details",
        "mode": "inspect",
        "label": "完成語言選項並確認可繼續"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "topic.abilities.six",
      "category": "ability",
      "title": "六種屬性代表什麼？",
      "summary": "力量看蠻力，敏捷看反應，體質看耐力，智力看知識，感知看觀察，魅力看表達與影響力。",
      "example": "舉石頭可能考驗力量；發現暗門可能考驗感知；說服守衛可能考驗魅力。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "先看職業主要屬性，再分配六項屬性"
      },
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "topic.abilities.modifier",
      "category": "ability",
      "title": "屬性值和調整值不同",
      "summary": "擲骰時常用的是屬性調整值，算法是向下取整的（屬性值 −10）÷2，不是直接把屬性值加到骰子上。",
      "example": "力量 8 的調整值是 −1；力量 15 是 +2；力量 17 是 +3。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "確認分配後的屬性調整值"
      },
      "criticalRule": "modifier-formula",
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "topic.abilities.standard-array",
      "category": "ability",
      "title": "第一次建角怎麼配屬性？",
      "summary": "新手可以用標準陣列 15、14、13、12、10、8，各放進一種屬性，再依背景規則加值。不要把背景加值算兩次。",
      "example": "想玩戰士，可先把 15 放力量、14 放體質，再依所選背景合法加值。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "使用標準陣列並分配六項分數"
      },
      "criticalRule": "standard-array",
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "topic.check.d20",
      "category": "d20",
      "title": "d20 檢定怎麼看？",
      "summary": "DM 覺得行動有風險且結果不確定時，可能要求擲 20 面骰（d20）加上適用的調整值，與難度等級 DC 比較。",
      "example": "DM 說攀牆 DC 12；你擲出 11，再加力量調整值 +2，總共 13，這次達標。",
      "nextAction": {
        "creatorStepId": "creator.skills",
        "mode": "inspect",
        "label": "查看角色有哪些可用的技能檢定"
      },
      "academyStepId": "lesson.checks"
    },
    {
      "id": "topic.check.proficiency",
      "category": "d20",
      "title": "熟練加值何時會加入？",
      "summary": "角色擅長且具有熟練的技能、豁免或其他項目，才依該檢定規則加熟練加值。1 級角色的熟練加值是 +2。",
      "example": "1 級角色感知 +2，且熟練察覺，擲察覺檢定通常是 d20 +2 +2。",
      "nextAction": {
        "creatorStepId": "creator.skills",
        "mode": "inspect",
        "label": "檢查職業與背景給的技能熟練"
      },
      "criticalRule": "proficiency-lv1",
      "academyStepId": "lesson.checks"
    },
    {
      "id": "topic.check.skills",
      "category": "d20",
      "title": "技能檢定不是另一種屬性",
      "summary": "技能描述你運用屬性的方式，例如察覺通常用感知、隱匿通常用敏捷。是否能加熟練，要看角色是否熟練該技能。",
      "example": "想聽出門外的腳步聲，DM 可能要求感知（察覺）檢定；熟練察覺才能再加熟練加值。",
      "nextAction": {
        "creatorStepId": "creator.skills",
        "mode": "inspect",
        "label": "選好職業技能並檢查背景技能"
      },
      "academyStepId": "lesson.checks"
    },
    {
      "id": "topic.check.saves",
      "category": "d20",
      "title": "豁免和技能檢定差在哪？",
      "summary": "豁免通常是在抵抗危險、法術或其他影響；技能檢定通常是主動嘗試做一件事。各職業的熟練豁免種類不同。",
      "example": "遇到毒霧，DM 可能要求體質豁免；你只在具有體質豁免熟練時加入熟練加值。",
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "在角色卡確認豁免熟練標記"
      },
      "academyStepId": "lesson.checks"
    },
    {
      "id": "topic.equipment.start",
      "category": "equipment",
      "title": "起始裝備要選兩邊",
      "summary": "2024 職業和背景各自提供起始裝備或金錢的方案。依現有創角頁面完成兩邊選擇，不要把金錢方案又算成免費裝備。",
      "example": "戰士選了職業的裝備包，還需要確認背景提供的裝備或金錢方案。",
      "nextAction": {
        "creatorStepId": "creator.details",
        "mode": "inspect",
        "label": "完成職業與背景的起始裝備選擇"
      },
      "academyStepId": "lesson.details"
    },
    {
      "id": "topic.spells.basics",
      "category": "spell",
      "title": "戲法和有環位的法術",
      "summary": "不是每個職業都會施法。戲法通常不消耗法術位；一環以上法術通常需要合適的法術位，但要依個別能力與法術規則判斷。",
      "example": "法師可以反覆施放自己學會的戲法；施放一般的一環法術通常會使用一個足夠環級的法術位。",
      "nextAction": {
        "creatorStepId": "creator.spells",
        "mode": "inspect",
        "label": "查看職業有沒有施法與戲法選擇"
      },
      "academyStepId": "lesson.spells"
    },
    {
      "id": "topic.spells.slots",
      "category": "spell",
      "title": "法術位不是法術清單",
      "summary": "會施法不等於能無限施放一環以上法術。已準備或已知法術是可選項，法術位是施放時可消耗的資源；各職業恢復方式可能不同。",
      "example": "已準備「治療傷勢」不代表每天只能施放一次；能否再施放還要看剩餘法術位等條件。",
      "nextAction": {
        "creatorStepId": "creator.spells",
        "mode": "inspect",
        "label": "核對已知／已準備法術與法術位"
      },
      "criticalRule": "slots-not-spells",
      "academyStepId": "lesson.spells"
    },
    {
      "id": "topic.spells.attacks",
      "category": "spell",
      "title": "法術攻擊與法術豁免",
      "summary": "法術效果分不同類型：有的要施法者擲攻擊命中，有的要目標做豁免，有的不用擲這兩種。詳細依該法術說明。",
      "example": "命中型法術通常是 d20 + 熟練加值 + 施法屬性調整值；要求豁免的法術則看法術豁免 DC。",
      "nextAction": {
        "creatorStepId": "creator.spells",
        "mode": "inspect",
        "label": "確認施法屬性、攻擊命中與豁免 DC"
      },
      "academyStepId": "lesson.spells"
    },
    {
      "id": "topic.spells.concentration",
      "category": "spell",
      "title": "專注不是永久開著的效果",
      "summary": "有些法術標示「專注」。通常同一時間只能維持一個專注效果；受傷可能需要做體質豁免才能維持。",
      "example": "你正在專注一個法術，又施放另一個需要專注的法術，原先的專注就會結束。",
      "nextAction": {
        "creatorStepId": "creator.spells",
        "mode": "inspect",
        "label": "閱讀選中法術的專注標示"
      },
      "criticalRule": "one-concentration",
      "academyStepId": "lesson.spells"
    },
    {
      "id": "topic.sheet.overview",
      "category": "sheet",
      "title": "角色卡上先看哪裡？",
      "summary": "先找到生命值、護甲等級 AC、移動速度、職業特性、技能與武器；施法角色再留意施法屬性、法術位和專注。",
      "example": "DM 問「敵人對你擲出 15 命中嗎？」先查看角色卡上的 AC，再依攻擊規則判斷。",
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "開啟角色卡總覽並找到常用數值"
      },
      "academyStepId": "lesson.sheet"
    },
    {
      "id": "topic.sheet.identity",
      "category": "sheet",
      "title": "姓名、陣營與角色個性",
      "summary": "最後替角色取名，並設定陣營、外貌與個性等細節。陣營幫助描述價值觀，不會取代玩家的具體選擇。",
      "example": "你可以扮演一名善良但常質疑命令的護衛，並在遇到抉擇時說明角色的理由。",
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "填寫角色姓名、陣營與個人細節"
      },
      "academyStepId": "lesson.details"
    },
    {
      "id": "topic.sheet.turn",
      "category": "sheet",
      "title": "我的回合可以做什麼？",
      "summary": "跑團時由你說出角色要做的事。戰鬥回合常會用到移動、動作、附贈動作及反應；能做的事依角色特性與規則。",
      "example": "戰士可以移動到門口並使用動作攻擊；若有可用的附贈動作能力，再決定是否使用。",
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "查看角色卡的常用動作與能力"
      },
      "academyStepId": "lesson.turn"
    },
    {
      "id": "topic.review",
      "category": "finish",
      "title": "創角完成前最後核對",
      "summary": "確認規則版本、職業、背景、物種與分支、語言、屬性、技能、裝備、陣營及法術選項（如適用）均已完成，再檢查角色卡。",
      "example": "角色卡若缺少語言或仍有未選的法術，先返回對應步驟處理，再輸出角色資料。",
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "進行創角完成檢查與匯出"
      },
      "academyStepId": "lesson.next"
    },
    {
      "id": "topic.start-playing",
      "category": "finish",
      "title": "建好角色後的第一件事",
      "summary": "把角色卡交給 DM，簡單介紹角色最擅長的事。遇到不會的規則先描述意圖，再由 DM 協助判斷是否需要擲骰。",
      "example": "你說：「我想從窗戶爬進去看看。」DM 可能請你做運動檢定，也可能直接描述結果。",
      "nextAction": {
        "creatorStepId": "creator.sheet",
        "mode": "inspect",
        "label": "帶著角色卡開始第一場冒險"
      },
      "academyStepId": "lesson.next"
    }
  ],
  "classes": [
    {
      "id": "class.barbarian",
      "catalogName": "野蠻人",
      "title": "野蠻人 Barbarian",
      "summary": "適合喜歡衝鋒、近身戰鬥與承受攻擊的人。",
      "example": "你衝到巨怪面前，讓同伴有時間撤退。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「野蠻人」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.bard",
      "catalogName": "吟遊詩人",
      "title": "吟遊詩人 Bard",
      "summary": "用魔法、談話與表演支援隊伍，適合喜歡臨場發揮的人。",
      "example": "隊友緊張時，你用鼓舞與機智幫大家爭取機會。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「吟遊詩人」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.cleric",
      "catalogName": "牧師",
      "title": "牧師 Cleric",
      "summary": "以神聖力量保護、支援或打擊敵人，不只是補師。",
      "example": "同伴倒下後，你選擇先救援，再一起應對敵人。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「牧師」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.druid",
      "catalogName": "德魯伊",
      "title": "德魯伊 Druid",
      "summary": "擅長自然魔法，日後也能運用野獸形態。",
      "example": "你用自然知識找安全路線，再用法術協助隊伍。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「德魯伊」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.fighter",
      "catalogName": "戰士",
      "title": "戰士 Fighter",
      "summary": "擅長武器與防護，玩法直覺，也有很多戰術選擇。",
      "example": "怪物靠近時，你拿起盾牌守住狹窄的通道。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「戰士」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.monk",
      "catalogName": "武僧",
      "title": "武僧 Monk",
      "summary": "擅長靈活移動與徒手或武器格鬥。",
      "example": "你繞過前排敵人，迅速接近後方威脅。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「武僧」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.paladin",
      "catalogName": "聖武士",
      "title": "聖武士 Paladin",
      "summary": "擅長前線戰鬥與神聖能力，通常重視信念與守護。",
      "example": "你守在傷者面前，準備用武器與神聖力量應戰。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「聖武士」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.ranger",
      "catalogName": "遊俠",
      "title": "遊俠 Ranger",
      "summary": "結合武器、荒野技能與自然法術，適合喜歡探索的人。",
      "example": "你發現森林裡的足跡，帶隊避開危險。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「遊俠」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.rogue",
      "catalogName": "遊蕩者",
      "title": "遊蕩者 Rogue",
      "summary": "擅長靈巧、潛行與找出敵人的破綻。",
      "example": "你先偵查走廊，再找時機精準出手。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「遊蕩者」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.sorcerer",
      "catalogName": "術士",
      "title": "術士 Sorcerer",
      "summary": "擁有與生俱來的魔力，適合喜歡集中使用魔法的人。",
      "example": "危急時，你施展法術改變局勢。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「術士」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.warlock",
      "catalogName": "邪術師",
      "title": "契術師 Warlock",
      "summary": "透過超凡契約獲得特殊魔法，資源管理方式獨特。",
      "example": "你與神祕存在交易力量，以魔法面對危機。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「邪術師」"
      },
      "academyStepId": "lesson.class"
    },
    {
      "id": "class.wizard",
      "catalogName": "法師",
      "title": "法師 Wizard",
      "summary": "以研究和法術書累積各式魔法，適合喜歡事先規劃的人。",
      "example": "你調查石碑，再從準備好的法術中選擇解法。",
      "nextAction": {
        "creatorStepId": "creator.class",
        "mode": "inspect",
        "label": "在創角頁選擇並確認「法師」"
      },
      "academyStepId": "lesson.class"
    }
  ],
  "backgrounds": [
    {
      "id": "background.acolyte",
      "catalogName": "侍僧",
      "title": "侍僧",
      "summary": "曾在宗教場所生活與服務。",
      "example": "你熟悉神殿禮儀，想找回失落聖物。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「侍僧」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.artisan",
      "catalogName": "工匠",
      "title": "工匠",
      "summary": "曾靠製作物品與手藝謀生。",
      "example": "你想尋找傳說中的古代工法。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「工匠」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.charlatan",
      "catalogName": "江湖騙子",
      "title": "江湖騙子",
      "summary": "曾靠機智與假身分過日子。",
      "example": "你認得市集常見的騙局。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「江湖騙子」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.criminal",
      "catalogName": "罪犯",
      "title": "罪犯",
      "summary": "曾生活在法律之外。",
      "example": "你知道黑市入口可能在哪。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「罪犯」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.entertainer",
      "catalogName": "藝人",
      "title": "藝人",
      "summary": "曾以表演與演藝維生。",
      "example": "你想把冒險寫成一首歌。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「藝人」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.farmer",
      "catalogName": "農夫",
      "title": "農夫",
      "summary": "熟悉田地與農村勞作。",
      "example": "你分辨出這片農田最近沒人照顧。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「農夫」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.guard",
      "catalogName": "衛士",
      "title": "衛士",
      "summary": "曾負責看守與巡邏。",
      "example": "你察覺城門守衛的巡邏空檔。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「衛士」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.guide",
      "catalogName": "嚮導",
      "title": "嚮導",
      "summary": "長期為旅人帶路或在野外求生。",
      "example": "你在荒野中找到可避雨的路線。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「嚮導」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.hermit",
      "catalogName": "隱士",
      "title": "隱士",
      "summary": "曾長時間獨居與靜思。",
      "example": "你在修行時遇見古老傳說。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「隱士」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.merchant",
      "catalogName": "商人",
      "title": "商人",
      "summary": "熟悉交易、運送與人情往來。",
      "example": "你能看出這筆貨運價格有異。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「商人」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.noble",
      "catalogName": "貴族",
      "title": "貴族",
      "summary": "成長於權勢家庭或上流社會。",
      "example": "你認識某個宮廷家族的標誌。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「貴族」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.sage",
      "catalogName": "賢者",
      "title": "賢者",
      "summary": "曾投入研究與學習。",
      "example": "你想查明書庫中的古文字。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「賢者」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.sailor",
      "catalogName": "水手",
      "title": "水手",
      "summary": "曾在船上工作並穿越海域。",
      "example": "你一看海圖便察覺航線不對勁。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「水手」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.scribe",
      "catalogName": "抄寫員",
      "title": "抄寫員",
      "summary": "曾謄寫、整理或保存文件。",
      "example": "你注意到契約上的筆跡不同。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「抄寫員」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.soldier",
      "catalogName": "士兵",
      "title": "士兵",
      "summary": "曾接受軍事訓練或從軍。",
      "example": "你能辨認軍旗與行軍陣形。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「士兵」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "background.wayfarer",
      "catalogName": "流浪兒",
      "title": "流浪兒",
      "summary": "曾依靠自己在街頭或旅途中生活。",
      "example": "你知道怎麼在陌生城市尋找庇護。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「流浪兒」並查看屬性、熟練與起源專長"
      },
      "academyStepId": "lesson.origin"
    }
  ],
  "species": [
    {
      "id": "species.human",
      "catalogName": "人類",
      "title": "人類",
      "summary": "具有多樣出身與生活方式。",
      "example": "你是一位好奇心旺盛的人類冒險者。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「人類」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.elf",
      "catalogName": "精靈",
      "title": "精靈",
      "summary": "常見於充滿魔法與悠久歷史的故事。",
      "example": "你想探索精靈家族的古老傳說。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「精靈」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.dwarf",
      "catalogName": "矮人",
      "title": "矮人",
      "summary": "可以來自山城、工坊或任何地方。",
      "example": "你帶著家族鑄造的紀念物上路。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「矮人」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.halfling",
      "catalogName": "半身人",
      "title": "半身人",
      "summary": "體型小巧，也能成為勇敢的冒險者。",
      "example": "你離開熟悉家園去看更大的世界。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「半身人」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.aasimar",
      "catalogName": "阿斯莫",
      "title": "阿斯莫",
      "summary": "身上帶有天界力量的故事線索。",
      "example": "你想弄懂童年曾出現的神祕光芒。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「阿斯莫」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.dragonborn",
      "catalogName": "龍裔",
      "title": "龍裔",
      "summary": "擁有與龍有關的傳承。",
      "example": "你在尋找家族留下的龍形徽記。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「龍裔」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.gnome",
      "catalogName": "侏儒",
      "title": "侏儒",
      "summary": "可扮演充滿好奇心的探險者。",
      "example": "你想研究奇怪的機械與魔法。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「侏儒」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.goliath",
      "catalogName": "歌利亞",
      "title": "歌利亞",
      "summary": "有巨人傳承的族群。",
      "example": "你打算證明自己不只擁有力量。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「歌利亞」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.orc",
      "catalogName": "獸人",
      "title": "獸人",
      "summary": "可以來自多種文化與成長環境。",
      "example": "你想當旅行記錄員，不想只靠外表被評價。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「獸人」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    },
    {
      "id": "species.tiefling",
      "catalogName": "提夫林",
      "title": "提夫林",
      "summary": "具有異界血統，但不決定個性善惡。",
      "example": "你努力解開族人代代流傳的祕密。",
      "nextAction": {
        "creatorStepId": "creator.origin",
        "mode": "inspect",
        "label": "選擇「提夫林」並檢查可能需要的分支選項"
      },
      "academyStepId": "lesson.origin"
    }
  ],
  "abilities": [
    {
      "id": "ability.strength",
      "catalogName": "力量",
      "title": "力量",
      "summary": "力量",
      "example": "搬動重物與施展蠻力。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "檢查六屬性並依職業分配分數"
      },
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "ability.dexterity",
      "catalogName": "敏捷",
      "title": "敏捷",
      "summary": "敏捷",
      "example": "速度、平衡與靈巧反應。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "檢查六屬性並依職業分配分數"
      },
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "ability.constitution",
      "catalogName": "體質",
      "title": "體質",
      "summary": "體質",
      "example": "生命力、耐力與抗壓。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "檢查六屬性並依職業分配分數"
      },
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "ability.intelligence",
      "catalogName": "智力",
      "title": "智力",
      "summary": "智力",
      "example": "回憶知識、推理與研究。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "檢查六屬性並依職業分配分數"
      },
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "ability.wisdom",
      "catalogName": "感知",
      "title": "感知",
      "summary": "感知",
      "example": "觀察環境、直覺與洞察。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "檢查六屬性並依職業分配分數"
      },
      "academyStepId": "lesson.abilities"
    },
    {
      "id": "ability.charisma",
      "catalogName": "魅力",
      "title": "魅力",
      "summary": "魅力",
      "example": "表達自我、交涉與影響他人。",
      "nextAction": {
        "creatorStepId": "creator.abilities",
        "mode": "inspect",
        "label": "檢查六屬性並依職業分配分數"
      },
      "academyStepId": "lesson.abilities"
    }
  ],
  "finishChecklist": [
    {
      "id": "check.ruleset",
      "label": "規則選為 2024（5R）",
      "creatorStepId": "creator.class"
    },
    {
      "id": "check.class",
      "label": "職業及起始職業選項已確認",
      "creatorStepId": "creator.class"
    },
    {
      "id": "check.background",
      "label": "背景、起源專長及屬性加值已確認",
      "creatorStepId": "creator.origin"
    },
    {
      "id": "check.species",
      "label": "物種與需要的血統／分支選擇已確認",
      "creatorStepId": "creator.origin"
    },
    {
      "id": "check.languages",
      "label": "語言與其他出身選擇已完成",
      "creatorStepId": "creator.details"
    },
    {
      "id": "check.abilities",
      "label": "六屬性與調整值已檢查，背景加值只算一次",
      "creatorStepId": "creator.abilities"
    },
    {
      "id": "check.skills",
      "label": "技能與豁免熟練已檢查",
      "creatorStepId": "creator.skills"
    },
    {
      "id": "check.equipment",
      "label": "職業與背景起始裝備方案都已確認",
      "creatorStepId": "creator.details"
    },
    {
      "id": "check.spells",
      "label": "如可施法，已完成戲法、法術與資源選擇",
      "conditional": "spellcaster",
      "creatorStepId": "creator.spells"
    },
    {
      "id": "check.identity",
      "label": "姓名、陣營與角色個人細節已填寫",
      "creatorStepId": "creator.sheet"
    },
    {
      "id": "check.sheet",
      "label": "角色卡數值、生命值、AC、武器與輸出已檢查",
      "creatorStepId": "creator.sheet"
    }
  ]
};
  function freezeDeep(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(freezeDeep);
      Object.freeze(value);
    }
    return value;
  }
  freezeDeep(content);
  if (typeof module === "object" && module.exports) module.exports = content;
  if (root) root.ZIZI_NEW_PLAYER_ACADEMY_2024 = content;
})(typeof globalThis !== "undefined" ? globalThis : this);

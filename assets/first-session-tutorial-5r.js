/*
 * 第一次跑團｜D&D 5R (PHB2024) 完全新手教學資料模組
 * Only own data: no DOM, dice, character State, resource transactions, save or combat engine.
 * Canonical authority: pinned 5RTools PHB2024; ruleRef is a lookup pointer, NOT a second rules DB.
 * Current local 5RTools snapshot contains selective class/spell data but not generic rule chapters.
 * "summary"/"example" are pedagogical prompts; details are resolved by the canonical rules and DM.
 * Consumer (workstream 30) owns display/navigation; it must not treat an answer as game resolution.
 */
(function (root, build) {
  "use strict";
  const api = build();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ZIZI_FIRST_SESSION_TUTORIAL_5R = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const rule = (section, term) => ({ source: "5RTools", book: "PHB2024", section, term });
  const fields = (...names) => names;
  const topic = (id, title, summary, example, nextAction, sheetFields, section, term) =>
    ({ id, title, summary, example, nextAction, sheetFields, ruleRef: rule(section, term) });

  const topics = [
    topic("describe-and-dm", "先說想做什麼，再由 DM 裁定",
      "你不必先想好骰哪一種骰子。告訴 DM 角色想做什麼、怎麼做；DM 說明結果，必要時才要求檢定。",
      "「我想沿著地上的泥腳印，找出是誰離開了營地。」",
      "試著用一句話描述角色的意圖和方法，而不是喊出技能名稱。",
      fields("技能", "屬性調整值"), "Playing the Game", "The Flow of Play"),
    topic("d20-and-saves", "d20 檢定與豁免怎麼看",
      "不確定能否成功時，通常擲 d20，加入相關屬性調整值；適用熟練時再加熟練加值。總和達到 DC（難度等級）就成功。豁免通常是用來抵抗危險，由效果或 DM 要求。",
      "要攀上濕滑石壁，DM 可能要求力量（運動）檢定；躲開落石則可能要求敏捷豁免。",
      "在角色卡找出「運動」和「敏捷豁免」，看清楚兩者各自的加值。",
      fields("六項屬性", "技能", "豁免", "熟練加值"), "D20 Tests", "Ability Checks / Saving Throws"),
    topic("advantage", "優勢與劣勢",
      "有優勢時擲兩顆 d20 取較高，有劣勢取較低；兩者同時存在就互相抵銷。多個優勢不會疊成更多顆骰。",
      "隊友用合適方式協助、周圍環境或特性，都可能改變 DM 對檢定的判斷。",
      "先問 DM 這次是否有優勢或劣勢，再依裁定擲骰。",
      fields("檢定加值", "特性", "狀態效果"), "D20 Tests", "Advantage/Disadvantage"),
    topic("attack-ac-damage", "命中、AC 與傷害",
      "攻擊擲骰的總和達到目標 AC（護甲等級）就命中，再依武器或法術的傷害敘述處理傷害。攻擊擲出自然 20 是重擊，自然 1 則失手；傷害骰不是命中骰。",
      "你用長劍攻擊：先查「攻擊命中」加值；命中後才查看長劍的傷害骰。",
      "分別找出角色卡的 AC、武器攻擊命中與傷害欄位。",
      fields("護甲等級 AC", "武器／攻擊命中", "武器／傷害", "法術攻擊命中"), "D20 Tests", "Attack Rolls"),
    topic("initiative", "先攻：誰先行動",
      "戰鬥開始時，通常進行敏捷相關的先攻檢定，依先攻順序輪流行動；不是大家同時攻擊。",
      "DM 宣布遭遇敵人後，你查看角色卡先攻加值，等 DM 要求才擲骰。",
      "在角色卡找到「先攻」，準備告訴 DM 你的結果。",
      fields("先攻", "敏捷調整值"), "Combat", "Initiative"),
    topic("movement", "移動：看看你能走多遠",
      "每回合可以在速度允許的距離內移動；移動通常能拆在動作前後。困難地形、爬行或站起等會影響移動花費。",
      "先走到石柱旁、攻擊，再利用剩餘速度移到掩體後面（是否可行依實際位置與規則）。",
      "找出角色卡的速度，先向 DM 描述路線。",
      fields("速度", "狀態效果", "裝備"), "Combat", "Movement and Position"),
    topic("action-economy", "動作、附贈動作、反應",
      "在你的回合通常可移動、採取一個動作；只有具備相應特性、法術或規則時才能使用附贈動作。反應則在觸發條件符合時使用，使用後直到下個自己回合開始才恢復。",
      "你可以用動作攻擊；但不能因為還有附贈動作，就自動再攻擊一次。",
      "找到角色卡的主動特性，看每項標示「動作／附贈動作／反應」中的哪一種。",
      fields("特性與資源", "武器／攻擊", "法術施放時間"), "Combat", "Your Turn / Actions / Bonus Actions / Reactions"),
    topic("hp-and-death", "HP、倒下與死亡豁免",
      "HP（生命值）降到 0 時通常會陷入昏迷並開始瀕死；輪到你的回合時擲死亡豁免，10 以上為成功，累積 3 次成功會穩定、3 次失敗會死亡。自然 20 恢復 1 HP；自然 1 算 2 次失敗。治療與受傷還有其他影響，交由 DM 按規則處理。",
      "同伴倒下後，不要直接把角色刪除；查看死亡豁免區，請 DM 引導流程。",
      "找出目前／最大生命值與死亡豁免欄位。",
      fields("目前生命值", "最大生命值", "死亡豁免", "狀態效果"), "Damage and Healing", "Dropping to 0 Hit Points / Death Saving Throws"),
    topic("spell-slots", "戲法與法術位",
      "戲法通常不用花法術位；施放需消耗法術位的法術，會用掉對應環位或更高環位的可用法術位（依該法術規則）。不是所有角色都有法術位；施放時間也不一定都是動作。",
      "施放一環法術前，先確認已準備／可施放、所需環位、施法時間與目標距離。",
      "在角色卡查看法術列表、施法時間與目前法術位；這裡不會真的扣位。",
      fields("法術列表", "法術位", "施法時間", "射程", "施法能力"), "Spellcasting", "Spell Slots / Casting Time"),
    topic("concentration", "專注：同時維持的法術有限",
      "需要專注的法術會標示「專注」。通常不能同時專注兩個效果；施放另一個專注法術會結束原本的專注。專注期間受傷，通常需進行體質豁免，DC 為 10 或所受傷害的一半，取較高者。",
      "正在維持妖火時，想改施另一道專注法術，要先意識到原效果會停止。",
      "在法術卡找「專注」標示，並查看體質豁免加值。",
      fields("法術列表／專注", "體質豁免", "狀態效果"), "Spellcasting", "Concentration"),
    topic("short-rest", "短休：停下來喘口氣",
      "短休通常至少 1 小時。完成短休可依規則花費生命骰恢復 HP；只有明確寫著「短休恢復」的職業資源才會相應恢復。",
      "打完一場戰鬥後，隊伍找到安全地方休息，先跟 DM 確認能否完成短休。",
      "查看剩餘生命骰與特性的恢復敘述，別把所有法術位自動回滿。",
      fields("生命骰", "目前生命值", "職業資源", "法術位"), "Resting", "Short Rest"),
    topic("long-rest", "長休：準備下一段冒險",
      "長休通常需要 8 小時，完成時恢復全部失去的 HP 與已消耗的生命骰，並依職業和法術規則恢復相應資源。是否安全完成、被打斷如何處理，依 DM 與完整規則。",
      "冒險隊在營地輪流守夜；DM 確認長休成功完成後，才更新角色卡。",
      "查看生命值、生命骰、法術位，以及每項特性寫的恢復時機。",
      fields("目前／最大生命值", "生命骰", "法術位", "職業資源"), "Resting", "Long Rest")
  ];

  // All choices are dialogue-only feedback; no fabricated dice results or game-state deltas.
  const choice = (id, label, tone, title, body, sheetFields) => ({
    id, label, feedback: { tone, title, body, sheetFields }
  });
  const step = (id, title, prompt, sheetFields, ruleSection, ruleTerm, choices) => ({
    id, title, prompt, sheetFields, ruleRef: rule(ruleSection, ruleTerm), choices
  });

  const scenarios = [
    {
      id: "exploration", title: "探索：封住的鐘樓", icon: "search",
      intro: "你和同伴找到一座封閉鐘樓。你可以提出任何合理行動；下面只是練習如何描述。",
      steps: [
        step("listen", "門後有聲音", "木門後傳來輕微金屬碰撞聲。你會怎麼告訴 DM？",
          fields("技能／察覺", "技能／調查", "屬性調整值"), "D20 Tests", "Ability Checks", [
            choice("describe", "「我貼近門板聽，想知道裡面有沒有生物。」", "good", "先描述行動", "DM 可決定是否需要感知（察覺）檢定，也可能直接告訴你可聽到的資訊。你還沒有真的擲骰。", fields("察覺", "感知調整值")),
            choice("skill-only", "「我按察覺，直接算我找到敵人。」", "hint", "技能不是自動成功按鈕", "可以提出想用察覺，但仍要描述要確認什麼；DM 決定是否需要檢定及結果。", fields("察覺", "技能熟練")),
            choice("force-door", "「我想先用肩膀撞開木門。」", "good", "另一種合理做法", "你可以嘗試；DM 可能要求力量檢定、使用其他規則，或說明風險。這不保證撞得開。", fields("力量", "運動"))
          ]),
        step("trap", "地板有一條細線", "前方地板似乎藏著陷阱，但你還不知道它的作用。",
          fields("技能／調查", "技能／察覺", "盜賊工具"), "D20 Tests", "Ability Checks", [
            choice("inspect", "「我先看細線連到哪裡，再決定要不要碰。」", "good", "蒐集資訊很重要", "DM 可能給你描述或要求檢定；必要時再看適用的技能或工具。", fields("調查", "察覺", "工具熟練")),
            choice("disarm", "「我用工具嘗試解除機關，請 DM 告訴我該檢定什麼。」", "good", "把方法說清楚", "有合適工具與條件時可嘗試；是否能解除以及 DC 均由 DM／規則裁定。", fields("盜賊工具", "敏捷調整值")),
            choice("auto", "「我有盜賊工具，所以陷阱一定失效。」", "hint", "有工具不代表自動成功", "工具提供使用選項與可能的熟練加值，並不直接宣布陷阱解除。", fields("工具熟練", "檢定加值"))
          ])
      ]
    },
    {
      id: "social", title: "社交：旅店裡的線索", icon: "messages-square",
      intro: "一位旅店老闆知道失蹤商人的消息，但不太願意開口。先用對話描述你的做法。",
      steps: [
        step("approach", "如何讓老闆願意說話？", "老闆說：「我不知道，別再問了。」",
          fields("技能／遊說", "技能／欺瞞", "技能／威嚇"), "D20 Tests", "Ability Checks", [
            choice("empathy", "「我先關心他的處境，並說明我們為什麼要找人。」", "good", "有明確的交涉方法", "DM 可根據情境決定是否需要魅力（遊說）檢定，或直接讓對話繼續；不能先宣稱成功。", fields("遊說", "魅力調整值")),
            choice("bluff", "「我假裝是商人的朋友，試著套出消息。」", "good", "可以選擇欺瞞", "這是另一條路；DM 可能要求魅力（欺瞞）檢定，也會依 NPC 的資訊與反應裁定後果。", fields("欺瞞", "魅力調整值")),
            choice("roll-first", "「我先擲 d20，超過 15 就得到所有線索。」", "hint", "不要自訂成功門檻", "先交代做法；是否擲骰、DC 和知道多少內容由 DM 與規則決定。", fields("技能", "熟練加值"))
          ]),
        step("read-mood", "老闆猶豫了一下", "他提到商人時突然不敢看你。你想確認什麼？",
          fields("技能／洞悉", "感知調整值"), "D20 Tests", "Ability Checks", [
            choice("insight", "「我觀察他的神情，想知道他是在害怕還是說謊。」", "good", "提出具體觀察目的", "DM 可能要求感知（洞悉）檢定，並描述你能察覺的線索；洞悉不等於讀心術。", fields("洞悉", "感知調整值")),
            choice("ask", "「我直接問：是不是有人威脅你？」", "good", "直接對話也可以", "不一定每句話都需要擲骰。DM 會扮演 NPC 並描述回應。", fields("魅力", "社交技能")),
            choice("mind-read", "「我洞悉熟練，所以你必須告訴我他心裡所有事。」", "hint", "熟練不代表讀心", "洞悉協助理解意圖與情緒，不保證取得 NPC 不曾透露的全部秘密。", fields("洞悉", "技能熟練"))
          ])
      ]
    },
    {
      id: "combat", title: "戰鬥：鐘樓裡的一回合", icon: "swords",
      intro: "一名守衛攔住去路。以下選項只練習流程，不擲骰、不扣 HP、不消耗資源。",
      steps: [
        step("initiative", "戰鬥開始", "DM 說：「所有人擲先攻！」你先要看哪裡？",
          fields("先攻", "敏捷調整值"), "Combat", "Initiative", [
            choice("initiative-value", "找角色卡「先攻」，等 DM 指示再擲 d20 加上加值。", "good", "正確流程", "由 DM 收集先攻結果並決定回合順序；教學沒有替你擲骰。", fields("先攻", "敏捷調整值")),
            choice("attack-now", "先宣告攻擊並直接扣敵人 HP。", "hint", "先確認順序", "一般先依先攻安排回合，再宣告與處理行動；不要自行結算敵人傷害。", fields("先攻", "武器／攻擊")),
            choice("highest-ac", "看誰的 AC 最高就讓誰先動。", "hint", "AC 不是先攻", "AC 主要影響是否被攻擊命中；先攻通常看敏捷檢定及相關特性。", fields("護甲等級 AC", "先攻"))
          ]),
        step("your-turn", "輪到你了", "敵人在十多呎外，你想移動並攻擊。下列哪個說法清楚？",
          fields("速度", "武器／攻擊命中", "動作", "附贈動作"), "Combat", "Your Turn / Movement", [
            choice("move-attack", "「我先依速度靠近，然後用動作攻擊。」", "good", "交代位置與動作", "請 DM 確認距離與觸及，再用角色卡的攻擊命中加值處理攻擊；命中後才會有傷害。這裡不結算。", fields("速度", "武器／攻擊命中", "武器／傷害")),
            choice("bonus-extra", "「攻擊完還有附贈動作，我免費再攻擊一次。」", "hint", "附贈動作需要規則允許", "只有特性、法術或其他規則明確給你可用的附贈動作時，才能執行對應事情。", fields("特性與資源", "施法時間")),
            choice("dodge", "「我暫時不攻擊，改採取閃避動作。」", "good", "防禦也是選擇", "可以依閃避動作規則行動；具體效果與終止條件應查完整規則。", fields("護甲等級 AC", "狀態效果"))
          ]),
        step("reaction", "敵人準備離開你身旁", "在符合觸及與其他條件時，可能發生藉機攻擊。你會怎麼做？",
          fields("反應", "武器／觸及", "特性"), "Combat", "Reactions / Opportunity Attacks", [
            choice("ask-reaction", "「他是不是離開我的觸及？我還有反應可以用嗎？」", "good", "先確認觸發與反應", "若符合藉機攻擊規則，你可以決定是否使用反應；這裡沒有發動攻擊。", fields("武器／觸及", "特性／反應")),
            choice("infinite", "「我每看見一個敵人移動，就能無限反擊。」", "hint", "反應不是無限次", "反應必須有合適觸發；使用後通常要等自己下個回合開始才恢復，敵人移動也不一定觸發。", fields("特性／反應", "武器／觸及")),
            choice("hold", "「我先保留反應，看看之後有沒有別的觸發。」", "good", "保留反應是可行選擇", "反應不是一定要使用；DM 會說明後續事件。", fields("特性／反應"))
          ])
      ]
    }
  ];

  const meta = {
    id: "first-session-5r", version: "1.0.0", edition: "2024",
    title: "第一次跑團｜零基礎入門", estimatedMinutes: "10–15 分鐘",
    description: "角色完成後，先認識怎麼說行動、怎麼看角色卡，再練三段情境。",
    disclaimer: "這是純教學選擇題：不擲骰、不改角色資料、不消耗資源，也不代替 DM 裁定。",
    canonical: {
      authority: "5RTools", source: "PHB2024",
      localSnapshot: "D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024",
      availability: "本機固定快照只有部分資料表；通用規則章節索引需由既有 canonical 規則入口解讀",
      fallbackForReview: "D&D Beyond 2024 Free Rules：Playing the Game / Rules Glossary（僅核對，不改規則權威）"
    },
    integration: {
      owner: "30｜教學正式入口", mode: "read-only-data",
      recommendedOrder: ["topics", "exploration", "social", "combat"],
      resultIsInstructionOnly: true,
      characterStateRead: false, characterStateWrite: false, diceRoll: false, combatSettlement: false
    }
  };

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.values(value).forEach(deepFreeze);
      Object.freeze(value);
    }
    return value;
  }
  const data = deepFreeze({ meta, topics, scenarios });
  const getTopic = id => data.topics.find(item => item.id === id) || null;
  const getScenario = id => data.scenarios.find(item => item.id === id) || null;
  const getStep = (scenarioId, stepId) => getScenario(scenarioId)?.steps.find(item => item.id === stepId) || null;
  const getFeedback = (scenarioId, stepId, choiceId) =>
    getStep(scenarioId, stepId)?.choices.find(item => item.id === choiceId)?.feedback || null;
  return Object.freeze({ ...data, getTopic, getScenario, getStep, getFeedback });
});

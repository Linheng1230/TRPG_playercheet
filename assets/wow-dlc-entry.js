// AUTO-GENERATED public-safe script. Source: assets/wow-dlc-entry.mjs
// Run node scripts/build-wow-dlc-entry.mjs to regenerate; NEVER add paid prose.
(()=>{
"use strict";
const WOW_DLC_ID = "wow-2026";
const WOW_DLC_RELEASE = Object.freeze({"eventDate":"2026-12-19","playerCount":4,"level":2,"publicRulebookEnabled":false,"licensedProviderStatus":"BLOCKED"});
const WOW_PUBLIC_SPECIES = Object.freeze([{"id":"dracthyr","zh":"龍希爾","en":"Dracthyr","journalId":"wowDracthyr00000"},{"id":"draenei","zh":"德萊尼","en":"Draenei","journalId":"wowDraenei000000"},{"id":"dwarf","zh":"矮人","en":"Dwarf","journalId":"wowDwarf00000000"},{"id":"earthen","zh":"土靈","en":"Earthen","journalId":"wowEarthen000000"},{"id":"elf","zh":"精靈","en":"Elf","journalId":"wowElf0000000000"},{"id":"forsaken","zh":"被遺忘者","en":"Forsaken","journalId":"wowForsaken00000"},{"id":"gnome","zh":"地精","en":"Gnome","journalId":"wowGnome00000000"},{"id":"goblin","zh":"哥布林","en":"Goblin","journalId":"wowGoblin0000000"},{"id":"haranir","zh":"哈拉尼爾","en":"Haranir","journalId":"wowHaranir000000"},{"id":"human","zh":"人類","en":"Human","journalId":"wowHuman00000000"},{"id":"orc","zh":"獸人","en":"Orc","journalId":"wowOrc0000000000"},{"id":"pandaren","zh":"熊貓人","en":"Pandaren","journalId":"wowPandaren00000"},{"id":"tauren","zh":"牛頭人","en":"Tauren","journalId":"wowTauren0000000"},{"id":"troll","zh":"食人妖","en":"Troll","journalId":"wowTroll00000000"},{"id":"vulpera","zh":"狐狸人","en":"Vulpera","journalId":"wowVulpera000000"},{"id":"worgen","zh":"狼人","en":"Worgen","journalId":"wowWorgen0000000"}]);
const WOW_PUBLIC_CLASSES = Object.freeze([{"id":"death-knight","zh":"死亡騎士","en":"Death Knight","journalId":"wowDeathKnight00","coreClassId":"paladin"},{"id":"demon-hunter","zh":"惡魔獵人","en":"Demon Hunter","journalId":"wowDemonHunter00","coreClassId":"ranger"},{"id":"druid","zh":"德魯伊","en":"Druid","journalId":"wowDruid00000000","coreClassId":"druid"},{"id":"evoker","zh":"喚能師","en":"Evoker","journalId":"wowEvoker0000000","coreClassId":"sorcerer"},{"id":"hunter","zh":"獵人","en":"Hunter","journalId":"wowHunter0000000","coreClassId":"ranger"},{"id":"mage","zh":"法師","en":"Mage","journalId":"wowMage000000000","coreClassId":"wizard"},{"id":"monk","zh":"武僧","en":"Monk","journalId":"wowMonk000000000","coreClassId":"monk"},{"id":"paladin","zh":"聖騎士","en":"Paladin","journalId":"wowPaladin000000","coreClassId":"paladin"},{"id":"priest","zh":"牧師","en":"Priest","journalId":"wowPriest0000000","coreClassId":"cleric"},{"id":"rogue","zh":"盜賊","en":"Rogue","journalId":"wowRogue00000000","coreClassId":"rogue"},{"id":"shaman","zh":"薩滿","en":"Shaman","journalId":"wowShaman0000000","coreClassId":"barbarian"},{"id":"warlock","zh":"術士","en":"Warlock","journalId":"wowWarlock000000","coreClassId":"warlock"},{"id":"warrior","zh":"戰士","en":"Warrior","journalId":"wowWarrior000000","coreClassId":"fighter"}]);
const WOW_PUBLIC_SPECIALIZATIONS = Object.freeze([{"id":"death-knight.blood","classId":"death-knight","zh":"血魄","en":"Blood","coreSubclassName":null,"sourceKind":"wow"},{"id":"death-knight.frost","classId":"death-knight","zh":"冰霜","en":"Frost","coreSubclassName":null,"sourceKind":"wow"},{"id":"death-knight.unholy","classId":"death-knight","zh":"穢邪","en":"Unholy","coreSubclassName":null,"sourceKind":"wow"},{"id":"demon-hunter.devourer","classId":"demon-hunter","zh":"吞噬","en":"Devourer","coreSubclassName":null,"sourceKind":"wow"},{"id":"demon-hunter.havoc","classId":"demon-hunter","zh":"災虐","en":"Havoc","coreSubclassName":null,"sourceKind":"wow"},{"id":"demon-hunter.vengeance","classId":"demon-hunter","zh":"復仇","en":"Vengeance","coreSubclassName":null,"sourceKind":"wow"},{"id":"druid.balance","classId":"druid","zh":"平衡","en":"Balance","coreSubclassName":"Circle of the Stars","sourceKind":"core"},{"id":"druid.feral","classId":"druid","zh":"野性","en":"Feral","coreSubclassName":"Circle of the Moon","sourceKind":"core"},{"id":"druid.guardian","classId":"druid","zh":"守護","en":"Guardian","coreSubclassName":"Circle of the Moon","sourceKind":"core"},{"id":"druid.restoration","classId":"druid","zh":"恢復","en":"Restoration","coreSubclassName":"Circle of the Land","sourceKind":"core"},{"id":"evoker.augmentation","classId":"evoker","zh":"強化","en":"Augmentation","coreSubclassName":"Draconic Sorcery","sourceKind":"core"},{"id":"evoker.devastation","classId":"evoker","zh":"破滅","en":"Devastation","coreSubclassName":"Draconic Sorcery","sourceKind":"core"},{"id":"evoker.preservation","classId":"evoker","zh":"保存","en":"Preservation","coreSubclassName":"Draconic Sorcery","sourceKind":"core"},{"id":"hunter.beast-mastery","classId":"hunter","zh":"獸王","en":"Beast Mastery","coreSubclassName":"Beast Master","sourceKind":"core"},{"id":"hunter.marksmanship","classId":"hunter","zh":"射擊","en":"Marksmanship","coreSubclassName":"Hunter","sourceKind":"core"},{"id":"hunter.survival","classId":"hunter","zh":"生存","en":"Survival","coreSubclassName":"Beast Master","sourceKind":"core"},{"id":"mage.arcane","classId":"mage","zh":"秘法","en":"Arcane","coreSubclassName":"Evoker","sourceKind":"core"},{"id":"mage.fire","classId":"mage","zh":"火焰","en":"Fire","coreSubclassName":"Evoker","sourceKind":"core"},{"id":"mage.frost","classId":"mage","zh":"冰霜","en":"Frost","coreSubclassName":"Evoker","sourceKind":"core"},{"id":"monk.brewmaster","classId":"monk","zh":"酒仙","en":"Brewmaster","coreSubclassName":null,"sourceKind":"wow"},{"id":"monk.mistweaver","classId":"monk","zh":"織霧","en":"Mistweaver","coreSubclassName":"Warrior of Mercy","sourceKind":"core"},{"id":"monk.windwalker","classId":"monk","zh":"御風","en":"Windwalker","coreSubclassName":"Warrior of the Open Hand","sourceKind":"core"},{"id":"paladin.holy","classId":"paladin","zh":"神聖","en":"Holy","coreSubclassName":null,"sourceKind":"wow"},{"id":"paladin.protection","classId":"paladin","zh":"防護","en":"Protection","coreSubclassName":"Oath of Devotion","sourceKind":"core"},{"id":"paladin.retribution","classId":"paladin","zh":"懲戒","en":"Retribution","coreSubclassName":"Oath of Vengeance","sourceKind":"core"},{"id":"priest.discipline","classId":"priest","zh":"戒律","en":"Discipline","coreSubclassName":null,"sourceKind":"wow"},{"id":"priest.holy","classId":"priest","zh":"神聖","en":"Holy","coreSubclassName":"Life Domain","sourceKind":"core"},{"id":"priest.shadow","classId":"priest","zh":"暗影","en":"Shadow","coreSubclassName":null,"sourceKind":"wow"},{"id":"rogue.assassination","classId":"rogue","zh":"刺殺","en":"Assassination","coreSubclassName":"Assassin","sourceKind":"core"},{"id":"rogue.outlaw","classId":"rogue","zh":"暴徒","en":"Outlaw","coreSubclassName":null,"sourceKind":"wow"},{"id":"rogue.subtlety","classId":"rogue","zh":"敏銳","en":"Subtlety","coreSubclassName":"Soulknife","sourceKind":"core"},{"id":"shaman.elemental","classId":"shaman","zh":"元素","en":"Elemental","coreSubclassName":null,"sourceKind":"wow"},{"id":"shaman.enhancement","classId":"shaman","zh":"增強","en":"Enhancement","coreSubclassName":null,"sourceKind":"wow"},{"id":"shaman.restoration","classId":"shaman","zh":"恢復","en":"Restoration","coreSubclassName":"Path of the World Tree","sourceKind":"core"},{"id":"warlock.affliction","classId":"warlock","zh":"痛苦","en":"Affliction","coreSubclassName":"Great Old One Patron","sourceKind":"core"},{"id":"warlock.demonology","classId":"warlock","zh":"惡魔學識","en":"Demonology","coreSubclassName":"Fiend Patron","sourceKind":"core"},{"id":"warlock.destruction","classId":"warlock","zh":"毀滅","en":"Destruction","coreSubclassName":"Fiend Patron","sourceKind":"core"},{"id":"warrior.arms","classId":"warrior","zh":"武器","en":"Arms","coreSubclassName":"Battle Master","sourceKind":"core"},{"id":"warrior.fury","classId":"warrior","zh":"狂怒","en":"Fury","coreSubclassName":"Champion","sourceKind":"core"},{"id":"warrior.protection","classId":"warrior","zh":"防護","en":"Protection","coreSubclassName":"Battle Master","sourceKind":"core"}]);
/**
 * Public-safe WoW DLC entry in the existing 2014/2024 chooser.
 * No paid text, no entitlement claims, and no edits to 5R character state.
 * Future full creator activation must occur through the private release gates.
 */
// Browser metadata is generated from the policy source.

const P0 = Object.freeze([
  "創角步驟、物種與特性",
  "官方 13 職業／40 專精 Lv1–3 與資源",
  "背景／起源、屬性、熟練與技能",
  "Lv1–3 法術、升級與子職選擇",
  "初始裝備、存檔、JSON 與角色卡",
]);

function createText(tag, message, root = document) {
  const el = root.createElement(tag);
  el.textContent = message;
  return el;
}

async function consumePrivateProvider(root) {
  const win = root.defaultView;
  if (!win || new URLSearchParams(win.location.search).get("wow-private") !== "1") return null;
  try {
    const url = new URL("assets/wow-dlc-private-provider-session.mjs", win.location.href).href;
    const mod = await import(url);
    const result = await mod.consumeStagedWowPrivateRules({ storage: win.sessionStorage });
    if (result?.ok) {
      Object.defineProperty(win, "WowPrivateRulesProvider", {
        value: Object.freeze(result), configurable: true, enumerable: false,
      });
    }
    return result;
  } catch {
    return { ok:false, reason:"PRIVATE_RULE_PROVIDER_UNAVAILABLE" };
  }
}

function installWowDlcEntry(root = document) {
  const host = root.querySelector(".ruleset-chooser");
  const win = root.defaultView;
  if (win && !win.WowDlcPublicMetadata)
    Object.defineProperty(win, "WowDlcPublicMetadata", {
      value:Object.freeze({classes:WOW_PUBLIC_CLASSES,specializations:WOW_PUBLIC_SPECIALIZATIONS}),
      configurable:true, enumerable:false,
    });
  if (!host) return { ok: false, reason: "CHOOSER_NOT_FOUND" };
  if (root.getElementById("wowDlcEntry"))
    return { ok: true, alreadyInstalled: true };

  const entry = createText("button", "", root);
  entry.type = "button";
  entry.id = "wowDlcEntry";
  entry.className = "ruleset-card";
  entry.setAttribute("aria-haspopup", "dialog");
  entry.setAttribute("aria-label", "魔獸世界 DLC，查看開團日期及尚未完成的創角範圍");
  entry.appendChild(createText("b", "魔獸世界 DLC · 施工中", root));
  entry.appendChild(createText("span", "2026/12/19《死亡礦坑》｜4 人 Lv2。尚未開放正式 WoW 創角。", root));

  const dlg = root.createElement("dialog");
  dlg.id = "wowDlcReadiness";
  dlg.setAttribute("aria-label", "魔獸世界 DLC 開放狀態");
  dlg.style.cssText = "box-sizing:border-box;max-width:min(92vw,620px);max-height:85vh;overflow:auto;padding:clamp(14px,3vw,24px);color:#f2e8cf;background:#30291f;border:1px solid #b89a5d;border-radius:12px;line-height:1.7";
  const heading = createText("h3", "魔獸世界 DLC｜創角預告", root);
  heading.style.cssText = "font-size:1.15rem;line-height:1.4;margin:0 0 12px";
  dlg.appendChild(heading);
  dlg.appendChild(createText("p", "活動：2026/12/19《死亡礦坑》／4 名 Lv2 玩家／4 小時／歡樂荒謬風格。", root));
  dlg.appendChild(createText("p", "混搭方式：WoW 官方物種優先，亦可申請 D&D 5R 物種；特殊物種須由 GM 核准。同一角色不可疊加兩套物種特性。", root));
  dlg.appendChild(createText("p", "目前狀態：玩家 P0 全繁中規則、授權資料供應、完整角色卡與 Live 驗收尚未全部通過，因此不能在此建立正式 WoW 角色。", root));
  const privateStatus = createText("p", "", root);
  privateStatus.hidden = true;
  privateStatus.id = "wowPrivateProviderStatus";
  privateStatus.setAttribute("role", "status");
  dlg.appendChild(privateStatus);
  const list = root.createElement("ul");
  for (const title of P0)
    list.appendChild(createText("li", title + " — 等待正式驗收", root));
  dlg.appendChild(list);
  // Names are permitted, public-safe metadata from source chapter titles.
  // Do not treat any listed chapter as a currently playable option.
  const addNames = (title, entries) => {
    const detail = root.createElement("details");
    detail.style.cssText = "margin:10px 0;padding:8px 10px;border:1px solid #786443;border-radius:8px";
    detail.appendChild(createText("summary", title + "（僅名稱預覽）", root));
    detail.appendChild(createText("p", entries.map(x => x.zh + " " + x.en).join("、"), root));
    dlg.appendChild(detail);
  };
  addNames("WoW 物種來源章節 16 類", WOW_PUBLIC_SPECIES);
  addNames("WoW 職業來源章節 13 類", WOW_PUBLIC_CLASSES);
  addNames("WoW 官方專精 40 類", WOW_PUBLIC_SPECIALIZATIONS);
  dlg.appendChild(createText("p", "注意：上述只有名稱與來源章節，不代表種族分支、職業能力、法術、專長或 GM 核准已完成，也不能用來建立正式 WoW 角色。", root));
  dlg.appendChild(createText("p", "現有 D&D 5E（2014）和 D&D 5R（2024）角色建立流程不受此 DLC 預告影響。", root));
  const close = createText("button", "返回規則選擇", root);
  close.type = "button";
  close.style.cssText = "padding:10px 16px;cursor:pointer;margin-top:8px;background:#b89a5d;color:#20190f;border:1px solid #efd49b;border-radius:6px;font-weight:700";
  close.addEventListener("click", () => dlg.close());
  dlg.appendChild(close);

  // The chooser's generic [data-ruleset] handler intentionally does NOT see
  // this entry; the core ruleset remains 2014 or 2024 until full P0 release.
  entry.addEventListener("click", () => {
    if (typeof dlg.showModal === "function") dlg.showModal();
    else { dlg.setAttribute("open", ""); dlg.scrollIntoView?.(); }
  });
  root.body.appendChild(dlg);
  host.appendChild(entry);
  void consumePrivateProvider(root).then(result => {
    if (!result) return;
    privateStatus.hidden = false;
    if (result.ok) {
      const title = entry.querySelector?.("b");
      const subtitle = entry.querySelector?.("span");
      if (title) title.textContent = "魔獸世界 DLC · 私人規則已驗證";
      if (subtitle) subtitle.textContent = "本團 Lv1–3 官方職業／法術映射已通過授權與完整性驗證；正式可玩仍等待 Creator／Save／Live-UAT Gate。";
      privateStatus.textContent = "已載入本團授權的 WoW Lv1–3 私人來源映射與 47 筆完整能力內容（13 職業／40 專精）。資料只保留於本頁記憶體；尚未完成的 Creator progression、Save/JSON/PDF/Cloud/FVTT 與 Live-UAT Gate 不會被繞過。";
      win?.dispatchEvent(new Event("wow-private-provider-ready"));
    } else {
      privateStatus.textContent = "WoW 私人規則授權資料未通過驗證，仍維持鎖定預覽。";
    }
  });
  return { ok: true, dlcId: WOW_DLC_ID, releaseBlocked: !WOW_DLC_RELEASE.publicRulebookEnabled };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => installWowDlcEntry(document), { once: true });
  else installWowDlcEntry(document);
}

})();

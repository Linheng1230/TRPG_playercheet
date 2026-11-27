// AUTO-GENERATED public-safe script. Source: assets/wow-dlc-entry.mjs
// Run node scripts/build-wow-dlc-entry.mjs to regenerate; NEVER add paid prose.
(()=>{
"use strict";
const WOW_DLC_ID = "wow-2026";
const WOW_DLC_RELEASE = Object.freeze({"eventDate":"2026-12-19","playerCount":4,"level":2,"publicRulebookEnabled":false,"licensedProviderStatus":"BLOCKED"});
const WOW_PUBLIC_SPECIES = Object.freeze([{"id":"dracthyr","zh":"龍希爾","en":"Dracthyr","journalId":"wowDracthyr00000"},{"id":"draenei","zh":"德萊尼","en":"Draenei","journalId":"wowDraenei000000"},{"id":"dwarf","zh":"矮人","en":"Dwarf","journalId":"wowDwarf00000000"},{"id":"earthen","zh":"土靈","en":"Earthen","journalId":"wowEarthen000000"},{"id":"elf","zh":"精靈","en":"Elf","journalId":"wowElf0000000000"},{"id":"forsaken","zh":"被遺忘者","en":"Forsaken","journalId":"wowForsaken00000"},{"id":"gnome","zh":"地精","en":"Gnome","journalId":"wowGnome00000000"},{"id":"goblin","zh":"哥布林","en":"Goblin","journalId":"wowGoblin0000000"},{"id":"haranir","zh":"哈拉尼爾","en":"Haranir","journalId":"wowHaranir000000"},{"id":"human","zh":"人類","en":"Human","journalId":"wowHuman00000000"},{"id":"orc","zh":"獸人","en":"Orc","journalId":"wowOrc0000000000"},{"id":"pandaren","zh":"熊貓人","en":"Pandaren","journalId":"wowPandaren00000"},{"id":"tauren","zh":"牛頭人","en":"Tauren","journalId":"wowTauren0000000"},{"id":"troll","zh":"食人妖","en":"Troll","journalId":"wowTroll00000000"},{"id":"vulpera","zh":"狐狸人","en":"Vulpera","journalId":"wowVulpera000000"},{"id":"worgen","zh":"狼人","en":"Worgen","journalId":"wowWorgen0000000"}]);
const WOW_PUBLIC_CLASSES = Object.freeze([{"id":"death-knight","zh":"死亡騎士","en":"Death Knight","journalId":"wowDeathKnight00","coreClassId":"paladin"},{"id":"demon-hunter","zh":"惡魔獵人","en":"Demon Hunter","journalId":"wowDemonHunter00","coreClassId":"ranger"},{"id":"druid","zh":"德魯伊","en":"Druid","journalId":"wowDruid00000000","coreClassId":"druid"},{"id":"evoker","zh":"喚能師","en":"Evoker","journalId":"wowEvoker0000000","coreClassId":"sorcerer"},{"id":"hunter","zh":"獵人","en":"Hunter","journalId":"wowHunter0000000","coreClassId":"ranger"},{"id":"mage","zh":"法師","en":"Mage","journalId":"wowMage000000000","coreClassId":"wizard"},{"id":"monk","zh":"武僧","en":"Monk","journalId":"wowMonk000000000","coreClassId":"monk"},{"id":"paladin","zh":"聖騎士","en":"Paladin","journalId":"wowPaladin000000","coreClassId":"paladin"},{"id":"priest","zh":"牧師","en":"Priest","journalId":"wowPriest0000000","coreClassId":"cleric"},{"id":"rogue","zh":"盜賊","en":"Rogue","journalId":"wowRogue00000000","coreClassId":"rogue"},{"id":"shaman","zh":"薩滿","en":"Shaman","journalId":"wowShaman0000000","coreClassId":"barbarian"},{"id":"warlock","zh":"術士","en":"Warlock","journalId":"wowWarlock000000","coreClassId":"warlock"},{"id":"warrior","zh":"戰士","en":"Warrior","journalId":"wowWarrior000000","coreClassId":"fighter"}]);
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
      entry.nodes?.[0]?.textContent;
      entry.querySelector?.("b");
      const title = entry.querySelector?.("b");
      const subtitle = entry.querySelector?.("span");
      if (title) title.textContent = "魔獸世界 DLC · 私人規則已驗證";
      if (subtitle) subtitle.textContent = "本團 Lv1–3 官方職業／法術映射已通過授權與完整性驗證；正式可玩仍等待 Creator／Save／Live-UAT Gate。";
      privateStatus.textContent = "已載入本團授權的 WoW Lv1–3 私人來源映射（13 職業／40 專精）。資料只保留於本頁記憶體；尚未完成的 Creator progression、Save/JSON/PDF/Cloud/FVTT 與 Live-UAT Gate 不會被繞過。";
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

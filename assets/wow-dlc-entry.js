// AUTO-GENERATED public-safe script. Source: assets/wow-dlc-entry.mjs
// Run node scripts/build-wow-dlc-entry.mjs to regenerate; NEVER add paid prose.
(()=>{
"use strict";
const WOW_DLC_ID = "wow-2026";
const WOW_DLC_RELEASE = Object.freeze({"eventDate":"2026-12-19","playerCount":4,"level":2,"publicRulebookEnabled":false,"licensedProviderStatus":"BLOCKED"});
/**
 * Public-safe WoW DLC entry in the existing 2014/2024 chooser.
 * No paid text, no entitlement claims, and no edits to 5R character state.
 * Future full creator activation must occur through the private release gates.
 */
// Browser metadata is generated from the policy source.

const P0 = Object.freeze([
  "創角步驟、物種與特性",
  "職業 Lv1–2 與資源",
  "背景／起源、屬性、熟練與技能",
  "Lv2 可取得的專長與法術",
  "初始裝備、存檔、JSON 與角色卡",
]);

function createText(tag, message, root = document) {
  const el = root.createElement(tag);
  el.textContent = message;
  return el;
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
  const list = root.createElement("ul");
  for (const title of P0)
    list.appendChild(createText("li", title + " — 等待正式驗收", root));
  dlg.appendChild(list);
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
  return { ok: true, dlcId: WOW_DLC_ID, releaseBlocked: !WOW_DLC_RELEASE.publicRulebookEnabled };
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", () => installWowDlcEntry(document), { once: true });
  else installWowDlcEntry(document);
}

})();

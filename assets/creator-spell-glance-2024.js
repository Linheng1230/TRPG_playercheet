/* Creator spell selection: a short, source-derived glance, never an alternate rules database.
 * Full mechanically complete preview() and canonical spell tooltips remain unchanged.
 */
(function (g) {
  "use strict";
  const source = g.ZIZI_CREATOR_SPELL_PREVIEW_2024;
  if (!source) return;
  const damageTypes = ["酸蝕","鈍擊","寒冷","火焰","力場","閃電","黯蝕","穿刺","毒素","心靈","光耀","揮砍","雷鳴"];
  const escape = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const tokenRE = new RegExp(
    "(?:\\d+\\s*[dD]\\s*\\d+(?:\\s*[+＋]\\s*\\d+)?\\s*(?:點)?)?\\s*(?:" + damageTypes.join("|") + ")傷害" +
    "|(?:遠端|近戰)?法術攻擊(?:檢定)?|(?:武器|法術)?攻擊檢定|攻擊擲骰" +
    "|(?:力量|敏捷|體質|智力|感知|魅力)\\s*豁免(?:檢定)?|法術豁免\\s*DC|豁免\\s*DC|DC\\s*\\d+|豁免(?:檢定)?" +
    "|主要動作|附贈動作|魔法動作|反應|優勢|劣勢|成功|失敗" +
    "|(?<![A-Za-z])\\d+\\s*[dD]\\s*\\d+(?:\\s*[+＋]\\s*\\d+)?", "gu"
  );
  // Readable selection snippets must not be sliced at an arbitrary character.
  // The full mechanical preview and canonical rule detail are never modified.
  const abilityNames = "(?:力量|敏捷|體質|智力|感知|魅力)";
  const spellShorts = new Map((g.SPELLS_2024_TUPLES || []).map(row => [row[0], String(row[13] || "")]));
  const comparable = value => String(value || "").replace(/[\s,，;；:.：。()（）]/gu, "");
  const saveCue = new RegExp("^豁免\\s*(" + abilityNames + ")\\s*$","u");
  const damageWord = new RegExp("(\\d+\\s*[dD]\\s*\\d+(?:\\s*[+＋]\\s*\\d+)?)\\s*(?:點)?\\s*(" + damageTypes.join("|") + ")傷害","gu");
  function polishClause(clause) {
    let text = String(clause || "").trim()
      .replace(/,/gu, "，").replace(/:/gu, "：")
      .replace(/\(/gu, "（").replace(/\)/gu, "）").replace(/\//gu, "／");
    // The curated upstream teaser contains telegraphic phrases, such as
    // "遠端法術攻擊,2d12 閃電傷害". Supply grammatical glue only.
    text = text.replace(
      /^((?:遠端|近戰)法術攻擊)(（[^）]+）)?[，\s]+(.+?傷害)(.*)$/u,
      (_all, attack, range, damage, rest) => "進行一次" + attack + (range || "") + "，命中時造成" + damage + rest
    );
    text = text.replace(
      /(目標|生物)(?=(?:力量|敏捷|體質|智力|感知|魅力)豁免)/gu,
      "$1須進行"
    );
    text = text.replace(/(豁免)[，：](失敗|成功)/gu, "$1；$2")
      .replace(/失敗受(?=\s*\d)/gu, "失敗時受到")
      .replace(/失敗則/gu, "失敗時")
      .replace(/成功減半/gu, "成功時傷害減半");
    text = text.replace(damageWord, "$1 點$2傷害").replace(/造成(?=\d+\s*[dD]\s*\d+)/gu, "造成 ")
      .replace(/^((?:遠端|近戰)法術攻擊)$/u, "進行一次$1")
      .replace(/^使\s*0\s*生命值生物/u, "使生命值為 0 的生物");
    return text.replace(/\s+([。！？])/gu, "$1").trim();
  }
  function compact(sp, level = 1, meta = {}) {
    // Keep the first complete, audited mechanical teaser (normally <60 source
    // characters). Optional short follow-up is included only when self-contained.
    // Never append disjoint "；豁免 感知", "；傷害 1d8" or raw source paragraphs.
    const original = String(source.preview(sp, level, meta).text || "").replace(/\s+/gu, " ").trim();
    const segments = original.split(/[；;]/u).map(v => v.trim()).filter(Boolean);
    let first = "", extra = "", omitted = false;
    for (const segment of segments) {
      if (/^(?:升環施法|高環施法|戲法強化|等級提升|(?:5|11|17)級\s*\d+\s*[dD]\d+|目前\s*\d+\s*[dD]\d+)/u.test(segment)) {
        omitted = true; continue;
      }
      const scaling = segment.search(/(?:升環施法|高環施法|戲法強化|等級提升|施法環階提升)/u);
      const safePart = scaling >= 0 ? segment.slice(0, scaling).trim() : segment;
      if (scaling >= 0) omitted = true;
      if (!safePart) continue;
      if (!first) { first = polishClause(safePart).replace(/[，；。]+$/gu, ""); continue; }
      const cue = saveCue.exec(safePart);
      if (cue) {
        if (!first.includes("豁免") && !extra && first.length + cue[1].length + 4 <= 112)
          extra = "（" + cue[1] + "豁免）";
        else omitted = true;
        continue;
      }
      if (/^傷害\s+/u.test(safePart)) {
        // Only disclose a missing base dice amount, not redundant extra damage.
        if (!extra && !/\d+\s*[dD]\s*\d+/u.test(first) && /\d+\s*[dD]\s*\d+/u.test(safePart)) {
          const label = polishClause(safePart.replace(/^傷害\s+/u, ""));
          if (first.length + label.length + 8 <= 112) extra = "；武器傷害為 " + label;
          else omitted = true;
        } else omitted = true;
        continue;
      }
      if (/^(?:治療|豁免|目前|上限)[:：\s]/u.test(safePart)) { omitted = true; continue; }
      // A second rule sentence is safe only when it belonged to the upstream
      // curated short description. Automatically harvested canonical addenda
      // caused long, duplicated and ungrammatical previews (e.g. Haste).
      const originalShort = comparable(spellShorts.get(String(sp?.identifier || "")));
      const curated = originalShort.includes(comparable(safePart)) && comparable(safePart).length > 0;
      const next = polishClause(safePart).replace(/[，；。]+$/gu, "");
      if (!extra && curated && next.length <= 68 && first.length + next.length + 1 <= 112)
        extra = "；" + next;
      else omitted = true;
    }
    if (!first) first = "點擊法術名稱查看完整效果";
    const text = (first + extra).trim();
    return {text, omitted: omitted || original.length > text.length, sourceLength:original.length};
  }
  function highlight(text) {
    const original = String(text ?? "");
    let result = "", last = 0;
    for (const match of original.matchAll(tokenRE)) {
      const token = match[0], at = match.index;
      result += escape(original.slice(last, at));
      const damage = damageTypes.find(type => token.includes(type + "傷害"));
      if (damage) {
        const type = g.ZIZI_DAMAGE_SEMANTICS_5R?.types?.[damage];
        result += type
          ? '<strong class="damage-semantic sr-damage" data-damage-type="' + escape(type) + '">' + escape(token) + "</strong>"
          : '<strong class="sr-damage">' + escape(token) + "</strong>";
      } else if (/攻擊(?:檢定|擲骰)?/u.test(token)) {
        result += '<strong class="sp-preview-attack">' + escape(token) + "</strong>";
      } else if (/(?:豁免|DC)/u.test(token)) {
        result += '<strong class="sr-save">' + escape(token) + "</strong>";
      } else if (/^(?:主要動作|附贈動作|魔法動作|反應)$/u.test(token)) {
        result += '<strong class="sr-action">' + escape(token) + "</strong>";
      } else if (token === "優勢" || token === "劣勢") {
        result += '<strong class="' + (token === "優勢" ? "sr-advantage" : "sr-disadvantage") + '">' + escape(token) + "</strong>";
      } else if (token === "成功" || token === "失敗") {
        result += '<strong class="sr-save ' + (token === "成功" ? "sr-outcome-success" : "sr-outcome-fail") + '">' + escape(token) + "</strong>";
      } else {
        result += '<strong class="sr-dice">' + escape(token) + "</strong>";
      }
      last = at + token.length;
    }
    return result + escape(original.slice(last));
  }
  function render(sp, level = 1, meta = {}) {
    const glance = compact(sp, level, meta);
    return { ...glance, html: '<span class="sr-readable">' + highlight(glance.text) + "</span>" };
  }
  g.ZIZI_CREATOR_SPELL_GLANCE_2024 = Object.freeze({ compact, highlight, render });
})(globalThis);

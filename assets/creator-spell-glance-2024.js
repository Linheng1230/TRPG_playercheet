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
  function compact(sp, level = 1, meta = {}) {
    // Use the already reviewed 391-spell mechanical projection as input.
    // The list is a teaser; omitted conditions are always accessible in the full popup.
    const original = String(source.preview(sp, level, meta).text || "").replace(/\s+/gu, " ").trim();
    const segments = original.split(/[；;]/u).map(s => s.trim()).filter(Boolean);
    const keep = [];
    let omitted = false;
    for (let segment of segments) {
      if (/^(?:升環施法|高環施法|戲法強化|(?:5|11|17)級\s*\d+\s*[dD]\d+|目前\s*\d+\s*[dD]\d+)/u.test(segment)) {
        omitted = true;
        continue;
      }
      const scaling = segment.search(/(?:升環施法|高環施法|戲法強化)[:：]/u);
      if (scaling >= 0) {
        segment = segment.slice(0, scaling).trim();
        omitted = true;
      }
      if (!segment) continue;
      if (keep.length >= 2) { omitted = true; break; }
      if (keep.join("；").length + segment.length + (keep.length ? 1 : 0) > 112) {
        if (keep.length) { omitted = true; break; }
        // Never invent a shorter statement. Show a literal prefix with an ellipsis,
        // preferably ending at a source punctuation boundary.
        const prefix = segment.slice(0, 108);
        const marks = [...prefix.matchAll(/[，,。！？]/gu)].map(m => m.index + 1).filter(n => n >= 42);
        const cut = marks.length ? marks[marks.length - 1] : 108;
        keep.push(segment.slice(0, cut).trim());
        omitted = true;
        break;
      }
      keep.push(segment);
    }
    const text = keep.join("；").replace(/[；,，\s]+$/u, "").trim();
    return { text: text + (omitted ? "…" : ""), omitted, sourceLength: original.length };
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

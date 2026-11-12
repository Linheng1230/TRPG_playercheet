"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const snapshotRoot = path.resolve(
  process.argv[2] ||
    process.env.FIVERTOOLS_ROOT ||
    "D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024"
);
const qaRoot = path.dirname(snapshotRoot);
const sourcePath = path.join(snapshotRoot, "data__spells__spells-phb2024.json");
const alignmentPath = path.join(qaRoot, "spell-alignment-final.json");
const indexPath = path.join(repoRoot, "index.html");
const outputPath = path.join(repoRoot, "assets", "data", "spells-phb-2024.js");
const canonicalNamesPath = path.join(repoRoot, "assets", "data", "canonical-5r-zh-names.js");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function compactHash(value) {
  return sha256(JSON.stringify(value ?? null)).slice(0, 16);
}

function slugifyEnglish(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const identifierExceptions = {
  "Branding Smite": "shining-smite",
  "Lightning Arrows": "lightning-arrow",
  "Jailarzi's Storm of Radiance": "jailarzs-storm-of-radiance",
  AntipathySympathy: "antipathy-sympathy",
};

const classCodes = {
  Bard: "B",
  Cleric: "C",
  Druid: "D",
  Paladin: "P",
  Ranger: "R",
  Sorcerer: "S",
  Warlock: "K",
  Wizard: "W",
};
const classOrder = "BCDRPSKW";
const canonicalCantripNames = Object.freeze({"Acid Splash":"酸液飛濺","Blade Ward":"劍刃防護","Chill Touch":"顫栗之觸","Dancing Lights":"舞光術","Druidcraft":"德魯伊伎倆","Eldritch Blast":"魔能爆","Elementalism":"四象法門","Fire Bolt":"火焰箭","Friends":"交友術","Guidance":"神導術","Light":"光亮術","Mage Hand":"法師之手","Mending":"修復術","Message":"傳訊術","Mind Sliver":"心靈之楔","Minor Illusion":"次級幻影","Poison Spray":"毒氣噴濺","Prestidigitation":"魔法伎倆","Produce Flame":"燃火術","Ray of Frost":"凍寒射線","Resistance":"抵抗術","Sacred Flame":"聖火術","Shillelagh":"橡棍術","Shocking Grasp":"電爪","Sorcerous Burst":"術法爆發","Spare the Dying":"維生術","Starry Wisp":"點點星芒","Thaumaturgy":"奇術","Thorn Whip":"荊棘之鞭","Thunderclap":"鳴雷破","Toll the Dead":"亡者喪鐘","True Strike":"克敵先擊","Vicious Mockery":"惡言相加","Word of Radiance":"光耀禱詞"});

const unitLabels = {
  action: "動作",
  bonus: "附贈動作",
  reaction: "反應",
  minute: "分鐘",
  hour: "小時",
  round: "輪",
  day: "天",
};

function formatTime(time) {
  return (time || [])
    .map((entry) => {
      const unit = unitLabels[entry.unit] || entry.unit || "—";
      const amount = entry.number || 1;
      const base = amount === 1 && ["action", "bonus", "reaction"].includes(entry.unit)
        ? unit
        : `${amount} ${unit}`;
      return entry.condition ? `${base}（符合觸發條件時）` : base;
    })
    .join("／") || "—";
}

function formatRange(range) {
  if (!range) return "—";
  if (range.type === "special") return "特殊";
  const distance = range.distance || {};
  const fixed = {
    self: "自身",
    touch: "觸碰",
    sight: "視線",
    unlimited: "無限",
    plane: "同位面",
    special: "特殊",
  };
  if (fixed[distance.type]) return fixed[distance.type];
  const units = { feet: "呎", mile: "哩", miles: "哩" };
  return distance.amount == null
    ? "—"
    : `${distance.amount} ${units[distance.type] || distance.type || ""}`.trim();
}

function formatCost(cost) {
  if (cost == null) return "";
  if (cost < 1) return `${Math.round(cost * 100)} 銅幣`;
  return `${Number.isInteger(cost) ? cost : String(cost)} 金幣`;
}

function formatComponents(components) {
  if (!components) return "—";
  const out = [];
  if (components.v) out.push("聲語");
  if (components.s) out.push("姿勢");
  if (components.m) {
    const material = typeof components.m === "object" ? components.m : null;
    const facts = [];
    if (material?.cost != null) facts.push(`價值至少 ${formatCost(material.cost)}`);
    if (material?.consume) facts.push("會消耗");
    out.push(`材料${facts.length ? `（${facts.join("、")}）` : ""}`);
  }
  return out.join("、") || "—";
}

function formatDuration(duration) {
  const entry = duration?.[0];
  if (!entry) return "—";
  if (entry.type === "instant") return "即效";
  if (entry.type === "special") return "特殊";
  if (entry.type === "permanent") {
    const ends = (entry.ends || []).map((value) => ({ dispel: "解除", trigger: "觸發" }[value] || value));
    return `永久${ends.length ? `（直到${ends.join("或")}）` : ""}`;
  }
  if (entry.type === "timed") {
    const timed = entry.duration || {};
    const unit = unitLabels[timed.type] || timed.type || "";
    const prefix = entry.concentration ? "專注，最長 " : timed.upTo ? "最長 " : "";
    return `${prefix}${timed.amount || 1} ${unit}`.trim();
  }
  return String(entry.type || "—");
}

function spellSignature(spell) {
  const material = spell.components?.m;
  const duration = spell.duration?.[0] || {};
  return {
    t: (spell.time || []).map((entry) => [
      entry.number || 1,
      entry.unit || "",
      entry.condition ? compactHash(entry.condition) : "",
    ]),
    r: [
      spell.range?.type || "",
      spell.range?.distance?.type || "",
      spell.range?.distance?.amount ?? null,
    ],
    c: [
      !!spell.components?.v,
      !!spell.components?.s,
      !!material,
      typeof material === "object" ? material.cost ?? null : null,
      typeof material === "object" ? !!material.consume : false,
      material ? compactHash(typeof material === "object" ? material.text || "" : String(material)) : "",
    ],
    d: [
      duration.type || "",
      !!duration.concentration,
      duration.duration?.amount ?? null,
      duration.duration?.type || "",
      !!duration.duration?.upTo,
      [...(duration.ends || [])].sort(),
    ],
  };
}

function extractCurrentSpellSummaries(html) {
  const prefix = "const SPELL_RAW=";
  const start = html.indexOf(prefix);
  const end = html.indexOf("/* ============ 法術後設資料", start);
  if (start < 0 || end < 0) throw new Error("Could not locate SPELL_RAW in index.html");
  const literal = html.slice(start + prefix.length, end).trim().replace(/;$/, "");
  const raw = vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1000 });
  const summaries = new Map();
  Object.entries(raw).forEach(([, rows]) => {
    rows.forEach((row) => {
      const [name, , , summary] = row.split("|");
      summaries.set(name, summary || "");
    });
  });
  return summaries;
}

const missingSummaries = {
  "hail-of-thorns": "遠端武器命中後引爆棘刺；目標及其 5 呎內生物進行敏捷豁免，承受 1d10 穿刺傷害，成功減半。",
  "beast-sense": "觸碰一隻自願野獸；專注期間可透過牠的感官感知，並使用牠的特殊感官。",
  "cordon-of-arrows": "將至多四枚箭矢設為警戒；生物靠近或在 30 呎內結束回合時觸發一枚，敏捷豁免失敗受 2d4 穿刺傷害。",
  "melfs-acid-arrow": "遠端法術攻擊；命中造成 4d4 強酸傷害，並在目標下回合結束再受 2d4；未命中只受一半初始傷害。",
  "nystuls-magic-aura": "觸碰自願生物或未被攜帶的物件，改變偵測魔法所得的生物類型或魔法靈光資訊，持續 24 小時。",
  "crusaders-mantle": "專注維持 30 呎靈光；其中你與盟友的武器或徒手命中額外造成 1d4 光耀傷害。",
  "leomunds-tiny-hut": "形成固定的 10 呎半徑防護區域，阻擋施法時區域外的生物與物件，並隔絕三環以下法術穿越。",
  "lightning-arrow": "遠端武器攻擊化為閃電；命中造成 4d8、失手造成一半，目標 10 呎內生物另受 2d8 閃電傷害（敏捷豁免減半）。",
  "leomunds-secret-chest": "將特製箱子藏入以太位面，藉微縮模型召回或送回；60 日後開始有逐日失效風險。",
  "vitriolic-sphere": "20 呎半徑強酸爆發；敏捷豁免失敗先受 10d4，下一回合結束再受 5d4；成功只受一半初始傷害。",
  "summon-celestial": "召喚復仇或守護型天界靈魄；牠在你的回合後行動並服從指令，資料隨施法環階提升。",
  "arcane-gate": "創造兩個相連的單向傳送門；進入其中一門會從另一門離開，並可用附贈動作調整朝向。",
  "otilukes-freezing-sphere": "60 呎半徑寒冰爆發，體質豁免失敗受 10d6 寒冷傷害；也可保留成一分鐘內可投擲或發射的冰球。",
};

const sourceText = fs.readFileSync(sourcePath, "utf8").replace(/^\uFEFF/, "");
const source = JSON.parse(sourceText);
const canonicalContext = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(canonicalNamesPath, "utf8"), canonicalContext, { timeout: 1000 });
const canonicalNames = canonicalContext.globalThis.ZIZI_5R_CANONICAL_NAMES;
if (!canonicalNames?.spells || Object.keys(canonicalNames.spells).length !== 391) {
  throw new Error("Canonical 5R spell-name projection is missing or incomplete. Run scripts/build-5r-canonical-names.py first.");
}
const alignment = readJson(alignmentPath);
const alignmentRows = [...alignment.pairs, ...alignment.missing];
const byIdentifier = new Map(alignmentRows.map((row) => [row.identifier, row]));
const summaries = extractCurrentSpellSummaries(fs.readFileSync(indexPath, "utf8"));
const previousContext = { globalThis: {} };
if (fs.existsSync(outputPath)) vm.runInNewContext(fs.readFileSync(outputPath, "utf8"), previousContext, { timeout: 1000 });
const previousSummariesById = new Map((previousContext.globalThis.SPELLS_2024_TUPLES || []).map((row) => [row[0], row[13] || ""]));
const legacyNames = {};
const canonicalDisplayNames = new Set(Object.values(canonicalNames.spells));

const tuples = source.spell.map((spell) => {
  const identifier = identifierExceptions[spell.ENG_name] || slugifyEnglish(spell.ENG_name);
  const aligned = byIdentifier.get(identifier);
  if (!aligned) throw new Error(`No FVTT alignment for ${spell.ENG_name} (${identifier})`);
  const displayName = canonicalNames.spells[spell.ENG_name] || aligned.site || aligned.name;
  for (const legacyName of [aligned.site, aligned.name]) {
    if (!legacyName || legacyName === displayName || canonicalDisplayNames.has(legacyName)) continue;
    const existing = legacyNames[legacyName];
    if (existing && existing !== displayName) throw new Error(`Legacy spell-name collision: ${legacyName} -> ${existing} / ${displayName}`);
    legacyNames[legacyName] = displayName;
  }
  const summary = previousSummariesById.get(identifier) || summaries.get(displayName) || summaries.get(aligned.site) || summaries.get(aligned.name) || missingSummaries[identifier];
  if (!summary) throw new Error(`No independent Traditional Chinese summary for ${identifier}`);
  const classes = [...new Set((spell.classes?.fromClassList || []).map((entry) => classCodes[entry.name]).filter(Boolean))]
    .sort((a, b) => classOrder.indexOf(a) - classOrder.indexOf(b))
    .join("");
  const duration = spell.duration?.[0];
  const concentration = !!duration?.concentration;
  const ritual = !!spell.meta?.ritual;
  return [
    identifier,
    aligned.id || "",
    spell.ENG_name,
    displayName,
    spell.level,
    spell.school,
    concentration ? 1 : 0,
    ritual ? 1 : 0,
    classes,
    formatTime(spell.time),
    formatRange(spell.range),
    formatComponents(spell.components),
    formatDuration(spell.duration),
    summary,
    spellSignature(spell),
  ];
});

const identifiers = new Set(tuples.map((row) => row[0]));
if (tuples.length !== 391 || identifiers.size !== 391) {
  throw new Error(`Expected 391 unique PHB2024 spells; got ${tuples.length}/${identifiers.size}`);
}

const stat = fs.statSync(sourcePath);
const metadata = {
  authority: "5RTools PHB2024",
  source: "5rtools-2024/data__spells__spells-phb2024.json",
  snapshotMtime: stat.mtime.toISOString(),
  sha256: sha256(sourceText),
  count: tuples.length,
};
const output = [
  "/* Generated by scripts/build-5r-spell-data.js. Structured facts only; no 5RTools prose is vendored. */",
  `globalThis.SPELLS_2024_SOURCE=${JSON.stringify(metadata)};`,
  `globalThis.SPELLS_2024_LEGACY_NAMES=${JSON.stringify(legacyNames)};`,
  "globalThis.SPELLS_2024_TUPLES=[",
  tuples.map((row) => ` ${JSON.stringify(row)}`).join(",\n"),
  "];",
  "",
].join("\n");

fs.writeFileSync(outputPath, output, "utf8");
console.log(JSON.stringify({ outputPath, count: tuples.length, unique: identifiers.size, metadata }));

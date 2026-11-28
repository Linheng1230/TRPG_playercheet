import assert from "node:assert/strict";
import {
  WOW_P1_REFERENCE_COUNTS,
  inspectWowP1ReferenceContract,
  inspectWowP1DisplaySnapshot,
  viewWowP1References,
} from "../assets/wow-dlc-p1-reference.mjs";

const itemId = i => "wow" + String(i).padStart(13, "0");
const effectId = i => "fx" + String(i).padStart(14, "0");
const groupToType = {
  professionMaterial: "loot",
  archaeologyFragment: "loot",
  craftingResidue: "loot",
  factionRenownRule: "renown",
  featureBlessingCharm: "feat",
};
const clone = value => structuredClone(value);
const contract = {
  schema: "wow.website-crafting-source-contract.v2",
  referenceOnly: true,
  namesDraftUnapproved: true,
  sourceBridgeSHA256: "a".repeat(64),
  sourceNative78SHA256: "b".repeat(64),
  release: { publicReleaseAllowed: false },
  entries: [],
  effects: [],
};

let i = 0;
for (const [type, n] of Object.entries(WOW_P1_REFERENCE_COUNTS)) {
  for (let j = 0; j < n; j++) {
    const id = type === "professionMaterial" && j === 0
      ? "wowFish4RareReso" : itemId(i);
    i++;
    const loot = groupToType[type] === "loot";
    const archaeology = type === "archaeologyFragment";
    const conflict = id === "wowFish4RareReso";
    const price = archaeology || conflict ? 0 : (type === "craftingResidue" ? 25 : 10);
    const expected = !loot || archaeology ? null : conflict ? 2500 : price;
    const status = !loot ? "NOT_APPLICABLE" : archaeology
      ? "NATIVE_ZERO_WITHOUT_VALUE_AUTHORIZATION" : conflict
      ? "SOURCE_CONFLICT" : "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
    contract.entries.push({
      id, uuid: "Compendium.dnd-world-warcraft.items.Item." + id,
      source: "wow-official", type,
      sourceType: groupToType[type],
      sourceEnglishName: conflict ? "Fishing Resource (Tier 4, Rare)" : "Synthetic " + type + " " + j,
      proposedZhName: "測試未核准譯名",
      proposedBilingualName: "測試未核准譯名 - private candidate",
      sourceIdQA: "PASS_NATIVE_INDEX", labelQA: "DRAFT_NEEDS_REVIEW",
      mechanicsQA: "NOT_VERIFIED", websiteAccess: "REFERENCE_ONLY",
      autoGrant: false, marketPurchasable: false,
      craftingExecutable: false, published: false,
      price: loot ? { value: price, denomination: "gp" } : null,
      quantity: loot ? 1 : null,
      priceIntegrity: {
        status,
        sourceItemPrice: loot ? { value: price, denomination: "gp" } : null,
        rulebookTableReferenceGp: expected,
        displayReferenceValue: loot && !conflict && !archaeology
          ? { value: price, denomination: "gp" } : null,
        sourceConflictRequiresOwnerReview: conflict,
        allowFreePurchase: false, allowPurchase: false, allowAutoCraft: false,
      },
    });
  }
}

for (let j = 0; j < 7; j++) {
  const id = effectId(j);
  contract.effects.push({
    id, uuid: "Compendium.dnd-world-warcraft.effects.ActiveEffect." + id,
    sourceName: "Synthetic effect " + j,
    nativeMechanicsQA: "NOT_VERIFIED", autoAttach: false,
    published: false,
  });
}

let checks = 0;
const check = fn => { fn(); checks++; };
const rejects = (mutate, reason) => {
  const test = clone(contract);
  mutate(test);
  const result = inspectWowP1ReferenceContract(test);
  assert.equal(result.ok, false, "Expected rejection for " + reason);
};

check(() => {
  assert.equal(contract.entries.length, 118);
  assert.equal(contract.effects.length, 7);
  assert.equal(inspectWowP1ReferenceContract(contract).ok, true);
});

check(() => {
  const result = inspectWowP1ReferenceContract(contract);
  assert.equal(result.rows.length, 118);
  assert.deepEqual(result.counts, WOW_P1_REFERENCE_COUNTS);
  assert.equal(result.playable, false);
  assert.equal(result.sourceAuthenticityVerified, false);
  assert.equal(result.licensedContentReleaseAllowed, false);
  assert(result.rows.every(r => r.purchasable === false &&
    r.craftable === false && r.grantable === false));
  assert(!JSON.stringify(result).includes("測試未核准譯名"));
  assert(!JSON.stringify(result).includes("private candidate"));
});

check(() => {
  const conflict = inspectWowP1ReferenceContract(contract).rows
    .find(r => r.id === "wowFish4RareReso");
  assert.equal(conflict.priceStatus, "SOURCE_CONFLICT");
  assert.equal(conflict.referenceGp, null);
});

check(() => {
  const archaeology = viewWowP1References(contract, { category: "archaeologyFragment" });
  assert.equal(archaeology.count, 34);
  assert(archaeology.rows.every(r => r.referenceGp === null));
  const resources = viewWowP1References(contract, { category: "professionMaterial" });
  assert.equal(resources.count, 40);
  assert.equal(resources.rows.filter(r => r.referenceGp === null).length, 1);
  assert.equal(viewWowP1References(contract, { category: "featureBlessingCharm" }).count, 28);
  assert.equal(viewWowP1References(contract, { query: "synthetic faction" }).count, 12);
  assert.equal(viewWowP1References(contract, { category: "not-a-category" }).ok, false);
  assert.equal(viewWowP1References(contract, { query: "<".repeat(101) }).ok, false);
});

// This is the only browser-eligible object: a reduced projection made by a
// trusted producer. Raw V2 content must not be sent to the browser/UI.
const publicSafe = inspectWowP1ReferenceContract(contract);
check(() => {
  assert.equal(inspectWowP1DisplaySnapshot(publicSafe).ok, true);
  assert.equal(inspectWowP1DisplaySnapshot(contract).ok, false);
  assert.equal("entries" in publicSafe, false);
  assert.equal("effects" in publicSafe, false);
  assert.equal("proposedZhName" in publicSafe.rows[0], false);
});
const snapshotMutations = [
  ["unexpected root private body", x => { x.privateRulesBody = "restricted"; }],
  ["raw source field on a public row", x => { x.rows[1].sourceEnglishName = "raw"; }],
  ["draft source translation on a row", x => { x.rows[1].proposedZhName = "未核准"; }],
  ["paid body injected under novel key", x => { x.rows[1].rulesExtended = "<p>restricted</p>"; }],
  ["backend authenticity forged", x => { x.sourceAuthenticityVerified = true; }],
  ["release capability forged", x => { x.licensedContentReleaseAllowed = true; }],
  ["source conflict value leaked", x => {
    x.rows.find(r => r.id === "wowFish4RareReso").referenceGp = 0;
  }],
  ["archaeology zero as free", x => {
    x.rows.find(r => r.type === "archaeologyFragment").priceStatus =
      "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
  }],
  ["unsafe HTML label", x => { x.rows[1].label = "<img src=x onerror=alert(1)>"; }],
  ["unknown category injected", x => { x.rows[1].type = "new-gameplay-resource"; }],
  ["duplicate source ID", x => { x.rows[1].id = x.rows[0].id; }],
  ["source UUID changed", x => { x.rows[1].uuid = "Compendium.other"; }],
  ["category count tampered", x => { x.counts.archaeologyFragment = 35; }],
  ["new unreviewed reference status", x => { x.rows[1].priceStatus = "PURCHASE_READY"; }],

  ["known conflict display source ID swapped", x => {
    const row = x.rows.find(r => r.id === "wowFish4RareReso");
    row.id = "wow" + "8".repeat(13);
    row.uuid = "Compendium.dnd-world-warcraft.items.Item." + row.id;
  }],
  ["known conflict status forged as matching source", x => {
    const row = x.rows.find(r => r.id === "wowFish4RareReso");
    row.priceStatus = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
    row.referenceGp = 2500;
  }],
  ["blank public label", x => { x.rows[2].label = " \t "; }],
  ["control character in public label", x => { x.rows[2].label = "X\u0000Y"; }],
  ["archaeology incorrectly shown as normal-priced", x => {
    const row = x.rows.find(r => r.type === "archaeologyFragment");
    row.priceStatus = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
    row.referenceGp = 10;
  }],
  ["renown shown as merchandise", x => {
    const row = x.rows.find(r => r.type === "factionRenownRule");
    row.priceStatus = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
    row.referenceGp = 50;
  }],

];
for (const [name, mutate] of snapshotMutations) {
  check(() => {
    const broken = structuredClone(publicSafe);
    mutate(broken);
    assert.equal(inspectWowP1DisplaySnapshot(broken).ok, false,
      "Expected browser-bound rejection: " + name);
  });
}

const mutations = [
  ["silent conflict price correction", x => x.entries[0].price.value = 2500],
  ["source Item price rewritten", x => x.entries[0].priceIntegrity.sourceItemPrice.value = 2500],
  ["source gathering value suppressed", x => x.entries[0].priceIntegrity.rulebookTableReferenceGp = 0],
  ["conflict status hidden", x => x.entries[0].priceIntegrity.status = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY"],
  ["conflict displayed as free", x => x.entries[0].priceIntegrity.displayReferenceValue = { value: 0, denomination: "gp" }],
  ["zero archaeology displayed as free", x => x.entries[40].priceIntegrity.displayReferenceValue = { value: 0, denomination: "gp" }],
  ["zero archaeology status changed", x => x.entries[40].priceIntegrity.status = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY"],
  ["auto purchase flag", x => x.entries[1].priceIntegrity.allowPurchase = true],
  ["free purchase flag", x => x.entries[0].priceIntegrity.allowFreePurchase = true],
  ["crafting enabled", x => x.entries[1].craftingExecutable = true],
  ["auto item grant", x => x.entries[2].autoGrant = true],
  ["auto renown grant", x => x.entries.find(r => r.type === "factionRenownRule").autoGrant = true],
  ["market purchased item", x => x.entries[1].marketPurchasable = true],
  ["paid rule description", x => x.entries[1].description = "restricted rules"],
  ["paid private HTML", x => x.entries[1].translatedHTML = "<p>licensed</p>"],
  ["private raw item state", x => x.entries[1].system = { description: "not public" }],
  ["HTML injection into public name", x => x.entries[1].sourceEnglishName = "<img src=x>"],
  ["duplicate canonical item ID", x => x.entries[1].id = x.entries[0].id],
  ["incorrect UUID target", x => x.entries[2].uuid = "Compendium.other.items.Item." + x.entries[2].id],
  ["wrong type for feature", x => x.entries.find(r => r.type === "featureBlessingCharm").sourceType = "loot"],
  ["unknown official category", x => x.entries[2].type = "fakeProfession"],
  ["bad category count", x => x.entries.pop()],
  ["release allowed", x => x.release.publicReleaseAllowed = true],
  ["wrong private source fingerprint", x => x.sourceBridgeSHA256 = "fake"],
  ["draft name falsely approved", x => x.entries[2].labelQA = "PASS"],
  ["effect auto-attach", x => x.effects[0].autoAttach = true],
  ["effect paid description", x => x.effects[0].description = "private effect"],
  ["effect wrong UUID", x => x.effects[0].uuid = "invalid"],
  ["effect list incomplete", x => x.effects.pop()],
  ["source type changed", x => x.entries[3].source = "unknown"],
  ["source mechanics fake approval", x => x.entries[3].mechanicsQA = "PASS"],
  ["private content explicit publication", x => x.entries[4].published = true],
  ["not-reference mode", x => x.referenceOnly = false],
  ["fake contract version", x => x.schema = "wow.website-crafting-source-contract.v1"],
];
for (const [name, mutation] of mutations)
  check(() => rejects(mutation, name));

const sourceOwnerRegressions = [
  ["known conflict disguised by setting both values 0", x => {
    x.entries[0].priceIntegrity.status = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
    x.entries[0].priceIntegrity.rulebookTableReferenceGp = 0;
    x.entries[0].priceIntegrity.displayReferenceValue = { value: 0, denomination: "gp" };
  }],
  ["known conflict disguised by setting both values 2500", x => {
    x.entries[0].price.value = 2500;
    x.entries[0].priceIntegrity.sourceItemPrice.value = 2500;
    x.entries[0].priceIntegrity.rulebookTableReferenceGp = 2500;
    x.entries[0].priceIntegrity.status = "SOURCE_AGREEMENT_REFERENCE_VALUE_ONLY";
    x.entries[0].priceIntegrity.displayReferenceValue = { value: 2500, denomination: "gp" };
  }],
  ["known conflict source identifier swapped", x => {
    const row = x.entries[0];
    row.id = "wow" + "9".repeat(13);
    row.uuid = "Compendium.dnd-world-warcraft.items.Item." + row.id;
  }],
  ["source SHA array coerced to valid hex", x => {
    x.sourceBridgeSHA256 = ["a".repeat(64)];
  }],
  ["native SHA array coerced to valid hex", x => {
    x.sourceNative78SHA256 = ["b".repeat(64)];
  }],
  ["source label all spaces", x => {
    x.entries[2].sourceEnglishName = "   ";
  }],
  ["source label contains control character", x => {
    x.entries[2].sourceEnglishName = "Legal\u0001label";
  }],
  ["source label contains zero-width format character", x => {
    x.entries[2].sourceEnglishName = "Legal\u200blabel";
  }],
];
for (const [name, mutation] of sourceOwnerRegressions)
  check(() => rejects(mutation, name));

check(() => {
  assert.equal(viewWowP1References(contract, null).ok, false);
});
check(() => {
  assert.equal(viewWowP1References(contract, []).ok, false);
});
check(() => {
  assert.equal(viewWowP1References(contract, "bad").ok, false);
});


console.log(JSON.stringify({
  status: "PASS_P1_PUBLIC_SAFE_SOURCE_GUARD_ONLY",
  assertions: checks,
  positiveCases: 5,
  negativeMutations: mutations.length + snapshotMutations.length + sourceOwnerRegressions.length + 3,
  scopedItems: 118,
  scopedEffects: 7,
  officialSourceSemantics: "NOT_VERIFIED",
  liveUAT: "NOT_VERIFIED",
  release: "HOLD",
}));

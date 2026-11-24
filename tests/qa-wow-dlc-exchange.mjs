import assert from "node:assert/strict";
import { WOW_BASE_CLASS_IDS, WOW_DLC_ID } from "../assets/wow-dlc-policy.mjs";
import { WOW_DLC_CHANNELS, preserveRawDlcJsonBackup,
  inspectWowDlcExchange } from "../assets/wow-dlc-exchange.mjs";

const catalogue = new Map([
  ["wow:orc", { origin: "wow", requiresGmApproval: false }],
  ["wow:gnome", { origin: "wow", requiresGmApproval: false }],
  ["wow:human", { origin: "wow", requiresGmApproval: false }],
  ["5r:tiefling", { origin: "dnd5r", requiresGmApproval: true }],
]);
const campaignId = "deadmines-20261219";
const samples = [
  { id: "player-1", species: "wow:orc", origin: "wow", cls: "warrior" },
  { id: "player-2", species: "wow:gnome", origin: "wow", cls: "mage" },
  { id: "player-3", species: "5r:tiefling", origin: "dnd5r", cls: "rogue" },
  { id: "player-4", species: "wow:human", origin: "wow", cls: "death-knight" },
];
const approvals = new Map();
const heroWaivers = new Map(), heroSubclassLocks = new Set();
for (const s of samples) {
  if (s.origin === "dnd5r")
    approvals.set(JSON.stringify([campaignId, s.id, s.species]), true);
  if (s.cls === "death-knight") {
    const key = JSON.stringify([campaignId, s.id, s.cls]);
    heroWaivers.set(key, true);
    heroSubclassLocks.add(key);
  }
}
const allGates = Object.fromEntries([
  "entitlement", "privateDelivery", "translationSemanticQA",
  "mechanicsParity", "ownerLease", "integrationQA", "liveUAT", "readback",
].map(k => [k, true]));
let plans = 0, backups = 0;
for (const s of samples) {
  const core = WOW_BASE_CLASS_IDS[s.cls];
  const context = { catalogue, campaignId, characterId: s.id,
    gmApprovals: approvals, gmHeroWaivers: heroWaivers, heroSubclassLocks };
  const save = { v: 10, ruleset: "2024", dlcId: WOW_DLC_ID, id: s.id,
    level: 2, dlcSpeciesSource: { origin: s.origin, id: s.species },
    dlcClassId: s.cls, dlcClassCoreId: core, classLevels: { [core]: 2 },
    futureUnknownFields: { neverLoseMe: [1, 2, 3] } };
  const raw = JSON.stringify(save, null, 2);
  const backup = preserveRawDlcJsonBackup(raw);
  assert.equal(backup.ok, true);
  assert.equal(backup.raw, raw);
  assert.equal(backup.playable, false);
  assert.equal(JSON.parse(backup.raw).futureUnknownFields.neverLoseMe.length, 3);
  backups++;
  const classChoice = { wowClassId: s.cls, coreClassId: core, level: 2 };
  for (const channel of WOW_DLC_CHANNELS) {
    const notReady = inspectWowDlcExchange({ channel, save, classChoice, context });
    assert.equal(notReady.reason, "PRIVATE_RELEASE_GATES_PENDING");
    assert.equal(notReady.ok, false);
    assert.equal(notReady.playable, false);
    const allBooleanPass = inspectWowDlcExchange({
      channel, save, classChoice, context, gates: allGates });
    assert.equal(allBooleanPass.reason, "PROTECTED_RUNTIME_ADAPTER_NOT_CONNECTED");
    assert.equal(allBooleanPass.playable, false);
    plans += 2;
  }
  const denied = inspectWowDlcExchange({
    channel: "cloud", save: { ...save, gmApproval: "approved" }, classChoice,
    context: { ...context, gmApprovals: new Map(), gmHeroWaivers: new Map(),
      heroSubclassLocks: new Set() }, gates: allGates });
  assert.equal(denied.ok, false);
  if (s.origin === "dnd5r" || s.cls === "death-knight")
    assert.notEqual(denied.reason, "PROTECTED_RUNTIME_ADAPTER_NOT_CONNECTED",
      "special/hero GM approvals must be revalidated, not read from client JSON");
  const injected = { ...save, ruleset: "2014" };
  assert.equal(inspectWowDlcExchange({ channel: "pdf", save: injected, classChoice,
    context, gates: allGates }).reason, "CORE_RULESET_MISMATCH");
  const fakeCore = { ...save, dlcClassCoreId: "wizard" };
  if (core !== "wizard")
    assert.equal(inspectWowDlcExchange({ channel: "fvtt", save: fakeCore,
      classChoice, context, gates: allGates }).reason, "CLASS_SOURCE_MISMATCH");
}
const reference = { id: "sample-1", dlcId: WOW_DLC_ID };
const pretty = JSON.stringify(reference, null, 2);
assert.equal(preserveRawDlcJsonBackup(pretty).raw, pretty);
assert.equal(preserveRawDlcJsonBackup("not json").reason, "INVALID_JSON");
assert.equal(preserveRawDlcJsonBackup(JSON.stringify({ id: "sample-1" })).reason,
  "NOT_A_DLC_CHARACTER");
assert.equal(preserveRawDlcJsonBackup(JSON.stringify({ id: "sample-1", dlcId: "x".repeat(1000) })).reason,
  "NOT_A_DLC_CHARACTER");
assert.equal(preserveRawDlcJsonBackup(pretty, 5).reason, "INVALID_OR_OVERSIZE_BACKUP");
assert.equal(inspectWowDlcExchange({ channel: "unknown" }).reason,
  "UNKNOWN_EXCHANGE_CHANNEL");
assert.equal(inspectWowDlcExchange({ channel: "json", save: {} }).reason,
  "NOT_WOW_DLC_SAVE");
console.log("PASS wow-dlc-exchange: 4 synthetic Lv2 contracts, " +
  backups + " byte-preserving backups, " + plans +
  " fail-closed save/json/pdf/cloud/fvtt scenarios, GM/edition/source negatives");

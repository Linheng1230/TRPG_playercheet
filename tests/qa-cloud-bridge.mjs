import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  CloudBridgeError,
  RevisionConflictError,
  parseNativeCharacterJson,
  parseNativeRosterJson,
  prepareCharacterImport,
  createCharacterExport,
  createCloudService,
} from "../cloud/bridge.mjs";

function sample(v = 10, ruleset = "2024", id = "c-demo-001") {
  return {
    v, ruleset, id, ts: 1730000000000, cls: "戰士",
    base: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    rolled: [], skills: ["運動"], level: 1, asi: {},
    meta: { name: "測試冒險者" }, play: { hp: 9, hpMax: 9, notes: "" },
    slotsUsed: {}, classChoices2024: { fighter: { test: "keep" } },
  };
}

function mockClient({ errorByRpc = {} } = {}) {
  const calls = [];
  const supabase = {
    rpc(name, args) {
      calls.push({ name, args });
      return Promise.resolve(
        errorByRpc[name]
          ? { data: null, error: errorByRpc[name] }
          : { data: { id: "00000000-0000-4000-8000-000000000001", revision: 1 }, error: null },
      );
    },
    from(table) {
      calls.push({ table });
      return {
        select(columns) {
          calls.push({ select: columns });
          return {
            order: () => Promise.resolve({ data: [], error: null }),
            then: (resolve) => resolve({ data: [], error: null }),
          };
        },
      };
    },
  };
  return { supabase, calls };
}

test("v10 2024 and v9 2014 snapshots round-trip without rewriting native state", () => {
  for (const [version, ruleset] of [[10, "2024"], [9, "2014"]]) {
    const source = sample(version, ruleset);
    const parsed = parseNativeCharacterJson(JSON.stringify({ _save: source, version: "readable" }));
    assert.equal(parsed.version, version);
    assert.equal(parsed.ruleset, ruleset);
    assert.equal(parsed.localCharacterId, source.id);
    assert.deepEqual(parsed.save, source);
    assert.deepEqual(parseNativeCharacterJson(createCharacterExport(source)).save, source);
    assert.equal(parsed.legacyV9, version === 9);
  }
});

test("native roster backup can be parsed but never silently uploads", () => {
  const roster = { type: "dnd5r-roster", v: 10, count: 2, chars: [sample(), sample(9, "2014", "c-2014")] };
  const parsed = parseNativeRosterJson(JSON.stringify(roster));
  assert.equal(parsed.count, 2);
  assert.deepEqual(parsed.characters.map(x => x.ruleset), ["2024", "2014"]);
  assert.throws(() => parseNativeCharacterJson(roster), (err) => err instanceof CloudBridgeError);
});

test("unsupported formats and unsafe keys are rejected before any request", () => {
  assert.throws(() => parseNativeCharacterJson({ ...sample(), v: 11 }), /version|accepts/i);
  assert.throws(() => parseNativeCharacterJson({ ...sample(), unexpectedField: true }), /Unknown native save field/);
  assert.throws(() => parseNativeCharacterJson("{\"__proto__\":{},\"v\":10}"), /Forbidden|reserved|key|schema/i);
  assert.throws(() => parseNativeCharacterJson("[".repeat(300)), CloudBridgeError);
});

test("prepared import fingerprint equals server SHA-256 identity and is required for RPC", async () => {
  const { supabase, calls } = mockClient();
  const cloud = createCloudService(supabase);
  await assert.rejects(() => cloud.commitCharacterImport({ save: sample(), fingerprint: "forged" }), /prepareCharacterImport/i);
  assert.equal(calls.length, 0);
  const prepared = await prepareCharacterImport(JSON.stringify(sample()));
  const expected = createHash("sha256").update("2024:c-demo-001").digest("hex");
  assert.equal(prepared.fingerprint, expected);
  assert.equal(prepared.requiresExplicitCommit, true);
  const result = await cloud.commitCharacterImport(prepared);
  assert.equal(result.revision, 1);
  assert.equal(calls[0].name, "create_character");
  assert.deepEqual(calls[0].args.p_payload, sample());
  assert.equal(calls[0].args.p_import_fingerprint, expected);
});

test("CAS update requires revision and preserves provider conflict classification", async () => {
  const cloudId = "00000000-0000-4000-8000-000000000001";
  const { supabase, calls } = mockClient({
    errorByRpc: { update_character_cas: { code: "40001", message: "revision_conflict" } },
  });
  const cloud = createCloudService(supabase);
  await assert.rejects(
    () => cloud.updateCharacter({ cloudCharacterId: cloudId, expectedRevision: 1, save: sample() }),
    RevisionConflictError,
  );
  assert.equal(calls[0].name, "update_character_cas");
  assert.equal(calls[0].args.p_expected_revision, 1);
  await assert.rejects(
    () => cloud.updateCharacter({ cloudCharacterId: cloudId, expectedRevision: 0, save: sample() }),
    CloudBridgeError,
  );
});

test("DM read uses read-only RPC and does not expose a write-other-character method", async () => {
  const id = "00000000-0000-4000-8000-000000000001";
  const { supabase, calls } = mockClient();
  const cloud = createCloudService(supabase);
  await cloud.listDmLinkedCharacters(id);
  assert.equal(calls[0].name, "list_linked_characters");
  assert.equal(typeof cloud.updateOtherCharacter, "undefined");
  assert.equal(typeof cloud.setMemberRole, "undefined");
});

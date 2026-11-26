const HAS_OWN = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

export const CLOUD_BRIDGE_LIMITS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxDepth: 40,
  maxKeys: 20_000,
  maxNodes: 30_000,
  maxArrayLength: 10_000,
  maxStringLength: 1_750_000,
  maxKeyLength: 512,
  maxRosterCharacters: 1_000,
});

const ALLOWED_SAVE_VERSIONS = new Set([9, 10]);
const ALLOWED_RULESETS = new Set(["2014", "2024"]);
const LOCAL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVITE_PATTERN = /^[A-Za-z0-9_-]{16,256}$/;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const PREPARED_IMPORTS = new WeakSet();

const NATIVE_TOP_LEVEL_KEYS = new Set([
  "v", "ruleset", "id", "ts", "cls", "classConfirmed", "bg", "sp",
  "bgConfirmed", "spConfirmed", "abilitiesConfirmed", "sub", "subName",
  "subConfirmed", "speciesChoicesConfirmed", "method", "base", "rolled",
  "bonusMode", "bonus", "skills", "skillsConfirmed", "level", "classLevels",
  "classSubs", "spellByClass", "asiByClass", "startGear14", "classChoices14",
  "classChoices2024", "hpMode", "hpRolls", "hpRollsByClass", "asi",
  "featConfirmed", "boon", "boonConfirmed", "boonAb", "boonChoices", "style",
  "styleCantrips2024", "mastery", "primalSkill", "primalSkillConfirmed",
  "spChoices", "bgChoices14", "bgChoice2024", "originFeatChoices",
  "languageChoices", "languageLocks", "gear", "showAC", "portrait", "cantrips",
  "spellbook", "prepared", "customSpells", "metamagic", "featSpells",
  "invocations", "expertise", "divineOrder", "primalOrder", "blessed", "efury",
  "slotsUsed", "bio", "familiar", "creatureLibrary", "play", "meta",
  "sessionResourceLimits",
]);

const REQUIRED_NATIVE_KEYS = [
  "v", "ruleset", "id", "ts", "cls", "base", "rolled", "skills", "level",
  "asi", "meta",
];

export class CloudBridgeError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "CloudBridgeError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

export class RevisionConflictError extends CloudBridgeError {
  constructor(message = "The cloud character changed since it was loaded.", details = undefined) {
    super("REVISION_CONFLICT", message, details);
    this.name = "RevisionConflictError";
  }
}

function fail(code, message, details) {
  throw new CloudBridgeError(code, message, details);
}

function utf8Bytes(text) {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  const bytes = [];
  for (const character of text) {
    const point = character.codePointAt(0);
    if (point <= 0x7f) bytes.push(point);
    else if (point <= 0x7ff) {
      bytes.push(0xc0 | (point >>> 6), 0x80 | (point & 0x3f));
    } else if (point <= 0xffff) {
      bytes.push(
        0xe0 | (point >>> 12),
        0x80 | ((point >>> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    } else {
      bytes.push(
        0xf0 | (point >>> 18),
        0x80 | ((point >>> 12) & 0x3f),
        0x80 | ((point >>> 6) & 0x3f),
        0x80 | (point & 0x3f),
      );
    }
  }
  return Uint8Array.from(bytes);
}

function byteLength(text) {
  return utf8Bytes(text).byteLength;
}

function isPlainRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function inspectJsonTree(root) {
  const seen = new WeakSet();
  const stack = [{ value: root, depth: 0, path: "$" }];
  let keyCount = 0;
  let nodeCount = 0;

  while (stack.length) {
    const { value, depth, path } = stack.pop();
    nodeCount += 1;
    if (nodeCount > CLOUD_BRIDGE_LIMITS.maxNodes) {
      fail("TOO_MANY_NODES", "The JSON contains too many values.");
    }
    if (depth > CLOUD_BRIDGE_LIMITS.maxDepth) {
      fail("TOO_DEEP", "The JSON nesting depth exceeds the import limit.", { path });
    }

    if (value === null || typeof value === "boolean") continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) fail("NOT_JSON_VALUE", "Non-finite numbers are not valid JSON.", { path });
      continue;
    }
    if (typeof value === "string") {
      if (value.length > CLOUD_BRIDGE_LIMITS.maxStringLength) {
        fail("STRING_TOO_LONG", "A JSON string exceeds the import limit.", { path });
      }
      continue;
    }
    if (typeof value !== "object") {
      fail("NOT_JSON_VALUE", "The input contains a value that JSON cannot represent.", { path });
    }
    if (seen.has(value)) {
      fail("NOT_JSON_VALUE", "The input contains a cycle or shared object reference.", { path });
    }
    seen.add(value);

    if (Array.isArray(value)) {
      if (value.length > CLOUD_BRIDGE_LIMITS.maxArrayLength) {
        fail("ARRAY_TOO_LONG", "A JSON array exceeds the import limit.", { path });
      }
      const ownKeys = Reflect.ownKeys(value).filter((key) => key !== "length");
      if (ownKeys.some((key) => typeof key !== "string") || ownKeys.length !== value.length) {
        fail("NOT_JSON_VALUE", "Sparse arrays and arrays with custom properties are not accepted.", { path });
      }
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          fail("NOT_JSON_VALUE", "Array accessors are not accepted.", { path: `${path}[${index}]` });
        }
        stack.push({ value: descriptor.value, depth: depth + 1, path: `${path}[${index}]` });
      }
      continue;
    }

    if (!isPlainRecord(value)) {
      fail("NOT_JSON_VALUE", "Only plain JSON objects are accepted.", { path });
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") fail("NOT_JSON_VALUE", "Symbol keys are not valid JSON.", { path });
      keyCount += 1;
      if (keyCount > CLOUD_BRIDGE_LIMITS.maxKeys) {
        fail("TOO_MANY_KEYS", "The JSON contains too many object keys.");
      }
      if (key.length > CLOUD_BRIDGE_LIMITS.maxKeyLength) {
        fail("KEY_TOO_LONG", "A JSON object key exceeds the import limit.", { path });
      }
      if (FORBIDDEN_KEYS.has(key)) {
        fail("FORBIDDEN_KEY", "The JSON contains a forbidden object key.", { path, key });
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        fail("NOT_JSON_VALUE", "Object accessors and hidden properties are not accepted.", { path, key });
      }
      stack.push({ value: descriptor.value, depth: depth + 1, path: `${path}.${key}` });
    }
  }
}

function cloneAndFreezeJson(value) {
  const clone = JSON.parse(JSON.stringify(value));
  const stack = [clone];
  while (stack.length) {
    const current = stack.pop();
    if (current && typeof current === "object") {
      for (const child of Object.values(current)) {
        if (child && typeof child === "object") stack.push(child);
      }
      Object.freeze(current);
    }
  }
  return clone;
}

function decodeJsonInput(input) {
  let root;
  let serialized;

  if (typeof input === "string") {
    if (byteLength(input) > CLOUD_BRIDGE_LIMITS.maxBytes) {
      fail("INPUT_TOO_LARGE", "The JSON file exceeds the cloud import size limit.");
    }
    try {
      root = JSON.parse(input);
    } catch {
      fail("INVALID_JSON", "The selected file is not valid JSON.");
    }
    serialized = input;
  } else {
    root = input;
    inspectJsonTree(root);
    try {
      serialized = JSON.stringify(root);
    } catch {
      fail("NOT_JSON_VALUE", "The input cannot be represented as JSON.");
    }
    if (typeof serialized !== "string") fail("NOT_JSON_VALUE", "The input must be a JSON object.");
    if (byteLength(serialized) > CLOUD_BRIDGE_LIMITS.maxBytes) {
      fail("INPUT_TOO_LARGE", "The JSON object exceeds the cloud import size limit.");
    }
  }

  inspectJsonTree(root);
  return { root, byteLength: byteLength(serialized) };
}

function assertNullableString(value, field) {
  if (value !== null && typeof value !== "string") {
    fail("BAD_SCHEMA", `Native save field ${field} must be a string or null.`);
  }
}

function validateNativeSave(save) {
  if (!isPlainRecord(save)) fail("BAD_SCHEMA", "The native character save must be a JSON object.");
  for (const key of REQUIRED_NATIVE_KEYS) {
    if (!HAS_OWN(save, key)) fail("BAD_SCHEMA", `Native save field ${key} is required.`);
  }
  for (const key of Object.keys(save)) {
    if (!NATIVE_TOP_LEVEL_KEYS.has(key)) {
      fail("BAD_SCHEMA", `Unknown native save field ${key}.`);
    }
  }

  if (!Number.isInteger(save.v) || !ALLOWED_SAVE_VERSIONS.has(save.v)) {
    fail("UNSUPPORTED_VERSION", "Cloud preview accepts native save versions 9 and 10 only.", { version: save.v });
  }
  if (!ALLOWED_RULESETS.has(save.ruleset)) {
    fail("BAD_RULESET", "Native save ruleset must be 2014 or 2024.");
  }
  if (typeof save.id !== "string" || !LOCAL_ID_PATTERN.test(save.id)) {
    fail("BAD_LOCAL_ID", "Native save id is missing or invalid.");
  }
  if (!Number.isSafeInteger(save.ts) || save.ts < 0) {
    fail("BAD_SCHEMA", "Native save ts must be a non-negative integer.");
  }
  if (!Number.isInteger(save.level) || save.level < 1 || save.level > 20) {
    fail("BAD_SCHEMA", "Native save level must be an integer from 1 through 20.");
  }
  assertNullableString(save.cls, "cls");
  if (!isPlainRecord(save.base)) fail("BAD_SCHEMA", "Native save base must be an object.");
  for (const ability of ["str", "dex", "con", "int", "wis", "cha"]) {
    if (!HAS_OWN(save.base, ability)) fail("BAD_SCHEMA", `Native save base.${ability} is required.`);
    const score = save.base[ability];
    if (score !== null && (!Number.isFinite(score) || !Number.isInteger(score))) {
      fail("BAD_SCHEMA", `Native save base.${ability} must be an integer or null.`);
    }
  }
  if (!Array.isArray(save.rolled) || !Array.isArray(save.skills)) {
    fail("BAD_SCHEMA", "Native save rolled and skills fields must be arrays.");
  }
  if (!save.skills.every((skill) => typeof skill === "string")) {
    fail("BAD_SCHEMA", "Native save skills entries must be strings.");
  }
  if (!isPlainRecord(save.asi) || !isPlainRecord(save.meta)) {
    fail("BAD_SCHEMA", "Native save asi and meta fields must be objects.");
  }
  for (const [key, value] of Object.entries(save.meta)) {
    if (value !== null && typeof value !== "string") {
      fail("BAD_SCHEMA", `Native save meta.${key} must be a string or null.`);
    }
  }
}

/**
 * Parse a single native character save without invoking the app's deserializer.
 * This function never migrates or commits data. Version 9 is preserved verbatim
 * and flagged so the UI can explain that it is a legacy manual import.
 */
export function parseNativeCharacterJson(input) {
  const decoded = decodeJsonInput(input);
  const { root } = decoded;
  if (!isPlainRecord(root)) fail("BAD_SCHEMA", "A character import must be a JSON object.");

  if (root.type === "dnd5r-roster" || root.type === "dnd5r-cloud-roster" || Array.isArray(root.chars)) {
    fail("ROSTER_NOT_CHARACTER", "Roster backups cannot be imported as a single character.");
  }

  let source = "raw";
  let candidate = root;
  if (HAS_OWN(root, "_save")) {
    source = "_save";
    candidate = root._save;
  } else if (HAS_OWN(root, "職業") || HAS_OWN(root, "屬性") || HAS_OWN(root, "版本")) {
    fail("READABLE_EXPORT_UNSUPPORTED", "Readable-only exports do not contain a complete native save.");
  }

  validateNativeSave(candidate);
  const save = cloneAndFreezeJson(candidate);
  const payloadByteLength = byteLength(JSON.stringify(save));
  if (payloadByteLength > CLOUD_BRIDGE_LIMITS.maxBytes) {
    fail("INPUT_TOO_LARGE", "The native save payload exceeds the cloud import size limit.");
  }

  return Object.freeze({
    save,
    source,
    version: save.v,
    ruleset: save.ruleset,
    localCharacterId: save.id,
    byteLength: decoded.byteLength,
    payloadByteLength,
    legacyV9: save.v === 9,
  });
}

const SHA256_CONSTANTS = Object.freeze([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotateRight(value, shift) {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Fallback(bytes) {
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let index = 0; index < 4; index += 1) {
    padded[paddedLength - 8 + index] = (high >>> (24 - index * 8)) & 0xff;
    padded[paddedLength - 4 + index] = (low >>> (24 - index * 8)) & 0xff;
  }

  const hash = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const words = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const position = offset + index * 4;
      words[index] = (
        (padded[position] << 24) |
        (padded[position + 1] << 16) |
        (padded[position + 2] << 8) |
        padded[position + 3]
      ) >>> 0;
    }
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15];
      const y = words[index - 2];
      const small0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const small1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + small0 + words[index - 7] + small1) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const big1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (h + big1 + choose + SHA256_CONSTANTS[index] + words[index]) >>> 0;
      const big0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (big0 + majority) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0;
    hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0;
    hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0;
    hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0;
    hash[7] = (hash[7] + h) >>> 0;
  }

  return [...hash].map((word) => word.toString(16).padStart(8, "0")).join("");
}

async function sha256Hex(text) {
  const bytes = utf8Bytes(text);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }
  return sha256Fallback(bytes);
}

/** Prepare a non-mutating preview. No Supabase call occurs here. */
export async function prepareCharacterImport(input) {
  const parsed = parseNativeCharacterJson(input);
  const fingerprint = await sha256Hex(`${parsed.ruleset}:${parsed.localCharacterId}`);
  const prepared = Object.freeze({
    ...parsed,
    fingerprint,
    requiresExplicitCommit: true,
  });
  PREPARED_IMPORTS.add(prepared);
  return prepared;
}

export function createCharacterExport(save) {
  const parsed = parseNativeCharacterJson(save);
  return cloneAndFreezeJson({
    type: "dnd5r-cloud-character",
    exportVersion: 1,
    _save: parsed.save,
  });
}

function rowPayload(row) {
  if (isPlainRecord(row) && HAS_OWN(row, "payload")) return row.payload;
  if (isPlainRecord(row) && HAS_OWN(row, "save")) return row.save;
  return row;
}

/**
 * Validate an existing guest roster backup without importing it. The service has
 * no batch-commit method, so callers must still preview and commit characters one
 * at a time if a future UI chooses to support roster restore.
 */
export function parseNativeRosterJson(input) {
  const decoded = decodeJsonInput(input);
  const { root } = decoded;
  if (!isPlainRecord(root) || root.type !== "dnd5r-roster" || !Array.isArray(root.chars)) {
    fail("BAD_ROSTER", "The file is not a native dnd5r-roster backup.");
  }
  if (!Number.isInteger(root.v) || !ALLOWED_SAVE_VERSIONS.has(root.v)) {
    fail("UNSUPPORTED_VERSION", "Roster backups must use native save version 9 or 10.");
  }
  if (root.chars.length > CLOUD_BRIDGE_LIMITS.maxRosterCharacters) {
    fail("BAD_ROSTER", "Roster backup exceeds the character count limit.");
  }
  if (HAS_OWN(root, "count") && root.count !== root.chars.length) {
    fail("BAD_ROSTER", "Roster count does not match its character array.");
  }
  const characters = Object.freeze(root.chars.map((save) => parseNativeCharacterJson(save)));
  return Object.freeze({
    version: root.v,
    count: characters.length,
    byteLength: decoded.byteLength,
    characters,
  });
}

/** Build the existing guest-compatible dnd5r-roster envelope. Cloud UUIDs stay out of native saves. */
export function createRosterExport(rows, options = {}) {
  if (!Array.isArray(rows)) fail("BAD_ROSTER", "Roster export input must be an array.");
  if (rows.length > CLOUD_BRIDGE_LIMITS.maxRosterCharacters) {
    fail("BAD_ROSTER", "Roster export exceeds the character count limit.");
  }
  const chars = rows.map((row) => parseNativeCharacterJson(rowPayload(row)).save);
  const timestamp = options.timestamp ?? Date.now();
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) fail("BAD_ROSTER", "Roster timestamp is invalid.");
  return cloneAndFreezeJson({
    type: "dnd5r-roster",
    v: 10,
    ts: timestamp,
    count: chars.length,
    chars,
  });
}

function requireUuid(value, field) {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    fail("BAD_ARGUMENT", `${field} must be a UUID.`);
  }
  return value;
}

function requireExpectedRevision(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    fail("BAD_ARGUMENT", "expectedRevision must be a positive integer.");
  }
  return value;
}

function mutationResult(data) {
  return Array.isArray(data) && data.length === 1 ? data[0] : data;
}

function looksLikeRevisionConflict(error) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(" ");
  return error?.code === "40001" || /revision[_ -]?conflict|stale revision|compare.and.swap/i.test(text);
}

function remoteFailure(operation, error, { cas = false } = {}) {
  const details = Object.freeze({ operation, providerCode: error?.code || null });
  if (cas && looksLikeRevisionConflict(error)) {
    throw new RevisionConflictError("The cloud character was updated elsewhere; reload before saving.", details);
  }
  throw new CloudBridgeError("REMOTE_ERROR", `${operation} failed.`, details);
}

async function execute(operation, request, options) {
  let result;
  try {
    result = await request;
  } catch (error) {
    remoteFailure(operation, error, options);
  }
  if (!result || typeof result !== "object" || !("data" in result) || !("error" in result)) {
    fail("BAD_CLIENT", `Supabase returned an invalid response for ${operation}.`);
  }
  if (result.error) remoteFailure(operation, result.error, options);
  return result.data;
}

function orderedSelect(supabase, table, columns, orderColumn) {
  let query = supabase.from(table).select(columns);
  if (typeof query?.order === "function") query = query.order(orderColumn, { ascending: false });
  return query;
}

/**
 * Create the only cloud data adapter used by the preview page. Authorization is
 * still enforced by Postgres RLS and SECURITY DEFINER checks, not by this module.
 */
export function createCloudService(supabase) {
  if (!supabase || typeof supabase.rpc !== "function" || typeof supabase.from !== "function") {
    fail("BAD_CLIENT", "An injected Supabase-compatible client is required.");
  }

  return Object.freeze({
    async listOwnCharacters() {
      return execute(
        "listOwnCharacters",
        orderedSelect(
          supabase,
          "characters",
          "id,revision,local_character_id,ruleset,save_version,payload,created_at,updated_at",
          "updated_at",
        ),
      );
    },

    async commitCharacterImport(prepared) {
      if (!prepared || !PREPARED_IMPORTS.has(prepared)) {
        fail("IMPORT_NOT_PREPARED", "Call prepareCharacterImport and show its preview before committing.");
      }
      const data = await execute(
        "commitCharacterImport",
        supabase.rpc("create_character", {
          p_payload: prepared.save,
          p_import_fingerprint: prepared.fingerprint,
        }),
      );
      return mutationResult(data);
    },

    async updateCharacter({ cloudCharacterId, expectedRevision, save } = {}) {
      requireUuid(cloudCharacterId, "cloudCharacterId");
      requireExpectedRevision(expectedRevision);
      const parsed = parseNativeCharacterJson(save);
      const data = await execute(
        "updateCharacter",
        supabase.rpc("update_character_cas", {
          p_character_id: cloudCharacterId,
          p_expected_revision: expectedRevision,
          p_payload: parsed.save,
        }),
        { cas: true },
      );
      return mutationResult(data);
    },

    async listCampaigns() {
      // Campaign invite_hash is never selectable by the browser; use a redacted RPC.
      return execute("listCampaigns", supabase.rpc("list_campaigns"));
    },

    async createCampaign(name) {
      if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
        fail("BAD_ARGUMENT", "Campaign name must contain 1 to 100 characters.");
      }
      const data = await execute(
        "createCampaign",
        supabase.rpc("create_campaign", { p_name: name.trim() }),
      );
      return mutationResult(data);
    },

    async joinCampaign(inviteCode) {
      const code = typeof inviteCode === "string" ? inviteCode.trim() : "";
      if (!INVITE_PATTERN.test(code)) fail("BAD_ARGUMENT", "Invite code format is invalid.");
      const data = await execute(
        "joinCampaign",
        supabase.rpc("join_campaign", { p_invite_code: code }),
      );
      return mutationResult(data);
    },

    async linkCharacter(campaignId, cloudCharacterId) {
      requireUuid(campaignId, "campaignId");
      requireUuid(cloudCharacterId, "cloudCharacterId");
      const data = await execute(
        "linkCharacter",
        supabase.rpc("link_character", {
          p_campaign_id: campaignId,
          p_character_id: cloudCharacterId,
        }),
      );
      return mutationResult(data);
    },

    async revokeCharacterLink(campaignId, cloudCharacterId) {
      requireUuid(campaignId, "campaignId");
      requireUuid(cloudCharacterId, "cloudCharacterId");
      const data = await execute(
        "revokeCharacterLink",
        supabase.rpc("revoke_character_link", {
          p_campaign_id: campaignId,
          p_character_id: cloudCharacterId,
        }),
      );
      return mutationResult(data);
    },

    async listDmLinkedCharacters(campaignId) {
      requireUuid(campaignId, "campaignId");
      return execute(
        "listDmLinkedCharacters",
        supabase.rpc("list_linked_characters", { p_campaign_id: campaignId }),
      );
    },
  });
}

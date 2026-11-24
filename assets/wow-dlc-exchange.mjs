/**
 * Public-safe WoW DLC exchange contract. It cannot grant paid content access,
 * authenticate users, generate PDF/Foundry documents or write Cloud data.
 * Do not wire protected formats until a server-owned provider/GM gate and
 * real player end-to-end tests pass.
 */
import {
  WOW_DLC_ID, readDlcSaveMetadata, validateWowClassAtLevel,
  canReleaseLicensedContent,
} from "./wow-dlc-policy.mjs";

export const WOW_DLC_CHANNELS = Object.freeze([
  "save", "json", "pdf", "cloud", "fvtt",
]);

const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
const stable = x => typeof x === "string" && /^[a-z0-9][a-z0-9:_-]{1,127}$/i.test(x);

/**
 * Unknown or unfinished DLC characters may be backed up as their ORIGINAL
 * JSON text, byte-for-byte. Never load into the regular 5R serializer.
 * This is a download-only escape hatch, not a playable export.
 */
export function preserveRawDlcJsonBackup(raw, limit = MAX_BACKUP_BYTES) {
  if (typeof raw !== "string" || raw.length === 0 ||
      new TextEncoder().encode(raw).length > limit)
    return { ok: false, reason: "INVALID_OR_OVERSIZE_BACKUP" };
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch { return { ok: false, reason: "INVALID_JSON" }; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      !stable(parsed.dlcId) || !stable(parsed.id))
    return { ok: false, reason: "NOT_A_DLC_CHARACTER" };
  // Browser clients must not treat the original raw JSON as executable HTML.
  // The caller should save it with application/json, never innerHTML.
  return {
    ok: true,
    kind: "RAW_DLC_BACKUP_ONLY",
    mimeType: "application/json",
    raw,
    dlcId: parsed.dlcId,
    characterId: parsed.id,
    playable: false,
  };
}

/**
 * Contract planning only. A successful species or hero-class validation
 * is insufficient to release a playable character. A real private provider
 * and runtime adapter must be supplied and verified outside public Pages.
 */
export function inspectWowDlcExchange({ channel, save, classChoice,
  context = {}, gates = {} } = {}) {
  if (!WOW_DLC_CHANNELS.includes(channel))
    return { ok: false, reason: "UNKNOWN_EXCHANGE_CHANNEL", playable: false };
  if (!save || typeof save !== "object" || Array.isArray(save) ||
      save.dlcId !== WOW_DLC_ID)
    return { ok: false, reason: "NOT_WOW_DLC_SAVE", playable: false };
  if (save.ruleset !== "2024")
    return { ok: false, reason: "CORE_RULESET_MISMATCH", playable: false };
  if (!stable(save.id) || !Number.isInteger(save.level) || save.level !== 2)
    return { ok: false, reason: "LEVEL2_CHARACTER_REQUIRED", playable: false };
  const species = readDlcSaveMetadata(save, context);
  if (!species.ok)
    return { ok: false, reason: species.reason, playable: false };
  if (!classChoice || typeof classChoice !== "object" ||
      classChoice.level !== save.level)
    return { ok: false, reason: "CLASS_CHOICE_REQUIRED", playable: false };
  const cls = validateWowClassAtLevel(classChoice, context);
  if (!cls.ok)
    return { ok: false, reason: cls.reason, playable: false };
  if (save.dlcClassId !== classChoice.wowClassId ||
      save.dlcClassCoreId !== classChoice.coreClassId)
    return { ok: false, reason: "CLASS_SOURCE_MISMATCH", playable: false };
  const release = canReleaseLicensedContent(gates);
  if (!release.ok)
    return {
      ok: false, reason: "PRIVATE_RELEASE_GATES_PENDING",
      missing: release.missing, playable: false,
    };
  // Even when synthetic gate booleans are all PASS, frontend cannot
  // authenticate a player, attest translation provenance, save Cloud,
  // render licensed PDF, or map Foundry Items. A trusted server-side
  // caller must implement these adapters and a fresh real UAT.
  return {
    ok: false, reason: "PROTECTED_RUNTIME_ADAPTER_NOT_CONNECTED",
    channel, playable: false,
  };
}

// Thin adapter for the canonical D&D 5R v9/v10 same-origin localStorage roster.
// No writes without an explicit player operation; no dependency on creator internals.
import { validateCharacterJson } from "../convex/lib/characterPayload";

export const ROSTER_KEY = "dnd5r:roster";
export const CHARACTER_KEY_PREFIX = "dnd5r:char:";
export const characterStorageKey = (id: string) => CHARACTER_KEY_PREFIX + id;

export type RosterStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type LocalCharacter = {
  id: string;
  name: string;
  ruleset: "2014" | "2024";
  saveVersion: 9 | 10;
  localTimestamp: number;
};

type LocalSave = Record<string, unknown>;
type RosterRow = {
  id: string;
  name: string;
  ruleset: "2014" | "2024";
  cls: string | null;
  sub: string | null;
  level: number;
  ts: number;
  thumb: string;
};
export type LocalImportResult =
  | { status: "created" | "copied"; id: string }
  | { status: "identical" | "conflict"; id: string };

function parseSavedRoster(raw: string | null): RosterRow[] {
  if (raw === null) return [];
  let rows: unknown;
  try { rows = JSON.parse(raw); } catch { throw Error("ROSTER_CORRUPT"); }
  if (!Array.isArray(rows)) throw Error("ROSTER_CORRUPT");
  // Existing repository owns this schema. Leave preexisting rows untouched.
  return rows as RosterRow[];
}

export function readLocalCharacters(storage: RosterStorage): LocalCharacter[] {
  try {
    const rows = parseSavedRoster(storage.getItem(ROSTER_KEY));
    const result: LocalCharacter[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row || typeof row.id !== "string" || seen.has(row.id)) continue;
      seen.add(row.id);
      const raw = storage.getItem(characterStorageKey(row.id));
      if (!raw) continue;
      try {
        const canonical = validateCharacterJson(raw);
        if (canonical.characterId !== row.id) continue;
        const parsed = JSON.parse(raw) as LocalSave;
        result.push({
          id: row.id,
          name: String((parsed.meta as { name?: unknown } | undefined)?.name || row.name || "未命名角色").slice(0, 80),
          ruleset: canonical.ruleset,
          saveVersion: canonical.saveVersion,
          localTimestamp: Number(parsed.ts) || Number(row.ts) || 0,
        });
      } catch {
        // Existing local save may be a legacy version or exceed the cloud size cap.
        // It stays entirely untouched in localStorage.
      }
    }
    return result;
  } catch { return []; }
}

export function readLocalRaw(storage: RosterStorage, id: string): string {
  const raw = storage.getItem(characterStorageKey(id));
  if (!raw) throw Error("LOCAL_CHARACTER_NOT_FOUND");
  const canonical = validateCharacterJson(raw);
  if (canonical.characterId !== id) throw Error("LOCAL_ID_MISMATCH");
  return raw;
}

// The legacy creator interpolates roster labels into innerHTML, so imported
// cloud metadata must be entity-encoded before it enters the roster index.
function safeLegacyRosterText(value: unknown, maxLength = 80): string {
  return String(value ?? "").slice(0, maxLength)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function rosterRowFromSave(save: LocalSave, id: string, timestamp: number): RosterRow {
  const meta = save.meta && typeof save.meta === "object" && !Array.isArray(save.meta)
    ? save.meta as { name?: unknown } : {};
  return {
    id, name: safeLegacyRosterText(meta.name || "未命名冒險者"),
    ruleset: save.ruleset as "2014" | "2024",
    cls: typeof save.cls === "string" ? safeLegacyRosterText(save.cls) : null,
    sub: typeof save.subName === "string" ? safeLegacyRosterText(save.subName) : null,
    level: typeof save.level === "number" && Number.isFinite(save.level) ? save.level : 1,
    ts: timestamp,
    // Avoid duplicating multi-megabyte data URLs in the roster index.
    thumb: "", // Never project an unchecked URL into the creator's HTML attribute.
  };
}

/**
 * Import a server-provided native Save JSON into the same browser origin.
 * 'new' never overwrites. 'copy' preserves the original local save and changes
 * only the copy's id/ts. Both modes rollback the new character key if index
 * persistence fails. The creator reloads the existing roster after navigation.
 */
export function importCloudSaveToLocal(
  storage: RosterStorage,
  raw: string,
  mode: "new" | "copy" = "new",
  newId?: () => string,
): LocalImportResult {
  const canonical = validateCharacterJson(raw);
  const originalId = canonical.characterId;
  const existingRaw = storage.getItem(characterStorageKey(originalId));
  if (existingRaw === raw) return { status: "identical", id: originalId };
  if (existingRaw !== null && mode === "new") return { status: "conflict", id: originalId };
  const rosterRaw = storage.getItem(ROSTER_KEY);
  const roster = parseSavedRoster(rosterRaw);
  if (roster.some(x => x?.id === originalId) && mode === "new") {
    return { status: "conflict", id: originalId };
  }

  let id = originalId;
  let storedRaw = raw;
  let status: "created" | "copied" = "created";
  if (existingRaw !== null || roster.some(x => x?.id === originalId)) {
    if (mode !== "copy" || !newId) throw Error("COPY_ID_GENERATOR_REQUIRED");
    id = newId();
    if (!/^c[A-Za-z0-9._:-]{1,127}$/.test(id) ||
        storage.getItem(characterStorageKey(id)) !== null ||
        roster.some(row => row?.id === id)) throw Error("COPY_ID_COLLISION");
    const original = JSON.parse(raw) as LocalSave;
    storedRaw = JSON.stringify({ ...original, id, ts: Date.now() });
    validateCharacterJson(storedRaw);
    status = "copied";
  }

  const timestamp = Date.now();
  const save = JSON.parse(storedRaw) as LocalSave;
  const row = rosterRowFromSave(save, id, timestamp);
  const existingCopyRaw = storage.getItem(characterStorageKey(id));
  if (existingCopyRaw !== null) throw Error("COPY_ID_COLLISION");
  storage.setItem(characterStorageKey(id), storedRaw);
  try {
    storage.setItem(ROSTER_KEY, JSON.stringify([row, ...roster]));
  } catch (error) {
    storage.removeItem(characterStorageKey(id));
    throw error;
  }
  return { status, id };
}


/**
 * The existing character-sheet "匯出 JSON" is a readable report with
 * its canonical native Save embedded in _save. Retain only the exact
 * native save payload; do not treat the readable projection as a Save.
 */
export function extractNativeSave(raw: string): string {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw Error("INVALID_JSON"); }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) &&
    "_save" in parsed) {
    const save = (parsed as { _save: unknown })._save;
    const normalized = JSON.stringify(save);
    if (typeof normalized !== "string") throw Error("INVALID_SAVE");
    validateCharacterJson(normalized);
    return normalized;
  }
  validateCharacterJson(raw);
  return raw;
}

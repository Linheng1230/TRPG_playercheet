// Preserve the existing D&D 5R Save JSON verbatim. The canonical serializer uses { v, ruleset, id }.
export const MAX_CHARACTER_BYTES = 512 * 1024;

/** Read-only metadata projection for older cloud records with no name column. */
export function characterDisplayName(originalJson: string): string {
  try {
    const value = JSON.parse(originalJson) as {meta?: {name?: unknown};cls?: unknown};
    const options = [value.meta?.name, value.cls];
    for (const option of options) {
      if (typeof option !== "string") continue;
      const label = option.replace(/<[^>]*>/g, "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 80);
      if (label) return label;
    }
  } catch { /* existing metadata must remain readable if a legacy save is malformed */ }
  return "未命名冒險者";
}

export type ValidatedCharacter = {
  characterId: string;
  saveVersion: 9 | 10;
  ruleset: "2014" | "2024";
};

export function validateCharacterJson(originalJson: string): ValidatedCharacter {
  if (typeof originalJson !== "string" || !originalJson.trim()) throw new Error("INVALID_JSON");
  const bytes = new TextEncoder().encode(originalJson).byteLength;
  if (bytes > MAX_CHARACTER_BYTES) throw new Error("CHARACTER_TOO_LARGE");
  let value: unknown;
  try { value = JSON.parse(originalJson); } catch { throw new Error("INVALID_JSON"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("INVALID_SAVE");
  const save = value as Record<string, unknown>;
  if (save.v !== 9 && save.v !== 10) throw new Error("UNSUPPORTED_SAVE_VERSION");
  if (save.ruleset !== "2014" && save.ruleset !== "2024") throw new Error("UNSUPPORTED_RULESET");
  if (typeof save.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:-]{1,127}$/.test(save.id)) throw new Error("INVALID_CHARACTER_ID");
  return { characterId: save.id, saveVersion: save.v, ruleset: save.ruleset };
}

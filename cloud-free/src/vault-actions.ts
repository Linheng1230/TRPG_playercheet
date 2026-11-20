import { importCloudSaveToLocal, type RosterStorage } from "./local-roster";

export const LEGACY_CURRENT_CHARACTER_KEY = "dnd5r:current";
export type CloudOpenResult = { id: string; status: "created" | "copied" | "identical" };

/** Thin cross-page handoff to the existing v9/v10 creator; no explicit second import step.
 * Never replaces a different existing local save; uses the canonical adapter's copy branch.
 */
export function stageCloudCharacterForOpen(
  storage: RosterStorage,
  originalJson: string,
  confirmCopy: () => boolean,
  newId: () => string,
): CloudOpenResult {
  let result = importCloudSaveToLocal(storage, originalJson);
  if (result.status === "conflict") {
    if (!confirmCopy()) throw new Error("已取消開啟；本機與雲端資料均保留。");
    result = importCloudSaveToLocal(storage, originalJson, "copy", newId);
    if (result.status !== "copied") throw new Error("無法保留雲端角色副本。");
  }
  // Creator boot() already restores the character referenced by this key.
  storage.setItem(LEGACY_CURRENT_CHARACTER_KEY, result.id);
  if (storage.getItem(LEGACY_CURRENT_CHARACTER_KEY) !== result.id)
    throw new Error("無法設定要開啟的角色，請確認瀏覽器儲存權限。");
  return result as CloudOpenResult;
}

import { ROSTER_KEY, readLocalCharacters, readLocalRaw, type RosterStorage } from "./local-roster";

/** One-time, additive merge of same-origin local v9/v10 saves into an authenticated account.
 * No local writes, cloud deletes, or cloud overwrites. Authentication is managed by the caller.
 */
export function shouldAutoMergeAfterAuth(mode: "signin" | "signup", status: string, checked: boolean): boolean {
  return mode === "signup" && status === "complete" && checked;
}

export type CloudCharacterRef = { _id: string; characterId: string; revision: number };
export type MergeOperations = {
  listMine: () => Promise<CloudCharacterRef[]>;
  getJson: (id: string) => Promise<string>;
  createOnly: (raw: string) => Promise<{ id: string }>;
};
export type MergeSkip = { id: string; name: string };
export type LocalMergeResult = {
  eligible: number;
  added: number;
  identical: number;
  conflicts: MergeSkip[];
  failed: MergeSkip[];
  unsupported: number;
};

export async function mergeLocalIntoCloud(storage: RosterStorage, api: MergeOperations): Promise<LocalMergeResult> {
  // Fail closed if the local index is corrupt; never replace or silently repair it.
  const rosterRaw = storage.getItem(ROSTER_KEY);
  let rosterRows: unknown = [];
  if (rosterRaw !== null) {
    try { rosterRows = JSON.parse(rosterRaw) as unknown; }
    catch { throw Error("本機角色清單格式異常；同步未開始，本機資料保持不變。"); }
    if (!Array.isArray(rosterRows)) throw Error("本機角色清單格式異常；同步未開始，本機資料保持不變。");
  }
  const local = readLocalCharacters(storage);
  const eligibleIds = new Set(local.map(row => row.id));
  const unsupported = (rosterRows as unknown[]).filter(row =>
    !row || typeof row !== "object" || !eligibleIds.has((row as {id?: string}).id || "")
  ).length;
  const result: LocalMergeResult = {
    eligible: local.length, added: 0, identical: 0,
    conflicts: [], failed: [], unsupported,
  };
  if (local.length === 0) return result;
  const cloud = await api.listMine();
  const remote = new Map<string, CloudCharacterRef>();
  for (const item of cloud) {
    if (!item || typeof item.characterId !== "string" || !item._id) throw Error("雲端角色清單回傳異常，已停止合併。");
    if (remote.has(item.characterId)) throw Error("雲端出現重複角色 ID，已停止合併。");
    remote.set(item.characterId, item);
  }
  for (const character of local) {
    const ref = { id: character.id, name: character.name };
    try {
      const original = readLocalRaw(storage, character.id);
      if (remote.has(character.id)) {
        const existing = remote.get(character.id)!;
        if (await api.getJson(existing._id) === original) result.identical++;
        else result.conflicts.push(ref); // manual confirmation, never automatic overwrite
        continue;
      }
      const created = await api.createOnly(original); // expectedRevision must be null
      if (!created?.id) throw Error("新增角色未回傳 ID");
      // The server's real stored bytes, not just mutation success, are the acceptance gate.
      if (await api.getJson(created.id) !== original) throw Error("雲端存檔讀回不一致");
      result.added++;
      remote.set(character.id, { _id: created.id, characterId: character.id, revision: 1 });
    } catch {
      // A failure on one save must not delete or overwrite another character.
      result.failed.push(ref);
    }
  }
  return result;
}

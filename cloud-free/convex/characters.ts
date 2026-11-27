import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/authz";
import { characterDisplayName, validateCharacterJson } from "./lib/characterPayload";

// Prevent a legacy or DLC-unaware client from replacing a known WoW save
// with a stripped core save even when its CAS revision is current. This is
// a continuity check, not authorization, source certification or a level-up
// rules validator. Do not project or reconstruct the original JSON.
function assertWowSaveContinuity(previousRaw: string, nextRaw: string): void {
  let previous: any;
  try { previous = JSON.parse(previousRaw); }
  catch { return; } // Preserve existing legacy repair behavior.
  if (previous?.dlcId !== "wow-2026") return;
  const next = JSON.parse(nextRaw);
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isNonemptyString = (value: unknown): value is string =>
    typeof value === "string" && value.trim().length > 0;
  const fail = () => { throw new Error("WOW_SAVE_IDENTITY_LOSS"); };
  if (next.dlcId !== previous.dlcId || next.ruleset !== "2024") fail();
  // Only protect existing identities confirmed by the current exchange
  // contract. Legitimate re-selection may change IDs; optional, not-yet-
  // selected fields are not granted or invented by this transport guard.
  if (isRecord(previous.dlcSpeciesSource) &&
      (!isRecord(next.dlcSpeciesSource) ||
       (isNonemptyString(previous.dlcSpeciesSource.origin) && !isNonemptyString(next.dlcSpeciesSource.origin)) ||
       (isNonemptyString(previous.dlcSpeciesSource.id) && !isNonemptyString(next.dlcSpeciesSource.id)))) fail();
  for (const key of ["dlcClassId", "dlcClassCoreId"]) {
    if (isNonemptyString(previous[key]) && !isNonemptyString(next[key])) fail();
  }
  if (isRecord(previous.classLevels) && !isRecord(next.classLevels)) fail();
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("characters")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(({ originalJson, ...metadata }) => ({
      ...metadata, displayName: characterDisplayName(originalJson),
    }));
  },
});

export const getMineForDownload = query({
  args: { id: v.id("characters") },
  handler: async (ctx, { id }) => {
    const ownerId = await requireUserId(ctx);
    const character = await ctx.db.get(id);
    if (!character || character.ownerId !== ownerId) throw new Error("FORBIDDEN");
    return character;
  },
});

export const upload = mutation({
  args: {
    originalJson: v.string(),
    expectedRevision: v.union(v.number(), v.null()),
    // Additive guard for autosave clients. Old manual clients remain compatible.
    expectedOwnerId: v.optional(v.id("users")),
  },
  handler: async (ctx, { originalJson, expectedRevision, expectedOwnerId }) => {
    const ownerId = await requireUserId(ctx);
    if (expectedOwnerId !== undefined && expectedOwnerId !== ownerId)
      throw new Error("ACCOUNT_CHANGED");
    const parsed = validateCharacterJson(originalJson);
    const existing = await ctx.db
      .query("characters")
      .withIndex("by_owner_character", (q) =>
        q.eq("ownerId", ownerId).eq("characterId", parsed.characterId),
      )
      .unique();
    const now = Date.now();
    if (!existing) {
      if (expectedRevision !== null) throw new Error("REVISION_CONFLICT");
      const id = await ctx.db.insert("characters", {
        ownerId,
        originalJson,
        ...parsed,
        revision: 1,
        updatedAt: now,
      });
      return { id, revision: 1 };
    }
    if (expectedRevision !== existing.revision) throw new Error("REVISION_CONFLICT");
    assertWowSaveContinuity(existing.originalJson, originalJson);
    const revision = existing.revision + 1;
    await ctx.db.patch(existing._id, {
      originalJson,
      saveVersion: parsed.saveVersion,
      ruleset: parsed.ruleset,
      revision,
      updatedAt: now,
    });
    return { id: existing._id, revision };
  },
});

export const remove = mutation({
  args: { id: v.id("characters"), expectedRevision: v.number() },
  handler: async (ctx, { id, expectedRevision }) => {
    const ownerId = await requireUserId(ctx);
    const character = await ctx.db.get(id);
    if (!character || character.ownerId !== ownerId) throw new Error("FORBIDDEN");
    if (character.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
    const shares = await ctx.db
      .query("characterShares")
      .filter((q) => q.eq(q.field("characterId"), id))
      .collect();
    for (const share of shares) await ctx.db.delete(share._id);
    await ctx.db.delete(id);
  },
});

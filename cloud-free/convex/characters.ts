import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib/authz";
import { validateCharacterJson } from "./lib/characterPayload";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("characters")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return rows.map(({ originalJson: _opaque, ...metadata }) => metadata);
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
  },
  handler: async (ctx, { originalJson, expectedRevision }) => {
    const ownerId = await requireUserId(ctx);
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

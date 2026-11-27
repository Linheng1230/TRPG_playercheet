import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCampaignOwner, requireUserId } from "./lib/authz";
import { validateWowPrivateManifestJson } from "./lib/wowPrivateManifest";

async function requireCampaignRuleReader(ctx: any, campaignId: any) {
  const userId = await requireUserId(ctx);
  const campaign = await ctx.db.get(campaignId);
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
  if (campaign.ownerId === userId) return { userId, campaign };
  const membership = await ctx.db.query("memberships")
    .withIndex("by_campaign_user", (q: any) =>
      q.eq("campaignId", campaignId).eq("userId", userId))
    .unique();
  if (!membership) throw new Error("NOT_MEMBER");
  return { userId, campaign };
}

export const getForCampaign = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireCampaignRuleReader(ctx, campaignId);
    const row = await ctx.db.query("wowRuleManifests")
      .withIndex("by_campaign", q => q.eq("campaignId", campaignId)).unique();
    if (!row) return null;
    return {
      manifestJson: row.manifestJson,
      sourceSnapshotSha: row.sourceSnapshotSha,
      revision: row.revision,
      updatedAt: row.updatedAt,
    };
  },
});

export const upsertForCampaign = mutation({
  args: {
    campaignId: v.id("campaigns"),
    manifestJson: v.string(),
    expectedRevision: v.union(v.number(), v.null()),
  },
  handler: async (ctx, { campaignId, manifestJson, expectedRevision }) => {
    await requireCampaignOwner(ctx, campaignId);
    const { sourceSnapshotSha } = validateWowPrivateManifestJson(manifestJson);
    const existing = await ctx.db.query("wowRuleManifests")
      .withIndex("by_campaign", q => q.eq("campaignId", campaignId)).unique();
    const now = Date.now();
    if (!existing) {
      if (expectedRevision !== null) throw new Error("REVISION_CONFLICT");
      const id = await ctx.db.insert("wowRuleManifests", {
        campaignId, manifestJson, sourceSnapshotSha, revision: 1, updatedAt: now,
      });
      return { id, revision: 1, sourceSnapshotSha };
    }
    if (expectedRevision !== existing.revision) throw new Error("REVISION_CONFLICT");
    const revision = existing.revision + 1;
    await ctx.db.patch(existing._id, {
      manifestJson, sourceSnapshotSha, revision, updatedAt: now,
    });
    return { id: existing._id, revision, sourceSnapshotSha };
  },
});

export const removeForCampaign = mutation({
  args: { campaignId: v.id("campaigns"), expectedRevision: v.number() },
  handler: async (ctx, { campaignId, expectedRevision }) => {
    await requireCampaignOwner(ctx, campaignId);
    const existing = await ctx.db.query("wowRuleManifests")
      .withIndex("by_campaign", q => q.eq("campaignId", campaignId)).unique();
    if (!existing) return;
    if (existing.revision !== expectedRevision) throw new Error("REVISION_CONFLICT");
    await ctx.db.delete(existing._id);
  },
});

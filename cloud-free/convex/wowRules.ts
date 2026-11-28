import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCampaignOwner, requireUserId } from "./lib/authz";
import {
  WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
  assertWowPrivateCanonicalHashes,
  validateWowPrivateContentBundleJson,
  validateWowPrivateManifestJson,
} from "./lib/wowPrivateManifest";

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
      contentBundleJson: row.contentBundleJson,
      manifestSha: row.manifestSha,
      contentBundleSha: row.contentBundleSha,
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
    contentBundleJson: v.string(),
    manifestSha: v.string(),
    contentBundleSha: v.string(),
    expectedRevision: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const { campaignId, manifestJson, contentBundleJson, manifestSha,
      contentBundleSha, expectedRevision } = args;
    await requireCampaignOwner(ctx, campaignId);
    if (manifestSha !== WOW_PRIVATE_LV1_3_MANIFEST_SHA256 ||
        contentBundleSha !== WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256)
      throw new Error("CANONICAL_PROVIDER_HASH_REQUIRED");
    await assertWowPrivateCanonicalHashes(manifestJson, contentBundleJson);
    const { sourceSnapshotSha, manifest } = validateWowPrivateManifestJson(manifestJson);
    validateWowPrivateContentBundleJson(contentBundleJson, manifest);
    const existing = await ctx.db.query("wowRuleManifests")
      .withIndex("by_campaign", q => q.eq("campaignId", campaignId)).unique();
    const now = Date.now();
    const value = {
      campaignId, manifestJson, contentBundleJson, manifestSha, contentBundleSha,
      sourceSnapshotSha, updatedAt: now,
    };
    if (!existing) {
      if (expectedRevision !== null) throw new Error("REVISION_CONFLICT");
      const id = await ctx.db.insert("wowRuleManifests", { ...value, revision: 1 });
      return { id, revision: 1, sourceSnapshotSha, manifestSha, contentBundleSha };
    }
    if (expectedRevision !== existing.revision) throw new Error("REVISION_CONFLICT");
    const revision = existing.revision + 1;
    await ctx.db.patch(existing._id, { ...value, revision });
    return { id: existing._id, revision, sourceSnapshotSha, manifestSha, contentBundleSha };
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

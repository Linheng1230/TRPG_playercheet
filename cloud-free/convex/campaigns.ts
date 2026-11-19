import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId, requireCampaignOwner, requireGameMaster } from "./lib/authz";
import { characterDisplayName } from "./lib/characterPayload";
import { advanceInviteBudget } from "./lib/inviteCodes";

export const myCampaigns = query({
  args: {},
  handler: async (ctx) => {
    const uid = await requireUserId(ctx);
    const owned = await ctx.db.query("campaigns").withIndex("by_owner", q => q.eq("ownerId", uid)).collect();
    const joined = await ctx.db.query("memberships").withIndex("by_user", q => q.eq("userId", uid)).collect();
    const memberCampaigns = await Promise.all(joined.map(x => ctx.db.get(x.campaignId)));
    return { owned, joined: memberCampaigns.filter(Boolean) };
  }
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const uid = await requireGameMaster(ctx);
    const label = name.trim();
    if (label.length < 2 || label.length > 80) throw new Error("INVALID_NAME");
    return await ctx.db.insert("campaigns", { ownerId: uid, name: label, createdAt: Date.now() });
  }
});

// Owner-only destructive operation. Linked access grants are deleted atomically
// with the campaign; the players' character saves are never touched.
export const removeCampaign = mutation({
  args: { campaignId: v.id("campaigns"), expectedName: v.string() },
  handler: async (ctx, { campaignId, expectedName }) => {
    const { campaign } = await requireCampaignOwner(ctx, campaignId);
    if (campaign.name !== expectedName) throw new Error("CAMPAIGN_NAME_MISMATCH");
    const memberships = await ctx.db.query("memberships")
      .withIndex("by_campaign_user", q => q.eq("campaignId", campaignId)).collect();
    const shares = await ctx.db.query("characterShares")
      .withIndex("by_campaign", q => q.eq("campaignId", campaignId)).collect();
    const invites = await ctx.db.query("campaignInvites")
      .withIndex("by_campaign", q => q.eq("campaignId", campaignId)).collect();
    for (const share of shares) await ctx.db.delete(share._id);
    for (const membership of memberships) await ctx.db.delete(membership._id);
    for (const invite of invites) await ctx.db.delete(invite._id);
    await ctx.db.delete(campaignId);
  }
});

// Client generates a cryptographically random five-character A-Z0-9 code, then sends
// only its SHA-256 hex digest. Short codes are protected by persistent per-user
// join-attempt limiting. Legacy long-code digests remain redeemable until expiry.
// The backend never stores the bearer plaintext; only the campaign owner issues/revokes.
export const issueInvite = mutation({
  args: { campaignId: v.id("campaigns"), codeHash: v.string(), expiresAt: v.number() },
  handler: async (ctx, { campaignId, codeHash, expiresAt }) => {
    const { userId } = await requireCampaignOwner(ctx, campaignId);
    if (!/^[a-f0-9]{64}$/.test(codeHash)) throw new Error("INVALID_CODE_HASH");
    if (expiresAt < Date.now() + 60000 || expiresAt > Date.now() + 7 * 86400000) throw new Error("INVALID_EXPIRY");
    const prior = await ctx.db.query("campaignInvites").withIndex("by_hash", q => q.eq("codeHash", codeHash)).first();
    if (prior) throw new Error("INVITE_ALREADY_EXISTS");
    return await ctx.db.insert("campaignInvites", { campaignId, createdBy: userId, codeHash, expiresAt, createdAt: Date.now() });
  }
});

export const revokeInvite = mutation({
  args: { campaignId: v.id("campaigns"), inviteId: v.id("campaignInvites") },
  handler: async (ctx, { campaignId, inviteId }) => {
    await requireCampaignOwner(ctx, campaignId);
    const invite = await ctx.db.get(inviteId);
    if (!invite || invite.campaignId !== campaignId) throw new Error("FORBIDDEN");
    await ctx.db.patch(inviteId, { revokedAt: Date.now() });
  }
});

export const listInvites = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    await requireCampaignOwner(ctx, campaignId);
    return ctx.db.query("campaignInvites").withIndex("by_campaign", q => q.eq("campaignId", campaignId)).collect();
  }
});

export const join = mutation({
  args: { codeHash: v.string(), clientProtocol: v.optional(v.literal("v2")) },
  handler: async (ctx, { codeHash, clientProtocol }) => {
    const uid = await requireUserId(ctx);
    // During backend-first rollout the previous Pages client ignores returned
    // error statuses and would falsely claim join success. Reject it explicitly,
    // without mutating state or leaking any invitation lookup information.
    if (clientProtocol !== "v2") throw new Error("CLIENT_UPDATE_REQUIRED");
    // Persist an attempt even on invalid codes; Convex rolls back DB writes on throw,
    // so user-facing invalid and rate-limit outcomes are returned, not thrown.
    const now = Date.now();
    const previous = await ctx.db.query("inviteJoinAttempts")
      .withIndex("by_user", q => q.eq("userId", uid)).unique();
    const budget = advanceInviteBudget(previous
      ? {windowStartedAt:previous.windowStartedAt,attempts:previous.attempts}:null, now);
    if (!budget.allowed) return {status:"rate_limited" as const};
    if (previous) await ctx.db.patch(previous._id, budget.next);
    else await ctx.db.insert("inviteJoinAttempts",{userId:uid,...budget.next});
    if (!/^[a-f0-9]{64}$/.test(codeHash)) return {status:"invalid" as const};
    const invite = await ctx.db.query("campaignInvites")
      .withIndex("by_hash", q => q.eq("codeHash", codeHash)).unique();
    if (!invite || invite.revokedAt || invite.usedAt || invite.expiresAt <= now)
      return {status:"invalid" as const};
    const campaign = await ctx.db.get(invite.campaignId);
    if (!campaign) return {status:"invalid" as const};
    if (campaign.ownerId === uid) return {status:"owner" as const};
    const existing = await ctx.db.query("memberships")
      .withIndex("by_campaign_user", q => q.eq("campaignId", campaign._id).eq("userId", uid)).unique();
    if (!existing) await ctx.db.insert("memberships", {campaignId:campaign._id,userId:uid,joinedAt:now});
    await ctx.db.patch(invite._id, {usedAt:now}); // atomic one-use
    return {status:"joined" as const,campaignId:campaign._id};
  }
});

export const leave = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const uid = await requireUserId(ctx);
    const membership = await ctx.db.query("memberships").withIndex("by_campaign_user", q => q.eq("campaignId", campaignId).eq("userId", uid)).unique();
    if (!membership) throw new Error("NOT_MEMBER");
    const shares = await ctx.db.query("characterShares").withIndex("by_campaign", q => q.eq("campaignId", campaignId)).collect();
    for (const s of shares) if (s.ownerId === uid) await ctx.db.delete(s._id);
    await ctx.db.delete(membership._id);
  }
});

export const myShares = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    const uid = await requireUserId(ctx);
    // A formerly joined player may still have this query subscribed when the GM deletes the campaign.
    // Empty only for deleted campaigns; existing foreign campaigns remain access-denied.
    if (!(await ctx.db.get(campaignId))) return [];
    const member = await ctx.db.query("memberships").withIndex("by_campaign_user", q => q.eq("campaignId", campaignId).eq("userId", uid)).unique();
    if (!member) throw new Error("NOT_MEMBER");
    const shares = await ctx.db.query("characterShares").withIndex("by_campaign", q => q.eq("campaignId", campaignId)).collect();
    return shares.filter(x => x.ownerId === uid);
  }
});

export const share = mutation({
  args: { campaignId: v.id("campaigns"), characterId: v.id("characters") },
  handler: async (ctx, { campaignId, characterId }) => {
    const uid = await requireUserId(ctx);
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");
    const membership = await ctx.db.query("memberships").withIndex("by_campaign_user", q => q.eq("campaignId", campaignId).eq("userId", uid)).unique();
    if (!membership) throw new Error("NOT_MEMBER");
    const ch = await ctx.db.get(characterId);
    if (!ch || ch.ownerId !== uid) throw new Error("FORBIDDEN");
    const old = await ctx.db.query("characterShares").withIndex("by_character_campaign", q => q.eq("characterId", characterId).eq("campaignId", campaignId)).unique();
    if (old) return old._id;
    return ctx.db.insert("characterShares", { campaignId, characterId, ownerId: uid, createdAt: Date.now() });
  }
});

export const unshare = mutation({
  args: { campaignId: v.id("campaigns"), characterId: v.id("characters") },
  handler: async (ctx, { campaignId, characterId }) => {
    const uid = await requireUserId(ctx);
    const ch = await ctx.db.get(characterId);
    if (!ch || ch.ownerId !== uid) throw new Error("FORBIDDEN");
    const old = await ctx.db.query("characterShares").withIndex("by_character_campaign", q => q.eq("characterId", characterId).eq("campaignId", campaignId)).unique();
    if (!old) return;
    await ctx.db.delete(old._id);
  }
});

export const dmRoster = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, { campaignId }) => {
    // Missing campaign is an empty stale subscription; never bypass the owner gate for live campaigns.
    if (!(await ctx.db.get(campaignId))) {
      await requireUserId(ctx);
      return [];
    }
    await requireCampaignOwner(ctx, campaignId);
    const shares = await ctx.db.query("characterShares").withIndex("by_campaign", q => q.eq("campaignId", campaignId)).collect();
    const rows = [];
    for (const share of shares) {
      const member = await ctx.db.query("memberships").withIndex("by_campaign_user", q => q.eq("campaignId", campaignId).eq("userId", share.ownerId)).unique();
      const character = await ctx.db.get(share.characterId);
      if (member && character && character.ownerId === share.ownerId) rows.push({
        id:character._id,ownerId:share.ownerId,characterId:character.characterId,
        displayName:characterDisplayName(character.originalJson),
        ruleset:character.ruleset,revision:character.revision,
      });
    }
    return rows;
  }
});

export const dmReadShared = query({
  args: { campaignId: v.id("campaigns"), characterId: v.id("characters") },
  handler: async (ctx, { campaignId, characterId }) => {
    await requireCampaignOwner(ctx, campaignId);
    const share = await ctx.db.query("characterShares").withIndex("by_character_campaign", q => q.eq("characterId", characterId).eq("campaignId", campaignId)).unique();
    if (!share) throw new Error("SHARE_REVOKED");
    const member = await ctx.db.query("memberships").withIndex("by_campaign_user", q => q.eq("campaignId", campaignId).eq("userId", share.ownerId)).unique();
    const ch = await ctx.db.get(characterId);
    if (!member || !ch || ch.ownerId !== share.ownerId) throw new Error("SHARE_REVOKED");
    return { originalJson: ch.originalJson, ruleset: ch.ruleset, revision: ch.revision, characterId: ch.characterId };
  }
});

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    role: v.union(v.literal("user"), v.literal("admin")),
    createdAt: v.number(),
  }),
  characters: defineTable({
    ownerId: v.id("users"),
    characterId: v.string(),
    originalJson: v.string(),
    saveVersion: v.union(v.literal(9), v.literal(10)),
    ruleset: v.union(v.literal("2014"), v.literal("2024")),
    revision: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_character", ["ownerId", "characterId"]),
  campaigns: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),
  memberships: defineTable({
    campaignId: v.id("campaigns"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_campaign_user", ["campaignId", "userId"])
    .index("by_user", ["userId"]),
  characterShares: defineTable({
    campaignId: v.id("campaigns"),
    characterId: v.id("characters"),
    ownerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_character_campaign", ["characterId", "campaignId"]),
  campaignInvites: defineTable({
    campaignId: v.id("campaigns"),
    codeHash: v.string(),
    createdBy: v.id("users"),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
    usedAt: v.optional(v.number()),
  })
    .index("by_hash", ["codeHash"])
    .index("by_campaign", ["campaignId"]),
});

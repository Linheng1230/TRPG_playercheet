import { internalMutation, query } from "./_generated/server";
import { requireUserId } from "./lib/authz";
import { v } from "convex/values";
import { vGoogleProfile } from "@convex-dev/auth/methods/google/server";

/** Role is server-owned. Signup never self-promotes a GM. */
export const myRole = query({
  args: {},
  handler: async (ctx) => {
    const uid = await requireUserId(ctx);
    const user = await ctx.db.get(uid);
    return user?.role === "admin" ? "admin" : "user";
  },
});

export const createUser = internalMutation({
  args: {
    method: v.object({
      name: v.literal("usernamePassword"),
      profile: v.object({}),
    }),
  },
  handler: async (ctx) =>
    await ctx.db.insert("users", { role: "user", createdAt: Date.now() }),
});

/** Called only by the trusted Google OAuth component after verified OIDC. */
export const createUserGoogle = internalMutation({
  args: { method: v.object({ name: v.literal("google"), profile: vGoogleProfile }) },
  returns: v.id("users"),
  handler: async (ctx) => {
    // Existing usernames, display names and emails are NOT ownership proofs.
    return await ctx.db.insert("users", { role: "user", createdAt: Date.now() });
  },
});

export const myIdentity = query({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => requireUserId(ctx),
});

import { internalMutation, query } from "./_generated/server";
import { requireUserId } from "./lib/authz";
import { v } from "convex/values";

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

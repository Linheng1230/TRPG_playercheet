import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

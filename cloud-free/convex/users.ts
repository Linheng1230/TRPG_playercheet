import { internalMutation } from "./_generated/server";

export const createUser = internalMutation({
  args: {},
  handler: async (ctx) =>
    await ctx.db.insert("users", { role: "user", createdAt: Date.now() }),
});

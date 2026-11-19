import { getAuthUserId } from "@convex-dev/auth/server";
import type { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "../_generated/dataModel";

type Ctx = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export async function requireUserId(ctx: Ctx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("UNAUTHENTICATED");
  const user = await ctx.db.get(userId as Id<"users">);
  if (!user) throw new Error("USER_NOT_FOUND");
  return userId as Id<"users">;
}

export async function requireCampaignOwner(
  ctx: Ctx,
  campaignId: Id<"campaigns">,
) {
  const userId = await requireUserId(ctx);
  const campaign = await ctx.db.get(campaignId);
  if (!campaign || campaign.ownerId !== userId) throw new Error("FORBIDDEN");
  return { userId, campaign };
}

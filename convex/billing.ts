import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireUserId } from "./lib";

async function currentSubscription(
  ctx: QueryCtx,
  userId: string,
): Promise<Doc<"subscriptions"> | null> {
  const rows = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows[0] ?? null;
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await currentSubscription(ctx, userId);
    return (
      existing ?? {
        id: "free-subscription",
        userId: userId as string,
        plan: "free" as const,
        status: "active" as const,
        provider: "mock" as const,
      }
    );
  },
});

export const subscribe = mutation({
  args: { plan: v.union(v.literal("pro"), v.literal("org")) },
  handler: async (ctx, { plan }) => {
    const userId = await requireUserId(ctx);
    const existing = await currentSubscription(ctx, userId);
    const fields = {
      plan,
      status: "active" as const,
      renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      provider: "mock" as const,
      providerRef: `mock_${randomSuffix()}`,
    };
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return (await ctx.db.get(existing._id))!;
    }
    const id = await ctx.db.insert("subscriptions", {
      userId,
      ...fields,
    });
    return (await ctx.db.get(id))!;
  },
});

export const cancel = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await currentSubscription(ctx, userId);
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "cancelled" as const,
        plan: "free" as const,
      });
      return (await ctx.db.get(existing._id))!;
    }
    const id = await ctx.db.insert("subscriptions", {
      userId,
      plan: "free",
      status: "cancelled",
      provider: "mock",
    });
    return (await ctx.db.get(id))!;
  },
});

function randomSuffix(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

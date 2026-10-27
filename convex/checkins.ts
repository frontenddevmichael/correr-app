import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  awardXp,
  nowIso,
  requireUserId,
  todayKeyForUser,
  unlock,
} from "./lib";

export const create = mutation({
  args: {
    commitmentId: v.optional(v.string()),
    kind: v.union(v.literal("daily"), v.literal("recovery"), v.literal("weekly")),
    status: v.union(
      v.literal("on_track"),
      v.literal("struggling"),
      v.literal("blocked"),
      v.literal("done"),
    ),
    blocker: v.optional(v.string()),
    nextAction: v.optional(v.string()),
    reflection: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const day = await todayKeyForUser(ctx, userId);
    const id = await ctx.db.insert("checkIns", {
      userId,
      commitmentId: args.commitmentId,
      day,
      kind: args.kind,
      status: args.status,
      blocker: args.blocker,
      nextAction: args.nextAction,
      reflection: args.reflection,
      createdAt: nowIso(),
    });

    // XP: daily check-in once per day; weekly reflection per review.
    const sameDay = await ctx.db
      .query("checkIns")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
      .collect();
    const sameKindToday = sameDay.filter((c) => c.kind === args.kind);
    if (args.kind === "daily" && sameKindToday.length <= 1) {
      await awardXp(ctx, userId, "daily_checkin", id);
    }
    if (args.kind === "weekly") {
      await awardXp(ctx, userId, "weekly_reflection", id);
      await unlock(ctx, userId, "first_week");
    }
    return (await ctx.db.get(id))!;
  },
});

export const list = query({
  args: { from: v.optional(v.string()), to: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("checkIns")
      .withIndex("by_user_day", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((c) => !args.from || c.day >= args.from)
      .filter((c) => !args.to || c.day <= args.to)
      .sort((a, b) => b.day.localeCompare(a.day));
  },
});

export const today = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const day = await todayKeyForUser(ctx, userId);
    const rows = await ctx.db
      .query("checkIns")
      .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
      .collect();
    return rows.find((c) => c.kind === "daily") ?? null;
  },
});

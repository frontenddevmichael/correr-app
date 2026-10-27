import { query } from "./_generated/server";
import { ACHIEVEMENT_DEFS } from "../src/core/domain";
import { requireUserId } from "./lib";

export const getStreak = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return (
      existing ?? {
        userId: userId as string,
        commitmentStreak: 0,
        partnershipStreak: 0,
        lastActiveDay: null,
        bestStreak: 0,
      }
    );
  },
});

export const getXp = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return profile?.xp ?? 0;
  },
});

export const getLevel = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return profile?.level ?? "Starter";
  },
});

export const listXpTransactions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("xpTransactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.at.localeCompare(a.at));
  },
});

export const listAchievements = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const unlocked = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return ACHIEVEMENT_DEFS.map((def) => ({
      def,
      unlocked:
        unlocked.find((a) => a.achievementId === def.id) ?? null,
    }));
  },
});

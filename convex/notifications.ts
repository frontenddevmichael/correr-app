import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Profile } from "../src/core/domain";
import { ensureProfile, nowIso, requireUserId } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const markRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return;
    await ctx.db.patch(id, { readAt: nowIso() });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const ts = nowIso();
    for (const n of rows.filter((x) => !x.readAt)) {
      await ctx.db.patch(n._id, { readAt: ts });
    }
  },
});

export const clearRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const n of rows.filter((x) => x.readAt)) {
      await ctx.db.delete(n._id);
    }
  },
});

const preferenceKey: Partial<
  Record<string, keyof Profile["notificationPrefs"]>
> = {
  commitment_reminder: "commitmentReminders",
  commitment_overdue: "commitmentOverdue",
  partner_interaction: "partnerInteractions",
  daily_checkin: "dailyCheckIn",
  weekly_review: "weeklyReview",
  ai_insight: "aiInsights",
};

export const setPreference = mutation({
  args: {
    kind: v.union(
      v.literal("commitment_reminder"),
      v.literal("commitment_overdue"),
      v.literal("partner_interaction"),
      v.literal("daily_checkin"),
      v.literal("weekly_review"),
      v.literal("ai_insight"),
      v.literal("achievement"),
    ),
    enabled: v.boolean(),
  },
  handler: async (ctx, { kind, enabled }) => {
    const userId = await requireUserId(ctx);
    const key = preferenceKey[kind];
    if (!key) return;
    await ensureProfile(ctx, userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return;
    await ctx.db.patch(profile._id, {
      notificationPrefs: { ...profile.notificationPrefs, [key]: enabled },
    });
  },
});

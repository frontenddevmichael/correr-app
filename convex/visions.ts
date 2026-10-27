import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { nowIso, requireUserId } from "./lib";

const category = v.union(
  v.literal("career"),
  v.literal("education"),
  v.literal("health"),
  v.literal("finance"),
  v.literal("creativity"),
  v.literal("relationships"),
  v.literal("faith"),
  v.literal("business"),
  v.literal("other"),
);

const status = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

const priority = v.union(v.literal("high"), v.literal("medium"), v.literal("low"));

const inputArgs = {
  title: v.string(),
  description: v.string(),
  whyItMatters: v.string(),
  category,
  targetTimeframe: v.optional(v.string()),
  targetDate: v.optional(v.string()),
  priority,
};

export const list = query({
  args: { status: v.optional(status) },
  handler: async (ctx, { status: filter }) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("visions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((x) => !filter || x.status === filter)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const get = query({
  args: { id: v.id("visions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return null;
    return doc;
  },
});

export const create = mutation({
  args: inputArgs,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!args.title.trim()) throw new Error("Give your vision a title first.");
    if (args.description.trim().length < 20) {
      throw new Error(
        "Describe your vision a bit more. At least a sentence or two.",
      );
    }
    const ts = nowIso();
    const id = await ctx.db.insert("visions", {
      userId,
      title: args.title.trim(),
      description: args.description.trim(),
      whyItMatters: args.whyItMatters.trim(),
      category: args.category,
      targetTimeframe: args.targetTimeframe,
      targetDate: args.targetDate,
      priority: args.priority,
      status: "active",
      progressPercent: 0,
      createdAt: ts,
      updatedAt: ts,
    });
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (profile?.onboardingState === "vision") {
      await ctx.db.patch(profile._id, { onboardingState: "done" });
    }
    return (await ctx.db.get(id))!;
  },
});

export const update = mutation({
  args: {
    id: v.id("visions"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    whyItMatters: v.optional(v.string()),
    category: v.optional(category),
    targetTimeframe: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    priority: v.optional(priority),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Vision not found");
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) clean[key] = value;
    }
    await ctx.db.patch(id, { ...clean, updatedAt: nowIso() });
    return (await ctx.db.get(id))!;
  },
});

export const setStatus = mutation({
  args: { id: v.id("visions"), status },
  handler: async (ctx, { id, status: next }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Vision not found");
    await ctx.db.patch(id, { status: next, updatedAt: nowIso() });
    return (await ctx.db.get(id))!;
  },
});

/**
 * Permanently remove a vision and its plan. Commitments survive as history,
 * but lose their links to the deleted vision, goals and milestones.
 */
export const remove = mutation({
  args: { id: v.id("visions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const vision = await ctx.db.get(id);
    if (!vision || vision.userId !== userId) return;

    const goals = await ctx.db
      .query("goals")
      .withIndex("by_vision", (q) => q.eq("visionId", id))
      .collect();
    const goalIds = new Set(goals.map((goal) => goal._id));
    const milestoneIds = new Set<string>();
    for (const goal of goals) {
      const milestones = await ctx.db
        .query("milestones")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .collect();
      for (const milestone of milestones) {
        milestoneIds.add(milestone._id);
        await ctx.db.delete(milestone._id);
      }
      await ctx.db.delete(goal._id);
    }

    const discoveries = await ctx.db
      .query("discoveries")
      .withIndex("by_vision", (q) => q.eq("visionId", id))
      .collect();
    for (const discovery of discoveries) await ctx.db.delete(discovery._id);

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const conversation of conversations.filter((c) => c.visionId === id)) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      for (const message of messages) await ctx.db.delete(message._id);
      await ctx.db.delete(conversation._id);
    }

    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const commitment of commitments) {
      const linked =
        commitment.visionId === id ||
        (commitment.goalId !== undefined &&
          goalIds.has(commitment.goalId as Id<"goals">)) ||
        (commitment.milestoneId !== undefined &&
          milestoneIds.has(commitment.milestoneId));
      if (!linked) continue;
      await ctx.db.patch(commitment._id, {
        visionId: undefined,
        goalId: undefined,
        milestoneId: undefined,
      });
    }

    await ctx.db.delete(id);
  },
});

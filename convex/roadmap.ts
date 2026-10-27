import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import type { AiDiscovery, GeneratedRoadmap, Vision } from "../src/core/domain";
import { OpenRouterAi } from "./openrouter";
import {
  awardXp,
  nowIso,
  recalcVisionProgress,
  requireUserId,
  unlock,
} from "./lib";

const pace = v.union(
  v.literal("steady"),
  v.literal("intense"),
  v.literal("flexible"),
);

const goalStatus = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("completed"),
);

const roadmapValidator = v.object({
  goals: v.array(
    v.object({
      title: v.string(),
      description: v.string(),
      milestones: v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          timeframe: v.optional(v.string()),
        }),
      ),
    }),
  ),
  firstActions: v.array(v.string()),
});

async function recomputeGoalProgress(
  ctx: MutationCtx,
  goalId: string,
): Promise<void> {
  const goal = await ctx.db.get(goalId as Id<"goals">);
  if (!goal) return;
  const milestones = await ctx.db
    .query("milestones")
    .withIndex("by_goal", (q) => q.eq("goalId", goalId))
    .collect();
  if (milestones.length === 0) return;
  const progressPercent = Math.round(
    (milestones.filter((m) => m.status === "completed").length /
      milestones.length) *
      100,
  );
  await ctx.db.patch(goal._id, {
    progressPercent,
    ...(progressPercent === 100 ? { status: "completed" as const } : {}),
  });
  await recalcVisionProgress(ctx, goal.visionId);
}

// ---------- Discovery ----------

export const saveDiscovery = mutation({
  args: {
    visionId: v.id("visions"),
    currentState: v.string(),
    timeAvailablePerDay: v.number(),
    blockers: v.array(v.string()),
    preferredPace: pace,
    constraints: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const fields = {
      userId,
      visionId: args.visionId,
      currentState: args.currentState,
      timeAvailablePerDay: args.timeAvailablePerDay,
      blockers: args.blockers,
      preferredPace: args.preferredPace,
      constraints: args.constraints,
      completedAt: nowIso(),
    };
    const existing = await ctx.db
      .query("discoveries")
      .withIndex("by_vision", (q) => q.eq("visionId", args.visionId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, fields);
      return (await ctx.db.get(existing._id))!;
    }
    const id = await ctx.db.insert("discoveries", fields);
    return (await ctx.db.get(id))!;
  },
});

export const getDiscovery = query({
  args: { visionId: v.id("visions") },
  handler: async (ctx, { visionId }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db
      .query("discoveries")
      .withIndex("by_vision", (q) => q.eq("visionId", visionId))
      .first();
    if (!doc || doc.userId !== userId) return null;
    return doc;
  },
});

// ---------- Roadmap generation (AI is pure; runs in actions) ----------

async function generateForVision(
  ctx: ActionCtx,
  visionId: string,
  adjustment?: string,
): Promise<GeneratedRoadmap> {
  await ctx.runMutation(internal.ai.checkAiRateLimit, {
    action: "roadmap",
  });
  const visionDoc = await ctx.runQuery(internal.roadmap.getVisionForAi, {
    id: visionId as Id<"visions">,
  });
  if (!visionDoc) throw new Error("Vision not found");
  const discoveryDoc = await ctx.runQuery(api.roadmap.getDiscovery, {
    visionId: visionId as Id<"visions">,
  });
  const vision: Vision = { ...visionDoc, id: visionDoc._id };
  const discovery: AiDiscovery | null = discoveryDoc
    ? { ...discoveryDoc, id: discoveryDoc._id }
    : null;
  const ai = new OpenRouterAi();
  return await ai.generateRoadmap(vision, discovery, adjustment);
}

/** Read-side helper for actions (actions cannot touch ctx.db directly). */
export const getVisionForAi = internalQuery({
  args: { id: v.id("visions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return null;
    return doc;
  },
});

export const generate = action({
  args: { visionId: v.id("visions") },
  handler: async (ctx, { visionId }) => {
    return await generateForVision(ctx, visionId);
  },
});

export const regenerate = action({
  args: { visionId: v.id("visions") },
  handler: async (ctx, { visionId }) => {
    return await generateForVision(ctx, visionId);
  },
});

export const adjust = action({
  args: { visionId: v.id("visions"), message: v.string() },
  handler: async (ctx, { visionId, message }) => {
    return await generateForVision(ctx, visionId, message);
  },
});

// ---------- Roadmap persistence ----------

export const save = mutation({
  args: { visionId: v.id("visions"), roadmap: roadmapValidator },
  handler: async (ctx, { visionId, roadmap }) => {
    const userId = await requireUserId(ctx);
    const vision = await ctx.db.get(visionId);
    if (!vision || vision.userId !== userId) throw new Error("Vision not found");

    // Replace the plan but keep completed goals (FR-08, mock parity).
    const oldGoals = await ctx.db
      .query("goals")
      .withIndex("by_vision", (q) => q.eq("visionId", visionId))
      .collect();
    for (const goal of oldGoals.filter((g) => g.status !== "completed")) {
      const milestones = await ctx.db
        .query("milestones")
        .withIndex("by_goal", (q) => q.eq("goalId", goal._id))
        .collect();
      for (const m of milestones) await ctx.db.delete(m._id);
      await ctx.db.delete(goal._id);
    }

    const createdIds: string[] = [];
    for (const [gi, g] of roadmap.goals.entries()) {
      const goalId = await ctx.db.insert("goals", {
        visionId,
        userId,
        title: g.title,
        description: g.description,
        order: gi,
        status: gi === 0 ? "active" : "planned",
        progressPercent: 0,
        createdAt: nowIso(),
      });
      createdIds.push(goalId);
      for (const [mi, m] of g.milestones.entries()) {
        await ctx.db.insert("milestones", {
          goalId,
          userId,
          title: m.title,
          description: m.description,
          order: mi,
          status: "planned",
          createdAt: nowIso(),
        });
      }
    }
    await recalcVisionProgress(ctx, visionId);
    const created = [];
    for (const id of createdIds) {
      const doc = await ctx.db.get(id as never);
      if (doc) created.push(doc);
    }
    return created;
  },
});

export const listGoals = query({
  args: { visionId: v.id("visions") },
  handler: async (ctx, { visionId }) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("goals")
      .withIndex("by_vision", (q) => q.eq("visionId", visionId))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const updateGoal = mutation({
  args: {
    goalId: v.id("goals"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    targetDate: v.optional(v.string()),
    status: v.optional(goalStatus),
  },
  handler: async (ctx, { goalId, ...patch }) => {
    const userId = await requireUserId(ctx);
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) throw new Error("Goal not found");
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) clean[key] = value;
    }
    await ctx.db.patch(goalId, clean);
    await recomputeGoalProgress(ctx, goalId);
    return (await ctx.db.get(goalId))!;
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await requireUserId(ctx);
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) return;
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    const milestoneIds = new Set(milestones.map((m) => m._id));
    for (const m of milestones) await ctx.db.delete(m._id);

    // Keep completed history intact, but remove links that now point nowhere.
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const commitment of commitments) {
      const linked =
        commitment.goalId === goalId ||
        (commitment.milestoneId !== undefined &&
          milestoneIds.has(commitment.milestoneId as Id<"milestones">));
      if (!linked) continue;
      await ctx.db.patch(commitment._id, {
        goalId: undefined,
        milestoneId: undefined,
      });
    }

    await ctx.db.delete(goalId);
    await recalcVisionProgress(ctx, goal.visionId);
  },
});

export const listMilestones = query({
  args: { goalId: v.id("goals") },
  handler: async (ctx, { goalId }) => {
    const userId = await requireUserId(ctx);
    const goal = await ctx.db.get(goalId);
    if (!goal || goal.userId !== userId) return [];
    const rows = await ctx.db
      .query("milestones")
      .withIndex("by_goal", (q) => q.eq("goalId", goalId))
      .collect();
    return rows.sort((a, b) => a.order - b.order);
  },
});

export const updateMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    order: v.optional(v.number()),
    targetDate: v.optional(v.string()),
    status: v.optional(goalStatus),
  },
  handler: async (ctx, { milestoneId, ...patch }) => {
    const userId = await requireUserId(ctx);
    const milestone = await ctx.db.get(milestoneId);
    if (!milestone || milestone.userId !== userId) {
      throw new Error("Milestone not found");
    }
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) clean[key] = value;
    }
    if (clean.status === "completed" && !milestone.completedAt) {
      clean.completedAt = nowIso();
    }
    await ctx.db.patch(milestoneId, clean);
    await recomputeGoalProgress(ctx, milestone.goalId);
    return (await ctx.db.get(milestoneId))!;
  },
});

export const complete = mutation({
  args: { milestoneId: v.id("milestones") },
  handler: async (ctx, { milestoneId }) => {
    const userId = await requireUserId(ctx);
    const milestone = await ctx.db.get(milestoneId);
    if (!milestone || milestone.userId !== userId) {
      throw new Error("Milestone not found");
    }
    await ctx.db.patch(milestoneId, {
      status: "completed" as const,
      completedAt: nowIso(),
    });
    await recomputeGoalProgress(ctx, milestone.goalId);
    await awardXp(ctx, userId, "milestone_completed", milestoneId);
    await unlock(ctx, userId, "milestone_reached");
    return (await ctx.db.get(milestoneId))!;
  },
});

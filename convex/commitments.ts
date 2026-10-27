import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  awardXp,
  bumpStreak,
  nowIso,
  notify,
  recalcVisionProgress,
  requireUserId,
  todayKeyForUser,
  unlock,
} from "./lib";

const state = v.union(
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("missed"),
  v.literal("rescheduled"),
  v.literal("cancelled"),
);

async function transition(
  ctx: MutationCtx,
  commitment: Doc<"commitments">,
  to: "planned" | "in_progress" | "completed" | "missed" | "rescheduled" | "cancelled",
  note?: string,
) {
  await ctx.db.insert("commitmentEvents", {
    commitmentId: commitment._id,
    userId: commitment.userId,
    from: commitment.state,
    to,
    at: nowIso(),
    note,
  });
  await ctx.db.patch(commitment._id, { state: to, updatedAt: nowIso() });
}

export const list = query({
  args: {
    state: v.optional(v.array(state)),
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    visionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((c) => !args.state || args.state.includes(c.state))
      .filter((c) => !args.from || c.dueAt >= args.from)
      .filter((c) => !args.to || c.dueAt <= args.to)
      .filter((c) => !args.visionId || c.visionId === args.visionId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  },
});

export const get = query({
  args: { id: v.id("commitments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return null;
    return doc;
  },
});

const inputArgs = {
  title: v.string(),
  note: v.optional(v.string()),
  dueAt: v.string(),
  visionId: v.optional(v.string()),
  goalId: v.optional(v.string()),
  milestoneId: v.optional(v.string()),
  visibility: v.optional(v.union(v.literal("private"), v.literal("partner"))),
};

export const create = mutation({
  args: inputArgs,
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (!args.title.trim()) throw new Error("Commitments need a clear title.");
    const ts = nowIso();
    const id = await ctx.db.insert("commitments", {
      userId,
      visionId: args.visionId,
      goalId: args.goalId,
      milestoneId: args.milestoneId,
      title: args.title.trim(),
      note: args.note,
      dueAt: args.dueAt,
      state: "planned",
      visibility: args.visibility ?? "private",
      createdAt: ts,
      updatedAt: ts,
    });
    const doc = (await ctx.db.get(id))!;
    await transition(ctx, doc, "planned");
    return (await ctx.db.get(id))!;
  },
});

export const start = mutation({
  args: { id: v.id("commitments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Commitment not found");
    await transition(ctx, doc, "in_progress");
    return (await ctx.db.get(id))!;
  },
});

export const complete = mutation({
  args: { id: v.id("commitments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Commitment not found");
    const priorCompleted = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const firstEver = !priorCompleted.some((c) => c.state === "completed");
    await transition(ctx, doc, "completed");
    await ctx.db.patch(id, { completedAt: nowIso() });
    await awardXp(ctx, userId, "commitment_completed", id);
    await bumpStreak(ctx, userId);
    if (firstEver) await unlock(ctx, userId, "first_commitment");
    if (doc.visionId) await recalcVisionProgress(ctx, doc.visionId);
    return (await ctx.db.get(id))!;
  },
});

export const miss = mutation({
  args: { id: v.id("commitments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Commitment not found");
    await transition(ctx, doc, "missed");
    await ctx.db.patch(id, { missedAt: nowIso() });
    // Support, not shame: a gentle recovery prompt (PRD principle).
    await notify(
      ctx,
      userId,
      "commitment_overdue",
      "That didn’t go as planned. Let’s reset.",
      "Open your commitment to reflect and make a recovery plan.",
      "/(tabs)/progress",
    );
    return (await ctx.db.get(id))!;
  },
});

export const reschedule = mutation({
  args: { id: v.id("commitments"), newDueAt: v.string() },
  handler: async (ctx, { id, newDueAt }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Commitment not found");
    await ctx.db.patch(id, { rescheduledFrom: doc.dueAt, dueAt: newDueAt });
    await transition(ctx, (await ctx.db.get(id))!, "rescheduled");
    return (await ctx.db.get(id))!;
  },
});

export const cancel = mutation({
  args: { id: v.id("commitments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Commitment not found");
    await transition(ctx, doc, "cancelled");
    return (await ctx.db.get(id))!;
  },
});

export const remove = mutation({
  args: { id: v.id("commitments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return;

    const events = await ctx.db
      .query("commitmentEvents")
      .withIndex("by_commitment", (q) => q.eq("commitmentId", id))
      .collect();
    for (const event of events) await ctx.db.delete(event._id);

    const others = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const other of others) {
      if (other.recoveryCommitmentId === id) {
        await ctx.db.patch(other._id, { recoveryCommitmentId: undefined });
      }
    }

    await ctx.db.delete(id);
  },
});

export const recover = mutation({
  args: {
    id: v.id("commitments"),
    blocker: v.string(),
    replacement: v.object(inputArgs),
  },
  handler: async (ctx, { id, blocker, replacement }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) throw new Error("Commitment not found");

    const ts = nowIso();
    const recoveryId = await ctx.db.insert("commitments", {
      userId,
      visionId: replacement.visionId,
      goalId: replacement.goalId,
      milestoneId: replacement.milestoneId,
      title: replacement.title.trim(),
      note: replacement.note,
      dueAt: replacement.dueAt,
      state: "planned",
      visibility: replacement.visibility ?? "private",
      createdAt: ts,
      updatedAt: ts,
    });
    const recovery = (await ctx.db.get(recoveryId))!;
    await transition(ctx, recovery, "planned");

    await ctx.db.patch(id, { recoveryCommitmentId: recoveryId });
    await transition(ctx, doc, "missed", `Blocker: ${blocker}`);
    await ctx.db.insert("checkIns", {
      userId,
      commitmentId: id,
      day: await todayKeyForUser(ctx, userId),
      kind: "recovery",
      status: "blocked",
      blocker,
      nextAction: replacement.title,
      createdAt: nowIso(),
    });
    await awardXp(ctx, userId, "recovery", id);
    await unlock(ctx, userId, "recovery");
    return recovery;
  },
});

/**
 * Scheduled sweep: open commitments whose due date has passed become missed.
 * Runs on the Convex cron in `convex/crons.ts`.
 */
export const markOverdue = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = nowIso();
    let marked = 0;
    for (const state of ["planned", "in_progress", "rescheduled"] as const) {
      const rows = await ctx.db
        .query("commitments")
        .withIndex("by_state_due", (q) =>
          q.eq("state", state).lt("dueAt", now),
        )
        .collect();
      for (const doc of rows) {
        await transition(ctx, doc, "missed");
        await ctx.db.patch(doc._id, { missedAt: nowIso() });
        await notify(
          ctx,
          doc.userId as Id<"users">,
          "commitment_overdue",
          "That didn’t go as planned. Let’s reset.",
          "Open your commitment to reflect and make a recovery plan.",
          "/(tabs)/progress",
        );
        marked += 1;
      }
    }
    return { marked };
  },
});

export const listEvents = query({
  args: { commitmentId: v.id("commitments") },
  handler: async (ctx, { commitmentId }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(commitmentId);
    if (!doc || doc.userId !== userId) return [];
    const rows = await ctx.db
      .query("commitmentEvents")
      .withIndex("by_commitment", (q) => q.eq("commitmentId", commitmentId))
      .collect();
    return rows.sort((a, b) => a.at.localeCompare(b.at));
  },
});

export type { Id };

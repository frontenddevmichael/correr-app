import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { LIMITS } from "../src/core/validation";
import {
  awardXp,
  enforceRateLimit,
  nowIso,
  notify,
  randomInviteCode,
  requireUserId,
  unlock,
} from "./lib";

const defaultSharing = () => ({
  todayCommitments: true,
  completionHistory: false,
  streakAndXp: false,
  weeklyReview: false,
});

async function activePartnership(ctx: QueryCtx | MutationCtx, userId: string) {
  const mine = await ctx.db
    .query("partnerships")
    .withIndex("by_initiator", (q) => q.eq("initiatorId", userId))
    .collect();
  const asPartner = await ctx.db
    .query("partnerships")
    .withIndex("by_partner", (q) => q.eq("partnerId", userId))
    .collect();
  return (
    [...mine, ...asPartner].find((p) => p.status !== "ended") ?? null
  );
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await activePartnership(ctx, userId as string);
  },
});

export const createInvite = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const ts = nowIso();
    const id = await ctx.db.insert("partnerships", {
      initiatorId: userId,
      partnerId: "",
      status: "pending",
      sharing: defaultSharing(),
      inviteCode: randomInviteCode(),
      createdAt: ts,
    });
    return (await ctx.db.get(id))!;
  },
});

export const acceptInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUserId(ctx);
    const normalized = code.trim().toUpperCase();
    const rows = await ctx.db
      .query("partnerships")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", normalized))
      .collect();
    const pending = rows.find((p) => p.status === "pending");
    if (!pending) {
      throw new Error("That invite code doesn’t match an active invitation.");
    }
    if (pending.initiatorId === userId) {
      throw new Error("That’s your own invite code.");
    }
    await ctx.db.patch(pending._id, {
      partnerId: userId,
      status: "active",
      startedAt: nowIso(),
    });
    return (await ctx.db.get(pending._id))!;
  },
});

export const getPartnerProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const partnership = await ctx.db
      .query("partnerships")
      .withIndex("by_initiator", (q) => q.eq("initiatorId", userId))
      .collect();
    const active = [...partnership].find((p) => p.status === "active");
    const asPartner = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerId", userId))
      .collect();
    const found =
      active ?? asPartner.find((p) => p.status === "active");
    if (!found) return null;
    const partnerId =
      found.initiatorId === userId ? found.partnerId : found.initiatorId;
    if (!partnerId) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", partnerId))
      .first();
  },
});

export const connectDemoPartner = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const ts = nowIso();

    // The demo partner is a synthetic profile (no auth account) so the
    // accountability flow stays walkable before real OAuth users exist.
    const demoUserId = "demo-partner-jordan";
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", demoUserId))
      .first();
    if (!existingProfile) {
      await ctx.db.insert("profiles", {
        userId: demoUserId,
        displayName: "Jordan",
        timezone: "UTC",
        avatarColor: "#14161A",
        level: "Starter",
        xp: 0,
        onboardingState: "done",
        notificationPrefs: {
          commitmentReminders: true,
          commitmentOverdue: true,
          partnerInteractions: true,
          dailyCheckIn: true,
          dailyCheckInWindow: "20:00",
          weeklyReview: true,
          weeklyReviewDay: 0,
          aiInsights: true,
          quietHoursStart: "22:00",
          quietHoursEnd: "07:00",
        },
      });
    }

    const existing = await activePartnership(ctx, userId as string);
    let partnership: Doc<"partnerships">;
    if (existing && existing.status === "pending") {
      await ctx.db.patch(existing._id, {
        partnerId: demoUserId,
        status: "active",
        startedAt: ts,
      });
      partnership = (await ctx.db.get(existing._id))!;
    } else if (existing) {
      partnership = existing;
    } else {
      const id = await ctx.db.insert("partnerships", {
        initiatorId: userId,
        partnerId: demoUserId,
        status: "active",
        sharing: defaultSharing(),
        inviteCode: randomInviteCode(),
        startedAt: ts,
        createdAt: ts,
      });
      partnership = (await ctx.db.get(id))!;
    }

    // A welcome nudge from the demo partner, so the feed isn't empty.
    const interactions = await ctx.db
      .query("interactions")
      .withIndex("by_partnership", (q) =>
        q.eq("partnershipId", partnership._id),
      )
      .collect();
    if (interactions.length === 0) {
      await ctx.db.insert("interactions", {
        partnershipId: partnership._id,
        fromUserId: demoUserId,
        toUserId: userId,
        kind: "encourage",
        message:
          "Let’s run! Share today’s commitment and I’ll hold you to it.",
        createdAt: nowIso(),
      });
    }

    await notify(
      ctx,
      userId,
      "partner_interaction",
      "Jordan connected",
      "Your accountability partner is in. Share today’s commitment to get started.",
      "/accountability",
    );
    return partnership;
  },
});

export const updateSharing = mutation({
  args: {
    partnershipId: v.id("partnerships"),
    patch: v.object({
      todayCommitments: v.optional(v.boolean()),
      completionHistory: v.optional(v.boolean()),
      streakAndXp: v.optional(v.boolean()),
      weeklyReview: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { partnershipId, patch }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(partnershipId);
    if (!doc || (doc.initiatorId !== userId && doc.partnerId !== userId)) {
      throw new Error("No active partnership.");
    }
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) clean[key] = value;
    }
    await ctx.db.patch(partnershipId, {
      sharing: { ...doc.sharing, ...clean },
    });
    return (await ctx.db.get(partnershipId))!;
  },
});

export const end = mutation({
  args: { partnershipId: v.id("partnerships") },
  handler: async (ctx, { partnershipId }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(partnershipId);
    if (!doc || (doc.initiatorId !== userId && doc.partnerId !== userId)) return;
    await ctx.db.patch(partnershipId, {
      status: "ended",
      endedAt: nowIso(),
    });
  },
});

export const addSafetyRecord = mutation({
  args: {
    subjectId: v.string(),
    kind: v.union(v.literal("block"), v.literal("report")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { subjectId, kind, reason }) => {
    const userId = await requireUserId(ctx);
    await ctx.db.insert("safetyRecords", {
      reporterId: userId,
      subjectId,
      kind,
      reason,
      createdAt: nowIso(),
    });
  },
});

export const sendInteraction = mutation({
  args: {
    partnershipId: v.id("partnerships"),
    commitmentId: v.optional(v.string()),
    kind: v.union(v.literal("confirm"), v.literal("encourage"), v.literal("question")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const partnership = await ctx.db.get(args.partnershipId);
    if (
      !partnership ||
      partnership.status !== "active" ||
      (partnership.initiatorId !== userId && partnership.partnerId !== userId)
    ) {
      throw new Error("No active partnership.");
    }
    const message = args.message.trim();
    if (!message) throw new Error("Write a short message first.");
    if (message.length > LIMITS.message) {
      throw new Error("That message is too long.");
    }
    await enforceRateLimit(ctx, userId, "partner_interaction", 20, 60_000);
    const toUserId =
      partnership.initiatorId === userId
        ? partnership.partnerId
        : partnership.initiatorId;
    const id = await ctx.db.insert("interactions", {
      partnershipId: args.partnershipId,
      fromUserId: userId,
      toUserId,
      commitmentId: args.commitmentId,
      kind: args.kind,
      message,
      createdAt: nowIso(),
    });
    const sender = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    await notify(
      ctx,
      toUserId as Id<"users">,
      "partner_interaction",
      sender?.displayName
        ? `${sender.displayName} sent you a nudge`
        : "Your partner sent you a nudge",
      message.length > 120 ? `${message.slice(0, 117)}...` : message,
      "/accountability",
    );
    if (args.kind === "encourage") {
      await awardXp(ctx, userId, "encourage_partner", id);
      await unlock(ctx, userId, "supportive_partner");
    }
    return (await ctx.db.get(id))!;
  },
});

export const listInteractions = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const mine = await ctx.db
      .query("partnerships")
      .withIndex("by_initiator", (q) => q.eq("initiatorId", userId))
      .collect();
    const asPartner = await ctx.db
      .query("partnerships")
      .withIndex("by_partner", (q) => q.eq("partnerId", userId))
      .collect();
    const ids = new Set<string>(
      [...mine, ...asPartner]
        .filter((p) => p.status === "active")
        .map((p) => p._id),
    );
    if (ids.size === 0) return [];
    const rows = await ctx.db
      .query("interactions")
      .withIndex("by_partnership", (q) =>
        q.eq("partnershipId", [...ids][0]),
      )
      .collect();
    // Also fetch interactions for any other active partnerships.
    const rest: Doc<"interactions">[] = [];
    for (const id of [...ids].slice(1)) {
      rest.push(
        ...(await ctx.db
          .query("interactions")
          .withIndex("by_partnership", (q) => q.eq("partnershipId", id))
          .collect()),
      );
    }
    return [...rows, ...rest]
      .filter((i) => ids.has(i.partnershipId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

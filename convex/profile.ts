import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  defaultNotificationPrefs,
  ensureProfile,
  nowIso,
  requireUserId,
} from "./lib";

type UserOwnedTable =
  | "visions"
  | "goals"
  | "milestones"
  | "discoveries"
  | "commitments"
  | "commitmentEvents"
  | "checkIns"
  | "xpTransactions"
  | "streaks"
  | "userAchievements"
  | "conversations"
  | "messages"
  | "insights"
  | "notifications"
  | "circleMembers"
  | "circlePosts"
  | "subscriptions";

async function deleteUserOwnedRows(
  ctx: MutationCtx,
  tableName: UserOwnedTable,
  userId: string,
) {
  const rows = await ctx.db
    .query(tableName)
    .filter((q) => q.eq(q.field("userId"), userId))
    .collect();
  for (const row of rows) await ctx.db.delete(row._id);
}

const prefsValidator = v.object({
  commitmentReminders: v.boolean(),
  commitmentOverdue: v.boolean(),
  partnerInteractions: v.boolean(),
  dailyCheckIn: v.boolean(),
  dailyCheckInWindow: v.string(),
  weeklyReview: v.boolean(),
  weeklyReviewDay: v.number(),
  aiInsights: v.boolean(),
  quietHoursStart: v.string(),
  quietHoursEnd: v.string(),
});

/** Session identity + profile in one read (used by ApiProvider.refresh). */
export const me = query({
  args: {},
  handler: async (ctx) => {
    // Tolerant: returns null when signed out (the adapter's getSession path).
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    return {
      id: userId as string,
      email: user.email ?? "",
      createdAt: new Date(user._creationTime * 1000).toISOString(),
      profile: profile ?? null,
    };
  },
});

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
  },
});

export const ensure = mutation({
  args: { timezone: v.optional(v.string()) },
  handler: async (ctx, { timezone }) => {
    const userId = await requireUserId(ctx);
    return await ensureProfile(ctx, userId, undefined, timezone);
  },
});

export const update = mutation({
  args: {
    displayName: v.optional(v.string()),
    timezone: v.optional(v.string()),
    avatarColor: v.optional(v.string()),
    bio: v.optional(v.string()),
    focusAreas: v.optional(v.array(v.string())),
    appearance: v.optional(v.string()),
    onboardingState: v.optional(
      v.union(
        v.literal("welcome"),
        v.literal("profile"),
        v.literal("vision"),
        v.literal("discovery"),
        v.literal("roadmap"),
        v.literal("accountability"),
        v.literal("firstCommitment"),
        v.literal("done"),
      ),
    ),
    notificationPrefs: v.optional(prefsValidator),
    coachingTone: v.optional(v.string()),
    coachLength: v.optional(v.string()),
    coachContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ensureProfile(ctx, userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found");
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(profile._id, patch);
    return (await ctx.db.get(profile._id))!;
  },
});

/**
 * Campus membership is assigned by an operator, never by the student. Keeping
 * this internal prevents a user from granting themselves another org's data.
 */
export const setCampus = internalMutation({
  args: {
    userId: v.id("users"),
    campusOrgId: v.optional(v.string()),
    campusRole: v.optional(
      v.union(v.literal("student"), v.literal("staff"), v.literal("admin")),
    ),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as string))
      .first();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, {
      ...(args.campusOrgId !== undefined
        ? { campusOrgId: args.campusOrgId }
        : {}),
      ...(args.campusRole !== undefined
        ? { campusRole: args.campusRole }
        : {}),
    });
    return (await ctx.db.get(profile._id))!;
  },
});

/** Wipe the signed-in user's data (mock parity for resetDemoData). */
export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await resetUserData(ctx, userId);
  },
});

/** Internal entry point for support and CLI-driven account resets. */
export const resetForUser = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await resetUserData(ctx, userId);
  },
});

/**
 * Consent capture at sign-up: stores the policy version with a server
 * timestamp. Deliberately its own mutation (not part of `update`) so consent
 * cannot be set through the generic profile patch.
 */
export const recordConsent = mutation({
  args: { version: v.string() },
  handler: async (ctx, { version }) => {
    const userId = await requireUserId(ctx);
    await ensureProfile(ctx, userId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) throw new Error("Profile not found");
    const consentAt = nowIso();
    await ctx.db.patch(profile._id, { consentVersion: version, consentAt });
    return { consentVersion: version, consentAt };
  },
});

export async function resetUserData(ctx: MutationCtx, userId: Id<"users">) {
  const userIdString = userId as string;

  // Conversations own messages; delete children first.
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userIdString))
      .collect();
    for (const conversation of conversations) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) =>
          q.eq("conversationId", conversation._id),
        )
        .collect();
      for (const message of messages) await ctx.db.delete(message._id);
    }

    // Circles owned by the user: remove members, posts, and shared goals.
    const circles = await ctx.db.query("circles").collect();
    for (const circle of circles.filter((row) => row.ownerId === userIdString)) {
      const circleId = circle._id as string;
      const members = await ctx.db
        .query("circleMembers")
        .withIndex("by_circle_user", (q) => q.eq("circleId", circleId))
        .collect();
      for (const member of members) await ctx.db.delete(member._id);
      const posts = await ctx.db
        .query("circlePosts")
        .withIndex("by_circle", (q) => q.eq("circleId", circleId))
        .collect();
      for (const post of posts) await ctx.db.delete(post._id);
      const goals = await ctx.db
        .query("sharedGoals")
        .filter((q) => q.eq(q.field("circleId"), circleId))
        .collect();
      for (const goal of goals) await ctx.db.delete(goal._id);
      await ctx.db.delete(circle._id);
    }

    // Partnerships involving the user, plus their interactions and shared goals.
    const partnerships = await ctx.db.query("partnerships").collect();
    for (const partnership of partnerships.filter(
      (row) =>
        row.initiatorId === userIdString || row.partnerId === userIdString,
    )) {
      const partnershipId = partnership._id as string;
      const interactions = await ctx.db
        .query("interactions")
        .withIndex("by_partnership", (q) =>
          q.eq("partnershipId", partnershipId),
        )
        .collect();
      for (const interaction of interactions) {
        await ctx.db.delete(interaction._id);
      }
      const sharedGoals = await ctx.db
        .query("sharedGoals")
        .filter((q) => q.eq(q.field("partnershipId"), partnershipId))
        .collect();
      for (const goal of sharedGoals) await ctx.db.delete(goal._id);
      await ctx.db.delete(partnership._id);
    }

    // Any interactions or safety records that remain tied directly to the user.
    const interactions = await ctx.db.query("interactions").collect();
    for (const interaction of interactions.filter(
      (row) =>
        row.fromUserId === userIdString || row.toUserId === userIdString,
    )) {
      await ctx.db.delete(interaction._id);
    }

    const safetyRecords = await ctx.db.query("safetyRecords").collect();
    for (const record of safetyRecords.filter(
      (row) =>
        row.reporterId === userIdString || row.subjectId === userIdString,
    )) {
      await ctx.db.delete(record._id);
    }

    // Hackathon teams: leave teams, delete solo teams and their children.
    const teams = await ctx.db.query("hackathonTeams").collect();
    for (const team of teams.filter(
      (row) =>
        row.memberIds.includes(userIdString) ||
        row.ownerId === userIdString,
    )) {
      const remaining = team.memberIds.filter((id) => id !== userIdString);
      if (remaining.length === 0) {
        const milestones = await ctx.db
          .query("hackathonMilestones")
          .withIndex("by_team", (q) => q.eq("teamId", team._id as string))
          .collect();
        for (const milestone of milestones) {
          await ctx.db.delete(milestone._id);
        }
        const submissions = await ctx.db
          .query("hackathonSubmissions")
          .withIndex("by_hackathon", (q) =>
            q.eq("hackathonId", team.hackathonId),
          )
          .collect();
        for (const submission of submissions.filter(
          (row) => row.teamId === (team._id as string),
        )) {
          await ctx.db.delete(submission._id);
        }
        await ctx.db.delete(team._id);
      } else {
        await ctx.db.patch(team._id, {
          memberIds: remaining,
          ownerId: team.ownerId === userIdString ? remaining[0] : team.ownerId,
        });
      }
    }

    // Challenges keep their history; just remove this participant.
    const challenges = await ctx.db.query("challenges").collect();
    for (const challenge of challenges.filter((row) =>
      row.participantIds.includes(userIdString),
    )) {
      await ctx.db.patch(challenge._id, {
        participantIds: challenge.participantIds.filter(
          (id) => id !== userIdString,
        ),
      });
    }

    // Shared goals that survived the circle/partnership cleanup.
    const sharedGoals = await ctx.db.query("sharedGoals").collect();
    for (const goal of sharedGoals.filter((row) =>
      row.participantIds.includes(userIdString),
    )) {
      const remaining = goal.participantIds.filter(
        (id) => id !== userIdString,
      );
      if (remaining.length === 0) await ctx.db.delete(goal._id);
      else await ctx.db.patch(goal._id, { participantIds: remaining });
    }

    // Straightforward user-owned rows.
    const ownedTables: UserOwnedTable[] = [
      "visions",
      "goals",
      "milestones",
      "discoveries",
      "commitments",
      "commitmentEvents",
      "checkIns",
      "xpTransactions",
      "streaks",
      "userAchievements",
      "conversations",
      "messages",
      "insights",
      "notifications",
      "circleMembers",
      "circlePosts",
      "subscriptions",
    ];
    for (const tableName of ownedTables) {
      await deleteUserOwnedRows(ctx, tableName, userIdString);
    }

    const rateLimits = await ctx.db.query("rateLimits").collect();
    for (const row of rateLimits.filter((entry) =>
      entry.key.startsWith(`${userIdString}:`),
    )) {
      await ctx.db.delete(row._id);
    }

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userIdString))
      .first();
    if (profile) {
      await ctx.db.patch(profile._id, {
        level: "Starter",
        xp: 0,
        onboardingState: "profile",
        notificationPrefs: defaultNotificationPrefs(),
      });
    }
}

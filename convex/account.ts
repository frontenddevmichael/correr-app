import { mutation, query } from "./_generated/server";
import { requireUserId } from "./lib";
import { resetUserData } from "./profile";

/**
 * Account — data portability and erasure (GDPR/NDPR + Apple's required
 * in-app account deletion).
 *
 * `deleteAccount` reuses the same wipe as reset (every application row tied
 * to the user), then removes what reset keeps: the profile row itself and the
 * auth records — sessions, refresh tokens, accounts, verification codes,
 * rate-limit buckets — and finally the `users` row, which frees the email.
 *
 * `exportData` returns the same inventory as JSON-ready objects, so the app
 * can hand the user their data in a portable format.
 */

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx); // Id<"users">
    const uid = userId as string;
    const user = await ctx.db.get(userId);
    const email = user?.email ?? null;

    // Fix member counts for circles the user merely belongs to — the wipe
    // below only tears down circles they own (where memberCount dies with it).
    const memberships = await ctx.db
      .query("circleMembers")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .collect();
    const circles = await ctx.db.query("circles").collect();
    for (const membership of memberships) {
      const circle = circles.find((row) => row._id === membership.circleId);
      if (!circle || circle.ownerId === uid) continue;
      if (circle.memberCount > 0) {
        await ctx.db.patch(circle._id, { memberCount: circle.memberCount - 1 });
      }
    }

    // All application data (same helper the support reset uses).
    await resetUserData(ctx, userId);

    // The profile row itself — reset keeps it, deletion must not.
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .first();
    if (profile) await ctx.db.delete(profile._id);

    // ---------- auth records (credentials + PII) ----------
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) await ctx.db.delete(code._id);
      await ctx.db.delete(account._id);
    }

    // Auth rate-limit buckets keyed by the raw user id or the email identifier.
    const identifiers = email && email !== uid ? [uid, email] : [uid];
    for (const identifier of identifiers) {
      const rows = await ctx.db
        .query("authRateLimits")
        .withIndex("identifier", (q) => q.eq("identifier", identifier))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
    }

    // Opaque, short-lived auth verifiers carry no PII and expire on their own;
    // everything identifiable is gone with the rows above.

    await ctx.db.delete(userId);
    return { ok: true as const };
  },
});

export const exportData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const uid = userId as string;
    const user = await ctx.db.get(userId);

    const owned = (rows: { userId?: string }[]) =>
      rows.filter((row) => row.userId === uid);

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", uid))
      .first();

    const visions = await ctx.db
      .query("visions")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const goals = await ctx.db
      .query("goals")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const milestones = await ctx.db
      .query("milestones")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const discoveries = await ctx.db
      .query("discoveries")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const commitments = await ctx.db
      .query("commitments")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const commitmentEvents = await ctx.db
      .query("commitmentEvents")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const checkIns = await ctx.db
      .query("checkIns")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const xpTransactions = await ctx.db
      .query("xpTransactions")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const streaks = await ctx.db
      .query("streaks")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const userAchievements = await ctx.db
      .query("userAchievements")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const insights = await ctx.db
      .query("insights")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const circleMembers = await ctx.db
      .query("circleMembers")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();
    const circlePosts = await ctx.db
      .query("circlePosts")
      .filter((q) => q.eq(q.field("userId"), uid))
      .collect();

    // Messages: mine by userId, plus every message in my conversations
    // (assistant turns carry the user id too, but the conversation sweep makes
    // the export complete either way).
    const conversationIds = new Set(
      conversations.map((row) => row._id as string),
    );
    const allMessages = await ctx.db.query("messages").collect();
    const messages = allMessages.filter(
      (row) => row.userId === uid || conversationIds.has(row.conversationId),
    );

    const partnerships = await ctx.db
      .query("partnerships")
      .filter((q) =>
        q.or(
          q.eq(q.field("initiatorId"), uid),
          q.eq(q.field("partnerId"), uid),
        ),
      )
      .collect();
    const interactions = await ctx.db
      .query("interactions")
      .filter((q) =>
        q.or(q.eq(q.field("fromUserId"), uid), q.eq(q.field("toUserId"), uid)),
      )
      .collect();
    const safetyRecords = await ctx.db
      .query("safetyRecords")
      .filter((q) =>
        q.or(q.eq(q.field("reporterId"), uid), q.eq(q.field("subjectId"), uid)),
      )
      .collect();

    const allCircles = await ctx.db.query("circles").collect();
    const memberCircleIds = new Set(circleMembers.map((row) => row.circleId));
    const circles = allCircles.filter(
      (row) => row.ownerId === uid || memberCircleIds.has(row._id),
    );

    const allChallenges = await ctx.db.query("challenges").collect();
    const challenges = allChallenges.filter((row) =>
      row.participantIds.includes(uid),
    );
    const allSharedGoals = await ctx.db.query("sharedGoals").collect();
    const sharedGoals = allSharedGoals.filter((row) =>
      row.participantIds.includes(uid),
    );
    const allTeams = await ctx.db.query("hackathonTeams").collect();
    const hackathonTeams = allTeams.filter(
      (row) => row.ownerId === uid || row.memberIds.includes(uid),
    );

    return {
      exportedAt: new Date().toISOString(),
      account: {
        email: user?.email ?? null,
        createdAt: user
          ? new Date(user._creationTime * 1000).toISOString()
          : null,
      },
      profile,
      visions,
      goals,
      milestones,
      discoveries,
      commitments,
      commitmentEvents,
      checkIns,
      xpTransactions,
      streaks,
      userAchievements,
      conversations,
      messages,
      insights,
      notifications,
      subscriptions,
      partnerships,
      interactions,
      safetyRecords,
      circles,
      circleMembers,
      circlePosts,
      challenges,
      sharedGoals,
      hackathonTeams,
      note: "Export generated by Correr. Draft privacy terms mark this data as yours to export or delete at any time.",
    };
  },
});

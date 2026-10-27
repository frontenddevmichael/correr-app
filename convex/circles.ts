import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { LIMITS } from "../src/core/validation";
import { enforceRateLimit, nowIso, requireUserId } from "./lib";

async function membershipFor(
  ctx: QueryCtx | MutationCtx,
  circleId: Id<"circles">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_circle_user", (q) =>
      q.eq("circleId", circleId).eq("userId", userId),
    )
    .first();
}

// ---------- Circles ----------

export const listCircles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const [all, memberships] = await Promise.all([
      ctx.db.query("circles").collect(),
      ctx.db
        .query("circleMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);
    const memberOf = new Set(memberships.map((m) => m.circleId));
    return all
      .filter((c) => !c.isPrivate || memberOf.has(c._id))
      .map((c) => ({ ...c, viewerIsMember: memberOf.has(c._id) }));
  },
});

export const createCircle = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, { name, description, isPrivate }) => {
    const userId = await requireUserId(ctx);
    if (!name.trim()) throw new Error("Give your circle a name first.");
    if (name.trim().length > LIMITS.titleMax) {
      throw new Error("That circle name is too long.");
    }
    if (description.length > LIMITS.mediumText) {
      throw new Error("That circle description is too long.");
    }
    const ts = nowIso();
    const id = await ctx.db.insert("circles", {
      name: name.trim(),
      description,
      ownerId: userId,
      memberCount: 1,
      isPrivate,
      createdAt: ts,
    });
    await ctx.db.insert("circleMembers", {
      circleId: id,
      userId,
      role: "owner",
      joinedAt: ts,
    });
    return (await ctx.db.get(id))!;
  },
});

export const joinCircle = mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }) => {
    const userId = await requireUserId(ctx);
    const circle = await ctx.db.get(circleId);
    if (!circle) throw new Error("Circle not found.");
    const existing = await membershipFor(ctx, circleId, userId);
    if (existing) return;
    if (circle.isPrivate) {
      throw new Error("This circle is private. Ask the owner for an invite.");
    }
    await ctx.db.insert("circleMembers", {
      circleId,
      userId,
      role: "member",
      joinedAt: nowIso(),
    });
    await ctx.db.patch(circleId, { memberCount: circle.memberCount + 1 });
  },
});

export const leaveCircle = mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }) => {
    const userId = await requireUserId(ctx);
    const membership = await membershipFor(ctx, circleId, userId);
    if (!membership) return;
    if (membership.role === "owner") {
      throw new Error("Owners cannot leave their own circle.");
    }
    await ctx.db.delete(membership._id);
    const circle = await ctx.db.get(circleId);
    if (circle) {
      await ctx.db.patch(circleId, {
        memberCount: Math.max(1, circle.memberCount - 1),
      });
    }
  },
});

export const deleteCircle = mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }) => {
    const userId = await requireUserId(ctx);
    const circle = await ctx.db.get(circleId);
    if (!circle) return;
    if (circle.ownerId !== userId) {
      throw new Error("Only the owner can delete this circle.");
    }

    const posts = await ctx.db
      .query("circlePosts")
      .withIndex("by_circle", (q) => q.eq("circleId", circleId))
      .collect();
    for (const post of posts) await ctx.db.delete(post._id);

    const members = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) => q.eq("circleId", circleId))
      .collect();
    for (const member of members) await ctx.db.delete(member._id);

    const sharedGoals = await ctx.db.query("sharedGoals").collect();
    for (const goal of sharedGoals) {
      if (goal.circleId === circleId) await ctx.db.delete(goal._id);
    }

    await ctx.db.delete(circleId);
  },
});

export const listPosts = query({
  args: { circleId: v.id("circles") },
  handler: async (ctx, { circleId }) => {
    const userId = await requireUserId(ctx);
    const circle = await ctx.db.get(circleId);
    if (!circle) return [];
    if (circle.isPrivate) {
      const membership = await membershipFor(ctx, circleId, userId);
      if (!membership) throw new Error("This circle is private.");
    }
    const rows = await ctx.db
      .query("circlePosts")
      .withIndex("by_circle", (q) => q.eq("circleId", circleId))
      .collect();
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const createPost = mutation({
  args: {
    circleId: v.id("circles"),
    content: v.string(),
    kind: v.union(v.literal("win"), v.literal("checkin"), v.literal("general")),
  },
  handler: async (ctx, { circleId, content, kind }) => {
    const userId = await requireUserId(ctx);
    if (!content.trim()) throw new Error("Write something first.");
    if (content.trim().length > LIMITS.message) {
      throw new Error("That post is too long.");
    }
    const circle = await ctx.db.get(circleId);
    if (!circle) throw new Error("Circle not found.");
    const membership = await membershipFor(ctx, circleId, userId);
    if (!membership) throw new Error("Join this circle to post.");
    await enforceRateLimit(ctx, userId, "circle_post", 20, 60_000);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const id = await ctx.db.insert("circlePosts", {
      circleId,
      userId,
      authorName: profile?.displayName ?? "Runner",
      content: content.trim(),
      kind,
      createdAt: nowIso(),
    });
    return (await ctx.db.get(id))!;
  },
});

export const deletePost = mutation({
  args: { postId: v.id("circlePosts") },
  handler: async (ctx, { postId }) => {
    const userId = await requireUserId(ctx);
    const post = await ctx.db.get(postId);
    if (!post) return;
    const circle = await ctx.db.get(post.circleId as Id<"circles">);
    if (!circle) {
      await ctx.db.delete(postId);
      return;
    }
    const isOwner = circle.ownerId === userId;
    if (post.userId !== userId && !isOwner) {
      throw new Error("You can only delete your own posts.");
    }
    await ctx.db.delete(postId);
  },
});

// ---------- Challenges ----------

export const listChallenges = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const rows = await ctx.db.query("challenges").collect();
    return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },
});

export const joinChallenge = mutation({
  args: { challengeId: v.id("challenges") },
  handler: async (ctx, { challengeId }) => {
    const userId = await requireUserId(ctx);
    const challenge = await ctx.db.get(challengeId);
    if (!challenge) throw new Error("Challenge not found.");
    if (challenge.endAt < nowIso()) {
      throw new Error("This challenge has already ended.");
    }
    if (!challenge.participantIds.includes(userId)) {
      await ctx.db.patch(challengeId, {
        participantIds: [...challenge.participantIds, userId],
      });
    }
  },
});

// ---------- Shared goals ----------

export const listSharedGoals = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db.query("sharedGoals").collect();
    return rows.filter((g) => g.participantIds.includes(userId));
  },
});

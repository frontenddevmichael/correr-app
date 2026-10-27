import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { nowIso, randomInviteCode, requireUserId } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    const rows = await ctx.db.query("hackathons").collect();
    return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },
});

async function teamForUser(
  ctx: QueryCtx,
  hackathonId: string,
  userId: string,
): Promise<Doc<"hackathonTeams"> | null> {
  const rows = await ctx.db
    .query("hackathonTeams")
    .withIndex("by_hackathon", (q) => q.eq("hackathonId", hackathonId))
    .collect();
  return rows.find((t) => t.memberIds.includes(userId)) ?? null;
}

export const getTeam = query({
  args: { hackathonId: v.string() },
  handler: async (ctx, { hackathonId }) => {
    const userId = await requireUserId(ctx);
    return await teamForUser(ctx, hackathonId, userId as string);
  },
});

export const createTeam = mutation({
  args: { hackathonId: v.string(), name: v.string() },
  handler: async (ctx, { hackathonId, name }) => {
    const userId = await requireUserId(ctx);
    if (!name.trim()) throw new Error("Name your team first.");
    const id = await ctx.db.insert("hackathonTeams", {
      hackathonId,
      name: name.trim(),
      memberIds: [userId],
      ownerId: userId,
      inviteCode: randomInviteCode(),
    });
    return (await ctx.db.get(id))!;
  },
});

export const joinTeam = mutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("hackathonTeams")
      .withIndex("by_inviteCode", (q) =>
        q.eq("inviteCode", inviteCode.trim().toUpperCase()),
      )
      .collect();
    const team = rows[0];
    if (!team) throw new Error("That team code doesn’t match any team.");
    if (!team.memberIds.includes(userId)) {
      await ctx.db.patch(team._id, { memberIds: [...team.memberIds, userId] });
    }
    return (await ctx.db.get(team._id))!;
  },
});

export const listTeamMilestones = query({
  args: { teamId: v.id("hackathonTeams") },
  handler: async (ctx, { teamId }) => {
    const userId = await requireUserId(ctx);
    const team = await ctx.db.get(teamId);
    if (!team || !team.memberIds.includes(userId)) return [];
    const rows = await ctx.db
      .query("hackathonMilestones")
      .withIndex("by_team", (q) => q.eq("teamId", teamId))
      .collect();
    return rows;
  },
});

export const createTeamMilestone = mutation({
  args: {
    teamId: v.id("hackathonTeams"),
    title: v.string(),
    dueAt: v.string(),
  },
  handler: async (ctx, { teamId, title, dueAt }) => {
    const userId = await requireUserId(ctx);
    const team = await ctx.db.get(teamId);
    if (!team || !team.memberIds.includes(userId)) {
      throw new Error("Join the team first.");
    }
    if (!title.trim()) throw new Error("Give the milestone a title.");
    const id = await ctx.db.insert("hackathonMilestones", {
      hackathonId: team.hackathonId,
      teamId,
      title: title.trim(),
      dueAt,
      status: "planned",
    });
    return (await ctx.db.get(id))!;
  },
});

export const updateTeamMilestone = mutation({
  args: {
    id: v.id("hackathonMilestones"),
    title: v.optional(v.string()),
    dueAt: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("planned"), v.literal("active"), v.literal("completed")),
    ),
  },
  handler: async (ctx, { id, ...patch }) => {
    const userId = await requireUserId(ctx);
    const milestone = await ctx.db.get(id);
    if (!milestone) throw new Error("Milestone not found");
    const team = await ctx.db.get(milestone.teamId as Id<"hackathonTeams">);
    if (!team || !team.memberIds.includes(userId)) {
      throw new Error("Join the team first.");
    }
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) clean[key] = value;
    }
    await ctx.db.patch(id, clean);
    return (await ctx.db.get(id))!;
  },
});

export const submit = mutation({
  args: {
    hackathonId: v.string(),
    title: v.string(),
    description: v.string(),
    link: v.optional(v.string()),
  },
  handler: async (ctx, { hackathonId, title, description, link }) => {
    const userId = await requireUserId(ctx);
    const team = await teamForUser(ctx, hackathonId, userId as string);
    if (!team) throw new Error("Join a team before submitting.");
    if (!title.trim()) throw new Error("Give your submission a title.");
    const id = await ctx.db.insert("hackathonSubmissions", {
      hackathonId,
      teamId: team._id,
      title: title.trim(),
      description,
      link,
      submittedAt: nowIso(),
    });
    return (await ctx.db.get(id))!;
  },
});

export const listSubmissions = query({
  args: { hackathonId: v.string() },
  handler: async (ctx, { hackathonId }) => {
    await requireUserId(ctx);
    const rows = await ctx.db
      .query("hackathonSubmissions")
      .withIndex("by_hackathon", (q) => q.eq("hackathonId", hackathonId))
      .collect();
    return rows;
  },
});

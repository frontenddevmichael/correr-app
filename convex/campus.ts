import { v } from "convex/values";
import { query } from "./_generated/server";
import { MIN_COHORT_SIZE } from "../src/core/domain";
import { requireUserId } from "./lib";

/**
 * Privacy-preserving aggregate metrics — never row-level student data.
 * Cohorts smaller than MIN_COHORT_SIZE return null (k-anonymity rule).
 */
export const getMetrics = query({
  args: { orgId: v.string(), period: v.string() },
  handler: async (ctx, { orgId, period }) => {
    const userId = await requireUserId(ctx);
    const viewer = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const isCampusStaff =
      viewer?.campusRole === "staff" || viewer?.campusRole === "admin";
    if (!viewer || viewer.campusOrgId !== orgId || !isCampusStaff) {
      throw new Error("You don’t have access to this campus dashboard.");
    }
    const profiles = await ctx.db
      .query("profiles")
      .withIndex("by_campusOrg", (q) => q.eq("campusOrgId", orgId))
      .collect();
    if (profiles.length === 0) return null;
    const activeStudents = profiles.length;
    if (activeStudents < MIN_COHORT_SIZE) return null;

    const allCommitments: string[] = [];
    for (const profile of profiles) {
      const rows = await ctx.db
        .query("commitments")
        .withIndex("by_user", (q) => q.eq("userId", profile.userId))
        .collect();
      allCommitments.push(...rows.map((r) => r.state));
    }
    const completed = allCommitments.filter((s) => s === "completed").length;
    const due = allCommitments.filter((s) => s !== "cancelled").length || 1;
    const missed = allCommitments.filter((s) => s === "missed").length;

    return {
      orgId,
      period,
      activeStudents,
      // Placeholder rates until real cohort analytics exist (mock parity).
      activationRate: 0.62,
      weeklyRetention: 0.44,
      completionRate: completed / due,
      recoveryRate: completed / (completed + missed) || 0,
      cohortSize: activeStudents,
    };
  },
});

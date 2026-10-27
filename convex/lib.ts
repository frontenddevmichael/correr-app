import { getAuthUserId } from "@convex-dev/auth/server";
import type {
  FunctionReference,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  ACHIEVEMENT_DEFS,
  LEVEL_THRESHOLDS,
  XP_CONFIG,
  type LevelName,
  type NotificationKind,
  type NotificationPreferences,
} from "../src/core/domain";
import { dayKeyForTimezone } from "../src/core/date";

export async function requireUserId(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not signed in");
  return userId;
}

export function nowIso(): string {
  return new Date().toISOString();
}

/** UTC day key. Prefer `todayKeyForUser` on user-facing boundaries. */
export function todayKey(d = new Date()): string {
  return dayKeyForTimezone("UTC", d);
}

/** The user's stored timezone, defaulting to UTC when no profile exists. */
export async function timezoneForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<string> {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  return profile?.timezone || "UTC";
}

/** The user's local day key (`YYYY-MM-DD`). */
export async function todayKeyForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  date = new Date(),
): Promise<string> {
  return dayKeyForTimezone(await timezoneForUser(ctx, userId), date);
}

export function defaultNotificationPrefs() {
  return {
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
  };
}

export function levelForXp(xp: number): LevelName {
  let current: LevelName = LEVEL_THRESHOLDS[0].level;
  for (const t of LEVEL_THRESHOLDS) if (xp >= t.xp) current = t.level;
  return current;
}

/** Lazily create a profile row so every read path can assume one exists. */
export async function ensureProfile(
  ctx: MutationCtx,
  userId: Id<"users">,
  displayName?: string,
  timezone?: string,
) {
  const existing = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (existing) return existing;
  const user = await ctx.db.get(userId);
  let name = displayName?.trim() ?? "";
  if (!name && user?.email) name = user.email.split("@")[0];
  if (!name) name = "Runner";
  const id = await ctx.db.insert("profiles", {
    userId,
    displayName: name,
    timezone: timezone?.trim() || "UTC",
    avatarColor: "#14161A",
    level: "Starter",
    xp: 0,
    onboardingState: "profile",
    notificationPrefs: defaultNotificationPrefs(),
  });
  return (await ctx.db.get(id))!;
}

export async function awardXp(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: keyof typeof XP_CONFIG,
  refId?: string,
) {
  const amount = XP_CONFIG[action];
  await ctx.db.insert("xpTransactions", {
    userId,
    action,
    amount,
    refId,
    at: nowIso(),
  });
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  if (profile) {
    const xp = profile.xp + amount;
    await ctx.db.patch(profile._id, { xp, level: levelForXp(xp) });
  }
}

export async function bumpStreak(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const existing = await ctx.db
    .query("streaks")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const timezone = await timezoneForUser(ctx, userId);
  const today = dayKeyForTimezone(timezone);
  if (!existing) {
    await ctx.db.insert("streaks", {
      userId,
      commitmentStreak: 1,
      partnershipStreak: 0,
      lastActiveDay: today,
      bestStreak: 1,
    });
    return;
  }
  if (existing.lastActiveDay === today) return;
  const yesterday = dayKeyForTimezone(
    timezone,
    new Date(Date.now() - 86400000),
  );
  const commitmentStreak =
    existing.lastActiveDay === yesterday ? existing.commitmentStreak + 1 : 1;
  await ctx.db.patch(existing._id, {
    commitmentStreak,
    bestStreak: Math.max(existing.bestStreak, commitmentStreak),
    lastActiveDay: today,
  });
}

/**
 * Fixed-window per-user rate limit. Rows are small and cleaned up by the
 * daily maintenance cron. Throws before the caller writes any data.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: Id<"users"> | string,
  action: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${userId}:${action}`;
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!row) {
    await ctx.db.insert("rateLimits", { key, windowStart, count: 1 });
    return;
  }
  if (row.windowStart !== windowStart) {
    await ctx.db.patch(row._id, { windowStart, count: 1 });
    return;
  }
  if (row.count >= limit) {
    throw new Error("You’re doing that too quickly. Try again in a moment.");
  }
  await ctx.db.patch(row._id, { count: row.count + 1 });
}

type BooleanNotificationPref = {
  [K in keyof NotificationPreferences]: NotificationPreferences[K] extends boolean
    ? K
    : never;
}[keyof NotificationPreferences];

const notificationPrefKey: Partial<
  Record<NotificationKind, BooleanNotificationPref>
> = {
  commitment_reminder: "commitmentReminders",
  commitment_overdue: "commitmentOverdue",
  partner_interaction: "partnerInteractions",
  daily_checkin: "dailyCheckIn",
  weekly_review: "weeklyReview",
  ai_insight: "aiInsights",
};

export async function notify(
  ctx: MutationCtx,
  userId: Id<"users">,
  kind: NotificationKind,
  title: string,
  body: string,
  route?: string,
) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
  const prefKey = notificationPrefKey[kind];
  if (profile && prefKey && profile.notificationPrefs[prefKey] === false) {
    return;
  }
  await ctx.db.insert("notifications", {
    userId,
    kind,
    title,
    body,
    route,
    createdAt: nowIso(),
  });
}

export async function unlock(
  ctx: MutationCtx,
  userId: Id<"users">,
  achievementId:
    | "first_commitment"
    | "first_week"
    | "recovery"
    | "supportive_partner"
    | "milestone_reached",
) {
  const existing = await ctx.db
    .query("userAchievements")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (existing.some((a) => a.achievementId === achievementId)) return;
  await ctx.db.insert("userAchievements", {
    userId,
    achievementId,
    unlockedAt: nowIso(),
  });
  const def = ACHIEVEMENT_DEFS.find((a) => a.id === achievementId);
  await notify(
    ctx,
    userId,
    "achievement",
    `Achievement unlocked: ${def?.title ?? achievementId}`,
    def?.description ?? "",
    "/(tabs)/progress",
  );
}

/** Keep a vision's derived progress in sync with its goals (same math as the mock). */
export async function recalcVisionProgress(
  ctx: MutationCtx,
  visionId: string,
) {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_vision", (q) => q.eq("visionId", visionId))
    .collect();
  const vision = await ctx.db.get(visionId as Id<"visions">);
  if (!vision) return;
  if (goals.length === 0) {
    await ctx.db.patch(vision._id, { progressPercent: 0 });
    return;
  }
  const total = goals.reduce((sum) => sum + 100, 0);
  const done = goals.reduce((sum, g) => sum + g.progressPercent, 0);
  await ctx.db.patch(vision._id, {
    progressPercent: Math.round((done / total) * 100),
  });
}

/**
 * Reference-cast helpers for `ctx.runQuery` / `ctx.runMutation`.
 *
 * `query()`/`mutation()` produce RegisteredQuery/RegisteredMutation values,
 * while ActionCtx's run helpers accept FunctionReference — the same
 * conversion `ApiFromModules` performs for the generated `api` object.
 * Args and return types are preserved via `infer`, so call sites stay typed.
 */
type QueryRef<Q> = Q extends RegisteredQuery<infer V, infer A, infer R>
  ? FunctionReference<"query", V, A, R>
  : never;

type MutationRef<M> = M extends RegisteredMutation<infer V, infer A, infer R>
  ? FunctionReference<"mutation", V, A, R>
  : never;

export function asQueryRef<Q>(q: Q): QueryRef<Q> {
  return q as unknown as QueryRef<Q>;
}

export function asMutationRef<M>(m: M): MutationRef<M> {
  return m as unknown as MutationRef<M>;
}

/** Random 6-char invite code, workerd-safe. */
export function randomInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

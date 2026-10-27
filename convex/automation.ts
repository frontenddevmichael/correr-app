import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  dayKeyForTimezone,
  isQuietHours,
  isWithinMinutesWindow,
  minutesFromTimeKey,
  timeKeyForTimezone,
  weekdayForTimezone,
} from "../src/core/date";
import { notify } from "./lib";

async function hasNotificationForLocalDay(
  ctx: MutationCtx,
  userId: string,
  kind: "daily_checkin" | "weekly_review",
  timezone: string,
  date: Date,
): Promise<boolean> {
  const rows = await ctx.db
    .query("notifications")
    .withIndex("by_user_kind", (q) => q.eq("userId", userId).eq("kind", kind))
    .collect();
  const localDay = dayKeyForTimezone(timezone, date);
  return rows.some(
    (row) => dayKeyForTimezone(timezone, new Date(row.createdAt)) === localDay,
  );
}

async function checkInKindsForLocalDay(
  ctx: MutationCtx,
  userId: Id<"users">,
  localDay: string,
): Promise<Set<Doc<"checkIns">["kind"]>> {
  const rows = await ctx.db
    .query("checkIns")
    .withIndex("by_user_day", (q) =>
      q.eq("userId", userId).eq("day", localDay),
    )
    .collect();
  return new Set(rows.map((row) => row.kind));
}

/**
 * Timezone-aware reminder sweep.
 *
 * Runs every 15 minutes. For each profile it uses the profile's own timezone
 * and quiet-hours window, so a 20:00 check-in reminder means 20:00 locally —
 * not 20:00 UTC. One notification per local day per kind.
 */
export const sendReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date();
    const profiles = await ctx.db.query("profiles").collect();
    let sent = 0;

    for (const profile of profiles) {
      const prefs = profile.notificationPrefs;
      const timezone = profile.timezone || "UTC";
      const localDay = dayKeyForTimezone(timezone, now);
      const localTime = timeKeyForTimezone(timezone, now);
      const currentMinutes = minutesFromTimeKey(localTime);

      if (
        isQuietHours(
          localTime,
          prefs.quietHoursStart,
          prefs.quietHoursEnd,
        )
      ) {
        continue;
      }

      if (prefs.dailyCheckIn) {
        const window = minutesFromTimeKey(prefs.dailyCheckInWindow);
        if (isWithinMinutesWindow(currentMinutes, window)) {
          const [alreadySent, kinds] = await Promise.all([
            hasNotificationForLocalDay(
              ctx,
              profile.userId,
              "daily_checkin",
              timezone,
              now,
            ),
            checkInKindsForLocalDay(
              ctx,
              profile.userId as Id<"users">,
              localDay,
            ),
          ]);
          if (!alreadySent && !kinds.has("daily")) {
            await notify(
              ctx,
              profile.userId as Id<"users">,
              "daily_checkin",
              "How are you showing up today?",
              "A short check-in keeps your plan honest and your streak alive.",
              "/(tabs)",
            );
            sent += 1;
          }
        }
      }

      if (
        prefs.weeklyReview &&
        weekdayForTimezone(timezone, now) === prefs.weeklyReviewDay
      ) {
        const window = 17 * 60;
        if (isWithinMinutesWindow(currentMinutes, window)) {
          const [alreadySent, kinds] = await Promise.all([
            hasNotificationForLocalDay(
              ctx,
              profile.userId,
              "weekly_review",
              timezone,
              now,
            ),
            checkInKindsForLocalDay(
              ctx,
              profile.userId as Id<"users">,
              localDay,
            ),
          ]);
          if (!alreadySent && !kinds.has("weekly")) {
            await notify(
              ctx,
              profile.userId as Id<"users">,
              "weekly_review",
              "A look back at your week",
              "Ten minutes of reflection makes next week lighter.",
              "/weekly",
            );
            sent += 1;
          }
        }
      }
    }

    return { sent };
  },
});

/** Daily maintenance: drop rate-limit windows that can no longer apply. */
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const rows = await ctx.db.query("rateLimits").collect();
    let removed = 0;
    for (const row of rows) {
      if (row.windowStart < cutoff) {
        await ctx.db.delete(row._id);
        removed += 1;
      }
    }
    return { removed };
  },
});

/**
 * Timezone-aware date helpers.
 *
 * The backend must not assume UTC for a user's day boundary: a check-in made
 * at 8pm in Los Angeles belongs to the Los Angeles day, not the UTC day.
 * These helpers are intentionally pure so they can be tested outside Convex.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function safeTimezone(timezone: string): string {
  const trimmed = timezone.trim();
  return trimmed.length > 0 ? trimmed : 'UTC';
}

function dateParts(
  timezone: string,
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTimezone(timezone),
      ...options,
    }).formatToParts(date);
    return Object.fromEntries(
      parts
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value]),
    );
  } catch {
    return null;
  }
}

/** ISO day key (`YYYY-MM-DD`) for a timezone. Falls back to UTC. */
export function dayKeyForTimezone(timezone: string, date = new Date()): string {
  const parts = dateParts(timezone, date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  if (!parts?.year || !parts.month || !parts.day) {
    return date.toISOString().slice(0, 10);
  }
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** 24-hour clock key (`HH:MM`) for a timezone. Falls back to UTC. */
export function timeKeyForTimezone(timezone: string, date = new Date()): string {
  const parts = dateParts(timezone, date, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  if (!parts?.hour || !parts.minute) {
    return date.toISOString().slice(11, 16);
  }
  return `${parts.hour}:${parts.minute}`;
}

/** 0 (Sunday) through 6 (Saturday) in the user's timezone. */
export function weekdayForTimezone(timezone: string, date = new Date()): number {
  try {
    const short = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTimezone(timezone),
      weekday: 'short',
    }).format(date);
    const index = WEEKDAYS.indexOf(short as (typeof WEEKDAYS)[number]);
    return index >= 0 ? index : date.getUTCDay();
  } catch {
    return date.getUTCDay();
  }
}

/** Turn `HH:MM` into minutes since midnight. Invalid input becomes midnight. */
export function minutesFromTimeKey(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return 0;
  return hours * 60 + minutes;
}

/**
 * True when `current` is inside the reminder window that starts at `target`.
 * Windows wrap past midnight, so 23:55 is still inside a 23:50 window at 00:05.
 */
export function isWithinMinutesWindow(
  current: number,
  target: number,
  windowMinutes = 15,
): boolean {
  const day = 24 * 60;
  return (current - target + day) % day < windowMinutes;
}

/** True when `now` falls inside a quiet-hours window that may cross midnight. */
export function isQuietHours(
  now: string,
  quietHoursStart: string,
  quietHoursEnd: string,
): boolean {
  const current = minutesFromTimeKey(now);
  const start = minutesFromTimeKey(quietHoursStart);
  const end = minutesFromTimeKey(quietHoursEnd);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

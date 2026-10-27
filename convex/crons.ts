import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every 15 minutes: move anything past its due date into the missed state so
// the app never shows a commitment as still open after its deadline.
crons.interval(
  "mark overdue commitments",
  { minutes: 15 },
  internal.commitments.markOverdue,
);

// Every 15 minutes: send timezone-aware daily check-in and weekly review
// reminders. The mutation reads each profile's timezone and quiet hours.
crons.interval(
  "send timezone-aware reminders",
  { minutes: 15 },
  internal.automation.sendReminders,
);

// Daily: remove expired rate-limit windows so the table stays small.
crons.daily(
  "clean expired rate limits",
  { hourUTC: 3, minuteUTC: 15 },
  internal.automation.cleanup,
);

export default crons;

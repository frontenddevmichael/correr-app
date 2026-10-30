/**
 * Client-side mirror of `src/core/validation.ts`. The Convex mutation
 * re-validates with the same rules; this exists only so the user gets the
 * message before a round trip.
 */
export const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const EMAIL_ERROR = "Enter a valid email, like name@example.com.";

export function sanitizeEmail(value: string): string {
  return value.replace(/\s+/g, "").slice(0, EMAIL_MAX);
}

export function isEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > EMAIL_MAX) return false;
  return EMAIL_RE.test(email);
}

/**
 * Input contracts.
 *
 * Every field in the app has a shape. These helpers are the single source of
 * truth for what each one accepts, so the UI, validation copy and later the
 * Convex mutations agree. Sanitizers run on change (block impossible
 * characters early); validators run on submit/blur (explain what is missing).
 */

export const LIMITS = {
  email: 254,
  passwordMin: 8,
  passwordMax: 64,
  nameMin: 2,
  nameMax: 60,
  titleMin: 2,
  titleMax: 120,
  shortText: 180,
  mediumText: 500,
  longText: 1000,
  message: 2000,
  nudge: 280,
  codeMin: 6,
  codeMax: 8,
  url: 2048,
  timeframe: 40,
  note: 500,
  focus: 200,
} as const;

/** Collapse line breaks and runs of spaces. Keeps trailing spaces for typing. */
export function sanitizeSingleLine(value: string, max: number = LIMITS.titleMax): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/[ \t]{2,}/g, ' ').slice(0, max);
}

/** Names: letters, spaces, apostrophes, hyphens and periods only. */
export function sanitizeName(value: string): string {
  return value
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' .-]/g, '')
    .replace(/[ ]{2,}/g, ' ')
    .slice(0, LIMITS.nameMax);
}

/** Email: no whitespace, lowercase domain-safe characters, max 254. */
export function sanitizeEmail(value: string): string {
  return value.replace(/\s+/g, '').slice(0, LIMITS.email);
}

/** Invite codes: uppercase letters and digits only, 8 max. */
export function sanitizeCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, LIMITS.codeMax);
}

/** Team names: letters, numbers, spaces, &, apostrophes, periods, hyphens. */
export function sanitizeTeamName(value: string): string {
  return value
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ0-9 &'’.-]/g, '')
    .replace(/[ ]{2,}/g, ' ')
    .slice(0, LIMITS.nameMax);
}

/** URLs: strip whitespace; the validator checks protocol and host. */
export function sanitizeUrl(value: string): string {
  return value.replace(/\s+/g, '').slice(0, LIMITS.url);
}

/** Multiline copy: cap length, leave language alone. */
export function sanitizeMultiline(value: string, max: number = LIMITS.mediumText): string {
  return value.slice(0, max);
}

export function trimmed(value: string): string {
  return value.trim();
}

export function isEmail(value: string): boolean {
  const email = value.trim();
  if (!email || email.length > LIMITS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function isPassword(value: string): boolean {
  return value.length >= LIMITS.passwordMin && value.length <= LIMITS.passwordMax;
}

export function isName(value: string): boolean {
  const name = value.trim();
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) return false;
  return /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]*$/.test(name);
}

export function isTitle(value: string, min: number = LIMITS.titleMin, max: number = LIMITS.titleMax): boolean {
  const text = value.trim();
  return text.length >= min && text.length <= max;
}

export function isCode(value: string): boolean {
  return /^[A-Z0-9]{6,8}$/.test(value.trim().toUpperCase());
}

export function isUrl(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > LIMITS.url) return false;
  try {
    const parsed = new URL(text);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isTeamName(value: string): boolean {
  const name = value.trim();
  if (name.length < LIMITS.nameMin || name.length > LIMITS.nameMax) return false;
  return /^[A-Za-zÀ-ÖØ-öø-ÿ0-9][A-Za-zÀ-ÖØ-öø-ÿ0-9 &'’.-]*$/.test(name);
}

export function isMessage(value: string, max = LIMITS.message): boolean {
  const text = value.trim();
  return text.length > 0 && text.length <= max;
}

/** Email copy used consistently across auth and recovery. */
export const VALIDATION_COPY = {
  email: 'Enter a valid email, like name@example.com.',
  password: `Use ${LIMITS.passwordMin}–${LIMITS.passwordMax} characters.`,
  name: 'Use 2–60 letters, spaces, hyphens or apostrophes.',
  title: `Use ${LIMITS.titleMin}–${LIMITS.titleMax} characters.`,
  code: 'Codes are 6–8 letters or numbers.',
  url: 'Use a full link starting with https://.',
  teamName: 'Use 2–60 letters, numbers, spaces or & — no symbols like / or @.',
  message: 'Write a short message first.',
  focus: 'Add one clear focus for next week.',
} as const;

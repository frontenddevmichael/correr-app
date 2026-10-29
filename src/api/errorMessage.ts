/**
 * Turns anything thrown by the API layer into a message that is safe to show
 * a user.
 *
 * Convex wraps every server failure as:
 *
 *   [CONVEX M(module:function)] [Request ID: …] Server Error
 *   Uncaught Error: <message>
 *       at someFunction (../../convex/file.ts:12:34)
 *       Called by client
 *
 * and argument-validation failures carry validator/path/value detail instead
 * of an "Uncaught Error" line. Screens render `e.message` directly (50+ call
 * sites), so every one of those would otherwise leak server file paths,
 * request IDs and validator internals into toasts and error cards.
 *
 * Strategy: strip the Convex envelope and stack, then
 *  - map well-known conditions (signed out, rate limit, credentials, offline)
 *    to plain-language copy,
 *  - keep short human sentences the server itself threw
 *    ("Give your circle a name first."),
 *  - replace anything still technical with a generic fallback.
 */

const FALLBACK = 'Something went wrong. Please try again.';

const KNOWN: { test: RegExp; copy: string }[] = [
  { test: /not signed in/i, copy: 'Sign in to continue.' },
  {
    test: /too quickly|rate.?limit|too many requests|status code 429|\b429\b/i,
    copy: 'You’re doing that too quickly. Try again in a moment.',
  },
  {
    test: /already exists|taken|duplicate/i,
    copy: 'An account with this email already exists. Try logging in.',
  },
  {
    test:
      /invalidaccountid|invalidcredentials|incorrect.*(email|password)|invalid.*credentials|no such user|wrong password/i,
    copy: 'Incorrect email or password.',
  },
  {
    test:
      /failed to fetch|network request failed|websocket|failed to connect|load failed|offline|timed? ?out|network error/i,
    copy: 'You’re offline or the connection dropped. Check your network and try again.',
  },
  {
    test: /application failed to connect|failed to resolve|err_name_not_resolved|econnrefused/i,
    copy: 'We can’t reach Correr right now. Check your connection and try again.',
  },
  {
    test: /quota|insufficient|billing|payment required|status code 402|\b402\b/i,
    copy: 'This action is currently unavailable. Please try again later.',
  },
];

const CONVEX_HEADER = /^\[CONVEX[^\n]*\n?/gm;
const STACK_LINE = /^\s*at\s+\S.*\([^)]*:\d+:\d+\)\s*$/;
const TECHNICAL_LINE = /^(ArgumentValidationError|ServerError|Error|TypeError|RangeError)\b|^(Path|Value|Validator|Server Error|Called by client):?|^\/|^\.\.?\//;
const TECHNICAL_INLINE = /\b\w+Error\b|\.tsx?:|\.js:|https?:\/|\\n|\bat\s+\w+\s+\(|v\.\w+\(/;

function isTechnical(text: string): boolean {
  if (!text) return true;
  if (text.length > 160) return true;
  if (TECHNICAL_INLINE.test(text)) return true;
  if (TECHNICAL_LINE.test(text)) return true;
  if (/^\s*\w+\s*$/.test(text) && !/[.!?]$/.test(text) && text.split(/\s+/).length > 8) return true;
  return false;
}

/** Extract the safe, human-readable core of an API error message. */
export function friendlyErrorMessage(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : FALLBACK;
  if (!raw) return FALLBACK;

  // 1. Strip the Convex envelope ("[CONVEX …] Server Error", "Called by client").
  let text = raw.replace(CONVEX_HEADER, '').replace(/^\s*Called by client\s*$/gm, '');

  // 2. Prefer the server's own message when the envelope carries one.
  const unwrapped = /Uncaught Error:\s*([^\n]*)/.exec(text);
  if (unwrapped) text = unwrapped[1];

  // 3. Drop stack frames, validator detail and file paths, line by line.
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !STACK_LINE.test(line) && !TECHNICAL_LINE.test(line));
  text = lines.join(' ').replace(/\s+/g, ' ').trim();

  if (!text) return FALLBACK;

  // 4. Known conditions get plain-language copy.
  for (const { test, copy } of KNOWN) {
    if (test.test(text)) return copy;
  }

  // 5. Keep short human sentences (our servers throw these deliberately).
  if (!isTechnical(text)) return text;

  return FALLBACK;
}

/** Same as `friendlyErrorMessage`, but always returns an `Error`. */
export function friendlyError(error: unknown, fallback?: string): Error {
  const message = friendlyErrorMessage(error);
  if (message === FALLBACK && fallback) return new Error(fallback);
  return new Error(message);
}

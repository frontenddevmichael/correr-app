import { describe, expect, it } from 'vitest';

import { friendlyError, friendlyErrorMessage } from './errorMessage';

const convexEnvelope = (inner: string) =>
  `[CONVEX M(checkins:create)] [Request ID: ff3846e0ffe22a84] Server Error\n${inner}`;

describe('friendlyErrorMessage', () => {
  it('maps "Not signed in" to sign-in copy', () => {
    const message = friendlyErrorMessage(
      new Error(
        convexEnvelope(
          'Uncaught Error: Not signed in\n    at requireUserId (../../convex/lib.ts:23:9)\n    at async handler (../convex/checkins.ts:28:6)',
        ),
      ),
    );
    expect(message).toBe('Sign in to continue.');
    expect(message).not.toMatch(/CONVEX|lib\.ts|Request ID|Uncaught/);
  });

  it('replaces validator internals with the generic fallback', () => {
    const message = friendlyErrorMessage(
      new Error(
        '[CONVEX A(roadmap:generate)] [Request ID: 14ed3c1937732554] Server Error\nArgumentValidationError: Value does not match validator.\nPath: .visionId\nValue: "not-a-real-id"\nValidator: v.id("visions")\n\n\n    Called by client',
      ),
    );
    expect(message).toBe('Something went wrong. Please try again.');
    expect(message).not.toMatch(/visionId|Validator|Request ID/);
  });

  it('keeps short human server messages', () => {
    expect(
      friendlyErrorMessage(
        new Error(convexEnvelope('Uncaught Error: Give your circle a name first.\n    at handler (../convex/circles.ts:49:7)')),
      ),
    ).toBe('Give your circle a name first.');
  });

  it('maps rate limiting to friendly copy', () => {
    expect(
      friendlyErrorMessage(
        new Error(convexEnvelope('Uncaught Error: You’re doing that too quickly. Try again in a moment.')),
      ),
    ).toBe('You’re doing that too quickly. Try again in a moment.');
  });

  it('maps connectivity failures', () => {
    expect(friendlyErrorMessage(new Error('WebSocket connection closed'))).toMatch(/offline|connection/i);
    expect(friendlyErrorMessage(new TypeError('Failed to fetch'))).toMatch(/offline|connection/i);
  });

  it('maps credential failures', () => {
    expect(friendlyErrorMessage(new Error('Uncaught Error: InvalidAccountId'))).toBe(
      'Incorrect email or password.',
    );
  });

  it('falls back for non-Error throws and empty messages', () => {
    expect(friendlyErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
    expect(friendlyErrorMessage('')).toBe('Something went wrong. Please try again.');
    expect(friendlyErrorMessage({ weird: true })).toBe('Something went wrong. Please try again.');
  });

  it('never leaks file paths or stack frames', () => {
    const nasty =
      '[CONVEX M(x)] Server Error\nUncaught Error: boom\n    at f (/srv/app/convex/x.ts:1:1)\n    at g (/srv/app/convex/y.ts:2:2)';
    const message = friendlyErrorMessage(new Error(nasty));
    expect(message).not.toMatch(/\.ts:|at f |at g |\[CONVEX/);
  });
});

describe('friendlyError', () => {
  it('returns an Error with the mapped message', () => {
    const err = friendlyError(new Error(convexEnvelope('Uncaught Error: Not signed in')));
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Sign in to continue.');
  });

  it('honours a call-site fallback when nothing survives mapping', () => {
    expect(friendlyError(new Error('ArgumentValidationError: junk'), 'Could not save.').message).toBe(
      'Could not save.',
    );
  });
});

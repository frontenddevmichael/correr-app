import { ConvexReactClient } from 'convex/react';

const url = process.env.EXPO_PUBLIC_CONVEX_URL;

// Fail fast on misconfigured builds. Without this, a production bundle with
// no backend URL would silently fall back to the local mock: the app would
// look alive while storing nothing on any server.
if (!url && process.env.NODE_ENV === 'production') {
  throw new Error(
    'EXPO_PUBLIC_CONVEX_URL is not set — this production build has no backend configured. ' +
      'Set it in the EAS build environment (or .env for local builds).',
  );
}
if (url && !url.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL must be an https:// URL.');
}

/**
 * Feature flag: `npx convex dev` writes EXPO_PUBLIC_CONVEX_URL into
 * .env.local when a deployment is configured. Without it the app keeps
 * running on the local mock — Convex stays opt-in until deployed.
 */
export const convexEnabled = Boolean(url);

/**
 * The single shared Convex client. ConvexAuthProvider authenticates it
 * (via ConvexProviderWithAuth), and the promise-based CorrerApi adapter
 * calls through the same instance — so both hooks and direct
 * client.query/mutation calls carry the session.
 */
export const convexClient: ConvexReactClient | null = convexEnabled
  ? new ConvexReactClient(url as string)
  : null;

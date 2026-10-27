import type { CorrerApi } from './correrApi';
import { convexClient, convexEnabled } from './convexClient';
import { ConvexCorrerApi } from './convexCorrerApi';
import { mockApi } from './mockCorrerApi';

/**
 * The app's single API seam.
 *
 * Screens never import a data source directly: they call `useApi()` and talk
 * to the `CorrerApi` contract. Once `npx convex dev` has configured
 * EXPO_PUBLIC_CONVEX_URL this returns the Convex-backed adapter; otherwise
 * the local mock stays the default. Convex Auth's signIn/signOut reach the
 * adapter through the shared `authBridge` holder that ApiProvider syncs.
 */
export function createApi(): CorrerApi {
  if (convexEnabled && convexClient) {
    return new ConvexCorrerApi(convexClient);
  }
  return mockApi;
}

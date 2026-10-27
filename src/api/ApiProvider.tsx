import { useAuthActions, type ConvexAuthActionsContext } from '@convex-dev/auth/react';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { CorrerApi } from './correrApi';
import { createApi } from './createApi';
import { authBridge } from './convexCorrerApi';
import type { Profile, Session } from '@/core/domain';

/**
 * ApiProvider — owns the active CorrerApi implementation plus reactive
 * session/profile state. The implementation is chosen in `createApi`; screens
 * only ever see the `CorrerApi` contract, which keeps the Convex swap local.
 */

interface ApiContextValue {
  api: CorrerApi;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Bump after any mutation that should re-read session/profile. */
  invalidate: () => void;
}

const ApiContext = createContext<ApiContextValue | null>(null);

export function ApiProvider({ children }: { children: React.ReactNode }) {
  const [api] = useState<CorrerApi>(createApi);

  // Hand Convex Auth's signIn/signOut to the promise-based adapter. Outside
  // <ConvexAuthProvider> this context is undefined — mock mode ignores it.
  const authActions = useAuthActions() as ConvexAuthActionsContext | null;
  useEffect(() => {
    authBridge.current = authActions;
  }, [authActions]);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);

  // Guard against setState after unmount: `refresh` resolves async and can
  // land after the provider is gone (e.g. fast sign-out + navigation).
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const s = await api.getSession();
    if (!mountedRef.current) return;
    setSession(s);
    if (s) {
      const p = await api.getProfile();
      if (!mountedRef.current) return;
      setProfile(p);
    } else {
      setProfile(null);
    }
    if (mountedRef.current) setLoading(false);
  }, [api]);

  useEffect(() => {
    // Deferred a tick so the effect body never runs setState synchronously
    // (react-hooks/set-state-in-effect); cleanup cancels an unmounted run.
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh, version]);

  const value = useMemo(
    () => ({ api, session, profile, loading, refresh, invalidate }),
    [api, session, profile, loading, refresh, invalidate],
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

export function useApiContext(): ApiContextValue {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApiContext must be used inside <ApiProvider>');
  return ctx;
}

export function useApi(): CorrerApi {
  return useApiContext().api;
}

export function useSession(): { session: Session | null; profile: Profile | null; loading: boolean; refresh: () => Promise<void>; invalidate: () => void } {
  const { session, profile, loading, refresh, invalidate } = useApiContext();
  return { session, profile, loading, refresh, invalidate };
}

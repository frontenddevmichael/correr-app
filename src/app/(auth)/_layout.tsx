import { Redirect, Stack } from 'expo-router';
import React from 'react';

import { useSession } from '@/api/ApiProvider';

export default function AuthLayout() {
  const { session, loading } = useSession();

  // OAuth on web returns to /login with a code. ConvexAuthProvider completes
  // the exchange, but this layout is the only place that sees the new session
  // before any screen-level handler could redirect. Without this, the user
  // lands back on the login form already authenticated.
  if (!loading && session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}

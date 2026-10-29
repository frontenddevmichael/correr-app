import { ConvexAuthProvider } from '@convex-dev/auth/react';
import { Stack, router } from 'expo-router';
import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ApiProvider } from '@/api/ApiProvider';
import { ConfirmProvider } from '@/design-system/confirm';
import { authStorage } from '@/api/authStorage';
import { convexClient, convexEnabled } from '@/api/convexClient';
import { useLoadFonts } from '@/design-system/fonts';
import { AppearanceProvider, hydrateAppearance, isAppearanceHydrated } from '@/design-system/settings';
import { ThemeProvider, useColors, useTheme } from '@/design-system/theme';
import { ToastProvider } from '@/design-system/Toast';
import { Button } from '@/design-system/Button';
import { AppText } from '@/design-system/typography';
import { spacing } from '@/design-system/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Keep the native splash up until fonts and appearance are ready, then fade
// rather than cutting. The image itself is the supplied mark on a transparent
// field, so it appears immediately on both light and dark system themes.
SplashScreen.setOptions({ duration: 250, fade: true });

/**
 * Branded boot view shown while fonts load. The native OS splash covers
 * startup on iOS/Android, but on web `preventAutoHideAsync` is a no-op —
 * without this the app opened on a blank screen. This mirrors the native
 * splash exactly (same art, same 140pt mark, same theme-aware colors) so
 * the transition from OS splash → app is seamless.
 */
const BOOT_SPLASH = {
  light: { background: '#F6F3ED', icon: require('@/assets/images/splash-icon.png') },
  dark: { background: '#0D0C0A', icon: require('@/assets/images/splash-icon-dark.png') },
} as const;

const bootStyles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 140,
    height: 140,
  },
});

function BootSplash() {
  const system = useColorScheme();
  const splash = system === 'dark' ? BOOT_SPLASH.dark : BOOT_SPLASH.light;

  return (
    <View style={[bootStyles.root, { backgroundColor: splash.background }]}>
      <Image
        source={splash.icon}
        style={bootStyles.mark}
        contentFit="contain"
        accessibilityLabel="Correr"
      />
    </View>
  );
}

function RootNavigator() {
  const colors = useColors();
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="vision" />
        <Stack.Screen name="commitment" />
        <Stack.Screen name="calendar" />
        <Stack.Screen name="weekly" />
        <Stack.Screen name="accountability" />
        <Stack.Screen name="circles" />
        <Stack.Screen name="build" />
        <Stack.Screen name="notifications" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="account" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="coach-settings" />
        <Stack.Screen name="check-in-time" />
        <Stack.Screen name="appearance" />
        <Stack.Screen name="pricing" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="campus" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const fontsLoaded = useLoadFonts();
  // Settings must be hydrated before the route tree mounts: expo-router caches
  // `unstable_settings.anchor` on its first read, and the (tabs) layout reads
  // the user's default landing tab from the hydrated snapshot. The gate holds
  // the branded BootSplash (identical to the native splash) for a few ms at most.
  const [settingsReady, setSettingsReady] = useState(() => isAppearanceHydrated());

  useEffect(() => {
    if (!settingsReady) hydrateAppearance().then(() => setSettingsReady(true));
  }, [settingsReady]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // Expo Router owns the browser URL. Without this, Convex Auth's default
  // `history.replaceState` can be undone by the router, leaving `?code=` in
  // place and letting the provider process the same one-time code twice. The
  // second exchange fails with "Invalid verification code" and clears the
  // session that the first exchange just established.
  const replaceURL = React.useCallback((relativeUrl: string) => {
    if (Platform.OS !== 'web') return;
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      // ConvexAuthProvider already consumed the one-time code before calling
      // us. Strip it from the address bar immediately (QA-004: never log or
      // re-expose it) and keep it out of history, then let the router settle
      // on `relativeUrl`.
      const clean = `${window.location.origin}${window.location.pathname}`;
      window.history.replaceState(window.history.state, '', clean);
    }
    router.replace(relativeUrl as Parameters<typeof router.replace>[0]);
  }, []);

  if (!fontsLoaded || !settingsReady) {
    return <BootSplash />;
  }

  const content = (
    // AppearanceProvider owns every customization setting; ThemeProvider reads
    // it to derive colours, so it must sit outside.
    <AppearanceProvider>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <ApiProvider>
              <RootNavigator />
            </ApiProvider>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </AppearanceProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {convexEnabled && convexClient ? (
        // Owns the auth token handshake and authenticates the shared client
        // for both Convex hooks and the promise-based API adapter.
        <ConvexAuthProvider
          client={convexClient}
          storage={authStorage}
          replaceURL={replaceURL}
        >
          {content}
        </ConvexAuthProvider>
      ) : (
        content
      )}
    </GestureHandlerRootView>
  );
}

/**
 * App-wide route error boundary (expo-router convention: layouts may export
 * `ErrorBoundary({ error, retry })`). It renders *outside* the provider tree,
 * so it only uses `useTheme`'s safe fallback and plain design-system pieces.
 * Error details are dev-only; production users get copy, retry and a way home.
 */
function CrashScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        padding: spacing.xxl,
        gap: spacing.md,
      }}
    >
      <AppText variant="title" center>
        Something went wrong.
      </AppText>
      <AppText
        variant="body"
        tone="secondary"
        center
        style={{ maxWidth: 320, lineHeight: 24 }}
      >
        The app hit an unexpected error. Your saved data is safe. Try again, or head back to
        home.
      </AppText>
      <Button
        label="Try again"
        onPress={() => void retry()}
        fullWidth={false}
        style={{ marginTop: spacing.sm }}
      />
      <Button
        label="Go to home"
        variant="ghost"
        onPress={() => {
          void retry().then(() => router.replace('/(tabs)'));
        }}
        fullWidth={false}
      />
      {__DEV__ && error?.message ? (
        <AppText
          variant="caption"
          tone="muted"
          center
          selectable
          style={{ marginTop: spacing.lg, maxWidth: 520 }}
        >
          {error.message}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => Promise<void>;
}) {
  return <CrashScreen error={error} retry={retry} />;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import {
  darkColors,
  lightColors,
  palette,
  type ColorScheme,
  type ColorTokens,
} from './tokens';
import {
  resolveAccent,
  useSettings,
  type AppearanceSettings,
  type ThemeMode,
} from './settings';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export type { ThemeMode };

const LEGACY_STORAGE_KEY = 'correr.theme.v1'; // pre-customization key, migrated once

/** Module-level scheme + derived colours used by `createThemedStyles` proxies. */
let activeScheme: ColorScheme = 'light';
let activeColors: ColorTokens = lightColors;
/** Bumped whenever derived colours change; becomes part of the style cache key. */
let activeSignature = 'light:ink:false:false';
/** Registered to force re-render on cached-sheet invalidation (rarely needed). */
const styleListeners = new Set<() => void>();

export function getActiveScheme(): ColorScheme {
  return activeScheme;
}

/* ------------------------------------------------------------------ *
 * Colour derivation — theme mode + AMOLED + accent + high contrast.
 * ------------------------------------------------------------------ */

function readableFg(hex: string, darkFallback = palette.white, lightFallback = palette.ink): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const ch = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
  // Pick whichever foreground clears AA (>=4.5:1) against the accent.
  const onWhite = 1.05 / (lum + 0.05);
  const onInk = (lum + 0.05) / 0.055;
  return onWhite >= onInk ? darkFallback : lightFallback;
}

/** AMOLED: true-black canvas, elevated surfaces as near-black steps. */
function applyAmoled(base: ColorTokens): ColorTokens {
  return {
    ...base,
    background: '#000000',
    surface: '#0A0A0A',
    surfaceSunken: '#141414',
    surfaceSoft: '#1A1A1A',
    surfaceDark: '#111111',
    border: '#202020',
    borderStrong: '#333333',
    overlay: 'rgba(0, 0, 0, 0.7)',
  };
}

/** High contrast: strengthen secondary text and hairlines on both schemes. */
function applyContrast(base: ColorTokens, isDark: boolean): ColorTokens {
  return {
    ...base,
    textSecondary: isDark ? palette.nightText : palette.inkSoft,
    textMuted: isDark ? palette.nightText2 : palette.slate700,
    border: isDark ? palette.nightLineStrong : palette.slate200,
    borderStrong: isDark ? '#4A443C' : palette.slate400,
  };
}

/**
 * Build the live colour set from the resolved scheme + appearance settings.
 * Order: base scheme → AMOLED → high contrast → accent (so the accent always
 * wins over a contrast-tinted brand, and its foreground stays AA).
 */
export function buildColors(scheme: ColorScheme, settings: AppearanceSettings): ColorTokens {
  const isDark = scheme === 'dark';
  let c: ColorTokens = isDark ? darkColors : lightColors;
  if (isDark && settings.amoled) c = applyAmoled(c);
  if (settings.highContrast) c = applyContrast(c, isDark);

  const accent = resolveAccent(settings, isDark);
  const fg = readableFg(accent.base);
  return {
    ...c,
    // Accent drives the action + AI + link colours across the app.
    brand: accent.base,
    brandPressed: accent.pressed,
    brandInverse: fg,
    accent: accent.base,
    accentPressed: accent.pressed,
    accentSoft: accent.soft,
    ai: accent.base,
    aiPressed: accent.pressed,
    aiSoft: accent.soft,
    progress: accent.base,
    progressDark: accent.base,
    progressPressed: accent.pressed,
    progressSoft: accent.soft,
    highlight: accent.base,
    // `textInverse` is the on-brand label colour (used by Button/Toast on brand).
    textInverse: fg,
  };
}

interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ColorScheme;
  isDark: boolean;
  colors: ColorTokens;
  setMode: (mode: ThemeMode) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme provider.
 *
 * Mode (System / Light / Dark) lives in the appearance-settings store, so it
 * persists and syncs with every other customization. Colours are derived from
 * mode + settings and published to the module-level `activeColors` / signature
 * so `useColors()` and the `createThemedStyles` proxy both resolve correctly.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { settings, update } = useSettings();

  // One-time migration of the pre-customization theme key into settings.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(LEGACY_STORAGE_KEY)
      .then((stored) => {
        if (!alive) return;
        if (
          (stored === 'light' || stored === 'dark' || stored === 'system') &&
          settings.theme === 'system'
        ) {
          update({ theme: stored });
        }
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // Run once; `settings.theme` read at mount is enough to decide migration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode: ThemeMode = settings.theme;
  const scheme: ColorScheme =
    mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;

  const colors = useMemo(() => buildColors(scheme, settings), [scheme, settings]);

  // Keep the style-proxy cache in sync before children paint. Module
  // singleton is deliberate: StyleSheet objects are not context-aware.
  const signature = `${scheme}:${settings.accentId}:${settings.customAccent}:${settings.amoled}:${settings.highContrast}`;
  // eslint-disable-next-line react-hooks/globals
  activeScheme = scheme;
  // eslint-disable-next-line react-hooks/globals
  activeColors = colors;
  if (activeSignature !== signature) {
    // eslint-disable-next-line react-hooks/globals
    activeSignature = signature;
    styleListeners.forEach((notify) => notify());
  }

  const setMode = useCallback((next: ThemeMode) => update({ theme: next }), [update]);
  const toggleDark = useCallback(() => {
    setMode(scheme === 'dark' ? 'light' : 'dark');
  }, [scheme, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, isDark: scheme === 'dark', colors, setMode, toggleDark }),
    [mode, scheme, colors, setMode, toggleDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const system = useColorScheme();
  if (ctx) return ctx;

  // Safe fallback for stories, tests and isolated component previews.
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light';
  return {
    mode: 'system',
    scheme,
    isDark: scheme === 'dark',
    colors: scheme === 'dark' ? darkColors : lightColors,
    setMode: () => {},
    toggleDark: () => {},
  };
}

export function useColors(): ColorTokens {
  const { colors } = useTheme();
  return colors;
}

/**
 * Theme-aware StyleSheet factory.
 *
 * Sheets are cached per *derived-colour signature* (scheme + accent + AMOLED +
 * contrast), so changing any of them re-derives the affected sheets instead of
 * serving a stale ink-only sheet. The returned proxy resolves `styles.card`
 * against the active signature at render time.
 */
const themedCache = new WeakMap<(colors: ColorTokens) => unknown, Record<string, unknown>>();

export function createThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: ColorTokens) => T,
): T {
  const get = (sig: string): T => {
    let entry = themedCache.get(factory);
    if (!entry) {
      entry = {} as Record<string, unknown>;
      themedCache.set(factory, entry);
    }
    if (!entry[sig]) {
      entry[sig] = StyleSheet.create(factory(activeColors));
    }
    return entry[sig] as T;
  };

  return new Proxy({} as T, {
    get: (_target, property) => Reflect.get(get(activeSignature), property),
    has: (_target, property) => property in get(activeSignature),
    ownKeys: () => Reflect.ownKeys(get(activeSignature)),
    getOwnPropertyDescriptor: (_target, property) =>
      Reflect.getOwnPropertyDescriptor(get(activeSignature), property),
  });
}

/* ------------------------------------------------------------------ *
 * Compatibility helpers — older code can force a scheme directly.
 * ------------------------------------------------------------------ */
let override: ColorScheme | null = null;

export function setThemeOverride(scheme: ColorScheme | null): void {
  override = scheme;
  if (scheme) {
    activeScheme = scheme;
    activeColors = scheme === 'dark' ? darkColors : lightColors;
  }
  styleListeners.forEach((notify) => notify());
}

export function getThemeOverride(): ColorScheme | null {
  return override;
}

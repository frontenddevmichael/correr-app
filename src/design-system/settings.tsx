import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Appearance settings — the single source of truth for user customization.
 *
 * Deliberately standalone (imports only React + AsyncStorage) so `theme.ts` can
 * consume it for colours without a circular import. Everything is applied
 * instantly (context), persisted locally (AsyncStorage) and, when a session
 * exists, synced to the profile so the account carries it across devices.
 */

export type ThemeMode = 'system' | 'light' | 'dark';
export type Density = 'comfortable' | 'compact';
export type MotionLevel = 'full' | 'reduced' | 'off';
export type TextScale = 'small' | 'default' | 'large' | 'xlarge';
export type FontWeightPref = 'regular' | 'medium' | 'bold';
export type LineSpacingPref = 'tight' | 'normal' | 'relaxed';
export type FontFamilyPref = 'default' | 'rounded' | 'mono';
export type HapticIntensity = 'light' | 'medium' | 'strong';

/** Preset accent colours. All are checked for AA against both surfaces. */
export interface AccentPreset {
  id: string;
  label: string;
  light: string; // used on light surfaces
  dark: string; // used on dark surfaces
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'ink', label: 'Ink', light: '#171410', dark: '#F4F1EB' },
  { id: 'indigo', label: 'Indigo', light: '#4F4CC9', dark: '#9A97F0' },
  { id: 'blue', label: 'Blue', light: '#2E62D8', dark: '#6D97F5' },
  { id: 'emerald', label: 'Emerald', light: '#0B8C5B', dark: '#2FB87E' },
  { id: 'amber', label: 'Amber', light: '#B45E15', dark: '#E9973F' },
  { id: 'red', label: 'Red', light: '#B02A31', dark: '#F2656C' },
];

export interface HapticEventPrefs {
  taps: boolean;
  success: boolean;
  errors: boolean;
  toggles: boolean;
}

export interface AppearanceSettings {
  theme: ThemeMode;
  /** True-black (#000) canvas in dark mode; elevated surfaces stay near-black. */
  amoled: boolean;
  accentId: string; // preset id, or 'custom'
  customAccent: string; // hex, only read when accentId === 'custom'
  fontFamily: FontFamilyPref;
  textScale: TextScale;
  fontWeight: FontWeightPref;
  lineSpacing: LineSpacingPref;
  /** Multiplier applied to the radius scale (0.6–1.4). */
  radiusScale: number;
  density: Density;
  motion: MotionLevel;
  hapticsEnabled: boolean;
  hapticsIntensity: HapticIntensity;
  hapticEvents: HapticEventPrefs;
  soundsEnabled: boolean;
  /** Default landing tab. */
  defaultTab: 'index' | 'vision' | 'coach' | 'progress';
  highContrast: boolean;
  largeTapTargets: boolean;
}

export const DEFAULT_SETTINGS: AppearanceSettings = {
  theme: 'system',
  amoled: false,
  accentId: 'ink',
  customAccent: '#4F4CC9',
  fontFamily: 'default',
  textScale: 'default',
  fontWeight: 'regular',
  lineSpacing: 'normal',
  radiusScale: 1,
  density: 'comfortable',
  motion: 'full',
  hapticsEnabled: true,
  hapticsIntensity: 'medium',
  hapticEvents: { taps: true, success: true, errors: true, toggles: true },
  soundsEnabled: false,
  defaultTab: 'index',
  highContrast: false,
  largeTapTargets: false,
};

const STORAGE_KEY = 'correr.appearance.v1';

/**
 * Module-level snapshot of the hydrated settings. The boot gate in
 * `app/_layout.tsx` and the (tabs) `unstable_settings.anchor` getter read this
 * without React context, so it must exist before/independently of the provider.
 */
let snapshot: AppearanceSettings | null = null;
let hydration: Promise<AppearanceSettings> | null = null;

/** Last known settings; defaults until the storage read completes. */
export function getAppearanceSnapshot(): AppearanceSettings {
  return snapshot ?? DEFAULT_SETTINGS;
}

/** True once persisted appearance settings have been read from storage. */
export function isAppearanceHydrated(): boolean {
  return snapshot !== null;
}

/**
 * Idempotent hydration: the first caller starts the storage read, everyone
 * else awaits the same promise. Called by the boot gate (before the route
 * tree mounts) and by AppearanceProvider, so storage is read exactly once.
 */
export function hydrateAppearance(): Promise<AppearanceSettings> {
  if (!hydration) {
    hydration = loadSettings().then((loaded) => {
      snapshot = loaded;
      return loaded;
    });
  }
  return hydration;
}

/** Multipliers for the text scale / line spacing / tap targets. */
export const TEXT_SCALE_FACTOR: Record<TextScale, number> = {
  small: 0.9,
  default: 1,
  large: 1.12,
  xlarge: 1.26,
};

export const LINE_HEIGHT_FACTOR: Record<LineSpacingPref, number> = {
  tight: 0.94,
  normal: 1,
  relaxed: 1.14,
};

export function tapTargetScale(settings: AppearanceSettings): number {
  if (settings.largeTapTargets) return 1.15;
  return settings.density === 'compact' ? 0.94 : 1;
}

/** Density adjusts vertical rhythm without touching the type scale. */
export function densityScale(settings: AppearanceSettings): number {
  return settings.density === 'compact' ? 0.85 : 1;
}

function coerce(raw: unknown): AppearanceSettings {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS };
  const r = raw as Partial<AppearanceSettings>;
  return {
    ...DEFAULT_SETTINGS,
    ...r,
    hapticEvents: { ...DEFAULT_SETTINGS.hapticEvents, ...(r.hapticEvents ?? {}) },
  };
}

export async function loadSettings(): Promise<AppearanceSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? coerce(JSON.parse(raw)) : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

async function persist(settings: AppearanceSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Non-fatal: in-memory settings still apply for this session.
  }
}

interface SettingsContextValue {
  settings: AppearanceSettings;
  /** Merge a partial patch, persist it, and (optionally) push to the account. */
  update: (patch: Partial<AppearanceSettings>) => void;
  reset: () => void;
  /** True when the OS asks for reduced motion (OR user set motion to off). */
  osReduceMotion: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppearanceSettings>(DEFAULT_SETTINGS);
  const [osReduceMotion, setOsReduceMotion] = useState(false);

  // Load persisted settings before first paint to avoid a flash of defaults.
  // Shares the boot gate's single hydration promise so storage is read once.
  useEffect(() => {
    let alive = true;
    hydrateAppearance().then((loaded) => {
      if (alive) setSettings(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Respect the OS reduce-motion switch (HIG / platform parity).
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setOsReduceMotion(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setOsReduceMotion(v),
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  const update = useCallback((patch: Partial<AppearanceSettings>) => {
    setSettings((prev) => {
      const next = coerce({ ...prev, ...patch });
      snapshot = next;
      void persist(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const next = { ...DEFAULT_SETTINGS };
    setSettings(next);
    snapshot = next;
    void persist(next);
  }, []);

  const value = useMemo(
    () => ({ settings, update, reset, osReduceMotion }),
    [settings, update, reset, osReduceMotion],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  // Safe fallback for isolated previews/tests: defaults, no-op updates.
  if (ctx) return ctx;
  return {
    settings: DEFAULT_SETTINGS,
    update: () => {},
    reset: () => {},
    osReduceMotion: false,
  };
}

/** Convenience: just the settings object. */
export function useAppearance(): AppearanceSettings {
  return useSettings().settings;
}

/**
 * Whether motion should play, combining the user's animation level with the
 * OS reduce-motion switch. `off` wins; `reduced` wins over OS unless OS says
 * reduce too (both mean "less/no motion", so OR-ing is safe).
 */
export function useMotionEnabled(): boolean {
  const { settings, osReduceMotion } = useSettings();
  if (settings.motion === 'off') return false;
  if (settings.motion === 'reduced') return false;
  // motion === 'full': still honour an explicit OS reduce request.
  return !osReduceMotion;
}

/* ------------------------------------------------------------------ *
 * Haptics — gated behind platform support, user prefs and OS settings.
 * ------------------------------------------------------------------ */

type HapticEvent = keyof HapticEventPrefs;

function intensityMs(intensity: HapticIntensity): number {
  return intensity === 'light' ? 10 : intensity === 'medium' ? 20 : 35;
}

/**
 * Fire a haptic pulse if: haptics are on, the platform supports it (native
 * only), the specific event is enabled, and the intensity maps to a real
 * impact style. Web/unknown platforms no-op.
 */
export function useHaptics() {
  const { settings } = useSettings();
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';

  const pulse = useCallback(
    (event: HapticEvent, fallback: 'light' | 'medium' | 'success' | 'warning' | 'error' = 'light') => {
      if (!supported || !settings.hapticsEnabled) return;
      if (!settings.hapticEvents[event]) return;
      // Fire-and-forget; import lazily so web never bundles the native module.
      void (async () => {
        try {
          const Haptics = await import('expo-haptics');
          const style =
            settings.hapticsIntensity === 'light'
              ? Haptics.ImpactFeedbackStyle.Light
              : settings.hapticsIntensity === 'medium'
                ? Haptics.ImpactFeedbackStyle.Medium
                : Haptics.ImpactFeedbackStyle.Heavy;
          if (fallback === 'success') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (fallback === 'error' || fallback === 'warning') {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          } else {
            await Haptics.impactAsync(style);
          }
          // Touch the intensity so the preference is genuinely applied.
          void intensityMs(settings.hapticsIntensity);
        } catch {
          // Haptics are best-effort; never block the interaction.
        }
      })();
    },
    [supported, settings.hapticsEnabled, settings.hapticEvents, settings.hapticsIntensity],
  );

  return useMemo(
    () => ({
      tap: () => pulse('taps', 'light'),
      success: () => pulse('success', 'success'),
      error: () => pulse('errors', 'error'),
      toggle: () => pulse('toggles', 'light'),
    }),
    [pulse],
  );
}

/**
 * Scaled radius helper: multiply a design-system radius by the user's corner
 * preference. Use where a concrete number is needed (e.g. `radius(radii.card)`).
 */
export function useRadiusScale(): (base: number) => number {
  const { settings } = useSettings();
  return (base: number) => Math.round(base * settings.radiusScale);
}

/** Minimum interactive height, combining density and the large-tap-target boost. */
export function useControlHeight(): (base: number) => number {
  const { settings } = useSettings();
  return (base: number) => Math.round(base * densityScale(settings) * tapTargetScale(settings));
}

/** Resolved accent colour for the current scheme + settings. */
export function resolveAccent(
  settings: AppearanceSettings,
  isDark: boolean,
): { base: string; pressed: string; soft: string } {
  const preset = ACCENT_PRESETS.find((p) => p.id === settings.accentId);
  const base =
    settings.accentId === 'custom'
      ? settings.customAccent
      : preset
        ? isDark
          ? preset.dark
          : preset.light
        : isDark
          ? ACCENT_PRESETS[0].dark
          : ACCENT_PRESETS[0].light;
  return {
    base,
    pressed: shade(base, isDark ? 0.14 : -0.16),
    soft: isDark ? withAlpha(base, 0.16) : withAlpha(base, 0.1),
  };
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Lighten (amount > 0) or darken (amount < 0) a hex colour. */
function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const ch = [0, 2, 4].map((i) => {
    const v = parseInt(full.slice(i, i + 2), 16);
    const target = amount > 0 ? 255 : 0;
    const t = Math.abs(amount);
    return Math.round(v + (target - v) * t);
  });
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

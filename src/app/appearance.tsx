import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Icon } from '@/design-system/icons';
import { Reveal } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import {
  ACCENT_PRESETS,
  useSettings,
  type AppearanceSettings,
} from '@/design-system/settings';
import { Toggle } from '@/design-system/Toggle';
import { useColors } from '@/design-system/theme';
import { radii, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Settings › Appearance — every customization control in one place.
 *
 * Each change applies instantly (context), persists locally, and (when signed
 * in) syncs to the account profile as a JSON blob so it follows the user to
 * another device. Screens preview live because colours/typography resolve from
 * the same store.
 */

type Group = {
  label: string;
  render: () => React.ReactNode;
};

export default function Appearance() {
  const colors = useColors();
  const { settings, update, reset } = useSettings();
  const { session, profile } = useSession();
  const api = useApi();
  const [syncState, setSyncState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ---- account sync: push local settings to the profile (debounced) ----
  const serialized = JSON.stringify(settings);
  useEffect(() => {
    if (!session) return; // local-only until signed in
    let alive = true;
    const t = setTimeout(() => {
      // `saving` is set inside the async callback, not synchronously in the
      // effect body (avoids a cascading render on every settings keystroke).
      setSyncState('saving');
      api
        .updateProfile({ appearance: serialized })
        .then(() => {
          if (alive) setSyncState('saved');
        })
        .catch(() => {
          if (alive) setSyncState('error');
        });
    }, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [serialized, session, api]);

  // ---- hydrate from the account on first mount if local is default ----
  // A ref guard keeps this a one-shot merge without a synchronous setState in
  // the effect body.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !profile) return;
    hydratedRef.current = true;
    const remote = (profile as { appearance?: string }).appearance;
    if (remote) {
      try {
        const parsed = JSON.parse(remote) as Partial<AppearanceSettings>;
        const current = JSON.stringify(settings);
        const remoteFull = JSON.stringify({ ...settings, ...parsed });
        if (current !== remoteFull) update(parsed);
      } catch {
        // Ignore a malformed remote blob; local settings win.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const groups: Group[] = [
    { label: 'Theme', render: () => <ThemeGroup /> },
    { label: 'Accent', render: () => <AccentGroup /> },
    { label: 'Text', render: () => <TextGroup /> },
    { label: 'Shape & density', render: () => <ShapeGroup /> },
    { label: 'Motion', render: () => <MotionGroup /> },
    { label: 'Haptics', render: () => <HapticsGroup /> },
    { label: 'Home', render: () => <HomeGroup /> },
    { label: 'Accessibility', render: () => <AccessibilityGroup /> },
  ];

  return (
    <Screen
      back="push"
      eyebrow="Settings"
      title="Appearance."
      subtitle="Make Correr yours. Changes apply instantly and are saved to your account."
    >
      <Reveal>
        <Card variant="outlined" style={styles.syncCard}>
          <View style={styles.syncRow}>
            <Icon
              name={syncState === 'error' ? 'alert' : 'checkCircle'}
              size={17}
              color={syncState === 'error' ? colors.error : colors.progressDark}
            />
            <View style={styles.syncText}>
              <AppText variant="bodyMedium">
                {session
                  ? syncState === 'saving'
                    ? 'Saving to your account…'
                    : syncState === 'error'
                      ? 'Saved on this device only'
                      : 'Synced to your account'
                  : 'Saved on this device'}
              </AppText>
              <AppText variant="caption" tone="muted">
                {session ? profile?.displayName : 'Sign in to sync across devices'}
              </AppText>
            </View>
            <Button
              label="Reset"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => reset()}
            />
          </View>
        </Card>
      </Reveal>

      {groups.map((group, i) => (
        <Reveal key={group.label} delay={40 + i * 40}>
          <Card variant="outlined" style={styles.group}>
            <AppText variant="h3" style={styles.groupTitle}>
              {group.label}
            </AppText>
            {group.render()}
          </Card>
        </Reveal>
      ))}
    </Screen>
  );
}

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

function Row({
  title,
  caption,
  control,
}: {
  title: string;
  caption?: string;
  control: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <AppText variant="bodyMedium">{title}</AppText>
        {caption ? (
          <AppText variant="caption" tone="muted">
            {caption}
          </AppText>
        ) : null}
      </View>
      {control}
    </View>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((opt) => (
        <Chip
          key={opt.value}
          label={opt.label}
          selected={value === opt.value}
          onPress={() => onChange(opt.value)}
        />
      ))}
    </View>
  );
}

function ThemeGroup() {
  const { settings, update } = useSettings();
  return (
    <View style={styles.groupBody}>
      <ChipRow
        options={[
          { value: 'system', label: 'System' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={settings.theme}
        onChange={(v) => update({ theme: v as AppearanceSettings['theme'] })}
      />
      <Row
        title="True black (AMOLED)"
        caption="Pure #000 canvas with near-black elevated surfaces. Saves battery on OLED."
        control={
          <Toggle
            value={settings.amoled}
            onValueChange={(v) => update({ amoled: v })}
            disabled={settings.theme === 'light'}
            accessibilityLabel="True black AMOLED background"
          />
        }
      />
      {settings.theme === 'light' ? (
        <AppText variant="caption" tone="muted">
          Available when Dark is active.
        </AppText>
      ) : null}
    </View>
  );
}

function AccentGroup() {
  const colors = useColors();
  const { settings, update } = useSettings();
  return (
    <View style={styles.groupBody}>
      <View style={styles.swatches}>
        {ACCENT_PRESETS.map((preset) => {
          const active = settings.accentId === preset.id;
          return (
            <Pressable
              key={preset.id}
              onPress={() => update({ accentId: preset.id })}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${preset.label} accent`}
              style={[
                styles.swatch,
                {
                  backgroundColor: colors.background,
                  borderColor: active ? colors.textPrimary : colors.borderStrong,
                },
              ]}
            >
              <View style={[styles.swatchDot, { backgroundColor: preset.light }]} />
              {active ? (
                <Icon name="check" size={13} color={colors.textPrimary} style={styles.swatchCheck} />
              ) : null}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => update({ accentId: 'custom' })}
          accessibilityRole="button"
          accessibilityState={{ selected: settings.accentId === 'custom' }}
          accessibilityLabel="Custom accent"
          style={[
            styles.swatch,
            {
              backgroundColor: colors.background,
              borderColor:
                settings.accentId === 'custom' ? colors.textPrimary : colors.borderStrong,
            },
          ]}
        >
          <View style={[styles.swatchDot, { backgroundColor: colors.accent }]} />
          <Icon name="plus" size={13} color={colors.textPrimary} style={styles.swatchCheck} />
        </Pressable>
      </View>

      {settings.accentId === 'custom' ? (
        <View>
          <AppText variant="caption" tone="muted" style={styles.customLabel}>
            Custom colour
          </AppText>
          <View style={styles.chips}>
            {['#4F4CC9', '#2E62D8', '#0B8C5B', '#B45E15', '#B02A31', '#6E665B'].map((hex) => (
              <Chip
                key={hex}
                label={hex.toUpperCase()}
                selected={settings.customAccent.toUpperCase() === hex.toUpperCase()}
                onPress={() => update({ customAccent: hex })}
              />
            ))}
          </View>
          <AppText variant="caption" tone="muted" style={styles.note}>
            Contrast is safeguarded automatically — labels on accent buttons pick black or white
            for AA.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function TextGroup() {
  const { settings, update } = useSettings();
  return (
    <View style={styles.groupBody}>
      <AppText variant="overline" tone="muted">
        Typeface
      </AppText>
      <ChipRow
        options={[
          { value: 'default', label: 'Default' },
          { value: 'rounded', label: 'Rounded' },
          { value: 'mono', label: 'Mono' },
        ]}
        value={settings.fontFamily}
        onChange={(v) => update({ fontFamily: v as AppearanceSettings['fontFamily'] })}
      />
      <AppText variant="overline" tone="muted" style={styles.groupGap}>
        Size
      </AppText>
      <ChipRow
        options={[
          { value: 'small', label: 'Small' },
          { value: 'default', label: 'Default' },
          { value: 'large', label: 'Large' },
          { value: 'xlarge', label: 'Larger' },
        ]}
        value={settings.textScale}
        onChange={(v) => update({ textScale: v as AppearanceSettings['textScale'] })}
      />
      <AppText variant="overline" tone="muted" style={styles.groupGap}>
        Weight
      </AppText>
      <ChipRow
        options={[
          { value: 'regular', label: 'Regular' },
          { value: 'medium', label: 'Medium' },
          { value: 'bold', label: 'Bold' },
        ]}
        value={settings.fontWeight}
        onChange={(v) => update({ fontWeight: v as AppearanceSettings['fontWeight'] })}
      />
      <AppText variant="overline" tone="muted" style={styles.groupGap}>
        Line spacing
      </AppText>
      <ChipRow
        options={[
          { value: 'tight', label: 'Tight' },
          { value: 'normal', label: 'Normal' },
          { value: 'relaxed', label: 'Relaxed' },
        ]}
        value={settings.lineSpacing}
        onChange={(v) => update({ lineSpacing: v as AppearanceSettings['lineSpacing'] })}
      />
    </View>
  );
}

function ShapeGroup() {
  const colors = useColors();
  const { settings, update } = useSettings();
  const marks = [
    { v: 0.7, label: 'Sharp' },
    { v: 0.85, label: 'Soft' },
    { v: 1, label: 'Round' },
    { v: 1.2, label: 'Softer' },
  ];
  return (
    <View style={styles.groupBody}>
      <AppText variant="overline" tone="muted">
        Corner radius
      </AppText>
      <View style={styles.sliderRow}>
        {marks.map((m) => (
          <Pressable
            key={m.v}
            onPress={() => update({ radiusScale: m.v })}
            accessibilityRole="button"
            accessibilityState={{ selected: settings.radiusScale === m.v }}
            accessibilityLabel={`${m.label} corners`}
            style={[
              styles.radiusPreview,
              {
                backgroundColor: 'transparent',
                borderColor:
                  settings.radiusScale === m.v ? colors.textPrimary : colors.borderStrong,
                borderRadius: radii.md * m.v,
              },
            ]}
          >
            <AppText variant="caption" tone={settings.radiusScale === m.v ? 'primary' : 'muted'}>
              {m.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <AppText variant="overline" tone="muted" style={styles.groupGap}>
        Density
      </AppText>
      <ChipRow
        options={[
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'compact', label: 'Compact' },
        ]}
        value={settings.density}
        onChange={(v) => update({ density: v as AppearanceSettings['density'] })}
      />
    </View>
  );
}

function MotionGroup() {
  const { settings, update } = useSettings();
  return (
    <View style={styles.groupBody}>
      <ChipRow
        options={[
          { value: 'full', label: 'Full' },
          { value: 'reduced', label: 'Reduced' },
          { value: 'off', label: 'Off' },
        ]}
        value={settings.motion}
        onChange={(v) => update({ motion: v as AppearanceSettings['motion'] })}
      />
      <AppText variant="caption" tone="muted">
        The system also honours your OS reduce-motion setting.
      </AppText>
    </View>
  );
}

function HapticsGroup() {
  const { settings, update } = useSettings();
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';
  if (!supported) {
    return (
      <AppText variant="caption" tone="muted">
        Haptics are not available on this device.
      </AppText>
    );
  }
  const events: { key: keyof AppearanceSettings['hapticEvents']; label: string; caption: string }[] =
    [
      { key: 'taps', label: 'Taps', caption: 'Light tick on key buttons' },
      { key: 'toggles', label: 'Toggles', caption: 'When switching a setting' },
      { key: 'success', label: 'Success', caption: 'On completions and saves' },
      { key: 'errors', label: 'Errors', caption: 'On failures and warnings' },
    ];
  return (
    <View style={styles.groupBody}>
      <Row
        title="Haptic feedback"
        caption="Vibration cues as you interact."
        control={
          <Toggle
            value={settings.hapticsEnabled}
            onValueChange={(v) => update({ hapticsEnabled: v })}
            accessibilityLabel="Haptic feedback"
          />
        }
      />
      <AppText variant="overline" tone="muted" style={styles.groupGap}>
        Intensity
      </AppText>
      <ChipRow
        options={[
          { value: 'light', label: 'Light' },
          { value: 'medium', label: 'Medium' },
          { value: 'strong', label: 'Strong' },
        ]}
        value={settings.hapticsIntensity}
        onChange={(v) => update({ hapticsIntensity: v as AppearanceSettings['hapticsIntensity'] })}
      />
      <AppText variant="overline" tone="muted" style={styles.groupGap}>
        Events
      </AppText>
      {events.map((ev) => (
        <Row
          key={ev.key}
          title={ev.label}
          caption={ev.caption}
          control={
            <Toggle
              value={settings.hapticEvents[ev.key]}
              disabled={!settings.hapticsEnabled}
              onValueChange={(v) =>
                update({ hapticEvents: { ...settings.hapticEvents, [ev.key]: v } })
              }
              accessibilityLabel={ev.label}
            />
          }
        />
      ))}
      {!settings.hapticsEnabled ? (
        <AppText variant="caption" tone="muted">
          Turn on haptics to configure events.
        </AppText>
      ) : null}
    </View>
  );
}

function HomeGroup() {
  const { settings, update } = useSettings();
  return (
    <View style={styles.groupBody}>
      <AppText variant="overline" tone="muted">
        Start on
      </AppText>
      <ChipRow
        options={[
          { value: 'index', label: 'Home' },
          { value: 'vision', label: 'Vision' },
          { value: 'coach', label: 'Coach' },
          { value: 'progress', label: 'Progress' },
        ]}
        value={settings.defaultTab}
        onChange={(v) => update({ defaultTab: v as AppearanceSettings['defaultTab'] })}
      />
      <Row
        title="Interface sounds"
        caption="Off by default — no sound effects ship with Correr yet."
        control={
          <Toggle
            value={settings.soundsEnabled}
            onValueChange={(v) => update({ soundsEnabled: v })}
            accessibilityLabel="Interface sounds"
          />
        }
      />
    </View>
  );
}

function AccessibilityGroup() {
  const { settings, update } = useSettings();
  return (
    <View style={styles.groupBody}>
      <Row
        title="High contrast"
        caption="Stronger text and hairlines on every surface."
        control={
          <Toggle
            value={settings.highContrast}
            onValueChange={(v) => update({ highContrast: v })}
            accessibilityLabel="High contrast"
          />
        }
      />
      <Row
        title="Larger tap targets"
        caption="Grow buttons and controls by 15%."
        control={
          <Toggle
            value={settings.largeTapTargets}
            onValueChange={(v) => update({ largeTapTargets: v })}
            accessibilityLabel="Larger tap targets"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  syncCard: {
    paddingVertical: spacing.md,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  syncText: {
    flex: 1,
    gap: 1,
  },
  group: {
    gap: spacing.md,
  },
  groupTitle: {
    marginBottom: spacing.xs,
  },
  groupBody: {
    gap: spacing.sm,
  },
  groupGap: {
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: radii.round,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    width: 26,
    height: 26,
    borderRadius: radii.round,
  },
  swatchCheck: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'transparent',
  },
  customLabel: {
    marginTop: spacing.xs,
  },
  note: {
    marginTop: spacing.xs,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  radiusPreview: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CorrerGlyph } from '@/design-system/BrandMark';
import { useColors } from '@/design-system/theme';
import { radii, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Auth language, brought into Ink & Paper.
 *
 * The reference is near-empty white: a tiny wordmark, one oversized display
 * headline, pill fields, an ink CTA. The lavender/Poppins Figma values are
 * gone — auth now reads as the same product as the tabs.
 */
export function useAuthInputStyle() {
  const colors = useColors();
  return useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderRadius: radii.control,
      fontFamily: 'Inter_400Regular',
      fontSize: 16,
      color: colors.textPrimary,
    }),
    [colors],
  );
}

export function useAuthLabelStyle() {
  const colors = useColors();
  return useMemo(
    () => ({
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      letterSpacing: 0.2,
      color: colors.textPrimary,
    }),
    [colors],
  );
}

/** Tiny wordmark: the Correr glyph plus a letterspaced label. */
export function AuthWordmark() {
  const colors = useColors();
  return (
    <View style={styles.wordmark}>
      <CorrerGlyph size={15} color={colors.textPrimary} />
      <AppText style={[styles.wordmarkText, { color: colors.textPrimary }]}>CORRER</AppText>
    </View>
  );
}

/** Segmented Log in / Sign up switch — the reference's top-of-form control. */
export function AuthSegment({ active }: { active: 'login' | 'signup' }) {
  const colors = useColors();
  return (
    <View style={[styles.segment, { backgroundColor: colors.surfaceSunken }]}>
      {(
        [
          { key: 'login', label: 'Log in', href: '/(auth)/login' },
          { key: 'signup', label: 'Sign up', href: '/(auth)/signup' },
        ] as const
      ).map((item) => {
        const selected = active === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (!selected) router.replace(item.href);
            }}
            style={[
              styles.segmentItem,
              selected && { backgroundColor: colors.textPrimary },
            ]}
          >
            <AppText
              variant="bodyMedium"
              style={{ color: selected ? colors.textInverse : colors.textMuted }}
            >
              {item.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function GoogleButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.googleWrap, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={['#2E2E2E', '#111111']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.google}
      >
        <Image source={require('@/assets/images/google-g.png')} style={styles.googleG} contentFit="contain" />
        <AppText style={styles.googleText}>Continue with Google</AppText>
      </LinearGradient>
    </Pressable>
  );
}

export function OrDivider() {
  const colors = useColors();
  return (
    <View style={styles.orRow}>
      <View style={[styles.orLine, { backgroundColor: colors.border }]} />
      <AppText style={[styles.orText, { color: colors.textMuted }]}>OR</AppText>
      <View style={[styles.orLine, { backgroundColor: colors.border }]} />
    </View>
  );
}

export function LinkText({
  prefix,
  link,
  onPress,
}: {
  prefix: string;
  link: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable onPress={onPress} style={styles.linkWrap} accessibilityRole="link">
      <AppText style={[styles.linkPrefix, { color: colors.textMuted }]}>{prefix}</AppText>
      <AppText style={[styles.linkStrong, { color: colors.textPrimary }]}>{link}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wordmark: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  wordmarkText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 3.2,
  },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radii.pill,
    alignSelf: 'center',
  },
  segmentItem: {
    flex: 1,
    minWidth: 104,
    height: 40,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleWrap: {
    borderRadius: radii.pill,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  google: {
    minHeight: 56,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  googleG: {
    width: 20,
    height: 20,
  },
  googleText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  orText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1.2,
  },
  linkWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
  },
  linkPrefix: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  linkStrong: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});

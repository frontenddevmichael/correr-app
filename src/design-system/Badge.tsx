import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useColors } from './theme';
import { radii, spacing } from './tokens';
import { AppText } from './typography';

export type BadgeTone =
  | 'neutral'
  | 'progress'
  | 'streak'
  | 'ai'
  | 'info'
  | 'error'
  | 'muted';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  dot?: boolean;
  style?: ViewStyle;
}

/**
 * Small uppercase capsule. Soft tint + matching foreground; colour carries
 * meaning, never decoration. Sits quietly next to display-sized titles.
 */
export function Badge({ label, tone = 'neutral', dot = false, style }: BadgeProps) {
  const colors = useColors();

  const toneMap: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary },
    progress: { bg: colors.progressSoft, fg: colors.progressDark },
    streak: { bg: colors.streakSoft, fg: colors.streakDark },
    ai: { bg: colors.accentSoft, fg: colors.accent },
    info: { bg: colors.infoSoft, fg: colors.info },
    error: { bg: colors.errorSoft, fg: colors.error },
    muted: { bg: colors.surfaceSunken, fg: colors.textMuted },
  };

  const t = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: t.fg }]} /> : null}
      <AppText style={[styles.label, { color: t.fg }]}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
});

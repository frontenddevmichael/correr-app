import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

import { useRadiusScale } from './settings';
import { useColors } from './theme';
import { radii, shadows, spacing } from './tokens';

interface CardProps extends ViewProps {
  /**
   * - `filled` — white elevated surface (default)
   * - `outlined` — white, hairline only (secondary content)
   * - `muted` — light grey surface, no border (task rows, wells)
   * - `sunken` — deeper inset well
   * - `dark` — near-black feature surface
   */
  variant?: 'filled' | 'outlined' | 'muted' | 'sunken' | 'dark';
  padded?: boolean;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Layered surfaces, not flat tint.
 *
 * One generous radius (24) and three weights: white cards lift off the canvas
 * with a whisper shadow and no hairline — separation comes from fill contrast
 * plus shadow, like the reference. Grey cards sit flat for dense rows, and the
 * near-black card is the single loud moment on a screen. Depth is stacking,
 * never gradient.
 */
export function Card({ variant = 'filled', padded = true, style, children, ...rest }: CardProps) {
  const colors = useColors();
  const scaleRadius = useRadiusScale();
  return (
    <View
      style={[
        styles.base,
        { borderRadius: scaleRadius(radii.card) },
        variant === 'filled' && {
          backgroundColor: colors.surface,
          ...shadows.card,
        },
        variant === 'outlined' && {
          backgroundColor: colors.surface,
          ...shadows.subtle,
        },
        variant === 'muted' && { backgroundColor: colors.surfaceSunken },
        variant === 'sunken' && { backgroundColor: colors.surfaceSunken },
        variant === 'dark' && { backgroundColor: colors.surfaceDark },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.xl,
  },
});

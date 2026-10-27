import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { useControlHeight, useHaptics } from './settings';
import { useColors } from './theme';
import { radii, shadows, spacing } from './tokens';
import { AppText } from './typography';

type Variant = 'primary' | 'secondary' | 'muted' | 'ghost' | 'danger' | 'ai' | 'progress';
type TextTone = 'onBrand' | 'primary' | 'ai' | 'error' | 'progress';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Pill actions, reference-matched.
 *
 * `primary` is ink — the one loud action per screen. `secondary` is a white
 * pill with a hairline. `muted` is the quiet grey pill ("Skip", "Give up").
 * Colour only appears where it means something (AI, progress, danger).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = true,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const colors = useColors();
  const controlHeight = useControlHeight();
  const haptics = useHaptics();
  const isDisabled = disabled || loading;
  const [scale] = useState(() => new Animated.Value(1));

  const settle = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();
  };

  const config: Record<Variant, { bg: string; bgPressed: string; border: string; text: TextTone }> = {
    primary: {
      bg: colors.brand,
      bgPressed: colors.brandPressed,
      border: 'transparent',
      text: 'onBrand',
    },
    secondary: {
      bg: colors.surface,
      bgPressed: colors.surfaceSunken,
      border: 'transparent',
      text: 'primary',
    },
    muted: {
      bg: colors.surfaceSunken,
      bgPressed: colors.border,
      border: 'transparent',
      text: 'primary',
    },
    ghost: {
      bg: 'transparent',
      bgPressed: colors.surfaceSunken,
      border: 'transparent',
      text: 'primary',
    },
    danger: {
      bg: colors.error,
      bgPressed: colors.errorPressed,
      border: 'transparent',
      text: 'onBrand',
    },
    ai: {
      bg: colors.accent,
      bgPressed: colors.accentPressed,
      border: 'transparent',
      text: 'onBrand',
    },
    progress: {
      bg: colors.progress,
      bgPressed: colors.progressPressed,
      border: 'transparent',
      text: 'onBrand',
    },
  };

  const v = config[variant];

  return (
    <Animated.View
      style={[
        fullWidth ? styles.fullWidth : styles.autoWidth,
        { transform: [{ scale }] },
        style as ViewStyle,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        // RNW 0.21 ignores accessibilityState on Pressable — mirror to aria-* for web.
        {...({
          'aria-disabled': isDisabled,
          'aria-busy': loading,
        } as Record<string, boolean>)}
        onPress={
          isDisabled
            ? undefined
            : () => {
                haptics.tap();
                onPress?.();
              }
        }
        onPressIn={() => {
          if (!isDisabled) settle(0.98);
        }}
        onPressOut={() => settle(1)}
        style={({ pressed }) => [
          styles.base,
          size === 'sm' && styles.small,
          {
            minHeight: controlHeight(size === 'sm' ? 44 : 56),
            backgroundColor: pressed ? v.bgPressed : v.bg,
          },
          variant === 'secondary' && shadows.subtle,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.text === 'onBrand' ? colors.surface : colors.brand} />
        ) : (
          <View style={styles.content}>
            {leftIcon}
            <AppText variant="button" tone={v.text}>
              {label}
            </AppText>
            {rightIcon}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  small: {
    minHeight: 44,
    paddingHorizontal: spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  autoWidth: {
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: 0.4,
  },
});

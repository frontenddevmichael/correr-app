import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';

import { Icon, type IconName } from './icons';
import { useControlHeight, useHaptics } from './settings';
import { useColors } from './theme';
import { radii, spacing } from './tokens';
import { AppText } from './typography';

interface ChipProps {
  label: string;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'ai';
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Selectable pill. Unselected sits on a sunken fill with no hairline; selected
 * flips to ink/accent. This is the reference's core control — used for
 * categories, pace, blockers, time budgets and quick nudges.
 */
export function Chip({
  label,
  icon,
  selected = false,
  onPress,
  tone = 'default',
  disabled,
  style,
}: ChipProps) {
  const colors = useColors();
  const controlHeight = useControlHeight();
  const haptics = useHaptics();
  const accent = tone === 'ai' ? colors.accent : colors.brand;
  const fg = selected ? colors.textInverse : colors.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      onPress={
        disabled
          ? undefined
          : () => {
              haptics.tap();
              onPress?.();
            }
      }
      style={({ pressed }) => [
        styles.chip,
        { minHeight: controlHeight(44) },
        selected
          ? { backgroundColor: accent, borderColor: accent, borderWidth: 0 }
          : { backgroundColor: colors.surfaceSunken },
        pressed && !selected && { backgroundColor: colors.border },
        disabled && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={16} color={fg} /> : null}
        <AppText variant="bodyMedium" style={{ color: fg }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  disabled: {
    opacity: 0.5,
  },
});

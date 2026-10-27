import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { Icon, type IconName } from './icons';
import { useColors } from './theme';
import { radii, spacing } from './tokens';
import { AppText } from './typography';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/**
 * Empty / error / offline states, reference-style: concentric rings with a
 * single dark disc at the centre. Supportive copy (never shaming), one clear
 * action.
 */
export function EmptyState({
  icon = 'sprout',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.ringOuter, { backgroundColor: colors.surfaceSunken }]}>
        <View style={[styles.ringMid, { backgroundColor: colors.surface }]}>
          <View style={[styles.core, { backgroundColor: colors.brand }]}>
            <Icon name={icon} size={26} color={colors.textInverse} />
          </View>
        </View>
      </View>
      <AppText variant="title" center style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="body" tone="secondary" center style={styles.copy}>
          {description}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  ringOuter: {
    width: 132,
    height: 132,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  ringMid: {
    width: 96,
    height: 96,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: 64,
    height: 64,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    letterSpacing: -0.5,
  },
  copy: {
    maxWidth: 300,
  },
  action: {
    marginTop: spacing.sm,
  },
});

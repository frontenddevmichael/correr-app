import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';

import { useColors } from './theme';
import { radii, spacing } from './tokens';
import { AppText } from './typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

/**
 * Soft white field, 16 radius, no resting border. Focus goes to ink and errors
 * to the error colour — borders survive only where they carry meaning, and the
 * reference keeps controls monochrome so only meaning carries colour.
 */
export function Input({
  label,
  error,
  hint,
  containerStyle,
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="bodyMedium" tone="secondary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          { backgroundColor: colors.surface, color: colors.textPrimary },
          focused && { borderColor: colors.textPrimary, borderWidth: 1 },
          !!error && { borderColor: colors.error, borderWidth: 1 },
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" tone="error" style={styles.message}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="muted" style={styles.message}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    alignSelf: 'stretch',
  },
  label: {
    marginLeft: spacing.xs,
  },
  input: {
    minHeight: 56,
    borderRadius: radii.control,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    outlineWidth: 0,
  },
  message: {
    marginLeft: spacing.xs,
  },
});

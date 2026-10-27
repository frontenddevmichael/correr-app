import React from 'react';
import { View } from 'react-native';

import { useColors } from '@/design-system/theme';

/** Minimal eye icons matching the password toggle. */
export function Eye() {
  const colors = useColors();
  return (
    <View style={eyeStyles.wrap}>
      <View style={[eyeStyles.outer, { borderColor: colors.textMuted }]} />
      <View style={[eyeStyles.pupil, { backgroundColor: colors.textMuted }]} />
    </View>
  );
}

export function EyeOff() {
  const colors = useColors();
  return (
    <View style={eyeStyles.wrap}>
      <View style={[eyeStyles.outer, { borderColor: colors.textMuted }]} />
      <View style={[eyeStyles.pupil, { backgroundColor: colors.textMuted }]} />
      <View style={[eyeStyles.slash, { backgroundColor: colors.textMuted }]} />
    </View>
  );
}

const eyeStyles = {
  wrap: {
    width: 22,
    height: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  outer: {
    position: 'absolute' as const,
    width: 22,
    height: 14,
    borderRadius: 11,
    borderWidth: 1.6,
  },
  pupil: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slash: {
    position: 'absolute' as const,
    width: 26,
    height: 1.6,
    transform: [{ rotate: '-35deg' }],
  },
};

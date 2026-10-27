import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useHaptics } from './settings';
import { useColors, useTheme } from './theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}

const TRACK_W = 51;
const TRACK_H = 31;
const THUMB = 27;
const TRAVEL = TRACK_W - THUMB - 2;

/**
 * iOS-style switch, monochrome: ink track = on, which matches the tab-bar
 * emphasis language. Built in-house because React Native's Switch ignores
 * thumbColor on web.
 */
export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: ToggleProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const haptics = useHaptics();
  // Created via useState (not useRef) so the react-hooks/refs rule stays happy
  // and interpolation during render is allowed — same pattern as ProgressBar.
  const [anim] = useState(() => new Animated.Value(value ? 1 : 0));

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 160,
      easing: (t) => t * (2 - t), // ease-out — subtle, HIG-style motion
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.borderStrong, colors.brand],
  });
  const thumbX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, TRAVEL],
  });
  // In dark mode the brand track inverts to a light surface, so a white thumb
  // would vanish on "on" — it flips to the canvas colour instead. Off keeps the
  // iOS-standard white thumb on the grey track.
  const thumbColor = isDark ? (value ? colors.background : '#FFFFFF') : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      // RNW 0.21 ignores accessibilityState on Pressable — mirror to aria-* for web.
      {...({ 'aria-checked': value, 'aria-disabled': disabled } as Record<string, boolean>)}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        haptics.toggle();
        onValueChange(!value);
      }}
      hitSlop={8}
      style={disabled ? styles.disabled : undefined}
    >
      <Animated.View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[styles.thumb, { backgroundColor: thumbColor, transform: [{ translateX: thumbX }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  disabled: {
    opacity: 0.45,
  },
});

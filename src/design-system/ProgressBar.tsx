import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';

import { useColors } from './theme';
import { radii, spacing } from './tokens';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  tone?: 'progress' | 'ai' | 'streak' | 'brand';
  height?: number;
  showTrack?: boolean;
  /** Override the track color (e.g. translucent white on the dark level card). */
  trackColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  progress,
  tone = 'progress',
  height = 8,
  showTrack = true,
  trackColor,
  style,
}: ProgressBarProps) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(1, progress));
  const [anim] = useState(() => new Animated.Value(clamped));

  const toneColor: Record<NonNullable<ProgressBarProps['tone']>, string> = {
    progress: colors.progress,
    ai: colors.accent,
    streak: colors.streak,
    brand: colors.brand,
  };

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: colors.surfaceSunken },
        !showTrack && styles.transparent,
        trackColor ? { backgroundColor: trackColor } : null,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      // RNW 0.21 ignores accessibilityValue — mirror to aria-* for web.
      {...({
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': Math.round(clamped * 100),
      } as Record<string, number>)}
    >
      <Animated.View
        style={[
          styles.fill,
          { width, backgroundColor: toneColor[tone], borderRadius: height / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  fill: {
    height: '100%',
  },
});

export const progressBarSpacing = spacing;
export const progressBarRadius = radii;

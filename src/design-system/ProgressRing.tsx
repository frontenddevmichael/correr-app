import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { AnimatedNumber } from './motion';
import { useColors } from './theme';
import { fontFamily } from './tokens';
import { AppText } from './typography';

/**
 * `Animated` injects `collapsable={false}` into the props of the component it
 * drives. That is correct for a native view, but React DOM rejects it on an SVG
 * element and raises a LogBox error on web. Strip it before it reaches `<Circle>`.
 */
const CleanCircle = React.forwardRef<
  React.ComponentRef<typeof Circle>,
  React.ComponentProps<typeof Circle> & { collapsable?: boolean }
>(function CleanCircle({ collapsable, ...props }, ref) {
  void collapsable;
  return <Circle ref={ref} {...props} />;
});

const AnimatedCircle = Animated.createAnimatedComponent(CleanCircle);

interface ProgressRingProps {
  /** 0..1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  /** `dark` renders a paper arc for use on ink cards. */
  tone?: 'light' | 'dark';
  /** Hide the percentage in the centre (e.g. when passing children). */
  showValue?: boolean;
  /** Tiny uppercase caption under the percentage. */
  caption?: string;
  children?: React.ReactNode;
}

/**
 * Animated SVG progress ring.
 *
 * The arc draws once on mount and whenever the value changes; the percentage
 * counts with it. A small marker dot sits at the arc's end so the ring reads as
 * a moving instrument rather than a static chart.
 */
export function ProgressRing({
  progress,
  size = 96,
  strokeWidth = 7,
  tone = 'light',
  showValue = true,
  caption,
  children,
}: ProgressRingProps) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(1, progress));
  const [anim] = useState(() => new Animated.Value(clamped));

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcColor = tone === 'dark' ? colors.textOnDark : colors.textPrimary;
  const trackColor = tone === 'dark' ? 'rgba(255,255,255,0.18)' : colors.border;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const dashOffset = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // The SVG itself is rotated -90° so the arc starts at 12 o'clock; measure the
  // marker from 3 o'clock to match the unrotated coordinate space.
  const angle = 2 * Math.PI * clamped;
  const dotX = size / 2 + radius * Math.cos(angle);
  const dotY = size / 2 + radius * Math.sin(angle);

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={{ width: size, height: size, transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackColor}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={dashOffset}
          />
          {clamped > 0.01 ? (
            <Circle cx={dotX} cy={dotY} r={strokeWidth * 0.85} fill={arcColor} />
          ) : null}
        </Svg>
      </View>
      {children ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
      ) : showValue ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <AnimatedNumber
            value={Math.round(clamped * 100)}
            suffix="%"
            style={[
              styles.value,
              {
                color: arcColor,
                fontSize: size * 0.23,
                lineHeight: size * 0.27,
              },
            ]}
          />
          {caption ? (
            <AppText style={[styles.caption, { color: arcColor }]} numberOfLines={1}>
              {caption}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: fontFamily.display,
    fontWeight: '700',
    letterSpacing: -1,
  },
  caption: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    opacity: 0.65,
    marginTop: 1,
  },
});

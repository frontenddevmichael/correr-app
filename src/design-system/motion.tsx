import React, { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { useHaptics, useMotionEnabled } from './settings';
import { motion as motionTokens } from './tokens';
import { AppText } from './typography';

/**
 * Motion primitives for the Ink & Paper system.
 *
 * The language is quiet: content rises into place, controls settle under the
 * finger, numbers count, rings draw. Everything is disabled when the OS asks
 * for reduced motion *or* the user sets Animation to Reduced/Off in
 * Appearance — both funnel through `useMotionEnabled`.
 */
export function useReducedMotion(): boolean {
  // True when motion should not play (user pref OR OS reduce-motion).
  return !useMotionEnabled();
}

interface RevealProps {
  children: React.ReactNode;
  /** Stagger in ms. */
  delay?: number;
  /** How far the content travels, in px. */
  distance?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fade + rise. The default entrance for a block of content. */
export function Reveal({
  children,
  delay = 0,
  distance = 14,
  duration = motionTokens.slow,
  style,
}: RevealProps) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      progress.stopAnimation();
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [progress, delay, duration, reduced]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface MotionPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityState?: PressableProps['accessibilityState'];
  style?: StyleProp<ViewStyle>;
  /** Resting scale while held. Keep subtle: 0.96–0.98. */
  scaleTo?: number;
}

/** Pressable with a spring settle. Use for cards, rows and tiles. */
export function MotionPressable({
  children,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  style,
  scaleTo = 0.975,
}: MotionPressableProps) {
  const reduced = useReducedMotion();
  const haptics = useHaptics();
  const [scale] = useState(() => new Animated.Value(1));

  const settle = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();
  };

  return (
    <Pressable
      onPress={() => {
        if (!disabled) haptics.tap();
        onPress?.();
      }}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPressIn={() => {
        if (!reduced) settle(scaleTo);
      }}
      onPressOut={() => {
        if (!reduced) settle(1);
      }}
      style={style}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

/** Count-up for stats. Uses the JS driver because it updates rendered text. */
export function AnimatedNumber({
  value,
  suffix = '',
  prefix = '',
  duration = 650,
  style,
}: AnimatedNumberProps) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(0);
  // useState (not useRef) keeps the react-hooks/refs rule happy — same pattern
  // as ProgressBar and Toggle.
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) {
      progress.stopAnimation();
      return;
    }
    progress.stopAnimation();
    progress.setValue(0);
    const listener = progress.addListener(({ value: current }) => setDisplay(Math.round(current)));
    Animated.timing(progress, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => progress.removeListener(listener);
  }, [value, duration, reduced, progress]);

  return (
    <AppText style={style}>
      {prefix}
      {reduced ? value : display}
      {suffix}
    </AppText>
  );
}

interface PopInProps {
  /** Re-animates whenever this flips to true. */
  trigger: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** A check or badge that springs in when a state becomes true. */
export function PopIn({ trigger, children, style }: PopInProps) {
  const reduced = useReducedMotion();
  const [pop] = useState(() => new Animated.Value(trigger ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      pop.setValue(trigger ? 1 : 0);
      return;
    }
    if (trigger) {
      pop.setValue(0);
      Animated.spring(pop, {
        toValue: 1,
        useNativeDriver: true,
        speed: 22,
        bounciness: 8,
      }).start();
    } else {
      pop.setValue(0);
    }
  }, [trigger, pop, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

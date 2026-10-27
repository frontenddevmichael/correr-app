import React, { useEffect } from 'react';
import {
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Reveal, useReducedMotion } from '@/design-system/motion';
import { useColors } from '@/design-system/theme';
import { layout, radii, shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Vision empty state — "the blank atlas".
 *
 * A fanned stack of unstarted pages, drawn forward in a slow wave so the
 * emptiness reads as *waiting* rather than missing, then a hand-drawn arrow
 * that curls from the copy down to the one action on the screen.
 */

const CARD_WIDTH = 118;
const CARD_HEIGHT = 152;
const STAGE_WIDTH = 236;
const STAGE_HEIGHT = 196;

const ARROW_HEIGHT = 170;
const ARROW_WIDTH = 200;

const WAVE_DURATION = 3600;
const WAVE_SPAN = 0.2; // a single sheet's rise (fraction of the cycle)
const WAVE_STEP = 0.16; // how far apart consecutive sheets start

/** Back → front. Each sheet's resting rotation, offset and depth. */
const SHEETS = [
  { rotate: -22, x: -32, y: 24, scale: 0.9 },
  { rotate: -4, x: -4, y: 8, scale: 0.955 },
  { rotate: 14, x: 26, y: -18, scale: 1 },
] as const;

/** One slow pass per cycle; the instant reset is invisible (all lifts rest at 0). */
function useForwardWave(enabled: boolean) {
  const wave = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      wave.value = 0;
      return;
    }
    wave.value = withRepeat(
      withSequence(
        withTiming(1, { duration: WAVE_DURATION, easing: Easing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [enabled, wave]);

  return wave;
}

function Sheet({
  index,
  wave,
  reduced,
  surface,
  border,
  accent,
}: {
  index: number;
  wave: SharedValue<number>;
  reduced: boolean;
  surface: string;
  border: string;
  accent: string;
}) {
  const config = SHEETS[index];
  const enter = useSharedValue(reduced ? 1 : 0);

  // Settle out of the stack into the fan, back sheet first.
  useEffect(() => {
    if (reduced) {
      enter.value = 1;
      return;
    }
    enter.value = 0;
    enter.value = withDelay(
      60 + index * 70,
      withSpring(1, { damping: 12, stiffness: 130, mass: 0.9 }),
    );
  }, [enter, index, reduced]);

  // "Forward": the sheet rises toward the viewer, straightens a touch, then
  // settles back into the fan. Back sheets go first, so the stack reads as
  // pages being dealt toward you.
  const liftFrom = index * WAVE_STEP;
  const style = useAnimatedStyle(() => {
    const lift = interpolate(
      wave.value,
      [liftFrom, liftFrom + WAVE_SPAN, liftFrom + WAVE_SPAN * 2],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const e = enter.value;

    return {
      opacity: e,
      transform: [
        { translateX: e * config.x - lift * config.x * 0.12 },
        { translateY: (1 - e) * 10 + e * config.y - lift * 16 },
        { rotate: `${e * config.rotate - lift * config.rotate * 0.45}deg` },
        { scale: 0.9 + e * (config.scale - 0.9) + lift * 0.035 },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        shadows.card,
        { backgroundColor: surface, borderColor: border, zIndex: index },
        style,
      ]}
    >
      {index === SHEETS.length - 1 ? (
        // The front page is the only one with a line on it: the first
        // sentence, still unwritten — in the user's accent.
        <View style={[styles.cardRule, { backgroundColor: accent }]} />
      ) : null}
    </Animated.View>
  );
}

/** Fanned folder stack that breathes forward. */
export function FolderStack({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const wave = useForwardWave(!reduced);
  // A slow float under the wave, so the stack is never perfectly still.
  const breathe = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(
      withTiming(1, { duration: 2900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [breathe, reduced]);

  const stageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 * breathe.value }],
  }));

  return (
    <Animated.View
      style={[styles.stage, style, stageStyle]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {SHEETS.map((_, index) => (
        <Sheet
          key={index}
          index={index}
          wave={wave}
          reduced={reduced}
          surface={colors.surface}
          border={colors.border}
          accent={colors.brand}
        />
      ))}
    </Animated.View>
  );
}

/**
 * Hand-drawn arrow: starts under the copy, bulges right, then falls to the
 * primary button in the tab bar. Stroked, never filled — pencil on paper.
 */
export function CurvedArrow({
  scale = 1,
  style,
}: {
  scale?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();

  return (
    <View
      style={[{ width: ARROW_WIDTH * scale, height: ARROW_HEIGHT * scale }, styles.arrow, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={ARROW_WIDTH * scale}
        height={ARROW_HEIGHT * scale}
        viewBox="0 0 200 170"
        fill="none"
      >
        <Path
          d="M62 3C58 30 74 48 100 56C142 70 172 94 164 120C160 134 152 142 152 152"
          stroke={colors.textMuted}
          strokeOpacity={0.55}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
        <Path
          d="M140 148C145 152 149 156 152 160C154 156 159 152 164 147"
          stroke={colors.textMuted}
          strokeOpacity={0.55}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/**
 * The empty composition: pages, promise, then an arrow that reaches past the
 * screen padding to the floating primary button at the bottom right.
 */
export function VisionEmptyState() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Shorter phones get a smaller arrow rather than an arrow that runs into
  // the bar. The head still lands on the same button.
  const scale = Math.min(1, Math.max(0.72, height / 844));
  const gap = Math.max(insets.bottom, layout.tabBarInset);
  // Screen reserves `screenBottomPadding` under the content; the arrow is
  // allowed back into it so its head stops just above the FAB.
  const overhang = 64 + 10 * scale - gap;
  const rightBleed = 48 * scale - gap - 6;

  return (
    <View style={styles.empty}>
      <FolderStack />
      <View style={styles.spacer} />
      <AppText variant="title" center style={styles.title}>
        An empty atlas
      </AppText>
      <AppText variant="body" tone="secondary" center style={styles.copy}>
        Name the future you are running toward. The AI draws the road.
      </AppText>
      <Reveal
        delay={240}
        style={[styles.arrowSlot, { marginBottom: -overhang, marginRight: -rightBleed }]}
      >
        <CurvedArrow scale={scale} />
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardRule: {
    position: 'absolute',
    left: 20,
    bottom: 24,
    width: 42,
    height: 2,
    borderRadius: 1,
  },
  arrow: {
    alignItems: 'center',
  },
  arrowSlot: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  spacer: {
    flex: 1,
    minHeight: spacing.lg,
  },
  title: {
    letterSpacing: -0.5,
  },
  copy: {
    maxWidth: 296,
  },
});

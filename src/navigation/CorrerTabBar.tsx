import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { router } from 'expo-router';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimateIcon, type AnimateIconName } from '@/design-system/AnimateIcon';
import { Icon } from '@/design-system/icons';
import { useReducedMotion } from '@/design-system/motion';
import { useColors, useTheme } from '@/design-system/theme';
import { layout, radii, shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Floating glass tab bar.
 *
 * Layout model: the active destination owns a wider "pill" slot, the other
 * slots share the remainder equally. `pos` is the fractional active index
 * (spring-animated); the pill and every icon are positioned from it, so
 * icons slide out of the pill's way instead of being overlapped or clipped.
 *
 * Liquid glass is native on iOS 26+; elsewhere the capsule is an opaque
 * surface with identical geometry.
 */
const TAB_ICONS: Record<string, { icon: AnimateIconName; label: string }> = {
  index: { icon: 'home', label: 'Home' },
  vision: { icon: 'compass', label: 'Vision' },
  coach: { icon: 'sparkles', label: 'Coach' },
  progress: { icon: 'chart', label: 'Progress' },
};

const ORDER = ['index', 'vision', 'coach', 'progress'];

const CREATE_ITEMS = [
  {
    icon: 'plus',
    title: 'New promise',
    caption: 'Plan one clear action for today',
    route: '/commitment/new',
  },
  {
    icon: 'compass',
    title: 'New vision',
    caption: 'Start a future worth running toward',
    route: '/vision/new',
  },
  {
    icon: 'sparkles',
    title: 'Ask coach',
    caption: 'Think it through with your coach',
    route: '/(tabs)/coach',
  },
] as const;

const BAR_HEIGHT = 66;
const BAR_PADDING = 6;
const PILL_HEIGHT = 46;
const MIN_SLOT = 44; // minimum touch target width for inactive tabs
// Underdamped (~0.5 damping ratio): visible overshoot and a couple of settles.
const SPRING = { damping: 11, stiffness: 230, mass: 0.7 }; // head: snappy, bouncy
const TAIL_SPRING = { damping: 15, stiffness: 95, mass: 1 }; // tail: soft, lags behind -> jelly stretch

function detectGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}
const GLASS_AVAILABLE = detectGlass();

type Route = BottomTabBarProps['state']['routes'][number];

function TabItem({
  index,
  pos,
  slot,
  pillWidth,
  focused,
  icon,
  label,
  onPress,
}: {
  index: number;
  pos: SharedValue<number>;
  slot: number;
  pillWidth: number;
  focused: boolean;
  icon: AnimateIconName;
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();

  // Slots right of the pill shift by the pill's extra width. The shift is
  // clamped so a neighbour can never be pushed past the bar's right edge.
  const position = useAnimatedStyle(() => {
    const neighbour = Math.min(Math.max(index - pos.value, 0), 1);
    const shift = (pillWidth - slot) * neighbour;
    return { transform: [{ translateX: Math.max(BAR_PADDING + index * slot + shift, BAR_PADDING) }] };
  });

  // The active icon fades out as the pill covers it.
  const fade = useAnimatedStyle(() => ({
    opacity: Math.min(Math.abs(index - pos.value), 1),
  }));

  return (
    <Animated.View style={[styles.item, { width: slot }, position]}>
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.itemPress, pressed && styles.itemPressed]}
      >
        <Animated.View style={fade}>
          <AnimateIcon name={icon} size={22} color={colors.textSecondary} />
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

export function CorrerTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
}: BottomTabBarProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const reduced = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = React.useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  // Bumped on every FAB press so the plus glyph replays its spin.
  const [fabPlay, setFabPlay] = useState(0);
  const menuProgress = useSharedValue(0);

  const activeName = state.routes[state.index]?.name;
  const routes = ORDER.map((name) => state.routes.find((r) => r.name === name)).filter(
    (r): r is Route => Boolean(r),
  );
  // -1 when the focused route isn't a bar destination (e.g. 'more').
  const activeIndex = routes.findIndex((route) => route.name === activeName);

  // Initialised to the real index, so there is no slide-in on first render.
  const pos = useSharedValue(Math.max(activeIndex, 0));
  const target = useSharedValue(Math.max(activeIndex, 0));
  const from = useSharedValue(Math.max(activeIndex, 0));
  const tail = useSharedValue(Math.max(activeIndex, 0));

  useEffect(() => {
    if (activeIndex < 0) return;
    from.set(pos.get());
    target.set(activeIndex);
    // `overshootClamping` stays off so the head springs past its target and
    // settles back. That overshoot is the bounce. The rendered position is
    // clamped inside the animated style, so the pill can't leave the bar.
    pos.set(reduced ? activeIndex : withSpring(activeIndex, SPRING));
    tail.set(reduced ? activeIndex : withSpring(activeIndex, TAIL_SPRING));
  }, [activeIndex, reduced, pos, target, from, tail]);

  const count = routes.length;
  const contentWidth = Math.max(0, barWidth - BAR_PADDING * 2);
  // Pill is capped so inactive slots never drop below the touch target.
  const pillWidth = Math.max(
    0,
    Math.min(120, Math.max(80, contentWidth * 0.36), contentWidth - (count - 1) * MIN_SLOT),
  );
  const slot = count > 1 ? (contentWidth - pillWidth) / (count - 1) : contentWidth;
  const ready = barWidth > 0;

  // dn = remaining distance as a fraction of this trip (1 at start, 0 at
  // arrival). Normalising by trip length and using dead zones means the spring's
  // overshoot/rebound never re-triggers glass or hides the label.
  // Jelly: the leading edge (pos) springs fast, the trailing edge (tail) lags.
  // Their gap stretches the pill; volume is kept by squashing it vertically.
  // On arrival the two edges converge and the stretch overshoots back past 1
  // for a beat — the "wobble" that makes it feel like jelly rather than a bar.
  const animatedPill = useAnimatedStyle(() => {
    const max = count - 1;
    // Clamp both edges to the real slot range: however far the springs
    // overshoot, the pill can't be rendered outside the bar.
    const h = Math.min(Math.max(pos.value, 0), max);
    const t = Math.min(Math.max(tail.value, 0), max);
    const gap = Math.abs(h - t) * slot;
    // Volume conservation: as the pill stretches thin it also squashes
    // vertically, and squashes horizontally on the settle wobble.
    const squash = Math.min(gap / Math.max(pillWidth, 1), 1) * 0.16;
    return {
      width: pillWidth + gap,
      transform: [
        { translateX: Math.min(h, t) * slot },
        { scaleX: 1 - squash * 0.45 },
        { scaleY: 1 - squash },
      ],
    };
  });
  // "Glass while travelling": the opaque paper layer lifts to reveal whatever
  // is under the pill (native glass on iOS 26+, the tinted capsule elsewhere)
  // as soon as the trip starts, and settles back down on arrival. `dn` is the
  // remaining distance normalised by trip length, so a long hop doesn't read
  // differently from a short one, and the spring's rebound can't re-trigger it.
  const paperStyle = useAnimatedStyle(() => {
    const dn = Math.abs(pos.value - target.value) / Math.max(Math.abs(target.value - from.value), 1);
    const g = Math.min(Math.max((dn - 0.15) / 0.35, 0), 1);
    return { opacity: 1 - g };
  });
  // Fallback "glass" where native liquid glass is unavailable: a brand tint
  // in transit, so the capsule still reads as lifted rather than painted.
  const tintStyle = useAnimatedStyle(() => {
    const dn = Math.abs(pos.value - target.value) / Math.max(Math.abs(target.value - from.value), 1);
    return { opacity: 0.16 * Math.min(Math.max((dn - 0.15) / 0.35, 0), 1) };
  });
  // The label doesn't just cross-fade: it emerges from a blur, the way type
  // resolves when glass condenses back into a solid surface.
  const labelStyle = useAnimatedStyle(() => {
    const dn = Math.abs(pos.value - target.value) / Math.max(Math.abs(target.value - from.value), 1);
    const r = Math.min(Math.max((0.4 - dn) / 0.2, 0), 1);
    return {
      opacity: r,
      transform: [{ scale: 0.92 + 0.08 * r }],
      filter: [{ blur: (1 - r) * 6 }],
    };
  });

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value,
    transform: [
      { translateY: (1 - menuProgress.value) * 18 },
      { scale: 0.98 + menuProgress.value * 0.02 },
    ],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: menuProgress.value * 0.42,
  }));

  // Not a destination (Settings etc.): hide the bar rather than highlight Home.
  // Must stay below every hook above.
  if (routes.length === 0 || activeIndex < 0) return null;

  const go = (route: Route) => {
    const focused = activeName === route.name;
    const event = emitter.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigateToTab(route.key);
    }
  };

  const activeRoute = routes[activeIndex];
  const activeMeta = TAB_ICONS[activeRoute.name];
  const activeLabel =
    descriptors[activeRoute.key]?.options.tabBarAccessibilityLabel ?? activeMeta?.label;
  const fabBottom = Math.max(insets.bottom, layout.tabBarInset);
  const opensMenu = activeRoute.name === 'progress';
  const fabLabel = opensMenu
    ? 'Create'
    : activeRoute.name === 'vision'
      ? 'New vision'
      : 'New promise';
  const fabHint = opensMenu
    ? 'Opens the create menu'
    : activeRoute.name === 'vision'
      ? 'Opens the vision composer'
      : 'Opens the commitment composer';

  const openMenu = () => {
    setMenuVisible(true);
    menuProgress.set(withTiming(1, { duration: 180 }));
  };

  const closeMenu = (after?: () => void) => {
    menuProgress.set(withTiming(0, { duration: 140 }));
    setTimeout(() => {
      setMenuVisible(false);
      after?.();
    }, 150);
  };

  const onFabPress = () => {
    setFabPlay((n) => n + 1);
    if (opensMenu) {
      openMenu();
      return;
    }
    if (activeRoute.name === 'vision') {
      router.push('/vision/new');
      return;
    }
    router.push('/commitment/new');
  };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: Math.max(insets.bottom, layout.tabBarInset) }]}
    >
      {/* Outer view carries the shadow; inner view clips. Splitting them keeps
          the iOS shadow from being cut off by overflow: 'hidden'. Shadow is
          skipped on glass, which provides its own depth. */}
      <View
        style={[
          styles.shadowShell,
          !GLASS_AVAILABLE && { backgroundColor: colors.surface },
          !GLASS_AVAILABLE && shadows.raised,
        ]}
      >
        <View
          accessibilityRole="tablist"
          onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
          style={styles.clip}
        >
          {GLASS_AVAILABLE ? (
            <GlassView
              glassEffectStyle="regular"
              colorScheme={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {ready && activeMeta ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[
                styles.pillShell,
                !GLASS_AVAILABLE && {
                  backgroundColor: isDark ? colors.surfaceSoft : colors.surfaceSunken,
                },
                !GLASS_AVAILABLE && shadows.subtle,
                animatedPill,
              ]}
            >
              <View style={styles.pillClip}>
                {/* Glass sits at full opacity (an alpha < 1 on it or a parent stops it
                    rendering). The paper layer above fades away to reveal it. */}
                {GLASS_AVAILABLE ? (
                  <GlassView
                    glassEffectStyle="regular"
                    tintColor={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.30)'}
                    colorScheme={isDark ? 'dark' : 'light'}
                    style={StyleSheet.absoluteFill}
                  />
                ) : null}
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDark ? colors.surfaceSoft : colors.surfaceSunken,
                    },
                    paperStyle,
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: colors.brand }, tintStyle]}
                />
                <View style={styles.pillContent}>
                  <AnimateIcon
                    key={activeRoute.name}
                    name={activeMeta.icon}
                    size={19}
                    color={colors.textPrimary}
                    autoplay
                    loop
                  />
                  <Animated.View style={[styles.activeLabel, labelStyle]}>
                    <AppText
                      variant="tabLabel"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.2}
                      style={{ color: colors.textPrimary }}
                    >
                      {activeLabel}
                    </AppText>
                  </Animated.View>
                </View>
                <View
                  pointerEvents="none"
                  style={[
                    styles.borderOverlay,
                    { borderColor: isDark ? colors.borderStrong : colors.border },
                  ]}
                />
              </View>
            </Animated.View>
          ) : null}

          {ready
            ? routes.map((route, index) => {
                const meta = TAB_ICONS[route.name];
                if (!meta) return null;
                return (
                  <TabItem
                    key={route.key}
                    index={index}
                    pos={pos}
                    slot={slot}
                    pillWidth={pillWidth}
                    focused={activeName === route.name}
                    icon={meta.icon}
                    label={descriptors[route.key]?.options.tabBarAccessibilityLabel ?? meta.label}
                    onPress={() => go(route)}
                  />
                );
              })
            : null}

          {/* Border as an overlay so it never shifts the absolute layout math. */}
          <View
            pointerEvents="none"
            style={[
              styles.borderOverlay,
              { borderColor: GLASS_AVAILABLE ? 'transparent' : colors.border },
            ]}
          />
        </View>
      </View>

      {activeRoute.name !== 'coach' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={fabLabel}
          accessibilityHint={fabHint}
          onPress={onFabPress}
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.brand },
            shadows.raised,
            pressed && styles.fabPressed,
          ]}
        >
          <AnimateIcon
            name="plus"
            size={26}
            color={colors.brandInverse}
            strokeWidth={2}
            state={menuVisible ? 'x' : 'default'}
            play={fabPlay}
          />
        </Pressable>
      ) : null}

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeMenu()}
      >
        <View style={styles.menuRoot}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.menuScrim, scrimStyle]}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close create menu"
            onPress={() => closeMenu()}
            style={StyleSheet.absoluteFill}
          />

          <Animated.View
            style={[
              styles.menuSheet,
              {
                right: layout.tabBarInset,
                bottom: fabBottom + layout.tabBarFabSize + spacing.md,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
              shadows.raised,
              menuStyle,
            ]}
          >
            <AppText variant="overline" tone="muted">
              Create
            </AppText>
            {CREATE_ITEMS.map((item) => (
              <Pressable
                key={item.route}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                accessibilityHint={item.caption}
                onPress={() => closeMenu(() => router.push(item.route))}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              >
                <View
                  style={[styles.menuItemIcon, { backgroundColor: colors.surfaceSunken }]}
                >
                  <Icon name={item.icon} size={17} color={colors.textPrimary} />
                </View>
                <View style={styles.menuItemText}>
                  <AppText variant="bodyMedium">{item.title}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {item.caption}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </Animated.View>

          <Animated.View
            style={[
              styles.fab,
              styles.menuFab,
              {
                right: layout.tabBarInset,
                bottom: fabBottom,
                backgroundColor: colors.brand,
              },
              shadows.raised,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close create menu"
              onPress={() => closeMenu()}
              style={styles.fabPress}
            >
              <AnimateIcon
                name="plus"
                size={26}
                color={colors.brandInverse}
                strokeWidth={2}
                state={menuVisible ? 'x' : 'default'}
                play={fabPlay}
              />
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: layout.tabBarInset,
    right: layout.tabBarInset,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shadowShell: {
    flex: 1,
    height: BAR_HEIGHT,
    borderRadius: radii.pill,
  },
  clip: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  borderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  item: {
    position: 'absolute',
    left: 0,
    top: BAR_PADDING,
    height: BAR_HEIGHT - BAR_PADDING * 2,
    zIndex: 1,
  },
  itemPress: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPressed: {
    opacity: 0.55,
  },
  pillShell: {
    position: 'absolute',
    left: BAR_PADDING,
    top: (BAR_HEIGHT - PILL_HEIGHT) / 2,
    height: PILL_HEIGHT,
    borderRadius: radii.pill,
    zIndex: 2,
  },
  pillClip: {
    flex: 1,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  pillContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
  },
  activeLabel: {
    flexShrink: 1,
  },
  fab: {
    width: layout.tabBarFabSize,
    height: layout.tabBarFabSize,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPress: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  menuRoot: {
    flex: 1,
  },
  menuScrim: {
    backgroundColor: '#000000',
  },
  menuSheet: {
    position: 'absolute',
    width: 300,
    maxWidth: '86%',
    borderWidth: 1,
    borderRadius: radii.xxl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.lg,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    flex: 1,
    gap: 1,
  },
  menuFab: {
    position: 'absolute',
  },
});
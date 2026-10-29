import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { useApi } from '@/api/ApiProvider';
import type { AppNotification, NotificationKind } from '@/core/domain';
import { formatMonthDay, formatTime, isSameDay } from '@/core/dates';
import { Badge } from '@/design-system/Badge';
import type { BadgeTone } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { EmptyState } from '@/design-system/EmptyState';
import { Reveal, useReducedMotion } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

const KIND_TONES: Record<NotificationKind, BadgeTone> = {
  commitment_reminder: 'info',
  commitment_overdue: 'streak',
  partner_interaction: 'ai',
  daily_checkin: 'ai',
  weekly_review: 'ai',
  ai_insight: 'ai',
  achievement: 'progress',
};

const KIND_LABELS: Record<NotificationKind, string> = {
  commitment_reminder: 'Reminder',
  commitment_overdue: 'Recovery',
  partner_interaction: 'Partner',
  daily_checkin: 'Check-in',
  weekly_review: 'Weekly',
  ai_insight: 'Insight',
  achievement: 'Achievement',
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (isSameDay(date, new Date())) return `Today, ${formatTime(date)}`;
  return `${formatMonthDay(date)}, ${formatTime(date)}`;
}

/**
 * "All quiet" — the notifications empty state, in the same hand-drawn family
 * as the Vision screen's folder stack: concentric rings around a gently
 * swaying bell in the user's accent, with three sleeping dots drifting beside
 * it. The emptiness reads as *calm*, not missing.
 */
function QuietBellArt() {
  const colors = useColors();
  const reduced = useReducedMotion();
  const sway = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    sway.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        true,
      ),
    );
    drift.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [drift, reduced, sway]);

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sway.value * 6}deg` }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + drift.value * 0.5,
    transform: [{ translateY: -drift.value * 3 }],
  }));

  return (
    <View
      style={styles.art}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={[styles.artRingOuter, { backgroundColor: colors.surfaceSunken }]}>
        <View style={[styles.artRingMid, { backgroundColor: colors.surface }]}>
          <Animated.View style={bellStyle}>
            <Svg width={56} height={56} viewBox="0 0 24 24" fill="none">
              <Path
                d="M5.4 18.2 6.9 16v-5.4a5.1 5.1 0 0 1 10.2 0V16l1.5 2.2z"
                stroke={colors.brand}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M10 20.4a2 2 0 0 0 4 0"
                stroke={colors.brand}
                strokeWidth={1.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[styles.artDots, dotStyle]}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.artDot, { backgroundColor: colors.borderStrong, opacity: 1 - i * 0.3 }]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

/** Empty composition: the quiet bell, then two short lines. */
function NotificationsEmpty() {
  return (
    <View style={styles.emptyBlock}>
      <Reveal>
        <QuietBellArt />
      </Reveal>
      <Reveal delay={140}>
        <View style={styles.emptyText}>
          <AppText variant="title" center style={styles.emptyTitle}>
            All quiet.
          </AppText>
          <AppText variant="body" tone="secondary" center>
            Reminders and wins will land here.
          </AppText>
        </View>
      </Reveal>
    </View>
  );
}

/** Notifications center (FR-14) — bodies never leak sensitive vision details. */
export default function Notifications() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      const request = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      try {
        const list = await api.listNotifications();
        if (request !== requestId.current) return;
        setItems(list);
        setError(null);
      } catch {
        if (request === requestId.current) {
          setError('We could not load notifications. Check your connection and try again.');
        }
      } finally {
        if (request === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [api],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const open = async (n: AppNotification) => {
    setBusy(true);
    try {
      if (!n.readAt) {
        await api.markRead(n.id);
        setItems((prev) =>
          prev.map((x) =>
            x.id === n.id ? { ...x, readAt: n.readAt ?? new Date().toISOString() } : x,
          ),
        );
      }
      if (n.route) router.push(n.route as never);
    } catch {
      toast.show('Could not open that update. Try again.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await api.markAllRead();
      await load();
    } catch {
      toast.show('Could not mark everything read.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const clearRead = async () => {
    if (!items.some((n) => n.readAt)) return;
    setBusy(true);
    try {
      await api.clearRead();
      setItems((prev) => prev.filter((n) => !n.readAt));
      toast.show('Read notifications cleared.', { tone: 'success' });
    } catch {
      toast.show('Could not clear read notifications.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const unread = items.filter((n) => !n.readAt).length;
  const hasRead = items.some((n) => n.readAt);

  if (loading) {
    return (
      <Screen back="close" title="Notifications" subtitle="Updates from your run.">
        <Skeleton height={84} />
        <Skeleton height={84} />
        <Skeleton height={84} />
      </Screen>
    );
  }

  if (error && items.length === 0) {
    return (
      <Screen
        back="close"
        title="Notifications"
        subtitle="Updates from your run."
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <EmptyState
          icon="bell"
          title="We could not load notifications"
          description={error}
          actionLabel="Try again"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  if (items.length === 0) {
    return (
      <Screen
        back="close"
        title="Notifications"
        subtitle="Updates from your run."
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <NotificationsEmpty />
      </Screen>
    );
  }

  return (
    <Screen
      back="close"
      title="Notifications"
      subtitle={unread > 0 ? `${unread} unread` : 'You’re all caught up.'}
      titleAction={
        unread > 0 ? (
          <Button
            label="Mark all read"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={markAll}
            loading={busy}
          />
        ) : undefined
      }
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {error ? (
        <Card variant="muted">
          <AppText variant="bodyMedium">Could not refresh updates.</AppText>
          <AppText variant="caption" tone="secondary" style={styles.errorCopy}>
            {error}
          </AppText>
          <Button
            label="Try again"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => load()}
            style={styles.errorBtn}
          />
        </Card>
      ) : null}

      {hasRead ? (
        <View style={styles.listActions}>
          <Button
            label="Clear read"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={clearRead}
            loading={busy}
          />
        </View>
      ) : null}

      {items.map((n) => (
        <Pressable
          key={n.id}
          accessibilityRole="button"
          accessibilityLabel={`${n.readAt ? '' : 'Unread '}${KIND_LABELS[n.kind]}: ${n.title}`}
          accessibilityHint={n.route ? 'Opens the related screen' : 'Marks this update as read'}
          onPress={() => open(n)}
          disabled={busy}
        >
          {({ pressed }) => (
            <Card
              variant="outlined"
              style={[
                styles.item,
                {
                  ...(!n.readAt
                    ? { borderLeftWidth: 2, borderLeftColor: colors.textPrimary }
                    : {}),
                  ...(pressed ? { backgroundColor: colors.surfaceSunken } : {}),
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <Badge label={KIND_LABELS[n.kind]} tone={KIND_TONES[n.kind]} />
                <AppText variant="caption" tone="muted">
                  {formatWhen(n.createdAt)}
                </AppText>
              </View>
              <AppText variant="bodyBold" tone={n.readAt ? 'secondary' : 'primary'}>
                {n.title}
              </AppText>
              <AppText variant="body" tone="secondary" style={styles.itemBody}>
                {n.body}
              </AppText>
            </Card>
          )}
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  art: {
    alignSelf: 'center',
    alignItems: 'center',
  },
  artRingOuter: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artRingMid: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artDots: {
    position: 'absolute',
    right: -6,
    top: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  artDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyBlock: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.huge,
  },
  emptyText: {
    gap: spacing.sm,
  },
  emptyTitle: {
    letterSpacing: -0.5,
  },
  listActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: -spacing.sm,
  },
  item: {
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  itemBody: {
    lineHeight: 20,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 2,
  },
  errorCopy: {
    marginTop: spacing.xs,
  },
  errorBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
});

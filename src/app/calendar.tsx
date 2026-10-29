import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { friendlyErrorMessage } from '@/api/errorMessage';
import type { Commitment } from '@/core/domain';
import {
  endOfMonth,
  formatLongDate,
  formatTime,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from '@/core/dates';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { CalendarMonth } from '@/design-system/CalendarMonth';
import { Card } from '@/design-system/Card';
import { Screen } from '@/design-system/Screen';
import { Icon } from '@/design-system/icons';
import { Reveal } from '@/design-system/motion';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

function AgendaRow({
  commitment,
  onOpen,
  onComplete,
}: {
  commitment: Commitment;
  onOpen: () => void;
  onComplete: () => void;
}) {
  const colors = useColors();
  const done = commitment.state === 'completed';
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => pressed && styles.pressed}>
      <View style={styles.row}>
        <View style={styles.time}>
          <AppText variant="caption" tone="muted">
            {formatTime(commitment.dueAt)}
          </AppText>
        </View>
        <View style={styles.rowText}>
          <AppText
            variant="bodyMedium"
            tone={done ? 'muted' : 'primary'}
            style={done && styles.done}
            numberOfLines={2}
          >
            {commitment.title}
          </AppText>
          <View style={styles.meta}>
            <AppText variant="caption" tone="muted">
              {commitment.visibility === 'partner' ? 'Shared with partner' : 'Private'}
            </AppText>
            {commitment.state === 'missed' || commitment.state === 'rescheduled' ? (
              <Badge label={commitment.state} tone="streak" />
            ) : null}
          </View>
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `${commitment.title} completed` : `Complete ${commitment.title}`}
          disabled={done}
          onPress={onComplete}
          hitSlop={8}
          style={({ pressed }) => [
            styles.check,
            {
              borderColor: done ? colors.textPrimary : colors.borderStrong,
              backgroundColor: done ? colors.textPrimary : 'transparent',
            },
            pressed && !done && { backgroundColor: colors.border },
          ]}
        >
          {done ? <Icon name="check" size={15} color={colors.textInverse} /> : null}
        </Pressable>
      </View>
    </Pressable>
  );
}

/** Full calendar — the month view behind Home's short week strip. */
export default function CalendarScreen() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const today = startOfDay(new Date());
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listCommitments({
        from: startOfMonth(month).toISOString(),
        to: endOfMonth(month).toISOString(),
      });
      setCommitments(list.filter((c) => c.state !== 'cancelled'));
      setLoadError(null);
    } catch (err) {
      setLoadError(friendlyErrorMessage(err));
    }
  }, [api, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const dayCommitments = useMemo(
    () =>
      commitments
        .filter((c) => isSameDay(new Date(c.dueAt), selected))
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt)),
    [commitments, selected],
  );

  const handleSelect = (date: Date) => {
    setSelected(date);
    if (!isSameMonth(date, month)) setMonth(startOfMonth(date));
  };

  const handleMonth = (next: Date) => {
    setMonth(next);
    if (isSameMonth(next, today)) {
      setSelected(today);
      return;
    }
    // Keep the selected day where possible instead of jumping to the 1st.
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    setSelected(
      new Date(next.getFullYear(), next.getMonth(), Math.min(selected.getDate(), lastDay)),
    );
  };

  const complete = async (id: string) => {
    setBusy(true);
    try {
      await api.completeCommitment(id);
      await load();
      toast.show('Marked complete. +10 XP.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not complete that.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const done = dayCommitments.filter((c) => c.state === 'completed').length;

  return (
    <Screen
      back="push"
      eyebrow="Plan"
      title="Calendar"
      subtitle="See the shape of the month, then make one clear goal for the day."
    >
      {loadError ? (
        <Card variant="muted">
          <AppText variant="bodyBold">Couldn’t load your commitments.</AppText>
          <AppText variant="caption" tone="secondary">
            {loadError}
          </AppText>
          <Button
            label="Try again"
            variant="secondary"
            size="sm"
            onPress={() => {
              setLoadError(null);
              load();
            }}
          />
        </Card>
      ) : null}
      <Reveal>
        <CalendarMonth
          month={month}
          selected={selected}
          onSelect={handleSelect}
          onChangeMonth={handleMonth}
          eventDates={commitments.map((c) => new Date(c.dueAt))}
        />
      </Reveal>

      <Reveal delay={80}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitle}>
            <AppText variant="overline" tone="muted">
              {isSameDay(selected, today) ? 'Today' : 'Selected day'}
            </AppText>
            <AppText variant="h2">{formatLongDate(selected)}</AppText>
          </View>
          <AppText variant="caption" tone="secondary">
            {dayCommitments.length === 0
              ? 'Nothing planned'
              : `${done} of ${dayCommitments.length} done`}
          </AppText>
        </View>

        <Card variant="outlined" style={styles.agendaCard}>
          {dayCommitments.length === 0 ? (
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSunken }]}>
                <Icon name="calendar" size={20} color={colors.textSecondary} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="bodyMedium">Nothing planned</AppText>
                <AppText variant="caption" tone="secondary">
                  Leave it open, or add one commitment that moves the vision.
                </AppText>
              </View>
            </View>
          ) : (
            dayCommitments.map((c) => (
              <AgendaRow
                key={c.id}
                commitment={c}
                onOpen={() =>
                  router.push({ pathname: '/commitment/[id]', params: { id: c.id } })
                }
                onComplete={() => complete(c.id)}
              />
            ))
          )}
        </Card>
      </Reveal>

      <Button
        label="Plan a commitment"
        onPress={() =>
          router.push({
            pathname: '/commitment/new',
            params: { date: selected.toISOString() },
          })
        }
        disabled={busy}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    gap: 1,
  },
  agendaCard: {
    paddingVertical: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  time: {
    width: 48,
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  done: {
    textDecorationLine: 'line-through',
  },
  check: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

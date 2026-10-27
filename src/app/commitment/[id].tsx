import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import type { Commitment, CommitmentEvent } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { EmptyState } from '@/design-system/EmptyState';
import { Icon } from '@/design-system/icons';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { isTitle, LIMITS, sanitizeMultiline, sanitizeSingleLine, VALIDATION_COPY } from '@/core/validation';

const STATE_WORDS: Record<Commitment['state'], string> = {
  planned: 'Planned.',
  in_progress: 'Running.',
  completed: 'Done.',
  missed: 'Missed.',
  rescheduled: 'Moved.',
  cancelled: 'Cancelled.',
};

const STATE_CAPTIONS: Record<Commitment['state'], string> = {
  planned: 'Starts when you do. One action, today.',
  in_progress: 'You’re in it. Finish before the day ends.',
  completed: '+10 XP · your streak moved forward.',
  missed: 'Not a failure. Recover with a smaller step.',
  rescheduled: 'New time, same intent.',
  cancelled: 'Kept in your history, no longer active.',
};

function atHour(hour: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Commitment detail — the daily loop, staged as a status feed (ref3). */
export default function CommitmentDetail() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [events, setEvents] = useState<CommitmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Recovery form
  const [showRecovery, setShowRecovery] = useState(false);
  const [blocker, setBlocker] = useState('');
  const [replacementTitle, setReplacementTitle] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, e] = await Promise.all([api.getCommitment(id), api.listEvents(id)]);
    setCommitment(c);
    setEvents(e);
    setLoading(false);
  }, [api, id]);

  useEffect(() => {
    let active = true;
    Promise.all([api.getCommitment(id), api.listEvents(id)])
      .then(([c, e]) => {
        if (!active) return;
        setCommitment(c);
        setEvents(e);
        setLoading(false);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api, id]);

  const run = async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await action();
      await load();
      if (success) toast.show(success, { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'That did not save. Try again.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const reschedule = (dueAt: string) => run(() => api.rescheduleCommitment(id, dueAt), 'Moved.');

  const cancel = () => {
    Alert.alert('Cancel this commitment?', 'It stays in your history as cancelled.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Cancel commitment',
        style: 'destructive',
        onPress: () => run(() => api.cancelCommitment(id), 'Commitment cancelled.'),
      },
    ]);
  };

  const remove = () => {
    Alert.alert(
      'Delete this commitment permanently?',
      'It will be removed from your history, along with its event log. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete permanently',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteCommitment(id);
              toast.show('Commitment deleted.', { tone: 'success' });
              router.replace('/(tabs)');
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not delete that commitment.', {
                tone: 'error',
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const recover = async () => {
    const reason = blocker.trim();
    const nextTitle = replacementTitle.trim();
    if (!reason) {
      setRecoveryError('Say what got in the way — one honest sentence is enough.');
      return;
    }
    if (!isTitle(nextTitle)) {
      setRecoveryError(VALIDATION_COPY.title);
      return;
    }
    setRecoveryError(null);
    await run(async () => {
      await api.recoverCommitment(id, reason, {
        title: nextTitle,
        dueAt: atHour(19),
        visionId: commitment?.visionId,
      });
      setShowRecovery(false);
      setBlocker('');
      setReplacementTitle('');
    }, 'Recovery plan saved.');
  };

  if (loading) {
    return (
      <Screen back="push" title="Loading commitment…">
        <Skeleton height={180} />
      </Screen>
    );
  }

  if (!commitment) {
    return (
      <Screen back="push" title="Commitment">
        <EmptyState
          icon="compass"
          title="Commitment not found"
          actionLabel="Back home"
          onAction={() => router.replace('/(tabs)')}
        />
      </Screen>
    );
  }

  const state = commitment.state;
  const isOpen = state === 'planned' || state === 'in_progress' || state === 'rescheduled';
  const due = new Date(commitment.dueAt).toLocaleString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Screen back="push">
      <View style={styles.titleBlock}>
        <AppText variant="overline" tone="secondary">
          Commitment
        </AppText>
        <AppText variant="hero">{commitment.title}</AppText>
        <View style={styles.metaRow}>
          <AppText variant="caption" tone="secondary">
            Due {due}
          </AppText>
          {commitment.visibility === 'partner' ? (
            <AppText variant="caption" tone="secondary">
              · Shared with partner
            </AppText>
          ) : null}
        </View>
      </View>

      <Card variant="dark">
        <AppText variant="display" tone="inverse" style={styles.stateWord}>
          {STATE_WORDS[state]}
        </AppText>
        <AppText variant="caption" tone="inverse" style={styles.stateCaption}>
          {STATE_CAPTIONS[state]}
        </AppText>
        {commitment.note ? (
          <View style={styles.noteWell}>
            <AppText variant="body" tone="inverse">
              {commitment.note}
            </AppText>
          </View>
        ) : null}
      </Card>

      {isOpen ? (
        <View style={styles.actions}>
          <Button
            label="Mark complete"
            onPress={() => run(() => api.completeCommitment(id), 'Logged. +10 XP.')}
            loading={busy}
          />
          {state !== 'in_progress' ? (
            <Button
              label="Start now"
              variant="secondary"
              onPress={() => run(() => api.startCommitment(id), 'Running. One step at a time.')}
              loading={busy}
            />
          ) : null}
          <Button
            label="I missed it — recover"
            variant="muted"
            onPress={() => setShowRecovery((s) => !s)}
            disabled={busy}
          />
        </View>
      ) : null}

      {showRecovery ? (
        <Card variant="muted">
          <AppText variant="h2">Let’s reset.</AppText>
          <AppText variant="body" tone="secondary" style={styles.copy}>
            Missing one commitment doesn’t erase your progress. What got in the way — and
            what’s the smaller next move?
          </AppText>
          <Input
            label="What got in the way?"
            placeholder="e.g. I got home late and ran out of energy"
            value={blocker}
            onChangeText={(value) => {
              setBlocker(sanitizeMultiline(value, LIMITS.mediumText));
              if (recoveryError) setRecoveryError(null);
            }}
            maxLength={LIMITS.mediumText}
            multiline
            textAlignVertical="top"
            containerStyle={styles.recoveryGap}
          />
          <Input
            label="Replacement commitment"
            placeholder="e.g. Watch one 15-minute lesson before breakfast"
            value={replacementTitle}
            onChangeText={(value) => {
              setReplacementTitle(sanitizeSingleLine(value));
              if (recoveryError) setRecoveryError(null);
            }}
            maxLength={LIMITS.titleMax}
            returnKeyType="done"
            error={recoveryError ?? undefined}
          />
          <Button
            label="Save recovery plan"
            onPress={recover}
            loading={busy}
            disabled={busy}
            style={styles.recoveryGap}
          />
        </Card>
      ) : null}

      {isOpen ? (
        <View>
          <AppText variant="overline" tone="secondary" style={styles.sectionLabel}>
            Move it
          </AppText>
          <View style={styles.chipRow}>
            <Chip label="This evening" onPress={() => reschedule(atHour(19))} disabled={busy} />
            <Chip label="Tomorrow AM" onPress={() => reschedule(atHour(9, 1))} disabled={busy} />
            <Chip label="Tomorrow PM" onPress={() => reschedule(atHour(14, 1))} disabled={busy} />
          </View>
          <Button
            label="Cancel commitment"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={cancel}
            disabled={busy}
            style={styles.cancelBtn}
          />
        </View>
      ) : null}

      {state === 'completed' ? (
        <Card variant="outlined">
          <View style={styles.completedRow}>
            <View style={[styles.checkCircle, { backgroundColor: colors.textPrimary }]}>
              <Icon name="check" size={16} color={colors.textInverse} />
            </View>
            <View style={styles.completedText}>
              <AppText variant="bodyBold">Logged and counted.</AppText>
              {commitment.completedAt ? (
                <AppText variant="caption" tone="secondary">
                  Completed {new Date(commitment.completedAt).toLocaleString()}
                </AppText>
              ) : null}
            </View>
          </View>
          {commitment.visionId ? (
            <Button
              label="Back to vision"
              variant="muted"
              size="sm"
              fullWidth={false}
              onPress={() =>
                router.replace({ pathname: '/vision/[id]', params: { id: commitment.visionId! } })
              }
              style={styles.recoveryGap}
            />
          ) : null}
        </Card>
      ) : null}

      {state === 'missed' ? (
        <Card variant="muted">
          <AppText variant="bodyBold">
            {commitment.recoveryCommitmentId
              ? 'Recovered — a replacement commitment is now running.'
              : 'It happens. Start a recovery commitment when you’re ready.'}
          </AppText>
          {!commitment.recoveryCommitmentId ? (
            <Button
              label="Start recovery"
              onPress={() => setShowRecovery(true)}
              disabled={busy}
              style={styles.recoveryGap}
            />
          ) : null}
        </Card>
      ) : null}

      {state === 'cancelled' ? (
        <Card variant="muted">
          <AppText variant="bodyBold">Removed from your active plan.</AppText>
          <AppText variant="caption" tone="secondary" style={styles.copy}>
            It stays in your history so your record is honest. Delete it permanently only if you
            never want to see it again.
          </AppText>
          <Button
            label="Delete permanently"
            variant="ghost"
            size="sm"
            onPress={remove}
            disabled={busy}
            style={styles.recoveryGap}
          />
        </Card>
      ) : null}

      {events.length > 0 ? (
        <Card variant="outlined">
          <AppText variant="h3" style={styles.sectionTitle}>
            History
          </AppText>
          <View>
            {events.map((e, i) => (
              <View key={e.id} style={styles.eventRow}>
                <View style={styles.rail}>
                  <View style={[styles.eventDot, { backgroundColor: colors.textSecondary }]} />
                  {i < events.length - 1 ? (
                    <View style={[styles.eventLine, { backgroundColor: colors.border }]} />
                  ) : null}
                </View>
                <View style={[styles.eventText, i < events.length - 1 && styles.eventSpacing]}>
                  <AppText variant="bodyMedium">
                    {e.from ? `${e.from} → ${e.to}` : `created → ${e.to}`}
                    {e.note ? ` — ${e.note}` : ''}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {new Date(e.at).toLocaleString()}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleBlock: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  stateWord: {
    marginBottom: spacing.xs,
  },
  stateCaption: {
    opacity: 0.72,
  },
  noteWell: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actions: {
    gap: spacing.sm,
  },
  copy: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cancelBtn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  recoveryGap: {
    marginTop: spacing.md,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedText: {
    flex: 1,
    gap: 2,
  },
  eventRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  rail: {
    width: 8,
    alignItems: 'center',
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  eventLine: {
    flex: 1,
    width: 1,
    marginTop: 4,
  },
  eventText: {
    flex: 1,
    gap: 2,
  },
  eventSpacing: {
    paddingBottom: spacing.lg,
  },
});

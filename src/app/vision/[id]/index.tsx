import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { friendlyErrorMessage } from '@/api/errorMessage';
import type { Goal, Milestone, Vision } from '@/core/domain';
import { BrandMark } from '@/design-system/BrandMark';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { useConfirm } from '@/design-system/confirm';
import { Icon } from '@/design-system/icons';
import { PopIn, Reveal } from '@/design-system/motion';
import { ProgressBar } from '@/design-system/ProgressBar';
import { ProgressRing } from '@/design-system/ProgressRing';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

interface GoalWithMilestones {
  goal: Goal;
  milestones: Milestone[];
}

const CATEGORY_LABELS: Record<string, string> = {
  career: 'Career',
  education: 'Education',
  health: 'Health',
  finance: 'Finance',
  creativity: 'Creativity',
  relationships: 'Relationships',
  faith: 'Faith',
  business: 'Business',
  other: 'Other',
};

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <AppText variant="overline" tone="inverse" style={styles.metaLabel}>
        {label}
      </AppText>
      <AppText variant="bodyMedium" tone="inverse" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function MilestoneRow({
  milestone,
  last,
  busy,
  onComplete,
}: {
  milestone: Milestone;
  last: boolean;
  busy: boolean;
  onComplete: (id: string) => void;
}) {
  const colors = useColors();
  const done = milestone.status === 'completed';

  return (
    <Pressable
      disabled={done || busy}
      onPress={() => onComplete(milestone.id)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityHint={done ? 'Already complete' : 'Marks this milestone complete'}
      style={({ pressed }) => [styles.msRow, pressed && !done && styles.msPressed]}
    >
      <View style={styles.msRail}>
        <View
          style={[
            styles.check,
            {
              borderColor: done ? colors.textPrimary : colors.borderStrong,
              backgroundColor: done ? colors.textPrimary : 'transparent',
            },
          ]}
        >
          {done ? (
            <PopIn trigger>
              <Icon name="check" size={13} color={colors.textInverse} />
            </PopIn>
          ) : null}
        </View>
        {!last ? (
          <View
            style={[
              styles.msLine,
              { backgroundColor: done ? colors.textPrimary : colors.border },
            ]}
          />
        ) : null}
      </View>
      <View style={styles.msText}>
        <AppText
          variant="bodyMedium"
          tone={done ? 'muted' : 'primary'}
          style={done ? styles.doneText : undefined}
        >
          {milestone.title}
        </AppText>
        {milestone.description ? (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {milestone.description}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Vision detail — the future, its reason, and the ladder of milestones. */
export default function VisionDetail() {
  const api = useApi();
  const confirm = useConfirm();
  const colors = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [vision, setVision] = useState<Vision | null>(null);
  const [goals, setGoals] = useState<GoalWithMilestones[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [v, g] = await Promise.all([api.getVision(id), api.listGoals(id)]);
      const withMilestones = await Promise.all(
        g.map(async (goal) => ({ goal, milestones: await api.listMilestones(goal.id) })),
      );
      setVision(v);
      setGoals(withMilestones);
      setLoadError(null);
    } catch (err) {
      setLoadError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  const retryLoad = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    void load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [v, g] = await Promise.all([api.getVision(id), api.listGoals(id)]);
        const withMilestones = await Promise.all(
          g.map(async (goal) => ({ goal, milestones: await api.listMilestones(goal.id) })),
        );
        if (!mounted) return;
        setVision(v);
        setGoals(withMilestones);
        setLoadError(null);
      } catch (err) {
        if (mounted) setLoadError(friendlyErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [api, id]);

  const completeMilestone = async (milestoneId: string) => {
    setBusy(true);
    try {
      await api.completeMilestone(milestoneId);
      await load();
      toast.show('Milestone complete.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not complete that milestone.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const archive = () => {
    confirm('Archive this vision?', 'It stays in your history. You can restore it later.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.setVisionStatus(id, 'archived');
            toast.show('Vision archived.', { tone: 'success' });
            router.replace('/(tabs)/vision');
          } catch (e) {
            toast.show(e instanceof Error ? e.message : 'Could not archive this vision.', {
              tone: 'error',
            });
          }
        },
      },
    ]);
  };

  const restore = async () => {
    setBusy(true);
    try {
      await api.setVisionStatus(id, 'active');
      await load();
      toast.show('Vision restored.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not restore this vision.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const removeGoal = (goal: Goal) => {
    confirm(
      'Delete this goal?',
      `“${goal.title}” and its milestones will be removed. This cannot be undone.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete goal',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.removeGoal(goal.id);
              await load();
              toast.show('Goal deleted.', { tone: 'success' });
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not delete that goal.', {
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

  const removeVision = () => {
    confirm(
      'Delete this vision permanently?',
      'Its goals, milestones and discovery answers will be deleted. Commitments stay in your history but lose their link to this vision. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete vision',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteVision(id);
              toast.show('Vision deleted.', { tone: 'success' });
              router.replace('/(tabs)/vision');
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not delete this vision.', {
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

  if (loading) {
    return (
      <Screen back="push">
        <View style={styles.loading}>
          <Skeleton height={56} />
          <Skeleton height={240} />
          <Skeleton height={170} />
          <Skeleton height={170} />
        </View>
      </Screen>
    );
  }

  if (!vision) {
    return (
      <Screen back="push" title="Vision">
        <Card variant="muted" style={styles.missing}>
          <AppText variant="h3">
            {loadError ? "Couldn’t load this vision." : 'Vision not found.'}
          </AppText>
          {loadError ? <AppText variant="caption" tone="secondary">{loadError}</AppText> : null}
          {loadError ? (
            <Button
              label="Try again"
              variant="secondary"
              size="sm"
              onPress={retryLoad}
              style={styles.missingBtn}
            />
          ) : (
            <Button
              label="Back to visions"
              variant="secondary"
              size="sm"
              onPress={() => router.replace('/(tabs)/vision')}
              style={styles.missingBtn}
            />
          )}
        </Card>
      </Screen>
    );
  }

  const hasPlan = goals.length > 0;
  const allMilestones = goals.flatMap((g) => g.milestones);
  const doneMilestones = allMilestones.filter((m) => m.status === 'completed').length;

  return (
    <Screen back="push">
      <View style={styles.head}>
        <AppText variant="overline" tone="muted">
          {CATEGORY_LABELS[vision.category] ?? vision.category} · {vision.status}
        </AppText>
        <AppText variant="hero">{vision.title}</AppText>
      </View>

      <Reveal>
        <Card variant="dark" padded={false} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <AppText variant="overline" tone="inverse" style={styles.dim}>
                Why it matters
              </AppText>
              <AppText variant="body" tone="inverse" style={styles.why}>
                {vision.whyItMatters ? `“${vision.whyItMatters}”` : vision.description}
              </AppText>
            </View>
            <ProgressRing
              progress={vision.progressPercent / 100}
              size={88}
              strokeWidth={6}
              tone="dark"
            />
          </View>

          <View style={styles.heroMeta}>
            <Meta
              label="Priority"
              value={vision.priority.charAt(0).toUpperCase() + vision.priority.slice(1)}
            />
            <Meta label="Target" value={vision.targetTimeframe ?? 'Open-ended'} />
            <Meta
              label="Milestones"
              value={hasPlan ? `${doneMilestones}/${allMilestones.length}` : '—'}
            />
          </View>
        </Card>
      </Reveal>

      <View style={styles.sectionHead}>
        <AppText variant="overline" tone="muted">
          The roadmap
        </AppText>
        {hasPlan ? (
          <AppText variant="caption" tone="muted">
            {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
          </AppText>
        ) : null}
      </View>

      {!hasPlan ? (
        <Reveal delay={80}>
          <Card variant="outlined" style={styles.noPlan}>
            <BrandMark size={46} />
            <AppText variant="h2">No roadmap yet.</AppText>
            <AppText variant="body" tone="secondary" center>
              Answer a few questions and the AI will build goals and milestones around your life.
            </AppText>
            <Button
              label="Build my roadmap"
              onPress={() =>
                router.push({ pathname: '/vision/[id]/discovery', params: { id: vision.id } })
              }
              style={styles.noPlanBtn}
            />
          </Card>
        </Reveal>
      ) : (
        goals.map(({ goal, milestones }, index) => (
          <Reveal key={goal.id} delay={80 + index * 60}>
            <Card variant="outlined" style={styles.goalCard}>
              <View style={styles.goalTop}>
                <View style={[styles.goalIndex, { borderColor: colors.borderStrong }]}>
                  <AppText style={styles.goalIndexText}>{twoDigits(index + 1)}</AppText>
                </View>
                <View style={styles.goalText}>
                  <AppText variant="h3">{goal.title}</AppText>
                  {goal.description ? (
                    <AppText variant="caption" tone="secondary" numberOfLines={2}>
                      {goal.description}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.goalActions}>
                  <AppText variant="overline" tone="muted">
                    {goal.progressPercent}%
                  </AppText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete goal ${goal.title}`}
                    disabled={busy}
                    hitSlop={8}
                    onPress={() => removeGoal(goal)}
                    style={({ pressed }) => [styles.goalDelete, pressed && styles.msPressed]}
                  >
                    <Icon name="trash" size={15} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              <ProgressBar
                progress={goal.progressPercent / 100}
                tone="brand"
                height={3}
                style={styles.goalBar}
              />

              {milestones.length > 0 ? (
                <View style={styles.milestones}>
                  {milestones.map((milestone, milestoneIndex) => (
                    <MilestoneRow
                      key={milestone.id}
                      milestone={milestone}
                      last={milestoneIndex === milestones.length - 1}
                      busy={busy}
                      onComplete={completeMilestone}
                    />
                  ))}
                </View>
              ) : (
                <AppText variant="caption" tone="muted" style={styles.emptyMilestones}>
                  No milestones yet.
                </AppText>
              )}
            </Card>
          </Reveal>
        ))
      )}

      <Reveal delay={220}>
        <View style={styles.actions}>
          {hasPlan ? (
            <Button
              label="Refine with AI"
              leftIcon={<Icon name="sparkles" size={17} color={colors.textInverse} />}
              onPress={() =>
                router.push({ pathname: '/vision/[id]/roadmap', params: { id: vision.id } })
              }
            />
          ) : null}
          {vision.status === 'active' ? (
            <Button label="Archive vision" variant="ghost" onPress={archive} />
          ) : (
            <Button
              label={vision.status === 'archived' ? 'Restore vision' : 'Reopen vision'}
              variant="ghost"
              onPress={restore}
              loading={busy}
            />
          )}
          <Button
            label="Delete vision permanently"
            variant="ghost"
            onPress={removeVision}
            disabled={busy}
          />
        </View>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: spacing.lg,
  },
  missing: {
    gap: spacing.md,
  },
  missingBtn: {
    alignSelf: 'flex-start',
  },
  head: {
    gap: spacing.sm,
  },
  hero: {
    padding: spacing.xxl,
    gap: spacing.xl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  dim: {
    opacity: 0.6,
  },
  why: {
    lineHeight: 24,
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingTop: spacing.lg,
  },
  metaItem: {
    flex: 1,
    gap: 3,
  },
  metaLabel: {
    opacity: 0.55,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  noPlan: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  noPlanBtn: {
    marginTop: spacing.sm,
    alignSelf: 'stretch',
  },
  goalCard: {
    gap: spacing.md,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  goalActions: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  goalDelete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIndex: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  goalIndexText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.4,
  },
  goalText: {
    flex: 1,
    gap: 2,
  },
  goalBar: {
    marginTop: -spacing.xs,
  },
  milestones: {
    gap: spacing.sm,
  },
  msRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    borderRadius: 12,
  },
  msPressed: {
    opacity: 0.6,
  },
  msRail: {
    width: 24,
    alignItems: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  msLine: {
    width: 1,
    flex: 1,
    minHeight: 10,
    marginTop: 4,
  },
  msText: {
    flex: 1,
    gap: 2,
    paddingBottom: spacing.sm,
  },
  doneText: {
    textDecorationLine: 'line-through',
  },
  emptyMilestones: {
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});

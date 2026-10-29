import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import type { GeneratedRoadmap } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { useConfirm } from '@/design-system/confirm';
import { Icon } from '@/design-system/icons';
import { Input } from '@/design-system/Input';
import { Reveal, useReducedMotion } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Roadmap screen — the plan's workbench.
 *
 * • First visit (no saved plan): a reassuring staged build
 *   ("Understanding your vision → Mapping milestones → Building your roadmap")
 *   with a gentle pulse and an honest ETA; a 45s timeout swaps to a retry card.
 * • Later visits load the saved plan — no AI call — and offer:
 *   – Refine with AI: a prompt box ("What should change?"); submitting
 *     regenerates the plan from that note, with the same staged loading, and
 *     keeps the previous version one Undo away.
 *   – Manual edits: add / edit / remove / reorder goals and milestones right
 *     here; Save writes the working plan back (completed goals are preserved
 *     by the backend).
 */

const STAGES = [
  'Understanding your vision',
  'Mapping your milestones',
  'Building your roadmap',
] as const;

const GENERATE_TIMEOUT_MS = 45_000;

type GoalDraft = GeneratedRoadmap['goals'][number];
type MilestoneDraft = GoalDraft['milestones'][number];

/** Reject after `ms` so a hung AI call degrades into a retry, not a spinner. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const clonePlan = (plan: GeneratedRoadmap): GeneratedRoadmap =>
  JSON.parse(JSON.stringify(plan)) as GeneratedRoadmap;

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function twoDigits(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * An illustrated route build. The path fills node by node, the active node
 * breathes, and the copy stays honest about the wait instead of promising a
 * fixed time.
 */
function RoadmapBuilding({ title }: { title: string }) {
  const colors = useColors();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 10_000),
      setTimeout(() => setStage(2), 25_000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (reduced) return;
    pulse.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.24, 0] });
  const captions = [
    'Sketching the route from where you are today.',
    'Placing milestones around your real week.',
    'Still working. Complex plans take a little longer.',
  ];

  return (
    <View style={styles.building}>
      <Card variant="outlined" style={styles.routeCard}>
        <View
          style={styles.routeArt}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <View key={label} style={styles.routeRow}>
                <View style={styles.routeNodeCol}>
                  <View style={styles.nodeWrap}>
                    {active ? (
                      <Animated.View
                        style={[
                          styles.nodeHalo,
                          {
                            backgroundColor: colors.brand,
                            opacity: haloOpacity,
                            transform: [{ scale: haloScale }],
                          },
                        ]}
                      />
                    ) : null}
                    <View
                      style={[
                        styles.node,
                        {
                          backgroundColor: done || active ? colors.brand : colors.surface,
                          borderColor: done || active ? colors.brand : colors.borderStrong,
                        },
                      ]}
                    >
                      {done ? (
                        <Icon name="check" size={12} color={colors.textInverse} />
                      ) : active ? (
                        <Icon name="sparkles" size={12} color={colors.textInverse} />
                      ) : null}
                    </View>
                  </View>
                  {i < STAGES.length - 1 ? (
                    <View
                      style={[
                        styles.routeLine,
                        {
                          backgroundColor: done ? colors.brand : colors.borderStrong,
                        },
                      ]}
                    />
                  ) : null}
                </View>
                <AppText
                  variant={done || active ? 'bodyMedium' : 'body'}
                  tone={done || active ? 'primary' : 'muted'}
                  style={styles.routeLabel}
                >
                  {label}
                </AppText>
              </View>
            );
          })}
          <View style={styles.flagRow}>
            <View
              style={[
                styles.flag,
                {
                  borderColor: stage === STAGES.length - 1 ? colors.brand : colors.borderStrong,
                },
              ]}
            >
              <Icon
                name="flag"
                size={15}
                color={stage === STAGES.length - 1 ? colors.brand : colors.textMuted}
              />
            </View>
            <AppText variant="caption" tone="muted">
              Ready to run
            </AppText>
          </View>
        </View>
      </Card>

      <View style={styles.buildCopy}>
        <AppText variant="h3" center>
          {title}
        </AppText>
        <AppText
          variant="body"
          tone="secondary"
          center
          style={styles.buildCaption}
          accessibilityLiveRegion="polite"
        >
          {captions[stage]}
        </AppText>
        <AppText variant="caption" tone="muted" center>
          You can edit everything before saving.
        </AppText>
      </View>
    </View>
  );
}

/** Step 3 — the roadmap workbench: build, refine, edit, save. */
export default function RoadmapWorkbench() {
  const api = useApi();
  const confirm = useConfirm();
  const colors = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [plan, setPlan] = useState<GeneratedRoadmap | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'timeout' | 'error'>('loading');
  const [loadingTitle, setLoadingTitle] = useState('Building your roadmap');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<GeneratedRoadmap[]>([]);
  const [refineText, setRefineText] = useState('');
  const [busy, setBusy] = useState(false);
  // Which async op produced the current loading phase (drives retry).
  const lastOp = useRef<'generate' | 'rebuild' | 'refine'>('generate');
  // Inline editors: goal index, or `${goal}:${milestone}`.
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<string | null>(null);

  // ---------- loading ----------
  const generate = useCallback(
    async (op: 'generate' | 'rebuild') => {
      lastOp.current = op;
      setLoadingTitle(op === 'rebuild' ? 'Rebuilding your roadmap' : 'Building your roadmap');
      setPhase('loading');
      setErrorMessage(null);
      try {
        const next = await withTimeout(
          op === 'rebuild' ? api.regenerateRoadmap(id) : api.generateRoadmap(id),
          GENERATE_TIMEOUT_MS,
        );
        setPlan(next);
        setPhase('ready');
      } catch (e) {
        if (e instanceof Error && e.message === 'timeout') {
          setPhase('timeout');
        } else {
          setErrorMessage(e instanceof Error ? e.message : 'Could not generate a roadmap.');
          setPhase('error');
        }
      }
    },
    [api, id],
  );

  // Boot: show the saved plan if one exists (no AI call); otherwise build it.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const goals = await api.listGoals(id);
        if (!alive) return;
        if (goals.length > 0) {
          const milestones = await Promise.all(goals.map((g) => api.listMilestones(g.id)));
          if (!alive) return;
          setPlan({
            goals: goals.map((g, i) => ({
              title: g.title,
              description: g.description,
              milestones: milestones[i].map((m) => ({
                title: m.title,
                description: m.description,
                timeframe: m.targetDate,
              })),
            })),
            firstActions: [],
          });
          setPhase('ready');
          return;
        }
      } catch {
        // Fall through to generation; its own error handling applies.
      }
      if (alive) void generate('generate');
    })();
    return () => {
      alive = false;
    };
  }, [api, id, generate]);

  const retry = () => {
    if (lastOp.current === 'refine' && refineText.trim()) void runRefine();
    else void generate(lastOp.current === 'rebuild' ? 'rebuild' : 'generate');
  };

  // ---------- refine with AI ----------
  const runRefine = async () => {
    const message = refineText.trim();
    if (!message || busy) return;
    lastOp.current = 'refine';
    setLoadingTitle('Rebuilding from your note');
    setBusy(true);
    setPhase('loading');
    setErrorMessage(null);
    try {
      const next = await withTimeout(
        api.requestPlanAdjustment(id, message),
        GENERATE_TIMEOUT_MS,
      );
      setUndoStack((stack) => (plan ? [...stack, plan] : stack));
      setPlan(next);
      setPhase('ready');
      setRefineText('');
      toast.show('Roadmap rebuilt from your note.', { tone: 'success' });
    } catch (e) {
      if (e instanceof Error && e.message === 'timeout') {
        setPhase('timeout');
      } else {
        setErrorMessage(e instanceof Error ? e.message : 'Could not rebuild the roadmap.');
        setPhase('error');
      }
    } finally {
      setBusy(false);
    }
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setPlan(previous);
    toast.show('Restored the previous roadmap.');
  };

  // ---------- manual edits (working copy) ----------
  const mutate = (fn: (draft: GeneratedRoadmap) => void) => {
    setPlan((current) => {
      if (!current) return current;
      const draft = clonePlan(current);
      fn(draft);
      return draft;
    });
  };

  const setGoalField = (gi: number, field: 'title' | 'description', value: string) =>
    mutate((d) => {
      d.goals[gi][field] = value;
    });

  const setMilestoneField = (
    gi: number,
    mi: number,
    field: 'title' | 'timeframe',
    value: string,
  ) =>
    mutate((d) => {
      (d.goals[gi].milestones[mi] as MilestoneDraft)[field] = value;
    });

  const moveGoal = (gi: number, direction: -1 | 1) => {
    const to = gi + direction;
    if (!plan || to < 0 || to >= plan.goals.length) return;
    mutate((d) => {
      d.goals = move(d.goals, gi, to);
    });
    // Keep the open editor attached to the goal it belongs to.
    if (editingGoal === gi) setEditingGoal(to);
    else if (editingGoal === to) setEditingGoal(gi);
  };

  const moveMilestone = (gi: number, mi: number, direction: -1 | 1) => {
    const to = mi + direction;
    if (!plan || to < 0 || to >= plan.goals[gi].milestones.length) return;
    mutate((d) => {
      d.goals[gi].milestones = move(d.goals[gi].milestones, mi, to);
    });
    // Reordering under an open editor would point it at the wrong row.
    if (editingMilestone === `${gi}:${mi}`) setEditingMilestone(null);
  };

  const removeGoal = (gi: number) => {
    const goal = plan?.goals[gi];
    confirm('Remove this goal?', `“${goal?.title.trim() || 'Untitled goal'}” leaves the plan.`, [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          mutate((d) => {
            d.goals.splice(gi, 1);
          });
          setEditingGoal(null);
        },
      },
    ]);
  };

  const removeMilestone = (gi: number, mi: number) =>
    mutate((d) => {
      d.goals[gi].milestones.splice(mi, 1);
    });

  const addGoal = () => {
    mutate((d) => {
      d.goals.push({ title: '', description: '', milestones: [] });
    });
    setEditingGoal((plan?.goals.length ?? 0));
  };

  const addMilestone = (gi: number) => {
    // The new row lands at the current length — capture it before the push.
    const newIndex = plan?.goals[gi]?.milestones.length ?? 0;
    mutate((d) => {
      d.goals[gi].milestones.push({ title: '', description: '' });
    });
    setEditingMilestone(`${gi}:${newIndex}`);
  };

  // ---------- save ----------
  const save = async () => {
    if (!plan || busy) return;
    const cleaned: GeneratedRoadmap = {
      firstActions: plan.firstActions,
      goals: plan.goals
        .filter((g) => g.title.trim().length > 0)
        .map((g) => ({
          title: g.title.trim(),
          description: g.description.trim(),
          milestones: g.milestones
            .filter((m) => m.title.trim().length > 0)
            .map((m) => ({
              title: m.title.trim(),
              description: m.description.trim(),
              timeframe: m.timeframe,
            })),
        })),
    };
    if (cleaned.goals.length === 0) {
      toast.show('Give at least one goal a title before saving.', { tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await api.saveRoadmap(id, cleaned);
      toast.show('Roadmap saved.', { tone: 'success' });
      router.replace({ pathname: '/vision/[id]', params: { id } });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save the roadmap.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  // ---------- render ----------
  if (phase === 'loading' || (phase === 'ready' && !plan)) {
    return (
      <Screen avoidKeyboard back="push" eyebrow="The plan" title={`${loadingTitle}.`}>
        <RoadmapBuilding title={loadingTitle} />
      </Screen>
    );
  }

  if (phase === 'timeout') {
    return (
      <Screen avoidKeyboard back="push" eyebrow="The plan" title="This is taking longer than usual.">
        <Card variant="muted" style={styles.stateCard}>
          <AppText variant="body" tone="secondary">
            The coach is still working on it. Slow connections can stall the request. Your
            answers and vision are safe, so try again whenever you like.
          </AppText>
          <Button label="Try again" onPress={retry} style={styles.stateBtn} />
          <Button
            label="Back to the vision"
            variant="ghost"
            onPress={() => router.replace({ pathname: '/vision/[id]', params: { id } })}
          />
        </Card>
      </Screen>
    );
  }

  if (phase === 'error' || !plan) {
    return (
      <Screen avoidKeyboard back="push" eyebrow="The plan" title="Roadmap unavailable.">
        <Card variant="muted" style={styles.stateCard}>
          <AppText variant="body" tone="secondary">
            {errorMessage ?? 'Something went wrong while building your plan.'}
          </AppText>
          <Button label="Try again" onPress={retry} style={styles.stateBtn} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      avoidKeyboard
      back="push"
      eyebrow="The plan"
      title="Your roadmap."
      subtitle="Refine it with the coach or edit it by hand. Nothing is saved until you tap Save."
      footer={
        <View style={styles.footer}>
          <Button label="Save this roadmap" onPress={save} loading={busy} />
        </View>
      }
    >
      {plan.firstActions.length > 0 ? (
        <Reveal>
          <Card variant="dark" padded={false} style={styles.startCard}>
            <AppText variant="overline" tone="inverse" style={styles.startLabel}>
              Start today
            </AppText>
            {plan.firstActions.map((action, index) => (
              <View key={index} style={styles.startRow}>
                <View style={styles.startIndex}>
                  <AppText style={styles.startIndexText}>{index + 1}</AppText>
                </View>
                <AppText variant="body" tone="inverse" style={styles.startText}>
                  {action}
                </AppText>
              </View>
            ))}
          </Card>
        </Reveal>
      ) : null}

      {/* Refine with AI */}
      <Reveal delay={60}>
        <Card variant="outlined" style={styles.refineCard}>
          <AppText variant="overline" tone="muted">
            Refine with AI
          </AppText>
          <Input
            placeholder="What should change? e.g. Make it gentler, add a money goal…"
            value={refineText}
            onChangeText={setRefineText}
            multiline
            textAlignVertical="top"
            style={styles.refineInput}
          />
          <Button
            label="Regenerate with AI"
            onPress={runRefine}
            loading={busy}
            disabled={busy || refineText.trim().length === 0}
            leftIcon={<Icon name="sparkles" size={16} color={colors.textInverse} />}
          />
          <View style={styles.refineRow}>
            {undoStack.length > 0 ? (
              <Button
                label={`Undo last AI change${undoStack.length > 1 ? ` (${undoStack.length})` : ''}`}
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={undo}
                disabled={busy}
                leftIcon={<Icon name="refresh" size={15} color={colors.textPrimary} />}
              />
            ) : null}
            <Button
              label="Rebuild from scratch"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={() => void generate('rebuild')}
              disabled={busy}
            />
          </View>
        </Card>
      </Reveal>

      <View style={styles.sectionHead}>
        <AppText variant="overline" tone="muted">
          The path
        </AppText>
        <AppText variant="caption" tone="muted">
          {plan.goals.length} {plan.goals.length === 1 ? 'goal' : 'goals'}
        </AppText>
      </View>

      {plan.goals.map((goal, gi) => {
        const editingThisGoal = editingGoal === gi;
        return (
          <Reveal key={`goal-${gi}`} delay={70 + gi * 60}>
            <Card variant="outlined" style={styles.goalCard}>
              <View style={styles.goalTop}>
                <View style={[styles.goalIndex, { borderColor: colors.borderStrong }]}>
                  <AppText style={styles.goalIndexText}>{twoDigits(gi + 1)}</AppText>
                </View>

                {editingThisGoal ? (
                  <View style={styles.goalEdit}>
                    <Input
                      placeholder="Goal title"
                      value={goal.title}
                      onChangeText={(v) => setGoalField(gi, 'title', v)}
                      autoFocus
                    />
                    <Input
                      placeholder="What does success look like?"
                      value={goal.description}
                      onChangeText={(v) => setGoalField(gi, 'description', v)}
                      multiline
                      textAlignVertical="top"
                      style={styles.goalEditDesc}
                    />
                    <Button
                      label="Done"
                      variant="secondary"
                      size="sm"
                      fullWidth={false}
                      onPress={() => setEditingGoal(null)}
                    />
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setEditingGoal(gi)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit goal ${goal.title || 'untitled'}`}
                    style={styles.goalText}
                  >
                    <AppText variant="h3">{goal.title || 'Untitled goal. Tap to name it.'}</AppText>
                    {goal.description ? (
                      <AppText variant="caption" tone="secondary" numberOfLines={2}>
                        {goal.description}
                      </AppText>
                    ) : null}
                  </Pressable>
                )}

                <View style={styles.goalActions}>
                  <IconBtn
                    label="Move goal up"
                    icon="chevronUp"
                    disabled={gi === 0}
                    onPress={() => moveGoal(gi, -1)}
                  />
                  <IconBtn
                    label="Move goal down"
                    icon="chevronDown"
                    disabled={gi === plan.goals.length - 1}
                    onPress={() => moveGoal(gi, 1)}
                  />
                  <IconBtn
                    label="Edit goal"
                    icon="pencil"
                    onPress={() => setEditingGoal(editingThisGoal ? null : gi)}
                  />
                  <IconBtn label="Remove goal" icon="trash" onPress={() => removeGoal(gi)} />
                </View>
              </View>

              <View style={styles.milestones}>
                {goal.milestones.map((milestone, mi) => {
                  const key = `${gi}:${mi}`;
                  const editingThis = editingMilestone === key;
                  return (
                    <View key={`ms-${key}`} style={styles.msRow}>
                      <View style={[styles.msDot, { backgroundColor: colors.borderStrong }]} />
                      {editingThis ? (
                        <View style={styles.msEdit}>
                          <Input
                            placeholder="Milestone title"
                            value={milestone.title}
                            onChangeText={(v) => setMilestoneField(gi, mi, 'title', v)}
                            autoFocus
                          />
                          <Input
                            placeholder="Timeframe (optional), e.g. Week 1"
                            value={milestone.timeframe ?? ''}
                            onChangeText={(v) => setMilestoneField(gi, mi, 'timeframe', v)}
                          />
                          <Button
                            label="Done"
                            variant="secondary"
                            size="sm"
                            fullWidth={false}
                            onPress={() => setEditingMilestone(null)}
                          />
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setEditingMilestone(key)}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit milestone ${milestone.title || 'untitled'}`}
                          style={styles.msText}
                        >
                          <AppText variant="bodyMedium">
                            {milestone.title || 'Untitled milestone. Tap to name it.'}
                          </AppText>
                          {milestone.timeframe ? (
                            <AppText variant="overline" tone="muted">
                              {milestone.timeframe}
                            </AppText>
                          ) : null}
                        </Pressable>
                      )}
                      <View style={styles.msActions}>
                        <IconBtn
                          label="Move milestone up"
                          icon="chevronUp"
                          disabled={mi === 0}
                          hitSlop={4}
                          onPress={() => moveMilestone(gi, mi, -1)}
                        />
                        <IconBtn
                          label="Move milestone down"
                          icon="chevronDown"
                          disabled={mi === goal.milestones.length - 1}
                          hitSlop={4}
                          onPress={() => moveMilestone(gi, mi, 1)}
                        />
                        <IconBtn
                          label="Remove milestone"
                          icon="trash"
                          hitSlop={4}
                          onPress={() => removeMilestone(gi, mi)}
                        />
                      </View>
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => addMilestone(gi)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add a milestone to ${goal.title || 'this goal'}`}
                  style={({ pressed }) => [styles.addRow, pressed && styles.addPressed]}
                >
                  <Icon name="plus" size={15} color={colors.brand} />
                  <AppText variant="caption" style={{ color: colors.brand }}>
                    Add milestone
                  </AppText>
                </Pressable>
              </View>
            </Card>
          </Reveal>
        );
      })}

      <Pressable
        onPress={addGoal}
        accessibilityRole="button"
        accessibilityLabel="Add a goal to the roadmap"
        style={({ pressed }) => [styles.addGoal, pressed && styles.addPressed]}
      >
        <Icon name="plus" size={17} color={colors.textSecondary} />
        <AppText variant="bodyMedium" tone="secondary">
          Add a goal
        </AppText>
      </Pressable>
    </Screen>
  );
}

function IconBtn({
  label,
  icon,
  onPress,
  disabled,
  hitSlop = 6,
}: {
  label: string;
  icon: 'chevronUp' | 'chevronDown' | 'pencil' | 'trash';
  onPress: () => void;
  disabled?: boolean;
  hitSlop?: number;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled === true }}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && !disabled && { backgroundColor: colors.surfaceSunken },
        disabled && styles.iconBtnDisabled,
      ]}
    >
      <Icon name={icon} size={15} color={disabled ? colors.textMuted : colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  building: {
    alignItems: 'stretch',
    gap: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  routeCard: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  routeArt: {
    gap: 0,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 46,
  },
  routeNodeCol: {
    width: 34,
    alignItems: 'center',
  },
  nodeWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeHalo: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  node: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeLine: {
    width: 2,
    flex: 1,
    marginVertical: 2,
    borderRadius: 1,
  },
  routeLabel: {
    flex: 1,
    marginLeft: spacing.md,
    marginTop: 6,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingLeft: 1,
  },
  flag: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buildCopy: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  buildCaption: {
    maxWidth: 320,
  },
  stateCard: {
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  stateBtn: {
    alignSelf: 'flex-start',
  },
  footer: {
    gap: spacing.sm,
  },
  startCard: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  startLabel: {
    opacity: 0.6,
    marginBottom: spacing.xs,
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  startIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  startIndexText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 10,
    lineHeight: 13,
  },
  startText: {
    flex: 1,
  },
  refineCard: {
    gap: spacing.md,
  },
  refineInput: {
    minHeight: 72,
  },
  refineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: -spacing.xs,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  goalCard: {
    gap: spacing.md,
  },
  goalTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
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
  goalEdit: {
    flex: 1,
    gap: spacing.sm,
  },
  goalEditDesc: {
    minHeight: 64,
  },
  goalActions: {
    alignItems: 'flex-end',
    gap: 2,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
  milestones: {
    gap: spacing.sm,
    paddingLeft: 42,
  },
  msRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  msDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 8,
  },
  msText: {
    flex: 1,
    gap: 2,
  },
  msEdit: {
    flex: 1,
    gap: spacing.sm,
  },
  msActions: {
    flexDirection: 'row',
    gap: 2,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  addGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    paddingVertical: spacing.lg,
  },
  addPressed: {
    opacity: 0.6,
  },
});

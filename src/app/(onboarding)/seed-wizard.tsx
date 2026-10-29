import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApi, useSession } from '@/api/ApiProvider';
import type { VisionCategory } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Icon } from '@/design-system/icons';
import { Reveal } from '@/design-system/motion';
import { useColors } from '@/design-system/theme';
import { radii, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { Input } from '@/design-system/Input';
import { Chip } from '@/design-system/Chip';
import { useToast } from '@/design-system/Toast';
import {
  DOT_COUNT,
  WIZARD_STEPS,
  withName,
  type WizardField,
  type WizardStep,
} from '@/features/onboarding/wizardSteps';
import {
  useWizardState,
  type WizardState,
} from '@/features/onboarding/wizardStore';

/**
 * Seed-data wizard — one question per screen, reference-matched layout.
 *
 * • A dot progress row with a circular back button.
 * • Every answer changes something visible: name → greeting, goals → bio,
 *   check-in time + nudges → notification prefs, coach tone → bio/prompting,
 *   accent → applied instantly everywhere, vision → creates the first vision.
 * • Skippable at every step ("Skip for now" / per-step skip links) and as a
 *   whole; every answer is persisted on change so a killed app resumes at the
 *   same question. An existing vision is never re-created — the vision step
 *   steps itself out.
 */

const DOT_TOTAL = DOT_COUNT;
/** The server requires a vision description of at least 20 characters. */
const MIN_VISION_WHY = 20;

type Period = 'AM' | 'PM';

function to24Hour(hourText: string, minuteText: string, period: Period): string | null {
  if (!hourText.trim() || !minuteText.trim()) return null;
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const hour24 = period === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  if (hour24 < 5 || hour24 > 23 || (hour24 === 23 && minute > 0)) return null;
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function categoryForGoals(goals: string[]): VisionCategory {
  const text = goals.join(' ').toLowerCase();
  if (/health|fitness|body|sleep/.test(text)) return 'health';
  if (/money|finance|business|wealth/.test(text)) return 'finance';
  if (/learn|study|school|education/.test(text)) return 'education';
  if (/career|work|job|studio/.test(text)) return 'career';
  if (/creat|art|write|music|design/.test(text)) return 'creativity';
  if (/relationship|family|friend|love/.test(text)) return 'relationships';
  if (/faith|spirit|prayer|church/.test(text)) return 'faith';
  return 'other';
}

export default function SeedWizard() {
  const colors = useColors();
  const { session, profile } = useSession();
  const userId = session?.user.id ?? profile?.userId ?? null;
  const { state, ready, setState } = useWizardState(userId);

  if (!ready) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return <WizardBody state={state} setState={setState} userId={userId} />;
}

function WizardBody({
  state,
  setState,
  userId,
}: {
  state: WizardState;
  setState: (next: WizardState | ((current: WizardState) => WizardState)) => void;
  userId: string | null;
}) {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { refresh, profile } = useSession();
  const [busy, setBusy] = useState(false);
  const [hasVision, setHasVision] = useState(false);
  const scrollRef = useRef<ScrollViewInstance>(null);

  // Never re-offer vision creation when one already exists: the vision step
  // removes itself from the flow.
  useEffect(() => {
    let alive = true;
    api
      .listVisions('active')
      .then((list) => {
        if (alive) setHasVision(list.length > 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api]);

  // The current step index, clamped to the available questions.
  const [index, setIndex] = useState(state.step);
  const step: WizardStep = WIZARD_STEPS[Math.min(index, WIZARD_STEPS.length - 1)];

  // Local mirror of the answer for the active step (text/chips need live value).
  const answers = state.answers;
  const nameValue = answers.name ?? '';
  const goals = useMemo(() => answers.goals ?? [], [answers.goals]);
  const visionTitle = answers.visionTitle ?? '';
  const visionWhy = answers.visionWhy ?? '';
  const [customAnswer, setCustomAnswer] = useState('');
  const [customHour, setCustomHour] = useState('8');
  const [customMinute, setCustomMinute] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<Period>('PM');
  const customTime = useMemo(
    () => to24Hour(customHour, customMinute, customPeriod),
    [customHour, customMinute, customPeriod],
  );
  const [selected, setSelected] = useState<string | null>(
    step.field && !ARRAY_FIELDS_HAS(step.field) && typeof answers[step.field] === 'string'
      ? (answers[step.field] as string)
      : null,
  );

  // Reset per-step local state when we move between steps. Adjusted during
  // render (React's "adjusting state when a prop changes" pattern) rather than
  // in an effect, so there is no extra committed render.
  const [prevIndex, setPrevIndex] = useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    const f = step.field;
    const stored = f && !ARRAY_FIELDS_HAS(f) && typeof answers[f] === 'string'
      ? (answers[f] as string)
      : null;
    setSelected(stored);
    setCustomAnswer('');
    if (step.id === 'checkIn' && stored) {
      const [h, m] = stored.split(':').map(Number);
      if (Number.isInteger(h) && Number.isInteger(m)) {
        const period: Period = h >= 12 ? 'PM' : 'AM';
        setCustomPeriod(period);
        setCustomHour(String(h % 12 === 0 ? 12 : h % 12));
        setCustomMinute(String(m).padStart(2, '0'));
      }
    }
  }

  // If a vision appeared (created elsewhere, or resumed after sync), jump past
  // the vision step instead of asking again. Deferred a tick so no setState
  // runs synchronously inside the effect body.
  useEffect(() => {
    if (!hasVision || WIZARD_STEPS[index]?.kind !== 'vision') return;
    const next = Math.min(index + 1, WIZARD_STEPS.length - 1);
    const timer = setTimeout(() => {
      setIndex(next);
      setState({ ...state, step: next, answers: state.answers });
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasVision, index]);

  // Scrolling back to the top is a genuine side effect, so it stays in an
  // effect (it does not call setState).
  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [index]);

  // ---------- persistence ----------
  const persist = (patch: Partial<WizardState['answers']>, stepOverride?: number) => {
    setState((current) => ({
      ...current,
      step: stepOverride ?? index,
      answers: { ...current.answers, ...patch },
    }));
  };

  const toggleArrayAnswer = (field: WizardField, value: string) => {
    setState((current) => {
      const existing = current.answers[field];
      const values = Array.isArray(existing) ? existing : [];
      const next = values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value];
      return {
        ...current,
        step: index,
        answers: { ...current.answers, [field]: next },
      };
    });
  };

  // ---------- derived CTA state ----------
  const canContinue = useMemo(() => {
    switch (step.kind) {
      case 'text': {
        if (step.skipLabel) return true; // optional — always allowed
        if (step.field === 'name') return nameValue.trim().length > 0;
        return true;
      }
      case 'choice': {
        if (selected) return true;
        if (step.id === 'checkIn' && customTime) return true;
        if (step.allowCustom && customAnswer.trim().length > 0) return true;
        return false;
      }
      case 'chips':
        if (step.field === 'goals') {
          return goals.length >= step.min || (!!step.allowCustom && customAnswer.trim().length > 0);
        }
        return true;
      case 'vision':
        return (
          !hasVision &&
          visionTitle.trim().length > 0 &&
          visionWhy.trim().length >= MIN_VISION_WHY
        );
      default:
        return true; // ready
    }
  }, [step, selected, customAnswer, customTime, nameValue, goals, visionTitle, visionWhy, hasVision]);

  const ctaLabel = useMemo(() => {
    if (step.kind === 'chips' && step.field === 'goals' && goals.length < step.min) {
      return 'Pick at least one';
    }
    if (step.kind === 'choice' && !selected && !(step.allowCustom && customAnswer.trim())) {
      if (step.id === 'checkIn' && customTime) return 'Continue';
      return 'Select an option';
    }
    if (step.kind === 'vision') return 'Save my vision';
    if (step.kind === 'ready') return 'Start running';
    return 'Continue';
  }, [step, selected, customAnswer, customTime, goals.length]);

  // ---------- navigation ----------
  /** First index after `from` that should actually render (vision self-skips). */
  const nextIndexAfter = (from: number): number => {
    let i = from + 1;
    while (i < WIZARD_STEPS.length - 1 && WIZARD_STEPS[i].kind === 'vision' && hasVision) {
      i += 1;
    }
    return i;
  };

  const createVisionFromWizard = async (): Promise<boolean> => {
    const title = visionTitle.trim();
    const why = visionWhy.trim();
    if (!title || why.length < MIN_VISION_WHY) return false;
    try {
      await api.createVision({
        title,
        description: why,
        whyItMatters: why,
        category: categoryForGoals(goals),
        priority: 'medium',
      });
      setHasVision(true);
      return true;
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save your vision.', {
        tone: 'error',
      });
      return false;
    }
  };

  const goNext = async () => {
    if (!canContinue || busy) return;

    // Build the answer patch once so the advance and the completion write use
    // the same values. Calling persist() and then setState() separately used
    // to overwrite the answer with the previous render's snapshot.
    let patch: Partial<WizardState['answers']> = {};
    if (step.field) {
      if (step.kind === 'text') {
        patch = { [step.field]: step.field === 'name' ? nameValue : '' };
      } else if (step.kind === 'choice') {
        const value =
          selected ??
          (step.id === 'checkIn' ? customTime : step.allowCustom ? customAnswer.trim() : undefined);
        if (value) patch = { [step.field]: value };
      } else if (step.kind === 'chips' && step.field === 'goals') {
        const custom = customAnswer.trim();
        const nextGoals =
          custom && !goals.some((goal) => goal.toLowerCase() === custom.toLowerCase())
            ? [...goals, custom]
            : goals;
        patch = { goals: nextGoals };
      }
    }

    // The vision step creates the vision before moving on.
    if (step.kind === 'vision' && !hasVision) {
      setBusy(true);
      const created = await createVisionFromWizard();
      setBusy(false);
      if (!created) return;
    }

    if (index < WIZARD_STEPS.length - 1) {
      const next = nextIndexAfter(index);
      setIndex(next);
      setState((current) => ({
        ...current,
        step: next,
        answers: { ...current.answers, ...patch },
      }));
    } else {
      await finish({ ...answers, ...patch });
    }
  };

  const goBack = () => {
    if (index === 0) return;
    let next = index - 1;
    // Stepping back over a vision that now exists lands on the question before.
    if (WIZARD_STEPS[next].kind === 'vision' && hasVision) next = Math.max(0, next - 1);
    setIndex(next);
    setState((current) => ({ ...current, step: next }));
  };

  const skipAll = async () => {
    setBusy(true);
    try {
      await completeOnboarding();
      setState((current) => ({ ...current, completed: true }));
      router.replace('/(tabs)');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save your setup.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const skipStep = () => {
    // Advance without writing an answer.
    if (index < WIZARD_STEPS.length - 1) {
      const next = nextIndexAfter(index);
      setIndex(next);
      setState((current) => ({ ...current, step: next }));
    } else {
      void finish();
    }
  };

  // ---------- completion: every answer lands somewhere visible ----------
  const completeOnboarding = async (a: WizardState['answers'] = state.answers) => {
    const patch: Record<string, unknown> = { onboardingState: 'done' };
    if (a.name?.trim()) patch.displayName = a.name.trim();
    if (a.coachTone) patch.coachingTone = a.coachTone;
    if (a.goals?.length) patch.focusAreas = a.goals;

    // The chosen check-in window becomes a real notification preference
    // (visible and editable in Settings → Notifications). Toggle choices and
    // accent live only in Settings, skipped in the wizard on purpose.
    const prefs = profile?.notificationPrefs;
    if (prefs && a.checkInTime) {
      patch.notificationPrefs = {
        ...prefs,
        dailyCheckInWindow: a.checkInTime,
      };
    }

    await api.updateProfile(patch as never);
    await refresh();
  };

  const finish = async (answersOverride?: WizardState['answers']) => {
    const finalAnswers = answersOverride ?? state.answers;
    setBusy(true);
    try {
      await completeOnboarding(finalAnswers);
      setState((current) => ({
        ...current,
        step: WIZARD_STEPS.length - 1,
        answers: finalAnswers,
        completed: true,
      }));
      toast.show('You are all set.', { tone: 'success' });
      router.replace('/(tabs)');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save your setup.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  // ---------- rendering ----------
  const title = withName(step.title, answers.name);
  const subtitle = step.subtitle ? withName(step.subtitle, answers.name) : undefined;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header: circular back + progress dots */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          disabled={index === 0}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={({ pressed }) => [
            styles.back,
            {
              backgroundColor: colors.brand,
              opacity: index === 0 ? 0.35 : pressed ? 0.7 : 1,
            },
          ]}
        >
          <Icon name="chevronLeft" size={22} color={colors.brandInverse} />
        </Pressable>

        <View style={styles.dots}>
          {Array.from({ length: DOT_TOTAL }).map((_, i) => {
            const active = i === Math.min(index, DOT_TOTAL - 1);
            const done = i < index;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  active && styles.dotActive,
                  (done || active) && { backgroundColor: colors.brand },
                  !done && !active && { backgroundColor: colors.borderStrong },
                ]}
              />
            );
          })}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal key={`${step.id}-title`} distance={10} duration={340}>
            <AppText variant="display" center style={styles.title}>
              {title}
            </AppText>
            {subtitle ? (
              <AppText variant="body" tone="secondary" center style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </Reveal>

          <Reveal key={`${step.id}-body`} distance={12} delay={40} duration={360}>
            <View style={styles.body}>{renderBody()}</View>
          </Reveal>
        </ScrollView>

        {/* Footer CTA + skip */}
        <View style={styles.footer}>
          {step.kind !== 'ready' && index < WIZARD_STEPS.length ? (
            <Pressable
              onPress={skipAll}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Skip setup"
              style={styles.skip}
            >
              <AppText variant="bodyMedium" tone="muted">
                Skip for now
              </AppText>
            </Pressable>
          ) : null}

          <Button
            label={ctaLabel}
            onPress={goNext}
            loading={busy}
            disabled={!canContinue}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  function renderBody(): React.ReactNode {
    switch (step.kind) {
      case 'text':
        return (
          <View style={styles.block}>
            <Input
              placeholder={step.placeholder}
              value={nameValue}
              onChangeText={(v) => persist({ name: v })}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={goNext}
            />
          </View>
        );

      case 'choice':
        return (
          <View style={styles.block}>
            <View style={styles.options}>
              {step.options.map((opt) => {
                const value = opt.value ?? opt.label;
                const isOn = selected === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setSelected(value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}                      style={({ pressed }) => [
                        styles.pill,
                        {
                          backgroundColor: isOn ? colors.brand : colors.surfaceSunken,
                        },
                        pressed && !isOn && { backgroundColor: colors.border },
                      ]}
                  >
                    <AppText
                      variant="body"
                      style={{ color: isOn ? colors.textInverse : colors.textPrimary }}
                      center
                    >
                      {opt.label}
                    </AppText>
                    {opt.caption ? (
                      <AppText
                        variant="caption"
                        center
                        style={{ color: isOn ? colors.textInverse : colors.textMuted, opacity: isOn ? 0.8 : 1 }}
                      >
                        {opt.caption}
                      </AppText>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {step.id === 'checkIn' ? (
              <View style={styles.customTime}>
                <AppText variant="bodyMedium" tone="secondary">
                  Or set your own
                </AppText>
                <View style={styles.timeRow}>
                  <Input
                    value={customHour}
                    onChangeText={(value) => {
                      setSelected(null);
                      setCustomHour(value.replace(/\D/g, '').slice(0, 2));
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Check-in hour"
                    containerStyle={styles.timeInput}
                    style={styles.timeField}
                  />
                  <AppText variant="h3" style={styles.timeColon}>
                    :
                  </AppText>
                  <Input
                    value={customMinute}
                    onChangeText={(value) => {
                      setSelected(null);
                      setCustomMinute(value.replace(/\D/g, '').slice(0, 2));
                    }}
                    keyboardType="number-pad"
                    maxLength={2}
                    accessibilityLabel="Check-in minute"
                    containerStyle={styles.timeInput}
                    style={styles.timeField}
                  />
                  <View style={styles.periodRow}>
                    <Chip
                      label="AM"
                      selected={customPeriod === 'AM'}
                      onPress={() => {
                        setSelected(null);
                        setCustomPeriod('AM');
                      }}
                    />
                    <Chip
                      label="PM"
                      selected={customPeriod === 'PM'}
                      onPress={() => {
                        setSelected(null);
                        setCustomPeriod('PM');
                      }}
                    />
                  </View>
                </View>
                <AppText variant="caption" tone="muted">
                  Between 5:00 AM and 11:00 PM.
                </AppText>
              </View>
            ) : null}

            {step.allowCustom && step.id !== 'checkIn' ? (
              <View style={styles.custom}>
                <Input
                  placeholder="Add your own answer"
                  value={customAnswer}
                  onChangeText={setCustomAnswer}
                  returnKeyType="done"
                  onSubmitEditing={customAnswer.trim() ? goNext : undefined}
                />
              </View>
            ) : null}
          </View>
        );

      case 'chips': {
        const values = step.field === 'goals' ? goals : [];
        return (
          <View style={styles.block}>
            <AppText variant="h3" style={styles.groupLabel}>
              {step.groupLabel}
            </AppText>
            <View style={styles.chipGrid}>
              {step.options.map((opt) => {
                const value = opt.value ?? opt.label;
                return (
                  <View key={value} style={styles.chipCell}>
                    <Chip
                      label={opt.label}
                      selected={values.includes(value)}
                      onPress={() => step.field && toggleArrayAnswer(step.field, value)}
                      style={styles.chip}
                    />
                  </View>
                );
              })}
            </View>
            {step.allowCustom ? (
              <View style={styles.custom}>
                <Input
                  placeholder="Something else"
                  value={customAnswer}
                  onChangeText={setCustomAnswer}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    const value = customAnswer.trim();
                    if (!value) return;
                    toggleArrayAnswer('goals', value);
                    setCustomAnswer('');
                  }}
                />
                <AppText variant="caption" tone="muted">
                  Press done to add your own focus area.
                </AppText>
              </View>
            ) : null}
          </View>
        );
      }

      case 'vision':
        return (
          <View style={styles.block}>
            <Input
              placeholder={step.titlePlaceholder}
              value={visionTitle}
              onChangeText={(v) => persist({ visionTitle: v })}
              returnKeyType="next"
            />
            <Input
              placeholder={step.whyPlaceholder}
              value={visionWhy}
              onChangeText={(v) => persist({ visionWhy: v })}
              multiline
              textAlignVertical="top"
              style={{ minHeight: 96 }}
            />
            {visionWhy.trim().length > 0 && visionWhy.trim().length < MIN_VISION_WHY ? (
              <AppText variant="caption" tone="muted">
                A sentence or two helps the AI build a real plan (
                {MIN_VISION_WHY - visionWhy.trim().length} more characters).
              </AppText>
            ) : null}
            {step.skipLabel ? (
              <Pressable onPress={skipStep} style={styles.underLink} accessibilityRole="button">
                <AppText variant="bodyMedium" tone="muted" style={styles.underLinkText}>
                  {step.skipLabel}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        );

      case 'ready':
        return (
          <View style={styles.block}>
            <View style={styles.points}>
              {step.points.map((p, i) => (
                <Reveal key={p.title} delay={i * 90} distance={10}>
                  <View style={styles.pointRow}>
                    <View style={[styles.pointIcon, { backgroundColor: colors.surfaceSunken }]}>
                      <Icon name={p.icon} size={18} color={colors.brand} />
                    </View>
                    <View style={styles.pointText}>
                      <AppText variant="h3">{p.title}</AppText>
                      <AppText variant="caption" tone="secondary">
                        {p.body}
                      </AppText>
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
          </View>
        );
    }
  }
}

/** Whether an answer key holds an array (goals). */
function ARRAY_FIELDS_HAS(field: WizardField): boolean {
  return field === 'goals';
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: {
    width: 48,
    height: 48,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radii.round,
  },
  dotActive: {
    width: 26,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  title: {
    marginTop: spacing.xl,
    letterSpacing: -0.9,
  },
  subtitle: {
    marginTop: spacing.md,
    maxWidth: 340,
    alignSelf: 'center',
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  block: {
    gap: spacing.lg,
  },
  options: {
    gap: spacing.md,
  },
  pill: {
    minHeight: 60,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  custom: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customTime: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeInput: {
    width: 64,
  },
  timeField: {
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  timeColon: {
    marginTop: -2,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  underLink: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  underLinkText: {
    textDecorationLine: 'underline',
    textDecorationColor: 'currentColor',
  },
  groupLabel: {
    marginBottom: spacing.xs,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  chipCell: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 140,
  },
  chip: {
    minHeight: 56,
    justifyContent: 'center',
  },
  points: {
    gap: spacing.lg,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  pointIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: {
    flex: 1,
    gap: 3,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  skip: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
});

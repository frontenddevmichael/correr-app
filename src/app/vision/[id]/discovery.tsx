import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Chip } from '@/design-system/Chip';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  LIMITS,
  sanitizeMultiline,
  sanitizeSingleLine,
} from '@/core/validation';

const TIME_OPTIONS = [15, 30, 45, 60, 90];

const BLOCKER_OPTIONS = [
  'Time',
  'Motivation',
  'Money',
  'Skills',
  'Support',
  'Uncertainty',
  'Distractions',
];

const PACES = [
  { key: 'steady', label: 'Steady', hint: 'Consistent daily reps' },
  { key: 'intense', label: 'Intense', hint: 'Push hard, move fast' },
  { key: 'flexible', label: 'Flexible', hint: 'Ebb and flow with life' },
] as const;

const STEPS = 2;

/**
 * AI discovery, trimmed to 2 screens: where you are (with your daily budget),
 * then blockers + pace. The old third "anything else?" screen was optional
 * context the model can do without — one decision per screen, chip clouds,
 * live counts.
 */
export default function Discovery() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [step, setStep] = useState(0);
  const [currentState, setCurrentState] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [customMinutes, setCustomMinutes] = useState('30');
  const [blockers, setBlockers] = useState<string[]>([]);
  const [customBlocker, setCustomBlocker] = useState('');
  const [constraints, setConstraints] = useState('');
  const [pace, setPace] = useState<'steady' | 'intense' | 'flexible'>('steady');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsedCustomMinutes = Number(customMinutes);
  const customMinutesError =
    customMinutes.trim() !== '' && !(parsedCustomMinutes >= 5 && parsedCustomMinutes <= 480)
      ? 'Enter a number between 5 and 480 minutes.'
      : undefined;
  const [stepError, setStepError] = useState<string | null>(null);

  const toggleBlocker = (b: string) =>
    setBlockers((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));

  const addCustomBlocker = () => {
    const value = sanitizeSingleLine(customBlocker, 40).trim();
    if (!value) return;
    if (!blockers.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setBlockers((prev) => [...prev, value]);
    }
    setCustomBlocker('');
  };

  const submit = async () => {
    if (currentState.trim().length < 10) {
      setError('Tell the coach where you’re starting from. Use at least 10 characters.');
      setStep(0);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveDiscovery({
        visionId: id,
        currentState: currentState.trim(),
        timeAvailablePerDay: minutes,
        blockers,
        preferredPace: pace,
        constraints: constraints.trim(),
      });
      toast.show('Discovery saved. Building your roadmap.', { tone: 'success' });
      router.replace({ pathname: '/vision/[id]/roadmap', params: { id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 0 && currentState.trim().length < 10) {
      setStepError('Add a sentence or two about where you’re starting.');
      toast.show('Tell the coach where you are today.', { tone: 'error' });
      return;
    }
    setStepError(null);
    if (step < STEPS - 1) {
      setStep((s) => s + 1);
      return;
    }
    void submit();
  };

  const copy = [
    {
      question: 'Where are you today?',
      hint: 'Honest, not impressive. The plan starts from here.',
    },
    {
      question: 'What gets in the way?',
      hint: 'Name the real obstacles, and how hard you want to push.',
    },
  ][step];

  return (
    <Screen
      back="push"
      onBack={() => (step > 0 ? setStep((s) => Math.max(0, s - 1)) : router.back())}
      header={
        <View style={styles.progressRow}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dash,
                {
                  backgroundColor: i <= step ? colors.textPrimary : colors.borderStrong,
                  width: i === step ? 34 : 18,
                },
              ]}
            />
          ))}
        </View>
      }
      footer={
        <View style={styles.footerInner}>
          {stepError || error ? (
            <AppText variant="caption" tone="error" center>
              {stepError ?? error}
            </AppText>
          ) : null}
          <Button
            label={step === STEPS - 1 ? 'Build my roadmap' : 'Continue'}
            onPress={next}
            loading={busy}
            disabled={busy}
          />
          <AppText variant="caption" tone="secondary" center style={styles.footerNote}>
            {step === 0
              ? `${minutes} min a day`
              : `${blockers.length} selected · ${pace} pace`}
          </AppText>
        </View>
      }
    >
      <View style={styles.intro}>
        <AppText variant="display" center>
          {copy.question}
        </AppText>
        <AppText variant="body" tone="secondary" center style={styles.hint}>
          {copy.hint}
        </AppText>
      </View>

      {step === 0 ? (
        <View style={styles.step}>
          <Input
            placeholder="e.g. I know basic HTML and I’m learning JavaScript…"
            multiline
            textAlignVertical="top"
            value={currentState}
            onChangeText={(value) => {
              setCurrentState(sanitizeMultiline(value, LIMITS.mediumText));
              if (stepError) setStepError(null);
            }}
            maxLength={LIMITS.mediumText}
            style={styles.textarea}
            autoFocus
            accessibilityLabel="Where you are starting from"
          />
          <View>
            <AppText variant="overline" tone="secondary" style={styles.label}>
              Time you can give each day
            </AppText>
            <View style={styles.chipCloud}>
              {TIME_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  label={`${m} min`}
                  selected={minutes === m && customMinutes === String(m)}
                  onPress={() => {
                    setMinutes(m);
                    setCustomMinutes(String(m));
                  }}
                />
              ))}
            </View>
            <View style={styles.customTimeRow}>
              <AppText variant="caption" tone="secondary">
                Or set your own
              </AppText>
              <View style={styles.customTimeInput}>
                <Input
                  value={customMinutes}
                  onChangeText={(value) => {
                    const clean = value.replace(/\D/g, '').slice(0, 3);
                    setCustomMinutes(clean);
                    const parsed = Number(clean);
                    if (Number.isInteger(parsed) && parsed >= 5 && parsed <= 480) {
                      setMinutes(parsed);
                    }
                  }}
                  keyboardType="number-pad"
                  maxLength={3}
                  accessibilityLabel="Custom minutes per day"
                  error={customMinutesError}
                  containerStyle={styles.minutesField}
                />
                <AppText variant="caption" tone="muted">
                  min
                </AppText>
              </View>
            </View>
            <AppText variant="caption" tone="muted" center>
              Between 5 and 480 minutes.
            </AppText>
          </View>
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.step}>
          <View>
            <AppText variant="overline" tone="secondary" style={styles.label}>
              Select all that apply
            </AppText>
            <View style={styles.chipCloud}>
              {BLOCKER_OPTIONS.map((b) => (
                <Chip
                  key={b}
                  label={b}
                  selected={blockers.includes(b)}
                  onPress={() => toggleBlocker(b)}
                />
              ))}
              {blockers
                .filter((b) => !BLOCKER_OPTIONS.includes(b))
                .map((b) => (
                  <Chip key={b} label={b} selected onPress={() => toggleBlocker(b)} />
                ))}
            </View>
            <View style={styles.customBlockerRow}>
              <Input
                value={customBlocker}
                onChangeText={(value) => setCustomBlocker(value.slice(0, 40))}
                placeholder="Something else"
                returnKeyType="done"
                onSubmitEditing={addCustomBlocker}
                containerStyle={styles.customBlockerInput}
                accessibilityLabel="Add your own blocker"
              />
              <Button
                label="Add"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={addCustomBlocker}
                disabled={!customBlocker.trim()}
              />
            </View>
          </View>
          <View>
            <AppText variant="overline" tone="secondary" style={styles.label}>
              Anything else the plan should account for?
            </AppText>
            <Input
              value={constraints}
              onChangeText={(value) => setConstraints(sanitizeMultiline(value, 300))}
              placeholder="Optional. Caregiving, transport, health, a deadline."
              multiline
              maxLength={300}
              textAlignVertical="top"
              style={styles.constraints}
              accessibilityLabel="Other constraints"
            />
          </View>
          <View>
            <AppText variant="overline" tone="secondary" style={styles.label}>
              Preferred pace
            </AppText>
            <View style={styles.chipCloud}>
              {PACES.map((p) => (
                <Chip
                  key={p.key}
                  label={p.label}
                  selected={pace === p.key}
                  onPress={() => setPace(p.key)}
                />
              ))}
            </View>
            <AppText variant="caption" tone="secondary" center style={styles.paceHint}>
              {PACES.find((p) => p.key === pace)?.hint}
            </AppText>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dash: {
    height: 3,
    borderRadius: 2,
  },
  intro: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  hint: {
    maxWidth: 330,
    alignSelf: 'center',
  },
  step: {
    gap: spacing.xl,
  },
  textarea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  label: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  customTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  customTimeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  minutesField: {
    width: 84,
  },
  customBlockerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  customBlockerInput: {
    flex: 1,
  },
  constraints: {
    minHeight: 96,
    paddingTop: spacing.md,
  },
  paceHint: {
    marginTop: spacing.md,
  },
  footerInner: {
    gap: spacing.sm,
  },
  footerNote: {
    marginTop: spacing.xs,
  },
});

import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Chip } from '@/design-system/Chip';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { LIMITS, sanitizeMultiline } from '@/core/validation';

const FEELINGS = [
  { key: 'done', label: 'Mostly on track', icon: 'checkCircle' },
  { key: 'mixed', label: 'Mixed week', icon: 'cloud' },
  { key: 'rough', label: 'Rough week', icon: 'cloudRain' },
] as const;

/** Weekly review (FR-12) — a guided reflection that closes the week and earns XP. */
export default function WeeklyReview() {
  const api = useApi();
  const toast = useToast();
  const [feeling, setFeeling] = useState<(typeof FEELINGS)[number]['key'] | null>(null);
  const [wins, setWins] = useState('');
  const [lessons, setLessons] = useState('');
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!feeling) {
      setError('Pick how the week felt first.');
      return;
    }
    const nextFocus = focus.trim();
    if (nextFocus.length < 3) {
      setError('Add one clear focus for next week.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.createCheckIn({
        kind: 'weekly',
        status: feeling === 'done' ? 'on_track' : feeling === 'mixed' ? 'struggling' : 'blocked',
        reflection: JSON.stringify({
          feeling,
          wins: wins.trim(),
          lessons: lessons.trim(),
          focus: nextFocus,
        }),
      });
      toast.show('Week closed. +15 XP.', { tone: 'success' });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back="push"
      title="Weekly review."
      subtitle="Three honest questions. +15 XP, and the pattern gets clearer every week."
    >
      <View style={styles.form}>
        <View>
          <AppText variant="bodyBold" tone="secondary" style={styles.label}>
            How did the week feel?
          </AppText>
          <View style={styles.chips}>
            {FEELINGS.map((f) => (
              <Chip
                key={f.key}
                icon={f.icon}
                label={f.label}
                tone="ai"
                selected={feeling === f.key}
                onPress={() => setFeeling(f.key)}
              />
            ))}
          </View>
        </View>

        <Input
          label="What went well?"
          placeholder="Wins, big or small…"
          multiline
          textAlignVertical="top"
          style={[styles.multiline, { minHeight: 90 }]}
          value={wins}
          maxLength={LIMITS.mediumText}
          onChangeText={(value) => setWins(sanitizeMultiline(value, LIMITS.mediumText))}
        />
        <Input
          label="What didn’t?"
          placeholder="What drained you or slipped…"
          multiline
          textAlignVertical="top"
          style={[styles.multiline, { minHeight: 90 }]}
          value={lessons}
          maxLength={LIMITS.mediumText}
          onChangeText={(value) => setLessons(sanitizeMultiline(value, LIMITS.mediumText))}
        />
        <Input
          label="One focus for next week"
          placeholder="The single thing that matters most…"
          multiline
          textAlignVertical="top"
          style={[styles.multiline, { minHeight: 80 }]}
          value={focus}
          maxLength={LIMITS.focus}
          onChangeText={(value) => {
            setFocus(sanitizeMultiline(value, LIMITS.focus));
            if (error) setError(null);
          }}
        />
        <AppText variant="caption" tone="muted" style={styles.count}>
          {focus.length}/{LIMITS.focus}
        </AppText>

        {error ? (
          <AppText variant="caption" tone="error">
            {error}
          </AppText>
        ) : null}

        <Button label="Close the week" onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  multiline: {
    minHeight: 80,
    paddingTop: spacing.md,
  },
  count: {
    alignSelf: 'flex-end',
    marginTop: -spacing.md,
  },
});

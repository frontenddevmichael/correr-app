import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { BrandMark } from '@/design-system/BrandMark';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { useToast } from '@/design-system/Toast';
import { AppText } from '@/design-system/typography';

const TONES = [
  {
    id: 'warm',
    label: 'Warm',
    caption: 'Encouraging and steady. Celebrates the small wins.',
  },
  {
    id: 'direct',
    label: 'Direct',
    caption: 'Honest and concise. Skips the cushioning.',
  },
  {
    id: 'socratic',
    label: 'Socratic',
    caption: 'Curious. Asks one pointed question before advising.',
  },
] as const;

const LENGTHS = [
  {
    id: 'brief',
    label: 'Brief',
    caption: 'One to three sentences. The default.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    caption: 'A little more context when it helps.',
  },
  {
    id: 'detailed',
    label: 'Detailed',
    caption: 'Longer answers when you ask for a plan.',
  },
] as const;

/**
 * Coach settings: the one place to shape how the coach sounds and what it
 * remembers. Saved to the profile so the server-side AI sees the same context
 * on every device.
 */
export default function CoachSettings() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { profile, refresh } = useSession();
  const [tone, setTone] = useState(profile?.coachingTone ?? 'warm');
  const [length, setLength] = useState(profile?.coachLength ?? 'brief');
  const [context, setContext] = useState(profile?.coachContext ?? '');
  const [saving, setSaving] = useState(false);
  const [hydratedFor, setHydratedFor] = useState(profile?.userId ?? null);

  // The profile can resolve after the first render. Adjust once per user rather
  // than mirroring it in an effect.
  if (profile && profile.userId !== hydratedFor) {
    setHydratedFor(profile.userId);
    setTone(profile.coachingTone ?? 'warm');
    setLength(profile.coachLength ?? 'brief');
    setContext(profile.coachContext ?? '');
  }

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await api.updateProfile({
        coachingTone: tone,
        coachLength: length,
        coachContext: context.trim(),
      });
      await refresh();
      toast.show('Coach settings saved.', { tone: 'success' });
      router.back();
    } catch {
      toast.show('Could not save your coach settings.', { tone: 'error' });
    } finally {
      setSaving(false);
    }
  }, [api, context, length, refresh, toast, tone]);

  const activeTone = TONES.find((item) => item.id === tone) ?? TONES[0];
  const activeLength = LENGTHS.find((item) => item.id === length) ?? LENGTHS[0];

  return (
    <Screen
      back="push"
      eyebrow="Coach"
      title="How your coach talks."
      subtitle="Set the tone, the length, and the context that matters. This is private to you."
      avoidKeyboard
      footer={
        <Button
          label="Save coach settings"
          onPress={save}
          loading={saving}
          disabled={saving}
        />
      }
    >
      <Card variant="outlined" style={styles.hero}>
        <View style={styles.heroMark}>
          <BrandMark size={30} />
        </View>
        <View style={styles.heroText}>
          <AppText variant="bodyBold">A coach that fits your rhythm.</AppText>
          <AppText variant="caption" tone="secondary">
            Brief by default. It only goes deeper when you ask.
          </AppText>
        </View>
      </Card>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <AppText variant="h3">Tone</AppText>
          <AppText variant="caption" tone="muted">
            How it sounds when it pushes you.
          </AppText>
        </View>
        <View style={styles.chipRow}>
          {TONES.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={tone === item.id}
              onPress={() => setTone(item.id)}
            />
          ))}
        </View>
        <AppText variant="caption" tone="secondary" style={styles.helper}>
          {activeTone.caption}
        </AppText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <AppText variant="h3">Reply length</AppText>
          <AppText variant="caption" tone="muted">
            Short answers are the default. You can always ask for more.
          </AppText>
        </View>
        <View style={styles.chipRow}>
          {LENGTHS.map((item) => (
            <Chip
              key={item.id}
              label={item.label}
              selected={length === item.id}
              onPress={() => setLength(item.id)}
            />
          ))}
        </View>
        <AppText variant="caption" tone="secondary" style={styles.helper}>
          {activeLength.caption}
        </AppText>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <AppText variant="h3">What should it remember?</AppText>
          <AppText variant="caption" tone="muted">
            A sentence or two about what you are working on, what helps, or what to avoid.
          </AppText>
        </View>
        <Input
          value={context}
          onChangeText={(value) => setContext(value.slice(0, 400))}
          placeholder="I am building a design career. I lose focus in the evening. Remind me to start small."
          multiline
          maxLength={400}
          textAlignVertical="top"
          style={styles.contextInput}
        />
        <AppText variant="caption" tone="muted" style={styles.helper}>
          {context.length}/400
        </AppText>
      </View>

      <View style={styles.note}>
        <View style={[styles.noteDot, { backgroundColor: colors.textMuted }]} />
        <AppText variant="caption" tone="muted" style={styles.noteText}>
          Your coach only talks about your goals, visions, commitments, and progress. It will not answer unrelated questions.
        </AppText>
      </View>

      <Button
        label="How AI works"
        variant="ghost"
        onPress={() => router.push('/legal/ai')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHead: {
    gap: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  helper: {
    marginLeft: spacing.xs,
  },
  contextInput: {
    minHeight: 132,
    paddingTop: spacing.md,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  noteDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
  },
});

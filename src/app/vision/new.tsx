import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import type { VisionCategory } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Icon } from '@/design-system/icons';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  isTitle,
  LIMITS,
  sanitizeMultiline,
  sanitizeSingleLine,
  VALIDATION_COPY,
} from '@/core/validation';

const CATEGORIES: { key: VisionCategory; label: string }[] = [
  { key: 'career', label: 'Career' },
  { key: 'education', label: 'Education' },
  { key: 'health', label: 'Health' },
  { key: 'finance', label: 'Finance' },
  { key: 'creativity', label: 'Creativity' },
  { key: 'relationships', label: 'Relationships' },
  { key: 'faith', label: 'Faith' },
  { key: 'business', label: 'Business' },
  { key: 'other', label: 'Other' },
];

const TIMEFRAMES = [
  { key: '6 months', label: '6 months' },
  { key: '1 year', label: '1 year' },
  { key: '3 years', label: '3 years' },
  { key: 'open', label: 'Open-ended' },
] as const;

const PRIORITIES = [
  { key: 'high', label: 'High' },
  { key: 'medium', label: 'Medium' },
  { key: 'low', label: 'Low' },
] as const;

type FieldErrors = Partial<Record<'title' | 'description' | 'why' | 'category', string>>;

/**
 * New vision — the reference's single-screen capture, adapted.
 *
 * One calm page instead of a three-step wizard: name the future, picture it,
 * say why it matters, then give it a home and a horizon. The roadmap comes
 * next, and every part can be changed later.
 *
 * With an `id` param the same screen edits an existing vision: it prefills,
 * saves via updateVision and returns instead of restarting discovery.
 */
export default function NewVision() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof id === 'string' && id.length > 0;
  const [hydrated, setHydrated] = useState(!editing);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [why, setWhy] = useState('');
  const [category, setCategory] = useState<VisionCategory | null>(null);
  const [timeframe, setTimeframe] = useState<string>('1 year');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/vision');
  };

  // Edit mode: hydrate the form from the saved vision once on mount.
  useEffect(() => {
    if (!editing || hydrated) return;
    let alive = true;
    api
      .getVision(id as string)
      .then((vision) => {
        if (!alive) return;
        if (!vision) {
          toast.show('That vision no longer exists.', { tone: 'error' });
          goBack();
          return;
        }
        setTitle(vision.title);
        setDescription(vision.description);
        setWhy(vision.whyItMatters);
        setCategory(vision.category);
        setTimeframe(vision.targetTimeframe ?? 'open');
        setPriority(vision.priority);
        setHydrated(true);
      })
      .catch(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, hydrated]);

  const clearError = (key: keyof FieldErrors) => {
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!isTitle(title)) next.title = VALIDATION_COPY.title;
    if (description.trim().length < 20) {
      next.description = 'A sentence or two helps the roadmap take shape.';
    }
    if (why.trim().length < 10) {
      next.why = 'Say why this matters, even roughly.';
    }
    if (!category) {
      next.category = 'Choose the area this vision belongs to.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    setError(null);
    if (!validate() || !category) {
      toast.show('Check the highlighted fields.', { tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      const patch = {
        title: title.trim(),
        description: description.trim(),
        whyItMatters: why.trim(),
        category,
        targetTimeframe: timeframe === 'open' ? undefined : timeframe,
        priority,
      };
      if (editing) {
        await api.updateVision(id as string, patch);
        toast.show('Vision saved.', { tone: 'success' });
        goBack();
        return;
      }
      const vision = await api.createVision(patch);
      toast.show('Vision created.', { tone: 'success' });
      router.replace({ pathname: '/vision/[id]/discovery', params: { id: vision.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const footerError =
    error ?? errors.title ?? errors.description ?? errors.why ?? errors.category ?? null;

  if (!hydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <Screen
      avoidKeyboard
      edges={['top', 'bottom']}
      header={
        <View style={styles.navBar}>
          <Pressable
            onPress={goBack}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={({ pressed }) => [styles.navButton, pressed && styles.pressed]}
          >
            <Icon name="chevronLeft" size={22} color={colors.textPrimary} />
          </Pressable>
          <AppText variant="bodyMedium" style={styles.navTitle}>
            {editing ? 'Edit vision' : 'New vision'}
          </AppText>
          <View style={styles.navSpacer} />
        </View>
      }
      footer={
        <View style={styles.footer}>
          {footerError ? (
            <AppText variant="caption" tone="error" center accessibilityRole="alert">
              {footerError}
            </AppText>
          ) : null}
          <Button
            label={editing ? 'Save changes' : 'Build my roadmap'}
            onPress={submit}
            loading={busy}
            disabled={busy}
          />
          <AppText variant="caption" tone="secondary" center>
            You can change any of this later.
          </AppText>
        </View>
      }
    >
      <View style={styles.intro}>
        <AppText variant="title">
          {editing ? 'Edit the vision.' : 'Name the future.'}
        </AppText>
        <AppText variant="body" tone="secondary">
          {editing
            ? 'Change anything here. The roadmap stays intact.'
            : 'A clear sentence is enough. The roadmap comes next.'}
        </AppText>
      </View>

      <View style={styles.field}>
        <AppText variant="overline" tone="muted">
          The vision
        </AppText>
        <TextInput
          value={title}
          onChangeText={(value) => {
            setTitle(sanitizeSingleLine(value));
            clearError('title');
          }}
          placeholder="A studio that lasts"
          placeholderTextColor={colors.textMuted}
          maxLength={LIMITS.titleMax}
          autoFocus
          returnKeyType="next"
          accessibilityLabel="Vision title"
          accessibilityHint="Name the future in one clear sentence"
          style={[
            styles.visionInput,
            {
              backgroundColor: colors.surface,
              ...(errors.title ? { borderColor: colors.error, borderWidth: 1 } : {}),
              color: colors.textPrimary,
            },
          ]}
        />
        {errors.title ? (
          <AppText variant="caption" tone="error">
            {errors.title}
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted">
            One sentence. Specific beats impressive.
          </AppText>
        )}
      </View>

      <View style={styles.field}>
        <AppText variant="overline" tone="muted">
          The picture
        </AppText>
        <Input
          placeholder="What does it look like when it’s real?"
          multiline
          textAlignVertical="top"
          value={description}
          onChangeText={(value) => {
            setDescription(sanitizeMultiline(value, LIMITS.mediumText));
            clearError('description');
          }}
          maxLength={LIMITS.mediumText}
          style={styles.textarea}
          error={errors.description}
          hint="A sentence or two is enough."
          accessibilityLabel="Vision description"
        />
      </View>

      <View style={styles.field}>
        <AppText variant="overline" tone="muted">
          Why it matters
        </AppText>
        <Input
          placeholder="Your reason, in your own words…"
          multiline
          textAlignVertical="top"
          value={why}
          onChangeText={(value) => {
            setWhy(sanitizeMultiline(value, LIMITS.mediumText));
            clearError('why');
          }}
          maxLength={LIMITS.mediumText}
          style={styles.textarea}
          error={errors.why}
          hint="Your reason is what you reach for on the hard days."
          accessibilityLabel="Why this vision matters"
        />
      </View>

      <View style={styles.field}>
        <AppText variant="overline" tone="muted">
          Where it lives
        </AppText>
        <View style={styles.chipCloud}>
          {CATEGORIES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={category === item.key}
              onPress={() => {
                setCategory(item.key);
                clearError('category');
              }}
            />
          ))}
        </View>
        {errors.category ? (
          <AppText variant="caption" tone="error">
            {errors.category}
          </AppText>
        ) : null}
      </View>

      <View style={styles.field}>
        <AppText variant="overline" tone="muted">
          When
        </AppText>
        <View style={styles.chipCloud}>
          {TIMEFRAMES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={timeframe === item.key}
              onPress={() => setTimeframe(item.key)}
            />
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <AppText variant="overline" tone="muted">
          Priority
        </AppText>
        <View style={styles.chipCloud}>
          {PRIORITIES.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={priority === item.key}
              onPress={() => setPriority(item.key)}
            />
          ))}
        </View>
      </View>

      <Card variant="muted" style={styles.nextCard}>
        <View style={styles.nextRow}>
          <View style={[styles.nextIcon, { backgroundColor: colors.surface }]}>
            <Icon name="map" size={18} color={colors.textPrimary} />
          </View>
          <View style={styles.nextText}>
            <AppText variant="bodyMedium">What happens next</AppText>
            <AppText variant="caption" tone="secondary">
              Three quick questions, then a roadmap you can turn into one goal a day.
            </AppText>
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: 52,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
  },
  navSpacer: {
    width: 44,
  },
  intro: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  visionInput: {
    minHeight: 64,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: 'Poppins_500Medium',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.3,
    outlineWidth: 0,
  },
  textarea: {
    minHeight: 120,
    paddingTop: spacing.md,
  },
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nextCard: {
    padding: spacing.lg,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nextIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: {
    flex: 1,
    gap: 2,
  },
  footer: {
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.45,
  },
});

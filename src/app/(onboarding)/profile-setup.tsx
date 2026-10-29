import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  isName,
  LIMITS,
  sanitizeName,
  VALIDATION_COPY,
} from '@/core/validation';

const FOCUS_OPTIONS = [
  'Career',
  'Health',
  'Money',
  'Learning',
  'Creativity',
  'Relationships',
  'Faith',
  'Confidence',
];

/**
 * Edit profile. This is the source of the context the coach uses, so it asks
 * for the few things that actually change the quality of a reply: the name it
 * uses, a short about-you note, and the areas the user is working on.
 */
export default function ProfileSetup() {
  const api = useApi();
  const toast = useToast();
  const { profile, refresh } = useSession();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [focusAreas, setFocusAreas] = useState<string[]>(profile?.focusAreas ?? []);
  const [customFocus, setCustomFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [hydratedFor, setHydratedFor] = useState(profile?.userId ?? null);

  // A deep link can reach this screen before the profile resolves. Hydrate once
  // per user so the form never saves empty fields over real context.
  if (profile && profile.userId !== hydratedFor) {
    setHydratedFor(profile.userId);
    setName(profile.displayName ?? '');
    setBio(profile.bio ?? '');
    setFocusAreas(profile.focusAreas ?? []);
  }

  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

  const toggleFocus = (value: string) => {
    setFocusAreas((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const addCustomFocus = () => {
    const value = customFocus.trim();
    if (!value) return;
    if (!focusAreas.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setFocusAreas((current) => [...current, value.slice(0, LIMITS.focus)]);
    }
    setCustomFocus('');
  };

  const submit = async () => {
    if (!isName(name)) {
      setNameError(VALIDATION_COPY.name);
      toast.show('Check your display name.', { tone: 'error' });
      return;
    }
    setNameError(null);
    setBusy(true);
    try {
      await api.updateProfile({
        displayName: name.trim(),
        bio: bio.trim(),
        focusAreas,
        timezone,
      });
      await refresh();
      toast.show('Profile saved.', { tone: 'success' });
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save your profile.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      back="push"
      eyebrow="Profile"
      title="Edit profile."
      subtitle="A little context helps your coach give you a better answer. This stays private."
      avoidKeyboard
      footer={
        <Button
          label="Save changes"
          onPress={submit}
          loading={busy}
          disabled={busy}
        />
      }
    >
      <View style={styles.section}>
        <Input
          label="Display name"
          placeholder="e.g. Jane Doe"
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          maxLength={LIMITS.nameMax}
          value={name}
          error={nameError ?? undefined}
          onChangeText={(value) => {
            setName(sanitizeName(value));
            if (nameError) setNameError(null);
          }}
          onBlur={() => {
            if (name.trim() && !isName(name)) setNameError(VALIDATION_COPY.name);
          }}
        />
        <AppText variant="caption" tone="muted" style={styles.hint}>
          Your coach and accountability partner will see this name.
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="h3">What are you working on?</AppText>
        <AppText variant="caption" tone="muted">
          Pick the areas that matter right now. Add your own if the list does not fit.
        </AppText>
        <View style={styles.chipRow}>
          {FOCUS_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={focusAreas.includes(option)}
              onPress={() => toggleFocus(option)}
            />
          ))}
          {focusAreas
            .filter((item) => !FOCUS_OPTIONS.includes(item))
            .map((option) => (
              <Chip
                key={option}
                label={option}
                selected
                onPress={() => toggleFocus(option)}
              />
            ))}
        </View>
        <View style={styles.addRow}>
          <Input
            value={customFocus}
            onChangeText={(value) => setCustomFocus(value.slice(0, LIMITS.focus))}
            placeholder="Add your own"
            returnKeyType="done"
            onSubmitEditing={addCustomFocus}
            containerStyle={styles.addInput}
          />
          <Button
            label="Add"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={addCustomFocus}
            disabled={!customFocus.trim()}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Input
          label="About you"
          placeholder="A line or two about what you are building, what helps you focus, or what gets in the way."
          value={bio}
          onChangeText={(value) => setBio(value.slice(0, LIMITS.mediumText))}
          multiline
          maxLength={LIMITS.mediumText}
          textAlignVertical="top"
          style={styles.bioInput}
          hint="Your coach uses this for context. It is never shown publicly."
        />
      </View>

      <View style={styles.section}>
        <AppText variant="h3">Timezone</AppText>
        <Card variant="sunken" style={styles.timezoneCard}>
          <AppText variant="bodyMedium" tone="secondary">
            {timezone}
          </AppText>
        </Card>
        <AppText variant="caption" tone="muted">
          Detected automatically. Used for reminders and check-in windows.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  hint: {
    marginLeft: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  addInput: {
    flex: 1,
  },
  bioInput: {
    minHeight: 124,
    paddingTop: spacing.md,
  },
  timezoneCard: {
    paddingVertical: spacing.md,
  },
});

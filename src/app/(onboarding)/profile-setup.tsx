import { router } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApi, useSession } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Input } from '@/design-system/Input';
import { createThemedStyles, useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { Toggle } from '@/design-system/Toggle';
import { AppText } from '@/design-system/typography';
import {
  isName,
  LIMITS,
  sanitizeName,
  VALIDATION_COPY,
} from '@/core/validation';
import {
  AuthWordmark,
  useAuthInputStyle,
  useAuthLabelStyle,
} from '@/features/auth/AuthUi';

/**
 * Profile setup — design gap filled in the auth design language (FR-02).
 * Display name, timezone, notification preferences.
 */
export default function ProfileSetup() {
  const { profile } = useSession();

  // If the profile resolves after the screen mounts, remount the form once so
  // its fields initialise from the profile instead of staying blank.
  return <ProfileSetupForm key={profile?.userId ?? 'pending'} />;
}

function ProfileSetupForm() {
  const api = useApi();
  const colors = useColors();
  const authInput = useAuthInputStyle();
  const authLabel = useAuthLabelStyle();
  const toast = useToast();
  const { profile, refresh } = useSession();
  const [name, setName] = useState(profile?.displayName ?? '');
  const [notificationsOn, setNotificationsOn] = useState(
    profile?.notificationPrefs.commitmentReminders ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const timezone = profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';

  const submit = async () => {
    setError(null);
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
        timezone,
        notificationPrefs: {
          ...(profile?.notificationPrefs ?? {
            commitmentReminders: true,
            commitmentOverdue: true,
            partnerInteractions: true,
            dailyCheckIn: true,
            dailyCheckInWindow: '20:00',
            weeklyReview: true,
            weeklyReviewDay: 0,
            aiInsights: true,
            quietHoursStart: '22:00',
            quietHoursEnd: '07:00',
          }),
          commitmentReminders: notificationsOn,
        },
      });
      await refresh();
      toast.show('Profile saved.', { tone: 'success' });
      router.replace('/');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.body}>
        <View style={styles.top}>
          <AuthWordmark />
        </View>
        <View style={styles.header}>
          <AppText style={styles.title}>Set up your profile.</AppText>
          <AppText style={styles.subtitle}>
            Your coach and accountability partner will see this name. You can change everything
            later in Settings.
          </AppText>
        </View>

        <View style={styles.form}>
          <View>
            <AppText style={[styles.label, authLabel]}>Display name</AppText>
            <Input
              placeholder="e.g. Jane Doe"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="done"
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
              onSubmitEditing={submit}
              containerStyle={styles.inputGap}
              style={authInput}
            />
          </View>
          <View>
            <AppText style={[styles.label, authLabel]}>Timezone</AppText>
            <Card variant="sunken" style={styles.timezoneCard}>
              <AppText style={styles.timezoneText}>{timezone}</AppText>
            </Card>
            <AppText style={styles.hint}>
              Used for reminders and check-in windows. Detected automatically.
            </AppText>
          </View>
          <Card variant="outlined" style={styles.prefCard}>
            <View style={styles.prefRow}>
              <View style={styles.prefText}>
                <AppText style={styles.prefTitle}>Notifications</AppText>
                <AppText style={styles.prefDesc}>
                  Commitment reminders, check-ins and partner activity. Every category is
                  configurable later.
                </AppText>
              </View>
              <Toggle
                value={notificationsOn}
                onValueChange={setNotificationsOn}
                accessibilityLabel="Commitment reminders"
              />
            </View>
          </Card>
        </View>

        {error ? <AppText style={styles.error}>{error}</AppText> : null}

        <Button label="Continue" onPress={submit} loading={busy} />
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safe: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 20,
  },
  top: {
    alignItems: 'center',
  },
  header: { alignItems: 'center', gap: 8 },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.9,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  form: { gap: 18 },
  label: {},
  inputGap: { marginTop: 6 },
  timezoneCard: {
    marginTop: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  timezoneText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textSecondary,
  },
  hint: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  prefCard: { padding: 16 },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prefText: { flex: 1, gap: 4 },
  prefTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: colors.textPrimary,
  },
  prefDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  error: {
    color: colors.textPrimary, // monochrome: errors carry weight, not hue
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
}));

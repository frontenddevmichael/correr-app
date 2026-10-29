import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { convexEnabled } from '@/api/convexClient';
import type { NotificationKind } from '@/core/domain';
import { Card } from '@/design-system/Card';
import { useConfirm } from '@/design-system/confirm';
import { Icon } from '@/design-system/icons';
import { MotionPressable, Reveal } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { Toggle } from '@/design-system/Toggle';
import { AppText } from '@/design-system/typography';
import { CorrerGlyph } from '@/design-system/BrandMark';
import { WizardResumePrompt } from '@/features/onboarding/WizardResumePrompt';

type BoolPrefKey =
  | 'commitmentReminders'
  | 'commitmentOverdue'
  | 'partnerInteractions'
  | 'dailyCheckIn'
  | 'weeklyReview'
  | 'aiInsights';

interface NotifRow {
  key: BoolPrefKey;
  kind: NotificationKind;
  label: string;
  description: string;
}

const NOTIF_ROWS: NotifRow[] = [
  {
    key: 'commitmentReminders',
    kind: 'commitment_reminder',
    label: 'Commitment reminders',
    description: 'A nudge when it’s time to run your daily commitment.',
  },
  {
    key: 'commitmentOverdue',
    kind: 'commitment_overdue',
    label: 'Overdue alerts',
    description: 'Supportive notice when a commitment window closes.',
  },
  {
    key: 'dailyCheckIn',
    kind: 'daily_checkin',
    label: 'Daily AI check-in',
    description: 'One honest question a day to keep you on track.',
  },
  {
    key: 'partnerInteractions',
    kind: 'partner_interaction',
    label: 'Partner activity',
    description: 'When your partner confirms or encourages you.',
  },
  {
    key: 'weeklyReview',
    kind: 'weekly_review',
    label: 'Weekly review',
    description: 'Your Sunday reflection of wins, lessons and next steps.',
  },
  {
    key: 'aiInsights',
    kind: 'ai_insight',
    label: 'AI insights',
    description: 'Patterns Correr notices in your commitments and streaks.',
  },
];

/**
 * Settings — preferences only, by design (screen-purpose sweep):
 * profile, edit-profile, explore destinations (Circles / Build / Pro / Campus
 * / Partner) and sign-out all live on the Account screen; this screen owns
 * appearance, notification preferences and setup resume.
 */
function formatHour(hhmm: string): string {
  const [hRaw, m] = hhmm.split(':');
  const h = Number(hRaw);
  if (!Number.isFinite(h)) return hhmm;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m} ${suffix}`;
}

export default function Settings() {
  const api = useApi();
  const confirm = useConfirm();
  const colors = useColors();
  const { profile, refresh, invalidate } = useSession();
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  const prefs = profile?.notificationPrefs;
  const enabledCount = NOTIF_ROWS.filter((row) => prefs?.[row.key]).length;

  const toggleNotif = useCallback(
    async (row: NotifRow, value: boolean) => {
      await api.setPreference(row.kind, value);
      invalidate();
      await refresh();
    },
    [api, invalidate, refresh],
  );

  const onResetDemo = useCallback(() => {
    confirm(
      'Reset demo data?',
      'This clears local commitments, visions and progress and restores the seed demo content.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.resetDemoData();
              invalidate();
              await refresh();
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }, [api, confirm, invalidate, refresh]);

  return (
    <Screen
      back="push"
      eyebrow="Settings"
      title="Settings."
      subtitle="How Correr looks, feels, and gets your attention."
    >
      <Reveal>
        <WizardResumePrompt />
      </Reveal>

      <Reveal delay={60}>
        <MotionPressable
          onPress={() => router.push('/appearance')}
          accessibilityLabel="Appearance. Theme, accent, text, motion and haptics."
        >
          <Card variant="outlined" style={styles.appearanceRow}>
            <View style={[styles.accountIcon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name="sparkles" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.accountText}>
              <AppText variant="h3">Appearance</AppText>
              <AppText variant="caption" tone="secondary">
                Theme, accent, text size, motion, haptics and accessibility.
              </AppText>
            </View>
            <Icon name="chevronRight" size={16} color={colors.textMuted} />
          </Card>
        </MotionPressable>
      </Reveal>

      <Reveal delay={80}>
        <Card variant="outlined">
          <View style={styles.cardHeader}>
            <AppText variant="h3">Notifications</AppText>
            <AppText variant="overline" tone="muted">
              {enabledCount}/{NOTIF_ROWS.length} on
            </AppText>
          </View>
          <MotionPressable
            onPress={() => router.push('/check-in-time')}
            accessibilityLabel="Daily check-in time"
          >
            <View style={styles.scheduleRow}>
              <View style={styles.notifText}>
                <AppText variant="bodyMedium">Daily check-in time</AppText>
                <AppText variant="caption" tone="secondary">
                  {prefs ? `Currently ${formatHour(prefs.dailyCheckInWindow)}` : 'Choose a time'}
                </AppText>
              </View>
              <Icon name="chevronRight" size={16} color={colors.textMuted} />
            </View>
          </MotionPressable>
          <View>
            {NOTIF_ROWS.map((row) => (
              <View key={row.key} style={styles.notifRow}>
                <View style={styles.notifText}>
                  <AppText variant="bodyMedium">{row.label}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {row.description}
                  </AppText>
                </View>
                <Toggle
                  value={prefs ? prefs[row.key] : false}
                  onValueChange={(value) => toggleNotif(row, value)}
                  accessibilityLabel={row.label}
                />
              </View>
            ))}
          </View>
        </Card>
      </Reveal>

      {!convexEnabled ? (
        <Reveal delay={200}>
          <Card variant="outlined" padded={false}>
            <View style={styles.accountHeader}>
              <AppText variant="overline" tone="muted">
                Developer
              </AppText>
            </View>
            <MotionPressable
              onPress={onResetDemo}
              disabled={busy}
              accessibilityLabel="Reset local demo data"
            >
              <View style={styles.accountRow}>
                <View style={[styles.accountIcon, { backgroundColor: colors.surfaceSunken }]}>
                  <Icon name="refresh" size={16} color={colors.textSecondary} />
                </View>
                <View style={styles.accountText}>
                  <AppText variant="bodyMedium">Reset local demo data</AppText>
                  <AppText variant="caption" tone="muted">
                    Restore the seeded sample content
                  </AppText>
                </View>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </View>
            </MotionPressable>
          </Card>
        </Reveal>
      ) : null}

      <Reveal delay={260}>
        <View style={styles.about}>
          <View style={styles.wordmark}>
            <CorrerGlyph size={16} color={colors.textPrimary} />
            <AppText style={styles.wordmarkText}>CORRER</AppText>
          </View>
          <AppText variant="caption" tone="muted">
            Run your vision. Build your future.
          </AppText>
          <AppText variant="overline" tone="muted">
            Version 1.0.0
          </AppText>
        </View>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  notifText: {
    flex: 1,
    gap: 2,
  },
  accountHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  accountIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountText: {
    flex: 1,
    gap: 2,
  },
  about: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 2,
  },
  wordmarkText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    letterSpacing: 3,
    lineHeight: 17,
  },
});

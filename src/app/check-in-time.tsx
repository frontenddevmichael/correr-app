import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { Button } from '@/design-system/Button';
import { Chip } from '@/design-system/Chip';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

type Period = 'AM' | 'PM';

const PRESETS = ['07:00', '12:00', '20:00', '21:30'];

function splitTime(value: string): { hour: string; minute: string; period: Period } {
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const hour = Number.isInteger(rawHour) ? rawHour : 20;
  const minute = Number.isInteger(rawMinute) ? rawMinute : 0;
  return {
    hour: String(hour % 12 === 0 ? 12 : hour % 12),
    minute: String(minute).padStart(2, '0'),
    period: hour >= 12 ? 'PM' : 'AM',
  };
}

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

function displayTime(value: string): string {
  const { hour, minute, period } = splitTime(value);
  return `${hour}:${minute} ${period}`;
}

/** The daily check-in window, editable between 5:00 AM and 11:00 PM. */
export default function CheckInTime() {
  const api = useApi();
  const toast = useToast();
  const { profile, refresh } = useSession();
  const initial = splitTime(profile?.notificationPrefs.dailyCheckInWindow ?? '20:00');
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState<Period>(initial.period);
  const [busy, setBusy] = useState(false);
  const [hydratedFor, setHydratedFor] = useState(profile?.userId ?? null);

  if (profile && profile.userId !== hydratedFor) {
    const next = splitTime(profile.notificationPrefs?.dailyCheckInWindow ?? '20:00');
    setHydratedFor(profile.userId);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  }

  const time = to24Hour(hour, minute, period);

  const applyPreset = (value: string) => {
    const next = splitTime(value);
    setHour(next.hour);
    setMinute(next.minute);
    setPeriod(next.period);
  };

  const save = async () => {
    if (!time) {
      toast.show('Choose a time between 5:00 AM and 11:00 PM.', { tone: 'error' });
      return;
    }
    const prefs = profile?.notificationPrefs;
    if (!prefs) {
      toast.show('Sign in to save your check-in time.', { tone: 'error' });
      return;
    }
    setBusy(true);
    try {
      await api.updateProfile({
        notificationPrefs: { ...prefs, dailyCheckInWindow: time },
      });
      await refresh();
      toast.show('Daily check-in time saved.', { tone: 'success' });
      if (router.canGoBack()) router.back();
      else router.replace('/settings');
    } catch {
      toast.show('Could not save your check-in time.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      back="push"
      eyebrow="Notifications"
      title="Daily check-in."
      subtitle="Choose when Correr asks how the day went. Pick a preset or set your own time."
      avoidKeyboard
      footer={
        <Button label="Save time" onPress={save} loading={busy} disabled={busy || !time} />
      }
    >
      <View style={styles.preview}>
        <AppText variant="overline" tone="muted">
          Every day at
        </AppText>
        <AppText variant="mega" style={styles.previewTime}>
          {time ? displayTime(time) : '—'}
        </AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="secondary" style={styles.label}>
          Presets
        </AppText>
        <View style={styles.chipRow}>
          {PRESETS.map((preset) => (
            <Chip
              key={preset}
              label={displayTime(preset)}
              selected={time === preset}
              onPress={() => applyPreset(preset)}
            />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="overline" tone="secondary" style={styles.label}>
          Custom time
        </AppText>
        <View style={styles.timeRow}>
          <Input
            value={hour}
            onChangeText={(value) => setHour(value.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Check-in hour"
            containerStyle={styles.timeInput}
            style={styles.timeField}
          />
          <AppText variant="h3" style={styles.colon}>
            :
          </AppText>
          <Input
            value={minute}
            onChangeText={(value) => setMinute(value.replace(/\D/g, '').slice(0, 2))}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Check-in minute"
            containerStyle={styles.timeInput}
            style={styles.timeField}
          />
          <View style={styles.periodRow}>
            <Chip label="AM" selected={period === 'AM'} onPress={() => setPeriod('AM')} />
            <Chip label="PM" selected={period === 'PM'} onPress={() => setPeriod('PM')} />
          </View>
        </View>
        <AppText variant="caption" tone="muted" style={styles.hint}>
          Between 5:00 AM and 11:00 PM.
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
  },
  previewTime: {
    letterSpacing: -1,
  },
  section: {
    gap: spacing.sm,
  },
  label: {
    marginLeft: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeInput: {
    width: 72,
  },
  timeField: {
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
  colon: {
    marginTop: -2,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: spacing.xs,
  },
  hint: {
    marginLeft: spacing.xs,
  },
});

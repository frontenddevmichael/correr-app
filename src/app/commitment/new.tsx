import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, type TextInputInstance, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import type { Vision } from '@/core/domain';
import { addDays, formatLongDate, formatTime, isSameDay } from '@/core/dates';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Icon } from '@/design-system/icons';
import { Input } from '@/design-system/Input';
import { ProgressBar } from '@/design-system/ProgressBar';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { Toggle } from '@/design-system/Toggle';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import {
  isTitle,
  LIMITS,
  sanitizeMultiline,
  sanitizeSingleLine,
  VALIDATION_COPY,
} from '@/core/validation';

function atHour(hour: number, base: Date, dayOffset = 0): string {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function dueOptions(base: Date) {
  const nextDay = isSameDay(base, new Date()) ? 'Tomorrow' : 'Next day';
  return [
    { key: 'today_morning', label: 'Morning', dueAt: () => atHour(9, base) },
    { key: 'today_afternoon', label: 'Afternoon', dueAt: () => atHour(14, base) },
    { key: 'today_evening', label: 'Evening', dueAt: () => atHour(19, base) },
    { key: 'today_bed', label: 'Before bed', dueAt: () => atHour(22, base) },
    { key: 'tomorrow_morning', label: nextDay, dueAt: () => atHour(9, base, 1) },
  ];
}

type Period = 'AM' | 'PM';

/**
 * Parse the custom time fields into a concrete due date. The fields are
 * intentionally 12-hour so the picker reads naturally; `Period` carries the
 * meridiem. A time that has already passed today rolls to tomorrow, which is
 * why the preview always names the day.
 */
function customDueAt(
  base: Date,
  hourText: string,
  minuteText: string,
  period: Period,
): Date | null {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;

  const due = new Date(base);
  const hour24 = period === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  due.setHours(hour24, minute, 0, 0);

  if (isSameDay(base, new Date()) && due.getTime() <= Date.now()) {
    due.setDate(due.getDate() + 1);
  }
  return due;
}

function relativeDay(value: Date): string {
  if (isSameDay(value, new Date())) return 'today';
  if (isSameDay(value, addDays(new Date(), 1))) return 'tomorrow';
  return value.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * New commitment — styled as the reference's add-task sheet: grabber, one
 * oversized borderless field, time chips, a pinned ink CTA. Everything else is
 * optional and visually quiet.
 */
export default function NewCommitment() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const params = useLocalSearchParams<{
    visionId?: string;
    milestoneId?: string;
    title?: string;
    date?: string;
  }>();
  const anchorDate = useMemo(() => {
    const parsed = params.date ? new Date(params.date) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [params.date]);
  const dueChoices = useMemo(() => dueOptions(anchorDate), [anchorDate]);
  const [title, setTitle] = useState(params.title ?? '');
  const [note, setNote] = useState('');
  const [dueKey, setDueKey] = useState('today_evening');
  const [customHour, setCustomHour] = useState('7');
  const [customMinute, setCustomMinute] = useState('00');
  const [customPeriod, setCustomPeriod] = useState<Period>('PM');
  const [timeError, setTimeError] = useState<string | null>(null);
  const [visionId, setVisionId] = useState<string | null>(params.visionId ?? null);
  const [shareWithPartner, setShareWithPartner] = useState(false);
  const [visions, setVisions] = useState<Vision[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [titleFocused, setTitleFocused] = useState(false);
  const titleRef = useRef<TextInputInstance>(null);

  useEffect(() => {
    let active = true;
    api
      .listVisions('active')
      .then((v) => {
        if (active) setVisions(v);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [api]);

  const submit = async () => {
    const nextTitle = title.trim();
    if (!isTitle(nextTitle)) {
      setTitleError(VALIDATION_COPY.title);
      titleRef.current?.focus();
      toast.show('Give the goal a clear name.', { tone: 'error' });
      return;
    }
    setTitleError(null);
    setError(null);
    setTimeError(null);

    const customDue =
      dueKey === 'custom'
        ? customDueAt(anchorDate, customHour, customMinute, customPeriod)
        : null;
    if (dueKey === 'custom' && !customDue) {
      setTimeError('Enter a time between 1:00 and 12:59.');
      toast.show('Choose a valid end time.', { tone: 'error' });
      return;
    }

    setBusy(true);
    try {
      const due = dueChoices.find((d) => d.key === dueKey) ?? dueChoices[2];
      await api.createCommitment({
        title: nextTitle,
        note: note.trim() || undefined,
        dueAt: customDue ? customDue.toISOString() : due.dueAt(),
        visionId: visionId ?? undefined,
        milestoneId: params.milestoneId ?? undefined,
        visibility: shareWithPartner ? 'partner' : 'private',
      });
      toast.show('Goal added.', { tone: 'success' });
      router.back();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const selectedVision = visions.find((v) => v.id === visionId);
  const customDuePreview = customDueAt(anchorDate, customHour, customMinute, customPeriod);

  return (
    <Screen
      back="close"
      header={
        <View style={styles.sheetTop}>
          <View style={[styles.grabber, { backgroundColor: colors.borderStrong }]} />
        </View>
      }
      footer={
        <View style={styles.footerInner}>
          {error ? (
            <AppText variant="caption" tone="error" style={styles.error}>
              {error}
            </AppText>
          ) : null}
          <Button label="Add this goal" onPress={submit} loading={busy} disabled={busy} />
          <AppText variant="caption" tone="secondary" center style={styles.footerNote}>
            One clear action, with a time to finish.
          </AppText>
        </View>
      }
    >
      <View style={styles.intro}>
        <AppText variant="overline" tone="secondary">
          New goal
        </AppText>
        <AppText style={styles.question} accessibilityRole="header">
          What needs to happen?
        </AppText>
        <AppText variant="caption" tone="muted">
          For {formatLongDate(anchorDate)}
        </AppText>
        <TextInput
          ref={titleRef}
          value={title}
          onChangeText={(value) => {
            setTitle(sanitizeSingleLine(value, LIMITS.titleMax));
            if (titleError) setTitleError(null);
          }}
          placeholder="e.g. Send three client proposals"
          placeholderTextColor={colors.textMuted}
          style={[styles.bigInput, { color: colors.textPrimary }]}
          multiline
          maxLength={LIMITS.titleMax}
          autoFocus
          onFocus={() => setTitleFocused(true)}
          onBlur={() => setTitleFocused(false)}
          accessibilityLabel="Goal title"
          accessibilityHint="A clear action you can finish today"
        />
        <View
          style={[
            styles.rule,
            {
              backgroundColor:
                titleError || titleFocused ? colors.textPrimary : colors.border,
            },
          ]}
        />
        {titleError ? (
          <AppText variant="caption" tone="error">
            {titleError}
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted" style={styles.fieldHint}>
            Start with a verb. Keep it small enough to finish today.
          </AppText>
        )}

        <View style={styles.noteBlock}>
          <AppText variant="overline" tone="muted" style={styles.fieldLabel}>
            A note, if it helps
          </AppText>
          <Input
            placeholder="Context, a link or a reminder (optional)"
            value={note}
            onChangeText={(value) => setNote(sanitizeMultiline(value, LIMITS.note))}
            maxLength={LIMITS.note}
            multiline
            textAlignVertical="top"
            style={styles.noteInput}
            accessibilityLabel="Goal note"
          />
          {note.length > 400 ? (
            <AppText variant="caption" tone="muted" style={styles.noteCount}>
              {note.length}/{LIMITS.note}
            </AppText>
          ) : null}
        </View>
      </View>

      <View>
        <AppText variant="overline" tone="secondary" style={styles.label}>
          When should it end?
        </AppText>
        <View style={styles.chips}>
          {dueChoices.map((d) => (
            <Chip
              key={d.key}
              label={d.label}
              selected={dueKey === d.key}
              onPress={() => {
                setDueKey(d.key);
                setTimeError(null);
              }}
            />
          ))}
          <Chip
            label="Custom time"
            selected={dueKey === 'custom'}
            onPress={() => {
              setDueKey('custom');
              setTimeError(null);
            }}
          />
        </View>

        {dueKey === 'custom' ? (
          <Card variant="outlined" style={styles.customTimeCard}>
            <View style={styles.customTimeHeader}>
              <View style={styles.customTimeText}>
                <AppText variant="bodyMedium">Ends at</AppText>
                <AppText variant="caption" tone="secondary">
                  {customDuePreview
                    ? `Ends ${relativeDay(customDuePreview)} at ${formatTime(customDuePreview)}`
                    : 'Choose a time between 1:00 and 12:59.'}
                </AppText>
              </View>
              <Icon name="clock" size={18} color={colors.textSecondary} />
            </View>

            <View style={styles.timeRow}>
              <Input
                value={customHour}
                onChangeText={(value) => {
                  setCustomHour(value.replace(/[^0-9]/g, '').slice(0, 2));
                  setTimeError(null);
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                placeholder="7"
                containerStyle={styles.timeInput}
                style={[styles.timeField, { backgroundColor: colors.surfaceSunken }]}
                accessibilityLabel="End hour"
              />
              <AppText variant="h3" style={styles.timeColon}>
                :
              </AppText>
              <Input
                value={customMinute}
                onChangeText={(value) => {
                  setCustomMinute(value.replace(/[^0-9]/g, '').slice(0, 2));
                  setTimeError(null);
                }}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                placeholder="00"
                containerStyle={styles.timeInput}
                style={[styles.timeField, { backgroundColor: colors.surfaceSunken }]}
                accessibilityLabel="End minute"
              />
              <View style={styles.periodRow}>
                <Chip
                  label="AM"
                  selected={customPeriod === 'AM'}
                  onPress={() => {
                    setCustomPeriod('AM');
                    setTimeError(null);
                  }}
                />
                <Chip
                  label="PM"
                  selected={customPeriod === 'PM'}
                  onPress={() => {
                    setCustomPeriod('PM');
                    setTimeError(null);
                  }}
                />
              </View>
            </View>

            {timeError ? (
              <AppText variant="caption" tone="error">
                {timeError}
              </AppText>
            ) : customDuePreview ? (
              <AppText variant="caption" tone="muted">
                The goal stays open until this time.
              </AppText>
            ) : (
              <AppText variant="caption" tone="muted">
                Enter an hour from 1 to 12 and a minute from 00 to 59.
              </AppText>
            )}
          </Card>
        ) : null}
      </View>

      {visions.length > 0 ? (
        <View>
          <AppText variant="overline" tone="secondary" style={styles.label}>
            Moves which vision?
          </AppText>
          <View style={styles.chips}>
            {visions.map((v) => (
              <Chip
                key={v.id}
                label={v.title}
                selected={visionId === v.id}
                onPress={() => setVisionId((cur) => (cur === v.id ? null : v.id))}
              />
            ))}
          </View>
          {selectedVision ? (
            <Card variant="muted" style={styles.visionPreview}>
              <View style={styles.visionRow}>
                <AppText variant="bodyMedium" style={styles.visionTitle} numberOfLines={1}>
                  {selectedVision.title}
                </AppText>
                <AppText variant="caption" tone="progress">
                  {selectedVision.progressPercent}%
                </AppText>
              </View>
              <ProgressBar
                progress={selectedVision.progressPercent / 100}
                tone="ai"
                height={6}
              />
            </Card>
          ) : null}
        </View>
      ) : null}

      <Card variant="outlined">
        <View style={styles.shareRow}>
          <View style={styles.shareText}>
            <AppText variant="bodyMedium">Keep this private</AppText>
            <AppText variant="caption" tone="secondary">
              {shareWithPartner
                ? 'Shared with your accountability partner.'
                : 'Only you can see this. You can share it later.'}
            </AppText>
          </View>
          <Toggle
            value={!shareWithPartner}
            onValueChange={(keepPrivate) => setShareWithPartner(!keepPrivate)}
            accessibilityLabel="Keep this private"
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sheetTop: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  intro: {
    gap: spacing.md,
  },
  question: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 28,
    lineHeight: 35,
    letterSpacing: -0.8,
  },
  bigInput: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.4,
    paddingVertical: spacing.sm,
    minHeight: 54,
    outlineWidth: 0,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  fieldHint: {
    marginTop: -spacing.xs,
  },
  noteBlock: {
    gap: spacing.xs,
  },
  fieldLabel: {
    marginBottom: 2,
  },
  noteInput: {
    minHeight: 76,
    paddingTop: spacing.md,
    fontSize: 15,
  },
  noteCount: {
    alignSelf: 'flex-end',
  },
  label: {
    marginBottom: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  customTimeCard: {
    marginTop: spacing.md,
    gap: spacing.md,
    padding: spacing.lg,
  },
  customTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  customTimeText: {
    flex: 1,
    gap: 2,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  timeInput: {
    width: 74,
  },
  timeField: {
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
    fontSize: 18,
  },
  timeColon: {
    marginTop: -2,
  },
  periodRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  visionPreview: {
    marginTop: spacing.md,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  visionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  visionTitle: {
    flex: 1,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shareText: {
    flex: 1,
    gap: 2,
  },
  footerInner: {
    gap: spacing.sm,
  },
  footerNote: {
    marginTop: spacing.xs,
  },
  error: {
    textAlign: 'center',
  },
});

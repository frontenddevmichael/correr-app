import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import type { CheckIn, Commitment } from '@/core/domain';
import { endOfDay, formatLongDate, formatMonthDay, formatTime, startOfDay } from '@/core/dates';
import { LIMITS, sanitizeMultiline } from '@/core/validation';
import { Avatar } from '@/design-system/Avatar';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { CorrerGlyph } from '@/design-system/BrandMark';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { Icon } from '@/design-system/icons';
import { PopIn, Reveal } from '@/design-system/motion';
import { Skeleton } from '@/design-system/Skeleton';
import { createThemedStyles, useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { radii, shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { WizardResumePrompt } from '@/features/onboarding/WizardResumePrompt';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

const CHECKIN_OPTIONS = [
  { key: 'on_track', label: 'On track', icon: 'checkCircle' },
  { key: 'struggling', label: 'Struggling', icon: 'cloud' },
  { key: 'blocked', label: 'Blocked', icon: 'alert' },
] as const;

type CheckInStatus = (typeof CHECKIN_OPTIONS)[number]['key'];

function CheckInChoice({
  option,
  selected,
  disabled,
  onPress,
}: {
  option: (typeof CHECKIN_OPTIONS)[number];
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  // Selected uses the brand fill with its contrast-checked foreground; the
  // resting state sits on the sunken fill — no ring needed, like the ref.
  const fg = selected ? colors.brandInverse : colors.textPrimary;
  const bg = selected ? colors.brand : colors.surfaceSunken;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={option.label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkChoice,
        { backgroundColor: bg },
        pressed && { opacity: 0.85 },
        disabled && !selected && { opacity: 0.6 },
      ]}
    >
      <Icon name={option.icon} size={17} color={fg} />
      <AppText
        variant="caption"
        style={[styles.checkChoiceLabel, { color: fg }]}
        numberOfLines={1}
      >
        {option.label}
      </AppText>
    </Pressable>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Loading your day">
      <Skeleton height={146} radius={24} />
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonTitle}>
          <Skeleton height={10} width={54} radius={5} />
          <Skeleton height={24} width={124} radius={8} />
        </View>
        <Skeleton height={13} width={72} radius={6} />
      </View>
      <Skeleton height={260} radius={24} />
      <Skeleton height={180} radius={24} />
    </View>
  );
}

function AgendaRow({
  commitment,
  busy,
  isLast,
  onOpen,
  onComplete,
}: {
  commitment: Commitment;
  busy: boolean;
  isLast: boolean;
  onOpen: () => void;
  onComplete: () => void;
}) {
  const colors = useColors();
  const done = commitment.state === 'completed';
  const meta: string[] = [];
  if (commitment.visibility === 'partner') meta.push('Shared with partner');
  if (commitment.state === 'in_progress') meta.push('In progress');
  const stateLabel =
    commitment.state === 'missed'
      ? 'Missed'
      : commitment.state === 'rescheduled'
        ? 'Rescheduled'
        : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${commitment.title}`}
      onPress={onOpen}
      style={({ pressed }) => pressed && styles.rowPressed}
    >
      <View style={styles.timelineRow}>
        <View style={styles.rail}>
          {!isLast ? <View style={[styles.railLine, { backgroundColor: colors.border }]} /> : null}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={
              done ? `${commitment.title} completed` : `Complete ${commitment.title}`
            }
            accessibilityHint="Marks this goal complete"
            disabled={done || busy}
            onPress={onComplete}
            hitSlop={10}
            style={({ pressed }) => [
              styles.marker,
              {
                backgroundColor: done ? colors.textPrimary : colors.surface,
                borderColor: done ? colors.textPrimary : colors.borderStrong,
              },
              pressed && !done && { backgroundColor: colors.surfaceSunken },
            ]}
          >
            {done ? (
              <PopIn trigger={done}>
                <Icon name="check" size={14} color={colors.textInverse} />
              </PopIn>
            ) : (
              <View style={[styles.markerDot, { backgroundColor: colors.borderStrong }]} />
            )}
          </Pressable>
        </View>

        <View style={styles.agendaText}>
          <View style={styles.agendaTop}>
            <AppText variant="caption" tone="muted">
              {formatTime(commitment.dueAt)}
            </AppText>
            {stateLabel ? <Badge label={stateLabel} tone="muted" /> : null}
          </View>
          <AppText
            variant="bodyMedium"
            tone={done ? 'muted' : 'primary'}
            style={done && styles.taskDone}
            numberOfLines={2}
          >
            {commitment.title}
          </AppText>
          {meta.length > 0 ? (
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {meta.join(' · ')}
            </AppText>
          ) : null}
        </View>

        <Icon name="chevronRight" size={17} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

/** Home — the day’s goals, the check-in, and a prompt into the calendar. */
export default function Home() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { profile } = useSession();
  const today = startOfDay(new Date());
  const [dayCommitments, setDayCommitments] = useState<Commitment[]>([]);
  const [overdue, setOverdue] = useState<Commitment[]>([]);
  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [unread, setUnread] = useState(0);
  const [checkInNote, setCheckInNote] = useState('');
  const [chosenStatus, setChosenStatus] = useState<CheckInStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    const from = startOfDay(new Date()).toISOString();
    const to = endOfDay(new Date()).toISOString();
    try {
      const [list, todayCheckIn, notes, open] = await Promise.all([
        api.listCommitments({ from, to }),
        api.getTodayCheckIn(),
        api.listNotifications(),
        api.listCommitments({ state: ['planned', 'in_progress', 'rescheduled'] }),
      ]);
      if (requestId.current !== id) return;

      const visible = list
        .filter((c) => c.state !== 'cancelled')
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
      const todayStart = startOfDay(new Date()).toISOString();
      setDayCommitments(visible);
      setOverdue(open.filter((c) => c.dueAt < todayStart));
      setCheckIn(todayCheckIn);
      setUnread(notes.filter((n) => !n.readAt).length);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    } catch {
      if (requestId.current === id) {
        setError('Check your connection and try again.');
      }
    } finally {
      if (requestId.current === id) setLoading(false);
    }
  }, [api]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const completedDay = dayCommitments.filter((c) => c.state === 'completed').length;
  const summary =
    dayCommitments.length === 0
      ? 'Nothing planned'
      : `${completedDay} of ${dayCommitments.length} done`;
  const firstName = profile?.displayName?.split(' ')[0] ?? 'Runner';

  const quickComplete = async (id: string) => {
    setBusy(true);
    try {
      await api.completeCommitment(id);
      await load();
      toast.show('Marked complete. +10 XP.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not complete that.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const submitCheckIn = async (status: CheckInStatus) => {
    if (chosenStatus === status && status === 'on_track') return;
    if (chosenStatus !== status) {
      setChosenStatus(status);
      if (status === 'on_track') {
        setBusy(true);
        try {
          await api.createCheckIn({ kind: 'daily', status });
          await load();
          toast.show('Check-in saved.', { tone: 'success' });
        } catch (e) {
          toast.show(e instanceof Error ? e.message : 'Could not save your check-in.', {
            tone: 'error',
          });
        } finally {
          setBusy(false);
          setChosenStatus(null);
        }
      }
      return;
    }
    setBusy(true);
    try {
      await api.createCheckIn({
        kind: 'daily',
        status,
        blocker: status !== 'on_track' ? checkInNote.trim() || undefined : undefined,
        nextAction: checkInNote.trim() || undefined,
      });
      await load();
      toast.show('Check-in saved.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not save your check-in.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
      setCheckInNote('');
      setChosenStatus(null);
    }
  };

  const openDetail = (id: string) =>
    router.push({ pathname: '/commitment/[id]', params: { id } });

  const addCommitment = () =>
    router.push({
      pathname: '/commitment/new',
      params: { date: today.toISOString() },
    });

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={refresh}
      header={
        <View style={styles.topBar}>
          <View style={styles.wordmark}>
            <CorrerGlyph size={17} color={colors.textPrimary} />
            <AppText style={styles.wordmarkText}>CORRER</AppText>
          </View>
          <View style={styles.topActions}>
            <Pressable
              onPress={() => router.push('/notifications')}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            >
              <Icon name="bell" size={19} color={colors.textPrimary} />
              {unread > 0 ? (
                <View style={styles.bellBadge}>
                  <AppText style={styles.bellBadgeText}>{unread > 9 ? '9+' : unread}</AppText>
                </View>
              ) : null}
            </Pressable>
            <Pressable
              onPress={() => router.push('/account')}
              accessibilityRole="button"
              accessibilityLabel="Account and settings"
              style={styles.avatarBtn}
            >
              <Avatar name={profile?.displayName ?? 'Runner'} size={38} />
            </Pressable>
          </View>
        </View>
      }
    >
      <Reveal>
        <View style={styles.greeting}>
          <AppText variant="overline" tone="muted">
            {formatLongDate(today).toUpperCase()}
          </AppText>
          <AppText
            variant="hero"
            accessibilityRole="header"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={styles.greetingText}
          >
            <AppText variant="heroSoft" tone="secondary">
              {`${greeting()}\n`}
            </AppText>
            {firstName}.
          </AppText>
        </View>
      </Reveal>

      <WizardResumePrompt />

      {loading ? (
        <HomeSkeleton />
      ) : (
        <>
          {error ? (
            <Card variant="muted" style={styles.errorCard} accessibilityRole="alert">
              <View style={[styles.errorIcon, { backgroundColor: colors.surface }]}>
                <Icon name="alert" size={18} color={colors.textPrimary} />
              </View>
              <AppText variant="h3">
                {hasLoaded ? 'Home could not refresh.' : 'Home could not load.'}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {error}
              </AppText>
              <Button
                label="Try again"
                variant="secondary"
                size="sm"
                fullWidth={false}
                leftIcon={<Icon name="refresh" size={16} color={colors.textPrimary} />}
                onPress={load}
                style={styles.errorAction}
              />
            </Card>
          ) : null}

          {hasLoaded ? (
            <>
              <Reveal delay={60}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open calendar. ${summary} for today.`}
                  onPress={() => router.push('/calendar')}
                  style={({ pressed }) => [
                    styles.calendarPrompt,
                    { backgroundColor: colors.surface, ...shadows.subtle },
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={[styles.calendarIcon, { backgroundColor: colors.surfaceSunken }]}>
                    <Icon name="calendar" size={18} color={colors.textPrimary} />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="bodyMedium">Today · {formatMonthDay(today)}</AppText>
                    <AppText variant="caption" tone="secondary">
                      {summary} · Open calendar
                    </AppText>
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.textMuted} />
                </Pressable>
              </Reveal>

              {overdue.length > 0 ? (
                <Reveal delay={80}>
                  <Card variant="muted" style={styles.recoveryCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.recoveryTitle}>
                        <View style={[styles.recoveryIcon, { backgroundColor: colors.surface }]}>
                          <Icon name="clock" size={17} color={colors.textPrimary} />
                        </View>
                        <View style={styles.rowText}>
                          <AppText variant="h3">Catch up</AppText>
                          <AppText variant="caption" tone="secondary">
                            {overdue.length === 1
                              ? 'One goal is past due.'
                              : `${overdue.length} goals are past due.`}
                          </AppText>
                        </View>
                      </View>
                      <Badge label="Recovery" tone="muted" />
                    </View>
                    {overdue.map((c) => (
                      <Pressable
                        key={c.id}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${c.title}`}
                        onPress={() => openDetail(c.id)}
                      >
                        {({ pressed }) => (
                          <View style={[styles.recoveryRow, pressed && styles.rowPressed]}>
                            <View style={styles.rowText}>
                              <AppText variant="bodyMedium" numberOfLines={1}>
                                {c.title}
                              </AppText>
                              <AppText variant="caption" tone="muted">
                                Was due {formatMonthDay(new Date(c.dueAt))}
                              </AppText>
                            </View>
                            <Icon name="chevronRight" size={18} color={colors.textMuted} />
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </Card>
                </Reveal>
              ) : null}

              <Reveal delay={100}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitle}>
                    <AppText variant="overline" tone="muted">
                      Today
                    </AppText>
                    <AppText variant="h2">Your goals</AppText>
                  </View>
                  <AppText variant="caption" tone="secondary">
                    {summary}
                  </AppText>
                </View>

                <View style={styles.timelineCard}>
                  {dayCommitments.length === 0 ? (
                    <View style={styles.emptyRow}>
                      <View style={styles.emptyIcon}>
                        <Icon name="sprout" size={20} color={colors.textSecondary} />
                      </View>
                      <View style={styles.rowText}>
                        <AppText variant="bodyMedium">No goals yet</AppText>
                        <AppText variant="caption" tone="secondary">
                          One clear goal is enough for this day.
                        </AppText>
                      </View>
                    </View>
                  ) : (
                    dayCommitments.map((c, index) => (
                      <AgendaRow
                        key={c.id}
                        commitment={c}
                        busy={busy}
                        isLast={index === dayCommitments.length - 1}
                        onOpen={() => openDetail(c.id)}
                        onComplete={() => quickComplete(c.id)}
                      />
                    ))
                  )}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add a goal for today"
                    onPress={addCommitment}
                    style={({ pressed }) => [styles.addRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.addIcon}>
                      <Icon name="plus" size={15} color={colors.textPrimary} />
                    </View>
                    <View style={styles.rowText}>
                      <AppText variant="bodyMedium">Add a goal</AppText>
                      <AppText variant="caption" tone="muted">
                        For today
                      </AppText>
                    </View>
                  </Pressable>
                </View>
              </Reveal>

              <Reveal delay={140}>
                <View style={styles.checkinCard}>
                  {checkIn ? (
                    <View style={styles.checkinDone}>
                      <View
                        style={[
                          styles.checkCircleDark,
                          { backgroundColor: colors.textPrimary },
                        ]}
                      >
                        <Icon name="check" size={17} color={colors.textInverse} />
                      </View>
                      <View style={styles.rowText}>
                        <AppText variant="overline" tone="muted">
                          Daily check-in
                        </AppText>
                        <AppText variant="h3">Checked in.</AppText>
                        <AppText variant="caption" tone="secondary">
                          {checkIn.status === 'on_track'
                            ? 'You’re on track today.'
                            : checkIn.status === 'struggling'
                              ? 'Pushing through a rough patch.'
                              : 'Blocked. Recovery is part of the run.'}
                        </AppText>
                      </View>
                    </View>
                  ) : (
                    <>
                      <View style={styles.checkinHeader}>
                        <View style={styles.sectionTitle}>
                          <AppText variant="overline" tone="muted">
                            Daily check-in
                          </AppText>
                          <AppText variant="h3">How are you showing up?</AppText>
                        </View>
                      </View>
                      <View style={styles.checkChoices}>
                        {CHECKIN_OPTIONS.map((opt) => (
                          <CheckInChoice
                            key={opt.key}
                            option={opt}
                            selected={chosenStatus === opt.key}
                            disabled={busy}
                            onPress={() => submitCheckIn(opt.key)}
                          />
                        ))}
                      </View>
                      {chosenStatus && chosenStatus !== 'on_track' ? (
                        <View style={styles.checkinNote} accessibilityLiveRegion="polite">
                          <AppText variant="caption" tone="secondary">
                            {chosenStatus === 'blocked'
                              ? 'What’s blocking you?'
                              : 'What would help?'}
                          </AppText>
                          <Input
                            placeholder="Optional. One line is enough."
                            value={checkInNote}
                            onChangeText={(value) =>
                              setCheckInNote(sanitizeMultiline(value, LIMITS.mediumText))
                            }
                            maxLength={LIMITS.mediumText}
                            multiline
                            textAlignVertical="top"
                            accessibilityLabel={
                              chosenStatus === 'blocked'
                                ? 'What’s blocking you?'
                                : 'What would help?'
                            }
                          />
                          <Button
                            label="Save check-in"
                            size="sm"
                            onPress={() => submitCheckIn(chosenStatus)}
                            loading={busy}
                          />
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </Reveal>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = createThemedStyles((colors) => ({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  wordmarkText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    letterSpacing: 3.2,
    color: colors.textPrimary,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    ...shadows.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: colors.brandInverse,
    fontSize: 10,
    lineHeight: 14,
  },
  greeting: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  greetingText: {
    letterSpacing: -1.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    gap: 1,
  },
  calendarPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.card,
    
  },
  calendarIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoveryCard: {
    gap: spacing.sm,
  },
  recoveryTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  recoveryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  recoveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingLeft: 50,
  },
  timelineCard: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rail: {
    width: 26,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  railLine: {
    position: 'absolute',
    top: 26,
    bottom: -spacing.md,
    width: 1,
  },
  marker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  agendaText: {
    flex: 1,
    gap: 3,
    paddingTop: 2,
  },
  agendaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taskDone: {
    textDecorationLine: 'line-through',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinCard: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  
  checkinHeader: {
    gap: spacing.xs,
  },
  checkinDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkCircleDark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkChoices: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkChoice: {
    flex: 1,
    minHeight: 64,
    borderRadius: radii.control,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  checkChoiceLabel: {
    textAlign: 'center',
  },
  checkinNote: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceSunken,
  },
  disabled: {
    opacity: 0.5,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  reviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportSection: {
    gap: spacing.sm,

  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  supportIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportDivider: {
    height: 1,
    marginLeft: 66,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  skeleton: {
    gap: spacing.xl,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  skeletonTitle: {
    gap: spacing.xs,
  },
  agendaSkeleton: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  errorCard: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  errorIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorAction: {
    marginTop: spacing.xs,
  },
  rowPressed: {
    opacity: 0.62,
  },
}));
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import type {
  AchievementDef,
  LevelName,
  Streak,
  UserAchievement,
  XPTransaction,
} from '@/core/domain';
import { LEVEL_THRESHOLDS } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Icon, type IconName } from '@/design-system/icons';
import { AnimatedNumber, Reveal } from '@/design-system/motion';
import { ProgressRing } from '@/design-system/ProgressRing';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

type AchievementRow = { def: AchievementDef; unlocked: UserAchievement | null };

function levelProgress(xp: number): {
  index: number;
  current: LevelName;
  next: LevelName | null;
  ratio: number;
  toNext: number;
} {
  let index = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i].xp) index = i;
  }
  const current = LEVEL_THRESHOLDS[index];
  const next = LEVEL_THRESHOLDS[index + 1] ?? null;
  if (!next) {
    return { index, current: current.level, next: null, ratio: 1, toNext: 0 };
  }
  const span = next.xp - current.xp;
  const ratio = span > 0 ? (xp - current.xp) / span : 1;
  return {
    index,
    current: current.level,
    next: next.level,
    ratio,
    toNext: next.xp - xp,
  };
}

const XP_ACTION_LABELS: Record<string, string> = {
  commitment_completed: 'Commitment completed',
  daily_checkin: 'Daily check-in',
  weekly_reflection: 'Weekly reflection',
  encourage_partner: 'Encouraged your partner',
  milestone_completed: 'Milestone reached',
  recovery: 'Recovered a missed day',
};

function StatTile({
  icon,
  label,
  value,
  suffix,
  delay = 0,
}: {
  icon: IconName;
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
}) {
  const colors = useColors();
  return (
    <Reveal delay={delay} style={styles.tileCell}>
      <Card
        variant="outlined"
        style={styles.tile}
        accessible
        accessibilityLabel={`${label}: ${value}${suffix ?? ''}`}
      >
        <View style={[styles.tileIcon, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name={icon} size={14} color={colors.textSecondary} />
        </View>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </AppText>
        <AnimatedNumber
          value={value}
          suffix={suffix}
          style={[styles.tileNumber, { color: colors.textPrimary }]}
        />
      </Card>
    </Reveal>
  );
}

function ProgressSkeleton() {
  return (
    <View style={styles.skeleton} accessible accessibilityLabel="Loading your progress">
      <Skeleton height={220} radius={24} />
      <View style={styles.gridRow}>
        <View style={styles.tileCell}>
          <Skeleton height={128} radius={24} />
        </View>
        <View style={styles.tileCell}>
          <Skeleton height={128} radius={24} />
        </View>
      </View>
      <Skeleton height={190} radius={24} />
      <Skeleton height={140} radius={24} />
    </View>
  );
}

/** Progress tab: streak, XP, levels, weekly momentum, achievements. */
export default function Progress() {
  const api = useApi();
  const colors = useColors();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState<LevelName>('Starter');
  const [achievements, setAchievements] = useState<AchievementRow[]>([]);
  const [transactions, setTransactions] = useState<XPTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAllAchievements, setShowAllAchievements] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const hasLoadedRef = useRef(false);
  const requestId = useRef(0);

  const load = useCallback(() => {
    const id = ++requestId.current;
    if (!hasLoadedRef.current) setLoading(true);
    setError(null);
    Promise.all([
      api.getStreak(),
      api.getXp(),
      api.getLevel(),
      api.listAchievements(),
      api.listXpTransactions(),
    ])
      .then(([s, x, l, a, t]) => {
        if (requestId.current !== id) return;
        setStreak(s);
        setXp(x);
        setLevel(l);
        setAchievements(a);
        setTransactions(t);
        hasLoadedRef.current = true;
        setHasLoaded(true);
      })
      .catch(() => {
        if (requestId.current === id) {
          setError('Check your connection and try again.');
        }
      })
      .finally(() => {
        if (requestId.current === id) setLoading(false);
      });
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const prog = levelProgress(xp);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const nextAchievement = achievements.find((a) => !a.unlocked) ?? null;

  const week = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (6 - index));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayTransactions = transactions.filter((tx) => {
      const at = new Date(tx.at);
      return at >= day && at < next;
    });
    return {
      label: day.toLocaleDateString(undefined, { weekday: 'narrow' }),
      dayName: day.toLocaleDateString(undefined, { weekday: 'long' }),
      gained: dayTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      commitments: dayTransactions.filter((tx) => tx.action === 'commitment_completed').length,
      active: dayTransactions.length > 0,
      isToday: index === 6,
    };
  });
  const activeDays = week.filter((day) => day.active).length;
  const streakDays = streak?.commitmentStreak ?? 0;
  const bestStreak = streak?.bestStreak ?? 0;
  const visibleTransactions = showAllHistory ? transactions : transactions.slice(0, 5);

  return (
    <Screen
      eyebrow="The ledger"
      title="Progress."
      subtitle="Every rep leaves a mark. Here is the evidence."
    >
      {loading ? (
        <ProgressSkeleton />
      ) : (
        <>
          {error ? (
            <Card variant="muted" style={styles.errorCard}>
              <View style={[styles.errorIcon, { backgroundColor: colors.surface }]}>
                <Icon name="alert" size={18} color={colors.textPrimary} />
              </View>
              <AppText variant="h3">
                {hasLoaded ? 'Progress could not refresh.' : 'Progress could not load.'}
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
                <Card variant="dark" style={styles.hero}>
                  <View style={styles.heroTop}>
                    <View style={styles.streakHeader}>
                      <AppText variant="overline" tone="onDarkMuted">
                        Current streak
                      </AppText>
                      {bestStreak > 0 ? (
                        <AppText variant="overline" tone="onDarkMuted">
                          Best {bestStreak}d
                        </AppText>
                      ) : null}
                    </View>
                    <View style={styles.streakRow}>
                      <AnimatedNumber
                        value={streakDays}
                        style={[styles.heroNumber, { color: colors.textOnDark }]}
                      />
                      <AppText variant="caption" tone="onDarkMuted" style={styles.streakUnit}>
                        {streakDays === 1 ? 'day' : 'days'}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.heroDivider} />

                  <View style={styles.heroBottom}>
                    <View style={styles.heroLevel}>
                      <AppText variant="overline" tone="onDarkMuted">
                        Level {prog.index + 1} of {LEVEL_THRESHOLDS.length}
                      </AppText>
                      <AppText variant="h3" tone="onDark">
                        {level}
                      </AppText>
                      <AppText variant="caption" tone="onDarkMuted">
                        {prog.next
                          ? `${prog.toNext} XP to ${prog.next}`
                          : 'Top level. Keep the streak alive.'}
                      </AppText>
                    </View>
                    <ProgressRing progress={prog.ratio} size={80} strokeWidth={6} tone="dark" />
                  </View>
                </Card>
              </Reveal>

              <View style={styles.gridRow}>
                <StatTile
                  icon="calendar"
                  label="Days active"
                  value={activeDays}
                  suffix="/7"
                  delay={100}
                />
                <StatTile icon="trophy" label="Total XP" value={xp} delay={140} />
              </View>

             

              <Reveal delay={220}>
                <Card variant="muted" style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={[styles.reviewIcon, { backgroundColor: colors.surface }]}>
                      <Icon name="sparkles" size={18} color={colors.textPrimary} />
                    </View>
                    <View style={styles.reviewText}>
                      <AppText variant="h3">Weekly review</AppText>
                      <AppText variant="caption" tone="secondary">
                        Wins, lessons, next focus. +15 XP.
                      </AppText>
                    </View>
                  </View>
                  <Button
                    label="Start review"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => router.push('/weekly')}
                  />
                </Card>
              </Reveal>

              <Reveal delay={260}>
                <Card variant="outlined">
                  <View style={styles.sectionHeader}>
                    <AppText variant="h3">Achievements</AppText>
                    <AppText variant="overline" tone="muted">
                      {unlockedCount}/{achievements.length}
                    </AppText>
                  </View>

                  {showAllAchievements ? (
                    <View style={styles.achievementList}>
                      {achievements.map(({ def, unlocked }) => (
                        <View key={def.id} style={styles.achievementRow}>
                          <View
                            style={[
                              styles.achievementMark,
                              unlocked
                                ? {
                                    backgroundColor: colors.textPrimary,
                                    borderColor: colors.textPrimary,
                                  }
                                : { borderColor: colors.borderStrong },
                            ]}
                          >
                            {unlocked ? (
                              <Icon name="check" size={12} color={colors.textInverse} />
                            ) : (
                              <Icon name="lock" size={11} color={colors.textMuted} />
                            )}
                          </View>
                          <View style={styles.achievementText}>
                            <AppText variant="bodyMedium" tone={unlocked ? 'primary' : 'muted'}>
                              {def.title}
                            </AppText>
                            <AppText variant="caption" tone={unlocked ? 'secondary' : 'muted'}>
                              {def.description}
                            </AppText>
                          </View>
                          {unlocked ? (
                            <AppText variant="overline" tone="muted">
                              {new Date(unlocked.unlockedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </AppText>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : nextAchievement ? (
                    <View style={styles.nextAchievement}>
                      <View style={[styles.achievementMark, { borderColor: colors.borderStrong }]}>
                        <Icon name="lock" size={11} color={colors.textMuted} />
                      </View>
                      <View style={styles.achievementText}>
                        <AppText variant="overline" tone="muted">
                          Next up
                        </AppText>
                        <AppText variant="bodyMedium">{nextAchievement.def.title}</AppText>
                        <AppText variant="caption" tone="secondary">
                          {nextAchievement.def.description}
                        </AppText>
                      </View>
                    </View>
                  ) : achievements.length === 0 ? (
                    <AppText variant="caption" tone="muted" style={styles.achievementEmpty}>
                      Achievements will appear here as you show up.
                    </AppText>
                  ) : (
                    <View style={styles.allUnlocked}>
                      <Icon name="checkCircle" size={18} color={colors.textPrimary} />
                      <AppText variant="bodyMedium">Every milestone unlocked.</AppText>
                    </View>
                  )}

                  {achievements.length > 0 ? (
                    <Pressable
                      onPress={() => setShowAllAchievements((value) => !value)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAllAchievements }}
                      style={({ pressed }) => [
                        styles.achievementToggle,
                        pressed && styles.linkPressed,
                      ]}
                    >
                      <AppText variant="bodyMedium">
                        {showAllAchievements ? 'Show fewer' : 'View all achievements'}
                      </AppText>
                      <Icon
                        name="chevronRight"
                        size={16}
                        color={colors.textMuted}
                        style={{
                          transform: [{ rotate: showAllAchievements ? '-90deg' : '0deg' }],
                        }}
                      />
                    </Pressable>
                  ) : null}
                </Card>
              </Reveal>

              <Reveal delay={300}>
                <Card variant="outlined">
                  <AppText variant="h3" style={styles.historyTitle}>
                    XP history
                  </AppText>
                  {transactions.length === 0 ? (
                    <AppText variant="body" tone="secondary">
                      Complete commitments, check-ins and weekly reviews to start earning XP.
                    </AppText>
                  ) : (
                    <View>
                      {visibleTransactions.map((tx) => (
                        <View key={tx.id} style={styles.txRow}>
                          <View style={styles.txText}>
                            <AppText variant="bodyMedium">
                              {XP_ACTION_LABELS[tx.action] ?? tx.action}
                            </AppText>
                            <AppText variant="caption" tone="muted">
                              {new Date(tx.at).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </AppText>
                          </View>
                          <AppText variant="bodyBold">+{tx.amount}</AppText>
                        </View>
                      ))}
                    </View>
                  )}

                  {transactions.length > 5 ? (
                    <Pressable
                      onPress={() => setShowAllHistory((value) => !value)}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAllHistory }}
                      style={({ pressed }) => [styles.historyToggle, pressed && styles.linkPressed]}
                    >
                      <AppText variant="bodyMedium">
                        {showAllHistory ? 'Show fewer' : `View all ${transactions.length} entries`}
                      </AppText>
                      <Icon
                        name="chevronRight"
                        size={16}
                        color={colors.textMuted}
                        style={{ transform: [{ rotate: showAllHistory ? '-90deg' : '0deg' }] }}
                      />
                    </Pressable>
                  ) : null}
                </Card>
              </Reveal>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.xl,
  },
  gridRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tileCell: {
    flex: 1,
  },
  tile: {
    gap: spacing.xs,
    minHeight: 128,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tileNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -1.2,
  },
  hero: {
    gap: spacing.lg,
  },
  heroTop: {
    gap: spacing.xs,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  heroNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1.4,
  },
  streakUnit: {
    paddingBottom: 6,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroLevel: {
    flex: 1,
    gap: spacing.xs,
  },
  weekCard: {
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  weekEmpty: {
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAction: {
    marginTop: spacing.sm,
  },
  reviewCard: {
    gap: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  reviewIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: {
    flex: 1,
    gap: 2,
  },
  nextAchievement: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  achievementList: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  achievementMark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementText: {
    flex: 1,
    gap: 2,
  },
  achievementEmpty: {
    marginTop: spacing.sm,
  },
  allUnlocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  achievementToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.md,
  },
  historyTitle: {
    marginBottom: spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  txText: {
    flex: 1,
    gap: 2,
  },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.xs,
  },
  linkPressed: {
    opacity: 0.55,
  },
  errorCard: {
    gap: spacing.sm,
  },
  errorIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorAction: {
    marginTop: spacing.sm,
  },
});

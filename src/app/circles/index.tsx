import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { formatDateRange } from '@/core/dates';
import type { Challenge, Circle } from '@/core/domain';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { EmptyState } from '@/design-system/EmptyState';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { Icon } from '@/design-system/icons';
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

/** Circles hub (Phase 6) — small groups, posts and shared challenges. */
export default function Circles() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { session } = useSession();
  const [circles, setCircles] = useState<Circle[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [joinedChallenges, setJoinedChallenges] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      const request = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      try {
        const [c, ch] = await Promise.all([api.listCircles(), api.listChallenges()]);
        if (request !== requestId.current) return;
        setCircles(c);
        setChallenges(ch);
        setLoadError(null);
      } catch {
        if (request === requestId.current) {
          setLoadError('We could not load circles. Check your connection and try again.');
        }
      } finally {
        if (request === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [api],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const create = async () => {
    const circleName = name.trim();
    if (!isTitle(circleName, 2, LIMITS.nameMax)) {
      setNameError(VALIDATION_COPY.title);
      toast.show('Check the circle name.', { tone: 'error' });
      return;
    }
    setBusy(true);
    setNameError(null);
    setFormError(null);
    try {
      const circle = await api.createCircle(
        circleName,
        sanitizeMultiline(description.trim(), LIMITS.shortText),
        isPrivate,
      );
      setShowCreate(false);
      setName('');
      setDescription('');
      toast.show('Circle created.', { tone: 'success' });
      router.push({ pathname: '/circles/[id]', params: { id: circle.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setFormError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const join = async (circleId: string) => {
    try {
      await api.joinCircle(circleId);
      setCircles(await api.listCircles());
      toast.show('Joined the circle.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not join that circle.', {
        tone: 'error',
      });
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      await api.joinChallenge(challengeId);
      setJoinedChallenges((prev) => [...prev, challengeId]);
      toast.show('Challenge joined.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not join that challenge.', {
        tone: 'error',
      });
    }
  };

  if (loading) {
    return (
      <Screen back="push" title="Circles">
        <Skeleton height={110} />
        <Skeleton height={130} />
        <Skeleton height={130} />
      </Screen>
    );
  }

  if (loadError && circles.length === 0 && challenges.length === 0) {
    return (
      <Screen
        back="push"
        title="Circles"
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <EmptyState
          icon="people"
          title="We could not load circles"
          description={loadError}
          actionLabel="Try again"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      back="push"
      title="Circles"
      subtitle="Small groups that run together. Wins, check-ins and shared challenges."
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loadError ? (
        <Card variant="muted">
          <AppText variant="bodyMedium">Could not refresh circles.</AppText>
          <AppText variant="caption" tone="secondary" style={styles.errorCopy}>
            {loadError}
          </AppText>
          <Button
            label="Try again"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={() => load()}
            style={styles.errorBtn}
          />
        </Card>
      ) : null}

      {challenges.length > 0 ? (
        <Card variant="dark">
          <View style={styles.challengeHeader}>
            <AppText variant="h3" tone="inverse">
              Challenges
            </AppText>
            <AppText variant="overline" tone="onDarkMuted">
              {challenges.length} active
            </AppText>
          </View>
          {challenges.map((ch) => {
            const joinedAlready =
              joinedChallenges.includes(ch.id) ||
              Boolean(session?.user.id && ch.participantIds.includes(session.user.id));
            return (
              <View key={ch.id} style={styles.challenge}>
                <View style={styles.challengeText}>
                  <View style={styles.challengeTitle}>
                    <AppText variant="bodyBold" tone="inverse" style={styles.challengeName}>
                      {ch.title}
                    </AppText>
                    <Badge label={`+${ch.xpBonus} XP`} tone="progress" />
                  </View>
                  <AppText variant="caption" tone="onDarkMuted">
                    {ch.description}
                  </AppText>
                  <AppText variant="caption" tone="onDarkMuted">
                    {formatDateRange(ch.startAt, ch.endAt)}
                  </AppText>
                </View>
                <Button
                  label={joinedAlready ? 'Joined' : 'Join'}
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  disabled={joinedAlready}
                  leftIcon={
                    joinedAlready ? (
                      <Icon name="check" size={16} color={colors.textPrimary} />
                    ) : undefined
                  }
                  onPress={() => joinChallenge(ch.id)}
                />
              </View>
            );
          })}
        </Card>
      ) : null}

      <View style={styles.sectionHeader}>
        <AppText variant="h3">Discover</AppText>
        <Chip
          label={showCreate ? 'Close' : '+ New circle'}
          selected={showCreate}
          onPress={() => setShowCreate((s) => !s)}
        />
      </View>

      {showCreate ? (
        <Card variant="outlined">
          <Input
            label="Circle name"
            placeholder="e.g. Dawn Runners"
            value={name}
            onChangeText={(value) => {
              setName(sanitizeSingleLine(value, LIMITS.nameMax));
              setNameError(null);
              setFormError(null);
            }}
            maxLength={LIMITS.nameMax}
            returnKeyType="next"
            error={nameError ?? undefined}
          />
          <Input
            label="What’s it about?"
            placeholder="Who runs here and why…"
            value={description}
            onChangeText={(value) => {
              setDescription(sanitizeMultiline(value, LIMITS.shortText));
              setFormError(null);
            }}
            containerStyle={styles.createGap}
            maxLength={LIMITS.shortText}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.privacyBlock}>
            <AppText variant="bodyMedium">Who can join?</AppText>
            <AppText variant="caption" tone="secondary">
              {isPrivate
                ? 'Invite only. The circle stays out of Discover.'
                : 'Anyone can find and join this circle.'}
            </AppText>
            <View style={styles.privacyChoices}>
              <Chip
                label="Public"
                selected={!isPrivate}
                onPress={() => setIsPrivate(false)}
              />
              <Chip
                label="Private"
                selected={isPrivate}
                onPress={() => setIsPrivate(true)}
              />
            </View>
          </View>
          {formError ? (
            <AppText variant="caption" tone="error" style={styles.createGap}>
              {formError}
            </AppText>
          ) : null}
          <Button label="Create circle" onPress={create} loading={busy} style={styles.createGap} />
        </Card>
      ) : null}

      {circles.length === 0 && !showCreate ? (
        <EmptyState
          icon="people"
          title="No circles yet"
          description="Create one for your community, like a church group, classmates, or coworkers. Or join a public circle."
          actionLabel="Create a circle"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        circles.map((c) => {
          const isMine = c.viewerIsMember || c.ownerId === session?.user.id;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${c.name}`}
              onPress={() =>
                router.push({ pathname: '/circles/[id]', params: { id: c.id } })
              }
            >
              {({ pressed }) => (
                <Card variant={pressed ? 'sunken' : 'outlined'} style={styles.circleCard}>
                  <View style={styles.circleHeader}>
                    <AppText variant="h3" style={styles.circleTitle}>
                      {c.name}
                    </AppText>
                    <Badge label={c.isPrivate ? 'Private' : 'Public'} tone="muted" />
                  </View>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {c.description}
                  </AppText>
                  <View style={styles.circleFooter}>
                    <AppText variant="caption" tone="muted">
                      {c.memberCount} members
                    </AppText>
                    {isMine ? (
                      <View style={styles.joinedRow}>
                        <Icon name="check" size={14} color={colors.progress} />
                        <AppText variant="caption" tone="progress">
                          Joined
                        </AppText>
                      </View>
                    ) : (
                      <Chip label="Join" selected={false} onPress={() => join(c.id)} />
                    )}
                  </View>
                </Card>
              )}
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  challenge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  challengeText: {
    flex: 1,
    gap: 4,
  },
  challengeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  challengeName: {
    flex: 1,
  },
  errorCopy: {
    marginTop: spacing.xs,
  },
  errorBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  createGap: {
    marginTop: spacing.md,
  },
  privacyBlock: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  privacyChoices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  circleCard: {
    gap: spacing.sm,
  },
  circleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  circleTitle: {
    flex: 1,
  },
  circleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  joinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});

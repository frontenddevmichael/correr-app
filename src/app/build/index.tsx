import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { friendlyErrorMessage } from '@/api/errorMessage';
import { formatDateRange } from '@/core/dates';
import type { Hackathon } from '@/core/domain';
import { Badge } from '@/design-system/Badge';
import type { BadgeTone } from '@/design-system/Badge';
import { Card } from '@/design-system/Card';
import { EmptyState } from '@/design-system/EmptyState';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { Icon } from '@/design-system/icons';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

const STATUS_TONES: Record<Hackathon['status'], BadgeTone> = {
  upcoming: 'info',
  active: 'progress',
  ended: 'muted',
};

/** Correr Build hub (Phase 7) — hackathon-style sprints run as teams. */
export default function BuildHub() {
  const api = useApi();
  const colors = useColors();
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const list = await api.listHackathons();
      setHackathons(list);
      setLoadError(null);
    } catch (err) {
      setLoadError(friendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void fetchList();
    }, [fetchList]),
  );

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    void fetchList();
  };

  if (loading) {
    return (
      <Screen back="push" title="Correr Build">
        <Skeleton height={160} />
        <Skeleton height={160} />
      </Screen>
    );
  }

  return (
    <Screen back="push"
      title="Correr Build"
      subtitle="Timed build sprints. Form a team, run daily commitments, ship something real."
    >
      {loadError ? (
        <EmptyState
          icon="wrench"
          title="Couldn’t load sprints."
          description={loadError}
          actionLabel="Try again"
          onAction={retryLoad}
        />
      ) : hackathons.length === 0 ? (
        <EmptyState
          icon="wrench"
          title="No sprints yet"
          description="Correr Build sprints will appear here when they’re announced."
        />
      ) : (
        hackathons.map((h) => (
          <Pressable
            key={h.id}
            onPress={() => router.push({ pathname: '/build/[id]', params: { id: h.id } })}
          >
            {({ pressed }) => (
              <Card variant={pressed ? 'sunken' : 'dark'} style={styles.card}>
                <View style={styles.header}>
                  <AppText variant="h3" tone="inverse" style={styles.title}>
                    {h.name}
                  </AppText>
                  <Badge label={h.status} tone={STATUS_TONES[h.status]} />
                </View>
                <AppText variant="body" tone="inverse">
                  {h.description}
                </AppText>
                <AppText variant="caption" tone="onDarkMuted">
                  {formatDateRange(h.startAt, h.endAt)}
                </AppText>
                <AppText variant="caption" tone="inverse">
                  {h.rules}
                </AppText>
                <View style={styles.openRow}>
                  <AppText variant="caption" tone="inverse">
                    View sprint
                  </AppText>
                  <Icon name="chevronRight" size={15} color={colors.textOnDark} />
                </View>
              </Card>
            )}
          </Pressable>
        ))
      )}

      <View style={styles.howBlock}>
        <AppText variant="overline" tone="muted" style={styles.sectionLabel}>
          How a sprint runs
        </AppText>
        <Card variant="outlined" padded={false}>
          {[
            ['1', 'Form a team', 'Create a crew of 2 to 4 or join with an invite code.'],
            ['2', 'Run the sprint', 'Daily standups become commitments you check in on.'],
            ['3', 'Ship the demo', 'Submit what you built and get judge feedback.'],
          ].map(([step, title, detail]) => (
            <View key={step} style={styles.howRow}>
              <View style={[styles.howNumber, { backgroundColor: colors.surfaceSunken }]}>
                <AppText variant="caption" tone="secondary">
                  {step}
                </AppText>
              </View>
              <View style={styles.howText}>
                <AppText variant="bodyMedium">{title}</AppText>
                <AppText variant="caption" tone="muted">
                  {detail}
                </AppText>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    flex: 1,
  },
  openRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.xs,
  },
  howBlock: {
    gap: spacing.md,
  },
  sectionLabel: {
    marginTop: spacing.sm,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  howNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  howText: {
    flex: 1,
    gap: 2,
  },
});

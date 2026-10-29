import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { dayKeyForTimezone } from '@/core/date';
import type { CampusAggregateMetric } from '@/core/domain';
import { Badge } from '@/design-system/Badge';
import { Card } from '@/design-system/Card';
import { EmptyState } from '@/design-system/EmptyState';
import { ProgressBar } from '@/design-system/ProgressBar';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

function currentPeriod(timezone?: string): string {
  return dayKeyForTimezone(timezone ?? 'UTC').slice(0, 7);
}

/** Campus dashboard (Phase 8) — aggregate-only metrics, never row-level student data. */
export default function CampusDashboard() {
  const api = useApi();
  const { profile } = useSession();
  const orgId = profile?.campusOrgId;
  const timezone = profile?.timezone;
  const canViewCampus =
    !!orgId &&
    (profile?.campusRole === 'staff' || profile?.campusRole === 'admin');
  const [metrics, setMetrics] = useState<CampusAggregateMetric | null>(null);
  const [loadedOrgId, setLoadedOrgId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!orgId || !canViewCampus) return;
    api
      .getMetrics(orgId, currentPeriod(timezone))
      .then((m) => {
        if (!active) return;
        setMetrics(m);
        setError(null);
        setLoadedOrgId(orgId);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setMetrics(null);
        setError(e instanceof Error ? e.message : 'Campus data is unavailable.');
        setLoadedOrgId(orgId);
      });
    return () => {
      active = false;
    };
  }, [api, orgId, timezone, canViewCampus]);

  if (!canViewCampus) {
    return (
      <Screen back="close" title="Campus dashboard">
        <EmptyState
          icon="school"
          title="Campus access needed"
          description="This dashboard is for campus staff. Ask your campus admin to link your account."
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  if (loadedOrgId !== orgId) {
    return (
      <Screen back="close" title="Campus dashboard">
        <Skeleton height={120} />
        <Skeleton height={200} />
      </Screen>
    );
  }

  if (!metrics) {
    return (
      <Screen back="close" title="Campus dashboard">
        <EmptyState
          icon="school"
          title={error ? 'Campus data is unavailable' : 'No reportable cohort yet'}
          description={error ?? 'Aggregates only appear once at least 10 students are active. Small groups are never shown, which protects everyone’s privacy.'}
          actionLabel="Back"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const rows: { label: string; value: number; caption: string }[] = [
    { label: 'Activation rate', value: metrics.activationRate, caption: 'Students active in their first week' },
    { label: 'Weekly retention', value: metrics.weeklyRetention, caption: 'Still running in week 4' },
    { label: 'Commitment completion', value: metrics.completionRate, caption: 'Commitments completed vs planned' },
    { label: 'Recovery rate', value: metrics.recoveryRate, caption: 'Missed commitments recovered' },
  ];

  return (
    <Screen back="close"
      title="Campus dashboard"
      subtitle={`Your campus · ${metrics.period} · aggregate only`}
      header={
        <View style={styles.privacyRow}>
          <Badge label={`Cohort ≥ 10 enforced (${metrics.cohortSize})`} tone="info" dot />
        </View>
      }
    >
      <Card variant="dark" style={styles.heroCard}>
        <AppText variant="overline" tone="inverse">
          Active students
        </AppText>
        <AppText variant="display" tone="inverse">
          {metrics.activeStudents}
        </AppText>
        <AppText variant="caption" tone="onDarkMuted">
          Binned, anonymous counts. Never individual activity.
        </AppText>
      </Card>

      {rows.map((r) => (
        <Card key={r.label} variant="outlined">
          <View style={styles.rowHeader}>
            <AppText variant="h3">{r.label}</AppText>
            <AppText variant="title" tone="progress">
              {Math.round(r.value * 100)}%
            </AppText>
          </View>
          <ProgressBar progress={r.value} tone="progress" height={8} />
          <AppText variant="caption" tone="muted">
            {r.caption}
          </AppText>
        </Card>
      ))}

      <Card variant="sunken">
        <AppText variant="bodyBold">Privacy by construction</AppText>
        <AppText variant="caption" tone="secondary">
          Reports suppress any cohort smaller than 10 students. No names, no individual        commitments, no vision text ever leaves the student’s account.
      </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  privacyRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  heroCard: {
    gap: spacing.xs,
    padding: spacing.xl,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
});

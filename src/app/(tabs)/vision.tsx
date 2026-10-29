import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import type { Vision as VisionType } from '@/core/domain';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { EmptyState } from '@/design-system/EmptyState';
import { Icon } from '@/design-system/icons';
import { MotionPressable, Reveal } from '@/design-system/motion';
import { ProgressRing } from '@/design-system/ProgressRing';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { VisionEmptyState } from '@/features/vision/VisionEmptyArt';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

const CATEGORY_LABELS: Record<string, string> = {
  career: 'Career',
  education: 'Education',
  health: 'Health',
  finance: 'Finance',
  creativity: 'Creativity',
  relationships: 'Relationships',
  faith: 'Faith',
  business: 'Business',
  other: 'Other',
};

function openVision(id: string) {
  router.push({ pathname: '/vision/[id]', params: { id } });
}

/** Vision tab — an atlas: one featured future, then the quiet rest. */
export default function Vision() {
  const api = useApi();
  const colors = useColors();
  const [active, setActive] = useState<VisionType[]>([]);
  const [past, setPast] = useState<VisionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      const request = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      try {
        const [a, completed, archived] = await Promise.all([
          api.listVisions('active'),
          api.listVisions('completed'),
          api.listVisions('archived'),
        ]);
        if (request !== requestId.current) return;
        setActive(a);
        setPast([...completed, ...archived]);
        setError(null);
      } catch {
        if (request === requestId.current) {
          setError('We could not load your atlas. Check your connection and try again.');
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

  const create = () => router.push('/vision/new');

  if (loading) {
    return (
      <Screen eyebrow="The atlas" title="Your vision.">
        <View style={styles.loading}>
          <Skeleton height={220} />
          <Skeleton height={84} />
          <Skeleton height={84} />
        </View>
      </Screen>
    );
  }

  if (error && active.length === 0 && past.length === 0) {
    return (
      <Screen
        eyebrow="The atlas"
        title="Your vision."
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <EmptyState
          icon="compass"
          title="We could not load your atlas"
          description={error}
          actionLabel="Try again"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  if (active.length === 0 && past.length === 0) {
    return (
      <Screen
        eyebrow="The atlas"
        title="Your vision."
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <VisionEmptyState />
      </Screen>
    );
  }

  const featured = active[0];
  const rest = active.slice(1);

  return (
    <Screen
      eyebrow="The atlas"
      title="Your vision."
      subtitle={
        active.length === 0
          ? 'Nothing active right now. Your past work is below.'
          : `${active.length} ${active.length === 1 ? 'future' : 'futures'} in motion${
              past.length ? ` · ${past.length} archived` : ''
            }.`
      }
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {error ? (
        <Card variant="muted">
          <AppText variant="bodyMedium">We could not refresh your atlas.</AppText>
          <AppText variant="caption" tone="secondary" style={styles.errorCopy}>
            {error}
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

      {featured ? (
        <Reveal>
          <MotionPressable
            onPress={() => openVision(featured.id)}
            accessibilityLabel={`Open vision ${featured.title}`}
          >
            <Card variant="dark" padded={false} style={styles.hero}>
              <View style={styles.heroTop}>
                <AppText variant="overline" tone="inverse" style={styles.dim}>
                  Featured · {CATEGORY_LABELS[featured.category] ?? featured.category}
                </AppText>
                <View style={styles.heroTopActions}>
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: '/vision/new', params: { id: featured.id } })
                    }
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit vision ${featured.title}`}
                    style={({ pressed }) => [styles.heroEdit, pressed && styles.heroEditPressed]}
                  >
                    <Icon name="pencil" size={15} color={colors.textOnDark} />
                  </Pressable>
                  <Icon name="chevronRight" size={18} color={colors.textOnDark} />
                </View>
              </View>

              <View style={styles.heroMain}>
                <View style={styles.heroText}>
                  <AppText variant="title" tone="inverse">
                    {featured.title}
                  </AppText>
                  {featured.description ? (
                    <AppText
                      variant="caption"
                      tone="inverse"
                      numberOfLines={3}
                      style={[styles.dim, styles.heroDescription]}
                    >
                      {featured.description}
                    </AppText>
                  ) : null}
                </View>
                <ProgressRing
                  progress={featured.progressPercent / 100}
                  size={92}
                  strokeWidth={6}
                  tone="dark"
                />
              </View>

              <View style={styles.heroFooter}>
                <AppText variant="overline" tone="inverse" style={styles.dim}>
                  {featured.targetTimeframe ?? 'Open-ended'}
                </AppText>
                <View style={styles.heroCta}>
                  <AppText variant="caption" tone="inverse">
                    Open the roadmap
                  </AppText>
                  <Icon name="chevronRight" size={15} color={colors.textOnDark} />
                </View>
              </View>
            </Card>
          </MotionPressable>
        </Reveal>
      ) : (
        <Reveal>
          <Card variant="muted" style={styles.noActive}>
            <AppText variant="h3">No future in motion.</AppText>
            <AppText variant="caption" tone="secondary">
              Your archived visions are below. Start a new one to give the runner something to
              chase.
            </AppText>
            <Button
              label="Create a vision"
              variant="secondary"
              size="sm"
              onPress={create}
              style={styles.noActiveBtn}
            />
          </Card>
        </Reveal>
      )}

      {rest.length > 0 ? (
        <Reveal delay={80}>
          <View style={styles.list}>
            {rest.map((vision) => (
              <MotionPressable
                key={vision.id}
                onPress={() => openVision(vision.id)}
                accessibilityLabel={`Open vision ${vision.title}`}
              >
                <Card variant="filled" style={styles.row}>
                  <ProgressRing
                    progress={vision.progressPercent / 100}
                    size={46}
                    strokeWidth={3.5}
                    showValue={false}
                  >
                    <AppText style={[styles.miniValue, { color: colors.textPrimary }]}>
                      {vision.progressPercent}
                    </AppText>
                  </ProgressRing>
                  <View style={styles.rowText}>
                    <AppText variant="h3" numberOfLines={2}>
                      {vision.title}
                    </AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {CATEGORY_LABELS[vision.category] ?? vision.category}
                      {vision.targetTimeframe ? ` · ${vision.targetTimeframe}` : ''}
                    </AppText>
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.textMuted} />
                </Card>
              </MotionPressable>
            ))}
          </View>
        </Reveal>
      ) : null}

      {past.length > 0 ? (
        <Reveal delay={140}>
          <View style={styles.pastBlock}>
            <AppText variant="overline" tone="muted" style={styles.sectionLabel}>
              The archive
            </AppText>
            <Card variant="muted" padded={false}>
              {past.map((vision, index) => (
                <MotionPressable
                  key={vision.id}
                  onPress={() => openVision(vision.id)}
                  accessibilityLabel={`Open archived vision ${vision.title}`}
                >
                  <View style={styles.pastRow}>
                    <View
                      style={[
                        styles.pastMark,
                        {
                          borderColor:
                            vision.status === 'completed'
                              ? colors.textPrimary
                              : colors.borderStrong,
                        },
                        vision.status === 'completed' && { backgroundColor: colors.textPrimary },
                      ]}
                    >
                      {vision.status === 'completed' ? (
                        <Icon name="check" size={12} color={colors.textInverse} />
                      ) : null}
                    </View>
                    <View style={styles.rowText}>
                      <AppText variant="bodyMedium" numberOfLines={1}>
                        {vision.title}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {vision.status === 'completed' ? 'Completed' : 'Archived'} ·{' '}
                        {vision.progressPercent}%
                      </AppText>
                    </View>
                    <Icon name="chevronRight" size={16} color={colors.textMuted} />
                  </View>
                </MotionPressable>
              ))}
            </Card>
          </View>
        </Reveal>
      ) : null}

    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: spacing.lg,
  },
  errorCopy: {
    marginTop: spacing.xs,
  },
  errorBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  hero: {
    padding: spacing.xxl,
    gap: spacing.lg,
    minHeight: 236,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  heroTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  heroEdit: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroEditPressed: {
    opacity: 0.6,
  },
  dim: {
    opacity: 0.62,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  heroText: {
    flex: 1,
    gap: spacing.sm,
  },
  heroDescription: {
    maxWidth: 240,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.16)',
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  noActive: {
    gap: spacing.sm,
  },
  noActiveBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  miniValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.3,
  },
  pastBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    marginLeft: spacing.xs,
  },
  pastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pastMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

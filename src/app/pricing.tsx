import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useApi } from '@/api/ApiProvider';
import { friendlyErrorMessage } from '@/api/errorMessage';
import { formatMonthDay } from '@/core/dates';
import type { Subscription } from '@/core/domain';
import { Badge } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { useConfirm } from '@/design-system/confirm';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { Icon } from '@/design-system/icons';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

const FREE_FEATURES = [
  'One active vision with a full AI roadmap',
  'Daily commitments, check-ins and streaks',
  'One accountability partner',
  'AI coach (standard depth)',
  'Join public circles',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited visions and roadmaps',
  'Advanced AI coach + plan adjustments',
  'Unlimited circles and challenges',
  'Priority weekly insights',
  'Correr Build team features',
];

/** Billing (Phase 8) — mock checkout until real payments are configured. */
export default function Pricing() {
  const api = useApi();
  const confirm = useConfirm();
  const colors = useColors();
  const toast = useToast();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getSubscription()
      .then((s) => {
        if (!active) return;
        setSub(s);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(friendlyErrorMessage(err));
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [api]);

  const act = async (action: 'pro' | 'cancel') => {
    setBusy(true);
    setError(null);
    try {
      const next = action === 'pro' ? await api.subscribe('pro') : await api.cancelSubscription();
      setSub(next);
      toast.show(action === 'pro' ? 'You’re on Pro.' : 'Subscription cancelled.', {
        tone: 'success',
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    confirm(
      'Cancel Pro?',
      'You keep Pro until the end of the current period. You can re-subscribe anytime.',
      [
        { text: 'Keep Pro', style: 'cancel' },
        { text: 'Cancel subscription', style: 'destructive', onPress: () => act('cancel') },
      ],
    );
  };

  if (loading) {
    return (
      <Screen back="close" title="Correr Pro">
        <Skeleton height={220} />
        <Skeleton height={320} />
      </Screen>
    );
  }

  const isPro = sub?.plan === 'pro' && sub.status === 'active';

  return (
    <Screen back="close"
      title="Correr Pro"
      subtitle="Run free forever. Pro removes the limits when your vision needs them."
    >
      <Card variant="dark" style={styles.statusCard}>
        <View style={styles.statusRow}>
          <AppText variant="overline" tone="inverse">
            Current plan
          </AppText>
          <Badge label={isPro ? 'Pro' : 'Free'} tone={isPro ? 'progress' : 'muted'} />
        </View>
        <AppText variant="h2" tone="inverse">
          {isPro ? 'You’re on Pro' : 'Free plan'}
        </AppText>
        <AppText variant="caption" tone="onDarkMuted">
          {isPro && sub?.renewsAt
            ? `Renews ${formatMonthDay(new Date(sub.renewsAt))} · mock billing`
            : 'No card required.'}
        </AppText>
      </Card>

      <Card variant="outlined" style={styles.planCard}>
        <View style={styles.planHeader}>
          <AppText variant="h3">Free</AppText>
          <AppText variant="title">$0</AppText>
        </View>
        <View style={styles.features}>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Icon name="check" size={18} color={colors.progress} />
              <AppText variant="body" tone="secondary" style={styles.featureText}>
                {f}
              </AppText>
            </View>
          ))}
        </View>
        {!isPro ? (
          <Badge label="Your plan" tone="info" style={styles.planBadge} />
        ) : null}
      </Card>

      <Card variant="dark" style={styles.planCard}>
        <View style={styles.planHeader}>
          <AppText variant="h3" tone="inverse">
            Pro
          </AppText>
          <AppText variant="title" tone="inverse">
            $6/mo
          </AppText>
        </View>
        <View style={styles.features}>
          {PRO_FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Icon name="check" size={18} color={colors.textOnDarkMuted} />
              <AppText variant="body" tone="inverse" style={styles.featureText}>
                {f}
              </AppText>
            </View>
          ))}
        </View>
        {isPro ? (
          <View style={styles.planActions}>
            <Badge label="Active" tone="progress" style={styles.planBadge} />
            <Button
              label="Cancel subscription"
              variant="secondary"
              onPress={cancel}
              loading={busy}
            />
          </View>
        ) : (
          <Button
            label="Upgrade to Pro"
            variant="secondary"
            onPress={() => act('pro')}
            loading={busy}
            style={styles.upgradeBtn}
          />
        )}
      </Card>

      {error ? (
        <AppText variant="caption" tone="error">
          {error}
        </AppText>
      ) : null}

      <AppText variant="caption" tone="muted" center>
        Demo billing. No real charge. Stripe plugs in behind this same screen.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    gap: spacing.sm,
    padding: spacing.xl,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planCard: {
    gap: spacing.md,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  features: {
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  featureText: {
    flex: 1,
  },
  planBadge: {
    alignSelf: 'flex-start',
  },
  planActions: {
    gap: spacing.sm,
  },
  upgradeBtn: {
    marginTop: spacing.sm,
  },
});

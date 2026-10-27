import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, Share, StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import { Avatar } from '@/design-system/Avatar';
import { Badge } from '@/design-system/Badge';
import { Card } from '@/design-system/Card';
import { Icon, type IconName } from '@/design-system/icons';
import { MotionPressable, Reveal } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/**
 * Account — the reference layout, in Correr's design language.
 *
 * Structure mirrors the reference screen: a large name with an avatar and a
 * level badge, a row of three quick-action tiles, a privacy card, then a quiet
 * settings list. Every colour, radius and font comes from theme tokens, so it
 * tracks light/dark and the user's accent rather than the reference's hardcoded
 * palette. Meaning is carried by copy and icon shape, not hue (monochrome).
 */

type QuickTile = { title: string; caption: string; icon: IconName; route: () => void };
type ListRow = {
  title: string;
  caption?: string;
  icon: IconName;
  route: () => void;
  danger?: boolean;
};
type ExploreRow = { title: string; caption: string; icon: IconName; route: '/circles' | '/build' | '/pricing' | '/campus' | '/accountability' };

const push = (href: Parameters<typeof router.push>[0]) => () => router.push(href);

/**
 * Explore destinations — moved here from Settings so the Settings screen owns
 * preferences only. This is the product's hub: profile first, then the wider
 * Correr world.
 */
const EXPLORE: ExploreRow[] = [
  { title: 'Circles', caption: 'Small group runs', icon: 'people', route: '/circles' },
  { title: 'Correr Build', caption: 'Timed team sprints', icon: 'wrench', route: '/build' },
  { title: 'Correr Pro', caption: 'Plans and billing', icon: 'bulb', route: '/pricing' },
  { title: 'Campus', caption: 'Cohort dashboard', icon: 'school', route: '/campus' },
  { title: 'Accountability partner', caption: 'Your daily check-in buddy', icon: 'people', route: '/accountability' },
];

export default function Account() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { session, profile, refresh } = useSession();
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [refresh]),
  );

  const name = profile?.displayName ?? 'Runner';
  const level = profile?.level ?? 'Starter';
  const xp = profile?.xp ?? 0;

  // ---------- data export (GDPR/NDPR art. 15/20 + Apple requirement) ----------
  const onExportData = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const data = await api.exportData();
      const json = JSON.stringify(data, null, 2);
      if (Platform.OS === 'web') {
        const nav = (globalThis as unknown as {
          navigator?: { clipboard?: { writeText(text: string): Promise<void> } };
        }).navigator;
        if (nav?.clipboard) {
          await nav.clipboard.writeText(json);
          toast.show('Export copied to your clipboard.', { tone: 'success' });
        } else {
          toast.show('This browser blocked clipboard access — try a native build.', {
            tone: 'error',
          });
        }
      } else {
        await Share.share({ message: json, title: 'My Correr data export' });
      }
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not export your data.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  // ---------- account deletion (Apple requires this in-app) ----------
  const onDeleteAccount = () => {
    if (busy) return;
    Alert.alert(
      'Delete your account?',
      'This permanently removes your profile, visions, roadmap, commitments, messages and progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteAccount();
              await api.signOut().catch(() => {});
              refresh().catch(() => {});
              toast.show('Your account and data have been deleted.', { tone: 'success' });
              router.replace('/(auth)/welcome');
            } catch (e) {
              toast.show(
                e instanceof Error ? e.message : 'Could not delete your account.',
                { tone: 'error' },
              );
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const tiles: QuickTile[] = [
    { title: 'Partner', caption: 'Accountability', icon: 'people', route: push('/accountability') },
    { title: 'Wallet', caption: 'Correr Pro', icon: 'wallet', route: push('/pricing') },
    { title: 'Activity', caption: 'Your progress', icon: 'chart', route: push('/(tabs)/progress') },
  ];

  const rows: ListRow[] = [
    { title: 'Settings', caption: 'Appearance, notifications, account', icon: 'gear', route: push('/settings') },
    { title: 'Messages', caption: 'Coach & partner activity', icon: 'inbox', route: push('/notifications') },
    { title: 'Edit profile', caption: 'Name, timezone, reminders', icon: 'person', route: push('/(onboarding)/profile-setup') },
    { title: 'Legal', caption: 'Privacy, terms & disclosures', icon: 'doc', route: push('/legal') },
    { title: 'Export my data', caption: busy ? 'Preparing…' : 'Download everything we store about you', icon: 'send', route: () => void onExportData() },
    {
      title: 'Delete account',
      caption: 'Permanently remove your account and data',
      icon: 'trash',
      route: onDeleteAccount,
      danger: true,
    },
  ];

  const onSignOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      // One tap: await the actual sign-out before touching navigation, so the
      // token is cleared and the server session revoked first. A failure here
      // used to be swallowed, leaving the session alive while the router
      // bounced back into the app — which is what made sign-out take 2–3 taps.
      // Bound it too: a hung authenticatedCall used to freeze `busy` and eat
      // the next taps.
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('Sign-out timed out. Check your connection and try again.')),
          8000,
        );
      });
      try {
        await Promise.race([api.signOut(), timeout]);
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      setBusy(false);
      toast.show(
        e instanceof Error ? e.message : 'Sign-out failed. Check your connection and try again.',
        { tone: 'error' },
      );
      return;
    }
    // Sync provider state so the gate can never bounce us back, then go
    // straight to welcome — no intermediate redirect race.
    try {
      await refresh();
    } catch {
      // getSession already degrades to null on failure.
    } finally {
      setBusy(false);
      router.replace('/(auth)/welcome');
    }
  };

  return (
    <Screen back="push" eyebrow="Account" title="Account." subtitle="You, your plan, and the levers that control Correr.">
      {/* Header: big name + avatar + level badge */}
      <Reveal>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <AppText variant="mega" numberOfLines={1} style={styles.name}>
              {name}
            </AppText>
            <View style={styles.badges}>
              <Badge label={`${level} · ${xp} XP`} tone="neutral" />
              {session?.user.email ? (
                <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.email}>
                  {session.user.email}
                </AppText>
              ) : null}
            </View>
            {/* Onboarding answers (focus areas + coach style) land here via the bio. */}
            {profile?.bio ? (
              <AppText variant="caption" tone="secondary" numberOfLines={2}>
                {profile.bio}
              </AppText>
            ) : null}
          </View>
          <Avatar name={name} size={64} />
        </View>
      </Reveal>

      {/* Three quick tiles */}
      <Reveal delay={60}>
        <View style={styles.tiles}>
          {tiles.map((tile) => (
            <View key={tile.title} style={styles.tileCell}>
              <MotionPressable onPress={tile.route} accessibilityLabel={`${tile.title}. ${tile.caption}`}>
                <Card variant="outlined" style={styles.tile}>
                  <View style={[styles.tileIcon, { backgroundColor: colors.surfaceSunken }]}>
                    <Icon name={tile.icon} size={20} color={colors.textPrimary} />
                  </View>
                  <View style={styles.tileText}>
                    <AppText variant="bodyBold" numberOfLines={1}>
                      {tile.title}
                    </AppText>
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {tile.caption}
                    </AppText>
                  </View>
                </Card>
              </MotionPressable>
            </View>
          ))}
        </View>
      </Reveal>

      {/* Privacy card */}
      <Reveal delay={120}>
        <MotionPressable onPress={push('/legal')} accessibilityLabel="Privacy checkup. Review your privacy settings.">
          <Card variant="filled" style={styles.privacy}>
            <View style={styles.privacyText}>
              <AppText variant="h3">Privacy checkup</AppText>
              <AppText variant="caption" tone="secondary">
                Review what Correr stores, and control your data in a few short steps.
              </AppText>
            </View>
            <View style={[styles.privacyArt, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name="shield" size={30} color={colors.textSecondary} />
            </View>
          </Card>
        </MotionPressable>
      </Reveal>

      {/* Explore — moved from Settings (screen-purpose sweep) */}
      <Reveal delay={150}>
        <View style={styles.section}>
          <AppText variant="overline" tone="muted" style={styles.sectionLabel}>
            Explore
          </AppText>
          <Card variant="outlined" padded={false}>
            {EXPLORE.map((row) => (
              <MotionPressable
                key={row.title}
                onPress={() => router.push(row.route)}
                accessibilityLabel={`${row.title}. ${row.caption}`}
              >
                <View style={styles.row}>
                  <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSunken }]}>
                    <Icon name={row.icon} size={18} color={colors.textSecondary} />
                  </View>
                  <View style={styles.rowText}>
                    <AppText variant="bodyMedium">{row.title}</AppText>
                    <AppText variant="caption" tone="muted">
                      {row.caption}
                    </AppText>
                  </View>
                  <Icon name="chevronRight" size={17} color={colors.textMuted} />
                </View>
              </MotionPressable>
            ))}
          </Card>
        </View>
      </Reveal>

      {/* Settings list */}
      <Reveal delay={180}>
        <Card variant="outlined" padded={false}>
          {rows.map((row) => (
            <MotionPressable key={row.title} onPress={row.route} accessibilityLabel={row.title}>
              <View style={styles.row}>
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSunken }]}>
                  <Icon
                    name={row.icon}
                    size={18}
                    color={row.danger ? colors.error : colors.textSecondary}
                  />
                </View>
                <View style={styles.rowText}>
                  <AppText variant="bodyMedium" tone={row.danger ? 'error' : 'primary'}>
                    {row.title}
                  </AppText>
                  {row.caption ? (
                    <AppText variant="caption" tone="muted">
                      {row.caption}
                    </AppText>
                  ) : null}
                </View>
                <Icon name="chevronRight" size={17} color={colors.textMuted} />
              </View>
            </MotionPressable>
          ))}
        </Card>
      </Reveal>

      {/* Sign out */}
      <Reveal delay={240}>
        <MotionPressable onPress={onSignOut} disabled={busy} accessibilityLabel="Sign out">
          <View style={[styles.row, styles.signOut]}>
            <View style={[styles.rowIcon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name="xmark" size={18} color={colors.textSecondary} />
            </View>
            <View style={styles.rowText}>
              <AppText variant="bodyMedium">Sign out</AppText>
              <AppText variant="caption" tone="muted">
                Your progress stays saved
              </AppText>
            </View>
            <Icon name="chevronRight" size={17} color={colors.textMuted} />
          </View>
        </MotionPressable>
      </Reveal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  headerText: {
    flex: 1,
    gap: spacing.sm,
  },
  name: {
    letterSpacing: -1.4,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  email: {
    flexShrink: 1,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tileCell: {
    flex: 1,
  },
  tile: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: {
    alignItems: 'center',
    gap: 1,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  privacyText: {
    flex: 1,
    gap: spacing.xs,
  },
  privacyArt: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  signOut: {
    marginTop: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    marginLeft: spacing.xs,
  },
});

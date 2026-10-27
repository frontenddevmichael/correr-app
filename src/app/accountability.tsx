import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { useApi, useSession } from '@/api/ApiProvider';
import { formatMonthDay } from '@/core/dates';
import type { AccountabilityPartnership, Commitment, PartnerInteraction, Profile } from '@/core/domain';
import { Avatar } from '@/design-system/Avatar';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { Icon, type IconName } from '@/design-system/icons';
import { Input } from '@/design-system/Input';
import { Reveal } from '@/design-system/motion';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { isCode, LIMITS, sanitizeCode, sanitizeSingleLine } from '@/core/validation';

const QUICK_MESSAGES: {
  kind: PartnerInteraction['kind'];
  label: string;
  icon: IconName;
  message: string;
}[] = [
  {
    kind: 'confirm',
    label: 'Confirm',
    icon: 'check',
    message: 'I saw you showed up today. Keep going!',
  },
  {
    kind: 'encourage',
    label: 'Encourage',
    icon: 'heart',
    message: 'One step at a time. I’m running with you.',
  },
  {
    kind: 'question',
    label: 'Check in',
    icon: 'question',
    message: 'What’s your next move today?',
  },
];

/** Accountability tab — partner first, then shared commitments and safety. */
export default function Accountability() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [partnership, setPartnership] = useState<AccountabilityPartnership | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [shared, setShared] = useState<Commitment[]>([]);
  const [interactions, setInteractions] = useState<PartnerInteraction[]>([]);
  const [mode, setMode] = useState<'invite' | 'accept' | null>(null);
  const [codeInput, setCodeInput] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const found = await api.getPartnership();
    setPartnership(found);
    if (found && found.status === 'active') {
      const [profile, myCommitments, feed] = await Promise.all([
        api.getPartnerProfile(),
        api.listCommitments(),
        api.listInteractions(),
      ]);
      setPartner(profile);
      setShared(
        myCommitments.filter(
          (commitment) => commitment.visibility === 'partner' && commitment.state !== 'cancelled',
        ),
      );
      setInteractions(feed);
    } else {
      setPartner(null);
      setShared([]);
      setInteractions([]);
    }
    setLoading(false);
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load]),
  );

  const accept = async () => {
    const code = sanitizeCode(codeInput);
    if (!isCode(code)) {
      setError('Invite codes are 6 to 8 letters or numbers.');
      toast.show('Check the invite code.', { tone: 'error' });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.acceptInvite(code);
      await load();
      toast.show('Partner connected.', { tone: 'success' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'That code didn’t work.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const connectDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.connectDemoPartner();
      await load();
      toast.show('Demo partner connected.', { tone: 'success' });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setError(message);
      toast.show(message, { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const send = async (kind: PartnerInteraction['kind'], message: string) => {
    const text = message.trim();
    if (!text) return;
    setBusy(true);
    try {
      await api.sendInteraction({ kind, message: text, commitmentId: undefined });
      setCustomMessage('');
      await load();
      toast.show('Nudge sent.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not send that nudge.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const endPartnership = () => {
    Alert.alert(
      'End partnership?',
      'Your shared commitments stay with you. You can invite a partner again anytime.',
      [
        { text: 'Keep running', style: 'cancel' },
        {
          text: 'End partnership',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.endPartnership();
              await load();
              toast.show('Partnership ended.', { tone: 'success' });
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not end the partnership.', {
                tone: 'error',
              });
            }
          },
        },
      ],
    );
  };

  const block = () => {
    if (!partner) return;
    Alert.alert('Block this partner?', 'They lose access to you and vice versa.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.blockUser(partner.userId);
            await api.endPartnership();
            await load();
            toast.show('Partner blocked.', { tone: 'success' });
          } catch (e) {
            toast.show(e instanceof Error ? e.message : 'Could not block this partner.', {
              tone: 'error',
            });
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen back="push" eyebrow="Support" title="Run with support.">
        <Skeleton height={180} />
        <Skeleton height={120} />
      </Screen>
    );
  }

  // ---------- Active partnership ----------
  if (partnership?.status === 'active') {
    const sharing = partnership.sharing;

    return (
      <Screen
        back="push"
        eyebrow="Support"
        title="Your partner."
        subtitle="Someone is running with you. That changes everything."
      >
        <Reveal>
          <Card variant="dark" padded={false} style={styles.partnerCard}>
            <View style={styles.partnerRow}>
              <Avatar
                name={partner?.displayName ?? 'Partner'}
                size={60}
                color="rgba(255,255,255,0.18)"
              />
              <View style={styles.partnerText}>
                <AppText variant="overline" tone="inverse" style={styles.dim}>
                  Running together
                </AppText>
                <AppText variant="title" tone="inverse" numberOfLines={1}>
                  {partner?.displayName ?? 'Your partner'}
                </AppText>
                <AppText variant="caption" tone="inverse" style={styles.dim}>
                  Since{' '}
                  {partnership.startedAt
                    ? formatMonthDay(new Date(partnership.startedAt))
                    : 'today'}
                </AppText>
              </View>
            </View>
          </Card>
        </Reveal>

        <Reveal delay={80}>
          <Card variant="outlined">
            <View style={styles.cardHeader}>
              <AppText variant="h3">Shared commitments</AppText>
              <AppText variant="overline" tone="muted">
                {shared.length} shared
              </AppText>
            </View>
            {shared.length === 0 ? (
              <AppText variant="body" tone="secondary">
                Nothing shared yet. When you plan a commitment, mark it “shared” and your partner
                will see it here.
              </AppText>
            ) : (
              <View style={styles.rows}>
                {shared.map((commitment) => {
                  const done = commitment.state === 'completed';
                  return (
                    <View key={commitment.id} style={styles.row}>
                      <View
                        style={[
                          styles.stateMark,
                          done
                            ? { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary }
                            : { borderColor: colors.borderStrong },
                        ]}
                      >
                        {done ? (
                          <Icon name="check" size={12} color={colors.textInverse} />
                        ) : null}
                      </View>
                      <View style={styles.rowText}>
                        <AppText variant="bodyMedium" numberOfLines={1}>
                          {commitment.title}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {new Date(commitment.dueAt).toLocaleString([], {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </AppText>
                      </View>
                      <AppText variant="overline" tone="muted">
                        {commitment.state.replace('_', ' ')}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </Reveal>

        <Reveal delay={120}>
          <Card variant="outlined">
            <AppText variant="h3" style={styles.sectionTitle}>
              Nudges
            </AppText>
            <View style={styles.quickRow}>
              {QUICK_MESSAGES.map((quick) => (
                <Chip
                  key={quick.kind}
                  label={quick.label}
                  icon={quick.icon}
                  onPress={() => send(quick.kind, quick.message)}
                  disabled={busy}
                />
              ))}
            </View>
            <View style={styles.compose}>
              <Input
                placeholder="Write a quick nudge…"
                value={customMessage}
                onChangeText={(value) =>
                  setCustomMessage(sanitizeSingleLine(value, LIMITS.nudge))
                }
                maxLength={LIMITS.nudge}
                returnKeyType="send"
                onSubmitEditing={() => send('encourage', customMessage)}
                containerStyle={styles.composerInput}
              />
              <Button
                label="Send"
                size="sm"
                fullWidth={false}
                onPress={() => send('encourage', customMessage)}
                disabled={!customMessage.trim() || busy}
              />
            </View>
            {interactions.length === 0 ? (
              <AppText variant="caption" tone="muted" style={styles.feedEmpty}>
                No nudges yet. Send the first one.
              </AppText>
            ) : (
              <View style={styles.feed}>
                {interactions.slice(0, 12).map((interaction) => {
                  const mine = interaction.fromUserId === session?.user.id;
                  return (
                    <View
                      key={interaction.id}
                      style={[
                        styles.bubble,
                        mine ? styles.bubbleMine : styles.bubbleTheirs,
                        mine
                          ? { backgroundColor: colors.textPrimary }
                          : { backgroundColor: colors.surfaceSunken },
                      ]}
                    >
                      <AppText variant="caption" tone={mine ? 'onBrand' : 'primary'}>
                        {interaction.message}
                      </AppText>
                      <AppText
                        variant="caption"
                        tone={mine ? 'onBrand' : 'muted'}
                        style={mine ? styles.mineTime : undefined}
                      >
                        {new Date(interaction.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            )}
          </Card>
        </Reveal>

        <Reveal delay={160}>
          <Card variant="outlined">
            <View style={styles.cardHeader}>
              <AppText variant="h3">What they can see</AppText>
              <Icon name="shield" size={17} color={colors.textMuted} />
            </View>
            <View style={styles.rows}>
              {(
                [
                  ['todayCommitments', 'Today’s commitments'],
                  ['completionHistory', 'Completion history'],
                  ['streakAndXp', 'Streak and XP'],
                  ['weeklyReview', 'Weekly review'],
                ] as const
              ).map(([key, label]) => (
                <View key={key} style={styles.row}>
                  <AppText variant="bodyMedium" style={styles.rowText}>
                    {label}
                  </AppText>
                  <Chip
                    label={sharing[key] ? 'Shared' : 'Hidden'}
                    selected={sharing[key]}
                    onPress={async () => {
                      await api.updateSharing({ [key]: !sharing[key] });
                      await load();
                    }}
                  />
                </View>
              ))}
            </View>
            <AppText variant="caption" tone="muted" style={styles.privacyNote}>
              Your AI conversations are never shared. Safety first, always.
            </AppText>
          </Card>
        </Reveal>

        <Reveal delay={200}>
          <Card variant="muted" style={styles.circlesCard}>
            <View style={styles.circlesText}>
              <AppText variant="h3">Circles</AppText>
              <AppText variant="caption" tone="secondary">
                Beyond your one partner: small groups that share wins and run challenges together.
              </AppText>
            </View>
            <Button
              label="Browse"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onPress={() => router.push('/circles')}
            />
          </Card>
        </Reveal>

        <View style={styles.dangerZone}>
          <Button label="End partnership" variant="secondary" onPress={endPartnership} />
          <Button
            label={`Block ${partner?.displayName ?? 'partner'}`}
            variant="ghost"
            onPress={block}
          />
        </View>
      </Screen>
    );
  }

  // ---------- Pending invite (mine) ----------
  if (partnership?.status === 'pending') {
    return (
      <Screen
        back="push"
        eyebrow="Support"
        title="Invite sent."
        subtitle="Share your code. Your partner enters it to connect."
      >
        <Reveal>
          <Card variant="dark" padded={false} style={styles.codeCard}>
            <AppText variant="overline" tone="inverse" style={styles.dim}>
              Your invite code
            </AppText>
            <AppText variant="display" tone="inverse" center style={styles.code}>
              {partnership.inviteCode}
            </AppText>
            <View style={styles.waiting}>
              <View style={[styles.waitingDot, { backgroundColor: colors.textInverse }]} />
              <AppText variant="caption" tone="inverse" style={styles.dim}>
                Waiting for your partner to join…
              </AppText>
            </View>
          </Card>
        </Reveal>
        <Button
          label="Simulate partner accepting (demo)"
          variant="secondary"
          onPress={connectDemo}
          loading={busy}
        />
        <Button
          label="Cancel invite"
          variant="ghost"
          onPress={async () => {
            await api.endPartnership();
            await load();
          }}
        />
      </Screen>
    );
  }

  // ---------- No partnership: choose support ----------
  return (
    <Screen
      back="push"
      eyebrow="Support"
      title="Run with support."
      subtitle="Add one person who sees the work and keeps you honest."
    >
      <Reveal>
        <Card variant="dark" padded={false} style={styles.hero}>
          <AppText variant="overline" tone="inverse" style={styles.dim}>
            Accountability
          </AppText>
          <AppText variant="title" tone="inverse">
            Nobody runs alone.
          </AppText>
          <AppText variant="caption" tone="inverse" style={[styles.dim, styles.heroCopy]}>
            People with a partner show up more consistently. They recover faster when someone
            notices they’re off pace.
          </AppText>
          <View style={styles.heroMeta}>
            <Icon name="shield" size={14} color="#FFFFFF" />
            <AppText variant="caption" tone="inverse" style={styles.dim}>
              Private by default. You control what they see.
            </AppText>
          </View>
        </Card>
      </Reveal>

      {mode === null ? (
        <>
          <Reveal delay={80}>
            <View style={styles.actions}>
              <Button
                label="Invite a partner"
                leftIcon={<Icon name="people" size={18} color={colors.textInverse} />}
                onPress={() => setMode('invite')}
              />
              <Button
                label="I have a code"
                variant="secondary"
                onPress={() => setMode('accept')}
              />
              <View style={styles.aiNote}>
                <Icon name="sparkles" size={15} color={colors.textMuted} />
                <AppText variant="caption" tone="secondary" style={styles.aiNoteText}>
                  AI check-ins and your coach are always on. Pro adds deeper coaching.
                </AppText>
              </View>
            </View>
          </Reveal>

          <Reveal delay={140}>
            <Card variant="muted" style={styles.circlesCard}>
              <View style={styles.circlesText}>
                <AppText variant="h3">Circles</AppText>
                <AppText variant="caption" tone="secondary">
                  Not ready for one partner? Join a small group sharing wins, check-ins and
                  challenges.
                </AppText>
              </View>
              <Button
                label="Browse"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={() => router.push('/circles')}
              />
            </Card>
          </Reveal>
        </>
      ) : (
        <Reveal>
          <Card variant="outlined" style={styles.formCard}>
            {mode === 'invite' ? (
              <>
                <AppText variant="h2">Invite your partner.</AppText>
                <AppText variant="body" tone="secondary">
                  We’ll generate a code. They tap “I have a code”, enter it, and you’re connected.
                </AppText>
                <Button
                  label="Generate invite code"
                  onPress={async () => {
                    await api.createInvite();
                    await load();
                  }}
                  loading={busy}
                  style={styles.formBtn}
                />
              </>
            ) : (
              <>
                <AppText variant="h2">Enter their code.</AppText>
                <AppText variant="body" tone="secondary">
                  Ask your partner for the six characters from their invite screen.
                </AppText>
                <Input
                  placeholder="e.g. K7X2QF"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  value={codeInput}
                  onChangeText={(value) => {
                    setCodeInput(sanitizeCode(value));
                    if (error) setError(null);
                  }}
                  maxLength={LIMITS.codeMax}
                  returnKeyType="done"
                  onSubmitEditing={accept}
                  containerStyle={styles.formField}
                />
                {error ? (
                  <AppText variant="caption" tone="error">
                    {error}
                  </AppText>
                ) : null}
                <Button
                  label="Connect"
                  onPress={accept}
                  loading={busy}
                  disabled={busy}
                  style={styles.formBtn}
                />
                <View style={styles.demo}>
                  <AppText variant="bodyMedium">No partner handy?</AppText>
                  <AppText variant="caption" tone="secondary">
                    Try the full flow with a demo partner. You can end it anytime.
                  </AppText>
                  <Button
                    label="Connect a demo partner"
                    variant="secondary"
                    size="sm"
                    onPress={connectDemo}
                    loading={busy}
                    style={styles.demoBtn}
                  />
                </View>
              </>
            )}
            <Button
              label="Back"
              variant="ghost"
              onPress={() => setMode(null)}
              style={styles.backBtn}
            />
          </Card>
        </Reveal>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  dim: {
    opacity: 0.6,
  },
  heroCopy: {
    maxWidth: 280,
    lineHeight: 21,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  aiNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  aiNoteText: {
    flex: 1,
  },
  circlesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  circlesText: {
    flex: 1,
    gap: 2,
  },
  formCard: {
    gap: spacing.sm,
  },
  formField: {
    marginTop: spacing.sm,
  },
  formBtn: {
    marginTop: spacing.md,
  },
  demo: {
    gap: spacing.xs,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  demoBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  backBtn: {
    marginTop: spacing.sm,
  },
  partnerCard: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  partnerText: {
    flex: 1,
    gap: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  rows: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  stateMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  composerInput: {
    flex: 1,
  },
  feed: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  feedEmpty: {
    marginTop: spacing.md,
  },
  bubble: {
    maxWidth: '85%',
    padding: spacing.md,
    borderRadius: 16,
    gap: 4,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
  },
  mineTime: {
    opacity: 0.55,
  },
  privacyNote: {
    marginTop: spacing.md,
  },
  dangerZone: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  codeCard: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  code: {
    letterSpacing: 6,
    marginVertical: spacing.sm,
  },
  waiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  waitingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

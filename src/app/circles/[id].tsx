import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { useApi, useSession } from '@/api/ApiProvider';
import type { Circle, CirclePost } from '@/core/domain';
import { Avatar } from '@/design-system/Avatar';
import { Badge } from '@/design-system/Badge';
import type { BadgeTone } from '@/design-system/Badge';
import { Button } from '@/design-system/Button';
import { Card } from '@/design-system/Card';
import { Chip } from '@/design-system/Chip';
import { EmptyState } from '@/design-system/EmptyState';
import { Input } from '@/design-system/Input';
import { Screen } from '@/design-system/Screen';
import { Skeleton } from '@/design-system/Skeleton';
import { Icon, type IconName } from '@/design-system/icons';
import { useColors } from '@/design-system/theme';
import { useToast } from '@/design-system/Toast';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { LIMITS, sanitizeMultiline } from '@/core/validation';

const POST_KINDS: {
  key: CirclePost['kind'];
  label: string;
  icon: IconName;
  tone: BadgeTone;
}[] = [
  { key: 'win', label: 'Win', icon: 'trophy', tone: 'progress' },
  { key: 'checkin', label: 'Check-in', icon: 'checkCircle', tone: 'ai' },
  { key: 'general', label: 'General', icon: 'chat', tone: 'info' },
];

const KIND_TONES: Record<CirclePost['kind'], BadgeTone> = {
  win: 'progress',
  checkin: 'ai',
  general: 'info',
};

/** Circle detail — feed of wins/check-ins with a composer (Phase 6). */
export default function CircleDetail() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [posts, setPosts] = useState<CirclePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<CirclePost['kind']>('win');
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const isMember = Boolean(
    circle?.viewerIsMember || circle?.ownerId === session?.user.id,
  );
  const isOwner = circle?.ownerId === session?.user.id;

  const load = useCallback(
    async (isRefresh = false) => {
      const request = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      try {
        const [list, p] = await Promise.all([api.listCircles(), api.listPosts(id)]);
        if (request !== requestId.current) return;
        const found = list.find((c) => c.id === id) ?? null;
        setCircle(found);
        setPosts(p);
        setError(null);
      } catch {
        if (request === requestId.current) {
          setError('We could not load this circle. Check your connection and try again.');
        }
      } finally {
        if (request === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [api, id],
  );

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const post = async () => {
    const content = draft.trim();
    if (!content) return;
    setBusy(true);
    try {
      await api.createPost(id, content, kind);
      setDraft('');
      await load();
      toast.show('Posted to the circle.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not post that.', { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    try {
      await api.joinCircle(id);
      await load();
      toast.show('Joined the circle.', { tone: 'success' });
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Could not join that circle.', {
        tone: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const leave = () => {
    Alert.alert('Leave this circle?', 'You can rejoin anytime.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.leaveCircle(id);
            router.back();
          } catch (e) {
            toast.show(e instanceof Error ? e.message : 'Could not leave the circle.', {
              tone: 'error',
            });
          }
        },
      },
    ]);
  };

  const removeCircle = () => {
    Alert.alert(
      'Delete this circle permanently?',
      'Every post, membership and shared goal in this circle will be deleted. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete circle',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deleteCircle(id);
              toast.show('Circle deleted.', { tone: 'success' });
              router.replace('/circles');
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not delete this circle.', {
                tone: 'error',
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const removePost = (post: CirclePost) => {
    Alert.alert(
      'Delete this post?',
      'It will be removed from the circle feed. This cannot be undone.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete post',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await api.deletePost(post.id);
              await load();
              toast.show('Post deleted.', { tone: 'success' });
            } catch (e) {
              toast.show(e instanceof Error ? e.message : 'Could not delete that post.', {
                tone: 'error',
              });
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <Screen back="push" title="Circle">
        <Skeleton height={100} />
        <Skeleton height={140} />
        <Skeleton height={140} />
      </Screen>
    );
  }

  if (error && !circle) {
    return (
      <Screen
        back="push"
        title="Circle"
        refreshing={refreshing}
        onRefresh={() => load(true)}
      >
        <EmptyState
          icon="people"
          title="We could not load this circle"
          description={error}
          actionLabel="Try again"
          onAction={() => load()}
        />
      </Screen>
    );
  }

  if (!circle) {
    return (
      <Screen back="push" title="Circle">
        <EmptyState
          icon="people"
          title="Circle not found"
          actionLabel="Back to circles"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      back="push"
      title={circle.name}
      subtitle={`${circle.memberCount} members · ${circle.isPrivate ? 'Private' : 'Public'}`}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {error ? (
        <Card variant="muted">
          <AppText variant="bodyMedium">Could not refresh this circle.</AppText>
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

      <Card variant="outlined">
        <AppText variant="body" tone="secondary">
          {circle.description}
        </AppText>
        {isMember ? (
          <View style={styles.memberNote}>
            <View style={[styles.memberIcon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name="check" size={14} color={colors.textPrimary} />
            </View>
            <AppText variant="caption" tone="secondary">
              {circle.ownerId === session?.user.id
                ? 'You created this circle.'
                : 'You’re a member of this circle.'}
            </AppText>
          </View>
        ) : (
          <Button
            label="Join circle"
            size="sm"
            fullWidth={false}
            onPress={join}
            loading={busy}
            style={styles.joinBtn}
          />
        )}
      </Card>

      {isMember ? (
        <Card variant="sunken">
          <AppText variant="bodyBold" style={styles.composerTitle}>
            Share with the circle
          </AppText>
          <View style={styles.kindRow}>
            {POST_KINDS.map((k) => (
              <Chip
                key={k.key}
                label={k.label}
                icon={k.icon}
                selected={kind === k.key}
                onPress={() => setKind(k.key)}
              />
            ))}
          </View>
          <Input
            accessibilityLabel="Write a circle post"
            placeholder="Post a win, a check-in, or something useful…"
            value={draft}
            onChangeText={(value) => setDraft(sanitizeMultiline(value, LIMITS.mediumText))}
            multiline
            textAlignVertical="top"
            maxLength={LIMITS.mediumText}
            style={[styles.draft, { minHeight: 72 }]}
          />
          <View style={styles.composerMeta}>
            <AppText variant="caption" tone="muted">
              {draft.length}/{LIMITS.mediumText}
            </AppText>
          </View>
          <Button
            label="Post"
            onPress={post}
            loading={busy}
            disabled={!draft.trim() || busy}
            style={styles.postBtn}
          />
        </Card>
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          icon="sprout"
          title="First post wins"
          description="Start the feed. Share today’s commitment or a small win."
        />
      ) : (
        posts.map((p) => {
          const mine = p.userId === session?.user.id;
          return (
            <Card key={p.id} variant="filled">
              <View style={styles.postHeader}>
                <Avatar name={p.authorName} size={36} />
                <View style={styles.postMeta}>
                  <AppText variant="bodyBold">
                    {p.authorName}
                    {mine ? ' (you)' : ''}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    {new Date(p.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </AppText>
                </View>
                <Badge label={p.kind === 'win' ? 'Win' : p.kind === 'checkin' ? 'Check-in' : 'General'} tone={KIND_TONES[p.kind]} />
                {mine || isOwner ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete post"
                    disabled={busy}
                    hitSlop={8}
                    onPress={() => removePost(p)}
                    style={({ pressed }) => [styles.postDelete, pressed && styles.postDeletePressed]}
                  >
                    <Icon name="trash" size={15} color={colors.textMuted} />
                  </Pressable>
                ) : null}
              </View>
              <AppText variant="body" style={styles.postBody}>
                {p.content}
              </AppText>
            </Card>
          );
        })
      )}

      {isMember && circle.ownerId !== session?.user.id ? (
        <Card variant="muted">
          <AppText variant="bodyMedium">Leave this circle?</AppText>
          <AppText variant="caption" tone="secondary">
            You can rejoin anytime. Your posts stay with the circle.
          </AppText>
          <Button
            label="Leave circle"
            variant="secondary"
            size="sm"
            fullWidth={false}
            onPress={leave}
            style={styles.leaveBtn}
          />
        </Card>
      ) : null}

      {isOwner ? (
        <Card variant="muted">
          <AppText variant="bodyMedium">Delete this circle?</AppText>
          <AppText variant="caption" tone="secondary">
            Every post, membership and shared goal will be removed. This cannot be undone.
          </AppText>
          <Button
            label="Delete circle"
            variant="ghost"
            size="sm"
            fullWidth={false}
            onPress={removeCircle}
            disabled={busy}
            style={styles.leaveBtn}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  leaveBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  joinBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  memberNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  memberIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCopy: {
    marginTop: spacing.xs,
  },
  errorBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
  },
  composerTitle: {
    marginBottom: spacing.sm,
  },
  kindRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  draft: {
    minHeight: 72,
    paddingTop: spacing.md,
  },
  postBtn: {
    marginTop: spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  postMeta: {
    flex: 1,
    gap: 2,
  },
  postBody: {
    marginBottom: spacing.sm,
  },
  postDelete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postDeletePressed: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  composerMeta: {
    alignItems: 'flex-end',
    marginTop: -spacing.xs,
  },
});

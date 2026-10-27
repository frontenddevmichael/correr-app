import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/api/ApiProvider';
import type { AIConversation, AIMessage } from '@/core/domain';
import { track } from '@/core/analytics';
import { BrandMark } from '@/design-system/BrandMark';
import { Icon } from '@/design-system/icons';
import { Reveal, useReducedMotion } from '@/design-system/motion';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { fontFamily, layout, radii, shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { LIMITS } from '@/core/validation';


function TypingDots() {
  const colors = useColors();
  const reduced = useReducedMotion();
  const [dots] = useState(() => [
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]);

  useEffect(() => {
    if (reduced) {
      dots.forEach((dot) => dot.setValue(0.7));
      return;
    }
    const loops = dots.map((dot, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(dot, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.delay(220),
        ]),
      ),
    );
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [dots, reduced]);

  return (
    <View style={styles.typing}>
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[styles.typingDot, { backgroundColor: colors.textSecondary, opacity: dot }]}
        />
      ))}
    </View>
  );
}

/**
 * AI coach — a quiet, private conversation.
 *
 * The reference is a chat product, not a dashboard: no avatars, no heavy
 * bubbles, no card stack. Assistant replies sit on the canvas; the user's
 * words are a soft grey note. A single composer stays within thumb reach.
 * The empty state mirrors the Claude chat screen: a centered mark + one
 * line, nothing else — the composer below is the only call to action.
 */
export function CoachChat() {
  const api = useApi();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);

  useEffect(() => {
    let active = true;
    track('ai_coach_opened');
    Promise.resolve()
      .then(async () => {
        const existingList = await api.listConversations('coach');
        const existing = existingList[0];
        const convo = existing ?? (await api.createConversation('coach'));
        const msgs = await api.listMessages(convo.id);
        if (!active) return;
        setConversations(existing ? existingList : [convo]);
        setConversationId(convo.id);
        setMessages(msgs);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setError('The coach is unavailable right now. Try again in a moment.');
        }
      });
    return () => {
      active = false;
    };
  }, [api]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const send = useCallback(
    async (content: string) => {
      const text = content.trim();
      if (!text || !conversationId || busy) return;
      setBusy(true);
      setDraft('');
      setError(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          conversationId,
          role: 'user',
          content: text,
          createdAt: new Date().toISOString(),
        },
      ]);
      scrollToEnd();
      try {
        const reply = await api.sendMessage(conversationId, text);
        setMessages((prev) => [...prev, reply]);
      } catch {
        setError('That message didn’t go through. Try again.');
      } finally {
        setBusy(false);
        scrollToEnd();
      }
    },
    [api, busy, conversationId, scrollToEnd],
  );

  const openConversation = async (convo: AIConversation) => {
    if (busy || convo.id === conversationId) {
      setHistoryOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    setHistoryOpen(false);
    try {
      const msgs = await api.listMessages(convo.id);
      setConversationId(convo.id);
      setMessages(msgs);
    } catch {
      setError('Could not open that conversation.');
    } finally {
      setBusy(false);
    }
  };

  const startNewConversation = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const convo = await api.createConversation('coach');
      setConversations((prev) => [convo, ...prev]);
      setConversationId(convo.id);
      setMessages([]);
      setDraft('');
    } catch {
      setError('Could not start a new conversation.');
    } finally {
      setBusy(false);
    }
  };

  const removeConversation = async (id: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (conversationId === id) {
        if (remaining[0]) {
          const msgs = await api.listMessages(remaining[0].id);
          setConversationId(remaining[0].id);
          setMessages(msgs);
        } else {
          const convo = await api.createConversation('coach');
          setConversations([convo]);
          setConversationId(convo.id);
          setMessages([]);
        }
      }
    } catch {
      setError('Could not delete that conversation.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      'Delete this conversation?',
      'The messages will be removed permanently.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeConversation(id),
        },
      ],
    );
  };


  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Conversation history"
          onPress={() => setHistoryOpen(true)}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.surface, ...shadows.subtle },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="chat" size={19} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <AppText variant="bodyBold">Coach</AppText>
          <View style={[styles.privatePill, { backgroundColor: colors.surfaceSunken }]}>
            <Icon name="lock" size={11} color={colors.textMuted} />
            <AppText variant="caption" tone="muted" style={styles.privateText}>
              Private
            </AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open weekly review"
          onPress={() => router.push('/weekly')}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.surface, ...shadows.subtle },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="calendar" size={19} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToEnd}
        >
          {loading ? (
            <View style={styles.loading}>
              <Skeleton height={36} width="55%" />
              <Skeleton height={18} width="82%" />
              <Skeleton height={18} width="70%" />
              <Skeleton height={54} width="64%" style={styles.loadingRight} />
            </View>
          ) : messages.length === 0 ? (
            <Reveal distance={10}>
              <View style={styles.emptyCenter}>
                <View style={styles.heroRow}>
                  <BrandMark size={32} />
                  <AppText variant="hero">Let’s think.</AppText>
                </View>
              </View>
            </Reveal>
          ) : (
            <View style={styles.messages}>
              {messages.map((m) =>
                m.role === 'user' ? (
                  <View key={m.id} style={styles.userRow}>
                    <View style={[styles.userBubble, { backgroundColor: colors.surfaceSunken }]}>
                      <AppText variant="body">{m.content}</AppText>
                    </View>
                  </View>
                ) : (
                  <View key={m.id} style={styles.assistantRow}>
                    <AppText variant="overline" tone="muted" style={styles.assistantLabel}>
                      Coach
                    </AppText>
                    <AppText variant="body" style={styles.assistantText}>
                      {m.content}
                    </AppText>
                  </View>
                ),
              )}
              {busy ? (
                <View style={styles.assistantRow}>
                  <AppText variant="overline" tone="muted" style={styles.assistantLabel}>
                    Coach
                  </AppText>
                  <TypingDots />
                </View>
              ) : null}
            </View>
          )}

          {error ? (
            <View style={[styles.error, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name="alert" size={15} color={colors.textSecondary} />
              <AppText variant="caption" tone="secondary" style={styles.errorText}>
                {error}
              </AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.composerWrap}>
          <View style={styles.composerInner}>
            <View
              style={[
                styles.composer,
                { backgroundColor: colors.surfaceSunken },
              ]}
            >
              <TextInput
                value={draft}
                onChangeText={(value) => setDraft(value.slice(0, LIMITS.message))}
                placeholder="How can I help you today?"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={LIMITS.message}
                accessibilityLabel="Message your coach"
                style={[styles.input, { color: colors.textPrimary }]}
              />
              <View style={styles.composerFooter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start a new conversation"
                  onPress={startNewConversation}
                  disabled={busy}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.plusButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon name="plus" size={18} color={colors.textPrimary} />
                </Pressable>

                <View style={styles.composerMeta}>
                  <Icon name="sparkles" size={13} color={colors.textMuted} />
                  <AppText variant="caption" tone="muted">
                    {draft.length > 1800
                      ? `${draft.length}/${LIMITS.message}`
                      : 'Coach knows your plan'}
                  </AppText>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send message"
                  accessibilityState={{ disabled: !draft.trim() || busy }}
                  disabled={!draft.trim() || busy}
                  onPress={() => send(draft)}
                  style={({ pressed }) => [
                    styles.send,
                    {
                      backgroundColor: draft.trim() ? colors.textPrimary : colors.surfaceSunken,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <Icon
                    name="send"
                    size={19}
                    color={draft.trim() ? colors.textInverse : colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={historyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryOpen(false)}
      >
        <Pressable style={styles.historyScrim} onPress={() => setHistoryOpen(false)}>
          <Pressable
            accessibilityViewIsModal
            onPress={() => {}}              style={[
                styles.historySheet,
                {
                  backgroundColor: colors.background,
                  paddingBottom: Math.max(insets.bottom, spacing.lg),
                },
              ]}
          >
            <View style={styles.historyHeader}>
              <View style={styles.historyTitle}>
                <AppText variant="overline" tone="muted">
                  Conversations
                </AppText>
                <AppText variant="h3">Your coach history.</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close conversation history"
                onPress={() => setHistoryOpen(false)}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="xmark" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
              {conversations.map((convo) => {
                const current = convo.id === conversationId;
                return (
                  <View
                    key={convo.id}
                    style={[
                      styles.historyRow,
                      current && { backgroundColor: colors.surfaceSunken },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open conversation ${convo.title}`}
                      onPress={() => openConversation(convo)}
                      style={({ pressed }) => [
                        styles.historyRowMain,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon name="chat" size={17} color={colors.textSecondary} />
                      <View style={styles.historyRowText}>
                        <AppText variant="bodyMedium" numberOfLines={1}>
                          {convo.title}
                          {current ? ' · Current' : ''}
                        </AppText>
                        <AppText variant="caption" tone="muted">
                          {new Date(convo.updatedAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </AppText>
                      </View>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete conversation ${convo.title}`}
                      onPress={() => confirmDelete(convo.id)}
                      disabled={busy}
                      style={({ pressed }) => [
                        styles.historyDelete,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Icon name="trash" size={17} color={colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start a new conversation"
              onPress={() => {
                setHistoryOpen(false);
                startNewConversation();
              }}
              disabled={busy}
              style={({ pressed }) => [
                styles.historyNew,
                { backgroundColor: colors.surfaceSunken },
                pressed && styles.pressed,
              ]}
            >
              <Icon name="plus" size={18} color={colors.textPrimary} />
              <AppText variant="bodyMedium">New conversation</AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: radii.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  historyScrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  historySheet: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    maxHeight: '72%',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  historyTitle: {
    flex: 1,
    gap: 1,
  },
  historyList: {
    flexGrow: 0,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
  },
  historyRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 56,
  },
  historyRowText: {
    flex: 1,
    gap: 2,
  },
  historyDelete: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: 'transparent',
    borderRadius: radii.pill,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  privatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  privateText: {
    fontSize: 10,
    lineHeight: 13,
  },
  thread: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  loading: {
    gap: spacing.md,
  },
  loadingRight: {
    alignSelf: 'flex-end',
    marginTop: spacing.lg,
  },
  emptyCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 260,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  messages: {
    gap: spacing.xxl,
    paddingTop: spacing.sm,
  },
  userRow: {
    alignItems: 'flex-end',
  },
  userBubble: {
    maxWidth: '84%',
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  assistantRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  assistantLabel: {
    fontSize: 10,
  },
  assistantText: {
    maxWidth: 480,
    lineHeight: 24,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 24,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  error: {
    marginTop: spacing.lg,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
  },
  composerWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    // The floating tab bar overlays the bottom of the screen; keep the
    // composer above it on every device.
    paddingBottom: layout.tabBarHeight + layout.tabBarInset + spacing.sm,
  },
  composerInner: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  composer: {
    borderRadius: radii.xxl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  input: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 28,
    maxHeight: 118,
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xs,
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  plusButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerMeta: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

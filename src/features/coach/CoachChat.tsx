import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useApi } from '@/api/ApiProvider';
import type { AIConversation, AIMessage } from '@/core/domain';
import { track } from '@/core/analytics';
import { BrandMark } from '@/design-system/BrandMark';
import { useConfirm } from '@/design-system/confirm';
import { Icon } from '@/design-system/icons';
import { Reveal, useReducedMotion } from '@/design-system/motion';
import { useHaptics } from '@/design-system/settings';
import { Skeleton } from '@/design-system/Skeleton';
import { useColors } from '@/design-system/theme';
import { fontFamily, layout, radii, shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { LIMITS } from '@/core/validation';

/**
 * A calm thinking state: the brand mark breathes inside one soft ring.
 * No bouncing dots, no progress copy.
 */
function ThinkingOrb() {
  const colors = useColors();
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      pulse.value = 0.5;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduced]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.2, 0.04]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.92, 1.5]) }],
  }));
  const coreStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.72, 1]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.96, 1.04]) }],
  }));

  return (
    <View style={styles.thinking} accessibilityLabel="Coach is thinking">
      <Animated.View
        style={[
          styles.thinkingRing,
          { borderColor: colors.textMuted },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.thinkingCore,
          { backgroundColor: colors.surfaceSunken },
          coreStyle,
        ]}
      >
        <BrandMark size={16} />
      </Animated.View>
    </View>
  );
}

function AnimatedWord({
  text,
  index,
  animate,
  color,
}: {
  text: string;
  index: number;
  animate: boolean;
  color: string;
}) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(animate && !reduced ? 0 : 1);

  useEffect(() => {
    if (!animate || reduced) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      Math.min(index * 18, 320),
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [animate, index, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [6, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.985, 1]) },
    ],
  }));

  return (
    <Animated.View style={style}>
      <AppText variant="body" style={[styles.word, { color }]}>
        {text}
      </AppText>
    </Animated.View>
  );
}

/**
 * Assistant copy resolves one word at a time. The stagger is deliberately
 * small so a long answer feels considered, not performed.
 */
function AnimatedMessageText({
  content,
  animate,
}: {
  content: string;
  animate: boolean;
}) {
  const colors = useColors();
  let wordIndex = 0;

  return (
    <View style={styles.animatedText}>
      {content.split('\n').map((line, lineIndex) => {
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          return <View key={`blank-${lineIndex}`} style={styles.blankLine} />;
        }
        return (
          <View key={`line-${lineIndex}`} style={styles.wordRow}>
            {words.map((word) => {
              const current = wordIndex++;
              return (
                <AnimatedWord
                  key={`${current}-${word}`}
                  text={word}
                  index={current}
                  animate={animate}
                  color={colors.textPrimary}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

/** Track the keyboard so the composer can drop its tab-bar clearance. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
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
  const confirm = useConfirm();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const keyboardVisible = useKeyboardVisible();
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
      haptics.tap();
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
    [api, busy, conversationId, haptics, scrollToEnd],
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
    confirm(
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

  const reportReply = async (message: AIMessage) => {
    const subject = encodeURIComponent('Correr AI reply report');
    const body = encodeURIComponent(
      `I want to report an AI reply.\n\nReply:\n${message.content}\n\nWhat was wrong:\n`,
    );
    try {
      await Linking.openURL(`mailto:support@correr.app?subject=${subject}&body=${body}`);
    } catch {
      setError('Could not open your email app. Email support@correr.app to report this reply.');
    }
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Conversation history"
          onPress={() => {
            haptics.tap();
            setHistoryOpen(true);
          }}
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
          accessibilityLabel="Coach settings"
          onPress={() => {
            haptics.tap();
            router.push('/coach-settings');
          }}
          style={({ pressed }) => [
            styles.headerButton,
            { backgroundColor: colors.surface, ...shadows.subtle },
            pressed && styles.pressed,
          ]}
        >
          <Icon name="gear" size={19} color={colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.thread,
            messages.length === 0 && styles.threadEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          scrollEnabled={messages.length > 0 || loading || !!error}
          onContentSizeChange={() => {
            if (messages.length > 0 || busy) scrollToEnd();
          }}
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
                  <AppText variant="hero">Let’s talk.</AppText>
                </View>
              </View>
            </Reveal>
          ) : (
            <View style={styles.messages}>
              {messages.map((m, index) => {
                const latestAssistant = [...messages]
                  .reverse()
                  .find((message) => message.role === 'assistant')?.id;
                const isLatestAssistant = m.role === 'assistant' && m.id === latestAssistant;
                return m.role === 'user' ? (
                  <View key={m.id} style={styles.userRow}>
                    <View style={[styles.userBubble, { backgroundColor: colors.surfaceSunken }]}>
                      <AppText variant="body">{m.content}</AppText>
                    </View>
                  </View>
                ) : (
                  <View key={m.id} style={styles.assistantRow}>
                    <View style={styles.assistantMeta}>
                      <AppText variant="overline" tone="muted" style={styles.assistantLabel}>
                        Coach
                      </AppText>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Report this AI reply"
                        onPress={() => void reportReply(m)}
                        hitSlop={8}
                      >
                        <AppText variant="caption" tone="muted" style={styles.reportText}>
                          Report
                        </AppText>
                      </Pressable>
                    </View>
                    <AnimatedMessageText
                      content={m.content}
                      animate={isLatestAssistant && index === messages.length - 1}
                    />
                  </View>
                );
              })}
              {busy ? (
                <View style={styles.assistantRow}>
                  <AppText variant="overline" tone="muted" style={styles.assistantLabel}>
                    Coach
                  </AppText>
                  <ThinkingOrb />
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

        <View
          style={[
            styles.composerWrap,
            {
              paddingBottom: keyboardVisible
                ? spacing.sm
                : Math.max(insets.bottom, layout.tabBarInset) +
                  layout.tabBarHeight +
                  spacing.sm,
            },
          ]}
        >
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
                placeholder="Message your coach"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={LIMITS.message}
                accessibilityLabel="Message your coach"
                style={[styles.input, { color: colors.textPrimary }]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send message"
                accessibilityState={{ disabled: !draft.trim() || busy }}
                disabled={!draft.trim() || busy}
                onPress={() => send(draft)}
                style={({ pressed }) => [
                  styles.send,
                  {
                    backgroundColor: draft.trim() ? colors.textPrimary : colors.surface,
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
  threadEmpty: {
    justifyContent: 'center',
  },
  loading: {
    gap: spacing.md,
  },
  loadingRight: {
    alignSelf: 'flex-end',
    marginTop: spacing.lg,
  },
  emptyCenter: {
    alignItems: 'center',
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
  assistantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  assistantLabel: {
    fontSize: 10,
  },
  reportText: {
    fontSize: 11,
    lineHeight: 14,
  },
  animatedText: {
    maxWidth: 480,
    gap: 0,
  },
  wordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  word: {
    lineHeight: 24,
    marginRight: 4,
  },
  blankLine: {
    height: 12,
  },
  thinking: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thinkingRing: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
  },
  thinkingCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    // The floating tab bar overlays the bottom of the screen. The runtime
    // value adds the real bottom inset, so the composer clears the capsule on
    // devices with a home indicator as well as on flat-bottom devices.
    paddingBottom: layout.tabBarHeight + layout.tabBarInset + spacing.sm,
  },
  composerInner: {
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    borderRadius: radii.xxl,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 40,
    maxHeight: 118,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm + 1,
    paddingBottom: spacing.sm + 1,
    textAlignVertical: 'top',
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

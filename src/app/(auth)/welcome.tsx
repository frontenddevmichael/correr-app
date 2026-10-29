import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApi, useSession } from '@/api/ApiProvider';
import { useToast } from '@/design-system/Toast';
import { createThemedStyles, useColors } from '@/design-system/theme';
import { shadows, spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';
import { GoogleButton, LinkText } from '@/features/auth/AuthUi';

const SLIDES = [
  {
    image: require('@/assets/images/onboarding-vision.png'),
    caption: 'Write your vision.',
  },
  {
    image: require('@/assets/images/onboarding-roadmap.png'),
    caption: 'Let AI build the roadmap.',
  },
  {
    image: require('@/assets/images/onboarding-accountability.png'),
    caption: 'Stay accountable every day.',
  },
];

export default function Welcome() {
  const api = useApi();
  const colors = useColors();
  const toast = useToast();
  const { refresh } = useSession();
  const { width } = useWindowDimensions();
  const artSize = Math.min(247, width * 0.64);
  const [index, setIndex] = useState(0);
  const [googleBusy, setGoogleBusy] = useState(false);
  const listRef = useRef<FlatList>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    try {
      await api.signInWithGoogle();
      await refresh();
      router.replace('/');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'Google sign-in failed.', {
        tone: 'error',
      });
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
     
      <View style={styles.headlineWrap}>
        <AppText style={styles.headline}>
          Every great future begins with one{' '}
          <AppText style={[styles.headlineAccent, { textDecorationColor: colors.textMuted }]}>
            clear
          </AppText>{' '}
          vision.
        </AppText>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.caption}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image
              source={item.image}
              style={[styles.illustration, { width: artSize, height: artSize }]}
              contentFit="contain"
            />
            <AppText style={styles.caption}>{item.caption}</AppText>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((s, i) => (
          <Pressable
            key={s.caption}
            onPress={() => listRef.current?.scrollToIndex({ index: i, animated: true })}
            accessibilityRole="button"
            accessibilityLabel={`Slide ${i + 1}`}
            accessibilityState={{ selected: i === index }}
            hitSlop={12}
            style={styles.dotHit}
          >
            <View
              style={[
                styles.dot,
                i === index && styles.dotActive,
                i === index && { backgroundColor: colors.textPrimary },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [
            styles.signinBtn,
            { backgroundColor: colors.surface, ...shadows.subtle },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.push('/(auth)/login')}
          accessibilityRole="button"
        >
          <AppText style={styles.signinText}>Sign in</AppText>
        </Pressable>
        <GoogleButton onPress={onGoogle} loading={googleBusy} />
        <LinkText
          prefix="New to Correr?"
          link="Create account"
          onPress={() => router.push('/(auth)/signup')}
        />
        <Pressable
          onPress={() => router.push('/legal')}
          accessibilityRole="link"
          accessibilityLabel="Read the Terms, Privacy Policy and AI Disclosure"
          style={styles.legalLink}
        >
          <AppText variant="caption" tone="muted">
            Terms, Privacy & AI Disclosure
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = createThemedStyles((colors) => ({
  safe: {
    flex: 1,
  },
  wordmarkWrap: {
    alignItems: 'center',
    paddingTop: 12,
  },
  headlineWrap: {
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 12,
  },
  headline: {
    textAlign: 'center',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.7,
    color: colors.textPrimary,
  },
  headlineAccent: {
    color: colors.textPrimary,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 26,
    textDecorationLine: 'underline',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 28,
  },
  illustration: {
    maxWidth: '100%',
  },
  caption: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
  },
  dotHit: {
    minWidth: 36,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  dotActive: {
    width: 34,
  },
  actions: {
    paddingHorizontal: 32,
    paddingBottom: 20,
    gap: 14,
  },
  signinBtn: {
    minHeight: 56,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signinText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  legalLink: {
    alignSelf: 'center',
    paddingVertical: spacing.xs,
  },
}));

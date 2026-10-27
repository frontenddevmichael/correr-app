import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/design-system/Button';
import { Reveal } from '@/design-system/motion';
import { useColors } from '@/design-system/theme';
import { spacing } from '@/design-system/tokens';
import { AppText } from '@/design-system/typography';

/** 404 — unmatched routes and stale deep links land here. */
export default function NotFound() {
  const colors = useColors();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.background }]}>
      <Reveal>
        <View style={styles.inner}>
          <AppText variant="overline" tone="muted">
            404
          </AppText>
          <AppText variant="title" center style={styles.title}>
            This page went for a run.
          </AppText>
          <AppText variant="body" tone="secondary" center style={styles.copy}>
            The link you followed doesn’t exist anymore — or never did. Everything else is
            still where you left it.
          </AppText>
          <Button
            label="Back to home"
            onPress={() => router.replace('/(tabs)')}
            fullWidth={false}
            style={styles.action}
          />
        </View>
      </Reveal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  inner: {
    alignItems: 'center',
    gap: spacing.md,
    maxWidth: 360,
  },
  title: {
    letterSpacing: -0.5,
  },
  copy: {
    marginBottom: spacing.sm,
  },
  action: {
    marginTop: spacing.sm,
  },
});

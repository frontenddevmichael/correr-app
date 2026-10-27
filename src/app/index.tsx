import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useSession } from '@/api/ApiProvider';
import { useColors } from '@/design-system/theme';

/**
 * Auth gate:
 * - no session                     → welcome / sign in
 * - no profile / onboarding pending → seed-data wizard (post-signup onboarding;
 *                                      resumes from its persisted step and now
 *                                      includes vision creation itself)
 * - otherwise                      → app tabs
 */
export default function Index() {
  const colors = useColors();
  const { session, profile, loading } = useSession();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/welcome" />;
  // Fresh signups and anyone who left the wizard mid-way land back on it. The
  // wizard now owns vision creation too, so the old 'vision' onboarding state
  // no longer forces the standalone composer — a missing vision is offered
  // once from the home prompt instead.
  if (!profile || profile.onboardingState === 'profile') {
    return <Redirect href="/(onboarding)/seed-wizard" />;
  }
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { Tabs } from 'expo-router';
import React from 'react';

import { getAppearanceSnapshot } from '@/design-system/settings';
import { useColors } from '@/design-system/theme';
import { CorrerTabBar } from '@/navigation/CorrerTabBar';

/**
 * Tabs — Home · Vision · Coach · Progress, plus the separate new-commitment
 * FAB. Support and Settings are secondary surfaces reached from Account, so
 * the bar stays at four destinations and the touch targets keep their width.
 *
 * SDK 58 removed the `<Tabs initialRouteName>` prop (the navigator now drops
 * it at runtime); the initial route comes from `unstable_settings.anchor`
 * instead. It is read through the hydrated appearance snapshot so Settings ›
 * Appearance › default landing tab still applies on cold start: the boot gate
 * in `app/_layout.tsx` waits for settings hydration before this layout mounts,
 * and expo-router evaluates the anchor on that first read.
 */
export const unstable_settings = {
  get anchor() {
    return getAppearanceSnapshot().defaultTab;
  },
};

export default function TabsLayout() {
  const colors = useColors();

  return (
    <Tabs
      tabBar={(props) => <CorrerTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="vision" options={{ title: 'Vision' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
    </Tabs>
  );
}
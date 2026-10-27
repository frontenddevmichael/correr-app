import { Stack } from 'expo-router';
import React from 'react';

import { useColors } from '@/design-system/theme';

/** Pushed vision flow: create → discovery → roadmap preview → detail. */
export default function VisionLayout() {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}

import { Stack } from 'expo-router';
import React from 'react';

import { useColors } from '@/design-system/theme';

/** Pushed commitment flow. */
export default function CommitmentLayout() {
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

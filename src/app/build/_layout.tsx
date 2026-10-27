import { Stack } from 'expo-router';
import React from 'react';

import { useColors } from '@/design-system/theme';

/** Pushed Correr Build flow. */
export default function BuildLayout() {
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

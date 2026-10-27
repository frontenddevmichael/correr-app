import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

import { useColors } from './theme';
import { fontFamily, palette, radii } from './tokens';
import { AppText } from './typography';

/**
 * Initials avatar. Strictly monochrome: the pool is a set of ink/grey steps,
 * all measured against white initials for AA (≥4.5:1). The pool stays a pool
 * so different people remain visually distinct without reintroducing hue.
 */
export function avatarColorFor(seed: string, pool: string[]): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}

/** Pick white or ink for initials, whatever solid colour the caller supplies. */
function readableInk(background: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(background)) return palette.white;
  const r = parseInt(background.slice(1, 3), 16) / 255;
  const g = parseInt(background.slice(3, 5), 16) / 255;
  const b = parseInt(background.slice(5, 7), 16) / 255;
  const channel = (value: number) =>
    value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  return luminance > 0.42 ? palette.ink : palette.white;
}

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  style?: ViewStyle;
}

export function Avatar({ name, size = 40, color, style }: AvatarProps) {
  const colors = useColors();
  // Light mode: ink circles, white initials (AA). Dark mode: the pool flips to
  // light circles so avatars lift off the dark canvas. The user's accent leads
  // the pool, so avatars track customization too — `readableInk` then flips
  // the initials to keep AA against whatever colour wins.
  const isLight = colors.surface === palette.white;
  const pool = isLight
    ? [colors.accent, palette.ink, palette.inkSoft, palette.slate700, palette.slate500]
    : [colors.accent, '#C9CCD3', '#8E939C', palette.nightText2, palette.nightText3];
  const bg = color ?? avatarColorFor(name, pool);
  // Derive the initials colour from the resolved background so an avatar can
  // never end up white-on-white — whatever the accent or caller supplies.
  const initialsColor = readableInk(bg);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: radii.round, backgroundColor: bg },
        style,
      ]}
    >
      <AppText
        style={{
          color: initialsColor,
          fontFamily: fontFamily.sansSemiBold,
          fontSize: size * 0.38,
          lineHeight: size * 0.48,
          fontWeight: '600',
        }}
      >
        {initials || '?'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

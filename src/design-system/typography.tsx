import React from 'react';
import { Platform, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import {
  LINE_HEIGHT_FACTOR,
  TEXT_SCALE_FACTOR,
  useAppearance,
} from './settings';
import { useColors } from './theme';
import { fontFamily, fontSize } from './tokens';

type Variant =
  | 'hero'
  | 'heroSoft'
  | 'mega'
  | 'display'
  | 'title'
  | 'h2'
  | 'h3'
  | 'body'
  | 'bodyMedium'
  | 'bodyBold'
  | 'caption'
  | 'overline'
  | 'button'
  | 'tabLabel';

type Tone =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'onBrand'
  | 'onDark'
  | 'onDarkMuted'
  | 'progress'
  | 'streak'
  | 'ai'
  | 'info'
  | 'error';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  font?: 'sans' | 'display';
  center?: boolean;
}

/**
 * Two voices, one hierarchy.
 *
 * Display sizes use Poppins 600/400; body sizes use Inter. Each variant points
 * at a real font file, so no `fontWeight` is applied — that avoids the
 * synthetic bolding that made the old display text feel too heavy.
 *
 * The reference's headline contrast comes from a two-tone treatment:
 * `hero` (600) for the subject, `heroSoft` (400, secondary tone) for the
 * quieter line.
 */
const variantStyles: Record<Variant, TextStyle> = {
  hero: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.hero, // 36
    lineHeight: 42,
    letterSpacing: -1,
  },
  heroSoft: {
    fontFamily: fontFamily.displayRegular,
    fontSize: fontSize.hero,
    lineHeight: 42,
    letterSpacing: -0.6,
  },
  mega: {
    fontFamily: fontFamily.displayMedium,
    fontSize: fontSize.mega, // 44
    lineHeight: 50,
    letterSpacing: -1.4,
  },
  display: {
    fontFamily: fontFamily.display,
    fontSize: fontSize.display, // 31
    lineHeight: 38,
    letterSpacing: -0.7,
  },
  title: {
    fontFamily: fontFamily.displayMedium,
    fontSize: fontSize.title, // 24
    lineHeight: 31,
    letterSpacing: -0.4,
  },
  h2: {
    fontFamily: fontFamily.displayMedium,
    fontSize: fontSize.xxl, // 20
    lineHeight: 27,
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily.displayMedium,
    fontSize: fontSize.xl, // 17
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.md, // 15
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontFamily: fontFamily.sansMedium,
    fontSize: fontSize.md, // 15
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.md, // 15
    lineHeight: 22,
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: fontSize.base, // 13
    lineHeight: 19,
  },
  overline: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: fontSize.xs, // 11
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  tabLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 10,
    lineHeight: 12,
  },
};

export function AppText({
  variant = 'body',
  tone = 'primary',
  font,
  center,
  style,
  ...rest
}: AppTextProps) {
  const colors = useColors();
  const settings = useAppearance();
  const base = variantStyles[variant];

  // Typography preferences: family, size scale, weight and line spacing.
  const scale = TEXT_SCALE_FACTOR[settings.textScale];
  const lineFactor = LINE_HEIGHT_FACTOR[settings.lineSpacing];
  const prefFont = fontFamilyFor(settings.fontFamily, base.fontFamily);
  const weightFont = applyWeight(prefFont, settings.fontWeight, variant);

  const adjusted: TextStyle = {
    ...base,
    fontFamily: font ? (font === 'display' ? fontFamily.display : fontFamily.sans) : weightFont,
    fontSize: (base.fontSize ?? fontSize.md) * scale,
    lineHeight: base.lineHeight ? base.lineHeight * scale * lineFactor : undefined,
  };

  const toneColor: Record<Tone, string> = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    // `inverse` is used on the ink feature card, so it follows the on-dark
    // token rather than the ink-on-paper button token.
    inverse: colors.textOnDark,
    onBrand: colors.textInverse,
    onDark: colors.textOnDark,
    onDarkMuted: colors.textOnDarkMuted,
    progress: colors.progress,
    streak: colors.streak,
    ai: colors.accent,
    info: colors.info,
    error: colors.error,
  };

  return (
    <Text
      style={[adjusted, { color: toneColor[tone] }, center && styles.center, style]}
      {...rest}
    />
  );
}

/**
 * Font-family preference. Only faces that are actually bundled resolve to a
 * real file; otherwise the variant's own family is kept so nothing renders as
 * a system fallback unexpectedly.
 */
function fontFamilyFor(pref: 'default' | 'rounded' | 'mono', fallback: TextStyle['fontFamily']): TextStyle['fontFamily'] {
  if (pref === 'rounded') {
    // No dedicated rounded face is bundled; Poppins (geometric) stands in.
    return fallback && fallback.startsWith('Poppins') ? fallback : fontFamily.displayMedium;
  }
  if (pref === 'mono') {
    return Platform.select({ ios: 'Menlo', android: 'monospace', default: fallback });
  }
  return fallback;
}

/**
 * Weight preference: bump the *body* faces up or down a step when the user asks
 * for bold / regular, leaving display headlines on their editorial weights.
 */
function applyWeight(
  family: TextStyle['fontFamily'],
  weight: 'regular' | 'medium' | 'bold',
  variant: Variant,
): TextStyle['fontFamily'] {
  const isDisplay = variant.startsWith('hero') || variant === 'mega' || variant === 'display' || variant === 'title' || variant === 'h2' || variant === 'h3';
  if (isDisplay) {
    // Headlines only honour "bold" by stepping Poppins up a weight.
    if (weight === 'bold') return fontFamily.display;
    if (weight === 'regular') return fontFamily.displayRegular;
    return family;
  }
  // Body faces: map to a real Inter weight.
  if (weight === 'bold') return fontFamily.sansBold;
  if (weight === 'medium') return family === fontFamily.sans ? fontFamily.sansMedium : family;
  // regular: drop bodyBold/bodyMedium down to the regular face.
  if (family === fontFamily.sansBold || family === fontFamily.sansSemiBold || family === fontFamily.sansMedium) {
    return fontFamily.sans;
  }
  return family;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});

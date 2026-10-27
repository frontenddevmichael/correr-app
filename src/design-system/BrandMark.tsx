import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useColors } from './theme';

interface BrandMarkProps {
  size?: number;
  /** Force a single colour (used on dark hero surfaces). */
  color?: string;
}

/**
 * Correr mark — a bold C around a small point, held by a fine ring.
 *
 * The same geometry is the basis for the OS icon assets, so the brand feels
 * continuous from the splash screen to the app icon. `CorrerGlyph` is the
 * standalone mark; `BrandMark` is the ink tile version.
 *
 * Geometry is taken verbatim from `assets/brand/mark.svg` (scaled ÷16 into a
 * 64-unit space). The mark's ink only occupies x 26–42, y 24–40 of that space,
 * so the glyph frames that region tightly — otherwise it renders at a quarter
 * of its nominal size and off-centre. The tile keeps the full 0–64 frame
 * because its rect is full-bleed there.
 */
export function CorrerGlyph({ size = 22, color }: BrandMarkProps) {
  const colors = useColors();
  const ink = color ?? colors.textPrimary;

  return (
    <Svg width={size} height={size} viewBox="11.61 15.25 33.5 33.5" accessibilityLabel="Correr">
      <Path
        d="M40.5 22.5a14 14 0 1 0 0 19"
        fill="none"
        stroke={ink}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Circle
        cx={34}
        cy={32}
        r={7}
        fill="none"
        stroke={ink}
        strokeWidth={1.75}
        strokeDasharray={[38, 6]}
        strokeDashoffset={-3}
        strokeLinecap="round"
        opacity={0.72}
      />
      <Circle cx={34} cy={32} r={2.69} fill={ink} />
    </Svg>
  );
}

export function BrandMark({ size = 56, color }: BrandMarkProps) {
  const colors = useColors();
  const radius = size * 0.28;
  const ink = color ?? colors.textPrimary;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="Correr">
      <Rect width={64} height={64} rx={radius * (64 / size)} fill={ink} />
      <Path
        d="M40.5 22.5a14 14 0 1 0 0 19"
        fill="none"
        stroke={colors.textInverse}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
      <Circle
        cx={34}
        cy={32}
        r={7}
        fill="none"
        stroke={colors.textInverse}
        strokeWidth={1.75}
        strokeDasharray={[38, 6]}
        strokeDashoffset={-3}
        strokeLinecap="round"
        opacity={0.7}
      />
      <Circle cx={34} cy={32} r={2.69} fill={colors.textInverse} />
    </Svg>
  );
}

import React, { useId } from 'react';
import Svg, { Defs, Ellipse, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from './theme';

interface BrandMarkProps {
  size?: number;
  /**
   * Kept for call-site compatibility. The mark now carries its own two-stop
   * gradient, so a single tint is no longer applied.
   */
  color?: string;
}

/*
 * The mark is the supplied 66 x 66 SVG, kept verbatim. The only change is the
 * gradient palette: the same black-to-grey ramp is inverted in dark mode so
 * the mark stays visible on a near-black canvas.
 */
const OUTER_PATH =
  'M60.199 20.3424C61.7012 19.6434 62.3638 17.8504 61.5313 16.4179C58.2859 10.8336 53.4596 6.30375 47.6309 3.42069C40.9027 0.0926555 33.2408 -0.842097 25.9098 0.770687C18.5787 2.38347 12.0165 6.44741 7.30616 12.2919C2.59577 18.1363 0.0186621 25.4121 0.000100887 32.9184C-0.0184603 40.4247 2.52264 47.7131 7.20406 53.5808C11.8855 59.4485 18.4275 63.5448 25.7505 65.1939C33.0735 66.8429 40.7398 65.946 47.4845 62.6513C53.3273 59.7971 58.176 55.2911 61.449 49.723C62.2886 48.2947 61.6348 46.4984 60.1361 45.7919L59.3605 45.4263C57.8619 44.7199 56.0884 45.3737 55.215 46.7816C52.6309 50.947 48.9152 54.3206 44.4746 56.4898C39.1315 59.0999 33.0582 59.8103 27.2569 58.504C21.4556 57.1976 16.2731 53.9525 12.5644 49.3041C8.85582 44.6557 6.84276 38.8819 6.85746 32.9354C6.87217 26.9888 8.91376 21.225 12.6453 16.595C16.3769 11.965 21.5754 8.74557 27.3831 7.46792C33.1908 6.19027 39.2605 6.93079 44.5906 9.56726C49.0205 11.7584 52.7194 15.1503 55.2829 19.3284C56.1493 20.7407 57.9195 21.4032 59.4217 20.7042L60.199 20.3424Z';

const RING_PATH =
  'M49.5 33C49.5 42.1127 42.1127 49.5 33 49.5C23.8873 49.5 16.5 42.1127 16.5 33C16.5 23.8873 23.8873 16.5 33 16.5C42.1127 16.5 49.5 23.8873 49.5 33ZM21.4275 33C21.4275 39.3913 26.6087 44.5725 33 44.5725C39.3913 44.5725 44.5725 39.3913 44.5725 33C44.5725 26.6087 39.3913 21.4275 33 21.4275C26.6087 21.4275 21.4275 26.6087 21.4275 33Z';

function gradientIds(uid: string) {
  const safe = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  return {
    outer: `correr-outer-${safe}`,
    ring: `correr-ring-${safe}`,
    dot: `correr-dot-${safe}`,
  };
}

/**
 * Correr mark: the supplied 66-unit artwork, rendered at any size.
 *
 * The geometry is the source of truth for the in-app mark, the OS icon and
 * the splash art. `BrandMark` is kept as the public name used across the app.
 */
export function CorrerGlyph({ size = 22 }: BrandMarkProps) {
  const { isDark } = useTheme();
  const uid = useId();
  const ids = gradientIds(uid);
  const start = isDark ? '#F6F3ED' : '#0A0A0A';
  const end = isDark ? '#8A8177' : '#707070';

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 66 66"
      fill="none"
      accessibilityLabel="Correr"
    >
      <Defs>
        <LinearGradient
          id={ids.outer}
          x1="33.0919"
          y1="57.42"
          x2="33.092"
          y2="-14.52"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={start} />
          <Stop offset="1" stopColor={end} />
        </LinearGradient>
        <LinearGradient
          id={ids.ring}
          x1="33.046"
          y1="45.21"
          x2="33.046"
          y2="9.24"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={start} />
          <Stop offset="1" stopColor={end} />
        </LinearGradient>
        <LinearGradient
          id={ids.dot}
          x1="33.0142"
          y1="36.7"
          x2="33.0142"
          y2="25.8"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0" stopColor={start} />
          <Stop offset="1" stopColor={end} />
        </LinearGradient>
      </Defs>
      <Path d={OUTER_PATH} fill={`url(#${ids.outer})`} />
      <Path d={RING_PATH} fill={`url(#${ids.ring})`} />
      <Ellipse cx="33" cy="33" rx="5.07692" ry="5" fill={`url(#${ids.dot})`} />
    </Svg>
  );
}

export function BrandMark({ size = 56 }: BrandMarkProps) {
  return <CorrerGlyph size={size} />;
}

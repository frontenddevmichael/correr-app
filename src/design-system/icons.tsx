import React from 'react';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/**
 * Correr icon set — bespoke, drawn on a 24×24 grid.
 *
 * One visual language: 1.75 stroke, round caps and joins, no fills except the
 * explicitly named `*Filled` variants (tab-bar selected state — HIG: "Prefer
 * filled symbols or icons for consistency with the platform").
 * Icons match the weight of adjacent medium-weight text. Icon-only controls
 * always pair with an accessibility label on their pressable parent.
 */

export type IconName =
  // Tabs (outline + filled pairs)
  | 'home'
  | 'homeFilled'
  | 'compass'
  | 'compassFilled'
  | 'people'
  | 'peopleFilled'
  | 'chart'
  | 'chartFilled'
  | 'more'
  | 'moreFilled'
  // General
  | 'bell'
  | 'flame'
  | 'check'
  | 'checkCircle'
  | 'xmark'
  | 'trash'
  | 'plus'
  | 'chevronRight'
  | 'chevronLeft'
  | 'play'
  | 'pencil'
  | 'refresh'
  | 'chevronUp'
  | 'chevronDown'
  | 'clock'
  | 'calendar'
  | 'send'
  // Content
  | 'sparkles'
  | 'target'
  | 'map'
  | 'trophy'
  | 'heart'
  | 'question'
  | 'chat'
  | 'alert'
  | 'cloud'
  | 'cloudRain'
  | 'sprout'
  | 'wrench'
  | 'person'
  | 'lock'
  | 'shield'
  | 'school'
  | 'flag'
  | 'tag'
  | 'bulb'
  | 'gear'
  | 'wallet'
  | 'inbox'
  | 'doc';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: object;
}

const S = 1.75; // base stroke width — matches medium-weight text at 16–17pt

export function Icon({ name, size = 22, color = '#14161A', strokeWidth = S, style }: IconProps) {
  const sw = strokeWidth;
  let body: React.ReactNode = null;

  switch (name) {
    // ---------- Tabs ----------
    case 'home':
      body = (
        <>
          <Path d="M3.8 11.3 12 4.4l8.2 6.9" />
          <Path d="M5.9 9.9v9.6a1.2 1.2 0 0 0 1.2 1.2h9.8a1.2 1.2 0 0 0 1.2-1.2V9.9" />
        </>
      );
      break;
    case 'homeFilled':
      body = (
        <Path
          fill={color}
          stroke="none"
          d="M12 3.3 2.9 10.9a.8.8 0 0 0-.3.6v8a1.6 1.6 0 0 0 1.6 1.6h4.5v-5.4h6.6v5.4h4.5a1.6 1.6 0 0 0 1.6-1.6v-8a.8.8 0 0 0-.3-.6z"
        />
      );
      break;
    case 'compass':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.6} />
          <Path d="m15.4 8.6-2 4.8-4.8 2 2-4.8z" />
        </>
      );
      break;
    case 'compassFilled':
      body = (
        <Path
          fill={color}
          stroke="none"
          fillRule="evenodd"
          d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2Zm3.4 5.2-2 4.8-4.8 2 2-4.8 4.8-2Z"
        />
      );
      break;
    case 'people':
      body = (
        <>
          <Circle cx={9} cy={8.2} r={3.1} />
          <Path d="M3.6 19.6c.4-3 2.6-5.1 5.4-5.1s5 2.1 5.4 5.1" />
          <Circle cx={16.6} cy={8.8} r={2.5} />
          <Path d="M15.6 14.6c2.5.2 4.3 2 4.8 4.7" />
        </>
      );
      break;
    case 'peopleFilled':
      body = (
        <>
          <Circle cx={9} cy={8.2} r={3.1} fill={color} stroke="none" />
          <Path
            fill={color}
            stroke="none"
            d="M3.4 19.9c.5-3.3 3-5.7 6.2-5.7s5.7 2.4 6.2 5.7z"
          />
          <Circle cx={16.6} cy={8.8} r={2.5} fill={color} stroke="none" />
          <Path
            fill={color}
            stroke="none"
            d="M15.6 20c.3-2.6 1.9-4.6 4.3-5.2 1.5.7 2.6 2.1 3 3.9v1.3z"
          />
        </>
      );
      break;
    case 'chart':
      body = (
        <>
          <Rect x={4.6} y={13.4} width={4} height={6.6} rx={1.2} />
          <Rect x={10.3} y={7.8} width={4} height={12.2} rx={1.2} />
          <Rect x={16} y={10.6} width={4} height={9.4} rx={1.2} />
        </>
      );
      break;
    case 'chartFilled':
      body = (
        <>
          <Rect x={4.6} y={13.4} width={4} height={6.6} rx={1.2} fill={color} stroke="none" />
          <Rect x={10.3} y={7.8} width={4} height={12.2} rx={1.2} fill={color} stroke="none" />
          <Rect x={16} y={10.6} width={4} height={9.4} rx={1.2} fill={color} stroke="none" />
        </>
      );
      break;
    case 'more':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.6} />
          <Circle cx={8.6} cy={12} r={1.15} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={1.15} fill={color} stroke="none" />
          <Circle cx={15.4} cy={12} r={1.15} fill={color} stroke="none" />
        </>
      );
      break;
    case 'moreFilled':
      body = (
        <Path
          fill={color}
          stroke="none"
          fillRule="evenodd"
          d="M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2Zm-3.4 8.6a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm3.4 0a1.4 1.4 0 1 1 2.8 0 1.4 1.4 0 0 1-2.8 0Zm2 -1.4a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8Z"
        />
      );
      break;

    // ---------- General ----------
    case 'bell':
      body = (
        <>
          <Path d="M5.4 18.2 6.9 16v-5.4a5.1 5.1 0 0 1 10.2 0V16l1.5 2.2z" />
          <Path d="M10 20.4a2 2 0 0 0 4 0" />
        </>
      );
      break;
    case 'chevronUp':
      body = <Path d="M6 14.5 12 8.5l6 6" />;
      break;
    case 'chevronDown':
      body = <Path d="M6 9.5 12 15.5l6-6" />;
      break;
    case 'pencil':
      body = (
        <>
          <Path d="M4.6 19.4l.8-3.4L15.9 5.5a1.85 1.85 0 0 1 2.6 0l.9.9a1.85 1.85 0 0 1 0 2.6L8.9 19.5z" />
          <Path d="M14.3 7.1l2.6 2.6" />
        </>
      );
      break;
    case 'flame':
      body = (
        <Path d="M12.3 3.4c1.5 2.3 1.1 3.9.4 5.1 1.4-.9 2.6-2 3.3-3.3.9 1.3 1.6 2.9 1.6 4.8a5.6 5.6 0 1 1-11.2 0c0-2.2 1.1-4.1 2.7-5.7.1 1.2.6 2.1 1.4 2.7-.3-2.5.4-3.5 1.8-3.6z" />
      );
      break;
    case 'check':
      body = <Path d="m5.2 12.6 4.6 4.6 9-9.8" />;
      break;
    case 'checkCircle':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.6} />
          <Path d="m8.4 12.3 2.5 2.5 4.7-5.2" />
        </>
      );
      break;
    case 'xmark':
      body = (
        <>
          <Line x1={6.5} y1={6.5} x2={17.5} y2={17.5} />
          <Line x1={17.5} y1={6.5} x2={6.5} y2={17.5} />
        </>
      );
      break;
    case 'trash':
      body = (
        <>
          <Path d="M4.5 7h15" />
          <Path d="M9.5 7V5.2h5V7" />
          <Path d="m6.5 7 .8 12.1a1.2 1.2 0 0 0 1.2 1.1h7a1.2 1.2 0 0 0 1.2-1.1L17.5 7" />
          <Path d="M10 11v5.5M14 11v5.5" />
        </>
      );
      break;
    case 'plus':
      body = (
        <>
          <Line x1={12} y1={5.2} x2={12} y2={18.8} />
          <Line x1={5.2} y1={12} x2={18.8} y2={12} />
        </>
      );
      break;
    case 'chevronRight':
      body = <Path d="m9.6 5.8 6.2 6.2-6.2 6.2" />;
      break;
    case 'chevronLeft':
      body = <Path d="m14.4 5.8-6.2 6.2 6.2 6.2" />;
      break;
    case 'play':
      body = <Path d="m9.4 6.8 7.8 5.2-7.8 5.2z" />;
      break;
    case 'refresh':
      body = (
        <>
          <Path d="M20.4 12a8.4 8.4 0 1 1-3.1-6.5" />
          <Path fill={color} stroke="none" d="m14.1 3.1 4.3 1.4-1.5 4.2z" />
        </>
      );
      break;
    case 'clock':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.6} />
          <Path d="M12 7.4V12l3 1.9" />
        </>
      );
      break;
    case 'calendar':
      body = (
        <>
          <Rect x={4.2} y={6.2} width={15.6} height={13.6} rx={2.2} />
          <Line x1={8.4} y1={3.8} x2={8.4} y2={8} />
          <Line x1={15.6} y1={3.8} x2={15.6} y2={8} />
          <Line x1={4.2} y1={10.6} x2={19.8} y2={10.6} />
        </>
      );
      break;
    case 'send':
      body = (
        <>
          <Path d="M21 3 3 10.3l7.9 3.1L14 21z" />
          <Line x1={21} y1={3} x2={10.9} y2={13.4} />
        </>
      );
      break;

    // ---------- Content ----------
    case 'sparkles':
      body = (
        <>
          <Path d="m10.8 4.4 1.6 4.9 4.9 1.6-4.9 1.6-1.6 4.9-1.6-4.9-4.9-1.6 4.9-1.6z" />
          <Path
            fill={color}
            stroke="none"
            d="m18.4 4 .7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"
          />
        </>
      );
      break;
    case 'target':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.6} />
          <Circle cx={12} cy={12} r={4.9} />
          <Circle cx={12} cy={12} r={1.5} fill={color} stroke="none" />
        </>
      );
      break;
    case 'map':
      body = (
        <>
          <Path d="M9.4 5.6 3.8 7.8v11l5.6-2.2 5.2 2.2 5.6-2.2v-11l-5.6 2.2z" />
          <Line x1={9.4} y1={5.6} x2={9.4} y2={16.6} />
          <Line x1={14.6} y1={7.8} x2={14.6} y2={18.8} />
        </>
      );
      break;
    case 'trophy':
      body = (
        <>
          <Path d="M7.5 4.5h9v4.4a4.5 4.5 0 0 1-9 0z" />
          <Path d="M7.5 6.4H5.2c0 2.3 1 4 2.6 4.5" />
          <Path d="M16.5 6.4h2.3c0 2.3-1 4-2.6 4.5" />
          <Line x1={12} y1={13.4} x2={12} y2={16.8} />
          <Line x1={8.6} y1={20.4} x2={15.4} y2={20.4} />
          <Line x1={9.8} y1={16.8} x2={14.2} y2={16.8} />
        </>
      );
      break;
    case 'heart':
      body = (
        <Path d="M12 19.8C6.9 16.4 4.3 13.4 4.3 10.1a4.1 4.1 0 0 1 7.7-2 4.1 4.1 0 0 1 7.7 2c0 3.3-2.6 6.3-7.7 9.7z" />
      );
      break;
    case 'question':
      body = (
        <>
          <Circle cx={12} cy={12} r={8.6} />
          <Path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.6c-.8.3-1 .9-1 1.6" />
          <Line x1={12} y1={17.1} x2={12} y2={17.2} />
        </>
      );
      break;
    case 'chat':
      body = (
        <Path d="M5.4 5.6a1.8 1.8 0 0 1 1.8-1.8h9.6a1.8 1.8 0 0 1 1.8 1.8v7.6a1.8 1.8 0 0 1-1.8 1.8H9.3L5.4 18z" />
      );
      break;
    case 'alert':
      body = (
        <>
          <Path d="M8.5 3.8h7L20.2 8.5v7L15.5 20.2h-7L3.8 15.5v-7z" />
          <Line x1={12} y1={8.4} x2={12} y2={13} />
          <Line x1={12} y1={15.9} x2={12} y2={16} />
        </>
      );
      break;
    case 'cloud':
      body = (
        <Path d="M7.5 18.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6.5 3.7 3.7 0 0 1-.6 7.5z" />
      );
      break;
    case 'cloudRain':
      body = (
        <>
          <Path d="M7.5 16.4a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6.5 3.7 3.7 0 0 1-.6 7.5z" />
          <Line x1={8.6} y1={18.4} x2={7.6} y2={21} />
          <Line x1={12.3} y1={18.4} x2={11.3} y2={21} />
          <Line x1={16} y1={18.4} x2={15} y2={21} />
        </>
      );
      break;
    case 'sprout':
      body = (
        <>
          <Line x1={12} y1={21} x2={12} y2={11.4} />
          <Path d="M12 15.6c0-3-2.3-5.5-5.4-5.9.2 3.2 2.4 5.9 5.4 5.9z" />
          <Path d="M12 13.1c0-2.7 2.1-4.9 5-5.3-.2 2.9-2.3 5.3-5 5.3z" />
        </>
      );
      break;
    case 'wrench':
      body = (
        <Path d="M14.9 6.4a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.6-3.6a6 6 0 0 1-7.9 7.9l-6.7 6.7a2.1 2.1 0 0 1-3-3l6.7-6.7a6 6 0 0 1 7.9-7.9z" />
      );
      break;
    case 'person':
      body = (
        <>
          <Circle cx={12} cy={8.2} r={3.6} />
          <Path d="M5.2 19.8a6.8 6.8 0 0 1 13.6 0" />
        </>
      );
      break;
    case 'lock':
      body = (
        <>
          <Path d="M6 11.4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" />
          <Path d="M8.6 11.4V8.2a3.4 3.4 0 0 1 6.8 0v3.2" />
          <Circle cx={12} cy={14.9} r={1.1} fill={color} stroke="none" />
        </>
      );
      break;
    case 'shield':
      body = (
        <Path d="M12 3.6 19.2 6v5.4c0 4.2-2.9 7.2-7.2 8.9-4.3-1.7-7.2-4.7-7.2-8.9V6z" />
      );
      break;
    case 'school':
      body = (
        <>
          <Path d="M2.8 9.4 12 5.2l9.2 4.2L12 13.6z" />
          <Path d="M6.8 11.4v4.4c0 1.6 2.3 2.9 5.2 2.9s5.2-1.3 5.2-2.9v-4.4" />
          <Line x1={21.2} y1={9.4} x2={21.2} y2={14} />
        </>
      );
      break;
    case 'flag':
      body = (
        <>
          <Line x1={6} y1={21} x2={6} y2={4.4} />
          <Path d="M6 5.4h10.8l-2.2 3.7 2.2 3.7H6" />
        </>
      );
      break;
    case 'tag':
      body = (
        <>
          <Path d="M11.8 3.6H5.2a1.6 1.6 0 0 0-1.6 1.6v6.6c0 .4.2.8.4 1.1l7.6 7.6a1.6 1.6 0 0 0 2.3 0l6.4-6.4a1.6 1.6 0 0 0 0-2.3L13.3 4.2a1.6 1.6 0 0 0-1.1-.6z" />
          <Circle cx={8.2} cy={8.2} r={1.3} fill={color} stroke="none" />
        </>
      );
      break;
    case 'bulb':
      body = (
        <>
          <Path d="M12 3.6a5.6 5.6 0 0 1 3.3 10.1c-.5.4-.8.9-.8 1.6H9.5c0-.7-.3-1.2-.8-1.6A5.6 5.6 0 0 1 12 3.6z" />
          <Line x1={9.6} y1={18.4} x2={14.4} y2={18.4} />
          <Line x1={10.4} y1={20.6} x2={13.6} y2={20.6} />
        </>
      );
      break;
    case 'gear':
      body = (
        <>
          <Circle cx={12} cy={12} r={3.1} />
          <Path d="M12 2.9v2.6M12 18.5v2.6M21.1 12h-2.6M5.5 12H2.9M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6" />
        </>
      );
      break;
    case 'wallet':
      body = (
        <>
          <Path d="M4.4 7.6a2 2 0 0 1 2-2h10.4a1.6 1.6 0 0 1 1.6 1.6v1.2" />
          <Path d="M4.4 7.6v9.2a2 2 0 0 0 2 2h11a1.6 1.6 0 0 0 1.6-1.6V9.6a1.6 1.6 0 0 0-1.6-1.6H6.4" />
          <Circle cx={16.2} cy={13.4} r={1.15} fill={color} stroke="none" />
        </>
      );
      break;
    case 'inbox':
      body = (
        <>
          <Path d="M4.4 13.6 6.8 5.4a1.6 1.6 0 0 1 1.5-1.1h7.4a1.6 1.6 0 0 1 1.5 1.1l2.4 8.2" />
          <Path d="M4.4 13.6v3.4a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2v-3.4h-4.6a2.4 2.4 0 0 1-4.8 0z" />
        </>
      );
      break;
    case 'doc':
      body = (
        <>
          <Path d="M6.4 3.9h7l4.6 4.6v11.6a1.6 1.6 0 0 1-1.6 1.6H6.4a1.6 1.6 0 0 1-1.6-1.6V5.5a1.6 1.6 0 0 1 1.6-1.6z" />
          <Path d="M13.4 3.9v4.6H18" />
          <Line x1={8.4} y1={13.2} x2={15.6} y2={13.2} />
          <Line x1={8.4} y1={16.6} x2={13.2} y2={16.6} />
        </>
      );
      break;
  }

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none" // SVG defaults to black fill — without this every outline glyph rendered solid
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style as never}
    >
      {body}
    </Svg>
  );
}

/**
 * Correr Design Tokens — "Ink & Paper"
 *
 * A restrained, premium system. Three rules drive every value here:
 *
 * 1. MONOCHROME. The interface is ink, paper and the greys between them. No
 *    hue is used for decoration, status or AI. Meaning comes from contrast,
 *    fill vs outline, icon shape and copy — never from colour.
 * 2. Layered neutrals. A cool near-white canvas, pure-white elevated surfaces,
 *    sunken wells, and a near-black hero surface. Depth comes from these
 *    layers + a hairline border + a soft shadow, not from tint or gradient.
 * 3. Every value has a light and a dark variant (HIG: "if you define a custom
 *    colour, make sure to supply light and dark variants").
 *
 * Screens consume semantic tokens (`colors.*`) only; the raw `palette` is an
 * implementation detail of the design system.
 */

/* ------------------------------------------------------------------ *
 * Raw palette — neutral ramp + functional hues (light values).
 * ------------------------------------------------------------------ */
export const palette = {
  // Ink & Paper, warmed a step: a running journal, not a dashboard.
  ink: '#171410',
  inkSoft: '#2E2A24',
  inkLine: '#48423A',
  slate700: '#5C554B',
  slate500: '#6E665B', // ≥4.7:1 AA on canvas / surface / sunken (measured)
  slate400: '#9A9287',
  slate300: '#C9C1B5',
  slate200: '#D6CCBE',
  slate150: '#E2DAD0',
  slate100: '#E6DFD4',
  slate50: '#EFEAE1',
  slate25: '#F6F3ED',
  white: '#FFFCF7',
  offWhite: '#FFFCF7',
  pureBlack: '#000000',
  black: '#171410',

  // Dark-mode neutrals
  night900: '#0D0C0A', // canvas
  night800: '#171512', // elevated surface
  night700: '#1C1916', // hero surface
  night650: '#201D19', // sunken
  night600: '#26221D', // soft fill
  nightLine: '#2A2620',
  nightLineStrong: '#3A342C',
  nightText: '#F4F1EB',
  nightText2: '#ABA39A',
  nightText3: '#91897E', // ≥4.58:1 AA on every dark surface incl. soft fills (measured)

  // Functional — progress / success
  emerald: '#0B8C5B',
  emeraldDark: '#076B45',
  emeraldBright: '#2FB87E',
  mint: '#E4F5EC',

  // Functional — streak / energy
  amber: '#DE7A2A',
  amberDark: '#B45E15',
  amberBright: '#E9973F',
  peach: '#FCEEE0',

  // Functional — the single accent (AI + links + focus)
  indigo: '#4F4CC9',
  indigoDark: '#4341B0',
  indigoBright: '#9A97F0',
  indigoSoft: '#ECEDFB',
  indigoNight: '#23254A',

  // Functional — information / links
  blue: '#2E62D8',
  blueBright: '#6D97F5',
  blueSoft: '#E9EFFC',
  blueNight: '#16203A',

  // Functional — error / danger
  red: '#D2373F',
  redDark: '#B02A31',
  redBright: '#F2656C',
  redSoft: '#FBEAEA',
  redNight: '#2C1517',
} as const;

/* ------------------------------------------------------------------ *
 * Semantic colour tokens — LIGHT (default).
 * ------------------------------------------------------------------ */
export const lightColors = {
  // Surfaces (layered: canvas → surface → sunken/soft → hero)
  background: palette.slate25, // warm paper canvas
  surface: palette.white, // warm elevated cards
  surfaceSunken: palette.slate50, // inset wells / tracks
  surfaceSoft: palette.slate50, // soft fills, icon circles
  surfaceDark: palette.ink, // hero / feature cards
  overlay: 'rgba(23, 20, 16, 0.5)',

  // Text (label / secondary / tertiary / inverse)
  textPrimary: palette.ink, // 16.6:1 on canvas, 17.9:1 on surface
  textSecondary: palette.slate700, // 6.6:1 on canvas, 7.2:1 on surface
  textMuted: palette.slate500, // ≥4.7:1 AA on canvas / surface / sunken (measured)
  textInverse: palette.white,
  textOnDark: palette.slate25,
  textOnDarkMuted: palette.slate400,

  // Lines
  border: palette.slate100, // hairline card border
  borderStrong: palette.slate200, // control border

  // Brand — the one action colour (ink)
  brand: palette.ink,
  brandPressed: palette.inkSoft,
  brandInverse: palette.white,

  // Accent — now a grey step, kept as a token for component compatibility
  accent: palette.slate700,
  accentPressed: palette.ink,
  accentSoft: palette.slate50,

  // Status — differentiated by weight, not hue
  progress: palette.ink,
  progressDark: palette.ink,
  progressPressed: palette.inkSoft,
  streak: palette.slate700,
  streakDark: palette.ink,
  highlight: palette.ink,
  ai: palette.slate700,
  aiPressed: palette.ink,
  aiSoft: palette.slate50, // coach bubble / AI surfaces
  info: palette.slate700,
  infoSoft: palette.slate50,
  error: palette.ink,
  errorPressed: palette.slate700,
  errorSoft: palette.slate50,

  // Soft tints (badge / chip backgrounds)
  progressSoft: palette.slate50,
  streakSoft: palette.slate50,

  // Semantic commitment states. In this system states are carried by copy
  // ("Planned.", "Cancelled."), never by colour — so the quiet step is used,
  // at AA-passing contrast for when a state colour is drawn as text or mark.
  planned: palette.slate500,
  inProgress: palette.slate700,
  completed: palette.ink,
  missed: palette.slate500,
  rescheduled: palette.slate500,
  cancelled: palette.slate500,
} as const;

/* ------------------------------------------------------------------ *
 * Semantic colour tokens — DARK.
 * ------------------------------------------------------------------ */
export const darkColors = {
  background: palette.night900,
  surface: palette.night800,
  surfaceSunken: palette.night650,
  surfaceSoft: palette.night600,
  surfaceDark: palette.night700, // hero card lifts off the canvas
  overlay: 'rgba(0, 0, 0, 0.6)',

  textPrimary: palette.nightText, // 15.3–17.8:1
  textSecondary: palette.nightText2, // 7.3–8.5:1
  textMuted: palette.nightText3, // ≥4.55:1 AA on canvas / surface / hero / sunken / soft (measured)
  textInverse: palette.night900, // ink-on-light becomes ink text on light btn
  textOnDark: palette.nightText,
  textOnDarkMuted: palette.nightText3,

  border: palette.nightLine,
  borderStrong: palette.nightLineStrong,

  // On dark, the primary action inverts to a light "paper" button.
  brand: palette.nightText,
  brandPressed: '#D8DAE0',
  brandInverse: palette.night900,

  accent: palette.nightText,
  accentPressed: '#D8DAE0',
  accentSoft: palette.night600,

  progress: palette.nightText,
  progressDark: palette.nightText,
  progressPressed: '#D8DAE0',
  streak: palette.nightText2,
  streakDark: palette.nightText,
  highlight: palette.nightText,
  ai: palette.nightText,
  aiPressed: '#D8DAE0',
  aiSoft: palette.night600,
  info: palette.nightText2,
  infoSoft: palette.night600,
  error: palette.nightText,
  errorPressed: '#D8DAE0',
  errorSoft: palette.night600,

  progressSoft: palette.night600,
  streakSoft: palette.night600,

  planned: palette.nightText3,
  inProgress: palette.nightText2,
  completed: palette.nightText,
  missed: palette.nightText3,
  rescheduled: palette.nightText3,
  cancelled: palette.nightLineStrong,
} as const;

/**
 * Both schemes must satisfy this shape. Values are widened to `string` so the
 * dark set (whose literals differ) is assignable to the same token type.
 */
export type ColorTokens = { readonly [K in keyof typeof lightColors]: string };

/** The default (light) set — kept as `colors` for existing imports. */
export const colors = lightColors;

export type ColorScheme = 'light' | 'dark';
export const schemes = { light: lightColors, dark: darkColors } as const;

/* ------------------------------------------------------------------ *
 * Spacing — 4pt base. Fewer steps, generous by default.
 * ------------------------------------------------------------------ */
export const spacing = {
  none: 0,
  xxs: 2, // optical hairline gaps only
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  xHuge: 48,
  section: 64,
} as const;

/* ------------------------------------------------------------------ *
 * Radius — soft, consistent. Pills for tags, rounded-rect for controls,
 * generous corners for cards.
 * ------------------------------------------------------------------ */
export const radii = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 20,
  card: 24, // cards — soft, reference-matched
  cardLg: 28, // feature / hero cards
  sheet: 32, // bottom sheets, modals
  control: 16, // inputs
  round: 999, // true circle for any size
  pill: 9999, // buttons, chips, badges
} as const;

/**
 * Two faces, two jobs.
 *
 *  - **Poppins** is the display voice: headlines, hero numbers, card titles.
 *    Geometric and editorial. 600 carries the heaviest headline; 400/500
 *    carry the quieter second line.
 *  - **Inter** is the working voice: body copy, labels, buttons, captions.
 *    Quiet, neutral, legible at 13–16pt.
 *
 * Every weight maps to a real font file. Never pair these families with a
 * `fontWeight` value — that can trigger synthetic bolding on native.
 */
export const fontFamily = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemiBold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  display: 'Poppins_600SemiBold',
  displayMedium: 'Poppins_500Medium',
  displayRegular: 'Poppins_400Regular',
  /** Compatibility aliases for older components. */
  displaySemiBold: 'Poppins_600SemiBold',
  displayBold: 'Poppins_600SemiBold',
} as const;

/** Ramp tuned for the reference: big display sizes, quiet body. */
export const fontSize = {
  xs: 11, // caption2
  sm: 12, // caption1
  base: 13, // footnote
  md: 15, // subhead
  lg: 16, // callout
  xl: 17, // body / headline
  xxl: 20, // title3
  title: 24, // title2
  display: 31, // title1
  hero: 36, // largeTitle
  mega: 44, // hero numbers
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semiBold: '600',
  bold: '700',
} as const;

/**
 * Soft, layered elevation. Two tiers only — a hairline lift for resting
 * surfaces, a deeper one for modals / featured cards. Borders do the rest of
 * the definition, so shadows stay whisper-quiet.
 */
export const shadows = {
  none: undefined,
  subtle: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 18,
    elevation: 2,
  },
  raised: {
    shadowColor: palette.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 10,
  },
} as const;

export const layout = {
  screenWidthMax: 480, // constrain to phone-like column on web
  contentMaxWidth: 520,
  tabBarHeight: 66, // floating capsule
  tabBarInset: 14, // gap from the screen edge
  tabBarFabSize: 60, // separate primary action
  screenBottomPadding: 136, // clears the capsule + separate FAB
  minTouchTarget: 44,
} as const;

export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export const tokens = {
  palette,
  colors,
  lightColors,
  darkColors,
  spacing,
  radii,
  fontFamily,
  fontSize,
  fontWeight,
  shadows,
  layout,
  motion,
} as const;

export type Tokens = typeof tokens;

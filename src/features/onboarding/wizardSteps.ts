import type { IconName } from '@/design-system/icons';

/**
 * Seed-data wizard — step configuration.
 *
 * Essential-only flow (trimmed from 10 screens): one question per screen,
 * every answer changes something visible in the app:
 * • name        → greeting + profile display name
 * • goals       → focus areas on the profile bio (and future home sorting)
 * • check-in    → the daily check-in notification window
 * • coach tone  → how the coach is framed in the bio (and its prompts later)
 * • vision      → creates the user's first vision (skippable)
 *
 * Cut for being non-essential (HIG onboarding: brief, postpone nonessential
 * customization): the marketing stat interstitial, the fake "building" loading
 * screen, notification toggles and accent picker — both live in Settings with
 * working defaults, so skipping costs nothing.
 *
 * The *layout, spacing, type scale and radii* still follow the reference, but
 * every colour, font and radius comes from the app's theme tokens, so the
 * wizard tracks the user's customization.
 */

export type WizardStepKind =
  | 'text'
  | 'choice'
  | 'chips'
  | 'vision'
  | 'ready';

/** Answer keys this wizard writes. Array-valued: 'goals'. */
export type WizardField =
  | 'name'
  | 'goals'
  | 'checkInTime'
  | 'coachTone'
  | 'visionTitle'
  | 'visionWhy';

export const ARRAY_FIELDS: WizardField[] = ['goals'];

export interface ChoiceOption {
  label: string;
  /** Stored answer value; falls back to `label` when omitted. */
  value?: string;
  /** Optional second line under the label (e.g. the literal time). */
  caption?: string;
}

interface BaseStep {
  /** Stable key; also the progress-dot count unit (excludes 'ready'). */
  id: string;
  kind: WizardStepKind;
  /** Display headline. `{{name}}` is replaced with the first name. */
  title: string;
  /** Quiet second line under the headline. */
  subtitle?: string;
  /** Key in WizardAnswers this step writes to (absent for 'stat'/'building'/'ready'). */
  field?: WizardField;
}

export interface TextStep extends BaseStep {
  kind: 'text';
  placeholder?: string;
  /** Renders the quiet underlined escape link ("I'm not sure yet"). */
  skipLabel?: string;
}

export interface ChoiceStep extends BaseStep {
  kind: 'choice';
  options: ChoiceOption[];
  /** Renders "Add your own answer" under the pills. */
  allowCustom?: boolean;
}

export interface ChipsStep extends BaseStep {
  kind: 'chips';
  /** Prompt above the grid. */
  groupLabel: string;
  options: ChoiceOption[];
  /** 0 means "optional — Continue is always allowed". */
  min: number;
}

export interface VisionStep extends BaseStep {
  kind: 'vision';
  titlePlaceholder?: string;
  whyPlaceholder?: string;
  /** Renders the quiet underlined escape link. */
  skipLabel?: string;
}

export interface ReadyStep extends BaseStep {
  kind: 'ready';
  /** Timeline rows: what happens next. */
  points: { icon: IconName; title: string; body: string }[];
}

export type WizardStep = TextStep | ChoiceStep | ChipsStep | VisionStep | ReadyStep;

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'name',
    kind: 'text',
    field: 'name',
    title: 'What should we call you?',
    subtitle: 'Your first name is perfect.',
    placeholder: 'e.g. Ada',
  },
  {
    id: 'goals',
    kind: 'chips',
    field: 'goals',
    title: '{{name}}, what should Correr help you move toward?',
    subtitle: 'Pick at least one. This shapes what you see first.',
    groupLabel: 'Your focus areas',
    min: 1,
    options: [
      { label: 'Career growth' },
      { label: 'Health & fitness' },
      { label: 'Money' },
      { label: 'Learning' },
      { label: 'Creativity' },
      { label: 'Business' },
      { label: 'Relationships' },
      { label: 'Faith' },
    ],
  },
  {
    id: 'checkIn',
    kind: 'choice',
    field: 'checkInTime',
    title: 'When should your daily check-in land?',
    subtitle: 'One honest question, at a time that suits your day.',
    options: [
      { label: 'Morning', caption: '7:00 AM', value: '07:00' },
      { label: 'Midday', caption: '12:00 PM', value: '12:00' },
      { label: 'Evening', caption: '8:00 PM', value: '20:00' },
      { label: 'Late evening', caption: '9:30 PM', value: '21:30' },
    ],
  },
  {
    id: 'coachTone',
    kind: 'choice',
    field: 'coachTone',
    title: 'How should your coach talk to you?',
    subtitle: 'You can change this later in Settings.',
    options: [
      { label: 'Warm & encouraging', value: 'warm' },
      { label: 'Direct & honest', value: 'direct' },
      { label: 'Curious — asks questions', value: 'socratic' },
    ],
  },
  {
    id: 'vision',
    kind: 'vision',
    field: 'visionTitle',
    title: 'Name the future you’re running toward.',
    subtitle: 'One or two sentences. The AI will build the road from here.',
    titlePlaceholder: 'e.g. Launch my own studio',
    whyPlaceholder: 'Why does this matter to you? (a sentence or two)',
    skipLabel: 'I’ll do this later',
  },
  {
    id: 'ready',
    kind: 'ready',
    title: 'You are ready to run, {{name}}.',
    subtitle: 'Small commitments, kept daily, beat rare bursts of motivation.',
    points: [
      {
        icon: 'compass',
        title: 'Name the vision',
        body: 'Write the future you are running toward and let it set your priorities.',
      },
      {
        icon: 'bulb',
        title: 'Let AI build the road',
        body: 'Correr turns your vision into goals and small steps for this week.',
      },
      {
        icon: 'check',
        title: 'Run one goal a day',
        body: 'Keep a small daily commitment and watch the streak compound.',
      },
    ],
  },
];

/** Steps that show a progress dot (everything before the closing reveal). */
export const DOT_STEPS = WIZARD_STEPS.filter((s) => s.kind !== 'ready');

/** Total progress-dot count. */
export const DOT_COUNT = DOT_STEPS.length;

/** Human labels for stored tone/pref values (bio copy + a11y). */
export const COACH_TONE_LABELS: Record<string, string> = {
  warm: 'Warm & encouraging',
  direct: 'Direct & honest',
  socratic: 'Curious & questioning',
};

/** Replace the `{{name}}` token with the entered (or a fallback) first name. */
export function withName(title: string, name?: string): string {
  const first = name?.trim().split(/\s+/)[0];
  if (!first) return title.replace('{{name}}', 'Runner');
  return title.replace('{{name}}', first);
}

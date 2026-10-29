import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

/**
 * Wizard answers + progress.
 *
 * Persisted locally (AsyncStorage) so closing the app mid-wizard never loses
 * answers. Keyed per user when a session exists, and per a stable anonymous id
 * before sign-in, so a resumed wizard picks up exactly where it stopped.
 *
 * The shape is deliberately small and serialisable — it is written on every
 * step change, so it must stay cheap and forward-compatible (unknown keys are
 * ignored on read, never fatal).
 */
export interface WizardAnswers {
  name?: string;
  /** Focus areas (chips). */
  goals?: string[];
  /** Daily check-in window, "HH:MM". */
  checkInTime?: string;
  /** Coach tone: warm | direct | socratic. */
  coachTone?: string;
  /** First vision captured in the wizard (skippable). */
  visionTitle?: string;
  visionWhy?: string;
  /** Legacy keys from earlier wizard versions — ignored on read, kept typed.
   *  (notifPrefs/accentId were cut when the wizard was trimmed to essentials:
   *  both live in Settings with working defaults.) */
  notifPrefs?: string[];
  accentId?: string;
  behavior?: string;
  weight?: string;
  blocker?: string;
  energy?: string;
  interests?: string[];
}

export interface WizardState {
  /** Highest question index reached (0-based). Drives the progress dots. */
  step: number;
  answers: WizardAnswers;
  /** True once the user has seen the closing "ready" screen. */
  completed: boolean;
  /** Set when the user dismisses the home resume prompt (per user). */
  promptDismissed: boolean;
  /** Set when the user dismisses the home "name your vision" entry prompt. */
  visionPromptDismissed?: boolean;
}

const STORAGE_KEY = 'correr.wizard.v1';
const ANON_KEY = 'anon';

export const EMPTY_STATE: WizardState = {
  step: 0,
  answers: {},
  completed: false,
  promptDismissed: false,
  visionPromptDismissed: false,
};

function storageKey(userId?: string | null): string {
  return `${STORAGE_KEY}.${userId ?? ANON_KEY}`;
}

/** Read persisted wizard state for a user (or anonymous). Never throws. */
export async function loadWizardState(
  userId?: string | null,
): Promise<WizardState> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return { ...EMPTY_STATE, answers: {} };
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return {
      step: typeof parsed.step === 'number' ? Math.max(0, parsed.step) : 0,
      answers: parsed.answers && typeof parsed.answers === 'object' ? parsed.answers : {},
      completed: parsed.completed === true,
      promptDismissed: parsed.promptDismissed === true,
      visionPromptDismissed: parsed.visionPromptDismissed === true,
    };
  } catch {
    return { ...EMPTY_STATE, answers: {} };
  }
}

/** Write wizard state. Returns the state it wrote for convenient chaining. */
export async function saveWizardState(
  state: WizardState,
  userId?: string | null,
): Promise<WizardState> {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {
    // A failed write must not block the wizard; the in-memory state still holds.
  }
  return state;
}

/** Drop persisted wizard state (used by reset / sign-out hygiene). */
export async function clearWizardState(userId?: string | null): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}

/**
 * Live wizard state for a user. Re-reads when the key changes and exposes a
 * setter that persists immediately, so every answer is durable the moment it
 * is made.
 */
export function useWizardState(userId?: string | null): {
  state: WizardState;
  ready: boolean;
  setState: (next: WizardState | ((current: WizardState) => WizardState)) => void;
} {
  const [state, setStateRaw] = useState<WizardState>(EMPTY_STATE);
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);

  // `ready` is derived, not stored: it flips true only once the load for the
  // current user has resolved. This avoids the setState-synchronously-in-effect
  // lint error (no setState call in the effect body itself).
  useEffect(() => {
    let alive = true;
    loadWizardState(userId)
      .then((loaded) => {
        if (!alive) return;
        setStateRaw(loaded);
        setLoadedFor(userId);
      })
      .catch(() => {
        if (!alive) return;
        setStateRaw({ ...EMPTY_STATE, answers: {} });
        setLoadedFor(userId);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const ready = loadedFor !== undefined && loadedFor === userId;

  // Persist after the state has committed. Writing from inside the setter
  // would capture a stale snapshot when two updates happen in one event.
  useEffect(() => {
    if (!ready) return;
    void saveWizardState(state, userId);
  }, [ready, state, userId]);

  const setState = (next: WizardState | ((current: WizardState) => WizardState)) => {
    setStateRaw((current) => (typeof next === 'function' ? next(current) : next));
  };

  return { state, ready, setState };
}

import type {
  AiDiscovery,
  Commitment,
  GeneratedRoadmap,
  Streak,
  Vision,
} from '../core/domain';

export interface CoachHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachContext {
  kind: 'coach' | 'discovery' | 'recovery' | 'weekly_review' | 'roadmap';
  userMessage: string;
  vision?: Vision;
  todayCommitments: Commitment[];
  streak?: Streak;
  history?: CoachHistoryMessage[];
  /** Coach tone chosen in onboarding (warm | direct | socratic). */
  tone?: string;
}

/**
 * AiProvider — the single AI boundary (PRD security boundary:
 * provider keys live server-side; this interface is what the app talks to).
 * Real providers (Claude/GPT/Gemini) plug in behind the same methods later.
 */
export interface AiProvider {
  generateRoadmap(
    vision: Vision,
    discovery: AiDiscovery | null,
    adjustmentContext?: string,
  ): Promise<GeneratedRoadmap>;
  chat(ctx: CoachContext): Promise<string>;
}

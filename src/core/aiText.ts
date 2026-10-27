import type { GeneratedRoadmap } from './domain';
import { LIMITS } from './validation';

const MAX_GOALS = 5;
const MAX_MILESTONES = 4;
const MAX_FIRST_ACTIONS = 4;

/**
 * Normalize model text for display. Models sometimes return typographic
 * dashes, non-breaking hyphens, or markdown emphasis even when asked not to.
 * The product voice uses plain punctuation.
 */
export function sanitizeAiText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2011/g, '-')
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/[*_`]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** A single-line field for roadmap cards. */
export function sanitizeAiLine(value: string): string {
  return sanitizeAiText(value).replace(/\s+/g, ' ').trim();
}

function asLine(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Roadmap ${field} is missing.`);
  }
  const clean = sanitizeAiLine(value);
  if (!clean) throw new Error(`Roadmap ${field} is empty.`);
  return clean.slice(0, maxLength);
}

function parseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Some models wrap the object in a sentence despite the schema. Extract
    // the outer object before giving up.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        // Fall through to the shared error below.
      }
    }
    throw new Error('The AI response was not valid JSON.');
  }
}

/**
 * Validate the model's roadmap payload before it reaches the database or the
 * UI. A malformed payload throws, which lets the caller fall back cleanly.
 */
export function parseRoadmapPayload(raw: string): GeneratedRoadmap {
  const root = parseJson(raw);
  if (!root || typeof root !== 'object') {
    throw new Error('The AI response was not a roadmap.');
  }
  const record = root as Record<string, unknown>;
  if (!Array.isArray(record.goals) || record.goals.length === 0) {
    throw new Error('The AI roadmap has no goals.');
  }

  const goals = record.goals.slice(0, MAX_GOALS).map((goal, goalIndex) => {
    if (!goal || typeof goal !== 'object') {
      throw new Error(`Roadmap goal ${goalIndex + 1} is invalid.`);
    }
    const goalRecord = goal as Record<string, unknown>;
    if (!Array.isArray(goalRecord.milestones) || goalRecord.milestones.length === 0) {
      throw new Error(`Roadmap goal ${goalIndex + 1} has no milestones.`);
    }
    const milestones = goalRecord.milestones
      .slice(0, MAX_MILESTONES)
      .map((milestone, milestoneIndex) => {
        if (!milestone || typeof milestone !== 'object') {
          throw new Error(
            `Roadmap milestone ${milestoneIndex + 1} is invalid.`,
          );
        }
        const milestoneRecord = milestone as Record<string, unknown>;
        const timeframe =
          typeof milestoneRecord.timeframe === 'string' &&
          milestoneRecord.timeframe.trim()
            ? sanitizeAiLine(milestoneRecord.timeframe).slice(0, 60)
            : undefined;
        return {
          title: asLine(
            milestoneRecord.title,
            'milestone title',
            LIMITS.titleMax,
          ),
          description: asLine(
            milestoneRecord.description,
            'milestone description',
            LIMITS.mediumText,
          ),
          ...(timeframe ? { timeframe } : {}),
        };
      });
    return {
      title: asLine(goalRecord.title, 'goal title', LIMITS.titleMax),
      description: asLine(
        goalRecord.description,
        'goal description',
        LIMITS.mediumText,
      ),
      milestones,
    };
  });

  const actions = Array.isArray(record.firstActions)
    ? record.firstActions
        .filter((action): action is string => typeof action === 'string')
        .map((action) => sanitizeAiLine(action).slice(0, LIMITS.shortText))
        .filter(Boolean)
        .slice(0, MAX_FIRST_ACTIONS)
    : [];
  if (actions.length === 0) {
    throw new Error('The AI roadmap has no first actions.');
  }

  return { goals, firstActions: actions };
}

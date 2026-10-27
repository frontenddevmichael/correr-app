import { describe, expect, it } from 'vitest';

import {
  parseRoadmapPayload,
  sanitizeAiLine,
  sanitizeAiText,
} from './aiText';

describe('sanitizeAiText', () => {
  it('removes em dashes and non-breaking hyphens', () => {
    expect(
      sanitizeAiText('Start small — then build momentum. Use a mobile‑friendly page.'),
    ).toBe('Start small, then build momentum. Use a mobile-friendly page.');
  });

  it('removes markdown emphasis and collapses extra whitespace', () => {
    expect(sanitizeAiText('  **One**   clear _step_  ')).toBe('One clear step');
  });

  it('keeps paragraph breaks for chat replies', () => {
    expect(sanitizeAiText('First line.\n\nSecond line.')).toBe(
      'First line.\n\nSecond line.',
    );
  });

  it('returns a single line for card fields', () => {
    expect(sanitizeAiLine('First line.\nSecond line.')).toBe(
      'First line. Second line.',
    );
  });
});

describe('parseRoadmapPayload', () => {
  const valid = JSON.stringify({
    goals: [
      {
        title: 'Build the base',
        description: 'Make the first version real.',
        milestones: [
          {
            title: 'Ship one page',
            description: 'Publish a single page this week.',
            timeframe: 'Week 1',
          },
        ],
      },
    ],
    firstActions: ['Open the editor.', 'Write one sentence.'],
  });

  it('parses a fenced JSON roadmap', () => {
    const roadmap = parseRoadmapPayload('```json\n' + valid + '\n```');
    expect(roadmap.goals).toHaveLength(1);
    expect(roadmap.goals[0].milestones[0].title).toBe('Ship one page');
    expect(roadmap.firstActions).toHaveLength(2);
  });

  it('extracts JSON from a short surrounding sentence', () => {
    const roadmap = parseRoadmapPayload(`Here is the plan: ${valid}`);
    expect(roadmap.goals).toHaveLength(1);
  });

  it('sanitizes text inside the roadmap', () => {
    const raw = JSON.stringify({
      goals: [
        {
          title: 'Build a calm — lasting practice',
          description: 'Use a mobile‑friendly page.',
          milestones: [
            {
              title: 'Ship one page',
              description: 'Publish a single page.',
              timeframe: 'Week 1',
            },
          ],
        },
      ],
      firstActions: ['Open the editor.'],
    });
    const roadmap = parseRoadmapPayload(raw);
    expect(roadmap.goals[0].title).toBe('Build a calm, lasting practice');
    expect(roadmap.goals[0].description).toBe('Use a mobile-friendly page.');
  });

  it('caps goals, milestones, and actions', () => {
    const raw = JSON.stringify({
      goals: Array.from({ length: 8 }, (_, goalIndex) => ({
        title: `Goal ${goalIndex}`,
        description: 'A goal.',
        milestones: Array.from({ length: 8 }, (_, milestoneIndex) => ({
          title: `Milestone ${milestoneIndex}`,
          description: 'A milestone.',
          timeframe: 'Week 1',
        })),
      })),
      firstActions: Array.from({ length: 8 }, (_, index) => `Action ${index}`),
    });
    const roadmap = parseRoadmapPayload(raw);
    expect(roadmap.goals).toHaveLength(5);
    expect(roadmap.goals[0].milestones).toHaveLength(4);
    expect(roadmap.firstActions).toHaveLength(4);
  });

  it('rejects invalid JSON', () => {
    expect(() => parseRoadmapPayload('not json')).toThrow(
      'The AI response was not valid JSON.',
    );
  });

  it('rejects a roadmap without goals', () => {
    expect(() =>
      parseRoadmapPayload(JSON.stringify({ goals: [], firstActions: ['Go.'] })),
    ).toThrow('The AI roadmap has no goals.');
  });

  it('rejects a goal without milestones', () => {
    expect(() =>
      parseRoadmapPayload(
        JSON.stringify({
          goals: [{ title: 'Goal', description: 'A goal.', milestones: [] }],
          firstActions: ['Go.'],
        }),
      ),
    ).toThrow('Roadmap goal 1 has no milestones.');
  });
});

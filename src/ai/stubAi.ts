import type { AiDiscovery, GeneratedRoadmap, Vision } from '../core/domain';
import type { AiProvider, CoachContext } from './aiProvider';

const CATEGORY_STRUCTURES: Record<
  string,
  { goal: string; milestones: string[] }[]
> = {
  career: [
    {
      goal: 'Build foundational skills',
      milestones: ['Learn the core fundamentals', 'Complete 2 guided projects', 'Get feedback from practitioners'],
    },
    {
      goal: 'Build a credible portfolio',
      milestones: ['Ship 3 portfolio projects', 'Write case studies for each', 'Polish your online presence'],
    },
    {
      goal: 'Enter the market',
      milestones: ['Map 20 target roles or clients', 'Practice interviews weekly', 'Apply with a focused weekly quota'],
    },
  ],
  education: [
    {
      goal: 'Master the fundamentals',
      milestones: ['Cover the core syllabus', 'Build a weekly study rhythm', 'Test yourself with past papers'],
    },
    {
      goal: 'Deepen with application',
      milestones: ['Complete a capstone project', 'Join a study community', 'Teach a topic to someone else'],
    },
  ],
  health: [
    {
      goal: 'Build the base habit',
      milestones: ['Establish 3 sessions per week', 'Track sleep for 2 weeks', 'Fix nutrition basics'],
    },
    {
      goal: 'Progress with structure',
      milestones: ['Follow a progressive plan', 'Reassess after 6 weeks', 'Lock in the routine'],
    },
  ],
  finance: [
    {
      goal: 'Gain control',
      milestones: ['Track every expense for 30 days', 'Build a starter emergency fund', 'Automate your savings'],
    },
    {
      goal: 'Grow deliberately',
      milestones: ['Learn investment fundamentals', 'Open and fund an account', 'Set yearly targets'],
    },
  ],
  creativity: [
    {
      goal: 'Build a daily practice',
      milestones: ['Create something small daily', 'Study work you admire', 'Publish weekly'],
    },
    {
      goal: 'Ship real work',
      milestones: ['Finish one meaningful piece', 'Get critique from peers', 'Release it publicly'],
    },
  ],
  business: [
    {
      goal: 'Validate the idea',
      milestones: ['Talk to 10 potential customers', 'Define the core offer', 'Pre-sell to 3 people'],
    },
    {
      goal: 'Build and launch',
      milestones: ['Ship a minimal version', 'Onboard first users', 'Collect and apply feedback'],
    },
    {
      goal: 'Grow sustainably',
      milestones: ['Find a repeatable channel', 'Track the right numbers', 'Systemize operations'],
    },
  ],
  relationships: [
    {
      goal: 'Invest consistently',
      milestones: ['Schedule weekly quality time', 'Practice intentional listening', 'Create a shared tradition'],
    },
  ],
  faith: [
    {
      goal: 'Deepen the foundation',
      milestones: ['Build a daily quiet time', 'Join a community', 'Serve somewhere regularly'],
    },
  ],
  other: [
    {
      goal: 'Get clear',
      milestones: ['Define what done looks like', 'Break it into 3 outcomes', 'Set your weekly rhythm'],
    },
    {
      goal: 'Build momentum',
      milestones: ['Complete your first small win', 'Review and adjust weekly', 'Keep the streak alive'],
    },
  ],
};

const FIRST_ACTION_TEMPLATES = [
  'Block 30 focused minutes today and take the very first small step.',
  'Write down the single next action and do it before checking your phone again.',
  'Spend 25 minutes on the first milestone. Starting beats planning.',
  'Message one person who can help or hold you accountable today.',
];

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

export class StubAi implements AiProvider {
  async generateRoadmap(
    vision: Vision,
    discovery: AiDiscovery | null,
    adjustmentContext?: string,
  ): Promise<GeneratedRoadmap> {
    const seed = (vision.title.length + vision.category.length + (adjustmentContext?.length ?? 0)) | 0;
    const structures = CATEGORY_STRUCTURES[vision.category] ?? CATEGORY_STRUCTURES.other;
    const paceNote =
      discovery?.preferredPace === 'intense'
        ? 'with an intensive pace'
        : discovery?.preferredPace === 'flexible'
          ? 'with a flexible rhythm'
          : 'at a steady pace';

    return {
      goals: structures.map((s, i) => ({
        title: s.goal,
        description: `${vision.title}: ${s.goal.toLowerCase()}, step ${i + 1} of ${structures.length}, ${paceNote}.`,
        milestones: s.milestones.map((m, mi) => ({
          title: m,
          description: `Milestone ${mi + 1} toward “${s.goal}”.`,
          timeframe: mi === 0 ? 'Weeks 1 to 3' : mi === 1 ? 'Weeks 4 to 8' : 'Weeks 9 to 12',
        })),
      })),
      firstActions: [
        ...structures[0].milestones.slice(0, 2).map((m) => `Start: ${m.toLowerCase()}.`),
        pick(FIRST_ACTION_TEMPLATES, seed),
      ],
    };
  }

  async chat(ctx: CoachContext): Promise<string> {
    const v = ctx.vision;
    const visionLine = v ? `your vision of ${v.title.toLowerCase()}` : 'your goals';
    const streakLine = ctx.streak && ctx.streak.commitmentStreak > 1
      ? ` You are on a ${ctx.streak.commitmentStreak} day streak. Protect it.`
      : '';
    const openCount = ctx.todayCommitments.filter((c) => c.state !== 'completed').length;
    const commitmentLine =
      openCount > 0
        ? `You have ${openCount} commitment${openCount > 1 ? 's' : ''} left today.`
        : 'Everything due today is done. Nice work.';

    const lower = ctx.userMessage.toLowerCase();

    if (ctx.kind === 'recovery' || lower.includes('stuck') || lower.includes('behind')) {
      return `Missing one commitment does not erase your progress toward ${visionLine}. ${commitmentLine} What got in the way? If it was time, shrink today's action to 10 minutes.`;
    }
    if (lower.includes('plan') || lower.includes('roadmap') || ctx.kind === 'roadmap') {
      return `For ${visionLine}, pick one milestone and give it a deadline this week. How much time do you realistically have each day?`;
    }
    if (ctx.kind === 'weekly_review') {
      return `${commitmentLine} The pattern to keep is consistency over intensity. What is one thing you would change next week?${streakLine}`;
    }
    return `I am tracking ${visionLine} with you. ${commitmentLine}${streakLine} What would help most right now?`;
  }
}

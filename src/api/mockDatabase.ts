import type {
  AccountabilityPartnership,
  AchievementDef,
  AiInsight,
  AIConversation,
  AppNotification,
  Challenge,
  CheckIn,
  Circle,
  CirclePost,
  Commitment,
  CommitmentEvent,
  Goal,
  Hackathon,
  HackathonMilestone,
  HackathonSubmission,
  HackathonTeam,
  Milestone,
  PartnerInteraction,
  Profile,
  SafetyRecord,
  Session,
  SharedGoal,
  Streak,
  Subscription,
  User,
  UserAchievement,
  Vision,
  XPTransaction,
} from '@/core/domain';
import { ACHIEVEMENT_DEFS, LEVEL_THRESHOLDS, XP_CONFIG } from '@/core/domain';
import { kv } from './storage';

export { ACHIEVEMENT_DEFS };

const STORAGE_KEY = 'correr.mockdb.v1';

export interface MockDb {
  session: Session | null;
  users: (User & { password: string })[];
  profiles: Profile[];
  visions: Vision[];
  goals: Goal[];
  milestones: Milestone[];
  discoveries: { id: string; userId: string; visionId: string; currentState: string; timeAvailablePerDay: number; blockers: string[]; preferredPace: string; constraints: string; completedAt: string }[];
  commitments: Commitment[];
  commitmentEvents: CommitmentEvent[];
  partnerships: AccountabilityPartnership[];
  checkIns: CheckIn[];
  interactions: PartnerInteraction[];
  safetyRecords: SafetyRecord[];
  xpTransactions: XPTransaction[];
  streaks: Streak[];
  achievements: AchievementDef[];
  userAchievements: UserAchievement[];
  conversations: AIConversation[];
  messages: { id: string; conversationId: string; role: 'user' | 'assistant'; content: string; createdAt: string }[];
  insights: AiInsight[];
  notifications: AppNotification[];
  circles: Circle[];
  circleMembers: { circleId: string; userId: string; role: 'owner' | 'member'; joinedAt: string }[];
  circlePosts: CirclePost[];
  challenges: Challenge[];
  sharedGoals: SharedGoal[];
  hackathons: Hackathon[];
  hackathonTeams: HackathonTeam[];
  hackathonMilestones: HackathonMilestone[];
  hackathonSubmissions: HackathonSubmission[];
  subscription: Subscription | null;
}



function emptyDb(): MockDb {
  return {
    session: null,
    users: [],
    profiles: [],
    visions: [],
    goals: [],
    milestones: [],
    discoveries: [],
    commitments: [],
    commitmentEvents: [],
    partnerships: [],
    checkIns: [],
    interactions: [],
    safetyRecords: [],
    xpTransactions: [],
    streaks: [],
    achievements: ACHIEVEMENT_DEFS,
    userAchievements: [],
    conversations: [],
    messages: [],
    insights: [],
    notifications: [],
    circles: [],
    circleMembers: [],
    circlePosts: [],
    challenges: [],
    sharedGoals: [],
    hackathons: [],
    hackathonTeams: [],
    hackathonMilestones: [],
    hackathonSubmissions: [],
    subscription: null,
  };
}

let db: MockDb | null = null;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  for (const l of listeners) l();
}

export async function loadDb(): Promise<MockDb> {
  if (db) {
    seedMissingDemoContent(db);
    return db;
  }
  const raw = await kv.get(STORAGE_KEY);
  if (raw) {
    try {
      db = { ...emptyDb(), ...(JSON.parse(raw) as MockDb) };
      seedMissingDemoContent(db);
      return db;
    } catch {
      // fall through to fresh db
    }
  }
  db = emptyDb();
  seedMissingDemoContent(db);
  await persist();
  return db;
}

/** Public demo content for Circles / Challenges / Correr Build (idempotent). */
function seedMissingDemoContent(d: MockDb) {
  const now = new Date().toISOString();
  const inDays = (n: number) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toISOString();
  };
  if (d.circles.length === 0) {
    d.circles.push(
      {
        id: 'cir_seed_founders',
        name: 'Early Morning Builders',
        description: 'Builders who show up before the world wakes up. Daily wins, zero excuses.',
        ownerId: 'usr_seed_jordan',
        memberCount: 128,
        viewerIsMember: false,
        isPrivate: false,
        createdAt: now,
      },
      {
        id: 'cir_seed_students',
        name: 'Students on a Mission',
        description: 'Exam-season accountability for students chasing big goals.',
        ownerId: 'usr_seed_sam',
        memberCount: 74,
        viewerIsMember: false,
        isPrivate: false,
        createdAt: now,
      },
    );
  }
  if (d.circlePosts.length === 0) {
    d.circlePosts.push(
      {
        id: 'post_seed_1',
        circleId: 'cir_seed_founders',
        userId: 'usr_seed_jordan',
        authorName: 'Jordan',
        content: 'Shipped my portfolio case study before 7am. Week 3 streak intact.',
        kind: 'win',
        createdAt: now,
      },
      {
        id: 'post_seed_2',
        circleId: 'cir_seed_founders',
        userId: 'usr_seed_sam',
        authorName: 'Sam',
        content: 'Rough day yesterday — reset with a 10-minute commitment today. Back on it.',
        kind: 'checkin',
        createdAt: now,
      },
      {
        id: 'post_seed_3',
        circleId: 'cir_seed_students',
        userId: 'usr_seed_sam',
        authorName: 'Sam',
        content: 'Who else is doing 45 focused minutes before breakfast this week?',
        kind: 'general',
        createdAt: now,
      },
    );
  }
  if (d.challenges.length === 0) {
    d.challenges.push({
      id: 'chl_seed_7day',
      title: '7-Day Commitment Streak',
      description: 'Complete at least one commitment every day for 7 days straight.',
      startAt: inDays(0),
      endAt: inDays(7),
      xpBonus: 50,
      participantIds: [],
    });
  }
  if (d.profiles.filter((p) => p.campusOrgId === 'org_seed_stateu').length < 40) {
    // Campus cohort (Phase 8): ≥ MIN_COHORT_SIZE so aggregate metrics render.
    for (let i = 0; i < 40; i++) {
      d.profiles.push({
        ...defaultProfile(`usr_seed_campus_${i}`, `Campus Runner ${i + 1}`),
        onboardingState: 'done',
        campusRole: 'student',
        campusOrgId: 'org_seed_stateu',
        xp: 40 + ((i * 37) % 260),
      });
    }
  }
  if (d.hackathons.length === 0) {
    d.hackathons.push({
      id: 'hac_seed_build',
      name: 'Correr Build Sprint',
      description:
        'A 5-day sprint where teams build and ship something real while running their vision.',
      startAt: inDays(3),
      endAt: inDays(8),
      status: 'upcoming',
      rules:
        'Teams of 2–4. Ship a working demo. Daily standups run as commitments. Judged on impact, craft and consistency.',
    });
  }
}

export async function persist(): Promise<void> {
  if (!db) return;
  await kv.set(STORAGE_KEY, JSON.stringify(db));
  notify();
}

export async function resetDb(): Promise<MockDb> {
  db = emptyDb();
  await persist();
  return db;
}

// ---------- helpers ----------

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function levelForXp(xp: number) {
  let current = LEVEL_THRESHOLDS[0].level;
  for (const t of LEVEL_THRESHOLDS) if (xp >= t.xp) current = t.level;
  return current;
}

export function defaultProfile(userId: string, displayName: string): Profile {
  return {
    userId,
    displayName,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    avatarColor: '#14161A',
    level: 'Starter',
    xp: 0,
    onboardingState: 'profile',
    notificationPrefs: {
      commitmentReminders: true,
      commitmentOverdue: true,
      partnerInteractions: true,
      dailyCheckIn: true,
      dailyCheckInWindow: '20:00',
      weeklyReview: true,
      weeklyReviewDay: 0,
      aiInsights: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    },
  };
}

export const XP = XP_CONFIG;

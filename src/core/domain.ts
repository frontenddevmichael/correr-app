/**
 * Correr domain model — the complete product (Phases 1–8).
 * Mirrors the PRD "Core Data Model" and extends it for post-MVP modules
 * (Circles, Correr Build / Hackathon mode, Campus dashboard, Billing).
 *
 * Engineering note (PRD): important behavioral events (commitment state
 * changes, XP) are modeled as immutable records.
 */

// ---------- Identity ----------

export type ISODate = string;

export interface User {
  id: string;
  email: string;
  createdAt: ISODate;
}

export type OnboardingStep =
  | 'welcome'
  | 'profile'
  | 'vision'
  | 'discovery'
  | 'roadmap'
  | 'accountability'
  | 'firstCommitment'
  | 'done';

export interface NotificationPreferences {
  commitmentReminders: boolean;
  commitmentOverdue: boolean;
  partnerInteractions: boolean;
  dailyCheckIn: boolean;
  dailyCheckInWindow: string; // "HH:MM"
  weeklyReview: boolean;
  weeklyReviewDay: number; // 0-6, Sunday = 0
  aiInsights: boolean;
  quietHoursStart: string; // "HH:MM"
  quietHoursEnd: string; // "HH:MM"
}

export interface Profile {
  userId: string;
  displayName: string;
  timezone: string;
  avatarColor: string;
  bio?: string;
  /** JSON blob of AppearanceSettings — synced customization (see design-system/settings). */
  appearance?: string;
  level: LevelName;
  xp: number;
  onboardingState: OnboardingStep;
  notificationPrefs: NotificationPreferences;
  /** Coach tone chosen in onboarding: warm | direct | socratic. */
  coachingTone?: string;
  /** Consent captured at sign-up: policy version + ISO timestamp. */
  consentVersion?: string;
  consentAt?: string;
  // Role flags for later modules
  campusRole?: 'student' | 'staff' | 'admin';
  campusOrgId?: string;
}

// ---------- Vision → Plan ----------

export type VisionCategory =
  | 'career'
  | 'education'
  | 'health'
  | 'finance'
  | 'creativity'
  | 'relationships'
  | 'faith'
  | 'business'
  | 'other';

export type VisionStatus = 'active' | 'completed' | 'archived';

export interface Vision {
  id: string;
  userId: string;
  title: string; // e.g. "Become a software engineer"
  description: string;
  whyItMatters: string;
  category: VisionCategory;
  targetTimeframe?: string; // free text e.g. "2 years"
  targetDate?: ISODate;
  priority: 'high' | 'medium' | 'low';
  status: VisionStatus;
  progressPercent: number; // derived, maintained on writes
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface Goal {
  id: string;
  visionId: string;
  userId: string;
  title: string;
  description: string;
  order: number;
  targetDate?: ISODate;
  status: 'planned' | 'active' | 'completed';
  progressPercent: number;
  createdAt: ISODate;
}

export interface Milestone {
  id: string;
  goalId: string;
  userId: string;
  title: string;
  description: string;
  order: number;
  targetDate?: ISODate;
  status: 'planned' | 'active' | 'completed';
  completedAt?: ISODate;
  createdAt: ISODate;
}

// ---------- AI discovery ----------

export interface AiDiscovery {
  id: string;
  userId: string;
  visionId: string;
  currentState: string; // where the user is today
  timeAvailablePerDay: number; // minutes
  blockers: string[];
  preferredPace: 'steady' | 'intense' | 'flexible';
  constraints: string;
  completedAt: ISODate;
}

// ---------- Commitments ----------

export type CommitmentState =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'missed'
  | 'rescheduled'
  | 'cancelled';

export interface Commitment {
  id: string;
  userId: string;
  visionId?: string;
  goalId?: string;
  milestoneId?: string;
  title: string;
  note?: string;
  dueAt: ISODate;
  state: CommitmentState;
  rescheduledFrom?: ISODate;
  completedAt?: ISODate;
  missedAt?: ISODate;
  recoveryCommitmentId?: string;
  visibility: 'private' | 'partner'; // sharing control (FR-16)
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Immutable history record (PRD engineering note). */
export interface CommitmentEvent {
  id: string;
  commitmentId: string;
  userId: string;
  from: CommitmentState | null;
  to: CommitmentState;
  at: ISODate;
  note?: string;
}

// ---------- Accountability ----------

export type PartnershipStatus = 'pending' | 'active' | 'ended';

export interface PartnershipSharing {
  todayCommitments: boolean;
  completionHistory: boolean;
  streakAndXp: boolean;
  weeklyReview: boolean; // never AI conversations
}

export interface AccountabilityPartnership {
  id: string;
  initiatorId: string;
  partnerId: string;
  status: PartnershipStatus;
  sharing: PartnershipSharing;
  inviteCode: string;
  startedAt?: ISODate;
  endedAt?: ISODate;
  createdAt: ISODate;
}

export interface CheckIn {
  id: string;
  userId: string;
  commitmentId?: string;
  day: string; // YYYY-MM-DD in user's timezone
  kind: 'daily' | 'recovery' | 'weekly';
  status: 'on_track' | 'struggling' | 'blocked' | 'done';
  blocker?: string;
  nextAction?: string;
  reflection?: string;
  createdAt: ISODate;
}

export interface PartnerInteraction {
  id: string;
  partnershipId: string;
  fromUserId: string;
  toUserId: string;
  commitmentId?: string;
  kind: 'confirm' | 'encourage' | 'question';
  message: string;
  createdAt: ISODate;
  readAt?: ISODate;
}

export interface SafetyRecord {
  id: string;
  reporterId: string;
  subjectId: string;
  kind: 'block' | 'report';
  reason?: string;
  createdAt: ISODate;
}

// ---------- Gamification ----------

export type LevelName =
  | 'Starter'
  | 'Consistent'
  | 'Committed'
  | 'Disciplined'
  | 'Vision Runner';

export const LEVEL_THRESHOLDS: { level: LevelName; xp: number }[] = [
  { level: 'Starter', xp: 0 },
  { level: 'Consistent', xp: 100 },
  { level: 'Committed', xp: 300 },
  { level: 'Disciplined', xp: 700 },
  { level: 'Vision Runner', xp: 1500 },
];

export const XP_CONFIG = {
  commitment_completed: 10,
  daily_checkin: 5,
  weekly_reflection: 15,
  encourage_partner: 3,
  milestone_completed: 20,
  recovery: 10,
} as const;

export type XpAction = keyof typeof XP_CONFIG;

/** Immutable XP ledger entry. */
export interface XPTransaction {
  id: string;
  userId: string;
  action: XpAction;
  amount: number;
  refId?: string;
  at: ISODate;
}

export interface Streak {
  userId: string;
  commitmentStreak: number; // consecutive periods with completed commitments
  partnershipStreak: number;
  lastActiveDay: string | null; // YYYY-MM-DD
  bestStreak: number;
}

export type AchievementId =
  | 'first_commitment'
  | 'first_week'
  | 'recovery'
  | 'supportive_partner'
  | 'milestone_reached';

export interface AchievementDef {
  id: AchievementId;
  title: string;
  description: string;
}

export interface UserAchievement {
  userId: string;
  achievementId: AchievementId;
  unlockedAt: ISODate;
}

/** Shared achievement catalogue — used by both the mock and the Convex backend. */
export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { id: 'first_commitment', title: 'First Commitment', description: 'You made your first commitment. The run starts now.' },
  { id: 'first_week', title: 'First Week', description: 'One full week of showing up for your vision.' },
  { id: 'recovery', title: 'Recovery', description: 'You missed, reflected, and came back. That takes discipline.' },
  { id: 'supportive_partner', title: 'Supportive Partner', description: 'You encouraged your accountability partner.' },
  { id: 'milestone_reached', title: 'Milestone Reached', description: 'A roadmap milestone is complete.' },
];

// ---------- AI ----------

export interface RoadmapNode {
  id: string;
  title: string;
  description: string;
  order: number;
  timeframe?: string;
  children?: RoadmapNode[];
}

export interface GeneratedRoadmap {
  goals: {
    title: string;
    description: string;
    milestones: { title: string; description: string; timeframe?: string }[];
  }[];
  firstActions: string[];
}

export interface AIConversation {
  id: string;
  userId: string;
  visionId?: string;
  kind: 'coach' | 'discovery' | 'recovery' | 'weekly_review' | 'roadmap';
  title: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: ISODate;
}

export interface AiInsight {
  id: string;
  userId: string;
  kind: 'pattern' | 'encouragement' | 'suggestion';
  content: string;
  createdAt: ISODate;
  dismissedAt?: ISODate;
}

// ---------- Notifications ----------

export type NotificationKind =
  | 'commitment_reminder'
  | 'commitment_overdue'
  | 'partner_interaction'
  | 'daily_checkin'
  | 'weekly_review'
  | 'ai_insight'
  | 'achievement';

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string; // never leaks sensitive vision details (PRD notifications rule)
  route?: string; // deep link destination
  createdAt: ISODate;
  readAt?: ISODate;
}

// ---------- Circles (Phase 6) ----------

export interface Circle {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberCount: number;
  /** Whether the signed-in user belongs to this circle. */
  viewerIsMember: boolean;
  isPrivate: boolean;
  createdAt: ISODate;
}

export interface CircleMember {
  circleId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: ISODate;
}

export interface CirclePost {
  id: string;
  circleId: string;
  userId: string;
  authorName: string;
  content: string;
  kind: 'win' | 'checkin' | 'general';
  createdAt: ISODate;
}

export interface SharedGoal {
  id: string;
  circleId?: string;
  partnershipId?: string;
  title: string;
  participantIds: string[];
  createdAt: ISODate;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  startAt: ISODate;
  endAt: ISODate;
  xpBonus: number;
  participantIds: string[];
}

// ---------- Correr Build / Hackathon (Phase 7) ----------

export interface Hackathon {
  id: string;
  name: string;
  description: string;
  startAt: ISODate;
  endAt: ISODate;
  status: 'upcoming' | 'active' | 'ended';
  rules: string;
}

export interface HackathonTeam {
  id: string;
  hackathonId: string;
  name: string;
  memberIds: string[];
  ownerId: string;
  inviteCode: string;
}

export interface HackathonMilestone {
  id: string;
  hackathonId: string;
  teamId: string;
  title: string;
  dueAt: ISODate;
  status: 'planned' | 'active' | 'completed';
}

export interface HackathonSubmission {
  id: string;
  hackathonId: string;
  teamId: string;
  title: string;
  description: string;
  link?: string;
  submittedAt: ISODate;
  score?: number;
  feedback?: string;
}

// ---------- Billing (Phase 8) ----------

export type PlanId = 'free' | 'pro' | 'org';

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanId;
  status: 'active' | 'trialing' | 'cancelled' | 'past_due';
  renewsAt?: ISODate;
  provider: 'mock' | 'stripe';
  providerRef?: string;
}

export interface Entitlement {
  id: string; // 'advanced_ai', 'unlimited_circles', 'campus_dashboard', ...
  title: string;
  description: string;
  includedIn: PlanId[];
}

// ---------- Campus dashboard (Phase 8) ----------

export interface CampusOrg {
  id: string;
  name: string;
  adminIds: string[];
}

/**
 * Privacy-preserving aggregate metrics — never row-level student data.
 * Minimum-cohort rule enforced by the API layer (k >= 10).
 */
export interface CampusAggregateMetric {
  orgId: string;
  period: string; // YYYY-MM
  activeStudents: number; // binned / k-anonymized
  activationRate: number;
  weeklyRetention: number;
  completionRate: number;
  recoveryRate: number;
  cohortSize: number; // must be >= MIN_COHORT to be shown
}

export const MIN_COHORT_SIZE = 10;

// ---------- Analytics (PRD event taxonomy) ----------

export type AnalyticsEvent =
  | 'account_created'
  | 'onboarding_completed'
  | 'vision_created'
  | 'vision_edited'
  | 'ai_discovery_completed'
  | 'ai_roadmap_generated'
  | 'roadmap_saved'
  | 'roadmap_regenerated'
  | 'commitment_created'
  | 'commitment_started'
  | 'commitment_completed'
  | 'commitment_missed'
  | 'commitment_rescheduled'
  | 'accountability_mode_selected'
  | 'partner_invited'
  | 'partner_connected'
  | 'partnership_ended'
  | 'daily_checkin_completed'
  | 'partner_interaction_sent'
  | 'weekly_review_completed'
  | 'ai_coach_opened'
  | 'ai_message_sent'
  | 'ai_suggestion_accepted'
  | 'achievement_unlocked'
  | 'notification_opened'
  | 'data_exported'
  | 'account_deleted';

/**
 * Version stamped onto sign-up consent. Bump whenever the Privacy Policy or
 * Terms drafts change in a way that needs re-consent.
 */
export const CONSENT_VERSION = 'privacy-2026-10-v1';

// ---------- Auth ----------

export interface Session {
  user: User;
  token: string; // mock session token
}

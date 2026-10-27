import type {
  AccountabilityPartnership,
  AchievementDef,
  AiDiscovery,
  AiInsight,
  AIConversation,
  AIMessage,
  AppNotification,
  CampusAggregateMetric,
  Challenge,
  CheckIn,
  Circle,
  CirclePost,
  Commitment,
  CommitmentEvent,
  CommitmentState,
  GeneratedRoadmap,
  Goal,
  Hackathon,
  HackathonMilestone,
  HackathonSubmission,
  HackathonTeam,
  LevelName,
  Milestone,
  NotificationKind,
  PartnerInteraction,
  Profile,
  Session,
  SharedGoal,
  Streak,
  Subscription,
  UserAchievement,
  Vision,
  VisionCategory,
  XPTransaction,
} from '@/core/domain';

/**
 * CorrerApi — the single data boundary of the app.
 *
 * Phase 1 ships `MockCorrerApi` (local persistence). The future Supabase
 * implementation must satisfy this same interface so feature code never
 * changes. All writes go through here so analytics + XP + event history
 * stay consistent.
 */

// ---------- Auth ----------

export interface AuthApi {
  signUp(email: string, password: string): Promise<Session>;
  signIn(email: string, password: string): Promise<Session>;
  /** Google OAuth — mock creates a demo Google account until OAuth is configured. */
  signInWithGoogle(): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  getSession(): Promise<Session | null>;
}

// ---------- Profile ----------

export interface ProfileApi {
  getProfile(): Promise<Profile | null>;
  updateProfile(patch: Partial<Omit<Profile, 'userId'>>): Promise<Profile>;
  /** Record sign-up consent (policy version + server timestamp). */
  recordConsent(
    version: string,
  ): Promise<{ consentVersion: string; consentAt: string }>;
  /** Portable JSON dump of everything stored about the signed-in user. */
  exportData(): Promise<Record<string, unknown>>;
  /** Full account + data deletion (GDPR/NDPR and Apple's in-app requirement). */
  deleteAccount(): Promise<void>;
}

// ---------- Visions ----------

export interface VisionInput {
  title: string;
  description: string;
  whyItMatters: string;
  category: VisionCategory;
  targetTimeframe?: string;
  targetDate?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface VisionsApi {
  listVisions(status?: Vision['status']): Promise<Vision[]>;
  getVision(id: string): Promise<Vision | null>;
  createVision(input: VisionInput): Promise<Vision>;
  updateVision(id: string, patch: Partial<VisionInput>): Promise<Vision>;
  setVisionStatus(id: string, status: Vision['status']): Promise<Vision>;
  deleteVision(id: string): Promise<void>;
}

// ---------- Discovery + Roadmap ----------

export interface DiscoveryInput {
  visionId: string;
  currentState: string;
  timeAvailablePerDay: number;
  blockers: string[];
  preferredPace: 'steady' | 'intense' | 'flexible';
  constraints: string;
}

export interface RoadmapApi {
  saveDiscovery(input: DiscoveryInput): Promise<AiDiscovery>;
  getDiscovery(visionId: string): Promise<AiDiscovery | null>;
  generateRoadmap(visionId: string): Promise<GeneratedRoadmap>;
  saveRoadmap(visionId: string, roadmap: GeneratedRoadmap): Promise<Goal[]>;
  listGoals(visionId: string): Promise<Goal[]>;
  updateGoal(goalId: string, patch: Partial<Goal>): Promise<Goal>;
  removeGoal(goalId: string): Promise<void>;
  listMilestones(goalId: string): Promise<Milestone[]>;
  updateMilestone(milestoneId: string, patch: Partial<Milestone>): Promise<Milestone>;
  completeMilestone(milestoneId: string): Promise<Milestone>;
  regenerateRoadmap(visionId: string): Promise<GeneratedRoadmap>;
}

// ---------- Commitments ----------

export interface CommitmentInput {
  title: string;
  note?: string;
  dueAt: string;
  visionId?: string;
  goalId?: string;
  milestoneId?: string;
  visibility?: 'private' | 'partner';
}

export interface CommitmentsApi {
  listCommitments(filter?: {
    state?: CommitmentState[];
    from?: string;
    to?: string;
    visionId?: string;
  }): Promise<Commitment[]>;
  getCommitment(id: string): Promise<Commitment | null>;
  createCommitment(input: CommitmentInput): Promise<Commitment>;
  startCommitment(id: string): Promise<Commitment>;
  completeCommitment(id: string): Promise<Commitment>;
  missCommitment(id: string): Promise<Commitment>;
  rescheduleCommitment(id: string, newDueAt: string): Promise<Commitment>;
  cancelCommitment(id: string): Promise<Commitment>;
  deleteCommitment(id: string): Promise<void>;
  recoverCommitment(
    id: string,
    blocker: string,
    replacement: CommitmentInput,
  ): Promise<Commitment>;
  listEvents(commitmentId: string): Promise<CommitmentEvent[]>;
}

// ---------- Check-ins ----------

export interface CheckInInput {
  commitmentId?: string;
  kind: 'daily' | 'recovery' | 'weekly';
  status: 'on_track' | 'struggling' | 'blocked' | 'done';
  blocker?: string;
  nextAction?: string;
  reflection?: string;
}

export interface CheckInsApi {
  createCheckIn(input: CheckInInput): Promise<CheckIn>;
  listCheckIns(filter?: { from?: string; to?: string }): Promise<CheckIn[]>;
  getTodayCheckIn(): Promise<CheckIn | null>;
}

// ---------- Accountability ----------

export interface PartnershipApi {
  getPartnership(): Promise<AccountabilityPartnership | null>;
  createInvite(): Promise<AccountabilityPartnership>;
  acceptInvite(code: string): Promise<AccountabilityPartnership>;
  /** Connected partner's profile (null when no active partnership). */
  getPartnerProfile(): Promise<Profile | null>;
  /** Mock-only: attach a demo partner so the flow is walkable before real OAuth users exist. */
  connectDemoPartner(): Promise<AccountabilityPartnership>;
  updateSharing(patch: Partial<AccountabilityPartnership['sharing']>): Promise<AccountabilityPartnership>;
  endPartnership(): Promise<void>;
  blockUser(userId: string): Promise<void>;
  reportUser(userId: string, reason: string): Promise<void>;
  sendInteraction(
    input: Omit<
      PartnerInteraction,
      'id' | 'createdAt' | 'fromUserId' | 'toUserId' | 'partnershipId'
    >,
  ): Promise<PartnerInteraction>;
  listInteractions(): Promise<PartnerInteraction[]>;
}

// ---------- Gamification ----------

export interface GamificationApi {
  getStreak(): Promise<Streak>;
  getXp(): Promise<number>;
  getLevel(): Promise<LevelName>;
  listXpTransactions(): Promise<XPTransaction[]>;
  listAchievements(): Promise<{ def: AchievementDef; unlocked: UserAchievement | null }[]>;
}

// ---------- AI ----------

export interface AiApi {
  listConversations(kind?: AIConversation['kind']): Promise<AIConversation[]>;
  createConversation(
    kind: AIConversation['kind'],
    visionId?: string,
  ): Promise<AIConversation>;
  listMessages(conversationId: string): Promise<AIMessage[]>;
  deleteConversation(conversationId: string): Promise<void>;
  sendMessage(conversationId: string, content: string): Promise<AIMessage>;
  listInsights(): Promise<AiInsight[]>;
  dismissInsight(id: string): Promise<void>;
  requestPlanAdjustment(visionId: string, message: string): Promise<GeneratedRoadmap>;
}

// ---------- Notifications ----------

export interface NotificationsApi {
  listNotifications(): Promise<AppNotification[]>;
  markRead(id: string): Promise<void>;
  markAllRead(): Promise<void>;
  setPreference(kind: NotificationKind, enabled: boolean): Promise<void>;
}

// ---------- Circles (Phase 6) ----------

export interface CirclesApi {
  listCircles(): Promise<Circle[]>;
  createCircle(name: string, description: string, isPrivate: boolean): Promise<Circle>;
  joinCircle(circleId: string): Promise<void>;
  leaveCircle(circleId: string): Promise<void>;
  deleteCircle(circleId: string): Promise<void>;
  listPosts(circleId: string): Promise<CirclePost[]>;
  createPost(
    circleId: string,
    content: string,
    kind: CirclePost['kind'],
  ): Promise<CirclePost>;
  deletePost(postId: string): Promise<void>;
  listChallenges(): Promise<Challenge[]>;
  joinChallenge(challengeId: string): Promise<void>;
  listSharedGoals(): Promise<SharedGoal[]>;
}

// ---------- Hackathon / Correr Build (Phase 7) ----------

export interface HackathonApi {
  listHackathons(): Promise<Hackathon[]>;
  getTeam(hackathonId: string): Promise<HackathonTeam | null>;
  createTeam(hackathonId: string, name: string): Promise<HackathonTeam>;
  joinTeam(inviteCode: string): Promise<HackathonTeam>;
  listTeamMilestones(teamId: string): Promise<HackathonMilestone[]>;
  createTeamMilestone(
    teamId: string,
    title: string,
    dueAt: string,
  ): Promise<HackathonMilestone>;
  updateTeamMilestone(
    id: string,
    patch: Partial<HackathonMilestone>,
  ): Promise<HackathonMilestone>;
  submit(
    hackathonId: string,
    input: { title: string; description: string; link?: string },
  ): Promise<HackathonSubmission>;
  listSubmissions(hackathonId: string): Promise<HackathonSubmission[]>;
}

// ---------- Billing (Phase 8) ----------

export interface BillingApi {
  getSubscription(): Promise<Subscription>;
  subscribe(plan: 'pro' | 'org'): Promise<Subscription>;
  cancelSubscription(): Promise<Subscription>;
}

// ---------- Campus dashboard (Phase 8) ----------

export interface CampusApi {
  getMetrics(orgId: string, period: string): Promise<CampusAggregateMetric | null>;
}

// ---------- Aggregate ----------

export interface CorrerApi extends
  AuthApi,
  ProfileApi,
  VisionsApi,
  RoadmapApi,
  CommitmentsApi,
  CheckInsApi,
  PartnershipApi,
  GamificationApi,
  AiApi,
  NotificationsApi,
  CirclesApi,
  HackathonApi,
  BillingApi,
  CampusApi {
  /** Demo-data helpers */
  resetDemoData(): Promise<void>;
}

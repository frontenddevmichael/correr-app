import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ---------- shared field validators (mirror src/core/domain.ts) ----------

const notificationPrefs = v.object({
  commitmentReminders: v.boolean(),
  commitmentOverdue: v.boolean(),
  partnerInteractions: v.boolean(),
  dailyCheckIn: v.boolean(),
  dailyCheckInWindow: v.string(),
  weeklyReview: v.boolean(),
  weeklyReviewDay: v.number(),
  aiInsights: v.boolean(),
  quietHoursStart: v.string(),
  quietHoursEnd: v.string(),
});

const partnershipSharing = v.object({
  todayCommitments: v.boolean(),
  completionHistory: v.boolean(),
  streakAndXp: v.boolean(),
  weeklyReview: v.boolean(),
});

const onboardingStep = v.union(
  v.literal("welcome"),
  v.literal("profile"),
  v.literal("vision"),
  v.literal("discovery"),
  v.literal("roadmap"),
  v.literal("accountability"),
  v.literal("firstCommitment"),
  v.literal("done"),
);

const visionCategory = v.union(
  v.literal("career"),
  v.literal("education"),
  v.literal("health"),
  v.literal("finance"),
  v.literal("creativity"),
  v.literal("relationships"),
  v.literal("faith"),
  v.literal("business"),
  v.literal("other"),
);

const visionStatus = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

const priority = v.union(
  v.literal("high"),
  v.literal("medium"),
  v.literal("low"),
);

const goalStatus = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("completed"),
);

const commitmentState = v.union(
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("missed"),
  v.literal("rescheduled"),
  v.literal("cancelled"),
);

const checkInKind = v.union(
  v.literal("daily"),
  v.literal("recovery"),
  v.literal("weekly"),
);

const checkInStatus = v.union(
  v.literal("on_track"),
  v.literal("struggling"),
  v.literal("blocked"),
  v.literal("done"),
);

const aiConversationKind = v.union(
  v.literal("coach"),
  v.literal("discovery"),
  v.literal("recovery"),
  v.literal("weekly_review"),
  v.literal("roadmap"),
);

const notificationKind = v.union(
  v.literal("commitment_reminder"),
  v.literal("commitment_overdue"),
  v.literal("partner_interaction"),
  v.literal("daily_checkin"),
  v.literal("weekly_review"),
  v.literal("ai_insight"),
  v.literal("achievement"),
);

const notificationRoute = v.optional(v.string());

export default defineSchema({
  ...authTables,

  profiles: defineTable({
    userId: v.string(),
    displayName: v.string(),
    timezone: v.string(),
    avatarColor: v.string(),
    bio: v.optional(v.string()),
    focusAreas: v.optional(v.array(v.string())),
    appearance: v.optional(v.string()),
    level: v.string(),
    xp: v.number(),
    onboardingState: onboardingStep,
    notificationPrefs,
    /** Coach tone chosen in onboarding (warm | direct | socratic). */
    coachingTone: v.optional(v.string()),
    /** Coach reply length preference (brief | balanced | detailed). */
    coachLength: v.optional(v.string()),
    /** A short note the user wants the coach to remember. */
    coachContext: v.optional(v.string()),
    /** Consent captured at sign-up: policy version + ISO timestamp. */
    consentVersion: v.optional(v.string()),
    consentAt: v.optional(v.string()),
    campusRole: v.optional(v.union(v.literal("student"), v.literal("staff"), v.literal("admin"))),
    campusOrgId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_campusOrg", ["campusOrgId"]),

  visions: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    whyItMatters: v.string(),
    category: visionCategory,
    targetTimeframe: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    priority,
    status: visionStatus,
    progressPercent: v.number(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId", "status"]),

  goals: defineTable({
    visionId: v.string(),
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    order: v.number(),
    targetDate: v.optional(v.string()),
    status: goalStatus,
    progressPercent: v.number(),
    createdAt: v.string(),
  }).index("by_vision", ["visionId", "order"]),

  milestones: defineTable({
    goalId: v.string(),
    userId: v.string(),
    title: v.string(),
    description: v.string(),
    order: v.number(),
    targetDate: v.optional(v.string()),
    status: goalStatus,
    completedAt: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_goal", ["goalId", "order"]),

  discoveries: defineTable({
    userId: v.string(),
    visionId: v.string(),
    currentState: v.string(),
    timeAvailablePerDay: v.number(),
    blockers: v.array(v.string()),
    preferredPace: v.union(v.literal("steady"), v.literal("intense"), v.literal("flexible")),
    constraints: v.string(),
    completedAt: v.string(),
  }).index("by_vision", ["visionId"]),

  commitments: defineTable({
    userId: v.string(),
    visionId: v.optional(v.string()),
    goalId: v.optional(v.string()),
    milestoneId: v.optional(v.string()),
    title: v.string(),
    note: v.optional(v.string()),
    dueAt: v.string(),
    state: commitmentState,
    rescheduledFrom: v.optional(v.string()),
    completedAt: v.optional(v.string()),
    missedAt: v.optional(v.string()),
    recoveryCommitmentId: v.optional(v.string()),
    visibility: v.union(v.literal("private"), v.literal("partner")),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId", "dueAt"])
    .index("by_state_due", ["state", "dueAt"]),

  commitmentEvents: defineTable({
    commitmentId: v.string(),
    userId: v.string(),
    from: v.union(commitmentState, v.null()),
    to: commitmentState,
    at: v.string(),
    note: v.optional(v.string()),
  }).index("by_commitment", ["commitmentId", "at"]),

  partnerships: defineTable({
    initiatorId: v.string(),
    partnerId: v.string(),
    status: v.union(v.literal("pending"), v.literal("active"), v.literal("ended")),
    sharing: partnershipSharing,
    inviteCode: v.string(),
    startedAt: v.optional(v.string()),
    endedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_initiator", ["initiatorId"])
    .index("by_partner", ["partnerId"])
    .index("by_inviteCode", ["inviteCode"]),

  checkIns: defineTable({
    userId: v.string(),
    commitmentId: v.optional(v.string()),
    day: v.string(),
    kind: checkInKind,
    status: checkInStatus,
    blocker: v.optional(v.string()),
    nextAction: v.optional(v.string()),
    reflection: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_user_day", ["userId", "day"]),

  interactions: defineTable({
    partnershipId: v.string(),
    fromUserId: v.string(),
    toUserId: v.string(),
    commitmentId: v.optional(v.string()),
    kind: v.union(v.literal("confirm"), v.literal("encourage"), v.literal("question")),
    message: v.string(),
    createdAt: v.string(),
    readAt: v.optional(v.string()),
  }).index("by_partnership", ["partnershipId", "createdAt"]),

  safetyRecords: defineTable({
    reporterId: v.string(),
    subjectId: v.string(),
    kind: v.union(v.literal("block"), v.literal("report")),
    reason: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_reporter", ["reporterId"]),

  xpTransactions: defineTable({
    userId: v.string(),
    action: v.string(),
    amount: v.number(),
    refId: v.optional(v.string()),
    at: v.string(),
  }).index("by_user", ["userId"]),

  streaks: defineTable({
    userId: v.string(),
    commitmentStreak: v.number(),
    partnershipStreak: v.number(),
    lastActiveDay: v.union(v.string(), v.null()),
    bestStreak: v.number(),
  }).index("by_user", ["userId"]),

  userAchievements: defineTable({
    userId: v.string(),
    achievementId: v.string(),
    unlockedAt: v.string(),
  }).index("by_user", ["userId"]),

  conversations: defineTable({
    userId: v.string(),
    visionId: v.optional(v.string()),
    kind: aiConversationKind,
    title: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.string(),
  }).index("by_conversation", ["conversationId", "createdAt"]),

  insights: defineTable({
    userId: v.string(),
    kind: v.union(v.literal("pattern"), v.literal("encouragement"), v.literal("suggestion")),
    content: v.string(),
    createdAt: v.string(),
    dismissedAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.string(),
    kind: notificationKind,
    title: v.string(),
    body: v.string(),
    route: notificationRoute,
    createdAt: v.string(),
    readAt: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_kind", ["userId", "kind"]),

  circles: defineTable({
    name: v.string(),
    description: v.string(),
    ownerId: v.string(),
    memberCount: v.number(),
    isPrivate: v.boolean(),
    createdAt: v.string(),
  }).index("by_isPrivate", ["isPrivate"]),

  circleMembers: defineTable({
    circleId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("owner"), v.literal("member")),
    joinedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_circle_user", ["circleId", "userId"]),

  circlePosts: defineTable({
    circleId: v.string(),
    userId: v.string(),
    authorName: v.string(),
    content: v.string(),
    kind: v.union(v.literal("win"), v.literal("checkin"), v.literal("general")),
    createdAt: v.string(),
  }).index("by_circle", ["circleId", "createdAt"]),

  challenges: defineTable({
    title: v.string(),
    description: v.string(),
    startAt: v.string(),
    endAt: v.string(),
    xpBonus: v.number(),
    participantIds: v.array(v.string()),
  }).index("by_start", ["startAt"]),

  sharedGoals: defineTable({
    circleId: v.optional(v.string()),
    partnershipId: v.optional(v.string()),
    title: v.string(),
    participantIds: v.array(v.string()),
    createdAt: v.string(),
  }),

  hackathons: defineTable({
    name: v.string(),
    description: v.string(),
    startAt: v.string(),
    endAt: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("ended")),
    rules: v.string(),
  }).index("by_start", ["startAt"]),

  hackathonTeams: defineTable({
    hackathonId: v.string(),
    name: v.string(),
    memberIds: v.array(v.string()),
    ownerId: v.string(),
    inviteCode: v.string(),
  })
    .index("by_hackathon", ["hackathonId"])
    .index("by_inviteCode", ["inviteCode"]),

  hackathonMilestones: defineTable({
    hackathonId: v.string(),
    teamId: v.string(),
    title: v.string(),
    dueAt: v.string(),
    status: goalStatus,
  }).index("by_team", ["teamId"]),

  hackathonSubmissions: defineTable({
    hackathonId: v.string(),
    teamId: v.string(),
    title: v.string(),
    description: v.string(),
    link: v.optional(v.string()),
    submittedAt: v.string(),
    score: v.optional(v.number()),
    feedback: v.optional(v.string()),
  }).index("by_hackathon", ["hackathonId"]),

  subscriptions: defineTable({
    userId: v.string(),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("org")),
    status: v.union(v.literal("active"), v.literal("trialing"), v.literal("cancelled"), v.literal("past_due")),
    renewsAt: v.optional(v.string()),
    provider: v.union(v.literal("mock"), v.literal("stripe")),
    providerRef: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),
});

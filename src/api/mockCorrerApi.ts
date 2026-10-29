import { track } from '@/core/analytics';
import type {
  AccountabilityPartnership,
  AchievementDef,
  AiDiscovery,
  AiInsight,
  AIConversation,
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
  Subscription,
  SharedGoal,
  Streak,
  User,
  UserAchievement,
  Vision,
  XPTransaction,
} from '@/core/domain';
import { MIN_COHORT_SIZE } from '@/core/domain';

import type {
  CheckInInput,
  CommitmentInput,
  CorrerApi,
  DiscoveryInput,
  VisionInput,
} from './correrApi';
import {
  defaultProfile,
  levelForXp,
  loadDb,
  persist,
  resetDb,
  uid,
  XP,
} from './mockDatabase';
import { StubAi } from '@/ai/stubAi';

const DEMO_ACCOUNT_PASSWORD = 'demo-pass';

function nowIso(): string {
  return new Date().toISOString();
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export class MockCorrerApi implements CorrerApi {
  private ai = new StubAi();

  private async db() {
    return loadDb();
  }

  private async requireUser() {
    const db = await this.db();
    if (!db.session) throw new Error('Not signed in');
    const user = db.users.find((u) => u.id === db.session!.user.id);
    if (!user) throw new Error('Account no longer exists');
    return { db, user };
  }

  private async profileOf(userId: string) {
    const db = await this.db();
    let p = db.profiles.find((x) => x.userId === userId);
    if (!p) {
      p = defaultProfile(userId, 'Runner');
      db.profiles.push(p);
      await persist();
    }
    return p;
  }

  private async awardXp(userId: string, action: keyof typeof XP, refId?: string) {
    const db = await this.db();
    const amount = XP[action];
    const txn: XPTransaction = { id: uid('xp'), userId, action, amount, refId, at: nowIso() };
    db.xpTransactions.push(txn);
    const profile = db.profiles.find((p) => p.userId === userId);
    if (profile) {
      profile.xp += amount;
      profile.level = levelForXp(profile.xp);
    }
    await persist();
  }

  private async bumpStreak(userId: string) {
    const db = await this.db();
    let s = db.streaks.find((x) => x.userId === userId);
    if (!s) {
      s = { userId, commitmentStreak: 0, partnershipStreak: 0, lastActiveDay: null, bestStreak: 0 };
      db.streaks.push(s);
    }
    const today = todayKey();
    if (s.lastActiveDay === today) return;
    const yesterday = todayKey(new Date(Date.now() - 86400000));
    s.commitmentStreak = s.lastActiveDay === yesterday ? s.commitmentStreak + 1 : 1;
    s.bestStreak = Math.max(s.bestStreak, s.commitmentStreak);
    s.lastActiveDay = today;
    await persist();
  }

  private async unlock(userId: string, achievementId: UserAchievement['achievementId']) {
    const db = await this.db();
    if (db.userAchievements.some((a) => a.userId === userId && a.achievementId === achievementId)) return;
    const def = db.achievements.find((a) => a.id === achievementId);
    const ua: UserAchievement = { userId, achievementId, unlockedAt: nowIso() };
    db.userAchievements.push(ua);
    db.notifications.push({
      id: uid('ntf'),
      userId,
      kind: 'achievement',
      title: `Achievement unlocked: ${def?.title ?? achievementId}`,
      body: def?.description ?? '',
      route: '/(tabs)/progress',
      createdAt: nowIso(),
    });
    track('achievement_unlocked', { achievementId });
    await persist();
  }

  private async notify(userId: string, kind: NotificationKind, title: string, body: string, route?: string) {
    const db = await this.db();
    db.notifications.push({ id: uid('ntf'), userId, kind, title, body, route, createdAt: nowIso() });
    await persist();
  }

  private recalcVisionProgress(visionId: string) {
    const db = this._dbCache!;
    const goals = db.goals.filter((g) => g.visionId === visionId);
    const vision = db.visions.find((v) => v.id === visionId);
    if (!vision) return;
    if (goals.length === 0) {
      vision.progressPercent = 0;
      return;
    }
    const total = goals.reduce((sum, g) => sum + 100, 0);
    const done = goals.reduce((sum, g) => sum + g.progressPercent, 0);
    vision.progressPercent = Math.round((done / total) * 100);
  }

  private _dbCache: Awaited<ReturnType<typeof loadDb>> | null = null;

  private async tx<T>(fn: (db: Awaited<ReturnType<typeof loadDb>>) => Promise<T> | T): Promise<T> {
    const db = await this.db();
    this._dbCache = db;
    try {
      const result = await fn(db);
      await persist();
      return result;
    } finally {
      this._dbCache = null;
    }
  }

  // ---------- Auth ----------

  async signUp(email: string, password: string): Promise<Session> {
    return this.tx(async (db) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized.includes('@')) throw new Error('Enter a valid email address.');
      if (password.length < 8) throw new Error('Password must be at least 8 characters.');
      if (db.users.some((u) => u.email === normalized)) {
        throw new Error('An account with this email already exists. Try logging in.');
      }
      const user: User & { password: string } = {
        id: uid('usr'),
        email: normalized,
        createdAt: nowIso(),
        password,
      };
      db.users.push(user);
      db.profiles.push(defaultProfile(user.id, normalized.split('@')[0]));
      db.streaks.push({
        userId: user.id,
        commitmentStreak: 0,
        partnershipStreak: 0,
        lastActiveDay: null,
        bestStreak: 0,
      });
      const session: Session = {
        user: { id: user.id, email: user.email, createdAt: user.createdAt },
        token: uid('tok'),
      };
      db.session = session;
      track('account_created');
      return session;
    });
  }

  async signIn(email: string, password: string): Promise<Session> {
    const db = await this.db();
    const normalized = email.trim().toLowerCase();
    const user = db.users.find((u) => u.email === normalized);
    if (!user || user.password !== password) {
      throw new Error('Incorrect email or password.');
    }
    const session: Session = {
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      token: uid('tok'),
    };
    db.session = session;
    await persist();
    return session;
  }

  async signInWithGoogle(): Promise<Session> {
    // Mock Google OAuth: provisions a demo Google-linked account (FR-01).
    // Real OAuth swaps in at this single method later.
    const demoEmail = 'alex.runner@gmail.com';
    const db = await this.db();
    let user = db.users.find((u) => u.email === demoEmail);
    if (!user) {
      user = {
        id: uid('usr'),
        email: demoEmail,
        createdAt: nowIso(),
        password: uid('pw'),
      };
      db.users.push(user);
      const profile = defaultProfile(user.id, 'Alex Runner');
      db.profiles.push(profile);
      db.streaks.push({
        userId: user.id,
        commitmentStreak: 0,
        partnershipStreak: 0,
        lastActiveDay: null,
        bestStreak: 0,
      });
      track('account_created', { method: 'google' });
    }
    const session: Session = {
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      token: uid('tok'),
    };
    db.session = session;
    await persist();
    return session;
  }

  async signOut(): Promise<void> {
    const db = await this.db();
    db.session = null;
    await persist();
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Mock: pretend to send an email. Always succeeds to avoid account enumeration.
    await new Promise((r) => setTimeout(r, 400));
    void email;
  }

  async getSession(): Promise<Session | null> {
    const db = await this.db();
    return db.session;
  }

  // ---------- Profile ----------

  async getProfile(): Promise<Profile | null> {
    const db = await this.db();
    if (!db.session) return null;
    return this.profileOf(db.session.user.id);
  }

  async updateProfile(patch: Partial<Omit<Profile, 'userId'>>): Promise<Profile> {
    const { user } = await this.requireUser();
    return this.tx(async (db) => {
      const p = db.profiles.find((x) => x.userId === user.id)!;
      Object.assign(p, patch);
      return p;
    });
  }

  async recordConsent(
    version: string,
  ): Promise<{ consentVersion: string; consentAt: string }> {
    const { user } = await this.requireUser();
    const consentAt = new Date().toISOString();
    await this.tx((db) => {
      const profile = db.profiles.find((x) => x.userId === user.id);
      if (profile) {
        profile.consentVersion = version;
        profile.consentAt = consentAt;
      }
    });
    return { consentVersion: version, consentAt };
  }

  async exportData(): Promise<Record<string, unknown>> {
    const { user } = await this.requireUser();
    const db = await this.db();
    const uid = user.id;
    const owned = <T extends { userId: string }>(rows: T[]) =>
      rows.filter((row) => row.userId === uid);
    const conversationIds = new Set(
      db.conversations.filter((row) => row.userId === uid).map((row) => row.id),
    );
    const memberCircleIds = new Set(
      db.circleMembers.filter((row) => row.userId === uid).map((row) => row.circleId),
    );
    return {
      exportedAt: new Date().toISOString(),
      account: { email: user.email, createdAt: user.createdAt },
      profile: db.profiles.find((row) => row.userId === uid) ?? null,
      visions: owned(db.visions),
      goals: owned(db.goals),
      milestones: owned(db.milestones),
      discoveries: owned(db.discoveries),
      commitments: owned(db.commitments),
      commitmentEvents: owned(db.commitmentEvents),
      checkIns: owned(db.checkIns),
      xpTransactions: owned(db.xpTransactions),
      streaks: owned(db.streaks),
      userAchievements: owned(db.userAchievements),
      conversations: owned(db.conversations),
      messages: db.messages.filter((row) => conversationIds.has(row.conversationId)),
      insights: owned(db.insights),
      notifications: owned(db.notifications),
      subscription: db.subscription,
      partnerships: db.partnerships.filter(
        (row) => row.initiatorId === uid || row.partnerId === uid,
      ),
      interactions: db.interactions.filter(
        (row) => row.fromUserId === uid || row.toUserId === uid,
      ),
      safetyRecords: db.safetyRecords.filter(
        (row) => row.reporterId === uid || row.subjectId === uid,
      ),
      circles: db.circles.filter(
        (row) => row.ownerId === uid || memberCircleIds.has(row.id),
      ),
      circleMembers: owned(db.circleMembers),
      circlePosts: owned(db.circlePosts),
      challenges: db.challenges.filter((row) => row.participantIds.includes(uid)),
      sharedGoals: db.sharedGoals.filter((row) => row.participantIds.includes(uid)),
      hackathonTeams: db.hackathonTeams.filter(
        (row) => row.ownerId === uid || row.memberIds.includes(uid),
      ),
      note: 'Export generated by Correr. Draft privacy terms mark this data as yours to export or delete at any time.',
    };
  }

  async deleteAccount(): Promise<void> {
    const { user } = await this.requireUser();
    const uid = user.id;
    await this.tx((db) => {
      const owned = <T extends { userId: string }>(rows: T[]) =>
        rows.filter((row) => row.userId !== uid);

      // Messages belong to my conversations first.
      const myConversationIds = new Set(
        db.conversations.filter((row) => row.userId === uid).map((row) => row.id),
      );
      db.messages = db.messages.filter(
        (row) => !myConversationIds.has(row.conversationId),
      );

      // Circles: my memberships leave others' circles; owned circles go whole.
      const ownedCircleIds = new Set(
        db.circles.filter((row) => row.ownerId === uid).map((row) => row.id),
      );
      db.circleMembers = db.circleMembers.filter(
        (row) => row.userId !== uid && !ownedCircleIds.has(row.circleId),
      );
      db.circlePosts = db.circlePosts.filter(
        (row) => row.userId !== uid && !ownedCircleIds.has(row.circleId),
      );
      db.circles = db.circles.filter((row) => row.ownerId !== uid);

      // Shared participation records: remove my side, keep others'.
      db.partnerships = db.partnerships.filter(
        (row) => row.initiatorId !== uid && row.partnerId !== uid,
      );
      db.interactions = db.interactions.filter(
        (row) => row.fromUserId !== uid && row.toUserId !== uid,
      );
      db.safetyRecords = db.safetyRecords.filter(
        (row) => row.reporterId !== uid && row.subjectId !== uid,
      );
      db.challenges = db.challenges.map((row) => ({
        ...row,
        participantIds: row.participantIds.filter((id) => id !== uid),
      }));
      db.sharedGoals = db.sharedGoals
        .map((row) => ({
          ...row,
          participantIds: row.participantIds.filter((id) => id !== uid),
        }))
        .filter((row) => row.participantIds.length > 0);
      db.hackathonTeams = db.hackathonTeams
        .map((row) => ({
          ...row,
          memberIds: row.memberIds.filter((id) => id !== uid),
          ownerId: row.ownerId === uid && row.memberIds.filter((id) => id !== uid).length > 0
            ? row.memberIds.filter((id) => id !== uid)[0]
            : row.ownerId,
        }))
        .filter((row) => row.memberIds.length > 0 || row.ownerId !== uid);

      // Straightforward user-owned rows.
      db.visions = owned(db.visions);
      db.goals = owned(db.goals);
      db.milestones = owned(db.milestones);
      db.discoveries = owned(db.discoveries);
      db.commitments = owned(db.commitments);
      db.commitmentEvents = owned(db.commitmentEvents);
      db.checkIns = owned(db.checkIns);
      db.xpTransactions = owned(db.xpTransactions);
      db.streaks = owned(db.streaks);
      db.userAchievements = owned(db.userAchievements);
      db.conversations = owned(db.conversations);
      db.insights = owned(db.insights);
      db.notifications = owned(db.notifications);
      db.circleMembers = owned(db.circleMembers);
      db.circlePosts = owned(db.circlePosts);

      db.subscription = null;
      db.profiles = db.profiles.filter((row) => row.userId !== uid);
      db.users = db.users.filter((row) => row.id !== uid);
      db.session = null;
    });
  }

  // ---------- Visions ----------

  async listVisions(status?: Vision['status']): Promise<Vision[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.visions
      .filter((v) => v.userId === user.id && (!status || v.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getVision(id: string): Promise<Vision | null> {
    const db = await this.db();
    return db.visions.find((v) => v.id === id) ?? null;
  }

  async createVision(input: VisionInput): Promise<Vision> {
    const { user } = await this.requireUser();
    if (!input.title.trim()) throw new Error('Give your vision a title first.');
    if (input.description.trim().length < 20) {
      throw new Error('Describe your vision a bit more — at least a sentence or two.');
    }
    return this.tx((db) => {
      const vision: Vision = {
        id: uid('vis'),
        userId: user.id,
        title: input.title.trim(),
        description: input.description.trim(),
        whyItMatters: input.whyItMatters.trim(),
        category: input.category,
        targetTimeframe: input.targetTimeframe,
        targetDate: input.targetDate,
        priority: input.priority,
        status: 'active',
        progressPercent: 0,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.visions.push(vision);
      track('vision_created', { category: vision.category });
      return vision;
    });
  }

  async updateVision(id: string, patch: Partial<VisionInput>): Promise<Vision> {
    return this.tx((db) => {
      const v = db.visions.find((x) => x.id === id);
      if (!v) throw new Error('Vision not found');
      Object.assign(v, patch, { updatedAt: nowIso() });
      track('vision_edited');
      return v;
    });
  }

  async setVisionStatus(id: string, status: Vision['status']): Promise<Vision> {
    return this.tx((db) => {
      const v = db.visions.find((x) => x.id === id);
      if (!v) throw new Error('Vision not found');
      v.status = status;
      v.updatedAt = nowIso();
      return v;
    });
  }

  async deleteVision(id: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      const vision = db.visions.find((v) => v.id === id && v.userId === user.id);
      if (!vision) return;
      const goalIds = new Set(db.goals.filter((g) => g.visionId === id).map((g) => g.id));
      const milestoneIds = new Set(
        db.milestones.filter((m) => goalIds.has(m.goalId)).map((m) => m.id),
      );
      const conversationIds = new Set(
        db.conversations
          .filter((c) => c.userId === user.id && c.visionId === id)
          .map((c) => c.id),
      );
      db.visions = db.visions.filter((v) => v.id !== id);
      db.goals = db.goals.filter((g) => g.visionId !== id);
      db.milestones = db.milestones.filter((m) => !milestoneIds.has(m.id));
      db.discoveries = db.discoveries.filter((d) => d.visionId !== id);
      db.conversations = db.conversations.filter((c) => !conversationIds.has(c.id));
      db.messages = db.messages.filter((m) => !conversationIds.has(m.conversationId));
      db.commitments = db.commitments.map((c) => {
        const linked =
          c.visionId === id ||
          (c.goalId !== undefined && goalIds.has(c.goalId)) ||
          (c.milestoneId !== undefined && milestoneIds.has(c.milestoneId));
        if (!linked) return c;
        const { visionId, goalId, milestoneId, ...rest } = c;
        void visionId;
        void goalId;
        void milestoneId;
        return rest;
      });
    });
  }

  // ---------- Discovery + Roadmap ----------

  async saveDiscovery(input: DiscoveryInput): Promise<AiDiscovery> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const existing = db.discoveries.find((d) => d.visionId === input.visionId);
      const record = {
        id: existing?.id ?? uid('dis'),
        userId: user.id,
        ...input,
        completedAt: nowIso(),
      };
      if (existing) Object.assign(existing, record);
      else db.discoveries.push(record);
      track('ai_discovery_completed');
      return record as AiDiscovery;
    });
  }

  async getDiscovery(visionId: string): Promise<AiDiscovery | null> {
    const db = await this.db();
    return (db.discoveries.find((d) => d.visionId === visionId) as AiDiscovery) ?? null;
  }

  async generateRoadmap(visionId: string): Promise<GeneratedRoadmap> {
    const vision = await this.getVision(visionId);
    if (!vision) throw new Error('Vision not found');
    const discovery = await this.getDiscovery(visionId);
    const roadmap = await this.ai.generateRoadmap(vision, discovery);
    track('ai_roadmap_generated');
    return roadmap;
  }

  async regenerateRoadmap(visionId: string): Promise<GeneratedRoadmap> {
    const roadmap = await this.generateRoadmap(visionId);
    track('roadmap_regenerated');
    return roadmap;
  }

  async saveRoadmap(visionId: string, roadmap: GeneratedRoadmap): Promise<Goal[]> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      // Remove previous plan (keep completed milestones' history intact per FR-08:
      // completed goals are preserved; only planned ones are replaced)
      const oldGoals = db.goals.filter((g) => g.visionId === visionId);
      for (const g of oldGoals.filter((x) => x.status !== 'completed')) {
        db.goals = db.goals.filter((x) => x.id !== g.id);
        db.milestones = db.milestones.filter((m) => m.goalId !== g.id);
      }
      const created: Goal[] = roadmap.goals.map((g, gi) => {
        const goal: Goal = {
          id: uid('goal'),
          visionId,
          userId: user.id,
          title: g.title,
          description: g.description,
          order: gi,
          status: gi === 0 ? 'active' : 'planned',
          progressPercent: 0,
          createdAt: nowIso(),
        };
        db.goals.push(goal);
        g.milestones.forEach((m, mi) => {
          const milestone: Milestone = {
            id: uid('ms'),
            goalId: goal.id,
            userId: user.id,
            title: m.title,
            description: m.description,
            order: mi,
            targetDate: undefined,
            status: 'planned',
            createdAt: nowIso(),
          };
          db.milestones.push(milestone);
        });
        return goal;
      });
      this._dbCache = db;
      this.recalcVisionProgress(visionId);
      this._dbCache = null;
      track('roadmap_saved', { goals: created.length });
      return created;
    });
  }

  async listGoals(visionId: string): Promise<Goal[]> {
    const db = await this.db();
    return db.goals
      .filter((g) => g.visionId === visionId)
      .sort((a, b) => a.order - b.order);
  }

  async updateGoal(goalId: string, patch: Partial<Goal>): Promise<Goal> {
    return this.tx((db) => {
      const g = db.goals.find((x) => x.id === goalId);
      if (!g) throw new Error('Goal not found');
      Object.assign(g, patch);
      const milestones = db.milestones.filter((m) => m.goalId === goalId);
      if (milestones.length > 0) {
        g.progressPercent = Math.round(
          (milestones.filter((m) => m.status === 'completed').length / milestones.length) * 100,
        );
      }
      if (g.progressPercent === 100) g.status = 'completed';
      this._dbCache = db;
      this.recalcVisionProgress(g.visionId);
      this._dbCache = null;
      return g;
    });
  }

  async removeGoal(goalId: string): Promise<void> {
    await this.tx((db) => {
      const g = db.goals.find((x) => x.id === goalId);
      if (!g) return;
      const milestoneIds = new Set(
        db.milestones.filter((m) => m.goalId === goalId).map((m) => m.id),
      );
      db.goals = db.goals.filter((x) => x.id !== goalId);
      db.milestones = db.milestones.filter((m) => m.goalId !== goalId);
      db.commitments = db.commitments.map((c) => {
        const linked =
          c.goalId === goalId ||
          (c.milestoneId !== undefined && milestoneIds.has(c.milestoneId));
        if (!linked) return c;
        const { goalId: _goalId, milestoneId: _milestoneId, ...rest } = c;
        void _goalId;
        void _milestoneId;
        return rest;
      });
      this._dbCache = db;
      this.recalcVisionProgress(g.visionId);
      this._dbCache = null;
    });
  }

  async listMilestones(goalId: string): Promise<Milestone[]> {
    const db = await this.db();
    return db.milestones
      .filter((m) => m.goalId === goalId)
      .sort((a, b) => a.order - b.order);
  }

  async updateMilestone(milestoneId: string, patch: Partial<Milestone>): Promise<Milestone> {
    return this.tx((db) => {
      const m = db.milestones.find((x) => x.id === milestoneId);
      if (!m) throw new Error('Milestone not found');
      Object.assign(m, patch);
      return m;
    });
  }

  async completeMilestone(milestoneId: string): Promise<Milestone> {
    const { user } = await this.requireUser();
    let goalId = '';
    await this.tx(async (db) => {
      const m = db.milestones.find((x) => x.id === milestoneId);
      if (!m) throw new Error('Milestone not found');
      m.status = 'completed';
      m.completedAt = nowIso();
      goalId = m.goalId;
      const goal = db.goals.find((g) => g.id === m.goalId);
      if (goal) {
        const milestones = db.milestones.filter((x) => x.goalId === goal.id);
        goal.progressPercent = Math.round(
          (milestones.filter((x) => x.status === 'completed').length / milestones.length) * 100,
        );
        if (goal.progressPercent === 100) goal.status = 'completed';
      }
    });
    await this.awardXp(user.id, 'milestone_completed', milestoneId);
    await this.unlock(user.id, 'milestone_reached');
    await this.updateGoalProgress(goalId);
    return (await this.db()).milestones.find((m) => m.id === milestoneId)!;
  }

  private async updateGoalProgress(goalId: string) {
    if (!goalId) return;
    const db = await this.db();
    const goal = db.goals.find((g) => g.id === goalId);
    if (!goal) return;
    await this.updateGoal(goal.id, {});
  }

  // ---------- Commitments ----------

  async listCommitments(filter?: {
    state?: CommitmentState[];
    from?: string;
    to?: string;
    visionId?: string;
  }): Promise<Commitment[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.commitments
      .filter((c) => c.userId === user.id)
      .filter((c) => !filter?.state || filter.state.includes(c.state))
      .filter((c) => !filter?.from || c.dueAt >= filter.from)
      .filter((c) => !filter?.to || c.dueAt <= filter.to)
      .filter((c) => !filter?.visionId || c.visionId === filter.visionId)
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  async getCommitment(id: string): Promise<Commitment | null> {
    const db = await this.db();
    return db.commitments.find((c) => c.id === id) ?? null;
  }

  private transition(
    db: Awaited<ReturnType<typeof loadDb>>,
    commitment: Commitment,
    to: CommitmentState,
    note?: string,
  ) {
    const event: CommitmentEvent = {
      id: uid('ev'),
      commitmentId: commitment.id,
      userId: commitment.userId,
      from: commitment.state,
      to,
      at: nowIso(),
      note,
    };
    db.commitmentEvents.push(event);
    commitment.state = to;
    commitment.updatedAt = nowIso();
  }

  async createCommitment(input: CommitmentInput): Promise<Commitment> {
    const { user } = await this.requireUser();
    if (!input.title.trim()) throw new Error('Commitments need a clear title.');
    return this.tx((db) => {
      const commitment: Commitment = {
        id: uid('com'),
        userId: user.id,
        visionId: input.visionId,
        goalId: input.goalId,
        milestoneId: input.milestoneId,
        title: input.title.trim(),
        note: input.note,
        dueAt: input.dueAt,
        state: 'planned',
        visibility: input.visibility ?? 'private',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.commitments.push(commitment);
      this.transition(db, commitment, 'planned');
      track('commitment_created');
      return commitment;
    });
  }

  async startCommitment(id: string): Promise<Commitment> {
    return this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) throw new Error('Commitment not found');
      this.transition(db, c, 'in_progress');
      track('commitment_started');
      return c;
    });
  }

  async completeCommitment(id: string): Promise<Commitment> {
    const { user } = await this.requireUser();
    const firstEver = (await this.listCommitments({ state: ['completed']})).length === 0;
    await this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) throw new Error('Commitment not found');
      this.transition(db, c, 'completed');
      c.completedAt = nowIso();
      track('commitment_completed');
    });
    await this.awardXp(user.id, 'commitment_completed', id);
    await this.bumpStreak(user.id);
    if (firstEver) await this.unlock(user.id, 'first_commitment');
    const c = (await this.db()).commitments.find((x) => x.id === id)!;
    if (c.visionId) {
      const db = await this.db();
      this._dbCache = db;
      this.recalcVisionProgress(c.visionId);
      this._dbCache = null;
      await persist();
    }
    return c;
  }

  async missCommitment(id: string): Promise<Commitment> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) throw new Error('Commitment not found');
      this.transition(db, c, 'missed');
      c.missedAt = nowIso();
      track('commitment_missed');
    });
    // Support, not shame: a gentle recovery prompt notification (PRD principle)
    await this.notify(
      user.id,
      'commitment_overdue',
      'That didn’t go as planned. Let’s reset.',
      'Open your commitment to reflect and make a recovery plan.',
      '/(tabs)/progress',
    );
    return (await this.db()).commitments.find((x) => x.id === id)!;
  }

  async rescheduleCommitment(id: string, newDueAt: string): Promise<Commitment> {
    return this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) throw new Error('Commitment not found');
      c.rescheduledFrom = c.dueAt;
      c.dueAt = newDueAt;
      this.transition(db, c, 'rescheduled');
      track('commitment_rescheduled');
      return c;
    });
  }

  async cancelCommitment(id: string): Promise<Commitment> {
    return this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) throw new Error('Commitment not found');
      this.transition(db, c, 'cancelled');
      return c;
    });
  }

  async deleteCommitment(id: string): Promise<void> {
    await this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) return;
      db.commitments = db.commitments.filter((x) => x.id !== id);
      db.commitmentEvents = db.commitmentEvents.filter((e) => e.commitmentId !== id);
      db.commitments = db.commitments.map((other) =>
        other.recoveryCommitmentId === id
          ? { ...other, recoveryCommitmentId: undefined }
          : other,
      );
    });
  }

  async recoverCommitment(
    id: string,
    blocker: string,
    replacement: CommitmentInput,
  ): Promise<Commitment> {
    const { user } = await this.requireUser();
    const recovery = await this.createCommitment(replacement);
    await this.tx((db) => {
      const c = db.commitments.find((x) => x.id === id);
      if (!c) throw new Error('Commitment not found');
      c.recoveryCommitmentId = recovery.id;
      this.transition(db, c, 'missed', `Blocker: ${blocker}`);
      db.checkIns.push({
        id: uid('ci'),
        userId: user.id,
        commitmentId: id,
        day: todayKey(),
        kind: 'recovery',
        status: 'blocked',
        blocker,
        nextAction: replacement.title,
        createdAt: nowIso(),
      });
    });
    await this.awardXp(user.id, 'recovery', id);
    await this.unlock(user.id, 'recovery');
    track('commitment_created', { recovery: true });
    return recovery;
  }

  async listEvents(commitmentId: string): Promise<CommitmentEvent[]> {
    const db = await this.db();
    return db.commitmentEvents
      .filter((e) => e.commitmentId === commitmentId)
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  // ---------- Check-ins ----------

  async createCheckIn(input: CheckInInput): Promise<CheckIn> {
    const { user } = await this.requireUser();
    const checkIn = await this.tx((db) => {
      const record: CheckIn = {
        id: uid('ci'),
        userId: user.id,
        commitmentId: input.commitmentId,
        day: todayKey(),
        kind: input.kind,
        status: input.status,
        blocker: input.blocker,
        nextAction: input.nextAction,
        reflection: input.reflection,
        createdAt: nowIso(),
      };
      db.checkIns.push(record);
      return record;
    });
    // XP: daily check-in once per day; weekly reflection per review.
    const today = todayKey();
    const sameKindToday = (await this.listCheckIns()).filter(
      (c) => c.day === today && c.kind === input.kind,
    );
    if (input.kind === 'daily' && sameKindToday.length <= 1) {
      await this.awardXp(user.id, 'daily_checkin', checkIn.id);
    }
    if (input.kind === 'weekly') {
      await this.awardXp(user.id, 'weekly_reflection', checkIn.id);
      await this.unlock(user.id, 'first_week');
    }
    return checkIn;
  }

  async listCheckIns(filter?: { from?: string; to?: string }): Promise<CheckIn[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.checkIns
      .filter((c) => c.userId === user.id)
      .filter((c) => !filter?.from || c.day >= filter.from)
      .filter((c) => !filter?.to || c.day <= filter.to)
      .sort((a, b) => b.day.localeCompare(a.day));
  }

  async getTodayCheckIn(): Promise<CheckIn | null> {
    const list = await this.listCheckIns();
    return list.find((c) => c.day === todayKey() && c.kind === 'daily') ?? null;
  }

  // ---------- Accountability ----------

  async getPartnership(): Promise<AccountabilityPartnership | null> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return (
      db.partnerships.find(
        (p) => (p.initiatorId === user.id || p.partnerId === user.id) && p.status !== 'ended',
      ) ?? null
    );
  }

  async createInvite(): Promise<AccountabilityPartnership> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const partnership: AccountabilityPartnership = {
        id: uid('pt'),
        initiatorId: user.id,
        partnerId: '',
        status: 'pending',
        sharing: {
          todayCommitments: true,
          completionHistory: false,
          streakAndXp: false,
          weeklyReview: false,
        },
        inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: nowIso(),
      };
      db.partnerships.push(partnership);
      track('partner_invited');
      return partnership;
    });
  }

  async acceptInvite(code: string): Promise<AccountabilityPartnership> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const pending = db.partnerships.find(
        (p) => p.status === 'pending' && p.inviteCode === code.trim().toUpperCase(),
      );
      if (!pending) throw new Error('That invite code doesn’t match an active invitation.');
      if (pending.initiatorId === user.id) throw new Error('That’s your own invite code.');
      pending.partnerId = user.id;
      pending.status = 'active';
      pending.startedAt = nowIso();
      track('partner_connected');
      return pending;
    });
  }

  async getPartnerProfile(): Promise<Profile | null> {
    const { user } = await this.requireUser();
    const db = await this.db();
    const p = db.partnerships.find(
      (x) => (x.initiatorId === user.id || x.partnerId === user.id) && x.status === 'active',
    );
    if (!p || !p.partnerId) return null;
    const partnerId = p.initiatorId === user.id ? p.partnerId : p.initiatorId;
    return this.profileOf(partnerId);
  }

  async connectDemoPartner(): Promise<AccountabilityPartnership> {
    const { user } = await this.requireUser();
    const db = await this.db();
    // Reuse the seeded demo partner, or create one.
    const demoEmail = 'jordan.partner@correr.app';
    let partner = db.users.find((u) => u.email === demoEmail);
    if (!partner) {
      partner = { id: uid('usr'), email: demoEmail, createdAt: nowIso(), password: uid('pw') };
      db.users.push(partner);
      db.profiles.push({
        ...defaultProfile(partner.id, 'Jordan'),
        onboardingState: 'done',
      });
    }
    return this.tx((db2) => {
      const existing = db2.partnerships.find(
        (x) => x.initiatorId === user.id && x.status === 'pending',
      );
      const partnership: AccountabilityPartnership = existing ?? {
        id: uid('pt'),
        initiatorId: user.id,
        partnerId: '',
        status: 'pending',
        sharing: {
          todayCommitments: true,
          completionHistory: false,
          streakAndXp: false,
          weeklyReview: false,
        },
        inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        createdAt: nowIso(),
      };
      partnership.partnerId = partner!.id;
      partnership.status = 'active';
      partnership.startedAt = nowIso();
      if (!existing) db2.partnerships.push(partnership);
      // A welcome nudge from the demo partner, so the feed isn't empty.
      if (!db2.interactions.some((i) => i.partnershipId === partnership.id)) {
        db2.interactions.push({
          id: uid('pi'),
          partnershipId: partnership.id,
          fromUserId: partner!.id,
          toUserId: user.id,
          kind: 'encourage',
          message: 'Let’s run! Share today’s commitment and I’ll hold you to it.',
          createdAt: nowIso(),
        });
      }
      track('partner_connected', { demo: true });
      db2.notifications.push({
        id: uid('ntf'),
        userId: user.id,
        kind: 'partner_interaction',
        title: 'Jordan connected',
        body: 'Your accountability partner is in. Share today’s commitment to get started.',
        route: '/accountability',
        createdAt: nowIso(),
      });
      return partnership;
    });
  }

  async updateSharing(
    patch: Partial<AccountabilityPartnership['sharing']>,
  ): Promise<AccountabilityPartnership> {
    const partnership = await this.getPartnership();
    if (!partnership) throw new Error('No active partnership.');
    return this.tx((db) => {
      const p = db.partnerships.find((x) => x.id === partnership.id)!;
      Object.assign(p.sharing, patch);
      return p;
    });
  }

  async endPartnership(): Promise<void> {
    const partnership = await this.getPartnership();
    if (!partnership) return;
    await this.tx((db) => {
      const p = db.partnerships.find((x) => x.id === partnership.id)!;
      p.status = 'ended';
      p.endedAt = nowIso();
      track('partnership_ended');
    });
  }

  async blockUser(userId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      db.safetyRecords.push({
        id: uid('saf'),
        reporterId: user.id,
        subjectId: userId,
        kind: 'block',
        createdAt: nowIso(),
      });
    });
  }

  async reportUser(userId: string, reason: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      db.safetyRecords.push({
        id: uid('saf'),
        reporterId: user.id,
        subjectId: userId,
        kind: 'report',
        reason,
        createdAt: nowIso(),
      });
    });
  }

  async sendInteraction(
    input: Omit<
      PartnerInteraction,
      'id' | 'createdAt' | 'fromUserId' | 'toUserId' | 'partnershipId'
    >,
  ): Promise<PartnerInteraction> {
    const { user } = await this.requireUser();
    const partnership = await this.getPartnership();
    if (!partnership) throw new Error('No active partnership.');
    const interaction = await this.tx((db) => {
      const record: PartnerInteraction = {
        id: uid('pi'),
        partnershipId: partnership.id,
        fromUserId: user.id,
        toUserId:
          partnership.initiatorId === user.id ? partnership.partnerId : partnership.initiatorId,
        commitmentId: input.commitmentId,
        kind: input.kind,
        message: input.message,
        createdAt: nowIso(),
      };
      db.interactions.push(record);
      track('partner_interaction_sent', { kind: input.kind });
      return record;
    });
    if (input.kind === 'encourage') {
      await this.awardXp(user.id, 'encourage_partner');
      await this.unlock(user.id, 'supportive_partner');
    }
    return interaction;
  }

  async listInteractions(): Promise<PartnerInteraction[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    const mine = db.partnerships.filter(
      (p) => p.status === 'active' && (p.initiatorId === user.id || p.partnerId === user.id),
    );
    const ids = new Set(mine.map((p) => p.id));
    return db.interactions
      .filter((i) => ids.has(i.partnershipId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ---------- Gamification ----------

  async getStreak(): Promise<Streak> {
    const { user } = await this.requireUser();
    const db = await this.db();
    let s = db.streaks.find((x) => x.userId === user.id);
    if (!s) {
      s = { userId: user.id, commitmentStreak: 0, partnershipStreak: 0, lastActiveDay: null, bestStreak: 0 };
      db.streaks.push(s);
      await persist();
    }
    return s;
  }

  async getXp(): Promise<number> {
    const p = await this.getProfile();
    return p?.xp ?? 0;
  }

  async getLevel(): Promise<LevelName> {
    const p = await this.getProfile();
    return p?.level ?? 'Starter';
  }

  async listXpTransactions(): Promise<XPTransaction[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.xpTransactions
      .filter((x) => x.userId === user.id)
      .sort((a, b) => b.at.localeCompare(a.at));
  }

  async listAchievements(): Promise<{ def: AchievementDef; unlocked: UserAchievement | null }[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.achievements.map((def) => ({
      def,
      unlocked: db.userAchievements.find((a) => a.userId === user.id && a.achievementId === def.id) ?? null,
    }));
  }

  // ---------- AI ----------

  async listConversations(kind?: AIConversation['kind']): Promise<AIConversation[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.conversations
      .filter((c) => c.userId === user.id && (!kind || c.kind === kind))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createConversation(kind: AIConversation['kind'], visionId?: string): Promise<AIConversation> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const convo: AIConversation = {
        id: uid('cv'),
        userId: user.id,
        visionId,
        kind,
        title: kind === 'coach' ? 'AI Coach' : 'Conversation',
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.conversations.push(convo);
      return convo;
    });
  }

  async listMessages(conversationId: string): Promise<{ id: string; conversationId: string; role: 'user' | 'assistant'; content: string; createdAt: string }[]> {
    const db = await this.db();
    return db.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      const convo = db.conversations.find(
        (c) => c.id === conversationId && c.userId === user.id,
      );
      if (!convo) return;
      db.conversations = db.conversations.filter((c) => c.id !== conversationId);
      db.messages = db.messages.filter((m) => m.conversationId !== conversationId);
    });
  }

  async sendMessage(conversationId: string, content: string): Promise<{ id: string; conversationId: string; role: 'user' | 'assistant'; content: string; createdAt: string }> {
    const { user } = await this.requireUser();
    const db = await this.db();
    const convo = db.conversations.find((c) => c.id === conversationId);
    if (!convo) throw new Error('Conversation not found');
    const vision = convo.visionId ? db.visions.find((v) => v.id === convo.visionId) : undefined;
    const todayCommitments = db.commitments.filter(
      (c) => c.userId === user.id && c.dueAt.slice(0, 10) === todayKey() && c.state !== 'cancelled',
    );
    const history = db.messages
      .filter((message) => message.conversationId === conversationId)
      .slice(-8)
      .map((message) => ({ role: message.role, content: message.content }));
    const reply = await this.ai.chat({
      kind: convo.kind,
      userMessage: content,
      vision,
      todayCommitments,
      streak: db.streaks.find((s) => s.userId === user.id),
      history,
    });
    db.messages.push({
      id: uid('msg'),
      conversationId,
      role: 'user',
      content,
      createdAt: nowIso(),
    });
    const assistantMsg = {
      id: uid('msg'),
      conversationId,
      role: 'assistant' as const,
      content: reply,
      createdAt: nowIso(),
    };
    db.messages.push(assistantMsg);
    convo.updatedAt = nowIso();
    track('ai_message_sent');
    await persist();
    return assistantMsg;
  }

  async listInsights(): Promise<AiInsight[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.insights
      .filter((i) => i.userId === user.id && !i.dismissedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async dismissInsight(id: string): Promise<void> {
    await this.tx((db) => {
      const i = db.insights.find((x) => x.id === id);
      if (i) i.dismissedAt = nowIso();
    });
  }

  async requestPlanAdjustment(visionId: string, message: string): Promise<GeneratedRoadmap> {
    const vision = await this.getVision(visionId);
    if (!vision) throw new Error('Vision not found');
    const discovery = await this.getDiscovery(visionId);
    return await this.ai.generateRoadmap(vision, discovery, message);
  }

  // ---------- Notifications ----------

  async listNotifications(): Promise<AppNotification[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async markRead(id: string): Promise<void> {
    await this.tx((db) => {
      const n = db.notifications.find((x) => x.id === id);
      if (n) n.readAt = nowIso();
    });
  }

  async markAllRead(): Promise<void> {
    await this.tx((db) => {
      for (const n of db.notifications.filter((x) => !x.readAt)) n.readAt = nowIso();
    });
  }

  async clearRead(): Promise<void> {
    await this.tx((db) => {
      db.notifications = db.notifications.filter((n) => !n.readAt);
    });
  }

  async setPreference(kind: NotificationKind, enabled: boolean): Promise<void> {
    const map: Partial<Record<NotificationKind, keyof Profile['notificationPrefs']>> = {
      commitment_reminder: 'commitmentReminders',
      commitment_overdue: 'commitmentOverdue',
      partner_interaction: 'partnerInteractions',
      daily_checkin: 'dailyCheckIn',
      weekly_review: 'weeklyReview',
      ai_insight: 'aiInsights',
    };
    const key = map[kind];
    if (!key) return;
    await this.updateProfile({ notificationPrefs: { ...(await this.getProfile())!.notificationPrefs, [key]: enabled } as Profile['notificationPrefs'] });
  }

  // ---------- Circles ----------

  async listCircles(): Promise<Circle[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    const memberOf = new Set(
      db.circleMembers.filter((m) => m.userId === user.id).map((m) => m.circleId),
    );
    return db.circles
      .filter((c) => !c.isPrivate || memberOf.has(c.id))
      .map((c) => ({ ...c, viewerIsMember: memberOf.has(c.id) }));
  }

  async createCircle(name: string, description: string, isPrivate: boolean): Promise<Circle> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const circle: Circle = {
        id: uid('cir'),
        name,
        description,
        ownerId: user.id,
        memberCount: 1,
        viewerIsMember: true,
        isPrivate,
        createdAt: nowIso(),
      };
      db.circles.push(circle);
      db.circleMembers.push({ circleId: circle.id, userId: user.id, role: 'owner', joinedAt: nowIso() });
      return circle;
    });
  }

  async joinCircle(circleId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      if (db.circleMembers.some((m) => m.circleId === circleId && m.userId === user.id)) return;
      db.circleMembers.push({ circleId, userId: user.id, role: 'member', joinedAt: nowIso() });
      const c = db.circles.find((x) => x.id === circleId);
      if (c) c.memberCount += 1;
    });
  }

  async leaveCircle(circleId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      db.circleMembers = db.circleMembers.filter(
        (m) => !(m.circleId === circleId && m.userId === user.id),
      );
      const c = db.circles.find((x) => x.id === circleId);
      if (c) c.memberCount = Math.max(0, c.memberCount - 1);
    });
  }

  async deleteCircle(circleId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      const circle = db.circles.find((c) => c.id === circleId);
      if (!circle || circle.ownerId !== user.id) return;
      db.circles = db.circles.filter((c) => c.id !== circleId);
      db.circleMembers = db.circleMembers.filter((m) => m.circleId !== circleId);
      db.circlePosts = db.circlePosts.filter((p) => p.circleId !== circleId);
      db.sharedGoals = db.sharedGoals.filter((g) => g.circleId !== circleId);
    });
  }

  async listPosts(circleId: string): Promise<CirclePost[]> {
    const db = await this.db();
    return db.circlePosts
      .filter((p) => p.circleId === circleId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createPost(circleId: string, content: string, kind: CirclePost['kind']): Promise<CirclePost> {
    const { user } = await this.requireUser();
    return this.tx(async (db) => {
      const profile = db.profiles.find((p) => p.userId === user.id);
      const post: CirclePost = {
        id: uid('post'),
        circleId,
        userId: user.id,
        authorName: profile?.displayName ?? 'Runner',
        content,
        kind,
        createdAt: nowIso(),
      };
      db.circlePosts.push(post);
      return post;
    });
  }

  async deletePost(postId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      const post = db.circlePosts.find((p) => p.id === postId);
      if (!post) return;
      const circle = db.circles.find((c) => c.id === post.circleId);
      if (post.userId !== user.id && circle?.ownerId !== user.id) return;
      db.circlePosts = db.circlePosts.filter((p) => p.id !== postId);
    });
  }

  async listChallenges(): Promise<Challenge[]> {
    const db = await this.db();
    return db.challenges.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async joinChallenge(challengeId: string): Promise<void> {
    const { user } = await this.requireUser();
    await this.tx((db) => {
      const c = db.challenges.find((x) => x.id === challengeId);
      if (c && !c.participantIds.includes(user.id)) c.participantIds.push(user.id);
    });
  }

  async listSharedGoals(): Promise<SharedGoal[]> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return db.sharedGoals.filter((g) => g.participantIds.includes(user.id));
  }

  // ---------- Hackathon ----------

  async listHackathons(): Promise<Hackathon[]> {
    const db = await this.db();
    return db.hackathons.sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async getTeam(hackathonId: string): Promise<HackathonTeam | null> {
    const { user } = await this.requireUser();
    const db = await this.db();
    return (
      db.hackathonTeams.find((t) => t.hackathonId === hackathonId && t.memberIds.includes(user.id)) ??
      null
    );
  }

  async createTeam(hackathonId: string, name: string): Promise<HackathonTeam> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const team: HackathonTeam = {
        id: uid('team'),
        hackathonId,
        name,
        memberIds: [user.id],
        ownerId: user.id,
        inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      };
      db.hackathonTeams.push(team);
      return team;
    });
  }

  async joinTeam(inviteCode: string): Promise<HackathonTeam> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const team = db.hackathonTeams.find((t) => t.inviteCode === inviteCode.trim().toUpperCase());
      if (!team) throw new Error('That team code doesn’t match any team.');
      if (!team.memberIds.includes(user.id)) team.memberIds.push(user.id);
      return team;
    });
  }

  async listTeamMilestones(teamId: string): Promise<HackathonMilestone[]> {
    const db = await this.db();
    return db.hackathonMilestones.filter((m) => m.teamId === teamId);
  }

  async createTeamMilestone(teamId: string, title: string, dueAt: string): Promise<HackathonMilestone> {
    return this.tx((db) => {
      const m: HackathonMilestone = {
        id: uid('hm'),
        hackathonId: db.hackathonTeams.find((t) => t.id === teamId)?.hackathonId ?? '',
        teamId,
        title,
        dueAt,
        status: 'planned',
      };
      db.hackathonMilestones.push(m);
      return m;
    });
  }

  async updateTeamMilestone(id: string, patch: Partial<HackathonMilestone>): Promise<HackathonMilestone> {
    return this.tx((db) => {
      const m = db.hackathonMilestones.find((x) => x.id === id);
      if (!m) throw new Error('Milestone not found');
      Object.assign(m, patch);
      return m;
    });
  }

  async submit(
    hackathonId: string,
    input: { title: string; description: string; link?: string },
  ): Promise<HackathonSubmission> {
    const { user } = await this.requireUser();
    return this.tx(async (db) => {
      const team = db.hackathonTeams.find(
        (t) => t.hackathonId === hackathonId && t.memberIds.includes(user.id),
      );
      if (!team) throw new Error('Join a team before submitting.');
      const submission: HackathonSubmission = {
        id: uid('sub'),
        hackathonId,
        teamId: team.id,
        title: input.title,
        description: input.description,
        link: input.link,
        submittedAt: nowIso(),
      };
      db.hackathonSubmissions.push(submission);
      return submission;
    });
  }

  async listSubmissions(hackathonId: string): Promise<HackathonSubmission[]> {
    const db = await this.db();
    return db.hackathonSubmissions.filter((s) => s.hackathonId === hackathonId);
  }

  // ---------- Billing ----------

  async getSubscription(): Promise<Subscription> {
    const { user } = await this.requireUser();
    const db = await this.db();
    if (db.subscription && db.subscription.userId === user.id) return db.subscription;
    return {
      id: uid('sub'),
      userId: user.id,
      plan: 'free',
      status: 'active',
      provider: 'mock',
    };
  }

  async subscribe(plan: 'pro' | 'org'): Promise<Subscription> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const sub: Subscription = {
        id: uid('sub'),
        userId: user.id,
        plan,
        status: 'active',
        renewsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        provider: 'mock',
        providerRef: `mock_${Math.random().toString(36).slice(2, 10)}`,
      };
      db.subscription = sub;
      return sub;
    });
  }

  async cancelSubscription(): Promise<Subscription> {
    const { user } = await this.requireUser();
    return this.tx((db) => {
      const sub: Subscription = db.subscription ?? {
        id: uid('sub'),
        userId: user.id,
        plan: 'free',
        status: 'active',
        provider: 'mock',
      };
      sub.status = 'cancelled';
      sub.plan = 'free';
      db.subscription = sub;
      return sub;
    });
  }

  // ---------- Campus ----------

  async getMetrics(orgId: string, period: string): Promise<CampusAggregateMetric | null> {
    const db = await this.db();
    if (!db.profiles.some((p) => p.campusOrgId === orgId)) return null;
    const activeStudents = db.profiles.filter((p) => p.campusOrgId === orgId).length;
    // Privacy-preserving: suppress cohorts smaller than MIN_COHORT_SIZE
    if (activeStudents < MIN_COHORT_SIZE) return null;
    const completed = db.commitments.filter((c) => c.state === 'completed').length;
    const due = db.commitments.filter((c) => c.state !== 'cancelled').length || 1;
    const missed = db.commitments.filter((c) => c.state === 'missed').length;
    return {
      orgId,
      period,
      activeStudents,
      activationRate: 0.62,
      weeklyRetention: 0.44,
      completionRate: completed / due,
      recoveryRate: completed / (completed + missed) || 0,
      cohortSize: activeStudents,
    };
  }

  // ---------- Demo helpers ----------

  async resetDemoData(): Promise<void> {
    await resetDb();
  }
}

export const mockApi = new MockCorrerApi();

export { DEMO_ACCOUNT_PASSWORD };

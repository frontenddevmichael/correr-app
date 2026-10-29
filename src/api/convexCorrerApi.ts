import type { ConvexAuthActionsContext } from '@convex-dev/auth/react';
import type { ConvexReactClient } from 'convex/react';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { api } from '../../convex/_generated/api';
import type { Doc, Id } from '../../convex/_generated/dataModel';
import { track } from '@/core/analytics';
import type {
  AchievementDef,
  AccountabilityPartnership,
  AchievementId,
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
  XPTransaction,
  XpAction,
} from '@/core/domain';
import type {
  CheckInInput,
  CommitmentInput,
  CorrerApi,
  DiscoveryInput,
  VisionInput,
} from './correrApi';
import { friendlyError } from './errorMessage';

/**
 * ConvexCorrerApi — the real-backend implementation of CorrerApi.
 *
 * Everything is promise-based (client.query/mutation/action) so no screen or
 * hook changes when the mock is swapped out. Authentication runs through the
 * ConvexAuthProvider bridge (signIn/signOut) which owns token storage; the
 * shared ConvexReactClient is authenticated by ConvexProviderWithAuth, so
 * every call below carries the session automatically.
 */

export type AuthBridgeRef = { current: ConvexAuthActionsContext | null };

/**
 * Module-level holder for Convex Auth's signIn/signOut actions. ApiProvider
 * syncs the live context value here from an effect; the adapter reads it at
 * call time (never during render), so no ref crosses the render boundary.
 */
export const authBridge: AuthBridgeRef = { current: null };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drop undefined keys — Convex args treat missing and undefined differently at validation. */
function defined<T extends object>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) out[key] = value;
  }
  return out as T;
}

function clientTimezone(): string | undefined {
  if (typeof Intl === 'undefined') return undefined;
  return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
}

type WithSystem<T> = T & { _id: string; _creationTime: number };

function strip<T extends { _id: string; _creationTime: number }>(
  doc: T,
): Omit<T, '_id' | '_creationTime'> {
  const { _id, _creationTime, ...rest } = doc;
  void _id;
  void _creationTime;
  return rest;
}

function withId<T extends { _id: string; _creationTime: number }>(
  doc: T,
): { id: string } & Omit<T, '_id' | '_creationTime'> {
  return { ...strip(doc), id: doc._id };
}

function mapProfile(doc: Doc<'profiles'>): Profile {
  return { ...strip(doc), level: doc.level as LevelName };
}

function mapXp(doc: Doc<'xpTransactions'>): XPTransaction {
  return { ...withId(doc), action: doc.action as XpAction };
}

function humanizeAuthError(e: unknown): Error {
  const message = e instanceof Error ? e.message : String(e);
  if (/already exists|taken|duplicate/i.test(message)) {
    return new Error('An account with this email already exists. Try logging in.');
  }
  if (/invalid|incorrect|not found|no user|credentials/i.test(message)) {
    return new Error('Incorrect email or password.');
  }
  return e instanceof Error ? e : new Error(message);
}

const PROFILE_PATCH_KEYS = [
  'displayName',
  'timezone',
  'avatarColor',
  'bio',
  'focusAreas',
  'appearance',
  'onboardingState',
  'notificationPrefs',
  'coachingTone',
  'coachLength',
  'coachContext',
] as const;

/**
 * Wraps `client.query/mutation/action` so every rejection is re-thrown with a
 * user-safe message before any screen can render `e.message` (see
 * `errorMessage.ts`). One choke point instead of 97 call sites.
 */
function normalizeApiErrors(client: ConvexReactClient): ConvexReactClient {
  const call = (fn: (...args: unknown[]) => unknown, args: unknown[]): Promise<unknown> => {
    try {
      return Promise.resolve(fn(...args)).catch((e: unknown) => {
        throw friendlyError(e);
      });
    } catch (e) {
      throw friendlyError(e);
    }
  };

  return new Proxy(client, {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (
        (prop === 'query' || prop === 'mutation' || prop === 'action') &&
        typeof value === 'function'
      ) {
        return (...args: unknown[]) => call(value.bind(target), args);
      }
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as ConvexReactClient;
}

export class ConvexCorrerApi implements CorrerApi {
  private readonly client: ConvexReactClient;

  constructor(client: ConvexReactClient) {
    this.client = normalizeApiErrors(client);
  }

  // ---------- Auth ----------

  private async waitForSession(attempts = 25): Promise<Session | null> {
    // Convex Auth completes its token handshake just after signIn resolves.
    for (let i = 0; i < attempts; i++) {
      const session = await this.getSession();
      if (session) return session;
      await sleep(120);
    }
    return null;
  }

  private requireBridge(): ConvexAuthActionsContext {
    if (!authBridge.current) {
      throw new Error('Authentication isn’t ready yet. Try again in a moment.');
    }
    return authBridge.current;
  }

  async signUp(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) throw new Error('Enter a valid email address.');
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    try {
      const res = await this.requireBridge().signIn('password', {
        flow: 'signUp',
        email: normalized,
        password,
      });
      if (!res.signingIn) {
        throw new Error('Sign-up needs an extra step that isn’t available yet.');
      }
    } catch (e) {
      throw humanizeAuthError(e);
    }
    const session = await this.waitForSession();
    if (!session) throw new Error('Sign-up didn’t finish. Please try again.');
    track('account_created');
    return session;
  }

  async signIn(email: string, password: string): Promise<Session> {
    const normalized = email.trim().toLowerCase();
    try {
      const res = await this.requireBridge().signIn('password', {
        flow: 'signIn',
        email: normalized,
        password,
      });
      if (!res.signingIn) {
        throw new Error('Sign-in needs an extra step that isn’t available yet.');
      }
    } catch (e) {
      throw humanizeAuthError(e);
    }
    const session = await this.waitForSession();
    if (!session) throw new Error('Sign-in didn’t finish. Please try again.');
    return session;
  }

  async signInWithGoogle(): Promise<Session> {
    const bridge = this.requireBridge();
    // Where the OAuth flow sends the browser back to: the app deep link on
    // native (`correr:///login`, `exp://…/--/login` inside Expo Go), this
    // page's origin on web. Convex Auth's redirect callback validates it.
    const redirectTo =
      Platform.OS === 'web'
        ? `${window.location.origin}/login`
        : Linking.createURL('/login');

    let res: Awaited<ReturnType<ConvexAuthActionsContext['signIn']>>;
    try {
      res = await bridge.signIn('google', { redirectTo });
    } catch (e) {
      throw humanizeAuthError(e);
    }

    if (res.redirect) {
      if (Platform.OS === 'web') {
        // The client already set window.location to the flow; the page
        // reloads at /login with ?code= and ConvexAuthProvider completes the
        // exchange. This promise intentionally never settles.
        return new Promise<Session>(() => {});
      }
      // Native: Convex Auth never navigates for us — open the flow in the
      // system browser, then finish it with the code handed back to the app.
      const browser = await WebBrowser.openAuthSessionAsync(
        res.redirect.toString(),
        redirectTo,
      );
      if (browser.type !== 'success') {
        throw new Error('Google sign-in was cancelled.');
      }
      const code = /[?&]code=([^&]+)/.exec(browser.url)?.[1];
      if (!code) {
        throw new Error('Google sign-in didn’t finish. Please try again.');
      }
      try {
        res = await bridge.signIn('google', { code });
      } catch (e) {
        throw humanizeAuthError(e);
      }
      if (!res.signingIn) {
        throw new Error('Google sign-in didn’t finish. Please try again.');
      }
    } else if (!res.signingIn) {
      throw new Error('Google sign-in couldn’t start. Please try again.');
    }

    const session = await this.waitForSession();
    if (!session) throw new Error('Google sign-in didn’t finish. Please try again.');
    return session;
  }

  async signOut(): Promise<void> {
    await this.requireBridge().signOut();
  }

  async requestPasswordReset(email: string): Promise<void> {
    // No email provider is configured, so parity with the mock contract:
    // always succeeds to avoid account enumeration.
    await sleep(400);
    void email;
  }

  async getSession(): Promise<Session | null> {
    try {
      const me = await this.client.query(api.profile.me, {});
      if (!me) return null;
      return {
        user: { id: me.id, email: me.email, createdAt: me.createdAt },
        token: '',
      };
    } catch {
      return null;
    }
  }

  // ---------- Profile ----------

  async getProfile(): Promise<Profile | null> {
    const me = await this.client.query(api.profile.me, {});
    if (!me) return null;
    const timezone = clientTimezone();
    if (me.profile) {
      if (timezone && me.profile.timezone !== timezone) {
        const updated = await this.client.mutation(api.profile.update, {
          timezone,
        });
        return mapProfile(updated);
      }
      return mapProfile(me.profile);
    }
    await this.client.mutation(
      api.profile.ensure,
      defined({ timezone }),
    );
    const again = await this.client.query(api.profile.me, {});
    return again?.profile ? mapProfile(again.profile) : null;
  }

  async updateProfile(patch: Partial<Omit<Profile, 'userId'>>): Promise<Profile> {
    const args: Record<string, unknown> = {};
    for (const key of PROFILE_PATCH_KEYS) {
      const value = (patch as Record<string, unknown>)[key];
      if (value !== undefined) args[key] = value;
    }
    const doc = await this.client.mutation(
      api.profile.update,
      args as Parameters<typeof this.client.mutation>[1],
    );
    return mapProfile(doc);
  }

  async recordConsent(
    version: string,
  ): Promise<{ consentVersion: string; consentAt: string }> {
    return await this.client.mutation(api.profile.recordConsent, { version });
  }

  async exportData(): Promise<Record<string, unknown>> {
    const data = await this.client.query(api.account.exportData, {});
    track('data_exported');
    return data as Record<string, unknown>;
  }

  async deleteAccount(): Promise<void> {
    await this.client.mutation(api.account.deleteAccount, {});
    track('account_deleted');
  }

  // ---------- Visions ----------

  async listVisions(status?: Vision['status']): Promise<Vision[]> {
    const rows = await this.client.query(
      api.visions.list,
      defined({ status }),
    );
    return rows.map(withId) as Vision[];
  }

  async getVision(id: string): Promise<Vision | null> {
    const doc = await this.client.query(api.visions.get, {
      id: id as Id<'visions'>,
    });
    return doc ? (withId(doc) as Vision) : null;
  }

  async createVision(input: VisionInput): Promise<Vision> {
    const doc = await this.client.mutation(api.visions.create, input);
    track('vision_created');
    return withId(doc) as Vision;
  }

  async updateVision(id: string, patch: Partial<VisionInput>): Promise<Vision> {
    const doc = await this.client.mutation(
      api.visions.update,
      defined({
        id: id as Id<'visions'>,
        title: patch.title,
        description: patch.description,
        whyItMatters: patch.whyItMatters,
        category: patch.category,
        targetTimeframe: patch.targetTimeframe,
        targetDate: patch.targetDate,
        priority: patch.priority,
      }),
    );
    track('vision_edited');
    return withId(doc) as Vision;
  }

  async setVisionStatus(id: string, status: Vision['status']): Promise<Vision> {
    const doc = await this.client.mutation(api.visions.setStatus, {
      id: id as Id<'visions'>,
      status,
    });
    return withId(doc) as Vision;
  }

  async deleteVision(id: string): Promise<void> {
    await this.client.mutation(api.visions.remove, {
      id: id as Id<'visions'>,
    });
  }

  // ---------- Discovery + Roadmap ----------

  async saveDiscovery(input: DiscoveryInput): Promise<AiDiscovery> {
    const doc = await this.client.mutation(
      api.roadmap.saveDiscovery,
      defined({
        visionId: input.visionId as Id<'visions'>,
        currentState: input.currentState,
        timeAvailablePerDay: input.timeAvailablePerDay,
        blockers: input.blockers,
        preferredPace: input.preferredPace,
        constraints: input.constraints,
      }),
    );
    track('ai_discovery_completed');
    return withId(doc) as AiDiscovery;
  }

  async getDiscovery(visionId: string): Promise<AiDiscovery | null> {
    const doc = await this.client.query(api.roadmap.getDiscovery, {
      visionId: visionId as Id<'visions'>,
    });
    return doc ? (withId(doc) as AiDiscovery) : null;
  }

  async generateRoadmap(visionId: string): Promise<GeneratedRoadmap> {
    const roadmap = await this.client.action(api.roadmap.generate, {
      visionId: visionId as Id<'visions'>,
    });
    track('ai_roadmap_generated');
    return roadmap;
  }

  async saveRoadmap(visionId: string, roadmap: GeneratedRoadmap): Promise<Goal[]> {
    const goals = await this.client.mutation(api.roadmap.save, {
      visionId: visionId as Id<'visions'>,
      roadmap,
    });
    track('roadmap_saved', { goals: goals.length });
    return goals.map(withId) as Goal[];
  }

  async listGoals(visionId: string): Promise<Goal[]> {
    const rows = await this.client.query(api.roadmap.listGoals, {
      visionId: visionId as Id<'visions'>,
    });
    return rows.map(withId) as Goal[];
  }

  async updateGoal(goalId: string, patch: Partial<Goal>): Promise<Goal> {
    const doc = await this.client.mutation(
      api.roadmap.updateGoal,
      defined({
        goalId: goalId as Id<'goals'>,
        title: patch.title,
        description: patch.description,
        order: patch.order,
        targetDate: patch.targetDate,
        status: patch.status,
      }),
    );
    return withId(doc) as Goal;
  }

  async removeGoal(goalId: string): Promise<void> {
    await this.client.mutation(api.roadmap.remove, {
      goalId: goalId as Id<'goals'>,
    });
  }

  async listMilestones(goalId: string): Promise<Milestone[]> {
    const rows = await this.client.query(api.roadmap.listMilestones, {
      goalId: goalId as Id<'goals'>,
    });
    return rows.map(withId) as Milestone[];
  }

  async updateMilestone(
    milestoneId: string,
    patch: Partial<Milestone>,
  ): Promise<Milestone> {
    const doc = await this.client.mutation(
      api.roadmap.updateMilestone,
      defined({
        milestoneId: milestoneId as Id<'milestones'>,
        title: patch.title,
        description: patch.description,
        order: patch.order,
        targetDate: patch.targetDate,
        status: patch.status,
      }),
    );
    return withId(doc) as Milestone;
  }

  async completeMilestone(milestoneId: string): Promise<Milestone> {
    const doc = await this.client.mutation(api.roadmap.complete, {
      milestoneId: milestoneId as Id<'milestones'>,
    });
    return withId(doc) as Milestone;
  }

  async regenerateRoadmap(visionId: string): Promise<GeneratedRoadmap> {
    const roadmap = await this.client.action(api.roadmap.regenerate, {
      visionId: visionId as Id<'visions'>,
    });
    track('roadmap_regenerated');
    return roadmap;
  }

  // ---------- Commitments ----------

  async listCommitments(filter?: {
    state?: CommitmentState[];
    from?: string;
    to?: string;
    visionId?: string;
  }): Promise<Commitment[]> {
    const rows = await this.client.query(
      api.commitments.list,
      defined({
        state: filter?.state,
        from: filter?.from,
        to: filter?.to,
        visionId: filter?.visionId,
      }),
    );
    return rows.map(withId) as Commitment[];
  }

  async getCommitment(id: string): Promise<Commitment | null> {
    const doc = await this.client.query(api.commitments.get, {
      id: id as Id<'commitments'>,
    });
    return doc ? (withId(doc) as Commitment) : null;
  }

  async createCommitment(input: CommitmentInput): Promise<Commitment> {
    const doc = await this.client.mutation(
      api.commitments.create,
      defined({ ...input }),
    );
    track('commitment_created');
    return withId(doc) as Commitment;
  }

  async startCommitment(id: string): Promise<Commitment> {
    const doc = await this.client.mutation(api.commitments.start, {
      id: id as Id<'commitments'>,
    });
    track('commitment_started');
    return withId(doc) as Commitment;
  }

  async completeCommitment(id: string): Promise<Commitment> {
    const doc = await this.client.mutation(api.commitments.complete, {
      id: id as Id<'commitments'>,
    });
    track('commitment_completed');
    return withId(doc) as Commitment;
  }

  async missCommitment(id: string): Promise<Commitment> {
    const doc = await this.client.mutation(api.commitments.miss, {
      id: id as Id<'commitments'>,
    });
    track('commitment_missed');
    return withId(doc) as Commitment;
  }

  async rescheduleCommitment(id: string, newDueAt: string): Promise<Commitment> {
    const doc = await this.client.mutation(api.commitments.reschedule, {
      id: id as Id<'commitments'>,
      newDueAt,
    });
    track('commitment_rescheduled');
    return withId(doc) as Commitment;
  }

  async cancelCommitment(id: string): Promise<Commitment> {
    const doc = await this.client.mutation(api.commitments.cancel, {
      id: id as Id<'commitments'>,
    });
    return withId(doc) as Commitment;
  }

  async deleteCommitment(id: string): Promise<void> {
    await this.client.mutation(api.commitments.remove, {
      id: id as Id<'commitments'>,
    });
  }

  async recoverCommitment(
    id: string,
    blocker: string,
    replacement: CommitmentInput,
  ): Promise<Commitment> {
    const doc = await this.client.mutation(api.commitments.recover, {
      id: id as Id<'commitments'>,
      blocker,
      replacement: defined({ ...replacement }),
    });
    return withId(doc) as Commitment;
  }

  async listEvents(commitmentId: string): Promise<CommitmentEvent[]> {
    const rows = await this.client.query(api.commitments.listEvents, {
      commitmentId: commitmentId as Id<'commitments'>,
    });
    return rows.map(withId) as CommitmentEvent[];
  }

  // ---------- Check-ins ----------

  async createCheckIn(input: CheckInInput): Promise<CheckIn> {
    const doc = await this.client.mutation(
      api.checkins.create,
      defined({ ...input }),
    );
    if (input.kind === 'daily') track('daily_checkin_completed');
    if (input.kind === 'weekly') track('weekly_review_completed');
    return withId(doc) as CheckIn;
  }

  async listCheckIns(filter?: { from?: string; to?: string }): Promise<CheckIn[]> {
    const rows = await this.client.query(
      api.checkins.list,
      defined({ from: filter?.from, to: filter?.to }),
    );
    return rows.map(withId) as CheckIn[];
  }

  async getTodayCheckIn(): Promise<CheckIn | null> {
    const doc = await this.client.query(api.checkins.today, {});
    return doc ? (withId(doc) as CheckIn) : null;
  }

  // ---------- Accountability ----------

  private async currentPartnershipId(): Promise<string | null> {
    const doc = await this.client.query(api.partnerships.get, {});
    return doc ? doc._id : null;
  }

  async getPartnership(): Promise<AccountabilityPartnership | null> {
    const doc = await this.client.query(api.partnerships.get, {});
    return doc ? (withId(doc) as AccountabilityPartnership) : null;
  }

  async createInvite(): Promise<AccountabilityPartnership> {
    const doc = await this.client.mutation(api.partnerships.createInvite, {});
    track('partner_invited');
    return withId(doc) as AccountabilityPartnership;
  }

  async acceptInvite(code: string): Promise<AccountabilityPartnership> {
    const doc = await this.client.mutation(api.partnerships.acceptInvite, {
      code,
    });
    track('partner_connected');
    return withId(doc) as AccountabilityPartnership;
  }

  async getPartnerProfile(): Promise<Profile | null> {
    const doc = await this.client.query(api.partnerships.getPartnerProfile, {});
    return doc ? mapProfile(doc) : null;
  }

  async connectDemoPartner(): Promise<AccountabilityPartnership> {
    const doc = await this.client.mutation(
      api.partnerships.connectDemoPartner,
      {},
    );
    track('partner_connected', { demo: true });
    return withId(doc) as AccountabilityPartnership;
  }

  async updateSharing(
    patch: Partial<AccountabilityPartnership['sharing']>,
  ): Promise<AccountabilityPartnership> {
    const partnershipId = await this.currentPartnershipId();
    if (!partnershipId) throw new Error('No active partnership.');
    const doc = await this.client.mutation(api.partnerships.updateSharing, {
      partnershipId: partnershipId as Id<'partnerships'>,
      patch: defined({ ...patch }),
    });
    return withId(doc) as AccountabilityPartnership;
  }

  async endPartnership(): Promise<void> {
    const partnershipId = await this.currentPartnershipId();
    if (!partnershipId) return;
    await this.client.mutation(api.partnerships.end, {
      partnershipId: partnershipId as Id<'partnerships'>,
    });
    track('partnership_ended');
  }

  async blockUser(userId: string): Promise<void> {
    await this.client.mutation(api.partnerships.addSafetyRecord, {
      subjectId: userId,
      kind: 'block',
    });
  }

  async reportUser(userId: string, reason: string): Promise<void> {
    await this.client.mutation(api.partnerships.addSafetyRecord, {
      subjectId: userId,
      kind: 'report',
      reason,
    });
  }

  async sendInteraction(
    input: Omit<
      PartnerInteraction,
      'id' | 'createdAt' | 'fromUserId' | 'toUserId' | 'partnershipId'
    >,
  ): Promise<PartnerInteraction> {
    const partnershipId = await this.currentPartnershipId();
    if (!partnershipId) throw new Error('No active partnership.');
    const doc = await this.client.mutation(
      api.partnerships.sendInteraction,
      defined({
        partnershipId: partnershipId as Id<'partnerships'>,
        commitmentId: input.commitmentId,
        kind: input.kind,
        message: input.message,
      }),
    );
    track('partner_interaction_sent', { kind: input.kind });
    return withId(doc) as PartnerInteraction;
  }

  async listInteractions(): Promise<PartnerInteraction[]> {
    const rows = await this.client.query(api.partnerships.listInteractions, {});
    return rows.map(withId) as PartnerInteraction[];
  }

  // ---------- Gamification ----------

  async getStreak(): Promise<Streak> {
    const doc = await this.client.query(api.gamification.getStreak, {});
    return ('_id' in doc ? strip(doc) : doc) as Streak;
  }

  async getXp(): Promise<number> {
    return await this.client.query(api.gamification.getXp, {});
  }

  async getLevel(): Promise<LevelName> {
    return (await this.client.query(api.gamification.getLevel, {})) as LevelName;
  }

  async listXpTransactions(): Promise<XPTransaction[]> {
    const rows = await this.client.query(api.gamification.listXpTransactions, {});
    return rows.map(mapXp);
  }

  async listAchievements(): Promise<
    { def: AchievementDef; unlocked: UserAchievement | null }[]
  > {
    const rows = await this.client.query(api.gamification.listAchievements, {});
    return rows.map((row) => ({
      def: row.def,
      unlocked: row.unlocked
        ? {
            ...strip(row.unlocked),
            achievementId: row.unlocked.achievementId as AchievementId,
          }
        : null,
    }));
  }

  // ---------- AI ----------

  async listConversations(kind?: AIConversation['kind']): Promise<AIConversation[]> {
    const rows = await this.client.query(
      api.ai.listConversations,
      defined({ kind }),
    );
    return rows.map(withId) as AIConversation[];
  }

  async createConversation(
    kind: AIConversation['kind'],
    visionId?: string,
  ): Promise<AIConversation> {
    const doc = await this.client.mutation(
      api.ai.createConversation,
      defined({ kind, visionId: visionId as Id<'visions'> | undefined }),
    );
    return withId(doc) as AIConversation;
  }

  async listMessages(conversationId: string): Promise<AIMessage[]> {
    const rows = await this.client.query(api.ai.listMessages, {
      conversationId: conversationId as Id<'conversations'>,
    });
    return rows.map(withId) as AIMessage[];
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.client.mutation(api.ai.deleteConversation, {
      conversationId: conversationId as Id<'conversations'>,
    });
  }

  async sendMessage(conversationId: string, content: string): Promise<AIMessage> {
    const doc = await this.client.action(api.ai.sendMessage, {
      conversationId: conversationId as Id<'conversations'>,
      content,
    });
    track('ai_message_sent');
    return withId(doc) as AIMessage;
  }

  async listInsights(): Promise<AiInsight[]> {
    const rows = await this.client.query(api.ai.listInsights, {});
    return rows.map(withId) as AiInsight[];
  }

  async dismissInsight(id: string): Promise<void> {
    await this.client.mutation(api.ai.dismissInsight, {
      id: id as Id<'insights'>,
    });
  }

  async requestPlanAdjustment(
    visionId: string,
    message: string,
  ): Promise<GeneratedRoadmap> {
    return await this.client.action(api.ai.requestPlanAdjustment, {
      visionId: visionId as Id<'visions'>,
      message,
    });
  }

  // ---------- Notifications ----------

  async listNotifications(): Promise<AppNotification[]> {
    const rows = await this.client.query(api.notifications.list, {});
    return rows.map(withId) as AppNotification[];
  }

  async markRead(id: string): Promise<void> {
    await this.client.mutation(api.notifications.markRead, {
      id: id as Id<'notifications'>,
    });
  }

  async markAllRead(): Promise<void> {
    await this.client.mutation(api.notifications.markAllRead, {});
  }

  async clearRead(): Promise<void> {
    await this.client.mutation(api.notifications.clearRead, {});
  }

  async setPreference(kind: NotificationKind, enabled: boolean): Promise<void> {
    await this.client.mutation(api.notifications.setPreference, {
      kind,
      enabled,
    });
  }

  // ---------- Circles ----------

  async listCircles(): Promise<Circle[]> {
    const rows = await this.client.query(api.circles.listCircles, {});
    return rows.map(withId) as Circle[];
  }

  async createCircle(
    name: string,
    description: string,
    isPrivate: boolean,
  ): Promise<Circle> {
    const doc = await this.client.mutation(api.circles.createCircle, {
      name,
      description,
      isPrivate,
    });
    return { ...withId(doc), viewerIsMember: true } as Circle;
  }

  async joinCircle(circleId: string): Promise<void> {
    await this.client.mutation(api.circles.joinCircle, {
      circleId: circleId as Id<'circles'>,
    });
  }

  async leaveCircle(circleId: string): Promise<void> {
    await this.client.mutation(api.circles.leaveCircle, {
      circleId: circleId as Id<'circles'>,
    });
  }

  async deleteCircle(circleId: string): Promise<void> {
    await this.client.mutation(api.circles.deleteCircle, {
      circleId: circleId as Id<'circles'>,
    });
  }

  async listPosts(circleId: string): Promise<CirclePost[]> {
    const rows = await this.client.query(api.circles.listPosts, {
      circleId: circleId as Id<'circles'>,
    });
    return rows.map(withId) as CirclePost[];
  }

  async createPost(
    circleId: string,
    content: string,
    kind: CirclePost['kind'],
  ): Promise<CirclePost> {
    const doc = await this.client.mutation(api.circles.createPost, {
      circleId: circleId as Id<'circles'>,
      content,
      kind,
    });
    return withId(doc) as CirclePost;
  }

  async deletePost(postId: string): Promise<void> {
    await this.client.mutation(api.circles.deletePost, {
      postId: postId as Id<'circlePosts'>,
    });
  }

  async listChallenges(): Promise<Challenge[]> {
    const rows = await this.client.query(api.circles.listChallenges, {});
    return rows.map(withId) as Challenge[];
  }

  async joinChallenge(challengeId: string): Promise<void> {
    await this.client.mutation(api.circles.joinChallenge, {
      challengeId: challengeId as Id<'challenges'>,
    });
  }

  async listSharedGoals(): Promise<SharedGoal[]> {
    const rows = await this.client.query(api.circles.listSharedGoals, {});
    return rows.map(withId) as SharedGoal[];
  }

  // ---------- Hackathon ----------

  async listHackathons(): Promise<Hackathon[]> {
    const rows = await this.client.query(api.hackathon.list, {});
    return rows.map(withId) as Hackathon[];
  }

  async getTeam(hackathonId: string): Promise<HackathonTeam | null> {
    const doc = await this.client.query(api.hackathon.getTeam, { hackathonId });
    return doc ? (withId(doc) as HackathonTeam) : null;
  }

  async createTeam(hackathonId: string, name: string): Promise<HackathonTeam> {
    const doc = await this.client.mutation(api.hackathon.createTeam, {
      hackathonId,
      name,
    });
    return withId(doc) as HackathonTeam;
  }

  async joinTeam(inviteCode: string): Promise<HackathonTeam> {
    const doc = await this.client.mutation(api.hackathon.joinTeam, {
      inviteCode,
    });
    return withId(doc) as HackathonTeam;
  }

  async listTeamMilestones(teamId: string): Promise<HackathonMilestone[]> {
    const rows = await this.client.query(api.hackathon.listTeamMilestones, {
      teamId: teamId as Id<'hackathonTeams'>,
    });
    return rows.map(withId) as HackathonMilestone[];
  }

  async createTeamMilestone(
    teamId: string,
    title: string,
    dueAt: string,
  ): Promise<HackathonMilestone> {
    const doc = await this.client.mutation(api.hackathon.createTeamMilestone, {
      teamId: teamId as Id<'hackathonTeams'>,
      title,
      dueAt,
    });
    return withId(doc) as HackathonMilestone;
  }

  async updateTeamMilestone(
    id: string,
    patch: Partial<HackathonMilestone>,
  ): Promise<HackathonMilestone> {
    const doc = await this.client.mutation(
      api.hackathon.updateTeamMilestone,
      defined({
        id: id as Id<'hackathonMilestones'>,
        title: patch.title,
        dueAt: patch.dueAt,
        status: patch.status,
      }),
    );
    return withId(doc) as HackathonMilestone;
  }

  async submit(
    hackathonId: string,
    input: { title: string; description: string; link?: string },
  ): Promise<HackathonSubmission> {
    const doc = await this.client.mutation(
      api.hackathon.submit,
      defined({ hackathonId, ...input }),
    );
    return withId(doc) as HackathonSubmission;
  }

  async listSubmissions(hackathonId: string): Promise<HackathonSubmission[]> {
    const rows = await this.client.query(api.hackathon.listSubmissions, {
      hackathonId,
    });
    return rows.map(withId) as HackathonSubmission[];
  }

  // ---------- Billing ----------

  async getSubscription(): Promise<Subscription> {
    const sub = await this.client.query(api.billing.get, {});
    if ('_id' in sub) return withId(sub) as Subscription;
    return sub as Subscription;
  }

  async subscribe(plan: 'pro' | 'org'): Promise<Subscription> {
    const doc = await this.client.mutation(api.billing.subscribe, { plan });
    return withId(doc) as Subscription;
  }

  async cancelSubscription(): Promise<Subscription> {
    const doc = await this.client.mutation(api.billing.cancel, {});
    return withId(doc) as Subscription;
  }

  // ---------- Campus ----------

  async getMetrics(
    orgId: string,
    period: string,
  ): Promise<CampusAggregateMetric | null> {
    const doc = await this.client.query(api.campus.getMetrics, {
      orgId,
      period,
    });
    return (doc as CampusAggregateMetric | null) ?? null;
  }

  // ---------- Demo helpers ----------

  async resetDemoData(): Promise<void> {
    await this.client.mutation(api.profile.reset, {});
  }
}

export type { WithSystem };

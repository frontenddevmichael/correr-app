import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import type { CoachContext } from "../src/ai/aiProvider";
import type { GeneratedRoadmap, Vision } from "../src/core/domain";
import { LIMITS } from "../src/core/validation";
import {
  enforceRateLimit,
  nowIso,
  requireUserId,
  todayKeyForUser,
} from "./lib";
import {
  OpenRouterAi,
  openRouterHealthCheck,
  openRouterRoadmapHealthCheck,
} from "./openrouter";

const kindArg = v.union(
  v.literal("coach"),
  v.literal("discovery"),
  v.literal("recovery"),
  v.literal("weekly_review"),
  v.literal("roadmap"),
);

// ---------- Conversations ----------

export const listConversations = query({
  args: { kind: v.optional(kindArg) },
  handler: async (ctx, { kind }) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((c) => !kind || c.kind === kind)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
});

export const createConversation = mutation({
  args: { kind: kindArg, visionId: v.optional(v.id("visions")) },
  handler: async (ctx, { kind, visionId }) => {
    const userId = await requireUserId(ctx);
    const ts = nowIso();
    const id = await ctx.db.insert("conversations", {
      userId,
      visionId,
      kind,
      title: kind === "coach" ? "AI Coach" : "Conversation",
      createdAt: ts,
      updatedAt: ts,
    });
    return (await ctx.db.get(id))!;
  },
});

export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUserId(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo || convo.userId !== userId) return [];
    const rows = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUserId(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo || convo.userId !== userId) return;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .collect();
    for (const message of messages) await ctx.db.delete(message._id);
    await ctx.db.delete(conversationId);
  },
});

// ---------- Chat (runs in an action: needs vision + streak context) ----------

export const loadChatContext = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const userId = await requireUserId(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo || convo.userId !== userId) return null;
    const visionDoc = convo.visionId
      ? await ctx.db.get(convo.visionId as Id<"visions">)
      : null;
    const day = await todayKeyForUser(ctx, userId);
    const commitments = await ctx.db
      .query("commitments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const streak = await ctx.db
      .query("streaks")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", conversationId),
      )
      .order("desc")
      .take(12);
    return {
      kind: convo.kind,
      tone: profile?.coachingTone,
      length: profile?.coachLength,
      userContext: profile?.coachContext,
      displayName: profile?.displayName,
      bio: profile?.bio,
      focusAreas: profile?.focusAreas,
      vision: visionDoc,
      todayCommitments: commitments.filter(
        (c) => c.dueAt.slice(0, 10) === day && c.state !== "cancelled",
      ),
      streak,
      history: recentMessages
        .reverse()
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    };
  },
});

export const persistExchange = internalMutation({
  args: {
    conversationId: v.id("conversations"),
    userContent: v.string(),
    assistantContent: v.string(),
  },
  handler: async (ctx, { conversationId, userContent, assistantContent }) => {
    const userId = await requireUserId(ctx);
    const convo = await ctx.db.get(conversationId);
    if (!convo || convo.userId !== userId) {
      throw new Error("Conversation not found");
    }
    const ts = nowIso();
    await ctx.db.insert("messages", {
      conversationId,
      userId,
      role: "user",
      content: userContent,
      createdAt: ts,
    });
    const assistantId = await ctx.db.insert("messages", {
      conversationId,
      userId,
      role: "assistant",
      content: assistantContent,
      createdAt: ts,
    });
    await ctx.db.patch(conversationId, { updatedAt: ts });
    return (await ctx.db.get(assistantId))!;
  },
});

export const checkAiRateLimit = internalMutation({
  args: {
    action: v.union(v.literal("message"), v.literal("roadmap")),
  },
  handler: async (ctx, { action }) => {
    const userId = await requireUserId(ctx);
    if (action === "message") {
      await enforceRateLimit(ctx, userId, "ai_message", 20, 60_000);
      return;
    }
    await enforceRateLimit(ctx, userId, "ai_roadmap", 10, 60 * 60_000);
  },
});

export const sendMessage = action({
  args: { conversationId: v.id("conversations"), content: v.string() },
  handler: async (
    ctx,
    { conversationId, content },
  ): Promise<Doc<"messages">> => {
    const message = content.trim();
    if (!message) throw new Error("Write a message first.");
    if (message.length > LIMITS.message) {
      throw new Error("That message is too long.");
    }
    await ctx.runMutation(internal.ai.checkAiRateLimit, {
      action: "message",
    });
    const loaded = await ctx.runQuery(internal.ai.loadChatContext, {
      conversationId,
    });
    if (!loaded) throw new Error("Conversation not found");
    const coachCtx: CoachContext = {
      kind: loaded.kind,
      userMessage: message,
      tone: loaded.tone,
      length: loaded.length,
      userContext: loaded.userContext,
      displayName: loaded.displayName,
      bio: loaded.bio,
      focusAreas: loaded.focusAreas,
      vision: loaded.vision
        ? ({ ...loaded.vision, id: loaded.vision._id } as Vision)
        : undefined,
      todayCommitments: loaded.todayCommitments.map((c) => {
        const { _id, _creationTime, ...rest } = c;
        void _creationTime;
        return { id: _id, ...rest };
      }),
      streak: loaded.streak
        ? {
            userId: loaded.streak.userId,
            commitmentStreak: loaded.streak.commitmentStreak,
            partnershipStreak: loaded.streak.partnershipStreak,
            lastActiveDay: loaded.streak.lastActiveDay,
            bestStreak: loaded.streak.bestStreak,
          }
        : undefined,
      history: loaded.history,
    };
    const ai = new OpenRouterAi();
    const reply = await ai.chat(coachCtx);
    return await ctx.runMutation(internal.ai.persistExchange, {
      conversationId,
      userContent: content,
      assistantContent: reply,
    });
  },
});

// ---------- Insights ----------

export const listInsights = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const rows = await ctx.db
      .query("insights")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows
      .filter((i) => !i.dismissedAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
});

export const dismissInsight = mutation({
  args: { id: v.id("insights") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const doc = await ctx.db.get(id);
    if (!doc || doc.userId !== userId) return;
    await ctx.db.patch(id, { dismissedAt: nowIso() });
  },
});

// ---------- Plan adjustment (AI action) ----------

export const loadForAdjustment = internalQuery({
  args: { visionId: v.id("visions") },
  handler: async (ctx, { visionId }) => {
    const userId = await requireUserId(ctx);
    const vision = await ctx.db.get(visionId);
    if (!vision || vision.userId !== userId) return null;
    const discovery = await ctx.db
      .query("discoveries")
      .withIndex("by_vision", (q) => q.eq("visionId", visionId))
      .first();
    return { vision, discovery };
  },
});

export const requestPlanAdjustment = action({
  args: { visionId: v.id("visions"), message: v.string() },
  handler: async (
    ctx: ActionCtx,
    { visionId, message },
  ): Promise<GeneratedRoadmap> => {
    const adjustment = message.trim();
    if (!adjustment) throw new Error("Describe the change you want first.");
    if (adjustment.length > LIMITS.longText) {
      throw new Error("That adjustment request is too long.");
    }
    await ctx.runMutation(internal.ai.checkAiRateLimit, {
      action: "roadmap",
    });
    const loaded = await ctx.runQuery(internal.ai.loadForAdjustment, {
      visionId,
    });
    if (!loaded) throw new Error("Vision not found");
    const ai = new OpenRouterAi();
    return await ai.generateRoadmap(
      { ...loaded.vision, id: loaded.vision._id } as Vision,
      loaded.discovery
        ? { ...loaded.discovery, id: loaded.discovery._id }
        : null,
      adjustment,
    );
  },
});

// ---------- Internal diagnostics ----------

export const openRouterHealth = internalAction({
  args: {},
  handler: async () => await openRouterHealthCheck(),
});

export const openRouterRoadmapHealth = internalAction({
  args: {},
  handler: async () => await openRouterRoadmapHealthCheck(),
});

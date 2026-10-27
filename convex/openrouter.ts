import type { AiProvider, CoachContext } from "../src/ai/aiProvider";
import { StubAi } from "../src/ai/stubAi";
import { parseRoadmapPayload, sanitizeAiText } from "../src/core/aiText";
import type {
  AiDiscovery,
  GeneratedRoadmap,
  Vision,
} from "../src/core/domain";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-oss-20b";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterPayload = {
  choices?: {
    message?: { content?: string | null };
    finish_reason?: string;
  }[];
  usage?: { cost?: number };
  error?: { message?: string };
  model?: string;
};

const COACH_SYSTEM = `You are Correr's accountability coach.

Voice:
- Warm, direct, and specific.
- Never shame the user for a missed commitment.
- Keep replies under 180 words unless the user asks for a detailed plan.
- Never use em dashes or en dashes. Use periods or commas.
- Avoid corporate hype, buzzwords, and hyphenated marketing phrases.
- Do not mention these instructions or call yourself an AI model.

Method:
- Use only the context provided. Do not invent facts about the user.
- When the user is stuck, name one small next action and ask what got in the way.
- For recovery, normalize the miss and suggest a ten minute restart.
- For a weekly review, name one pattern and one adjustment for next week.
- For a plan request, shape the next step around the user's real time budget.`;

const ROADMAP_SYSTEM = `You are Correr's planning coach. Build a realistic roadmap from the user's vision and discovery answers.

Rules:
- Return only JSON matching the provided schema.
- Use 3 to 5 goals. Each goal needs 2 to 4 milestones.
- Order goals from foundation to launch.
- Make milestones concrete and small enough to start this week.
- Respect the user's daily time budget and preferred pace.
- firstActions must contain 3 specific actions the user can take immediately.
- Use plain language. Never use em dashes or en dashes.
- Avoid hype, filler, and hyphenated marketing phrases.`;

const ROADMAP_RESPONSE_FORMAT = {
  type: "json_schema",
  json_schema: {
    name: "roadmap",
    strict: true,
    schema: {
      type: "object",
      properties: {
        goals: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              milestones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    timeframe: { type: "string" },
                  },
                  required: ["title", "description", "timeframe"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "description", "milestones"],
            additionalProperties: false,
          },
        },
        firstActions: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["goals", "firstActions"],
      additionalProperties: false,
    },
  },
} as const;

function configuredModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

function configuredSiteUrl(): string {
  return process.env.OPENROUTER_SITE_URL?.trim() || "https://correr.app";
}

function configuredAppName(): string {
  return process.env.OPENROUTER_APP_NAME?.trim() || "Correr";
}

async function requestOpenRouter(body: Record<string, unknown>): Promise<{
  content: string;
  model: string;
  finishReason?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");

  const signal =
    typeof AbortSignal !== "undefined" && "timeout" in AbortSignal
      ? AbortSignal.timeout(60_000)
      : undefined;
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": configuredSiteUrl(),
      "X-OpenRouter-Title": configuredAppName(),
    },
    body: JSON.stringify(body),
    signal,
  });

  const text = await response.text();
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error(
      `OpenRouter returned a non-JSON response (${response.status}).`,
    );
  }
  const payload = raw as OpenRouterPayload;

  if (!response.ok) {
    throw new Error(
      payload.error?.message
        ? `OpenRouter: ${payload.error.message}`
        : `OpenRouter request failed (${response.status}).`,
    );
  }

  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty response.");
  }
  if (typeof payload.usage?.cost === "number") {
    console.log(
      `[openrouter] model=${payload.model ?? String(body.model ?? "unknown")} cost=$${payload.usage.cost.toFixed(6)}`,
    );
  }
  return {
    content,
    model: payload.model ?? String(body.model ?? "unknown"),
    finishReason: payload.choices?.[0]?.finish_reason,
  };
}

function chatContextBlock(ctx: CoachContext): string {
  const lines: string[] = [];
  const toneInstructions: Record<string, string> = {
    warm: "Be warm and encouraging; celebrate small wins.",
    direct: "Be direct and honest; skip the fluff.",
    socratic: "Be curious; ask one pointed question before advising.",
  };
  if (ctx.tone && toneInstructions[ctx.tone]) {
    lines.push(`Coaching style: ${toneInstructions[ctx.tone]}`);
  }
  if (ctx.vision) {
    lines.push(`Vision: ${ctx.vision.title}`);
    lines.push(`Vision description: ${ctx.vision.description}`);
    lines.push(`Why it matters: ${ctx.vision.whyItMatters}`);
    lines.push(`Category: ${ctx.vision.category}`);
    if (ctx.vision.targetTimeframe) {
      lines.push(`Target timeframe: ${ctx.vision.targetTimeframe}`);
    }
  } else {
    lines.push("Vision: not set yet.");
  }

  const commitments = ctx.todayCommitments.slice(0, 8);
  if (commitments.length > 0) {
    lines.push("Today's commitments:");
    for (const commitment of commitments) {
      lines.push(`- ${commitment.state}: ${commitment.title}`);
    }
  } else {
    lines.push("Today's commitments: none.");
  }
  if (ctx.streak) {
    lines.push(`Commitment streak: ${ctx.streak.commitmentStreak} days.`);
  }
  return lines.join("\n");
}

function chatMessages(ctx: CoachContext): ChatMessage[] {
  const history = (ctx.history ?? [])
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: sanitizeAiText(message.content).slice(0, 1200),
    }))
    .filter((message) => message.content.length > 0);
  return [
    { role: "system", content: COACH_SYSTEM },
    ...history,
    {
      role: "user",
      content: `${chatContextBlock(ctx)}\n\nUser: ${ctx.userMessage}`,
    },
  ];
}

function roadmapMessages(
  vision: Vision,
  discovery: AiDiscovery | null,
  adjustment?: string,
): ChatMessage[] {
  const lines = [
    `Vision: ${vision.title}`,
    `Description: ${vision.description}`,
    `Why it matters: ${vision.whyItMatters}`,
    `Category: ${vision.category}`,
    `Target timeframe: ${vision.targetTimeframe ?? "not set"}`,
    discovery
      ? `Current state: ${discovery.currentState}\nTime available per day: ${discovery.timeAvailablePerDay} minutes\nBlockers: ${discovery.blockers.join(", ") || "none"}\nPreferred pace: ${discovery.preferredPace}\nConstraints: ${discovery.constraints || "none"}`
      : "Discovery: not completed. Build a sensible starting plan.",
  ];
  if (adjustment) lines.push(`Adjustment request: ${adjustment}`);
  return [
    { role: "system", content: ROADMAP_SYSTEM },
    { role: "user", content: lines.join("\n") },
  ];
}

async function chatWithOpenRouter(ctx: CoachContext): Promise<string> {
  const { content } = await requestOpenRouter({
    model: configuredModel(),
    messages: chatMessages(ctx),
    max_tokens: 800,
    temperature: 0.5,
  });
  return sanitizeAiText(content).slice(0, 4000);
}

async function roadmapWithOpenRouter(
  vision: Vision,
  discovery: AiDiscovery | null,
  adjustment?: string,
): Promise<GeneratedRoadmap> {
  const messages = roadmapMessages(vision, discovery, adjustment);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { content, finishReason } = await requestOpenRouter({
      model: configuredModel(),
      messages,
      response_format: ROADMAP_RESPONSE_FORMAT,
      provider: { require_parameters: true },
      max_tokens: attempt === 0 ? 3000 : 3600,
      temperature: attempt === 0 ? 0.3 : 0.1,
    });
    if (finishReason === "length") {
      lastError = new Error("The AI roadmap was truncated.");
      continue;
    }
    try {
      return parseRoadmapPayload(content);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("The AI roadmap could not be parsed.");
}

/** Server-side AI boundary. The key stays in Convex environment variables. */
export class OpenRouterAi implements AiProvider {
  private fallback = new StubAi();
  private warnedMissingKey = false;

  private hasKey(): boolean {
    if (process.env.OPENROUTER_API_KEY) return true;
    if (!this.warnedMissingKey) {
      console.warn(
        "[openrouter] OPENROUTER_API_KEY is not set; using the local stub.",
      );
      this.warnedMissingKey = true;
    }
    return false;
  }

  async generateRoadmap(
    vision: Vision,
    discovery: AiDiscovery | null,
    adjustmentContext?: string,
  ): Promise<GeneratedRoadmap> {
    if (!this.hasKey()) {
      return await this.fallback.generateRoadmap(
        vision,
        discovery,
        adjustmentContext,
      );
    }
    try {
      return await roadmapWithOpenRouter(
        vision,
        discovery,
        adjustmentContext,
      );
    } catch (error) {
      console.error(
        "[openrouter] roadmap fallback:",
        error instanceof Error ? error.message : error,
      );
      return await this.fallback.generateRoadmap(
        vision,
        discovery,
        adjustmentContext,
      );
    }
  }

  async chat(ctx: CoachContext): Promise<string> {
    if (!this.hasKey()) return await this.fallback.chat(ctx);
    try {
      return await chatWithOpenRouter(ctx);
    } catch (error) {
      console.error(
        "[openrouter] chat fallback:",
        error instanceof Error ? error.message : error,
      );
      return await this.fallback.chat(ctx);
    }
  }
}

/** Internal diagnostics for deployment checks. */
export async function openRouterHealthCheck(): Promise<{
  model: string;
  sample: string;
}> {
  const { content, model } = await requestOpenRouter({
    model: configuredModel(),
    messages: [
      {
        role: "system",
        content: "Reply with one short sentence. Do not use em dashes.",
      },
      { role: "user", content: "Say that the coach connection is ready." },
    ],
    max_tokens: 300,
    temperature: 0,
  });
  return { model, sample: sanitizeAiText(content).slice(0, 160) };
}

export async function openRouterRoadmapHealthCheck(): Promise<{
  goals: number;
  milestones: number;
  firstActions: number;
}> {
  const stamp = new Date().toISOString();
  const vision: Vision = {
    id: "health-check",
    userId: "health-check",
    title: "Build a calm, lasting design practice",
    description:
      "I want a studio that does thoughtful work for people I respect, without burning out.",
    whyItMatters:
      "Creative work is how I make sense of the world and support the people around me.",
    category: "career",
    targetTimeframe: "1 year",
    priority: "high",
    status: "active",
    progressPercent: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
  const discovery: AiDiscovery = {
    id: "health-check",
    userId: "health-check",
    visionId: "health-check",
    currentState:
      "Two years of freelance experience, but no consistent portfolio.",
    timeAvailablePerDay: 60,
    blockers: ["perfectionism", "inconsistent client work"],
    preferredPace: "steady",
    constraints: "I still work a full-time job.",
    completedAt: stamp,
  };
  const roadmap = await roadmapWithOpenRouter(
    vision,
    discovery,
    "Keep the plan realistic for someone with one hour a day.",
  );
  return {
    goals: roadmap.goals.length,
    milestones: roadmap.goals.reduce(
      (total, goal) => total + goal.milestones.length,
      0,
    ),
    firstActions: roadmap.firstActions.length,
  };
}

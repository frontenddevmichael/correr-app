import { ConvexHttpClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

/**
 * `waitlist.join` lives in the app repo (`convex/waitlist.ts`) and is deployed
 * with the same Convex project the app uses. The reference is written as a
 * string so this site never imports generated server types across projects.
 */
const JOIN = "waitlist:join" as unknown as FunctionReference<"mutation">;

const FALLBACK = "We couldn't add you just now. Check your connection and try again.";

let client: ConvexHttpClient | null = null;

function getClient(): ConvexHttpClient {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("The waitlist isn't connected yet. Try again shortly.");
  }
  client ??= new ConvexHttpClient(url);
  return client;
}

/** ConvexError carries `data`; anything else is a transport failure. */
function friendlyMessage(error: unknown): string {
  const data = (error as { data?: unknown } | null)?.data;
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return FALLBACK;
}

/**
 * Server-side validation is authoritative; this only forwards the address and
 * turns a raw Convex error into copy a person can act on.
 */
export async function joinWaitlist(email: string): Promise<void> {
  const convex = getClient();

  try {
    await convex.mutation(JOIN, { email, source: "web" });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("waitlist.join failed", error);
    }
    throw new Error(friendlyMessage(error));
  }
}

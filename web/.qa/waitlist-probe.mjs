// QA probe: time the waitlist mutation through the same client the site uses.
import { ConvexHttpClient } from "convex/browser";
import { readFileSync } from "node:fs";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
const url = env.match(/NEXT_PUBLIC_CONVEX_URL=(.+)/)?.[1]?.trim();
if (!url) throw new Error("no NEXT_PUBLIC_CONVEX_URL");
console.log("deployment:", url.replace(/^https:\/\/([^.]+)\..*/, "$1"));

const client = new ConvexHttpClient(url);
const email = "qa.probe.2026@example.com";

const t0 = Date.now();
try {
  const res = await client.mutation("waitlist:join", { email, source: "web" });
  console.log("ok", res, `${Date.now() - t0}ms`);
} catch (error) {
  console.log("error", `${Date.now() - t0}ms`, error?.message, error?.data);
  const data = error?.data;
  if (data && typeof data === "object" && "message" in data) console.log("friendly:", data.message);
}

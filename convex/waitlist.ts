import { ConvexError, v } from "convex/values";

import { mutation, internalMutation } from "./_generated/server";

/**
 * Marketing waitlist.
 *
 * Contract mirrors `src/core/validation.ts` exactly:
 * - `sanitizeEmail` strips whitespace and caps at `LIMITS.email` (254);
 * - `isEmail` trims, then requires `something@something.tld` with a 2+ char TLD.
 *
 * Convex has no unique constraint, so uniqueness is enforced inside the
 * mutation: Convex serialises mutations, which makes this read-then-insert
 * atomic. A duplicate address returns the same `{ ok: true }` as a new one —
 * the site must not reveal whether an email is already on the list.
 */

const EMAIL_MAX = 254;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const join = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  returns: v.object({ ok: v.boolean() }),
  handler: async (ctx, { email, source }) => {
    // sanitizeEmail
    const cleaned = email.replace(/\s+/g, "").slice(0, EMAIL_MAX).trim();

    // isEmail
    if (!cleaned || cleaned.length > EMAIL_MAX || !EMAIL_RE.test(cleaned)) {
      throw new ConvexError({
        code: "INVALID_EMAIL",
        message: "Enter a valid email, like name@example.com.",
      });
    }

    const emailLower = cleaned.toLowerCase();

    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email_lower", (q) => q.eq("emailLower", emailLower))
      .unique();

    // Same success state for duplicates: never confirm an address is on the list.
    if (existing) return { ok: true };

    await ctx.db.insert("waitlist", {
      email: cleaned,
      emailLower,
      source: source ?? "web",
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Erasure. Internal only: run by an operator when someone asks to be removed,
 * never exposed to the site.
 */
export const remove = internalMutation({
  args: { email: v.string() },
  returns: v.object({ removed: v.number() }),
  handler: async (ctx, { email }) => {
    const emailLower = email.replace(/\s+/g, "").trim().toLowerCase();
    const rows = await ctx.db
      .query("waitlist")
      .withIndex("by_email_lower", (q) => q.eq("emailLower", emailLower))
      .collect();

    for (const row of rows) {
      await ctx.db.delete(row._id);
    }

    return { removed: rows.length };
  },
});

/**
 * One place for the things a deploy needs to set. Anything here can be
 * overridden with a public env var; the defaults are the production values.
 */
export const SITE = {
  name: "Correr",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://correr.app").replace(/\/$/, ""),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@correr.app",
  title: "Correr — small promises, kept daily",
  description:
    "One clear vision. A roadmap built around your life. One promise a day — and a record that you kept it. Join the waitlist.",
  tagline: "Small promises, kept daily.",
} as const;

Current plan — onboarding rework, account redesign, customization, production hardening
------------------------------------------------------------------------

This is the working plan for the repo right now. Do not start work outside this
file's scope without an explicit new plan.

1. Audit — already done. Onboarding is: welcome slides -> signup -> onboarding
   profile setup -> index gate. Stack is Expo + expo-router + Convex with a mock
   kill-switch. Main risk is a short onboarding funnel that has no wizard and no
   consent capture, plus a generic account screen that does not match the account
   ref image, plus very little customization surface. Empty states exist but are
   generic and could be more guided.

2. Seed data wizard — not started. Will be a short post-signup wizard triggered
   right after signup, one question per screen, progress indicator, skip at every
   step and as a whole, resume from settings or a dismissible home prompt,
   persisted mid-wizard, rebuilt to the reference layout but using the app's own
   theme tokens. References live in ~/Downloads/wizard ref.zip (extracted to
   Downloads/_wizard_extract).

3. AI flow test — partially wired. OpenRouter route exists in Convex at
   convex/openrouter.ts and convex/ai.ts. The key is never client-side. Rate
   limiting exists via enforceRateLimit. Fallback to StubAi exists. Missing: a
   concrete end-to-end test run with the real key, explicit timeout/retry/error
   UI mapping in the coach screen, and confirmation that the key is stored only
   as a Convex server env var. The key value itself must come from the user, not
   from this repo. This repo's run of the flow is informational only.

4. Account screen redesign — not started. More tab currently shows three-card
   profile + appearance chips + explore tiles + notifications + sign out.
   Target is the account ref image at ~/Downloads/account ref.jpg: header with
   name + rating pill + circular avatar placeholder, three quick-action cards,
   privacy checkup banner, vertical list (Settings, Messages, business profile,
   manage account, Legal), and a bottom nav with Account highlighted. Rebuild in
   the app's visual language using tokens, not a literal copy of the image's
   hardcoded colors. Use the same underlying screens/routes where they exist;
   only the surface changes.

5. Customization system — not started. Dark mode must be true black with elevated
   near-black surface steps and checked contrast. Settings > Appearance needs
   live theme, accent, text scale/weight/line spacing, corner radius, density,
   reduce motion / animation level, haptics with intensity and per-event options
   (gated by platform and OS settings), sounds if any exist, home layout / default
   landing tab, accessibility high contrast and larger tap targets, and whatever
   else is sensible. Persist locally and sync to the account if one exists.

6. Bug sweep — targeted only. Focus on broken flows, loading/empty/error states,
   type and console errors, dead code, races, responsive and accessibility issues,
   and obvious leaks. The repo currently has good cancelation patterns on data
   loads; watch for any effect that starts timers or subscriptions without cleanup
   and for any list that can render a dangerous number of rows.

7. Production readiness — not started. Confirm secrets stay out of client bundles
   and .env* stays git-ignored, add input validation parity with the existing
   LIMITS helpers, confirm every private route checks auth and scopes by user, add
   secure headers/CSP/CORS notes for any web surface, dependency audit notes,
   bundle and image notes, error boundaries and an error monitoring hook, env
   validation at startup, meta/favicon/404/500 notes, and draft legal pages marked
   for lawyer review: Privacy, Terms, cookie/consent, account deletion, data export,
   AI disclosure for OpenRouter, and a dependency/font/asset license check.

8. Tests — only after 1-7. Write tests for critical paths: onboarding wizard
   persistence and skip/resume, auth gate transitions, AI route error/timeout
   behavior client-side, empty-state rendering, theme switching, and haptics
   gating. Do not block the rest of the work on this step.

Explicit out of scope unless asked again
- building the real OpenRouter key into the repo or the client bundle
- rewriting the rest of the app to a different framework
- shipping a new backend or a different auth provider just to match a ref image

Status notes
- The wizard and account ref images are accessible.
- The AppleWebData CA text needed for the local WKWebView dev-certificate trust
  test is in src/design-system/AppleWebdataCa.ts.
- The OpenRouter key is intentionally absent from this repo. When the user sets
  it as a Convex server env var, the server will use it; the client will never see
  it.

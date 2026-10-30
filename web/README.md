# Correr — waitlist site

Marketing page for Correr, the daily-promise app. One page, static, no CMS.

- **Stack** — Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, `next/font`.
- **Motion** — Motion (`motion/react`) for the load sequence, scroll reveals and
  the check-in card; Lenis for smooth scroll. Nothing else.
- **Data** — one Convex mutation, `waitlist.join`.

The design rationale, tokens, wireframes and the review of what was changed
live in [`DESIGN-PLAN.md`](./DESIGN-PLAN.md).

## Run

```bash
npm install
cp .env.example .env.local   # then paste your deployment URL
npm run dev                  # http://localhost:3000
```

```bash
npx tsc --noEmit
npx eslint .
npm run build && npx next start
```

## Environment

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | yes | Client URL of the Convex deployment, e.g. `https://your-deployment.convex.cloud`. Public by design. |

The form posts with `ConvexHttpClient`, so no server route and no secret key.
If the variable is missing the page renders fine and the submit fails with the
inline error state.

## Backend

`convex/waitlist.ts` in the repo root, deployed with `npx convex dev`.

- `waitlist.join({ email, source? })` — public mutation.
  Normalises with the same `sanitizeEmail` / `isEmail` rules as
  `src/core/validation.ts` and `VALIDATION_COPY.email`, so the client and
  server reject with identical copy.
- Uniqueness is a read-then-insert inside the mutation (Convex serialises
  mutations) backed by the `by_email_lower` index. A duplicate returns the same
  `{ ok: true }` as a first insert — the page never reveals whether an address
  was already on the list.
- `waitlist.remove({ email })` — internal only, for erasure requests.

## Screenshots

The phone frames use real captures of the app (`public/screens/*.png`, 390×844
at 2×), taken from Expo web against the mock backend. Nothing is drawn or
mocked up in the frame.

`review/` holds the 375 / 768 / 1440 captures in light and dark. It is
gitignored; regenerate by pointing any full-page screenshot tool at the page.

## Accessibility

- Theme is set before paint by an inline script; the toggle mirrors the `<html>`
  class with `useSyncExternalStore`, so there is no flash and no hydration
  mismatch. Stored in `localStorage` under `correr.web.theme`.
- `prefers-reduced-motion` disables Lenis, the word reveal, the stagger and the
  product pin (which becomes a plain stacked list).
- Focus is a 2px ink ring at 3px offset on every interactive element.
- Captions and ordinals use `--text-muted`, which is ≥ 4.5:1 on the canvas in
  both schemes.

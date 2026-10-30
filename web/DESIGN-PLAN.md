# Correr waitlist — design plan

Written before any code. Reviewed against `WAITLIST-BRIEF.md` and `REDESIGN-SPEC.md`;
the revisions are listed at the end.

---

## 1. The idea

A waitlist page is usually a brochure. This one is a **ledger page**: one
sentence at a time, set in ink on warm paper, with the product itself as the
only object on screen. No feature grid, no logo cloud, no proof we cannot
honestly show.

The page makes three claims, each backed by something that exists in the app:

1. **One promise a day** — the daily commitment loop.
2. **Missing is survivable** — recovery earns the same 10 XP as completion.
3. **Private by default** — partner sharing is opt-in per surface; AI
   conversations are never shared.

Everything else is removed.

---

## 2. Tokens

Mirrored from `src/design-system/tokens.ts`. Raw palette values only; components
consume the semantic names on the left.

### Light — "paper"

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#F6F3ED` | page background |
| `--surface` | `#FFFCF7` | raised fields, phone screen backing |
| `--sunken` | `#EFEAE1` | inset wells, input rest state |
| `--ink` | `#171410` | primary text, buttons, rules at 100% |
| `--ink-soft` | `#2E2A24` | pressed states |
| `--text-secondary` | `#5C554B` | supporting copy |
| `--text-muted` | `#6E665B` | captions, ordinals (4.9:1 on canvas) |
| `--border` | `#E6DFD4` | hairlines |
| `--border-strong` | `#D6CCBE` | input borders, focus track |
| `--focus` | `#171410` | 2px ring, 2px offset |

### Dark — "night"

| Token | Hex | Use |
|---|---|---|
| `--canvas` | `#0D0C0A` | page background |
| `--surface` | `#171512` | raised fields |
| `--sunken` | `#201D19` | inset wells |
| `--ink` | `#F4F1EB` | primary text (inverts to paper) |
| `--text-secondary` | `#ABA39A` | supporting copy |
| `--text-muted` | `#91897E` | captions (4.6:1 on canvas) |
| `--border` | `#2A2620` | hairlines |
| `--border-strong` | `#3A342C` | input borders |

### Ink section — fixed in both schemes

The one full-bleed dark section does **not** follow the theme. It is the app's
check-in card: ink `#171410` at full bleed, text `#F4F1EB`, muted `#91897E`,
hairline `#3A342C`, paper-on-ink button `#F4F1EB` with ink label. Same in light
and dark, exactly like the product.

### Rules

- No hue anywhere. Status is weight, fill, strike-through and copy.
- Hairline = `1px` at `--border`; never a shadow to separate two paper surfaces.
- Radii: `2px` (rules), `14px` (inputs), `9999px` (buttons, chips), `54px`
  (phone frame). Three values, used consistently.
- Grain: inline SVG `feTurbulence`, `3.5%` on paper, `2.5%` on ink, fixed,
  `pointer-events: none`, `mix-blend-mode: multiply` (paper) / `screen` (ink).

---

## 3. Type

Two families, loaded as files, never synthetically weighted.
Poppins 400/500/600 · Inter 400/500/600.

| Name | Size (clamp) | Line | Tracking | Face |
|---|---|---|---|---|
| `display-xl` | `clamp(3.5rem, 10.2vw, 9.5rem)` | 0.92 | -0.03em | Poppins 600 |
| `display-xl-soft` | same | 0.92 | -0.03em | Poppins 400 |
| `display-l` | `clamp(2.5rem, 6.4vw, 6rem)` | 0.98 | -0.03em | Poppins 600 |
| `statement` | `clamp(2rem, 5.4vw, 4.5rem)` | 1.06 | -0.02em | Poppins 500 |
| `heading` | `clamp(1.75rem, 3.2vw, 2.75rem)` | 1.08 | -0.02em | Poppins 600 |
| `lead` | `clamp(1.0625rem, 1.35vw, 1.25rem)` | 1.55 | -0.005em | Inter 400 |
| `body` | `1rem` | 1.6 | 0 | Inter 400 |
| `caption` | `0.875rem` | 1.5 | 0 | Inter 500 |
| `micro` | `0.75rem` | 1.4 | 0.01em | Inter 500 |

- Hero is a **split**: 600 ink line over 400 muted line. Never two bold lines.
- Numerals: `font-variant-numeric: tabular-nums` everywhere a number appears
  (ordinals, footer year, XP in the check-in card).
- No uppercase eyebrows. Section labels are lowercase `micro` in
  `--text-muted`, sitting on a hairline with a tabular ordinal.
- Measure capped at `62ch` for body, `18ch` for display.

---

## 4. Grid & rhythm

- 12 columns, `max-width: 1240px`, gutters `24px` (mobile) / `32px` (desktop),
  page margin `20px` / `40px` / `64px`.
- Vertical rhythm in `8px` steps; section padding `clamp(96px, 14vh, 168px)`.
- One hairline rule between sections, full content width, never a card.
- The left margin carries ordinals `01–04` for the product sequence only.
- Everything is left-aligned except the statement and the ink card.

---

## 5. Wireframes

### 5.1 Hero — `min-height: 100svh`

```
┌────────────────────────────────────────────────────────────────────┐
│  ◉  CORRER                                   waitlist    ◐ light   │
│                                                                    │
│                                                                    │
│   Small promises,                          ╭───────────────╮       │
│   kept daily.                              │               │       │
│                                            │               │       │
│   One clear vision. A roadmap built        │   phone       │       │
│   around your life. One promise a day.     │   Home screen │       │
│                                            │   (rises in)  │       │
│   ┌──────────────────────────┐ ┌────────┐  │               │       │
│   │ you@example.com          │ │  Join  │  │               │       │
│   └──────────────────────────┘ └────────┘  ╰───────────────╯       │
│   No account yet. One email when it's ready.        ↓ cropped      │
└────────────────────────────────────────────────────────────────────┘
```

- Headline occupies cols 1–7; phone cols 8–12, translated `+18%` below the fold
  on load, settling to `0` over 900ms.
- Phone is cropped by the viewport bottom — it rises *into* the page, not sits in it.
- One form, one button. No secondary CTA, no "learn more" scroll hint with an arrow.

### 5.2 Statement — `min-height: 100svh`

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│                                                                    │
│      A private ledger                                              │
│      for the things                                                │
│      you said you'd do.                                            │
│                                                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- One sentence, three lines, `statement` scale, max `18ch`.
- Words rise individually with scroll progress; leading words at full ink,
  trailing words still muted until reached. No gradient, no blur.
- No label, no caption, no button. This screen is the pause.

### 5.3 Product — pinned, 4 beats

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   ╭───────────────╮    01 ─────────────────────────────            │
│   │               │    Vision                                      │
│   │    phone      │    Write the future you're running toward.     │
│   │    (sticky)   │    One vision, stated plainly.                 │
│   │               │                                                │
│   │               │    02 ─────────────────────────────            │
│   ╰───────────────╯    Promises                                    │
│                        Today's promises, in order.                 │
│                        Tick them off or move them.                 │
│                                                                    │
│                        (caption 3 and 4 below the fold,           │
│                         revealed as the screen swaps)              │
└────────────────────────────────────────────────────────────────────┘
```

- Phone is `position: sticky` for ~320vh; screens cross-fade at 0/33/66/100%.
- Captions sit in the right column, each with a hairline and a tabular ordinal.
- Active caption is ink; the others are `--text-muted`. No cards, no icons.
- Reduced motion: the four beats become a plain stacked list, phone static.

### 5.4 Ink section — full bleed

```
████████████████████████████████████████████████████████████████████
█                                                                  █
█   Missing isn't failing.                                         █
█   Coming back is the skill.                                      █
█                                                                  █
█        ┌────────────────────────────────────────────┐            █
█        │  Daily check-in                            │            █
█        │  How are you showing up?                   │            █
█        │                                            │            █
█        │  [ On track ]  [ Struggling ]  [ Blocked ] │            █
█        │                                            │            █
█        │  Recovery earns the same 10 XP.            │            █
█        └────────────────────────────────────────────┘            █
█                                                                  █
████████████████████████████████████████████████████████████████████
```

- The only interactive moment on the page: click a choice, it fills paper,
  the card resolves to a marked-complete state with the app's spring.
- Copy after selection: "Logged. Tomorrow is a new ledger."
- Grain at 2.5%, `screen`. Card is the app's own check-in card, rebuilt in CSS.

### 5.5 Circles — two columns, no cards

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  Accountability,                                                   │
│  without an audience.                                              │
│                                                                    │
│  ────────────────────────────────                                  │
│  Circles are rooms, not feeds.          A partner sees only        │
│  Public or private, joined by code.     what you choose.           │
│                                                                    │
│                                         Today's promises      ✓    │
│                                         ─────────────────────────  │
│                                         Completion history    ✓    │
│                                         ─────────────────────────  │
│                                         Streak and XP         ✓    │
│                                         ─────────────────────────  │
│                                         Weekly review         ✓    │
│                                         ─────────────────────────  │
│                                         AI conversations      —    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- Right column is a **ledger list**: hairline rows, no card, no icons, no ticks
  in circles. `✓` is text; the excluded row uses an em dash and muted ink.
- This is the only place the page uses two columns of unequal width (5 / 7).

### 5.6 Final CTA + footer

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│   Be early.                                                        │
│                                                                    │
│   ┌──────────────────────────┐ ┌────────┐                          │
│   │ you@example.com          │ │  Join  │                          │
│   └──────────────────────────┘ └────────┘                          │
│   No account yet. One email when it's ready.                       │
│                                                                    │
│  ────────────────────────────────────────────────────────────────  │
│  ◉ CORRER            Privacy   Terms   AI disclosure      © 2026   │
└────────────────────────────────────────────────────────────────────┘
```

- `display-l` scale, not `display-xl` — the hero keeps the loudest line.
- Footer is one row. No link columns, no social icons, no newsletter form.

---

## 6. Motion

Two libraries only: **Motion** (primary) and **Lenis** (smooth scroll).
No GSAP — `position: sticky` + `useScroll` handles the pin cleanly.

| Moment | Behaviour | Duration / easing |
|---|---|---|
| Load sequence | mark → line 1 → line 2 → lead → form → phone, `y: 20 → 0`, opacity `0 → 1`, stagger `90ms` | 800ms, `cubic-bezier(0.22, 1, 0.36, 1)` |
| Hero phone | scroll-linked `y: 0 → -6%`, `scale: 1 → 0.985` | tied to scroll, no spring |
| Statement | per-word opacity `0.16 → 1`, `y: 8 → 0` | tied to scroll |
| Product pin | screen cross-fade, caption ink/muted swap | 600ms cross-fade |
| Ink check-in | choice fill + checkmark draw, card settle | spring `stiffness 320, damping 30` |
| Form success | field collapses to a single line of copy, `height` auto | 500ms |

- Lenis: `lerp 0.08`, disabled under `prefers-reduced-motion`.
- Reduced motion: no stagger, no word reveal, no pin (stacked list), no spring
  (instant state change). Everything remains readable.
- Hover: links get an underline offset change and `--text-muted → --ink` over
  200ms. Buttons get `--ink → --ink-soft`. Nothing scales, nothing lifts.

---

## 7. Form & backend

- Field: `type="email"`, `inputMode="email"`, `autoComplete="email"`,
  `maxLength=254`, placeholder `you@example.com`, `aria-describedby` → hint +
  error, visible focus rule.
- Client validation mirrors `isEmail` + `sanitizeEmail` from
  `src/core/validation.ts`; error copy is `VALIDATION_COPY.email` verbatim:
  "Enter a valid email, like name@example.com."
- Submit calls Convex `waitlist.join`.
  - `emailLower = email.trim().toLowerCase()`.
  - Unique index `by_email_lower` on `emailLower`.
  - Re-check inside the mutation: read by index, return the same
    `{ ok: true }` for an existing row. Convex serialises mutations, so
    read-then-insert is atomic.
  - Server validation re-runs the same regex and 254 cap; rejects with a plain
    message the client already knows how to show.
- States: idle → submitting (button holds its width, label swaps to "Joining…")
  → success (form replaced by one line) → error (inline, same position as the
  field error). No toast.

---

## 8. Review against the brief — what I changed

I drafted each section, then cut anything that would survive a find-and-replace
into a generic SaaS template.

| Draft | Problem | Change |
|---|---|---|
| Three-up feature grid (Vision / Promises / Progress) | The exact "identical rounded card grid" the brief bans | Pinned phone with margin ordinals; no cards |
| Uppercase tracked eyebrow above every section | Explicitly banned | Lowercase `micro` label on a hairline, with tabular ordinal |
| Logo strip and "trusted by" row | Invents proof we don't have | Deleted entirely |
| Testimonial block | Invented social proof | Replaced by the interactive ink check-in — a real product moment |
| Stat row ("12,000 runners", "98% completion") | Invented numbers | Deleted; the only numbers on the page are product facts (10 XP) and the year |
| Gradient primary button with glow | Banned colour direction | Solid ink pill, hairline border, no glow |
| Centered hero | "Everything centered" is a tell | Asymmetric 7 / 5 split, left-aligned |
| 3D tilted phone on hover | Gimmick, and the brief prefers slow scroll-linked movement | Removed tilt; phone rises on load and drifts on scroll only |
| GSAP + ScrollTrigger for the pin | A third animation library for no gain | Motion + sticky only |
| Arrow `→` on both CTAs | Banned | Plain labels: "Join the waitlist" |
| Nav with Features / Pricing / Blog | Template furniture | Mark, one anchor, theme toggle |
| "Join 5,000 others already running" | Fabricated count | "No account yet. One email when it's ready." |

Two things I deliberately kept because they are product truth, not decoration:

- **Recovery earns 10 XP**, the same as completion (`XP_CONFIG` in
  `src/core/domain.ts`). It carries the ink section.
- **AI conversations are never shared with a partner**
  (`PartnershipSharing`). It is the last row of the ledger list.

---

## 9. Definition of done — checklist

- [x] Sections in brief order, one idea per screen
- [x] Tokens only; no library default styles survive
- [x] Two animation libraries: Motion + Lenis
- [x] Real app screenshots, light and dark, in CSS phone frames
- [x] `waitlist.join` with unique lower-cased email, server validation,
      duplicate → same success state
- [x] Focus visible, contrast ≥ 4.5:1, reduced motion honoured
- [x] Screenshots at 375 / 768 / 1440, light and dark (`web/review/`)
- [x] `tsc` + lint + `next build` clean; static export of `/`
- [ ] Lighthouse ≥ 90 mobile (not run — needs a deployed URL)
- [x] Written list of what still looks generic (section 10)

---

## 10. After the build — what the screenshots changed

I shot 375 / 768 / 1440 in light and dark, then fixed what read as a mistake
rather than a decision.

| What I saw | Why it was wrong | Fix |
|---|---|---|
| Statement wrapped by the browser into "…the / things you said you'd / do." | The rag is part of the composition; leaving it to the browser produced a stranded last line | Explicit three-line array in `Statement.tsx`, words still revealed individually |
| Statement was 68px at 1440 | Too quiet for a full screen whose only content is one sentence | `clamp(2.25rem, 6.2vw, 5.5rem)` → 88px |
| Ink headline ran to four lines and started mid-sentence | Split headline lost its shape | Two explicit lines at `clamp(1.875rem, 3.1vw, 3rem)`; curly apostrophe |
| Product captions sat at 35% opacity | Inactive captions are real content at ~2.5:1 | Full opacity, hierarchy carried by colour only (muted vs ink) |
| Phone screen content touched the frame edge | Web build has no safe-area inset, so the app's header sat against the bezel | 14px canvas inset inside `.phone-screen` |
| Product phone was 330px | Read as a thumbnail next to 42px type | 380px |
| Hero phone showed Home with the check-in card clipped by the tab bar | Looked like a broken screen, not a crop | Hero uses the Vision screen; Home/check-in stay in the product sequence |
| Vision screen had one card and empty space | The seed had one vision | Re-captured with three visions so the atlas reads as an atlas |
| A 15px paper strip ran down the right of the ink section | `scrollbar-gutter: stable` reserves space outside the section | Removed |
| Next dev badge in every shot | Dev-only chrome | `devIndicators: false` |
| `/favicon.ico` 404 | Missing icon | `app/icon.svg` |
| Optimised images were cached against a stale file | Dev image cache keyed by URL only | `images.unoptimized` — the PNGs are already 2× |
| `eslint` crashed on `FlatCompat` | `eslint-config-next` 16 ships flat config | Import the arrays directly |
| `setState` inside an effect in the theme toggle | Cascading render, flagged by the React rule | `useSyncExternalStore` over the `<html>` class |

### Still weak — honest list

1. **Beats 2 and 3 are the same screen at two scroll positions.** The
   cross-fade reads as the app scrolling rather than as two distinct surfaces.
   A dedicated check-in capture (card centred, nothing else) would fix it.
2. **The Home capture still clips the check-in card behind the tab bar.** It is
   what the app does, but at 380px it reads as an unfinished screen.
3. **The dark ink section is lighter than the canvas** (`#171410` on `#0D0C0A`),
   so it is a band rather than a rupture. The paper card still carries the
   contrast, but the section is less of a moment in dark than in light.
4. **The hero headline breaks to three lines at 1440** ("Small / promises, /
   kept daily."). It is deliberate and reads well, but it is not the two-line
   split the wireframe promised; `promises,` does not fit 112px in a 7-column
   measure.
5. **No legal pages exist.** The footer carries one privacy sentence instead of
   links that would 404. Collecting emails without a hosted privacy notice is a
   real compliance gap, not a design choice.
6. **The form depends on `NEXT_PUBLIC_CONVEX_URL`.** Without it the submit
   fails at runtime with a network error; there is no build-time guard.

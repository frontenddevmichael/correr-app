# Correr — per-screen moodboard checklist

A working document. One section per screen, three pins max, one decision each.
Companion to `PINTEREST-INSPIRATION.md` (full search phrases live there).

---

## How to use this (read once, then stop reading)

1. **Create one Pinterest board:** `Correr — UI`. Add **sections** named:
   `00 · Look & feel` · `01 · Auth` · `02 · Core loop` · `03 · Vision flow` ·
   `04 · Commitments` · `05 · Coach` · `06 · Circles` · `07 · Build` · `08 · Modules` ·
   `09 · Rejected` (yes, keep a rejected section — it stops you re-pinning the same thing).
2. **Three pins per screen. No more.** One for *layout/structure*, one for *the single
   distinctive element*, one for *the state you're least sure about* (empty, loading,
   error, completed).
3. **10-minute timer per screen.** If three good pins don't appear, search a component
   instead of a screen (see the decoder table) and move on.
4. **Pin the source, not the repin.** Open the pin → save from the original board if it
   looks like a real product designer's work.
5. **Fill in "Decision" immediately.** A pin you didn't decide on is just scrolling.
6. **Don't design while collecting.** Collect everything first, then review the whole
   board in one sitting and only then touch Figma/code.

**Suggested pace:** 26 screens ≈ 4 hours. Do it in three sittings:
Auth + Core loop (11) → Vision + Commitments + Coach (9) → Circles + Build + Modules (6).

**Progress**

| Group | Screens | Pins collected | Decisions made |
|---|---|---|---|
| 01 · Auth & onboarding | 6 | ☐☐☐☐☐☐ | ☐☐☐☐☐☐ |
| 02 · Core loop | 5 | ☐☐☐☐☐ | ☐☐☐☐☐ |
| 03 · Vision flow | 4 | ☐☐☐☐ | ☐☐☐☐ |
| 04 · Commitments | 2 | ☐☐ | ☐☐ |
| 05 · Coach | 2 | ☐☐ | ☐☐ |
| 06 · Circles | 2 | ☐☐ | ☐☐ |
| 07 · Build | 2 | ☐☐ | ☐☐ |
| 08 · Modules | 3 | ☐☐☐ | ☐☐☐ |

---

## 01 · Auth & onboarding

> Note: these screens currently use a **separate** visual language (Poppins, lavender
> inputs, pill buttons) from the rest of the app. Decide here whether to keep that
> contrast or pull auth into Ink & Paper before collecting.

### 1 · Splash — `(auth)/welcome.tsx`
- [ ] Pin 1 — logo/wordmark treatment on near-black
- [ ] Pin 2 — loading indicator that isn't a spinner
- **Search:** `minimal splash screen app design black` · `brand wordmark splash screen`
- **Decide:** keep the letter-spaced wordmark? animate the bar or the mark?

### 2 · Welcome carousel — `(auth)/welcome.tsx`
- [ ] Pin 1 — slide composition (illustration size vs. copy)
- [ ] Pin 2 — progress dots / pagination
- [ ] Pin 3 — CTA stack (primary pill + Google + text link)
- **Search:** `onboarding carousel mobile app ui` · `3 slide onboarding screen illustration`
- **Decide:** illustration style — 3D, flat vector, photo, or abstract?

### 3 · Login — `(auth)/login.tsx`
- [ ] Pin 1 — headered single-column form
- [ ] Pin 2 — input field treatment (tinted fill vs. outline)
- [ ] Pin 3 — social/OR divider block
- **Search:** `minimal login screen app design white` · `sign in screen lavender input fields`
- **Decide:** tinted lavender inputs stay, or switch to Ink & Paper neutral fields?

### 4 · Signup — `(auth)/signup.tsx`
- [ ] Pin 1 — 3-field form density
- [ ] Pin 2 — password field with eye toggle + strength hint
- **Search:** `sign up screen ui mobile app minimal` · `registration form mobile ui clean`
- **Decide:** does signup add a progress hint ("step 1 of 2")?

### 5 · Password reset — `(auth)/recovery.tsx`
- [ ] Pin 1 — single-field form
- [ ] Pin 2 — success/confirmation state on the same screen
- **Search:** `forgot password screen ui` · `email sent confirmation screen app`
- **Decide:** success as inline card, full-screen state, or toast?

### 6 · Profile setup — `(onboarding)/profile-setup.tsx`
- [ ] Pin 1 — name + read-only value + toggle in one column
- [ ] Pin 2 — read-only field styling (sunken card vs. disabled input)
- **Search:** `profile setup onboarding screen app` · `onboarding form minimal app`
- **Decide:** is this a one-screen setup or step 1 of a wizard?

---

## 02 · Core loop

### 7 · Home / Today — `(tabs)/index.tsx`  ★ priority screen
- [ ] Pin 1 — dashboard structure (hero strip + stacked cards)
- [ ] Pin 2 — **dark stat strip** (Level / XP / Streak) — the anchor of the page
- [ ] Pin 3 — check-in chips + inline expansion pattern
- **Search:** `habit tracker today dashboard app ui` · `productivity app home screen streak card` · `daily check in mood chips app ui`
- **Decide:** how loud is the black hero? How many cards before the first scroll?
- **Steal from:** Sunsama, Things 3, Finch.

### 8 · Vision list — `(tabs)/vision.tsx`
- [ ] Pin 1 — stacked goal cards with progress
- [ ] Pin 2 — "past/completed" section treatment
- **Search:** `goals list with progress bars ui` · `project progress card list mobile`
- **Decide:** progress bar under title, or a ring on the right?

### 9 · Accountability — `(tabs)/accountability.tsx`
Three states, treat as three mini-screens:

**9a · Mode picker**
- [ ] Pin 1 — 2–3 option cards with "Recommended" badges
- **Search:** `choose your path selection cards app` · `option cards mobile ui minimal`
- **Decide:** radio-style selection or tap-to-continue?

**9b · Invite code**
- [ ] Pin 1 — big code display + waiting state
- **Search:** `invite code screen app ui` · `referral code share screen design`
- **Decide:** copy button, share sheet, or QR?

**9c · Active partner**
- [ ] Pin 1 — partner card (avatar + since-date)
- [ ] Pin 2 — quick "nudge" chips + chat bubbles
- [ ] Pin 3 — privacy toggles (Shared/Hidden)
- **Search:** `accountability partner dashboard app` · `friend nudge chat ui mobile` · `privacy sharing settings toggle ui`
- **Decide:** how much chat chrome does this deserve? Should nudges be emoji-first?

### 10 · Progress — `(tabs)/progress.tsx`
- [ ] Pin 1 — stat trio row + level banner combination
- [ ] Pin 2 — achievement/badge list (locked vs. unlocked)
- [ ] Pin 3 — XP history ledger
- **Search:** `gamification profile screen app` · `achievements badges screen ui` · `xp history list app ui`
- **Decide:** badges as icons, circles with checks (current), or cards? Is there a grid?

### 11 · More / settings — `(tabs)/more.tsx`
- [ ] Pin 1 — profile header card
- [ ] Pin 2 — settings groups with label + description + toggle
- **Search:** `settings screen app ui minimal` · `notification toggles settings ui`
- **Decide:** grouped cards (current) or classic grouped list rows?

---

## 03 · Vision → roadmap

### 12 · New vision — `vision/new.tsx`
- [ ] Pin 1 — long-form creation form (3 textareas)
- [ ] Pin 2 — chip rows for category / priority
- **Search:** `goal setting form app ui` · `multi select chips form ui`
- **Decide:** chips, segmented control, or a 3×3 category grid with icons?

### 13 · AI discovery — `vision/[id]/discovery.tsx`
- [ ] Pin 1 — question flow (one question per screen vs. scroll form)
- [ ] Pin 2 — multi-select chips with selected state
- [ ] Pin 3 — pace selector with live hint
- **Search:** `questionnaire screen app ui` · `onboarding quiz screen design`
- **Decide:** keep as one scroll form, or split into a 4-step wizard with progress?

### 14 · Roadmap preview — `vision/[id]/roadmap.tsx`
- [ ] Pin 1 — AI-generated result screen (trust + editability)
- [ ] Pin 2 — "Start today" numbered-actions block
- [ ] Pin 3 — how regeneration is offered without looking broken
- **Search:** `ai generated roadmap screen ui` · `numbered steps card dark ui`
- **Decide:** does this feel like a document to save, or a plan to accept?

### 15 · Vision detail — `vision/[id]/index.tsx`
- [ ] Pin 1 — goal card with milestone checklist
- [ ] Pin 2 — circular checkbox / completion affordance
- [ ] Pin 3 — vision header (quote, progress)
- **Search:** `roadmap with milestones checklist app` · `goal detail screen progress bar ui`
- **Decide:** timeline layout, accordion goals, or stacked cards (current)?

---

## 04 · Commitments

### 16 · New commitment — `commitment/new.tsx`
- [ ] Pin 1 — fast task creation (should feel < 15 seconds)
- [ ] Pin 2 — time-of-day chips
- [ ] Pin 3 — linked-vision preview card
- **Search:** `quick add task screen ui` · `task scheduling chips ui`
- **Decide:** full screen, bottom sheet, or inline add on Home?

### 17 · Commitment detail — `commitment/[id].tsx`
- [ ] Pin 1 — status header + action stack
- [ ] Pin 2 — recovery form ("what got in the way" + smaller next move)
- [ ] Pin 3 — event timeline
- **Search:** `task detail screen app ui` · `reschedule task sheet ui` · `activity timeline app design`
- **Decide:** is "recover" a form, a sheet, or a guided 3-tap flow? (This is the product's emotional core — spend extra time here.)

---

## 05 · AI coach

### 18 · Coach chat — `coach/index.tsx`
- [ ] Pin 1 — chat thread (bubble shape, alignment, whitespace)
- [ ] Pin 2 — quick-prompt chips above the composer
- [ ] Pin 3 — "thinking" state
- **Search:** `ai coach chat ui mobile` · `ai assistant chat screen design` · `quick reply chips chat ui`
- **Decide:** coach voice — clinical, warm, or blunt? Bubble style should signal it.

### 19 · Weekly review — `coach/weekly.tsx`
- [ ] Pin 1 — mood/feeling selector
- [ ] Pin 2 — 3 journaling prompts with reward framing
- **Search:** `weekly reflection journal app ui` · `mood check in screen app`
- **Decide:** keep as form, or make it a step-by-step ritual (one question per screen)?

---

## 06 · Circles

### 20 · Circles hub — `circles/index.tsx`
- [ ] Pin 1 — challenge card (event energy at top of a directory)
- [ ] Pin 2 — circle/group card
- **Search:** `challenge card app design` · `discover groups screen mobile`
- **Decide:** directory vs. activity feed — does the challenge block stay first?

### 21 · Circle detail — `circles/[id].tsx`
- [ ] Pin 1 — composer with post-type chips (Win / Check-in / General)
- [ ] Pin 2 — post card + "Cheer" affordance
- **Search:** `group feed app ui` · `post composer card ui` · `cheer like button ui`
- **Decide:** is this a feed, a wall, or a weekly digest?

---

## 07 · Correr Build

### 22 · Build hub — `build/index.tsx`
- [ ] Pin 1 — event/hackathon card (dark)
- [ ] Pin 2 — status badge language (upcoming / active / ended)
- **Search:** `hackathon app screen ui` · `event list card app design`
- **Decide:** is Build visually *louder* than the rest of the app (it's an event, not a habit)?

### 23 · Build detail — `build/[id].tsx`
- [ ] Pin 1 — team panel with invite code
- [ ] Pin 2 — milestone status control (Planned → Running → Done)
- [ ] Pin 3 — submission form with score/feedback
- **Search:** `team project dashboard app ui` · `milestone tracker team app`
- **Decide:** does the milestone chip stay tappable, or become a kanban?

---

## 08 · Modules

### 24 · Notifications — `notifications.tsx`
- [ ] Pin 1 — notification list with kind badges
- [ ] Pin 2 — read/unread differentiation
- **Search:** `notifications screen app ui` · `inbox activity feed mobile design`
- **Decide:** grouped by day, or flat list (current)?

### 25 · Pricing / Pro — `pricing.tsx`
- [ ] Pin 1 — two-plan comparison with dark = paid
- [ ] Pin 2 — feature list with check marks
- **Search:** `pricing paywall app ui` · `subscription plans mobile screen design`
- **Decide:** keep black Pro card, or invert (white Pro, grey Free)?

### 26 · Campus dashboard — `campus.tsx`
- [ ] Pin 1 — KPI card treatment (number + bar + caption)
- [ ] Pin 2 — privacy/compliance messaging that still looks premium
- **Search:** `kpi cards mobile dashboard` · `education dashboard app ui`
- **Decide:** zero charts (current) or one sparkline? Admin buyers expect charts.

---

## 09 · Lock these global decisions (do this after collecting)

Fill in once, then apply everywhere. This is what actually makes 26 screens feel like one app.

| Decision | Current | Final |
|---|---|---|
| Card radius | 20 | |
| Shadow strength | whisper (2/12) | |
| Black hero panel frequency | 1 per screen max | |
| Primary button colour | ink black | |
| Accent usage | AI/links only | |
| Chip shape | pill | |
| Icon style | thin line, 24px | |
| Typeface | Inter (auth: Poppins) | |
| Empty-state style | icon + title + copy + action | |
| Illustration style | none in-app / 3D-ish in auth | |
| Screen padding | 24 | |
| Dark mode | full token set exists | |

---

## 10 · Review ritual (30 minutes, once)

Go through the board top to bottom with three pens:

- **GREEN** — adopt directly.
- **YELLOW** — idea is right, execution doesn't fit Ink & Paper.
- **RED** — reject, move the pin to `09 · Rejected`.

Then for each green/yellow, write one imperative sentence in the screen's **Decide** line.
If a screen has three greens that contradict each other, that's a real design decision —
make it now, not in the code.

### Common contradiction to expect

Pinterest's dominant style is loud: gradients, glass, 3D, purple SaaS. Your app is the
opposite. Most pins will be **yellow** — steal the *structure* (where things sit, what
gets emphasised) and ignore the *surface* (colour, shadow, gradient).

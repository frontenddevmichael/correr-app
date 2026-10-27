# Correr — Pinterest inspiration guide

A screen-by-screen translation of the app into **Pinterest search phrases**.
Open a screen in the app, find its name below, copy the phrases, paste into Pinterest.

---

## 1. What Correr is (the 30-second version)

**Correr is a goal-achievement app built around a daily loop.**

You write a **vision** ("become a software engineer") → an **AI discovery** questionnaire
asks about your time, blockers and pace → the AI generates a **roadmap** of goals and
milestones → you turn that into **one small commitment per day** → you run it, check in,
recover when you miss → **XP, streaks and levels** reward consistency → an **accountability
partner or small Circle** keeps you honest, and an **AI coach** helps when you're stuck.

Beyond the core loop there are three expansion modules:
**Correr Build** (hackathon-style team sprints), **Campus dashboard** (privacy-safe analytics
for universities) and **Correr Pro** (subscription paywall).

Tagline: *"Run your vision. Build your future."*

---

## 2. The visual language (so your pins actually match)

The in-app design system is called **"Ink & Paper"**. It is deliberately quiet:

| What | Description |
|---|---|
| Canvas | Cool near-white `#F6F7F9` |
| Cards | Pure white, 20px radius, hairline border, whisper-soft shadow |
| Hero cards | Near-black `#14161A` panels used for stats/featured content |
| Text | Near-black primary, grey secondary, Inter typeface |
| Accent | Almost none — one indigo, used only for AI/links |
| Status colour | Emerald = progress, amber = streak/missed, red = errors |
| Controls | Pill-shaped chips, 14px-radius buttons and inputs |
| Density | Generous whitespace, one idea per card, short sentences |
| Icons | Thin monochrome line icons, 24px |

**⚠️ Two visual languages exist in the code.** The auth/onboarding screens
(`welcome`, `login`, `signup`, `recovery`, `profile-setup`) were built from a separate
Figma file: Poppins bold headlines, lavender-tinted inputs, periwinkle links, big pill
buttons, illustration carousel. The rest of the app is strict Ink & Paper.
**Decide which one you're evolving before you collect inspiration** — otherwise your
board will fight itself.

---

## 3. How to describe a screen when you don't know the words

Every screen = **stage** + **pattern** + **component** + **mood**. Combine them:

- **Stage:** onboarding · dashboard · list · detail · form · empty state · paywall · chat · settings
- **Pattern:** card stack · split hero · timeline · checklist · feed · wizard · comparison
- **Component:** stat cards · progress bar · streak counter · chips · toggles · bottom tabs · avatar row · code block
- **Mood:** minimal · editorial · calm · premium · monochrome · soft · utilitarian

Then add **"app UI"** to every query, or Pinterest will give you posters and websites.
Example: *"streak counter stat cards dashboard app UI minimal"*.

### The 6 searches to run first (whole-app vibe)

```
minimal mobile app design neutral palette
editorial mobile app ui design
monochrome app ui design black and white
premium productivity app ui design
ios app design minimal light mode
dark hero card mobile ui design
```

### Component "decoder" searches (reuse everywhere)

```
card stack layout app ui
dark feature card app ui contrast
selectable chips mobile ui
progress bar goal tracking ui
vertical timeline activity app ui
empty state illustration app design
bottom navigation bar 5 tabs app ui
stat cards row dashboard ui
multi step form mobile app ui
segmented control mobile ui
```

### Apps worth searching by name for each pattern

`Things 3` (list/detail calm) · `Linear` (dark hero + neutral, premium) · `Sunsama`
(daily planning dashboard) · `Finch` (gentle gamification) · `Duolingo` (streaks/levels) ·
`Fabulous` (ritual onboarding) · `Headspace`/`Calm` (calm illustration + typography) ·
`Notion` (quiet cards) · `Streaks` (tiny habit UI) · `Habitica` (XP/achievements).

---

## 4. Screen-by-screen

### AUTH & ONBOARDING

#### 1 · Splash screen — `(auth)/welcome.tsx`
On screen: centred logo mark, letter-spaced wordmark "CORRER", tiny tagline, thin loading bar.
**Steal:** restraint. One mark, one line, lots of empty space.
```
minimal splash screen app design black
logo mark splash screen mobile ui
luxury minimal splash screen design
brand wordmark splash screen app
```

#### 2 · Welcome / onboarding carousel — `(auth)/welcome.tsx`
On screen: headline with one coloured word, full-width swipeable slides (illustration +
one caption), pill progress dots, outline "Sign in" pill, black gradient Google button,
small "Create account" link.
**Steal:** one idea per slide, hand-drawn/3D illustration, dots as a pill not circles.
```
onboarding carousel mobile app ui
3 slide onboarding screen illustration app
pagination dots onboarding ui
habit app onboarding screens
welcome screen app illustration minimal
```

#### 3 · Login — `(auth)/login.tsx`
On screen: centred Poppins headline "Welcome back.", subtitle, lavender-filled inputs with
periwinkle borders, password eye toggle, right-aligned "Forgot password?", outline pill CTA,
OR divider, Google button.
**Steal:** soft tinted input fields instead of grey boxes.
```
minimal login screen app design white
sign in screen ui lavender input fields
login screen pill button mobile ui
clean authentication screen design
```

#### 4 · Sign up — `(auth)/signup.tsx`
Same shell as login, plus Full name field. Three fields, no social proof clutter.
```
sign up screen ui mobile app minimal
create account screen design white
registration form mobile ui clean
```

#### 5 · Password reset — `(auth)/recovery.tsx`
On screen: single email field; after submit the form is replaced by a success card
("Check your inbox.").
**Steal:** the form → confirmation swap on one screen.
```
forgot password screen ui
password reset app screen design
success confirmation card ui
email sent confirmation screen app
```

#### 6 · Profile setup — `(onboarding)/profile-setup.tsx`
On screen: display name input, read-only timezone card, notification toggle card, continue.
**Steal:** read-only values as sunken cards, not disabled inputs.
```
profile setup onboarding screen app
name and notification toggle settings ui
onboarding form minimal app
```

---

### CORE LOOP

#### 7 · Home / Today dashboard — `(tabs)/index.tsx`  ← the money screen
On screen: greeting + bell with unread badge; **black hero card** with Level / XP / Streak
in three columns; "Daily check-in" card with three chips (On track · Struggling · Blocked)
that expands into a text field; AI Coach promo card; "Needs recovery" overdue list; "Today's
commitments" list with state badges and a Complete button; "New commitment" secondary button.
**Steal:** the dark stats strip at the top — it anchors the whole page.
```
habit tracker today dashboard app ui
goal tracking app home screen
productivity app home screen streak card
daily dashboard mobile app card layout
dark stats card app ui
daily check in mood chips app ui
```

#### 8 · Vision list — `(tabs)/vision.tsx`
On screen: stacked vision cards (title, 2-line description, thin progress bar, % + timeframe),
high-priority badge, muted "Past visions" section, secondary "New vision" button; empty state
with target icon.
**Steal:** progress bar sitting directly under the title — compact, scannable.
```
goal list app ui cards
vision board app screen ui
project progress card list mobile
goals list with progress bars ui
```

#### 9 · Accountability hub — `(tabs)/accountability.tsx`
Three completely different states in one file:

**9a · Mode picker (no partner yet)**
On screen: three selectable cards — Run with a partner (Recommended) / Run with AI (Already
on) / Run solo — then a Circles promo card and a "Why a partner?" empty state.
```
accountability partner app ui
choose your path selection cards app
option cards mobile ui minimal
accountability app screen design
```

**9b · Invite sent (pending)**
On screen: black card with a large letter-spaced invite code, "Waiting for your partner…",
CTA to simulate accept, ghost cancel.
```
invite code screen app ui
referral code share screen design
waiting for partner invite ui
```

**9c · Active partnership**
On screen: black partner card (avatar + "Running together since…"), shared commitments list,
**Nudges** row of chips (Confirm / Encourage / Check in) + composer + chat-style bubbles,
"What they can see" privacy toggles (Shared / Hidden), Circles card, end/block actions.
**Steal:** the nudges row — three one-tap emotional actions instead of free text.
```
accountability partner dashboard app
friend nudge chat ui mobile
privacy sharing settings toggle ui
partner profile card dark ui
```

#### 10 · Progress — `(tabs)/progress.tsx`
On screen: three stat cards in a row (streak 🔥 / best / total XP), **black level card** with
progress bar to next level, achievements list with unlocked/locked dots, weekly-review
promo, XP history ledger (+10 rows).
**Steal:** the mixed row of small stat cards + one dark banner. Also the locked/unlocked dots.
```
streak xp level app ui
gamification profile screen app
achievements badges screen ui
level progress bar gamified app
xp history list app ui
```

#### 11 · More / settings — `(tabs)/more.tsx`
On screen: profile card (avatar, name, email, level badge, XP · timezone, edit), long list of
notification toggle rows with descriptions, then product cards (Build / Pro / Campus),
account actions (reset, sign out), about block.
**Steal:** grouped cards with a label + description per toggle, not a bare switch list.
```
settings screen app ui minimal
profile settings screen mobile
notification toggles settings ui
account settings list app design
```

---

### VISION → ROADMAP FLOW

#### 12 · New vision — `vision/new.tsx`
On screen: 3 inputs (title, description, why it matters) + chip rows for category, priority,
and timeframe.
**Steal:** chips instead of dropdowns for category/priority.
```
goal setting form app ui
create goal screen mobile design
multi select chips form ui
vision statement input screen
```

#### 13 · AI discovery — `vision/[id]/discovery.tsx`
On screen: wizard-style form — big textarea, time-per-day chips (15/30/45/60/90), blocker
multi-select chips, pace selector with a live hint line, constraints textarea.
**Steal:** progressive questioning, one question at a time, chips for anything enumerable.
```
questionnaire screen app ui
survey selection chips mobile ui
onboarding quiz screen design
multi step form app ui minimal
```

#### 14 · AI roadmap preview — `vision/[id]/roadmap.tsx`
On screen: skeleton loaders, **black "Start today" card** with numbered first actions, then
goal cards each containing bulleted milestones with timeframes, Save + Regenerate.
**Steal:** showing "first actions" before the plan — instant momentum.
```
ai generated roadmap screen ui
ai plan result screen design
milestone list card ui
numbered steps card dark ui
```

#### 15 · Vision detail — `vision/[id]/index.tsx`
On screen: black vision header (badges, description, quoted "why", progress bar), then per
goal: title + status badge + progress bar + **circular checkbox milestone checklist**; actions
"Refine with AI" / "Archive".
**Steal:** circular checkboxes that fill emerald when complete.
```
roadmap with milestones checklist app
goal detail screen progress bar ui
checklist card mobile app design
vision detail screen app ui
```

---

### COMMITMENTS

#### 16 · New commitment — `commitment/new.tsx`
On screen: title, note, due-time chips (This morning → Tomorrow morning), optional linked
vision chips **with a live preview card** (% + progress bar), share-with-partner toggle card.
**Steal:** selecting a vision reveals a mini preview of what it advances.
```
quick add task screen ui
create task screen mobile design
task scheduling chips ui
new habit form mobile app
```

#### 17 · Commitment detail — `commitment/[id].tsx`
On screen: black status card (state badge + due date + note), action stack (Start / Mark
complete / "I missed it — recover"), **recovery form** (what got in the way? + smaller
replacement commitment), reschedule chips, success and missed states, event timeline.
**Steal:** the recovery form. Missed ≠ failure — that's the product's soul.
```
task detail screen app ui
reschedule task sheet ui
activity timeline app design
recovery streak screen app
```

---

### AI COACH

#### 18 · Coach chat — `coach/index.tsx`
On screen: minimal header ("Private to you — never shared"), scrolling thread with dark
right-aligned user bubbles and bordered white coach bubbles, "Coach is thinking…" bubble,
quick-prompt chips, composer with send button.
**Steal:** the privacy line in the header; the compact chip prompts above the input.
```
ai coach chat ui mobile
ai assistant chat screen design
chat bubbles minimal app ui
wellness chatbot interface
quick reply chips chat ui
```

#### 19 · Weekly review — `coach/weekly.tsx`
On screen: three mood chips (Mostly on track / Mixed week / Rough week), three labelled
multiline questions, "+15 XP" promise in the subtitle, single dark CTA.
**Steal:** journaling prompts with a reward attached.
```
weekly reflection journal app ui
mood check in screen app
journaling prompts app design
weekly review form mobile
```

---

### CIRCLES (community)

#### 20 · Circles hub — `circles/index.tsx`
On screen: **black challenges card** (bonus XP badge, Join buttons), "Discover" header with
"+ New circle" chip, inline create form, circle cards (name, privacy badge, description,
member count, Join/Joined).
**Steal:** the challenge block at the top turning a directory into an event.
```
community group app ui
challenge card app design
discover groups screen mobile
community app ui minimal
```

#### 21 · Circle detail — `circles/[id].tsx`
On screen: description + leave; **sunken composer card** with Win / Check-in / General chips
and a textarea; feed of post cards with avatar, badge and a "Cheer" pill.
**Steal:** post *types* as chips — it sets the tone of every post.
```
group feed app ui
post composer card ui
community post card mobile design
social feed minimal app
cheer like button ui
```

---

### CORRER BUILD (team sprints)

#### 22 · Build hub — `build/index.tsx`
On screen: dark event cards with name, status badge, description, date range, rules.
```
hackathon app screen ui
event list card app design
sprint challenge app ui
```

#### 23 · Build detail — `build/[id].tsx`
On screen: rules card; team creation vs join-by-code; **black team card with invite code**;
team milestones with a status chip that advances Planned → Running → Done; submission form
with score/feedback.
**Steal:** the tappable status chip instead of a dropdown.
```
team project dashboard app ui
milestone tracker team app
submission form app ui
invite code team screen
```

---

### EXPANSION MODULES

#### 24 · Notifications — `notifications.tsx`
On screen: unread count subtitle + "Mark all read", cards with kind badge, timestamp, title,
body, unread dot.
```
notifications screen app ui
inbox activity feed mobile design
notification list card ui minimal
unread badge list ui
```

#### 25 · Pricing / Pro — `pricing.tsx`
On screen: black current-plan card, white Free plan card with tick list, black Pro card with
tick list and indigo price, upgrade button, "demo billing" footnote.
**Steal:** black card = the plan you want. Contrast does the selling.
```
pricing paywall app ui
subscription plans mobile screen design
pro upgrade screen app
paywall comparison cards ui
```

#### 26 · Campus dashboard — `campus.tsx`
On screen: privacy badge, **black "Active students" hero number**, four metric cards each
with % + progress bar + caption, privacy explainer card.
**Steal:** big number, thin bar, one-line caption. No charts at all.
```
admin analytics dashboard mobile
education dashboard app ui
kpi cards mobile dashboard
data viz mobile app screen
privacy aggregate metrics dashboard
```

---

## 5. Cross-screen patterns (search these instead of screens)

| Pattern in Correr | Search phrase |
|---|---|
| Black hero/stat cards | `dark hero card mobile ui` |
| Stacked white cards on grey | `card stack layout app ui` |
| Chip selectors | `selectable chips mobile ui` |
| Thin progress bars | `progress bar goal tracking ui` |
| Circular checkboxes | `round checkbox checklist ui` |
| Event/state timeline | `vertical timeline activity app ui` |
| Stat trio row | `three stat cards app ui` |
| Invite code / share | `invite code screen app ui` |
| Empty states | `empty state illustration app design` |
| Skeleton loading | `skeleton loading screen app ui` |
| Privacy toggles | `privacy settings toggle app ui` |
| XP / level system | `gamification level progress app ui` |
| 5-tab bottom bar | `bottom tab bar app ui 5 icons` |

---

## 6. Pinterest query tips

1. **Always append** `app ui`, `mobile ui`, `screen design` or `ios`.
2. **Add the mood** last: `minimal`, `editorial`, `soft`, `premium`, `monochrome`.
3. **Search components, not just screens** — "chips" gets better results than "form".
4. **Follow the source, not the pin.** Open the pin and look at the designer's board;
   Dribbble/Behance boards on Pinterest are usually higher quality than generic repins.
5. **Collect in two boards:** one for *look* (colour, type, surface) and one for
   *structure* (layout patterns). Mixing them makes the board unusable later.
6. **Ignore anything with** glassmorphism, neon gradients, 3D blobs or purple SaaS
   backgrounds — none of it matches Ink & Paper.
7. **Screenshot the real app** next to a pin when saving; you'll forget which screen it
   was meant for.

---

## 7. One-line brief you can paste anywhere

> Calm, editorial productivity app. Warm-neutral white canvas, white rounded cards with
> hairline borders, occasional near-black hero panels, one indigo accent, Inter typography,
> pill chips, thin line icons, generous whitespace, status colour reserved for progress and
> streaks. Feels closer to Things 3 / Linear / Sunsama than to a gamified fitness app.

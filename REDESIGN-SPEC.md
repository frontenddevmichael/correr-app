# Correr — design & engineering spec

Direction: **Ink & Paper** — monochrome, generous space, one loud ink moment per
screen, floating navigation, quiet motion. Every surface must read as Correr:
the same mark, the same type voices, the same rules in light and dark.

---

## 1. Type

| Role | Face | Notes |
|---|---|---|
| Display / headlines | **Poppins 600** | Hero, screen titles, card titles, large numbers |
| Display soft | **Poppins 400/500** | Second line of a split headline, quieter display |
| UI / body | **Inter 400** | Body, descriptions, helper copy |
| UI medium | **Inter 500/600** | Labels, buttons, eyebrows, tab labels |
| Numerals | Poppins 500/600 | Stats and XP counts |

- Loaded files only. **Never** add synthetic `fontWeight` to a loaded family.
- `fontSize` ramp is intentionally compact: 11–44. Headlines use Poppins,
  paragraphs and controls use Inter.
- Eyebrows are uppercase Inter 600 at 11 with +1.2 tracking.
- A split headline pairs `hero` (600) with `heroSoft` (400, secondary tone),
  never two competing bold lines.

---

## 2. Navigation

- Four destinations in a floating capsule: **Home · Vision · Support · Progress**.
  The Support screen is the accountability surface (`/accountability`); Circles
  remains a separate destination reached from Support and More.
- A separate circular ink FAB opens `commitment/new`. It is not a fifth tab.
- The active state is a **travelling pill**, not a dot or a per-item highlight:
  - the bar measures its own width; the active destination owns a wider pill
    and the remaining slots share the rest;
  - the pill springs to `activeIndex * slotWidth`, the leading and trailing
    edges move on different springs for the jelly stretch;
  - the active item hides its icon while the pill shows icon + label;
  - inactive items remain icon-only with 44px+ hit targets.
- Reduced motion snaps instead of springing.
- Liquid glass renders on iOS 26+ (`expo-glass-effect`); web and older native
  use the opaque paper capsule fallback. Geometry is identical.
- **More** is a secondary surface. It sits behind the Home avatar, hides the
  destination bar (no false active tab) and supplies a back affordance.
- Bar clearance is owned by `layout.tabBar*` tokens; screens never hardcode
  `paddingBottom: 100`.

---

## 3. Brand

The mark is a bold **C**, a fine inner ring and a centre dot. All brand surfaces
use the same geometry.

| Surface | Asset / component |
|---|---|
| App icon | `assets/images/icon.png` (ink tile) |
| Splash | `assets/images/splash-icon.png` (light), `splash-icon-dark.png` |
| Android adaptive | ink background, white foreground + monochrome |
| Favicon | `assets/images/favicon.png` |
| In-app tile | `BrandMark` |
| Wordmark / headers / auth | `CorrerGlyph` + letterspaced `CORRER` |

- The splash is paper/ink (light) and ink/white (dark). No blue, no Expo logo.
- No second logo style anywhere. `assets/expo.icon` is not referenced.
- The mark is monochrome; it inherits `textPrimary` unless a surface forces ink.

---

## 4. Colour & dark mode

- Palette is monochrome in both schemes. Status is never hue: fill vs outline,
  dashed borders, strike-through, icon shape, weight and copy carry meaning.
- `ThemeProvider` supports **System / Light / Dark**, persisted in AsyncStorage
  under `correr.theme.v1`.
- `useTheme()` exposes `mode`, `scheme`, `isDark`, `setMode`, `toggleDark`.
- `useColors()` returns the active token set. Components never import the static
  light palette.
- Static styles that contain colour use `createThemedStyles((colors) => ({…}))`.
  The proxy resolves the active scheme at render time; the screen must subscribe
  with `useColors()` or `useTheme()` so it repaints on a theme change.
- The More screen owns the dark-mode toggle and a “Use system setting” escape
  when the user has overridden the OS.
- Dark palette: ink canvas, slightly lifted surfaces, hairline borders, inverse
  primary buttons. On dark feature cards use `tone="inverse"` /
  `tone="onDark"` (both map to `textOnDark`) and `tone="onDarkMuted"` for
  supporting copy. Reserve `tone="onBrand"` for text on a filled brand button.
  Never place a `primary` or `progress` button on an ink card: in light mode
  the fill is the same ink and the control disappears.
- Destructive or secondary actions on an ink card use a `secondary` pill
  (paper surface, hairline) so the affordance stays visible in both schemes.
- Splash and status bar follow the scheme; `userInterfaceStyle` is `automatic`.
- Check every new surface in both schemes: body text ≥ 4.5:1, muted text ≥ 4.5:1
  on its actual surface.

---

## 5. Input contracts

`src/core/validation.ts` is the single source of truth; the future Convex
mutations must validate the same shapes server-side.

- `LIMITS` covers email, password, names, titles, notes, messages, codes, URLs.
- **Sanitizers** run on change and block impossible characters early:
  - `sanitizeSingleLine` removes newlines and repeated spaces;
  - `sanitizeName` allows letters, spaces, apostrophes, periods, hyphens;
  - `sanitizeEmail` removes whitespace;
  - `sanitizeCode` uppercases A–Z/0–9 and caps at 8;
  - `sanitizeUrl` strips whitespace;
  - `sanitizeTeamName` allows letters, numbers, spaces, `&`, `'`, `.`, `-`.
- **Validators** run on blur and submit and return plain-language copy:
  - email must look like `name@example.com`;
  - password is 8–64 characters;
  - names are 2–60 letters;
  - titles are 2–120;
  - codes are 6–8 letters/numbers;
  - URLs must be `http(s)` with a host;
  - messages must be non-empty and within their cap.
- Every input sets `maxLength`, the right `keyboardType` / `inputMode` /
  `autoComplete` / `textContentType`, and an accessible label where the visual
  label is a placeholder.
- Errors appear inline under the field that caused them. Submit also raises a
  toast so an off-screen error is never silent.
- Editorial forms use a static heading, a visible field label (or an example
  placeholder, never a question), a focus rule, and a clear single primary
  action. A toggle is labelled with the state it enables: “Keep this private”
  is on when the commitment is private, and its supporting copy changes.
- Empty days read **Nothing planned** on both Home and Calendar; avoid poetic
  statuses such as “A clear page” that can be mistaken for a link.
- Buttons are not disabled for “empty” as the only explanation; pressing
  validates and explains. `disabled` is reserved for `busy` or a true no-op.
- The coach composer allows free language but caps at 2000 characters. Recovery
  reasons, weekly reflections and circle posts are capped and counted.

Applied to: login, signup, recovery, profile setup, vision create, discovery,
commitment create/detail recovery, weekly review, circle create/post,
accountability invite/nudge, Build team/milestone/submission.

---

## 6. HCI rules

- **Affordance matches outcome.** A plus means “add”, a checkbox means
  “complete”. The roadmap milestone row is a checkbox row; there is no plus.
  The Build milestone action reads Start → Mark done → Reopen.
- **No dead controls.** If the backend contract cannot persist an action, remove
  the control rather than faking it (the old circle “Cheer” button was removed).
- **Feedback for every mutation.** Toasts confirm saved/completed/copied/sent;
  destructive actions (`cancel commitment`, `leave circle`, `end partnership`,
  `block partner`, `cancel Pro`, `sign out`, `reset demo data`) use a native
  confirmation with a cancel option and destructive styling.
- **Labels and hints.** Icon-only controls always carry `accessibilityLabel`;
  non-obvious controls add `accessibilityHint`. Tab items expose `tab` role,
  selected state and “Go to …”.
- **Errors are visible and specific.** Inline field errors + one-line toast;
  `accessibilityRole="alert"` / live region on the toast.
- **Empty states explain the next action**, not just the absence of data.
- **More and Support are not tabs.** The primary bar is the daily loop: Home,
  Vision, Progress. Support stays contextual from Home and More, so the capsule
  keeps three destinations plus the one primary action.
- **Home order is fixed.** Editorial greeting and date, week strip, recovery
  when needed, today’s promises, daily check-in, a weekly review, then support.
  The review is a quiet weekly prompt, never a row inside Today, and it carries
  no invented schedule.
- **Motion is respect-first.** `useReducedMotion` disables springs, reveals and
  counters. Animations never block input.

---

## 7. Structure & performance

- `src/app` is routing only; shared primitives live in `src/design-system`,
  data contracts in `src/core`, data access in `src/api`.
- **Every screen reads/writes through `useApi()` and the `CorrerApi` contract.**
  `src/api/createApi.ts` is the only place that chooses an implementation.
  Replacing the mock with a Convex adapter must not touch screens.
- Cross-screen math (week/month/day bounds, formatting) lives in
  `src/core/dates.ts`; do not re-implement date math in screens. Use
  `formatDateRange` for sprint/challenge windows so ranges read “Oct 26 – Oct 31”
  rather than locale-dependent numeric dates.
- Seed/persistence lives in `src/api/mockDatabase.ts` + `storage.ts`; UI never
  imports either directly.
- Screens use `useFocusEffect` for data that can change while away; one load per
  focus, one session refresh after mutations via `invalidate()`/`refresh()`.
- Avoid per-render `StyleSheet.create` and inline object churn where a themed
  sheet can be hoisted. Generated PNGs are 8-bit; source SVGs live in
  `assets/brand/`.
- Gate: `npx tsc --noEmit` and `npx expo lint` must both be clean.

---

## 8. Delivered in this pass

- Poppins/Inter foundation; removed synthetic weights; compact type ramp.
- `CalendarStrip` + full `/calendar` screen; local date helpers.
- Home rebuilt around today, week strip, check-in, recovery and coach.
- Travelling active tab pill; separate FAB; glass fallback.
- Correr C + ring + dot mark; regenerated icon/splash/favicon/Android assets;
  monochrome paper/ink splash with dark variant.
- Persisted dark mode + themed style factory; all static colour imports removed.
- `validation.ts`, inline field errors, character caps, input modes, toasts.
- Roadmap milestone checkbox affordance; Build status wording; More back/hide
  bar; removed circle Cheer dead control.
- Support label for the accountability tab; “View sprint” affordance and a
  “How a sprint runs” explainer on the Build hub.
- Human-readable date ranges across Build, Circles, Home, Support and Pro.
- Dark-card contrast audit: supporting copy uses `onDarkMuted`; secondary and
  Join controls no longer vanish into an ink card in light mode.
- Privacy control on the commitment composer reads as a toggle that is on when
  the commitment is private; secondary actions such as Leave circle are visible
  outlined pills.
- Progress rebuilt around one momentum hero (current streak plus level ring),
  two truth tiles, a weekly activity summary, a next-achievement card with a
  “View all” reveal, and a five-row XP ledger with “View all entries.” Empty
  weeks collapse to a single “Plan a commitment” action; loading and retry
  states no longer flash zeroes.
- Home reordered around the daily loop: editorial greeting and date, week
  strip, recovery before the agenda, today’s promises in a timeline, a three-up
  check-in, a separate weekly review, then support. The weekly review no longer
  sits inside Today and no longer claims a hardcoded schedule.
- Home agenda dates read “Fri, Oct 23” when browsing away from today; the
  selected day keeps its event dot; private is the default and only shared
  commitments carry a visibility label. In-progress commitments are labelled in
  words, not a dot alone.
- Home shows a first-load skeleton and a visible retry card; changing weeks
  shows an agenda skeleton instead of “Nothing planned.” The calendar link now
  has a 44px touch target.
- API factory seam for the Convex adapter.

### Reference-led pass

- Warm paper palette across light and dark: the canvas, surfaces, borders and
  ink all carry a little warmth, while the brand stays monochrome. The
  reference's orange was deliberately not copied: it would turn Correr into a
  motivation feed rather than a private ledger.
- Home now reads like a page, not a dashboard. A two-line editorial greeting
  and date, the week strip, a timeline of promises with a continuous rail, and
  one dark check-in card. The loud moment is the user's own check-in, not a
  decorative quote card.
- The old ceremonial language is gone. The weekly prompt is “A look back” with
  a “Week in review” row; the daily card is “Daily check-in.”
- The timeline marker is the checkbox. Completing a promise no longer requires
  finding a second control on the right; the marker confirms with a spring and
  the title strikes through.
- Check-in moved to a dark, full-width card with three honest choices, a
  visible optional-note label, and a marked complete state. Its dark palette is
  fixed so it reads the same in light and dark themes.
- Pull to refresh added to `Screen` and wired to Home, with the native refresh
  control tinted to the ink palette.
- Bottom bar reduced to Home, Vision and Progress, matching the reference's
  three-destination capsule plus a separate FAB. Support is now one tap from the
  Home support card and from More, and the Support screen has a back affordance.
- Add Vision rebuilt as a single-screen capture: centred “New vision” nav,
  rounded title field, picture and reason fields, category/timeframe/priority
  chips, a quiet “what happens next” note, and a pinned “Build my roadmap” CTA
  above the keyboard. Inline errors and a footer summary replace the old
  three-step wizard.
- The commitment composer now receives the browsed day from Home and schedules
  morning, afternoon, evening or next-day promises against that date instead of
  always against today.
